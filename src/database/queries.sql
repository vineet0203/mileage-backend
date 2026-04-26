-- DDL Queries - Schema initialization and maintenance.
-- Run these queries in your MySQL client to initialize or update the database.

-- --- INITIAL SCHEMA ---

CREATE TABLE IF NOT EXISTS organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  website VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  email                  VARCHAR(255)  NOT NULL UNIQUE,
  fullname               VARCHAR(255)  DEFAULT NULL,
  password               VARCHAR(255)  DEFAULT NULL,
  role                   ENUM('ADMIN','MANAGER','EMPLOYEE') NOT NULL,
  designation            TEXT  DEFAULT NULL,
  ssn                    VARCHAR(20)   DEFAULT NULL,
  phone                  VARCHAR(20)   DEFAULT NULL,
  organization_id        INT           DEFAULT NULL,
  manager_id             INT           DEFAULT NULL,
  is_verified            TINYINT(1)    NOT NULL DEFAULT 0,
  otp                    VARCHAR(6)    DEFAULT NULL,
  otp_expires_at         DATETIME      DEFAULT NULL,
  reset_token            VARCHAR(255)  DEFAULT NULL,
  reset_token_expires_at DATETIME      DEFAULT NULL,
  invite_token           VARCHAR(255)  DEFAULT NULL,
  refresh_token          TEXT          DEFAULT NULL,
  created_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS travel_routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  rate INT NOT NULL DEFAULT 0,
  organization_id INT DEFAULT NULL,
  start_destination VARCHAR(255) NOT NULL,
  end_destination VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_route_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- TRIP MODULE SCHEMA
CREATE TABLE IF NOT EXISTS trips (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  title                   VARCHAR(255)  NOT NULL,
  description             TEXT          DEFAULT NULL,
  user_id                 INT           NOT NULL,
  organization_id         INT           NOT NULL,
  route_id                INT           NOT NULL,
  
  -- Captured from route at creation time
  route_name              VARCHAR(255)  NOT NULL,
  route_rate              INT           NOT NULL,
  
  -- Start Trip
  start_location_address  TEXT          NOT NULL,
  start_odometer_img      VARCHAR(255)  DEFAULT NULL,
  start_mileage           DECIMAL(10,2) DEFAULT 0.00,
  start_time              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- End Trip
  end_location_address    TEXT          DEFAULT NULL,
  end_odometer_img        VARCHAR(255)  DEFAULT NULL,
  end_mileage             DECIMAL(10,2) DEFAULT 0.00,
  end_time                TIMESTAMP     NULL DEFAULT NULL,
  
  -- Metrics
  extracted_distance      DECIMAL(10,2) DEFAULT 0.00,
  distance                DECIMAL(10,2) DEFAULT 0.00,
  extracted_total_price   DECIMAL(10,2) DEFAULT 0.00,
  total_price             DECIMAL(10,2) DEFAULT 0.00,
  
  -- Combined Status Logic
  status                  ENUM('IN_PROGRESS', 'COMPLETED_PENDING', 'APPROVED', 'REJECTED') 
                          NOT NULL DEFAULT 'IN_PROGRESS',
  
  created_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_trip_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_trip_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_trip_route FOREIGN KEY (route_id) REFERENCES travel_routes(id) ON DELETE CASCADE
);

-- MIGRATION HISTORY 

-- CASCADE delete users when their organization is deleted.
ALTER TABLE users
  DROP FOREIGN KEY fk_user_org,
  ADD CONSTRAINT fk_user_org
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE;

-- Add mileage tracking columns to trips table.
ALTER TABLE trips 
  ADD COLUMN start_mileage DECIMAL(10, 2) DEFAULT 0.00 AFTER start_odometer_img, 
  ADD COLUMN end_mileage DECIMAL(10, 2) DEFAULT 0.00 AFTER end_odometer_img;