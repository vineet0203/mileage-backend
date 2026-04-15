import pool from "../../config/db.js";
import ApiResponse from "../../utils/ApiResponse.js";
import ApiError from "../../utils/ApiError.js";

/**
 * POST /routes
 * Create a new prepaid travel route scoped to the user's organization.
 */
export const createRoute = async (req, res, next) => {
  try {
    const { name, rate, startDestination, endDestination } = req.body;
    const { organization_id } = req.user;

    if (!name || rate === undefined || !startDestination || !endDestination) {
      throw new ApiError(400, "Name, rate, start destination, and end destination are required");
    }

    const [result] = await pool.query(
      "INSERT INTO travel_routes (name, rate, organization_id, start_destination, end_destination) VALUES (?, ?, ?, ?, ?)",
      [name, rate, organization_id, startDestination, endDestination]
    );

    res.status(201).json(new ApiResponse(201, { insertId: result.insertId }, "Route created successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /routes/:id
 * Update an existing route, ensuring it belongs to the user's organization.
 */
export const updateRoute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, rate, startDestination, endDestination } = req.body;
    const { organization_id } = req.user;

    if (!name || rate === undefined || !startDestination || !endDestination) {
      throw new ApiError(400, "Name, rate, start destination, and end destination are required");
    }

    const [result] = await pool.query(
      "UPDATE travel_routes SET name = ?, rate = ?, start_destination = ?, end_destination = ? WHERE id = ? AND organization_id = ?",
      [name, rate, startDestination, endDestination, id, organization_id]
    );

    if (result.affectedRows === 0) {
      throw new ApiError(404, "Route not found or unauthorized");
    }

    res.status(200).json(new ApiResponse(200, null, "Route updated successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /routes/:id
 * Delete a route, ensuring it belongs to the user's organization.
 */
export const deleteRoute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.user;

    const [result] = await pool.query(
      "DELETE FROM travel_routes WHERE id = ? AND organization_id = ?",
      [id, organization_id]
    );

    if (result.affectedRows === 0) {
      throw new ApiError(404, "Route not found or unauthorized");
    }

    res.status(200).json(new ApiResponse(200, null, "Route deleted successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /routes
 * List all routes in the user's organization.
 */
export const listRoutes = async (req, res, next) => {
  try {
    const { name, startDestination, endDestination } = req.query;
    const { organization_id } = req.user;

    let sql = "SELECT id, name, rate, start_destination, end_destination FROM travel_routes WHERE organization_id = ?";
    const params = [organization_id];

    if (name) {
      sql += " AND name LIKE ?";
      params.push(`%${name}%`);
    }
    if (startDestination) {
      sql += " AND start_destination LIKE ?";
      params.push(`%${startDestination}%`);
    }
    if (endDestination) {
      sql += " AND end_destination LIKE ?";
      params.push(`%${endDestination}%`);
    }

    const [routes] = await pool.query(sql, params);

    res.status(200).json(new ApiResponse(200, routes, "Routes fetched successfully"));
  } catch (error) {
    next(error);
  }
};
