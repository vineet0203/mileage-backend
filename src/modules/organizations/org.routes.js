import express from 'express';
import * as orgController from './org.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { USER_ROLES } from '../auth/auth.constant.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/me', orgController.getMyOrg);

router.put(
  '/me',
  roleMiddleware(USER_ROLES.ADMIN, USER_ROLES.EMPLOYER),
  orgController.updateOrg
);

export default router;
