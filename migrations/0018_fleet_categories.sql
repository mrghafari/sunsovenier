-- Additive development migration. Existing physical vehicles stay in the general fleet.
-- Vehicle templates intentionally remain shared and unchanged.
ALTER TABLE ready_vehicles
  ADD COLUMN IF NOT EXISTS fleet_category varchar(20) NOT NULL DEFAULT 'standard';
ALTER TABLE delivery_vehicles
  ADD COLUMN IF NOT EXISTS fleet_category varchar(20) NOT NULL DEFAULT 'standard';
