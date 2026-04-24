import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";

import pool from "../../config/db.js";
import ApiResponse from "../../utils/ApiResponse.js";
import ApiError from "../../utils/ApiError.js";
import { sendMail } from "../../utils/mailService.js";
import { generateOtp, generateTokens } from "./auth.helper.js";
import { USER_ROLES } from "./auth.constant.js";

/**
 * POST /auth/signup
 * Register a new user. If role is MANAGER, auto-create an organization.
 */
export const signup = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { email, fullname, password, organizationName, website, phone } =
      req.body;
    const role = req.body.role || USER_ROLES.EMPLOYEE;

    if (
      !email ||
      !fullname ||
      !password ||
      (role === USER_ROLES.ADMIN && !organizationName)
    ) {
      throw new ApiError(
        400,
        "Email, full name, password and company name are required",
      );
    }

    await connection.beginTransaction();

    // 1. Check duplicate
    const [existing] = await connection.query(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email],
    );
    if (existing.length > 0) {
      throw new ApiError(409, "An account with this email already exists");
    }

    // 2. Hash password
    const hashed = await bcrypt.hash(password, 10);

    // 3. Generate OTP
    const { otp, expiresAt } = generateOtp();

    let organizationId = null;

    // 4. Create Organization if Admin (org owner)
    if (role === USER_ROLES.ADMIN) {
      const [orgResult] = await connection.query(
        `INSERT INTO organizations (name, website, phone) VALUES (?, ?, ?)`,
        [organizationName, website || null, phone || null],
      );
      organizationId = orgResult.insertId;
    }

    // 5. Save user (inactive, pending email verification)
    await connection.query(
      `INSERT INTO users (email, fullname, password, role, organization_id, otp, otp_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email, fullname, hashed, role, organizationId, otp, expiresAt],
    );

    await connection.commit();

    // 6. Send verification OTP
    await sendMail(email, otp, "VERIFY");

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          null,
          "User registered successfully. Please verify your email.",
        ),
      );
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * POST /auth/login
 * Authenticate user, return access + refresh tokens.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // Check both query (old) and body (new) for "from" key
    const fromMobile = req.query.from === "mobile" || req.body.from === "mobile";

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    // 1. Find user
    const [users] = await pool.query(
      `SELECT 
         u.*, 
         o.name AS organization_name,
         COALESCE(u.manager_id, am.id) AS manager_id,
         COALESCE(m.fullname, am.fullname) AS manager_name,
         u.created_at AS joined_date
       FROM users u 
       LEFT JOIN organizations o ON u.organization_id = o.id 
       LEFT JOIN users m        ON u.manager_id = m.id
       LEFT JOIN users am       ON am.id = (
         SELECT id FROM users 
         WHERE organization_id = u.organization_id 
         AND role = 'ADMIN' 
         LIMIT 1
       )
       WHERE u.email = ? LIMIT 1`,
      [email],
    );

    if (users.length === 0) {
      throw new ApiError(401, "Invalid email or password");
    }

    const user = users[0];

    // 2. Mobile-only restriction: only EMPLOYEE role allowed
    if (fromMobile && user.role !== USER_ROLES.EMPLOYEE) {
      throw new ApiError(
        403,
        "Access denied. Only employees can log in via the mobile app.",
      );
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid email or password");
    }

    if (!user.is_verified) {
      throw new ApiError(403, "Please verify your email before logging in");
    }

    // 4. Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // 5. Update refresh token in DB
    await pool.query(`UPDATE users SET refresh_token = ? WHERE id = ?`, [
      refreshToken,
      user.id,
    ]);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          user: {
            id: user.id,
            email: user.email,
            fullname: user.fullname,
            role: user.role,
            phone: user.phone,
            designation: user.designation,
            ssn: user.ssn,
            organization_id: user.organization_id,
            organization_name: user.organization_name,
            manager_id: user.manager_id,
            manager_name: user.manager_name,
            joined_date: user.joined_date,
          },
          accessToken,
          refreshToken,
        },
        "Login successful",
      ),
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/verify-email
 * Verify account using the OTP emailed after signup.
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      throw new ApiError(400, "Email and OTP are required");
    }

    const [result] = await pool.query(
      `UPDATE users SET is_verified = 1, otp = NULL, otp_expires_at = NULL
       WHERE email = ? AND otp = ? AND otp_expires_at > NOW()`,
      [email, token],
    );

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

    const [users] = await pool.query(
      `SELECT id, is_verified FROM users WHERE email = ? LIMIT 1`,
      [email],
    );
    if (users.length === 0) {
      throw new ApiError(404, "No account found with this email");
    }
    if (users[0].is_verified) {
      throw new ApiError(400, "This account is already verified");
    }

    const { otp, expiresAt } = generateOtp();
    await pool.query(
      `UPDATE users SET otp = ?, otp_expires_at = ? WHERE email = ?`,
      [otp, expiresAt, email],
    );
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
 * Send a password reset OTP to the given email.
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ApiError(400, "Email is required");
    }

    // Always return success to prevent email enumeration
    const [users] = await pool.query(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email],
    );
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
    await pool.query(
      `UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE email = ?`,
      [otp, expiresAt, email],
    );
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
 * Reset password using the OTP received via email.
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      throw new ApiError(400, "Email, OTP and new password are required");
    }

    // Verify the reset token matches what is stored for this email
    const [users] = await pool.query(
      `SELECT reset_token, reset_token_expires_at FROM users WHERE email = ? LIMIT 1`,
      [email],
    );
    if (users.length === 0 || users[0].reset_token !== token) {
      throw new ApiError(400, "Invalid or expired reset OTP");
    }
    if (new Date(users[0].reset_token_expires_at) < new Date()) {
      throw new ApiError(400, "Reset OTP has expired");
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE users SET password = ?, reset_token = NULL, reset_token_expires_at = NULL
       WHERE reset_token = ? AND reset_token_expires_at > NOW()`,
      [hashed, token],
    );

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

    // 2. Confirm user still exists
    const [users] = await pool.query(
      `SELECT id, email, fullname, role, organization_id, manager_id FROM users WHERE id = ? LIMIT 1`,
      [decoded.id],
    );
    if (users.length === 0) {
      throw new ApiError(401, "Session not found");
    }

    // 3. Issue new token pair (rotation)
    const { accessToken, refreshToken: newRefresh } = generateTokens(users[0]);
    await pool.query(`UPDATE users SET refresh_token = ? WHERE id = ?`, [
      newRefresh,
      users[0].id,
    ]);

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
    await pool.query(`UPDATE users SET refresh_token = NULL WHERE id = ?`, [
      req.user.id,
    ]);
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
    const [users] = await pool.query(
      `SELECT password FROM users WHERE email = ? LIMIT 1`,
      [req.user.email],
    );
    if (users.length === 0) {
      throw new ApiError(404, "User not found");
    }

    const match = await bcrypt.compare(oldPassword, users[0].password);
    if (!match) {
      throw new ApiError(401, "Current password is incorrect");
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password = ? WHERE id = ?`, [
      hashed,
      req.user.id,
    ]);

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
    const [users] = await pool.query(
      `SELECT
         u.id,
         u.email,
         u.fullname,
         u.role,
         u.designation,
         u.ssn,
         u.phone,
         u.is_verified,
         u.organization_id,
         o.name        AS organization_name,
         COALESCE(u.manager_id, am.id) AS manager_id,
         COALESCE(m.fullname, am.fullname) AS manager_name,
         u.created_at  AS joined_date
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       LEFT JOIN users m        ON u.manager_id = m.id
       LEFT JOIN users am       ON am.id = (
         SELECT id FROM users 
         WHERE organization_id = u.organization_id 
         AND role = 'ADMIN' 
         LIMIT 1
       )
       WHERE u.id = ? LIMIT 1`,
      [req.user.id],
    );
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
 * PATCH /auth/me
 * Update the current user's own profile.
 * Any role can update their own: phone, designation (skills as comma-separated string).
 * Image upload is not implemented yet (TODO).
 */
export const updateMe = async (req, res, next) => {
  try {
    const { phone, designation } = req.body;

    // At least one field must be provided
    if (phone === undefined && designation === undefined) {
      throw new ApiError(400, "Provide at least one field to update: phone or designation");
    }

    // Normalize values — keep existing DB value if not supplied
    const normalizedPhone = phone !== undefined ? (phone?.trim() || null) : undefined;
    const normalizedDesignation =
      designation !== undefined ? (designation?.trim() || null) : undefined;

    // Build dynamic SET clause
    const fields = [];
    const values = [];

    if (normalizedPhone !== undefined) {
      fields.push("phone = ?");
      values.push(normalizedPhone);
    }
    if (normalizedDesignation !== undefined) {
      fields.push("designation = ?");
      values.push(normalizedDesignation);
    }

    values.push(req.user.id);

    await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );

    // Return updated profile
    const [users] = await pool.query(
      `SELECT
         u.id, u.email, u.fullname, u.role,
         u.designation, u.ssn, u.phone, u.is_verified,
         u.organization_id, o.name AS organization_name,
         u.manager_id, m.fullname AS manager_name,
         u.created_at AS joined_date
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       LEFT JOIN users m        ON u.manager_id = m.id
       WHERE u.id = ? LIMIT 1`,
      [req.user.id],
    );

    res
      .status(200)
      .json(new ApiResponse(200, users[0], "Profile updated successfully"));
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
    await pool.query(`UPDATE users SET refresh_token = NULL WHERE id = ?`, [
      req.user.id,
    ]);
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
// Role-Based Endpoints (ADMIN / MANAGER)
// ─────────────────────────────────────────────

/**
 * POST /auth/invite-employee
 * Create an inactive account for an employee and send them an invite link.
 * Only ADMIN and MANAGER can invite.
 */
export const inviteEmployee = async (req, res, next) => {
  try {
    const { email, role, manager_id, fullname } = req.body;

    if (!email || !role || !fullname) {
      throw new ApiError(400, "Email, role, and full name are required");
    }

    // Check if already registered
    const [existing] = await pool.query(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email],
    );
    if (existing.length > 0) {
      throw new ApiError(409, "An account with this email already exists");
    }

    if (role === 'ADMIN') {
      throw new ApiError(403, "Cannot invite users with the ADMIN role.");
    }

    // Manager assignment logic
    let finalManagerId = null;

    if (req.user.role === 'MANAGER') {
      // If inviter is MANAGER, they are the manager
      finalManagerId = req.user.id;
    } else if (req.user.role === 'ADMIN') {
      // If inviter is ADMIN, they must specify a manager_id
      if (!manager_id) {
        throw new ApiError(400, "Reporting manager is required.");
      }
      
      // Verify manager exists in the SAME organization
      const [manager] = await pool.query(
        `SELECT id FROM users WHERE id = ? AND organization_id = ? AND role IN ('MANAGER', 'ADMIN')`,
        [manager_id, req.user.organization_id]
      );
      
      if (manager.length === 0) {
        throw new ApiError(400, "Invalid manager selection. Manager must be an Admin or Manager from your organization.");
      }
      finalManagerId = manager_id;
    }

    // Generate a unique invite token
    const inviteToken = crypto.randomBytes(32).toString("hex");

    await pool.query(
      `INSERT INTO users (email, fullname, role, organization_id, manager_id, invite_token, is_verified) VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [email, fullname, role, req.user.organization_id, finalManagerId, inviteToken],
    );

    await sendMail(email, inviteToken, "INVITE", {
      inviteeName: fullname,
      inviterName: req.user.fullname,
      organizationName: req.user.organization_name,
    });

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
 * List all pending invitations scoped to the current user's organization.
 */
export const listInvitations = async (req, res, next) => {
  try {
    const [invitations] = await pool.query(
      `SELECT id, email, role, created_at FROM users
       WHERE invite_token IS NOT NULL AND is_verified = 0 AND organization_id = ?`,
      [req.user.organization_id],
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
    const [result] = await pool.query(
      `UPDATE users SET password = ?, invite_token = NULL, is_verified = 1 WHERE invite_token = ?`,
      [hashed, inviteToken],
    );

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
