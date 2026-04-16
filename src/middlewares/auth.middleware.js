import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import { AUTH_MESSAGES } from "../modules/auth/auth.constant.js";

/**
 * Verifies the JWT in the Authorization header and attaches the user to req.user.
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, AUTH_MESSAGES.UNAUTHORIZED);
    }

    const token = authHeader.split(" ")[1];

    // Verify signature + expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "jwt_secret");

    // Confirm user still exists in DB
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.fullname, u.role, u.is_verified, u.organization_id, u.manager_id, o.name as organization_name
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = ?
       LIMIT 1`,
      [decoded.id]
    );
    if (users.length === 0) {
      throw new ApiError(401, "User not found or session expired");
    }

    req.user = users[0];
    next();
  } catch (error) {
    next(new ApiError(401, error.message || AUTH_MESSAGES.UNAUTHORIZED));
  }
};
