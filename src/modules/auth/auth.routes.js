import express from 'express';
import * as authController from './auth.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { USER_ROLES } from './auth.constant.js';

const router = express.Router();

// --- Public Routes ---
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);
router.post('/accept-invite', authController.acceptInvite);

// --- Protected Routes (JWT required) ---
router.use(authMiddleware);

router.post('/logout', authController.logout);
router.post('/change-password', authController.changePassword);
router.get('/me', authController.getMe);
router.patch('/me', authController.updateMe);
router.post('/revoke-sessions', authController.revokeSessions);

// --- Role-Based Routes (ADMIN / MANAGER) ---
router.post(
  '/invite-employee',
  roleMiddleware(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
  authController.inviteEmployee
);

router.get(
  '/invitations',
  roleMiddleware(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
  authController.listInvitations
);

export default router;
