CREATE TABLE accounting_manual_cutovers (
  company_id integer PRIMARY KEY REFERENCES accounting_companies(id),
  processing_ready boolean NOT NULL DEFAULT false
);
CREATE TABLE accounting_manual_documents (
  id serial PRIMARY KEY,company_id integer NOT NULL REFERENCES accounting_companies(id),
  source_id text NOT NULL,kind text NOT NULL CHECK(kind IN ('manual','expense')),
  input jsonb NOT NULL,status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','posted','discarded')),
  revision integer NOT NULL DEFAULT 1 CHECK(revision>0),currency text NOT NULL,
  debit numeric(38,8) NOT NULL CHECK(debit>0),credit numeric(38,8) NOT NULL CHECK(credit>0),
  journal_id integer UNIQUE REFERENCES accounting_journal_entries(id),
  reversal_journal_id integer UNIQUE REFERENCES accounting_journal_entries(id),reversal_evidence jsonb,
  UNIQUE(company_id,source_id),
  CHECK((status='posted')=(journal_id IS NOT NULL)
    AND (reversal_journal_id IS NULL)=(reversal_evidence IS NULL)
    AND (reversal_journal_id IS NULL OR status='posted'))
);
CREATE INDEX accounting_manual_company ON accounting_manual_documents(company_id,status);

CREATE FUNCTION accounting_guard_manual_document() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE company accounting_companies; entry accounting_journal_entries; rev accounting_journal_entries;
BEGIN
  PERFORM pg_advisory_xact_lock(718392,0);
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Manual documents are retained; discard drafts instead'; END IF;
  SELECT * INTO company FROM accounting_companies WHERE id=NEW.company_id;
  IF NEW.currency IS DISTINCT FROM company.base_currency OR NEW.input->>'kind' IS DISTINCT FROM NEW.kind
    OR (NEW.input->>'companyId')::integer IS DISTINCT FROM NEW.company_id OR NEW.input->>'sourceId' IS DISTINCT FROM NEW.source_id
    OR jsonb_typeof(NEW.input->'lines') IS DISTINCT FROM 'array'
    OR jsonb_array_length(NEW.input->'lines') NOT BETWEEN 2 AND 100
    OR COALESCE(length(trim(NEW.input->>'description')),0)<5 OR COALESCE(length(trim(NEW.input->>'evidenceReference')),0)<5
    OR NEW.input->>'entryDate' IS NULL THEN
    RAISE EXCEPTION 'Manual document identity/evidence is invalid';
  END IF;
  IF NEW.debit<>(SELECT sum((l->>'debit')::numeric) FROM jsonb_array_elements(NEW.input->'lines') l)
    OR NEW.credit<>(SELECT sum((l->>'credit')::numeric) FROM jsonb_array_elements(NEW.input->'lines') l) THEN
    RAISE EXCEPTION 'Manual document totals do not match its lines';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status<>'draft' OR NEW.revision<>1 THEN RAISE EXCEPTION 'Create a draft before posting'; END IF;
  ELSE
    IF NEW.id<>OLD.id OR NEW.company_id<>OLD.company_id OR NEW.source_id<>OLD.source_id OR NEW.revision<>OLD.revision+1 THEN
      RAISE EXCEPTION 'Manual document identity/version is locked';
    END IF;
    IF OLD.status='discarded' OR OLD.reversal_journal_id IS NOT NULL THEN RAISE EXCEPTION 'Final manual document is immutable'; END IF;
    IF OLD.status='posted' AND (NEW.input<>OLD.input OR NEW.status<>OLD.status OR NEW.kind<>OLD.kind
      OR NEW.journal_id<>OLD.journal_id OR NEW.currency<>OLD.currency OR NEW.debit<>OLD.debit OR NEW.credit<>OLD.credit
      OR NEW.reversal_journal_id IS NULL) THEN RAISE EXCEPTION 'Posted document is immutable except its exact reversal link'; END IF;
  END IF;
  IF NEW.status='posted' THEN
    IF NOT company.is_active
      OR NOT COALESCE((SELECT processing_ready FROM accounting_manual_cutovers WHERE company_id=NEW.company_id),false)
      OR NOT COALESCE((SELECT processing_ready FROM accounting_receipt_cutovers WHERE company_id=NEW.company_id),false)
      OR NOT COALESCE((SELECT pipeline_ready FROM accounting_wallet_cutovers WHERE company_id=NEW.company_id),false) THEN
      RAISE EXCEPTION 'Manual financial activation is closed';
    END IF;
    SELECT * INTO entry FROM accounting_journal_entries WHERE id=NEW.journal_id;
    IF NOT FOUND OR entry.status<>'posted' OR entry.company_id<>NEW.company_id
      OR entry.source_type<>(CASE WHEN NEW.kind='expense' THEN 'ManualExpense' ELSE 'ManualJournal' END)
      OR entry.source_id<>NEW.source_id OR entry.description IS DISTINCT FROM NEW.input->>'description'
      OR entry.entry_date<>(NEW.input->>'entryDate')::date OR entry.reversal_of_id IS NOT NULL THEN
      RAISE EXCEPTION 'Manual document must link its own posted journal';
    END IF;
    IF (SELECT count(*) FROM accounting_journal_lines WHERE entry_id=entry.id)<>jsonb_array_length(NEW.input->'lines')
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(NEW.input->'lines') WITH ORDINALITY raw(l,n)
        FULL JOIN (SELECT *,row_number() OVER(ORDER BY id) n FROM accounting_journal_lines WHERE entry_id=entry.id) jl
          USING(n)
        WHERE jl.account_id IS DISTINCT FROM (l->>'accountId')::integer
          OR jl.cost_center_id IS DISTINCT FROM (l->>'costCenterId')::integer
          OR jl.description IS DISTINCT FROM l->>'description'
          OR jl.debit IS DISTINCT FROM (l->>'debit')::numeric OR jl.credit IS DISTINCT FROM (l->>'credit')::numeric
          OR jl.currency IS DISTINCT FROM NEW.currency OR jl.exchange_rate<>1
          OR jl.party_id IS NOT NULL OR jl.party_type IS NOT NULL
          OR jl.base_debit<>jl.debit OR jl.base_credit<>jl.credit
      ) THEN RAISE EXCEPTION 'Manual journal lines must match the evidenced base-currency document'; END IF;
    IF TG_OP='UPDATE' AND OLD.status='draft' THEN
      IF EXISTS(
        SELECT 1 FROM jsonb_array_elements(NEW.input->'lines') l
        LEFT JOIN accounting_accounts a ON a.id=(l->>'accountId')::integer
        WHERE a.id IS NULL OR a.company_id<>NEW.company_id OR NOT a.is_active OR NOT a.is_posting
          OR EXISTS(SELECT 1 FROM accounting_posting_rules p WHERE p.account_id=a.id AND p.company_id=NEW.company_id
            AND p.key NOT IN ('BANK','CASH','BANK_FEES','SHIPPING_EXPENSE'))
      ) THEN RAISE EXCEPTION 'Manual posting cannot bypass controlled subledgers'; END IF;
      IF NEW.kind='expense' AND (jsonb_array_length(NEW.input->'lines')<>2 OR NEW.debit<>NEW.credit
        OR (NEW.input->'lines'->0->>'costCenterId') IS NULL
        OR NOT EXISTS(SELECT 1 FROM accounting_accounts a WHERE a.id=(NEW.input->'lines'->0->>'accountId')::integer AND a.type='expense')
        OR (NEW.input->'lines'->0->>'debit')::numeric<=0 OR (NEW.input->'lines'->1->>'credit')::numeric<=0
        OR NOT EXISTS(SELECT 1 FROM accounting_posting_rules p WHERE p.company_id=NEW.company_id
          AND p.account_id=(NEW.input->'lines'->1->>'accountId')::integer AND p.key IN ('BANK','CASH'))
      ) THEN RAISE EXCEPTION 'Paid expense requires expense debit, cost center and bank/cash credit'; END IF;
    END IF;
    IF NEW.reversal_journal_id IS NOT NULL THEN
      SELECT * INTO rev FROM accounting_journal_entries WHERE id=NEW.reversal_journal_id;
      IF NOT FOUND OR rev.status<>'posted' OR rev.reversal_of_id<>entry.id OR rev.company_id<>NEW.company_id
        OR rev.entry_date<entry.entry_date OR rev.entry_date<>(NEW.reversal_evidence->>'entryDate')::date
        OR rev.description IS DISTINCT FROM NEW.reversal_evidence->>'reason'
        OR rev.entry_date IS DISTINCT FROM (NEW.reversal_evidence->>'entryDate')::date
        OR COALESCE(length(trim(NEW.reversal_evidence->>'evidenceReference')),0)<5 THEN
        RAISE EXCEPTION 'Reversal needs its own exact journal and staff evidence';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_guard_manual_document BEFORE INSERT OR UPDATE OR DELETE ON accounting_manual_documents
  FOR EACH ROW EXECUTE FUNCTION accounting_guard_manual_document();

CREATE FUNCTION accounting_manual_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e accounting_journal_entries;
BEGIN
  IF TG_TABLE_NAME='accounting_manual_documents' THEN
    IF NEW.journal_id IS NULL THEN RETURN NULL; END IF;
    SELECT * INTO e FROM accounting_journal_entries WHERE id=NEW.journal_id;
  ELSE e:=NEW; END IF;
  IF e.status<>'posted' THEN RETURN NULL; END IF;
  IF e.source_type IN ('ManualJournal','ManualExpense') AND NOT EXISTS(
    SELECT 1 FROM accounting_manual_documents d WHERE d.journal_id=e.id AND d.status='posted'
  ) THEN RAISE EXCEPTION 'Manual journal requires its immutable document'; END IF;
  IF e.source_type='Reversal' AND EXISTS(
    SELECT 1 FROM accounting_journal_entries original WHERE original.id=e.reversal_of_id
      AND original.source_type IN ('ManualJournal','ManualExpense')
  ) AND NOT EXISTS(SELECT 1 FROM accounting_manual_documents d WHERE d.journal_id=e.reversal_of_id
    AND d.reversal_journal_id=e.id AND d.reversal_evidence IS NOT NULL) THEN
    RAISE EXCEPTION 'Manual reversal requires linked evidence';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER accounting_manual_complete AFTER INSERT OR UPDATE ON accounting_journal_entries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_manual_complete();
CREATE CONSTRAINT TRIGGER accounting_manual_complete AFTER INSERT OR UPDATE ON accounting_manual_documents
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_manual_complete();