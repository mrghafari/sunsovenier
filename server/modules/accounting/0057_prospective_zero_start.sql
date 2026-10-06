-- Explicitly approved independent zero opening, NOT reconciliation or erasure of legacy balances.
CREATE TABLE accounting_zero_starts (
 company_id integer PRIMARY KEY REFERENCES accounting_companies(id),
 starts_on date NOT NULL, first_order_id integer NOT NULL CHECK(first_order_id>0),
 excluded_wallet_ids integer[] NOT NULL, excluded_document_ids integer[] NOT NULL,
 actor_id integer NOT NULL CHECK(actor_id>0), evidence_reference text NOT NULL CHECK(length(btrim(evidence_reference)) BETWEEN 5 AND 500),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION accounting_zero_start_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Retain immutable zero-start approval and legacy boundary'; END IF;
 IF NOT accounting_pipeline_actor_allowed(NEW.actor_id,'admin')
   OR NOT EXISTS(SELECT 1 FROM accounting_companies WHERE id=NEW.company_id AND is_active
     AND NEW.starts_on<=(now() AT TIME ZONE timezone)::date)
   OR EXISTS(SELECT 1 FROM accounting_journal_entries WHERE company_id=NEW.company_id)
   OR EXISTS(SELECT 1 FROM accounting_stock_books WHERE company_id=NEW.company_id)
   OR EXISTS(SELECT 1 FROM accounting_wallet_links WHERE company_id=NEW.company_id)
   OR EXISTS(SELECT 1 FROM accounting_operational_facts WHERE company_id=NEW.company_id AND payload->>'postingEligible'='true')
   OR NEW.first_order_id<>(SELECT coalesce(max(id),0)+1 FROM customer_orders)
   OR NEW.excluded_wallet_ids IS DISTINCT FROM ARRAY(SELECT id FROM customer_wallets ORDER BY id)
   OR NEW.excluded_document_ids IS DISTINCT FROM ARRAY(SELECT id FROM accounting_inventory_documents WHERE company_id=NEW.company_id ORDER BY id)
 THEN RAISE EXCEPTION 'Verified empty independent ledger and exact preserved legacy boundary required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_zero_start_guard BEFORE INSERT OR UPDATE OR DELETE ON accounting_zero_starts
 FOR EACH ROW EXECUTE FUNCTION accounting_zero_start_guard();

CREATE FUNCTION accounting_zero_wallet_boundary_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE g accounting_zero_starts; w customer_wallets;
BEGIN
 SELECT * INTO g FROM accounting_zero_starts WHERE company_id=NEW.company_id;
 IF g.company_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO w FROM customer_wallets WHERE id=NEW.wallet_id;
 IF NEW.wallet_id=ANY(g.excluded_wallet_ids) OR w.balance<>0 OR w.reserved_balance<>0
 THEN RAISE EXCEPTION 'Legacy/nonzero prepaid accounts cannot enter the independent zero ledger'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_zero_wallet_boundary_guard BEFORE INSERT ON accounting_wallet_links
 FOR EACH ROW EXECUTE FUNCTION accounting_zero_wallet_boundary_guard();

CREATE FUNCTION accounting_zero_order_boundary_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE g accounting_zero_starts; oid integer;
BEGIN
 SELECT * INTO g FROM accounting_zero_starts WHERE company_id=NEW.company_id;
 IF g.company_id IS NULL THEN RETURN NEW; END IF;
 oid:=NEW.order_id;
 IF oid<g.first_order_id OR NOT EXISTS(SELECT 1 FROM customer_orders WHERE id=oid
   AND created_at>=g.created_at)
 THEN RAISE EXCEPTION 'Historical orders cannot enter the independent zero ledger'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_zero_wallet_order_boundary BEFORE INSERT ON accounting_wallet_orders
 FOR EACH ROW EXECUTE FUNCTION accounting_zero_order_boundary_guard();
CREATE TRIGGER accounting_zero_credit_order_boundary BEFORE INSERT ON accounting_credit_orders
 FOR EACH ROW EXECUTE FUNCTION accounting_zero_order_boundary_guard();

CREATE FUNCTION accounting_zero_stock_boundary_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE g accounting_zero_starts; d accounting_inventory_documents;
BEGIN
 SELECT * INTO g FROM accounting_zero_starts WHERE company_id=NEW.company_id;
 IF g.company_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO d FROM accounting_inventory_documents WHERE id=NEW.document_id;
 IF NEW.document_id=ANY(g.excluded_document_ids) OR d.kind<>'purchase'
   OR d.document_date<g.starts_on OR d.created_at<g.created_at
 THEN RAISE EXCEPTION 'Only documented new purchases may supply this zero-start stock book'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_zero_stock_boundary_guard BEFORE INSERT ON accounting_stock_books
 FOR EACH ROW EXECUTE FUNCTION accounting_zero_stock_boundary_guard();

CREATE FUNCTION accounting_zero_fact_boundary_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE g accounting_zero_starts;
BEGIN
 SELECT * INTO g FROM accounting_zero_starts WHERE company_id=NEW.company_id;
 IF g.company_id IS NOT NULL AND NEW.payload->>'postingEligible'='true' AND
   (NEW.order_id<g.first_order_id OR NOT EXISTS(SELECT 1 FROM customer_orders
      WHERE id=NEW.order_id AND created_at>=g.created_at))
 THEN RAISE EXCEPTION 'Captured historical facts must remain ineligible after a zero start'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_zero_fact_boundary_guard BEFORE INSERT OR UPDATE ON accounting_operational_facts
 FOR EACH ROW EXECUTE FUNCTION accounting_zero_fact_boundary_guard();

CREATE FUNCTION accounting_zero_journal_date_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE g accounting_zero_starts;
BEGIN
 SELECT * INTO g FROM accounting_zero_starts WHERE company_id=NEW.company_id;
 IF g.company_id IS NOT NULL AND
   (NEW.entry_date<g.starts_on OR NEW.source_type IN ('InventoryOpening','WalletOpening'))
 THEN RAISE EXCEPTION 'Retrospective/opening imports cannot enter the independent zero ledger'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_zero_journal_date_guard BEFORE INSERT OR UPDATE ON accounting_journal_entries
 FOR EACH ROW EXECUTE FUNCTION accounting_zero_journal_date_guard();

CREATE OR REPLACE FUNCTION accounting_invoice_cutover_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE book numeric; ledger numeric; zero_start accounting_zero_starts;
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retain cutover decisions'; END IF;
 IF NEW.processing_ready THEN
   IF NOT accounting_pipeline_actor_allowed(NEW.reviewed_by,'admin')
     OR NOT EXISTS(SELECT 1 FROM accounting_wallet_cutovers WHERE company_id=NEW.company_id AND pipeline_ready)
     OR NOT EXISTS(SELECT 1 FROM accounting_receipt_cutovers WHERE company_id=NEW.company_id AND processing_ready)
     OR NEW.starts_on>(SELECT (now() AT TIME ZONE timezone)::date FROM accounting_companies WHERE id=NEW.company_id AND is_active)
     OR EXISTS(SELECT 1 FROM accounting_loading_invoices WHERE company_id=NEW.company_id)
   THEN RAISE EXCEPTION 'Reviewed reconciled financial cutovers required'; END IF;
   SELECT sum(b.base_cost) INTO book FROM accounting_stock_books b
     JOIN accounting_inventory_documents d ON d.id=b.document_id WHERE b.company_id=NEW.company_id AND d.document_date<=NEW.starts_on;
   SELECT sum(l.base_debit-l.base_credit) INTO ledger FROM accounting_journal_lines l
     JOIN accounting_journal_entries e ON e.id=l.entry_id AND e.status='posted' AND e.company_id=NEW.company_id AND e.entry_date<=NEW.starts_on
     JOIN accounting_posting_rules p ON p.company_id=NEW.company_id AND p.key='INVENTORY' AND p.account_id=l.account_id;
   SELECT * INTO zero_start FROM accounting_zero_starts WHERE company_id=NEW.company_id;
   IF book IS NULL OR ledger IS NULL OR book<=0 OR book IS DISTINCT FROM ledger THEN
     IF zero_start.company_id IS NULL OR zero_start.starts_on IS DISTINCT FROM NEW.starts_on
       OR zero_start.first_order_id IS DISTINCT FROM NEW.first_order_id
       OR coalesce(book,0)<>0 OR coalesce(ledger,0)<>0
     THEN RAISE EXCEPTION 'Actual stock opening must reconcile or have an explicitly approved isolated zero start'; END IF;
   END IF;
 END IF;
 RETURN NEW;
END $$;
