import ApiResponse from '../../utils/ApiResponse.js';
import { AUTH_MESSAGES } from './auth.constant.js';

/**
 * --- Public Routes ---
 */

/**
 * Register a new user and send verification email.
 * POST /auth/signup
 */
export const signup = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    // TODO: Validate request body
    // TODO: Check if user already exists
    // TODO: Hash password
    // TODO: Create inactive user in DB
    // TODO: Generate verification token/OTP
    // TODO: Send verification email

    res.status(201).json(new ApiResponse(201, null, AUTH_MESSAGES.SIGNUP_SUCCESS));
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticate user and return tokens.
 * POST /auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // TODO: Validate credentials
    // TODO: Check if email is verified
    // TODO: Generate Access Token and Refresh Token

    const mockData = {
      user: { id: '1', email, role: 'ADMIN' },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    };

    res.status(200).json(new ApiResponse(200, mockData, AUTH_MESSAGES.LOGIN_SUCCESS));
  } catch (error) {
    next(error);
  }
};

/**
 * Verify email via token/OTP.
 * POST /auth/verify-email
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { token, email } = req.body;
    // TODO: Verify token/OTP
    // TODO: Activate user account in DB

    res.status(200).json(new ApiResponse(200, null, 'Email verified successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Resend verification email.
 * POST /auth/resend-verification
 */
export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    // TODO: Generate new token/OTP
    // TODO: Resend verification email

    res.status(200).json(new ApiResponse(200, null, 'Verification email sent'));
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset.
 * POST /auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    // TODO: Generate reset token/OTP
    // TODO: Send reset password email

    res.status(200).json(new ApiResponse(200, null, 'Password reset email sent'));
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password using token.
 * POST /auth/reset-password
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    // TODO: Verify token
    // TODO: Hash new password
    // TODO: Update password in DB

    res.status(200).json(new ApiResponse(200, null, 'Password reset successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token.
 * POST /auth/refresh-token
 */
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    // TODO: Verify refresh token
    // TODO: Generate new access token

    res.status(200).json(new ApiResponse(200, { accessToken: 'new-access-token' }, 'Token refreshed'));
  } catch (error) {
    next(error);
  }
};

/**
 * --- Protected Routes ---
 */

/**
 * Logout user and invalidate refresh token.
 * POST /auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    // TODO: Invalidate current refresh token in DB
    res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Change password.
 * POST /auth/change-password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    // TODO: Verify old password
    // TODO: Hash and update new password
    res.status(200).json(new ApiResponse(200, null, 'Password changed successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get current logged-in user.
 * GET /auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    res.status(200).json(new ApiResponse(200, req.user, 'User profile fetched'));
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke all sessions for the user.
 * POST /auth/revoke-sessions
 */
export const revokeSessions = async (req, res, next) => {
  try {
    // TODO: Invalidate all refresh tokens for the user in DB
    res.status(200).json(new ApiResponse(200, null, 'All sessions revoked'));
  } catch (error) {
    next(error);
  }
};

/**
 * --- Role-Based Routes ---
 */

/**
 * Invite a new employee.
 * POST /auth/invite-employee (ADMIN/EMPLOYER)
 */
export const inviteEmployee = async (req, res, next) => {
  try {
    const { email } = req.body;
    // TODO: Create inactive employee record
    // TODO: Send invitation email with signup link
    res.status(200).json(new ApiResponse(200, null, 'Invitation sent'));
  } catch (error) {
    next(error);
  }
};

/**
 * List all pending invitations.
 * GET /auth/invitations (ADMIN/EMPLOYER)
 */
export const listInvitations = async (req, res, next) => {
  try {
    // TODO: Fetch pending invitations from DB
    res.status(200).json(new ApiResponse(200, [], 'Invitations list fetched'));
  } catch (error) {
    next(error);
  }
};

/**
 * Accept invite and activate account.
 * POST /auth/accept-invite
 */
export const acceptInvite = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    // TODO: Verify invitation token
    // TODO: Hash password and activate account
    res.status(200).json(new ApiResponse(200, null, 'Account activated successfully'));
  } catch (error) {
    next(error);
  }
};
