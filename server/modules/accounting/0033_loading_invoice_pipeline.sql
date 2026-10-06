-- Financial pipeline remains closed. No opening, stock, event eligibility or
-- financial balance is seeded/changed by this migration.
CREATE TABLE accounting_invoice_cutovers (
  company_id integer PRIMARY KEY REFERENCES accounting_companies(id),
  processing_ready boolean NOT NULL DEFAULT false,
  starts_on date, first_order_id integer, reviewed_by integer, evidence_reference text,
  CHECK(NOT processing_ready OR (starts_on IS NOT NULL AND first_order_id>0 AND reviewed_by>0
    AND length(btrim(evidence_reference))>=5))
);
CREATE TABLE accounting_stock_books (
  id serial PRIMARY KEY,company_id integer NOT NULL REFERENCES accounting_companies(id),
  document_id integer NOT NULL REFERENCES accounting_inventory_documents(id),
  line_index integer NOT NULL CHECK(line_index BETWEEN 0 AND 99),
  journal_id integer NOT NULL REFERENCES accounting_journal_entries(id),
  product_id integer NOT NULL,quantity_tons numeric(38,8) NOT NULL CHECK(quantity_tons>0),
  base_cost numeric(38,8) NOT NULL CHECK(base_cost>0),evidence_reference text NOT NULL CHECK(length(btrim(evidence_reference)) BETWEEN 5 AND 500),
  actor_id integer NOT NULL,actor_type text NOT NULL CHECK(actor_type IN ('admin','custom')),
  created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(document_id,line_index)
);
CREATE TABLE accounting_loading_invoices (
  id serial PRIMARY KEY,company_id integer NOT NULL REFERENCES accounting_companies(id),
  fact_id integer NOT NULL UNIQUE REFERENCES accounting_operational_facts(id),
  journal_id integer NOT NULL UNIQUE REFERENCES accounting_journal_entries(id),
  cogs_journal_id integer UNIQUE REFERENCES accounting_journal_entries(id),
  receivable_id integer NOT NULL UNIQUE REFERENCES accounting_receivable_items(id),
  settlement_id integer REFERENCES accounting_wallet_settlements(id),
  base_cost numeric(38,8) NOT NULL CHECK(base_cost>=0),plan jsonb NOT NULL,
  actor_id integer NOT NULL,actor_type text NOT NULL CHECK(actor_type IN ('admin','custom')),
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 5 AND 500),
  settle_from_hold boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE accounting_stock_consumptions (
  id serial PRIMARY KEY,invoice_id integer NOT NULL REFERENCES accounting_loading_invoices(id),
  layer_id integer NOT NULL REFERENCES accounting_stock_books(id),order_item_id integer NOT NULL,
  quantity_tons numeric(38,8) NOT NULL CHECK(quantity_tons>0),base_cost numeric(38,8) NOT NULL CHECK(base_cost>=0),
  UNIQUE(invoice_id,layer_id,order_item_id)
);
CREATE FUNCTION accounting_pipeline_actor_allowed(actor integer,kind text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT CASE WHEN kind='admin' THEN EXISTS(
   SELECT 1 FROM users u JOIN admin_roles r ON r.id=u.role_id WHERE u.id=actor AND u.is_active AND r.is_active
     AND (lower(regexp_replace(btrim(r.name),'[[:space:]-]+','_','g')) IN ('super_admin','supper_admin','admin')
       OR EXISTS(SELECT 1 FROM module_permissions m WHERE m.role_id::text=r.id::text
         AND m.module_id='accounting_management' AND m.can_view AND (m.can_edit OR m.can_approve))))
 ELSE EXISTS(SELECT 1 FROM custom_users u JOIN custom_roles r ON r.id=u.role_id
   WHERE u.id::text=actor::text AND u.is_active AND r.is_active
     AND r.name IN ('finance_manager','financial_admin') AND to_jsonb(r.permissions) ? 'accounting_management') END
$$;
CREATE FUNCTION accounting_stock_book_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d accounting_inventory_documents; j accounting_journal_entries; c accounting_companies; item jsonb; total numeric; precision_digits integer;
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Stock carrying evidence is immutable'; END IF;
 SELECT * INTO d FROM accounting_inventory_documents WHERE id=NEW.document_id;
 SELECT * INTO j FROM accounting_journal_entries WHERE id=NEW.journal_id;
 SELECT * INTO c FROM accounting_companies WHERE id=NEW.company_id AND is_active;
 SELECT decimals INTO precision_digits FROM accounting_currencies WHERE code=c.base_currency AND is_active;
 item:=d.lines->NEW.line_index;
 IF NOT accounting_pipeline_actor_allowed(NEW.actor_id,NEW.actor_type) OR c.id IS NULL OR precision_digits IS NULL
   OR d.company_id IS DISTINCT FROM NEW.company_id OR d.status<>'approved' OR item IS NULL
   OR NEW.product_id IS DISTINCT FROM (item->>'productId')::integer
   OR NEW.quantity_tons IS DISTINCT FROM (item->>'quantityTons')::numeric
   OR NEW.base_cost<>round(NEW.base_cost,precision_digits)
   OR (d.currency=c.base_currency AND NEW.base_cost IS DISTINCT FROM (item->>'totalCost')::numeric)
   OR j.company_id IS DISTINCT FROM NEW.company_id OR j.status<>'posted' OR j.reversal_of_id IS NOT NULL
   OR j.source_type IS DISTINCT FROM (CASE WHEN d.kind='opening' THEN 'InventoryOpening' ELSE 'InventoryPurchase' END)
   OR j.source_id IS DISTINCT FROM d.id::text OR j.entry_date<>d.document_date
   OR EXISTS(SELECT 1 FROM accounting_journal_entries WHERE reversal_of_id=j.id)
 THEN RAISE EXCEPTION 'Reviewed source document and original posted inventory carrying value required'; END IF;
 SELECT sum(l.base_debit-l.base_credit) INTO total FROM accounting_journal_lines l
 JOIN accounting_posting_rules p ON p.company_id=NEW.company_id AND p.key='INVENTORY' AND p.account_id=l.account_id
 WHERE l.entry_id=j.id AND l.currency=c.base_currency;
 IF total IS NULL OR total<=0 OR NEW.base_cost+
   (SELECT coalesce(sum(base_cost),0) FROM accounting_stock_books WHERE document_id=d.id)>total
 THEN RAISE EXCEPTION 'Stock layer exceeds its actual posted carrying value'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_stock_book_guard BEFORE INSERT OR UPDATE OR DELETE ON accounting_stock_books
 FOR EACH ROW EXECUTE FUNCTION accounting_stock_book_guard();
CREATE FUNCTION accounting_invoice_cutover_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE book numeric; ledger numeric;
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
   IF book IS NULL OR ledger IS NULL OR book<=0 OR book IS DISTINCT FROM ledger
     THEN RAISE EXCEPTION 'Actual stock carrying opening must reconcile; no assumed zero'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_invoice_cutover_guard BEFORE INSERT OR UPDATE OR DELETE ON accounting_invoice_cutovers
 FOR EACH ROW EXECUTE FUNCTION accounting_invoice_cutover_guard();
CREATE FUNCTION accounting_invoice_evidence_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE f accounting_operational_facts; j accounting_journal_entries; r accounting_receivable_items; g accounting_invoice_cutovers; total numeric;
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 SELECT * INTO f FROM accounting_operational_facts WHERE id=NEW.fact_id;
 SELECT * INTO j FROM accounting_journal_entries WHERE id=NEW.journal_id;
 SELECT * INTO r FROM accounting_receivable_items WHERE id=NEW.receivable_id;
 SELECT * INTO g FROM accounting_invoice_cutovers WHERE company_id=NEW.company_id;
 IF g.processing_ready IS DISTINCT FROM true OR NOT accounting_pipeline_actor_allowed(NEW.actor_id,NEW.actor_type)
   OR f.company_id IS DISTINCT FROM NEW.company_id OR f.event_type<>'LoadingCompleted'
   OR f.order_id<g.first_order_id OR (f.payload->'input'->>'eventDate')::date<g.starts_on
   OR j.company_id IS DISTINCT FROM NEW.company_id OR j.source_type<>'LoadingCompleted'
   OR j.source_id IS DISTINCT FROM f.source_id OR j.status<>'posted'
   OR j.entry_date IS DISTINCT FROM (f.payload->'input'->>'eventDate')::date
   OR r.invoice_journal_id IS DISTINCT FROM j.id OR r.company_id IS DISTINCT FROM NEW.company_id
   OR r.order_id IS DISTINCT FROM f.order_id OR r.customer_id IS DISTINCT FROM (NEW.plan->>'customerId')::integer
   OR NOT (EXISTS(SELECT 1 FROM accounting_credit_orders x WHERE x.company_id=NEW.company_id
       AND x.order_id=f.order_id AND x.status='approved' AND x.customer_id=r.customer_id AND x.currency=r.currency)
     OR EXISTS(SELECT 1 FROM accounting_wallet_holds h JOIN accounting_wallet_links w ON w.wallet_id=h.wallet_id
       AND w.company_id=h.company_id WHERE h.company_id=NEW.company_id AND h.order_id=f.order_id
       AND h.status IN ('active','consumed') AND w.customer_id=r.customer_id AND h.currency=r.currency))
   OR r.currency IS DISTINCT FROM (f.payload->'order'->>'currency')
   OR r.amount IS DISTINCT FROM (NEW.plan->'amounts'->>'total')::numeric
   OR r.currency IS DISTINCT FROM (SELECT base_currency FROM accounting_companies WHERE id=NEW.company_id)
 THEN RAISE EXCEPTION 'Invoice, real receivable and original eligible loading must commit together'; END IF;
 SELECT coalesce(sum(base_cost),0) INTO total FROM accounting_stock_consumptions WHERE invoice_id=NEW.id;
 IF total IS DISTINCT FROM NEW.base_cost OR NOT EXISTS(SELECT 1 FROM accounting_stock_consumptions WHERE invoice_id=NEW.id)
   OR (SELECT sum(quantity_tons) FROM accounting_stock_consumptions WHERE invoice_id=NEW.id) IS DISTINCT FROM
      (f.payload->'input'->>'actualWeightTons')::numeric
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(f.payload->'input'->'lines') measured
      WHERE (measured->>'actualWeightTons')::numeric IS DISTINCT FROM
       (SELECT sum(quantity_tons) FROM accounting_stock_consumptions WHERE invoice_id=NEW.id AND order_item_id=(measured->>'orderItemId')::integer))
 THEN RAISE EXCEPTION 'Complete actual stock cost allocations required'; END IF;
 IF EXISTS(SELECT 1 FROM (VALUES ('SALES_REVENUE','goods'),('TAX_PAYABLE','tax'),('SHIPPING_REVENUE','shipping')) expected(key,amount_key)
   WHERE (NEW.plan->'amounts'->>expected.amount_key)::numeric IS DISTINCT FROM
     (SELECT coalesce(sum(l.credit-l.debit),0) FROM accounting_journal_lines l JOIN accounting_posting_rules p
       ON p.company_id=NEW.company_id AND p.key=expected.key AND p.account_id=l.account_id WHERE l.entry_id=j.id AND l.currency=r.currency))
 THEN RAISE EXCEPTION 'Invoice revenue, tax and freight must match its frozen evidence'; END IF;
 IF NEW.base_cost>0 THEN
   IF NOT EXISTS(SELECT 1 FROM accounting_journal_entries e WHERE e.id=NEW.cogs_journal_id AND e.company_id=NEW.company_id
      AND e.status='posted' AND e.source_type='LoadingCOGS' AND e.source_id=f.source_id)
     OR (SELECT sum(l.base_debit-l.base_credit) FROM accounting_journal_lines l JOIN accounting_posting_rules p
       ON p.company_id=NEW.company_id AND p.key='COGS' AND p.account_id=l.account_id WHERE l.entry_id=NEW.cogs_journal_id) IS DISTINCT FROM NEW.base_cost
     OR (SELECT sum(l.base_credit-l.base_debit) FROM accounting_journal_lines l JOIN accounting_posting_rules p
       ON p.company_id=NEW.company_id AND p.key='INVENTORY' AND p.account_id=l.account_id WHERE l.entry_id=NEW.cogs_journal_id) IS DISTINCT FROM NEW.base_cost
     THEN RAISE EXCEPTION 'COGS and inventory carrying credit must match allocations'; END IF;
 ELSIF NEW.cogs_journal_id IS NOT NULL THEN RAISE EXCEPTION 'Known-zero residual must not create invented cost'; END IF;
 IF NEW.settlement_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM accounting_wallet_settlements s
   WHERE s.id=NEW.settlement_id AND s.company_id=NEW.company_id AND s.receivable_id=NEW.receivable_id AND s.hold_id IS NOT NULL)
 THEN RAISE EXCEPTION 'Only this invoice hold settlement can be attached'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER accounting_invoice_evidence_guard AFTER INSERT ON accounting_loading_invoices
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_invoice_evidence_guard();
CREATE FUNCTION accounting_stock_consumption_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE b accounting_stock_books; i accounting_loading_invoices; d accounting_inventory_documents;
 prior_qty numeric; prior_cost numeric; digits integer; expected numeric; f accounting_operational_facts;
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Stock allocations are immutable; coordinated return is required'; END IF;
 SELECT * INTO b FROM accounting_stock_books WHERE id=NEW.layer_id;
 SELECT * INTO i FROM accounting_loading_invoices WHERE id=NEW.invoice_id;
 SELECT * INTO d FROM accounting_inventory_documents WHERE id=b.document_id;
 SELECT * INTO f FROM accounting_operational_facts WHERE id=i.fact_id;
 SELECT decimals INTO digits FROM accounting_currencies WHERE code=(SELECT base_currency FROM accounting_companies WHERE id=b.company_id);
 SELECT coalesce(sum(quantity_tons),0),coalesce(sum(base_cost),0) INTO prior_qty,prior_cost FROM accounting_stock_consumptions WHERE layer_id=b.id;
 expected:=round(b.base_cost*(prior_qty+NEW.quantity_tons)/b.quantity_tons,digits)-prior_cost;
 IF b.id IS NULL OR i.id IS NULL OR b.company_id IS DISTINCT FROM i.company_id OR d.status<>'approved'
   OR NEW.quantity_tons+prior_qty>b.quantity_tons OR NEW.base_cost IS DISTINCT FROM expected
   OR d.document_date>(f.payload->'input'->>'eventDate')::date
   OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(f.payload->'order'->'lines') line
     WHERE (line->>'orderItemId')::integer=NEW.order_item_id AND (line->>'productId')::integer=b.product_id)
   OR EXISTS(SELECT 1 FROM accounting_journal_entries WHERE reversal_of_id=b.journal_id)
   OR (SELECT sum(base_cost) FROM accounting_stock_books WHERE document_id=b.document_id) IS DISTINCT FROM
      (SELECT sum(l.base_debit-l.base_credit) FROM accounting_journal_lines l JOIN accounting_posting_rules p
       ON p.company_id=b.company_id AND p.key='INVENTORY' AND p.account_id=l.account_id WHERE l.entry_id=b.journal_id
       AND l.currency=(SELECT base_currency FROM accounting_companies WHERE id=b.company_id))
 THEN RAISE EXCEPTION 'Frozen stock layer, product identity, capacity and cumulative carrying cost required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_stock_consumption_guard BEFORE INSERT OR UPDATE OR DELETE ON accounting_stock_consumptions
 FOR EACH ROW EXECUTE FUNCTION accounting_stock_consumption_guard();
CREATE FUNCTION accounting_pipeline_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Financial loading evidence is immutable; use coordinated reversal'; END $$;
CREATE TRIGGER accounting_loading_invoice_immutable BEFORE UPDATE OR DELETE ON accounting_loading_invoices
 FOR EACH ROW EXECUTE FUNCTION accounting_pipeline_immutable();
CREATE FUNCTION accounting_stock_source_retention() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status='voided' AND EXISTS(SELECT 1 FROM accounting_stock_books WHERE document_id=OLD.id)
 THEN RAISE EXCEPTION 'Posted stock carrying evidence cannot be voided independently'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_stock_source_retention BEFORE UPDATE ON accounting_inventory_documents
 FOR EACH ROW EXECUTE FUNCTION accounting_stock_source_retention();
CREATE FUNCTION accounting_pipeline_reversal_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.reversal_of_id IS NOT NULL AND (
   EXISTS(SELECT 1 FROM accounting_stock_books WHERE journal_id=NEW.reversal_of_id)
   OR EXISTS(SELECT 1 FROM accounting_loading_invoices WHERE journal_id=NEW.reversal_of_id OR cogs_journal_id=NEW.reversal_of_id))
 THEN RAISE EXCEPTION 'Reverse loading invoice, AR and stock together; standalone reversal blocked'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_pipeline_reversal_guard BEFORE INSERT ON accounting_journal_entries
 FOR EACH ROW EXECUTE FUNCTION accounting_pipeline_reversal_guard();
