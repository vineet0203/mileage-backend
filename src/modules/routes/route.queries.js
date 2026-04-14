export const ROUTE_QUERIES = {
  INSERT_ROUTE: `
    INSERT INTO travel_routes (name, rate, start_destination, end_destination)
    VALUES (?, ?, ?, ?);
  `,

  UPDATE_ROUTE: `
    UPDATE travel_routes
    SET name = ?, rate = ?, start_destination = ?, end_destination = ?
    WHERE id = ?;
  `,

  DELETE_ROUTE: `
    DELETE FROM travel_routes
    WHERE id = ?;
  `,

  FIND_BY_ID: `
    SELECT id, name, rate, start_destination, end_destination, created_at, updated_at
    FROM travel_routes
    WHERE id = ?;
  `,

  SEARCH_ROUTES: `
    SELECT id, name, rate, start_destination, end_destination, created_at, updated_at
    FROM travel_routes
    WHERE
      (? IS NULL OR name LIKE ?) AND
      (? IS NULL OR start_destination LIKE ?) AND
      (? IS NULL OR end_destination LIKE ?)
    ORDER BY created_at DESC;
  `,
};
