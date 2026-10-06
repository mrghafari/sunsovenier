CREATE TABLE IF NOT EXISTS logistics_shipping_center (
  id integer PRIMARY KEY CHECK (id = 1),
  country_code text NOT NULL,
  province_id integer NOT NULL REFERENCES iraqi_provinces(id),
  city_id integer NOT NULL REFERENCES iraqi_cities(id),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS logistics_route_distances (
  id serial PRIMARY KEY,
  origin_city_id integer NOT NULL REFERENCES iraqi_cities(id),
  destination_city_id integer NOT NULL REFERENCES iraqi_cities(id),
  distance_km numeric(10, 2) NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT logistics_route_distances_nonnegative_ck
    CHECK (distance_km >= 0),
  CONSTRAINT logistics_route_distances_same_city_ck
    CHECK (
      (origin_city_id = destination_city_id AND distance_km = 0)
      OR (origin_city_id <> destination_city_id AND distance_km > 0)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS logistics_route_distances_origin_destination_uidx
  ON logistics_route_distances (origin_city_id, destination_city_id);

CREATE INDEX IF NOT EXISTS logistics_route_distances_destination_idx
  ON logistics_route_distances (destination_city_id);