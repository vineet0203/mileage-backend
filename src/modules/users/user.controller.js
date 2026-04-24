import pool from "../../config/db.js";
import ApiResponse from "../../utils/ApiResponse.js";
import ApiError from "../../utils/ApiError.js";

/**
 * GET /users
 * List employees based on role-based scoping and organization.
 * Admin: All in org
 * Employer (Manager): Self + direct reports
 * Employee: Self + peers (same manager)
 */
export const getEmployees = async (req, res, next) => {
  try {
    const { id, role, organization_id, manager_id } = req.user;
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `
      SELECT 
        u.id, u.email, u.fullname, u.role, u.designation, u.ssn, u.phone,
        u.organization_id, u.manager_id, u.is_verified, u.created_at,
        m.fullname as manager_name
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      WHERE u.organization_id = ?
    `;
    const params = [organization_id];

    if (role === 'MANAGER') {
      sql += " AND (u.id = ? OR u.manager_id = ?)";
      params.push(id, id);
    } else if (role === 'EMPLOYEE') {
      if (manager_id) {
        sql += " AND (u.id = ? OR u.manager_id = ?)";
        params.push(id, manager_id);
      } else {
        sql += " AND u.id = ?";
        params.push(id);
      }
    }

    if (search) {
      sql += " AND (u.fullname LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.designation LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY u.fullname ASC";

    // Add pagination
    sql += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [employees] = await pool.query(sql, params);

    res.status(200).json(
      new ApiResponse(200, {
        employees,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          count: employees.length
        }
      }, "Employees fetched successfully")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /users/:id
 * Get details of a specific user, ensuring they belong to the same organization.
 */
export const getUserDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.user;

    const [users] = await pool.query(
      `SELECT id, email, fullname, role, designation, ssn, phone, organization_id, manager_id, is_verified, created_at 
       FROM users WHERE id = ? AND organization_id = ?`,
      [id, organization_id]
    );

    if (users.length === 0) {
      throw new ApiError(404, "Employee not found in your organization");
    }

    res.status(200).json(
      new ApiResponse(200, users[0], "Employee details fetched successfully")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /users/:id
 * Update a user's profile. All roles can edit their own profile.
 * Admin/Manager can also edit their employees' fullname and designation.
 * Phone is self-only. SSN, role, manager_id are admin-only.
 */
export const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organization_id, role: currentUserRole, id: currentUserId } = req.user;
    const { fullname, role, designation, ssn, phone, manager_id } = req.body;

    // Check if employee exists in org
    const [existing] = await pool.query(
      "SELECT id, manager_id, role FROM users WHERE id = ? AND organization_id = ?",
      [id, organization_id]
    );

    if (existing.length === 0) {
      throw new ApiError(404, "Employee not found");
    }

    // Authorization Layer
    const isEditingSelf   = currentUserId == id;
    const isAdmin         = currentUserRole === 'ADMIN';
    const isManagerOfUser = currentUserRole === 'MANAGER' && existing[0].manager_id === currentUserId;

    // Must be editing self, OR be admin/manager of this user
    if (!isEditingSelf && !isAdmin && !isManagerOfUser) {
      throw new ApiError(403, "Access denied. Only Admins or direct Managers can edit other employees.");
    }

    // Employees cannot edit other users
    if (currentUserRole === 'EMPLOYEE' && !isEditingSelf) {
      throw new ApiError(403, "Employees can only update their own profile.");
    }

    // ── Field permission matrix ────────────────────────────────────────────
    // | Field       | Self (any role) | Admin/Manager on others |
    // |-------------|-----------------|-------------------------|
    // | fullname    | ✅              | ✅                      |
    // | designation | ✅              | ✅                      |
    // | phone       | ✅              | ❌                      |
    // | role        | ❌              | Admin only              |
    // | ssn         | ❌              | Admin only              |
    // | manager_id  | ❌              | Admin only              |
    // ──────────────────────────────────────────────────────────────────────

    const fields = [];
    const values = [];

    // fullname — self or admin/manager on others
    if (fullname !== undefined) {
      fields.push("fullname = COALESCE(?, fullname)");
      values.push(fullname?.trim() || null);
    }

    // designation/skills — self or admin/manager on others
    if (designation !== undefined) {
      fields.push("designation = COALESCE(?, designation)");
      values.push(designation?.trim() || null);
    }

    // phone — self only
    if (phone !== undefined) {
      if (!isEditingSelf) {
        throw new ApiError(403, "Phone number can only be updated by the user themselves.");
      }
      fields.push("phone = COALESCE(?, phone)");
      values.push(phone?.trim() || null);
    }

    // ssn — admin only
    if (ssn !== undefined) {
      if (!isAdmin) {
        throw new ApiError(403, "Only Admins can update SSN.");
      }
      fields.push("ssn = COALESCE(?, ssn)");
      values.push(ssn?.trim() || null);
    }

    // role — admin only, not on self
    if (role !== undefined && role !== existing[0].role) {
      if (!isAdmin || isEditingSelf) {
        throw new ApiError(403, "Only Admins can change roles of other users.");
      }
      if (role === 'ADMIN') {
        throw new ApiError(403, "Cannot assign ADMIN role.");
      }
      fields.push("role = ?");
      values.push(role);
    }

    // manager_id — admin only
    if (manager_id !== undefined) {
      if (!isAdmin) {
        throw new ApiError(403, "Only Admins can change a user's reporting manager.");
      }
      const normalizedManagerId = (manager_id === "" || manager_id === null) ? null : manager_id;
      if (normalizedManagerId !== null) {
        const [mgr] = await pool.query(
          `SELECT id FROM users WHERE id = ? AND organization_id = ? AND role IN ('MANAGER','ADMIN')`,
          [normalizedManagerId, organization_id]
        );
        if (mgr.length === 0) {
          throw new ApiError(400, "Invalid manager. Must be an Admin or Manager in this organization.");
        }
      }
      fields.push("manager_id = ?");
      values.push(normalizedManagerId);
    }

    if (fields.length === 0) {
      throw new ApiError(400, "No valid fields provided for update.");
    }

    values.push(id);
    await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);

    res.status(200).json(
      new ApiResponse(200, null, "Profile updated successfully")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /users/:id
 * Delete employee. Restricted to ADMIN.
 */
export const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.user;

    const [result] = await pool.query(
      "DELETE FROM users WHERE id = ? AND organization_id = ?",
      [id, organization_id]
    );

    if (result.affectedRows === 0) {
      throw new ApiError(404, "Employee not found or unauthorized");
    }

    res.status(200).json(
      new ApiResponse(200, null, "Employee deleted successfully")
    );
  } catch (error) {
    next(error);
  }
};
