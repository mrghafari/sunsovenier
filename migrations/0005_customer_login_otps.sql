CREATE TABLE IF NOT EXISTS customer_login_otps (
  id serial PRIMARY KEY,
  challenge_id text NOT NULL UNIQUE,
  customer_id integer NOT NULL REFERENCES crm_customers(id),
  channel text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamp NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  used boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_login_otps_customer_created_idx
ON customer_login_otps (customer_id, created_at DESC);