import express from 'express';
import * as routeController from './route.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { USER_ROLES } from '../auth/auth.constant.js';

const router = express.Router();

// --- Protected Routes ---
router.use(authMiddleware);

// Employees can read/search
router.get('/', routeController.listRoutes);

// Only ADMIN and EMPLOYER can mutate routes
const mutationAccess = roleMiddleware(USER_ROLES.ADMIN, USER_ROLES.EMPLOYER);

router.post('/', mutationAccess, routeController.createRoute);
router.put('/:id', mutationAccess, routeController.updateRoute);
router.delete('/:id', mutationAccess, routeController.deleteRoute);

export default router;
