import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

/**
 * Singleton MySQL connection pool.
 * Created once and reused across the entire application.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "mileage_db",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Tests the database connection.
 */
const testConnection = async () => {
  const connection = await pool.getConnection();
  console.log(
    `Database connected successfully → ${process.env.DB_NAME || "mileage_db"}`,
  );
  connection.release();
};

/**
 * Entry point: called once at application startup.
 */
export const initDb = async () => {
  try {
    await testConnection();
    // Manual setup: Table creation is now handled manually to avoid re-runs on reload.
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    process.exit(1);
  }
};

export default pool;
