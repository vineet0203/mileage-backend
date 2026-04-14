import ApiError from '../utils/ApiError.js';
import { AUTH_MESSAGES } from '../modules/auth/auth.constant.js';

/**
 * Middleware to protect routes and verify JWT.
 * (Placeholder for actual JWT logic)
 */
export const authMiddleware = async (req, res, next) => {
  try {
    // TODO: Extract token from headers (Authorization: Bearer <token>)
    // TODO: Verify JWT token
    // TODO: Fetch user from DB and attach to req.user

    // Skeleton implementation
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new ApiError(401, AUTH_MESSAGES.UNAUTHORIZED);
    }

    // Mocking user for now
    req.user = { id: 'mock-id', role: 'ADMIN' };
    next();
  } catch (error) {
    next(error);
  }
};
