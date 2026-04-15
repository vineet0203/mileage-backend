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
  userController.getEmployees
);

router.get(
  '/:id',
  userController.getUserDetails
);

router.put(
  '/:id',
  roleMiddleware(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
  userController.updateEmployee
);

router.delete(
  '/:id',
  roleMiddleware(USER_ROLES.ADMIN),
  userController.deleteEmployee
);

export default router;
