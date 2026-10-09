import type { Pool } from "pg";
import { contractEmailDefaults } from "./contract-signing-email";

// Additive, idempotent setup also runs in a published server; no existing
// agreement, payment, account balance, or uploaded archive is modified.
export async function ensureContractSigningSchema(connectionPool: Pool) {
  const pool = await connectionPool.connect();
  try {
  await pool.query("BEGIN");
  await pool.query("SELECT pg_advisory_xact_lock(61833,1)");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS legal_contract_signing_settings (
      id integer PRIMARY KEY CHECK (id=1),
      sender_id integer REFERENCES smtp_settings(id) ON DELETE RESTRICT,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO legal_contract_signing_settings(id) VALUES(1) ON CONFLICT DO NOTHING;
    CREATE TABLE IF NOT EXISTS electronic_contract_signatures (
      id uuid PRIMARY KEY, customer_id integer NOT NULL REFERENCES crm_customers(id) ON DELETE RESTRICT,
      contract_id integer NOT NULL REFERENCES shop_contracts(id) ON DELETE RESTRICT,
      addendum_id integer REFERENCES shop_contract_addenda(id) ON DELETE RESTRICT,
      document_key text NOT NULL, version_hash char(64) NOT NULL,
      document_snapshot jsonb NOT NULL, signer_name text NOT NULL, customer_email text NOT NULL,
      strokes jsonb NOT NULL, consent_text text NOT NULL, read_confirmed_at timestamptz NOT NULL,
      signed_at timestamptz NOT NULL, request_ip text, user_agent text,
      pdf_key text NOT NULL UNIQUE, pdf_sha256 char(64) NOT NULL,
      email_status text NOT NULL DEFAULT 'pending' CHECK(email_status IN ('pending','sending','accepted','failed')),
      email_error text, email_attempts integer NOT NULL DEFAULT 0, last_email_attempt_at timestamptz,
      next_email_attempt_at timestamptz DEFAULT now(), email_accepted_at timestamptz,
      UNIQUE(customer_id, document_key, version_hash)
    );
    CREATE INDEX IF NOT EXISTS electronic_contract_signatures_customer_idx
      ON electronic_contract_signatures(customer_id, signed_at DESC);
    CREATE TABLE IF NOT EXISTS contract_signing_challenges (
      id uuid PRIMARY KEY, customer_id integer NOT NULL REFERENCES crm_customers(id) ON DELETE RESTRICT,
      contract_id integer NOT NULL REFERENCES shop_contracts(id) ON DELETE RESTRICT,
      addendum_id integer REFERENCES shop_contract_addenda(id) ON DELETE RESTRICT,
      document_key text NOT NULL, version_hash char(64) NOT NULL, document_snapshot jsonb NOT NULL,
      signer_name text NOT NULL, customer_email text NOT NULL, strokes jsonb NOT NULL,
      consent_text text NOT NULL, otp_hash char(64) NOT NULL, expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 0,
      email_sent_at timestamptz, consumed_at timestamptz,
      CHECK(attempts BETWEEN 0 AND 5)
    );
    CREATE INDEX IF NOT EXISTS contract_signing_challenges_customer_time_idx
      ON contract_signing_challenges(customer_id, created_at DESC);
    CREATE OR REPLACE FUNCTION protect_electronic_contract_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Signed contract evidence cannot be deleted'; END IF;
      IF (to_jsonb(NEW) - ARRAY['email_status','email_error','email_attempts','last_email_attempt_at','next_email_attempt_at','email_accepted_at'])
         IS DISTINCT FROM
         (to_jsonb(OLD) - ARRAY['email_status','email_error','email_attempts','last_email_attempt_at','next_email_attempt_at','email_accepted_at'])
      THEN RAISE EXCEPTION 'Signed contract evidence is immutable'; END IF;
      RETURN NEW;
    END $$;
    DROP TRIGGER IF EXISTS electronic_contract_evidence_guard ON electronic_contract_signatures;
    CREATE TRIGGER electronic_contract_evidence_guard BEFORE UPDATE OR DELETE ON electronic_contract_signatures
      FOR EACH ROW EXECUTE FUNCTION protect_electronic_contract_evidence();
  `);
  const creator = await pool.query("SELECT id FROM users WHERE is_active=true ORDER BY id LIMIT 1");
  if (!creator.rows[0]) throw new Error("An active administrator is required to initialize contract email templates.");
  for (const template of contractEmailDefaults()) {
    await pool.query(`INSERT INTO email_templates
      (name,category,subject,html_content,text_content,variables,is_active,language,created_by)
      SELECT $1,'notifications',$2,$3,$4,$5::json,true,$6,$7
      WHERE NOT EXISTS(SELECT 1 FROM email_templates WHERE name=$1 AND language=$6)`,
    [template.name, template.subject, template.html, template.text, JSON.stringify(template.variables), template.language, creator.rows[0].id]);
  }
  await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  } finally { pool.release(); }
}
