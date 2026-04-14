import express from 'express';
import * as userController from './user.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { USER_ROLES } from '../auth/auth.constant.js';

const router = express.Router();

// --- Protected & Role-Based Routes ---
router.use(authMiddleware);

router.get(
  '/',
  roleMiddleware(USER_ROLES.ADMIN, USER_ROLES.EMPLOYER),
  userController.listAllUsers
);

router.get(
  '/:id',
  roleMiddleware(USER_ROLES.ADMIN, USER_ROLES.EMPLOYER),
  userController.getUserDetails
);

export default router;
