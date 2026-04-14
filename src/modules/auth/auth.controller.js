import bcrypt from "bcryptjs";
import crypto from "crypto";

import pool from "../../config/db.js";
import ApiResponse from "../../utils/ApiResponse.js";
import ApiError from "../../utils/ApiError.js";
import { AUTH_MESSAGES } from "./auth.constant.js";
import { sendMail } from "../../utils/mailService.js";
import { generateOtp, generateTokens } from "./auth.helper.js";
import { AUTH_QUERIES } from "./auth.queries.js";

/**
 * POST /auth/signup
 * Register a new user and send OTP for email verification.
 */
export const signup = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      throw new ApiError(400, "Email, password and role are required");
    }

    // 1. Check duplicate
    const [existing] = await pool.query(AUTH_QUERIES.FIND_BY_EMAIL, [email]);
    if (existing.length > 0) {
      throw new ApiError(409, "An account with this email already exists");
    }

    // 2. Hash password
    const hashed = await bcrypt.hash(password, 10);

    // 3. Generate OTP
    const { otp, expiresAt } = generateOtp();

    // 4. Save user (inactive)
    await pool.query(AUTH_QUERIES.INSERT_USER, [
      email,
      hashed,
      role,
      otp,
      expiresAt,
    ]);

    // 5. Send OTP (dummy logs for now)
    await sendMail(email, otp, "VERIFY");

    res
      .status(201)
      .json(new ApiResponse(201, null, AUTH_MESSAGES.SIGNUP_SUCCESS));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/login
 * Authenticate user, return access + refresh tokens.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    // 1. Find user
    const [users] = await pool.query(AUTH_QUERIES.FIND_BY_EMAIL, [email]);
    if (users.length === 0) {
      throw new ApiError(401, "Invalid email or password");
    }
    const user = users[0];

    // 2. Verify password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new ApiError(401, "Invalid email or password");
    }

    // 3. Check email verified
    if (!user.is_verified) {
      throw new ApiError(403, "Please verify your email before logging in");
    }

    // 4. Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // 5. Persist refresh token
    await pool.query(AUTH_QUERIES.SET_REFRESH_TOKEN, [refreshToken, user.id]);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          user: { id: user.id, email: user.email, role: user.role },
          accessToken,
          refreshToken,
        },
        AUTH_MESSAGES.LOGIN_SUCCESS,
      ),
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/verify-email
 * Verify account using the OTP that was emailed after signup.
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      throw new ApiError(400, "Email and OTP are required");
    }

    const [result] = await pool.query(AUTH_QUERIES.VERIFY_USER, [email, token]);

    if (result.affectedRows === 0) {
      throw new ApiError(400, "OTP is invalid or has expired");
    }

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          null,
          "Email verified successfully. You can now login.",
        ),
      );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/resend-verification
 * Regenerate and resend OTP to the given email.
 */
export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ApiError(400, "Email is required");
    }

    const [users] = await pool.query(AUTH_QUERIES.FIND_BY_EMAIL, [email]);
    if (users.length === 0) {
      throw new ApiError(404, "No account found with this email");
    }
    if (users[0].is_verified) {
      throw new ApiError(400, "This account is already verified");
    }

    // Generate fresh OTP
    const { otp, expiresAt } = generateOtp();
    await pool.query(AUTH_QUERIES.SET_OTP, [otp, expiresAt, email]);
    await sendMail(email, otp, "VERIFY");

    res
      .status(200)
      .json(new ApiResponse(200, null, "Verification OTP resent successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/forgot-password
 * Send a password reset token to the given email.
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ApiError(400, "Email is required");
    }

    const [users] = await pool.query(AUTH_QUERIES.FIND_BY_EMAIL, [email]);
    // Always return success to prevent email enumeration
    if (users.length === 0) {
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            null,
            "If an account exists, a reset OTP has been sent",
          ),
        );
    }

    const { otp, expiresAt } = generateOtp();
    await pool.query(AUTH_QUERIES.SET_RESET_TOKEN, [otp, expiresAt, email]);

    await sendMail(email, otp, "RESET_PASSWORD");

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          null,
          "If an account exists, a reset OTP has been sent",
        ),
      );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/reset-password
 * Reset the password using the OTP received via email.
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      throw new ApiError(400, "Email, OTP and new password are required");
    }

    // Verify the reset token matches what is stored for this email
    const [users] = await pool.query(AUTH_QUERIES.FIND_BY_EMAIL, [email]);
    if (users.length === 0 || users[0].reset_token !== token) {
      throw new ApiError(400, "Invalid or expired reset OTP");
    }
    if (new Date(users[0].reset_token_expires_at) < new Date()) {
      throw new ApiError(400, "Reset OTP has expired");
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(AUTH_QUERIES.RESET_PASSWORD, [hashed, token]);

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          null,
          "Password reset successfully. You can now login.",
        ),
      );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/refresh-token
 * Return a new access + refresh token pair given a valid refresh token.
 */
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw new ApiError(401, "Refresh token is required");
    }

    // 1. Verify signature
    const decoded = jwt.verify(
      token,
      process.env.REFRESH_TOKEN_SECRET || "refresh_secret",
    );

    // 2. Ensure token matches what is stored (prevents reuse after logout)
    const [users] = await pool.query(AUTH_QUERIES.FIND_BY_ID, [decoded.id]);
    if (users.length === 0) {
      throw new ApiError(401, "Session not found");
    }

    // 3. Issue new token pair (rotation)
    const { accessToken, refreshToken: newRefresh } = generateTokens(users[0]);
    await pool.query(AUTH_QUERIES.SET_REFRESH_TOKEN, [newRefresh, users[0].id]);

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefresh },
          "Token refreshed successfully",
        ),
      );
  } catch (error) {
    next(new ApiError(401, "Invalid or expired refresh token"));
  }
};

/**
 * POST /auth/logout
 * Invalidate the current refresh token.
 */
export const logout = async (req, res, next) => {
  try {
    await pool.query(AUTH_QUERIES.SET_REFRESH_TOKEN, [null, req.user.id]);
    res.status(200).json(new ApiResponse(200, null, "Logged out successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/change-password
 * Change password when the user knows their current password.
 */
export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new ApiError(400, "Both old and new password are required");
    }

    // Re-fetch full user row to get hashed password
    const [users] = await pool.query(AUTH_QUERIES.FIND_BY_EMAIL, [
      req.user.email,
    ]);
    if (users.length === 0) {
      throw new ApiError(404, "User not found");
    }

    const match = await bcrypt.compare(oldPassword, users[0].password);
    if (!match) {
      throw new ApiError(401, "Current password is incorrect");
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(AUTH_QUERIES.CHANGE_PASSWORD, [hashed, req.user.id]);

    res
      .status(200)
      .json(new ApiResponse(200, null, "Password changed successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /auth/me
 * Return the current authenticated user's profile.
 */
export const getMe = async (req, res, next) => {
  try {
    const [users] = await pool.query(AUTH_QUERIES.FIND_BY_ID, [req.user.id]);
    if (users.length === 0) {
      throw new ApiError(404, "User not found");
    }
    res
      .status(200)
      .json(new ApiResponse(200, users[0], "Profile fetched successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/revoke-sessions
 * Log the user out of all devices by clearing the refresh token.
 */
export const revokeSessions = async (req, res, next) => {
  try {
    await pool.query(AUTH_QUERIES.REVOKE_ALL_SESSIONS, [req.user.id]);
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          null,
          "All sessions revoked. You have been logged out from all devices.",
        ),
      );
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// Role-Based Routes (ADMIN / EMPLOYER)
// ─────────────────────────────────────────────

/**
 * POST /auth/invite-employee
 * Create an inactive account for an employee and send them an invite link.
 */
export const inviteEmployee = async (req, res, next) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      throw new ApiError(400, "Email and role are required");
    }

    // Check if already registered
    const [existing] = await pool.query(AUTH_QUERIES.FIND_BY_EMAIL, [email]);
    if (existing.length > 0) {
      throw new ApiError(409, "An account with this email already exists");
    }

    // Generate a unique invite token
    const inviteToken = crypto.randomBytes(32).toString("hex");

    await pool.query(AUTH_QUERIES.INSERT_INVITED_USER, [
      email,
      role,
      inviteToken,
    ]);
    await sendMail(email, inviteToken, "INVITE");

    res
      .status(201)
      .json(
        new ApiResponse(201, { inviteToken }, "Invitation sent successfully"),
      );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /auth/invitations
 * List all employees who have been invited but haven't accepted yet.
 */
export const listInvitations = async (req, res, next) => {
  try {
    const [invitations] = await pool.query(
      AUTH_QUERIES.LIST_PENDING_INVITATIONS,
    );
    res
      .status(200)
      .json(new ApiResponse(200, invitations, "Pending invitations fetched"));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/accept-invite
 * Accept an invitation, set a password and activate the account.
 */
export const acceptInvite = async (req, res, next) => {
  try {
    const { inviteToken, password } = req.body;

    if (!inviteToken || !password) {
      throw new ApiError(400, "Invite token and password are required");
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(AUTH_QUERIES.ACCEPT_INVITE, [
      hashed,
      inviteToken,
    ]);

    if (result.affectedRows === 0) {
      throw new ApiError(400, "Invalid or already used invite token");
    }

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          null,
          "Account activated successfully. You can now login.",
        ),
      );
  } catch (error) {
    next(error);
  }
};
