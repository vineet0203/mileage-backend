import pool from "../../config/db.js";
import ApiResponse from "../../utils/ApiResponse.js";
import ApiError from "../../utils/ApiError.js";
import { ROUTE_QUERIES } from "./route.queries.js";

/**
 * POST /routes
 * Create a new prepaid travel route
 */
export const createRoute = async (req, res, next) => {
  try {
    const { name, startDestination, endDestination } = req.body;

    if (!name || !startDestination || !endDestination) {
      throw new ApiError(400, "Name, start destination, and end destination are required");
    }

    const [result] = await pool.query(ROUTE_QUERIES.INSERT_ROUTE, [
      name,
      startDestination,
      endDestination,
    ]);

    res.status(201).json(new ApiResponse(201, { insertId: result.insertId }, "Route created successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /routes/:id
 * Update an existing route
 */
export const updateRoute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, startDestination, endDestination } = req.body;

    if (!name || !startDestination || !endDestination) {
      throw new ApiError(400, "Name, start destination, and end destination are required");
    }

    const [result] = await pool.query(ROUTE_QUERIES.UPDATE_ROUTE, [
      name,
      startDestination,
      endDestination,
      id,
    ]);

    if (result.affectedRows === 0) {
      throw new ApiError(404, "Route not found");
    }

    res.status(200).json(new ApiResponse(200, null, "Route updated successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /routes/:id
 * Delete a route
 */
export const deleteRoute = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(ROUTE_QUERIES.DELETE_ROUTE, [id]);

    if (result.affectedRows === 0) {
      throw new ApiError(404, "Route not found");
    }

    res.status(200).json(new ApiResponse(200, null, "Route deleted successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /routes
 * List all routes or search by criteria
 */
export const listRoutes = async (req, res, next) => {
  try {
    const { name, startDestination, endDestination } = req.query;

    const nameParam = name ? `%${name}%` : null;
    const startParam = startDestination ? `%${startDestination}%` : null;
    const endParam = endDestination ? `%${endDestination}%` : null;

    const [routes] = await pool.query(ROUTE_QUERIES.SEARCH_ROUTES, [
      nameParam, nameParam,
      startParam, startParam,
      endParam, endParam
    ]);

    res.status(200).json(new ApiResponse(200, routes, "Routes fetched successfully"));
  } catch (error) {
    next(error);
  }
};
