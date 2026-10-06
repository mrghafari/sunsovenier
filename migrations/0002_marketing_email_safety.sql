-- Idempotent marketing-email safety migration. Customer IDs are cross-database
-- and intentionally have no FK. This migration never changes customer data.
CREATE TABLE IF NOT EXISTS marketing_subscribers (
  id serial PRIMARY KEY, email text NOT NULL, name text, audience text NOT NULL DEFAULT 'prospect',
  source text NOT NULL DEFAULT 'admin', customer_id integer, consent boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false, status text NOT NULL DEFAULT 'active',
  consent_at timestamp, consent_source text, verification_token_hash text,
  verification_expires_at timestamp, unsubscribe_token_hash text, unsubscribed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketing_suppressions (
  id serial PRIMARY KEY, email text NOT NULL, reason text NOT NULL DEFAULT 'unsubscribe',
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketing_subscription_rate_limits (
  rate_key text PRIMARY KEY, last_attempt timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id serial PRIMARY KEY, name text NOT NULL, subject text NOT NULL, html_content text NOT NULL,
  text_content text, audience text NOT NULL DEFAULT 'all', status text NOT NULL DEFAULT 'draft',
  created_by integer, queued_at timestamp, started_at timestamp, completed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketing_campaign_recipients (
  id serial PRIMARY KEY, campaign_id integer NOT NULL, subscriber_id integer, email text NOT NULL,
  normalized_email text, audience text, name text, unsubscribe_url text, status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0, provider_message_id text, last_error text, claimed_at timestamp,
  next_attempt_at timestamp, delivery_unknown boolean NOT NULL DEFAULT false, sent_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

ALTER TABLE marketing_campaign_recipients ADD COLUMN IF NOT EXISTS normalized_email text;
ALTER TABLE marketing_campaign_recipients ADD COLUMN IF NOT EXISTS audience text;
ALTER TABLE marketing_campaign_recipients ADD COLUMN IF NOT EXISTS unsubscribe_url text;
ALTER TABLE marketing_campaign_recipients ADD COLUMN IF NOT EXISTS claimed_at timestamp;
ALTER TABLE marketing_campaign_recipients ADD COLUMN IF NOT EXISTS next_attempt_at timestamp;
ALTER TABLE marketing_campaign_recipients ADD COLUMN IF NOT EXISTS delivery_unknown boolean NOT NULL DEFAULT false;
ALTER TABLE marketing_campaign_recipients ADD COLUMN IF NOT EXISTS provider_message_id text;
ALTER TABLE marketing_campaign_recipients ALTER COLUMN subscriber_id DROP NOT NULL;
UPDATE marketing_campaign_recipients SET normalized_email=lower(trim(email)) WHERE normalized_email IS NULL;
UPDATE marketing_campaign_recipients SET audience='prospect' WHERE audience IS NULL;
-- Legacy unsent rows cannot safely receive a signed URL without application
-- secrets. Cancel them before enforcing the snapshot NOT NULL contract.
UPDATE marketing_campaign_recipients SET status='cancelled', unsubscribe_url='migration-cancelled'
 WHERE unsubscribe_url IS NULL AND status IN ('pending','sending');
UPDATE marketing_campaign_recipients SET unsubscribe_url='migration-cancelled' WHERE unsubscribe_url IS NULL;
ALTER TABLE marketing_campaign_recipients ALTER COLUMN normalized_email SET NOT NULL;
ALTER TABLE marketing_campaign_recipients ALTER COLUMN audience SET NOT NULL;
ALTER TABLE marketing_campaign_recipients ALTER COLUMN unsubscribe_url SET NOT NULL;

-- Preserve the earliest suppression record as canonical and tombstone later
-- duplicates before adding the unique index.
WITH ranked_suppressions AS (
  SELECT id, row_number() OVER (PARTITION BY lower(trim(email)) ORDER BY id) AS n
  FROM marketing_suppressions
)
UPDATE marketing_suppressions s
SET email = 'tombstone+' || s.id || '@invalid.marketing',
    reason = 'duplicate-' || s.reason
FROM ranked_suppressions r
WHERE s.id = r.id AND r.n > 1;
CREATE UNIQUE INDEX IF NOT EXISTS marketing_suppressions_email_idx
 ON marketing_suppressions(email);
-- Preserve every duplicate subscriber while moving non-canonical rows into a
-- non-deliverable namespace. The earliest row remains the canonical identity.
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY email, audience ORDER BY id) AS n
  FROM marketing_subscribers
)
UPDATE marketing_subscribers s
SET email = 'tombstone+' || s.id || '@invalid.marketing',
    audience = 'tombstone-' || s.id,
    status = 'unsubscribed', consent = false, verified = false,
    unsubscribed_at = COALESCE(unsubscribed_at, NOW()), updated_at = NOW()
FROM ranked r
WHERE s.id = r.id AND r.n > 1;
CREATE UNIQUE INDEX IF NOT EXISTS marketing_subscribers_email_audience_idx
 ON marketing_subscribers(email, audience);
-- Resolve duplicate legacy snapshots conservatively before enforcing idempotency.
WITH duplicates AS (
  SELECT id, row_number() OVER (PARTITION BY campaign_id, normalized_email ORDER BY id) AS n
  FROM marketing_campaign_recipients
)
UPDATE marketing_campaign_recipients r SET status='cancelled', last_error='Duplicate legacy recipient'
  , normalized_email = 'tombstone+' || r.id || '@invalid.marketing'
FROM duplicates d WHERE r.id=d.id AND d.n > 1;
CREATE UNIQUE INDEX IF NOT EXISTS marketing_campaign_recipient_email_idx
 ON marketing_campaign_recipients(campaign_id, normalized_email);
DO $$ BEGIN
 ALTER TABLE marketing_campaign_recipients ADD CONSTRAINT marketing_campaign_recipients_campaign_fk
   FOREIGN KEY(campaign_id) REFERENCES marketing_campaigns(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
 ALTER TABLE marketing_campaign_recipients ADD CONSTRAINT marketing_campaign_recipients_subscriber_fk
   FOREIGN KEY(subscriber_id) REFERENCES marketing_subscribers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;