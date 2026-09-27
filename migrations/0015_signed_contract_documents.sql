CREATE TABLE signed_contract_documents (
  id serial PRIMARY KEY,
  contract_id integer NOT NULL REFERENCES shop_contracts(id) ON DELETE RESTRICT,
  file_name text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0 AND file_size <= 26214400),
  sha256 char(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  s3_key text NOT NULL UNIQUE,
  uploaded_at timestamp NOT NULL DEFAULT now(),
  uploaded_by_admin_id integer REFERENCES users(id) ON DELETE SET NULL,
  uploaded_by_custom_user_id uuid REFERENCES custom_users(id) ON DELETE SET NULL,
  CONSTRAINT signed_contract_documents_single_uploader_ck
    CHECK (uploaded_by_admin_id IS NULL OR uploaded_by_custom_user_id IS NULL)
);

CREATE INDEX signed_contract_documents_contract_uploaded_idx
  ON signed_contract_documents(contract_id, uploaded_at DESC, id DESC);