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
-- Mileage is entered manually by the employee at start and end.
-- distance = end_mileage - start_mileage
-- total_price = distance * route_rate
-- Odometer images (start_odometer_img / end_odometer_img) are stored as
-- optional proof only — their values are NOT parsed programmatically.
CREATE TABLE IF NOT EXISTS trips (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  title                   VARCHAR(255)  NOT NULL,
  description             TEXT          DEFAULT NULL,
  user_id                 INT           NOT NULL,
  organization_id         INT           NOT NULL,
  route_id                INT           NOT NULL,

  -- Locked from route at trip creation time so historical data is
  -- preserved even if the route is later edited or deleted.
  route_name              VARCHAR(255)  NOT NULL,
  route_rate              DECIMAL(10,2) NOT NULL,

  -- Start Trip (filled by employee on trip start)
  start_location_address  TEXT          NOT NULL,
  start_odometer_img      VARCHAR(512)  DEFAULT NULL,   -- proof image (relative path)
  start_mileage           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  start_time              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- End Trip (filled by employee on trip end)
  end_location_address    TEXT          DEFAULT NULL,
  end_odometer_img        VARCHAR(512)  DEFAULT NULL,   -- proof image (relative path)
  end_mileage             DECIMAL(10,2) DEFAULT NULL,   -- NULL until trip is ended
  end_time                TIMESTAMP     NULL DEFAULT NULL,

  -- Computed Metrics (calculated on trip end: distance = end_mileage - start_mileage)
  distance                DECIMAL(10,2) DEFAULT 0.00,
  total_price             DECIMAL(10,2) DEFAULT 0.00,

  -- Approval Status
  status                  ENUM('IN_PROGRESS', 'COMPLETED_PENDING', 'APPROVED', 'REJECTED')
                          NOT NULL DEFAULT 'IN_PROGRESS',

  created_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_trip_user  FOREIGN KEY (user_id)         REFERENCES users(id)          ON DELETE CASCADE,
  CONSTRAINT fk_trip_org   FOREIGN KEY (organization_id) REFERENCES organizations(id)  ON DELETE CASCADE,
  CONSTRAINT fk_trip_route FOREIGN KEY (route_id)        REFERENCES travel_routes(id)  ON DELETE CASCADE
);


-- =============================================================================
-- MIGRATION HISTORY
-- Run each block once against your existing database.
-- New installations can skip all migrations (the CREATE TABLE above is current).
-- =============================================================================

-- [MIG-001] CASCADE delete users when their organization is deleted.
ALTER TABLE users
  DROP FOREIGN KEY fk_user_org,
  ADD CONSTRAINT fk_user_org
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE;

-- [MIG-002] Add manual mileage columns.
--           end_mileage is nullable (NULL = trip not yet ended).
--           Skip if columns already exist ("Duplicate column name" error).
ALTER TABLE trips
  ADD COLUMN start_mileage DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER start_odometer_img,
  ADD COLUMN end_mileage   DECIMAL(10,2) DEFAULT NULL           AFTER end_odometer_img;

-- [MIG-003] Remove OCR / AI-extracted columns (no longer used).
--           Image extraction has been replaced by manual mileage entry.
--           Skip individual lines if a column doesn't exist ("Can't DROP" error).
ALTER TABLE trips DROP COLUMN extracted_distance;
ALTER TABLE trips DROP COLUMN extracted_total_price;

-- [MIG-004] Widen image columns to accommodate relative paths stored without
--           a host (e.g. /uploads/image-123.jpg) — safe no-op if already wider.
ALTER TABLE trips
  MODIFY COLUMN start_odometer_img VARCHAR(512) DEFAULT NULL,
  MODIFY COLUMN end_odometer_img   VARCHAR(512) DEFAULT NULL;

-- [MIG-005] Change route_rate to DECIMAL to match actual pricing precision.
ALTER TABLE trips
  MODIFY COLUMN route_rate DECIMAL(10,2) NOT NULL;