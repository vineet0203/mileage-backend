/**
 * DDL Queries - Table creation only.
 * Run once on application startup to initialize the database schema.
 * Note: The UNIQUE constraint on `email` automatically creates an index.
 */

export const DDL = {

  CREATE_USERS_TABLE: `
    CREATE TABLE IF NOT EXISTS users (
      id                     INT AUTO_INCREMENT PRIMARY KEY,
      email                  VARCHAR(255)  NOT NULL UNIQUE,
      fullname               VARCHAR(255)  DEFAULT NULL,
      password               VARCHAR(255)  DEFAULT NULL,
      role                   ENUM('ADMIN','EMPLOYER','EMPLOYEE') NOT NULL,
      is_verified            TINYINT(1)    NOT NULL DEFAULT 0,
      otp                    VARCHAR(6)    DEFAULT NULL,
      otp_expires_at         DATETIME      DEFAULT NULL,
      reset_token            VARCHAR(255)  DEFAULT NULL,
      reset_token_expires_at DATETIME      DEFAULT NULL,
      invite_token           VARCHAR(255)  DEFAULT NULL,
      refresh_token          TEXT          DEFAULT NULL,
      created_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `,

  CREATE_TRAVEL_ROUTES_TABLE: `
    CREATE TABLE IF NOT EXISTS travel_routes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      rate INT NOT NULL DEFAULT 0,
      start_destination VARCHAR(255) NOT NULL,
      end_destination VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `,
};
