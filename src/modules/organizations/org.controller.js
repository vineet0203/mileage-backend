import pool from "../../config/db.js";
import ApiResponse from "../../utils/ApiResponse.js";
import ApiError from "../../utils/ApiError.js";

/**
 * GET /organizations/me
 * Get current user's organization details.
 */
export const getMyOrg = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) {
      throw new ApiError(404, "User is not associated with any organization");
    }

    const [orgs] = await pool.query(
      "SELECT id, name, website, phone, created_at FROM organizations WHERE id = ?",
      [orgId]
    );

    if (orgs.length === 0) {
      throw new ApiError(404, "Organization not found");
    }

    res.status(200).json(
      new ApiResponse(200, orgs[0], "Organization details fetched successfully")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /organizations/me
 * Update current user's organization details.
 * Restricted to ADMIN and EMPLOYER roles.
 */
export const updateOrg = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) {
      throw new ApiError(404, "User is not associated with any organization");
    }

    const { name, website, phone } = req.body;
    if (!name) {
      throw new ApiError(400, "Organization name is required");
    }

    await pool.query(
      "UPDATE organizations SET name = ?, website = ?, phone = ? WHERE id = ?",
      [name, website || null, phone || null, orgId]
    );

    res.status(200).json(
      new ApiResponse(200, null, "Organization updated successfully")
    );
  } catch (error) {
    next(error);
  }
};
