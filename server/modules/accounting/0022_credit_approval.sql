-- A separate, closed-by-default gate: a reconciled prepaid opening alone does
-- not prove completeness of receivables or outstanding cheque exposure.
CREATE TABLE accounting_credit_cutovers (
  company_id integer PRIMARY KEY REFERENCES accounting_companies(id),
  processing_ready boolean NOT NULL DEFAULT false,
  enabled_at timestamptz,
  opening_reference text,
  reviewed_by integer,
  CHECK (NOT processing_ready OR (
    enabled_at IS NOT NULL AND length(trim(opening_reference)) >= 5 AND reviewed_by > 0
  ))
);
INSERT INTO accounting_credit_cutovers(company_id) SELECT id FROM accounting_companies;