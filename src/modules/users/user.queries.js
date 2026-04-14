export const USER_QUERIES = {
  LIST_ALL_USERS: `
    SELECT id, email, role, is_verified, created_at
    FROM users
    ORDER BY created_at DESC;
  `,

  FIND_USER_DETAILS: `
    SELECT id, email, role, is_verified, created_at, updated_at
    FROM users
    WHERE id = ?;
  `,
};
