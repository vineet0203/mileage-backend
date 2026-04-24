import pool from "../../config/db.js";
import ApiResponse from "../../utils/ApiResponse.js";
import ApiError from "../../utils/ApiError.js";

/**
 * POST /trips/start
 * Create/Start a new trip.
 */
export const startTrip = async (req, res, next) => {
  try {
    const { id: user_id, organization_id } = req.user;
    const { title, description, route_id, start_location_address, start_odometer_img } = req.body;

    if (!title || !route_id || !start_location_address) {
      throw new ApiError(400, "Title, route, and start location are required.");
    }

    // 1. Fetch route to lock rate and name
    const [routes] = await pool.query(
      "SELECT id, name, rate FROM travel_routes WHERE id = ? AND organization_id = ?",
      [route_id, organization_id]
    );

    if (routes.length === 0) {
      throw new ApiError(404, "Selected route not found in your organization.");
    }

    const route = routes[0];

    // 2. Create the trip
    const [result] = await pool.query(
      `INSERT INTO trips 
        (title, description, user_id, organization_id, route_id, route_name, route_rate, start_location_address, start_odometer_img, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'IN_PROGRESS')`,
      [title, description || null, user_id, organization_id, route.id, route.name, route.rate, start_location_address, start_odometer_img || null]
    );

    res.status(201).json(
      new ApiResponse(201, { id: result.insertId }, "Trip started successfully.")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /trips/:id/end
 * End an existing trip.
 */
export const endTrip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: user_id } = req.user;
    const { end_location_address, end_odometer_img } = req.body;

    if (!end_location_address) {
      throw new ApiError(400, "End location address is required.");
    }

    // Fetch trip to get route rate for auto-calculation
    const [trips] = await pool.query(
      "SELECT route_rate FROM trips WHERE id = ? AND user_id = ? AND status = 'IN_PROGRESS'",
      [id, user_id]
    );

    if (trips.length === 0) {
      throw new ApiError(404, "Trip not found or already completed.");
    }

    const { route_rate } = trips[0];

    // MOCK EXTRACTION: Static values for now
    const mockExtractedDistance = 1;
    const mockExtractedPrice = mockExtractedDistance * route_rate;

    // Update trip with end info and mock metrics
    await pool.query(
      `UPDATE trips 
       SET 
         end_location_address = ?, 
         end_odometer_img = ?, 
         end_time = NOW(), 
         status = 'COMPLETED_PENDING',
         extracted_distance = ?,
         distance = ?,
         extracted_total_price = ?,
         total_price = ?
       WHERE id = ?`,
      [
        end_location_address,
        end_odometer_img || null,
        mockExtractedDistance,
        mockExtractedDistance, // Initially same as extracted
        mockExtractedPrice,
        mockExtractedPrice, // Initially same as extracted
        id
      ]
    );

    res.status(200).json(
      new ApiResponse(200, null, "Trip ended successfully. Pending approval.")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /trips
 * List trips based on roles.
 */
export const getTrips = async (req, res, next) => {
  try {
    const { id: user_id, role, organization_id } = req.user;
    const { status, user_id: userIdFilter, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `
      SELECT 
        t.*, 
        u.fullname as employee_name
      FROM trips t
      JOIN users u ON t.user_id = u.id
      WHERE t.organization_id = ?
    `;
    const params = [organization_id];

    // Scoping
    if (role === 'EMPLOYEE') {
      sql += " AND t.user_id = ?";
      params.push(user_id);
    } else if (role === 'MANAGER') {
      // Direct reports + self
      sql += " AND (u.id = ? OR u.manager_id = ?)";
      params.push(user_id, user_id);
    }
    // ADMIN sees all in org (already handled by WHERE t.organization_id = ?)

    if (status) {
      sql += " AND t.status = ?";
      params.push(status);
    }

    if (userIdFilter) {
      sql += " AND t.user_id = ?";
      params.push(userIdFilter);
    }

    sql += " ORDER BY t.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [trips] = await pool.query(sql, params);

    res.status(200).json(
      new ApiResponse(200, trips, "Trips fetched successfully.")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /trips/:id
 * Get details of a single trip.
 */
export const getTripDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: user_id, role, organization_id } = req.user;

    const [trips] = await pool.query(
      `SELECT 
        t.*, 
        u.fullname as employee_name,
        u.email as employee_email,
        u.phone as employee_phone
      FROM trips t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ? AND t.organization_id = ?`,
      [id, organization_id]
    );

    if (trips.length === 0) {
      throw new ApiError(404, "Trip not found.");
    }

    const trip = trips[0];

    // Authorization: Employee can only see their own
    if (role === 'EMPLOYEE' && trip.user_id !== user_id) {
      throw new ApiError(403, "Access denied.");
    }

    res.status(200).json(
      new ApiResponse(200, trip, "Trip details fetched successfully.")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /trips/:id/status
 * Approve or Reject a trip (Admin/Manager).
 */
export const updateTripStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { id: current_user_id, role, organization_id } = req.user;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw new ApiError(400, "Invalid status. Use APPROVED or REJECTED.");
    }

    // 1. Fetch trip and employee to check hierarchy
    const [trips] = await pool.query(
      `SELECT t.*, u.manager_id 
       FROM trips t 
       JOIN users u ON t.user_id = u.id 
       WHERE t.id = ? AND t.organization_id = ?`,
      [id, organization_id]
    );

    if (trips.length === 0) {
      throw new ApiError(404, "Trip not found.");
    }

    const trip = trips[0];

    if (trip.status === 'IN_PROGRESS') {
      throw new ApiError(400, "Cannot approve/reject a trip that is still in progress.");
    }

    // 2. Authorization
    const isAdmin = role === 'ADMIN';
    const isManagerOfUser = role === 'MANAGER' && trip.manager_id === current_user_id;

    if (!isAdmin && !isManagerOfUser) {
      throw new ApiError(403, "Access denied. Only Admins or direct Managers can approve trips.");
    }

    // 3. Update status
    await pool.query(
      "UPDATE trips SET status = ? WHERE id = ?",
      [status, id]
    );

    res.status(200).json(
      new ApiResponse(200, null, `Trip ${status.toLowerCase()} successfully.`)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /trips/:id/metrics
 * Update trip distance and total price (Admin/Manager).
 */
export const updateTripMetrics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { distance, total_price } = req.body;
    const { id: current_user_id, role, organization_id } = req.user;

    // 1. Fetch trip info
    const [trips] = await pool.query(
      `SELECT t.*, u.manager_id 
       FROM trips t 
       JOIN users u ON t.user_id = u.id 
       WHERE t.id = ? AND t.organization_id = ?`,
      [id, organization_id]
    );

    if (trips.length === 0) {
      throw new ApiError(404, "Trip not found.");
    }

    const trip = trips[0];

    // 2. Authorization
    const isAdmin = role === 'ADMIN';
    const isManagerOfUser = role === 'MANAGER' && trip.manager_id === current_user_id;

    if (!isAdmin && !isManagerOfUser) {
      throw new ApiError(403, "Access denied. Only Admins or direct Managers can update trip metrics.");
    }

    // 3. Prepare updates
    const fields = [];
    const values = [];

    if (distance !== undefined) {
      fields.push("distance = ?");
      values.push(distance);
    }

    if (total_price !== undefined) {
      fields.push("total_price = ?");
      values.push(total_price);
    } else if (distance !== undefined) {
      // Auto-calculate total price if only distance is provided (based on locked rate)
      fields.push("total_price = ?");
      values.push(distance * trip.route_rate);
    }

    if (fields.length === 0) {
      throw new ApiError(400, "No metrics provided for update.");
    }

    values.push(id);

    await pool.query(
      `UPDATE trips SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    res.status(200).json(
      new ApiResponse(200, null, "Trip metrics updated successfully.")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /trips/stats
 * Get summary statistics for the user/organization.
 */
export const getStats = async (req, res, next) => {
  try {
    const { id: user_id, role, organization_id, manager_id } = req.user;

    let sql = `
      SELECT 
        COUNT(t.id) as total_trips,
        COALESCE(SUM(CASE WHEN t.status = 'APPROVED' THEN t.distance ELSE 0 END), 0) as total_mileage,
        COALESCE(SUM(CASE WHEN t.status = 'APPROVED' THEN t.total_price ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN t.status = 'APPROVED' AND t.created_at >= DATE_FORMAT(NOW() ,'%Y-%m-01') THEN t.distance ELSE 0 END), 0) as month_distance,
        COALESCE(SUM(CASE WHEN t.status = 'APPROVED' AND t.created_at >= DATE_FORMAT(NOW() ,'%Y-%m-01') THEN t.total_price ELSE 0 END), 0) as month_income
      FROM trips t
      JOIN users u ON t.user_id = u.id
      WHERE t.organization_id = ?
    `;
    const params = [organization_id];

    // Scoping
    if (role === 'EMPLOYEE') {
      sql += " AND t.user_id = ?";
      params.push(user_id);
    } else if (role === 'MANAGER') {
      // Direct reports + self
      sql += " AND (u.id = ? OR u.manager_id = ?)";
      params.push(user_id, user_id);
    }

    const [stats] = await pool.query(sql, params);

    res.status(200).json(
      new ApiResponse(200, stats[0], "Stats fetched successfully.")
    );
  } catch (error) {
    next(error);
  }
};

