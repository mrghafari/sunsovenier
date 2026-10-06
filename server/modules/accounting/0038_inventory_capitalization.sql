-- Closed by default. No opening, supplier debt, inventory quantity or gate is seeded.
CREATE TABLE accounting_inventory_capitalization_cutovers (
 company_id integer PRIMARY KEY REFERENCES accounting_companies(id),
 processing_ready boolean NOT NULL DEFAULT false,
 purchase_payable_account_id integer REFERENCES accounting_accounts(id),
 reviewed_by integer, evidence_reference text,
 CHECK(NOT processing_ready OR (reviewed_by>0 AND length(btrim(evidence_reference))>=5))
);
CREATE TABLE accounting_inventory_capitalizations (
 id serial PRIMARY KEY,company_id integer NOT NULL REFERENCES accounting_companies(id),
 document_id integer NOT NULL UNIQUE REFERENCES accounting_inventory_documents(id),
 journal_id integer NOT NULL UNIQUE REFERENCES accounting_journal_entries(id),
 command_hash text NOT NULL, plan jsonb NOT NULL,
 actor_id integer NOT NULL,actor_type text NOT NULL CHECK(actor_type IN ('admin','custom')),
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 5 AND 500),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION accounting_capitalization_cutover_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retain capitalization cutover history'; END IF;
 IF NEW.processing_ready AND (NOT accounting_pipeline_actor_allowed(NEW.reviewed_by,'admin')
   OR NOT EXISTS(SELECT 1 FROM accounting_companies WHERE id=NEW.company_id AND is_active)
   OR (NEW.purchase_payable_account_id IS NOT NULL AND
     (NOT EXISTS(SELECT 1 FROM accounting_accounts WHERE id=NEW.purchase_payable_account_id
       AND company_id=NEW.company_id AND type='liability' AND is_active)
      OR EXISTS(SELECT 1 FROM accounting_posting_rules WHERE company_id=NEW.company_id AND account_id=NEW.purchase_payable_account_id))))
 THEN RAISE EXCEPTION 'Reviewed active company and dedicated supplier-payable account required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_capitalization_cutover_guard BEFORE INSERT OR UPDATE OR DELETE
 ON accounting_inventory_capitalization_cutovers FOR EACH ROW EXECUTE FUNCTION accounting_capitalization_cutover_guard();
CREATE FUNCTION accounting_capitalization_header_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Capitalization evidence is immutable'; END IF;
 IF NOT accounting_pipeline_actor_allowed(NEW.actor_id,NEW.actor_type)
   OR NOT EXISTS(SELECT 1 FROM accounting_inventory_capitalization_cutovers g JOIN accounting_companies c ON c.id=g.company_id
     WHERE g.company_id=NEW.company_id AND g.processing_ready AND c.is_active)
 THEN RAISE EXCEPTION 'Capitalization gate is closed or actor is inactive'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_capitalization_header_guard BEFORE INSERT OR UPDATE OR DELETE
 ON accounting_inventory_capitalizations FOR EACH ROW EXECUTE FUNCTION accounting_capitalization_header_guard();
CREATE FUNCTION accounting_capitalization_evidence_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d accounting_inventory_documents; j accounting_journal_entries; c accounting_companies;
 counter_id integer; stock_id integer; value numeric; qty integer; digits integer;
BEGIN
 SELECT * INTO d FROM accounting_inventory_documents WHERE id=NEW.document_id;
 SELECT * INTO j FROM accounting_journal_entries WHERE id=NEW.journal_id;
 SELECT * INTO c FROM accounting_companies WHERE id=NEW.company_id;
 SELECT decimals INTO digits FROM accounting_currencies WHERE code=c.base_currency;
 SELECT account_id INTO stock_id FROM accounting_posting_rules WHERE company_id=c.id AND key='INVENTORY';
 IF d.kind='opening' THEN
   SELECT account_id INTO counter_id FROM accounting_posting_rules WHERE company_id=c.id AND key='OPENING_BALANCE_EQUITY';
 ELSE
   SELECT purchase_payable_account_id INTO counter_id FROM accounting_inventory_capitalization_cutovers WHERE company_id=c.id;
 END IF;
 value:=(NEW.plan->>'baseTotal')::numeric;
 SELECT count(*) INTO qty FROM accounting_stock_books WHERE document_id=d.id AND journal_id=j.id;
 IF d.company_id IS DISTINCT FROM c.id OR d.status IS DISTINCT FROM 'approved'
   OR j.company_id IS DISTINCT FROM c.id OR j.status IS DISTINCT FROM 'posted' OR j.reversal_of_id IS NOT NULL
   OR j.source_id IS DISTINCT FROM d.id::text
   OR j.source_type IS DISTINCT FROM (CASE WHEN d.kind='opening' THEN 'InventoryOpening' ELSE 'InventoryPurchase' END)
   OR j.entry_date IS DISTINCT FROM d.document_date OR counter_id IS NULL OR stock_id IS NULL OR counter_id=stock_id
   OR NOT EXISTS(SELECT 1 FROM accounting_accounts WHERE id=stock_id AND company_id=c.id AND is_active AND type='asset')
   OR NOT EXISTS(SELECT 1 FROM accounting_accounts WHERE id=counter_id AND company_id=c.id AND is_active
     AND type=(CASE WHEN d.kind='opening' THEN 'equity' ELSE 'liability' END))
   OR (d.kind='purchase' AND EXISTS(SELECT 1 FROM accounting_posting_rules WHERE company_id=c.id AND account_id=counter_id))
   OR (d.kind='opening' AND d.currency<>c.base_currency)
   OR NEW.plan->>'currency' IS DISTINCT FROM d.currency
   OR (NEW.plan->>'revision')::integer IS DISTINCT FROM d.revision
   OR (NEW.plan->>'nativeTotal')::numeric IS DISTINCT FROM d.total_cost
   OR value IS NULL OR value<=0
   OR qty<>jsonb_array_length(d.lines)
   OR (SELECT sum(base_cost) FROM accounting_stock_books WHERE document_id=d.id) IS DISTINCT FROM value
   OR (SELECT count(*) FROM accounting_journal_lines WHERE entry_id=j.id)<>2
   OR NOT EXISTS(SELECT 1 FROM accounting_journal_lines WHERE entry_id=j.id AND account_id=stock_id
       AND currency=c.base_currency AND debit=value AND credit=0 AND base_debit=value)
   OR NOT EXISTS(SELECT 1 FROM accounting_journal_lines WHERE entry_id=j.id AND account_id=counter_id
       AND currency=d.currency AND credit=d.total_cost AND debit=0 AND base_credit=value
       AND exchange_rate=(NEW.plan->'rate'->>'value')::numeric)
   OR EXISTS(SELECT 1 FROM accounting_journal_entries WHERE reversal_of_id=j.id)
   OR NOT accounting_stock_ledger_reconciled(c.id)
 THEN RAISE EXCEPTION 'Original purchase/opening journal and every real carrying layer must commit together'; END IF;
 -- Per-line cumulative rounding preserves the original counterparty's base value.
 IF EXISTS(SELECT 1 FROM accounting_stock_books b WHERE b.document_id=d.id AND b.base_cost IS DISTINCT FROM
   (round((SELECT sum((x.item->>'totalCost')::numeric) FROM jsonb_array_elements(d.lines) WITH ORDINALITY x(item,n)
      WHERE x.n<=b.line_index+1)*(NEW.plan->'rate'->>'value')::numeric,digits)-
    round((SELECT coalesce(sum((x.item->>'totalCost')::numeric),0) FROM jsonb_array_elements(d.lines) WITH ORDINALITY x(item,n)
      WHERE x.n<=b.line_index)*(NEW.plan->'rate'->>'value')::numeric,digits)))
 THEN RAISE EXCEPTION 'Carrying allocations must conserve the documented original historical value'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER accounting_capitalization_evidence_guard AFTER INSERT ON accounting_inventory_capitalizations
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_capitalization_evidence_guard();
