import pool from "../../config/db.js";
import ApiResponse from "../../utils/ApiResponse.js";
import ApiError from "../../utils/ApiError.js";
import { USER_QUERIES } from "./user.queries.js";

/**
 * GET /users
 * List all users with their active (verified) status.
 */
export const listAllUsers = async (req, res, next) => {
  try {
    const [users] = await pool.query(USER_QUERIES.LIST_ALL_USERS);
    res
      .status(200)
      .json(new ApiResponse(200, users, "Users fetched successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /users/:id
 * Get details of a specific user by ID.
 */
export const getUserDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [users] = await pool.query(USER_QUERIES.FIND_USER_DETAILS, [id]);

    if (users.length === 0) {
      throw new ApiError(404, "User not found");
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, users[0], "User details fetched successfully"),
      );
  } catch (error) {
    next(error);
  }
};
