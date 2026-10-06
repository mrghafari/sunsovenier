-- Company removal preserves reference data and all financial/audit history.
-- No existing company is deleted or deactivated by this migration.
ALTER TABLE accounting_companies ADD COLUMN deleted_at timestamptz;
ALTER TABLE accounting_companies ADD CONSTRAINT accounting_deleted_company_inactive
  CHECK(deleted_at IS NULL OR is_active=false);
