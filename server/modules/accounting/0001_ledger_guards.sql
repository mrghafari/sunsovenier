-- Run AFTER the generated accounting migration, in the same atomic dev batch.
-- Enforce integrity even when an application caller bypasses the service.
CREATE OR REPLACE FUNCTION accounting_guard_company() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(718392, 0);
  IF TG_OP = 'UPDATE' AND NEW.base_currency <> OLD.base_currency
     AND EXISTS (SELECT 1 FROM accounting_journal_entries WHERE company_id = OLD.id) THEN
    RAISE EXCEPTION 'Base currency is locked once journals exist';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_guard_company BEFORE INSERT OR UPDATE ON accounting_companies
  FOR EACH ROW EXECUTE FUNCTION accounting_guard_company();

CREATE OR REPLACE FUNCTION accounting_guard_currency() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(718392, 0);
  IF NEW.code <> OLD.code THEN RAISE EXCEPTION 'Currency code is immutable'; END IF;
  IF NEW.decimals <> OLD.decimals AND (
     EXISTS (SELECT 1 FROM accounting_journal_lines WHERE currency = OLD.code)
     OR EXISTS (SELECT 1 FROM accounting_journal_entries e JOIN accounting_companies c ON c.id=e.company_id WHERE c.base_currency=OLD.code)
  ) THEN RAISE EXCEPTION 'Currency precision is locked once journals exist'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_guard_currency BEFORE UPDATE ON accounting_currencies
  FOR EACH ROW EXECUTE FUNCTION accounting_guard_currency();

CREATE OR REPLACE FUNCTION accounting_guard_fiscal_year() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(718392, 0);
  IF TG_OP = 'UPDATE' THEN
    IF NEW.company_id <> OLD.company_id THEN RAISE EXCEPTION 'Fiscal year company is immutable'; END IF;
    IF OLD.status = 'closed' AND (NEW.status <> OLD.status OR NEW.starts_on <> OLD.starts_on OR NEW.ends_on <> OLD.ends_on) THEN
      RAISE EXCEPTION 'Closed fiscal periods cannot be reopened or redated';
    END IF;
    IF (NEW.starts_on <> OLD.starts_on OR NEW.ends_on <> OLD.ends_on)
      AND EXISTS (SELECT 1 FROM accounting_journal_entries WHERE fiscal_year_id = OLD.id) THEN
      RAISE EXCEPTION 'Fiscal dates are locked once journals exist';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM accounting_fiscal_years y WHERE y.company_id=NEW.company_id
    AND y.id <> NEW.id AND y.starts_on <= NEW.ends_on AND y.ends_on >= NEW.starts_on) THEN
    RAISE EXCEPTION 'Fiscal periods must not overlap';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_guard_fiscal_year BEFORE INSERT OR UPDATE ON accounting_fiscal_years
  FOR EACH ROW EXECUTE FUNCTION accounting_guard_fiscal_year();

CREATE OR REPLACE FUNCTION accounting_guard_tax_rule() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(718392, 0);
  IF NEW.is_active AND EXISTS (
    SELECT 1 FROM accounting_tax_rules t WHERE t.company_id=NEW.company_id AND t.country_code=NEW.country_code
    AND t.product_group=NEW.product_group AND t.is_active AND t.id <> NEW.id
    AND t.valid_from <= COALESCE(NEW.valid_to,'9999-12-31'::date)
    AND NEW.valid_from <= COALESCE(t.valid_to,'9999-12-31'::date)
  ) THEN RAISE EXCEPTION 'Active tax rules cannot overlap'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_guard_tax_rule BEFORE INSERT OR UPDATE ON accounting_tax_rules
  FOR EACH ROW EXECUTE FUNCTION accounting_guard_tax_rule();

CREATE OR REPLACE FUNCTION accounting_guard_account() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_row accounting_accounts;
BEGIN
  PERFORM pg_advisory_xact_lock(718392, 0);
  IF TG_OP = 'UPDATE' THEN
    IF NEW.company_id <> OLD.company_id THEN RAISE EXCEPTION 'Account company is immutable'; END IF;
    IF (NEW.type <> OLD.type OR NEW.code <> OLD.code OR NEW.is_posting <> OLD.is_posting)
      AND EXISTS (SELECT 1 FROM accounting_journal_lines WHERE account_id=OLD.id) THEN
      RAISE EXCEPTION 'Used account identity and type are locked';
    END IF;
    IF (NOT NEW.is_active OR NOT NEW.is_posting OR NEW.type <> OLD.type)
      AND EXISTS (SELECT 1 FROM accounting_posting_rules WHERE account_id=OLD.id) THEN
      RAISE EXCEPTION 'Remap posting rules before changing this account';
    END IF;
  END IF;
  IF NEW.parent_id IS NOT NULL THEN
    SELECT * INTO parent_row FROM accounting_accounts WHERE id=NEW.parent_id;
    IF NOT FOUND OR parent_row.company_id<>NEW.company_id OR parent_row.is_posting OR NOT parent_row.is_active THEN
      RAISE EXCEPTION 'Invalid account parent';
    END IF;
    IF EXISTS (WITH RECURSIVE parents AS (
      SELECT id,parent_id FROM accounting_accounts WHERE id=NEW.parent_id
      UNION SELECT a.id,a.parent_id FROM accounting_accounts a JOIN parents p ON a.id=p.parent_id
    ) SELECT 1 FROM parents WHERE id=NEW.id) THEN RAISE EXCEPTION 'Account hierarchy cycle'; END IF;
  END IF;
  IF NEW.is_posting AND EXISTS (SELECT 1 FROM accounting_accounts WHERE parent_id=NEW.id) THEN
    RAISE EXCEPTION 'Account with children cannot be a posting account';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_guard_account BEFORE INSERT OR UPDATE ON accounting_accounts
  FOR EACH ROW EXECUTE FUNCTION accounting_guard_account();

CREATE OR REPLACE FUNCTION accounting_guard_posting_rule() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a accounting_accounts; expected_type text;
BEGIN
  PERFORM pg_advisory_xact_lock(718392, 0);
  expected_type := CASE
    WHEN NEW.key IN ('BANK','CASH','CHEQUE_CLEARING','ACCOUNTS_RECEIVABLE','INVENTORY') THEN 'asset'
    WHEN NEW.key IN ('WALLET_LIABILITY','TAX_PAYABLE','CARRIER_PAYABLE') THEN 'liability'
    WHEN NEW.key IN ('SALES_REVENUE','SHIPPING_REVENUE','FX_GAIN') THEN 'revenue'
    WHEN NEW.key IN ('SHIPPING_EXPENSE','FLEET_COST_ABSORBED','COGS','BANK_FEES','FX_LOSS') THEN 'expense'
    WHEN NEW.key = 'OPENING_BALANCE_EQUITY' THEN 'equity' ELSE NULL END;
  SELECT * INTO a FROM accounting_accounts WHERE id=NEW.account_id;
  IF NOT FOUND OR expected_type IS NULL OR NOT a.is_active OR NOT a.is_posting
    OR a.company_id<>NEW.company_id OR a.type<>expected_type THEN RAISE EXCEPTION 'Invalid posting account mapping'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_guard_posting_rule BEFORE INSERT OR UPDATE ON accounting_posting_rules
  FOR EACH ROW EXECUTE FUNCTION accounting_guard_posting_rule();

CREATE OR REPLACE FUNCTION accounting_guard_journal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE y accounting_fiscal_years; c accounting_companies; original accounting_journal_entries;
BEGIN
  PERFORM pg_advisory_xact_lock(718392, 0);
  IF TG_OP <> 'INSERT' AND OLD.status='posted' THEN RAISE EXCEPTION 'Posted journals are immutable; create a reversal'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  SELECT * INTO c FROM accounting_companies WHERE id=NEW.company_id FOR SHARE;
  IF NOT FOUND OR NOT c.is_active THEN RAISE EXCEPTION 'Active company required'; END IF;
  SELECT * INTO y FROM accounting_fiscal_years WHERE id=NEW.fiscal_year_id FOR SHARE;
  IF NOT FOUND OR y.company_id<>NEW.company_id OR y.status<>'open'
    OR NEW.entry_date<y.starts_on OR NEW.entry_date>y.ends_on THEN RAISE EXCEPTION 'Entry date must belong to an open fiscal year'; END IF;
  IF NEW.reversal_of_id IS NOT NULL THEN
    SELECT * INTO original FROM accounting_journal_entries WHERE id=NEW.reversal_of_id;
    IF NOT FOUND OR original.status<>'posted' OR original.company_id<>NEW.company_id OR original.reversal_of_id IS NOT NULL THEN
      RAISE EXCEPTION 'Invalid reversal target';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_guard_journal BEFORE INSERT OR UPDATE OR DELETE ON accounting_journal_entries
  FOR EACH ROW EXECUTE FUNCTION accounting_guard_journal();

CREATE OR REPLACE FUNCTION accounting_guard_journal_line() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE header accounting_journal_entries; a accounting_accounts; c accounting_companies; curr accounting_currencies;
  base_curr accounting_currencies; center accounting_cost_centers;
BEGIN
  PERFORM pg_advisory_xact_lock(718392, 0);
  IF TG_OP <> 'INSERT' THEN
    SELECT * INTO header FROM accounting_journal_entries WHERE id=OLD.entry_id FOR UPDATE;
    IF header.status='posted' THEN RAISE EXCEPTION 'Posted journal lines are immutable'; END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  END IF;
  SELECT * INTO header FROM accounting_journal_entries WHERE id=NEW.entry_id FOR UPDATE;
  IF NOT FOUND OR header.status='posted' THEN RAISE EXCEPTION 'Lines require a draft journal'; END IF;
  SELECT * INTO a FROM accounting_accounts WHERE id=NEW.account_id;
  IF NOT FOUND OR a.company_id<>header.company_id OR NOT a.is_posting OR NOT a.is_active THEN RAISE EXCEPTION 'Invalid journal account'; END IF;
  IF NEW.cost_center_id IS NOT NULL THEN
    SELECT * INTO center FROM accounting_cost_centers WHERE id=NEW.cost_center_id;
    IF NOT FOUND OR center.company_id<>header.company_id OR NOT center.is_active THEN RAISE EXCEPTION 'Invalid cost center'; END IF;
  END IF;
  SELECT * INTO c FROM accounting_companies WHERE id=header.company_id;
  SELECT * INTO base_curr FROM accounting_currencies WHERE code=c.base_currency;
  SELECT * INTO curr FROM accounting_currencies WHERE code=NEW.currency;
  IF NOT FOUND OR NOT curr.is_active OR NOT base_curr.is_active THEN RAISE EXCEPTION 'Active currency required'; END IF;
  IF NEW.currency=c.base_currency AND NEW.exchange_rate<>1 THEN RAISE EXCEPTION 'Base currency rate must equal one'; END IF;
  IF NEW.debit<>round(NEW.debit,curr.decimals) OR NEW.credit<>round(NEW.credit,curr.decimals)
    OR NEW.base_debit<>round(NEW.debit*NEW.exchange_rate,base_curr.decimals)
    OR NEW.base_credit<>round(NEW.credit*NEW.exchange_rate,base_curr.decimals) THEN
      RAISE EXCEPTION 'Invalid currency precision or base conversion';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_guard_journal_line BEFORE INSERT OR UPDATE OR DELETE ON accounting_journal_lines
  FOR EACH ROW EXECUTE FUNCTION accounting_guard_journal_line();

CREATE OR REPLACE FUNCTION accounting_assert_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_id integer; state text; debit_sum numeric; credit_sum numeric; line_count integer;
BEGIN
  IF TG_TABLE_NAME='accounting_journal_entries' THEN target_id := COALESCE(NEW.id,OLD.id);
  ELSE target_id := COALESCE(NEW.entry_id,OLD.entry_id); END IF;
  SELECT status INTO state FROM accounting_journal_entries WHERE id=target_id;
  IF state='posted' THEN
    SELECT count(*),COALESCE(sum(base_debit),0),COALESCE(sum(base_credit),0)
      INTO line_count,debit_sum,credit_sum FROM accounting_journal_lines WHERE entry_id=target_id;
    IF line_count<2 OR debit_sum<=0 OR debit_sum<>credit_sum THEN RAISE EXCEPTION 'Posted journal must balance in base currency'; END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER accounting_balance_header AFTER INSERT OR UPDATE ON accounting_journal_entries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_assert_balanced();
CREATE CONSTRAINT TRIGGER accounting_balance_lines AFTER INSERT OR UPDATE OR DELETE ON accounting_journal_lines
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_assert_balanced();

CREATE OR REPLACE FUNCTION accounting_immutable_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Accounting audit records are immutable'; END $$;
CREATE TRIGGER accounting_immutable_audit BEFORE UPDATE OR DELETE ON accounting_audit_logs
  FOR EACH ROW EXECUTE FUNCTION accounting_immutable_audit();