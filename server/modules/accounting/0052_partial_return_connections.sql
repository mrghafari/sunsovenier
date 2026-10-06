-- Connect every new collection to the same immutable adjustment evidence.
CREATE FUNCTION accounting_receivable_has_partial_return(rid integer) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM accounting_partial_return_books p
 WHERE p.journal_id IS NOT NULL AND ((p.valuation->>'receivableId')::integer=rid
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(p.valuation->'restorations') x WHERE (x->>'receivableId')::integer=rid)))
$$;
CREATE FUNCTION accounting_partial_receivable_book_remaining(rid integer,dated date)
RETURNS TABLE(native_before numeric,base_before numeric,invoice_rate numeric) LANGUAGE plpgsql AS $$
DECLARE r accounting_receivable_items;issued numeric;original_base numeric;paid numeric;used_base numeric;
 aid integer;last_date date;adj record;
BEGIN
 SELECT * INTO r FROM accounting_receivable_items WHERE id=rid;
 SELECT account_id INTO aid FROM accounting_posting_rules WHERE company_id=r.company_id AND key='ACCOUNTS_RECEIVABLE';
 SELECT sum(l.debit-l.credit),sum(l.base_debit-l.base_credit),min(l.exchange_rate) INTO issued,original_base,invoice_rate
   FROM accounting_journal_lines l JOIN accounting_journal_entries j ON j.id=l.entry_id AND j.status='posted'
   WHERE j.id=r.invoice_journal_id AND j.company_id=r.company_id AND l.account_id=aid AND l.currency=r.currency
     AND l.party_type='customer' AND l.party_id=r.customer_id AND j.entry_date=r.issued_on
     AND NOT EXISTS(SELECT 1 FROM accounting_journal_entries v WHERE v.reversal_of_id=j.id);
 IF r.id IS NULL OR issued IS DISTINCT FROM r.amount OR original_base IS NULL OR original_base<0 OR dated<r.issued_on
 THEN RAISE EXCEPTION 'Original invoice carrying evidence required'; END IF;
 IF EXISTS(SELECT 1 FROM accounting_wallet_settlements s WHERE s.receivable_id=rid AND r.currency<>
   (SELECT base_currency FROM accounting_companies WHERE id=r.company_id) AND NOT EXISTS(
     SELECT 1 FROM accounting_wallet_book_values b WHERE b.company_id=s.company_id AND b.source_id=s.source_id))
 OR EXISTS(SELECT 1 FROM accounting_receipt_allocations a WHERE a.receivable_id=rid AND a.status='active' AND r.currency<>
   (SELECT base_currency FROM accounting_companies WHERE id=r.company_id) AND NOT EXISTS(
     SELECT 1 FROM accounting_receipt_book_values b CROSS JOIN LATERAL jsonb_array_elements(b.allocations) x
       WHERE b.receipt_id=a.receipt_id AND (x->>'receivableId')::integer=rid AND (x->>'amount')::numeric=a.amount))
 THEN RAISE EXCEPTION 'Original payment carrying evidence required'; END IF;
 SELECT coalesce(sum(n),0),coalesce(sum(b),0),max(d) INTO paid,used_base,last_date FROM (
   SELECT s.amount n,CASE WHEN r.currency=(SELECT base_currency FROM accounting_companies WHERE id=r.company_id)
     THEN s.amount ELSE b.receivable_base END b,j.entry_date d
     FROM accounting_wallet_settlements s JOIN accounting_journal_entries j ON j.id=s.journal_id AND j.status='posted'
     LEFT JOIN accounting_wallet_book_values b ON b.company_id=s.company_id AND b.source_id=s.source_id
     WHERE s.receivable_id=rid
   UNION ALL
   SELECT a.amount,CASE WHEN r.currency=(SELECT base_currency FROM accounting_companies WHERE id=r.company_id)
     THEN a.amount ELSE (x->>'baseSettled')::numeric END,rc.entry_date
     FROM accounting_receipt_allocations a JOIN accounting_customer_receipts rc ON rc.id=a.receipt_id
     LEFT JOIN accounting_receipt_book_values b ON b.receipt_id=rc.id
     LEFT JOIN LATERAL jsonb_array_elements(b.allocations) x ON (x->>'receivableId')::integer=rid
     WHERE a.receivable_id=rid AND a.status='active'
 ) payments;
 SELECT * INTO adj FROM accounting_receivable_return_adjustment(rid,'infinity'::date);
 native_before:=r.amount-paid-adj.debt_reduction+adj.restored;
 base_before:=original_base-used_base-adj.debt_base+adj.restored_base;
 IF native_before<0 OR base_before<0 OR last_date>dated OR dated<(SELECT max((p.input->>'entryDate')::date)
   FROM accounting_partial_return_books p WHERE p.journal_id IS NOT NULL AND ((p.valuation->>'receivableId')::integer=rid
     OR EXISTS(SELECT 1 FROM jsonb_array_elements(p.valuation->'restorations') x WHERE (x->>'receivableId')::integer=rid)))
   OR (NOT accounting_receivable_has_partial_return(rid) AND paid<>r.settled_amount)
   OR paid<r.settled_amount OR paid<>accounting_receivable_paid_native(rid,'infinity'::date)
 THEN RAISE EXCEPTION 'Effective receivable balance or chronology requires reconciliation'; END IF;
 RETURN NEXT;
END $$;
DO $$ DECLARE d text;
BEGIN
 d:=pg_get_functiondef('accounting_receivable_book_remaining(integer,date)'::regprocedure);
 EXECUTE replace(d,'FUNCTION public.accounting_receivable_book_remaining(', 'FUNCTION public.accounting_before_partial_receivable_book_remaining(');
END $$;
CREATE OR REPLACE FUNCTION accounting_receivable_book_remaining(rid integer,dated date)
RETURNS TABLE(native_before numeric,base_before numeric,invoice_rate numeric) LANGUAGE plpgsql AS $$
BEGIN
 IF accounting_receivable_has_partial_return(rid) THEN
   RETURN QUERY SELECT * FROM accounting_partial_receivable_book_remaining(rid,dated);
 ELSE
   RETURN QUERY SELECT * FROM accounting_before_partial_receivable_book_remaining(rid,dated);
 END IF;
END $$;
CREATE OR REPLACE FUNCTION accounting_stock_ledger_reconciled(company_key integer) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT ledger.value IS NOT NULL AND books.value IS NOT NULL AND ledger.value=books.value
 FROM (SELECT sum(l.base_debit-l.base_credit) value FROM accounting_journal_lines l
 JOIN accounting_journal_entries j ON j.id=l.entry_id AND j.company_id=company_key AND j.status='posted'
 JOIN accounting_posting_rules p ON p.company_id=company_key AND p.key='INVENTORY' AND p.account_id=l.account_id) ledger
 CROSS JOIN (SELECT sum(b.base_cost-
   (SELECT coalesce(sum(s.base_cost),0) FROM accounting_stock_consumptions s WHERE s.layer_id=b.id)+
   (SELECT coalesce(sum(s.base_cost),0) FROM accounting_stock_consumptions s JOIN accounting_loading_returns r ON r.invoice_id=s.invoice_id
     WHERE s.layer_id=b.id AND r.invoice_reversal_id IS NOT NULL)+
   (SELECT coalesce(sum((x->>'baseCost')::numeric),0) FROM accounting_partial_return_books p
     CROSS JOIN LATERAL jsonb_array_elements(p.valuation->'recoveries') x
     WHERE p.kind='GOODS' AND p.company_id=company_key AND p.journal_id IS NOT NULL AND (x->>'layerId')::integer=b.id)) value
 FROM accounting_stock_books b WHERE b.company_id=company_key) books
$$;
DO $$ DECLARE d text;needle text;
BEGIN
 d:=pg_get_functiondef('accounting_stock_consumption_guard()'::regprocedure);
 needle:='IF EXISTS(SELECT 1 FROM accounting_loading_returns r WHERE r.company_id=i.company_id';
 IF strpos(d,needle)=0 THEN RAISE EXCEPTION 'Unexpected stock return guard'; END IF;
 d:=replace(d,needle,'SELECT prior_qty-coalesce(sum((x->>''quantityTons'')::numeric),0),
    prior_cost-coalesce(sum((x->>''baseCost'')::numeric),0) INTO prior_qty,prior_cost
   FROM accounting_partial_return_books p CROSS JOIN LATERAL jsonb_array_elements(p.valuation->''recoveries'') x
   WHERE p.kind=''GOODS'' AND p.journal_id IS NOT NULL AND (x->>''layerId'')::integer=b.id;
   IF EXISTS(SELECT 1 FROM accounting_partial_return_books p WHERE p.company_id=i.company_id AND p.kind=''GOODS''
     AND p.journal_id IS NOT NULL AND (p.input->>''entryDate'')::date>(f.payload->''input''->>''eventDate'')::date)
   THEN RAISE EXCEPTION ''Backdated loading after partial return requires reconciliation''; END IF;
   '||needle);
 needle:='expected:=round(b.base_cost*(prior_qty+NEW.quantity_tons)/b.quantity_tons,digits)-prior_cost;';
 IF strpos(d,needle)=0 THEN RAISE EXCEPTION 'Unexpected stock cost guard'; END IF;
 EXECUTE replace(d,needle,needle||'
   IF EXISTS(SELECT 1 FROM accounting_partial_return_books p CROSS JOIN LATERAL jsonb_array_elements(p.valuation->''recoveries'') x
     WHERE p.kind=''GOODS'' AND p.journal_id IS NOT NULL AND (x->>''layerId'')::integer=b.id)
   THEN expected:=CASE WHEN b.quantity_tons>prior_qty
     THEN round((b.base_cost-prior_cost)*NEW.quantity_tons/(b.quantity_tons-prior_qty),digits) ELSE 0 END; END IF;');
 d:=pg_get_functiondef('accounting_wallet_settlement_guard()'::regprocedure);
 needle:='NEW.amount>r.amount-r.settled_amount';
 IF strpos(d,needle)=0 THEN RAISE EXCEPTION 'Unexpected wallet collection cap'; END IF;
 EXECUTE replace(d,needle,'NEW.amount>accounting_receivable_open_native(r.id,j.entry_date)');
 d:=pg_get_functiondef('accounting_wallet_settlement_native_evidence()'::regprocedure);
 needle:='(SELECT settled_amount FROM accounting_receivable_items WHERE id=NEW.receivable_id)';
 IF strpos(d,needle)=0 THEN RAISE EXCEPTION 'Unexpected wallet collection completion'; END IF;
 EXECUTE replace(d,needle,'accounting_receivable_paid_native(NEW.receivable_id,''infinity''::date)');
 d:=pg_get_functiondef('accounting_receipt_book_used()'::regprocedure);
 EXECUTE replace(d,'a.settled_amount<a.amount-(x->>''nativeBefore'')::numeric+(x->>''amount'')::numeric',
   'accounting_receivable_paid_native(a.id,''infinity''::date)<a.amount-(x->>''nativeBefore'')::numeric+(x->>''amount'')::numeric');
END $$;
CREATE FUNCTION accounting_partial_return_collection_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rid integer;dated date;value numeric;
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_TABLE_NAME='accounting_receivable_items' THEN
   IF NEW.settled_amount IS DISTINCT FROM OLD.settled_amount AND accounting_receivable_has_partial_return(NEW.id)
   THEN RAISE EXCEPTION 'Original payment counter remains historical after a partial return'; END IF;
   RETURN NEW;
 END IF;
 rid:=NEW.receivable_id;value:=NEW.amount;
 SELECT entry_date INTO dated FROM accounting_customer_receipts WHERE id=NEW.receipt_id;
 IF value>accounting_receivable_open_native(rid,dated)
 THEN RAISE EXCEPTION 'Collection exceeds effective debt after posted returns'; END IF;
 IF dated<(SELECT max((p.input->>'entryDate')::date) FROM accounting_partial_return_books p
   WHERE p.journal_id IS NOT NULL AND ((p.valuation->>'receivableId')::integer=rid OR EXISTS(
     SELECT 1 FROM jsonb_array_elements(p.valuation->'restorations') x WHERE (x->>'receivableId')::integer=rid)))
 THEN RAISE EXCEPTION 'Collection cannot predate a posted partial return'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_partial_return_collection_guard BEFORE INSERT ON accounting_receipt_allocations
 FOR EACH ROW EXECUTE FUNCTION accounting_partial_return_collection_guard();
CREATE TRIGGER accounting_partial_return_counter_guard BEFORE UPDATE OF settled_amount ON accounting_receivable_items
 FOR EACH ROW EXECUTE FUNCTION accounting_partial_return_collection_guard();
CREATE FUNCTION accounting_partial_return_full_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='accounting_loading_returns' THEN
   IF EXISTS(SELECT 1 FROM accounting_loading_invoices i WHERE i.id=NEW.invoice_id
     AND accounting_receivable_has_partial_return(i.receivable_id))
   THEN RAISE EXCEPTION 'Use the remaining partial-return quantities, not a full invoice reversal'; END IF;
 ELSE
   IF NEW.action IN('returned','bounced') AND EXISTS(SELECT 1 FROM accounting_partial_return_books p
     WHERE p.kind='RECEIPT' AND (p.valuation->>'receiptId')::integer=NEW.receipt_id)
   THEN RAISE EXCEPTION 'Use the remaining documented receipt amounts, not a full receipt return'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_partial_return_full_goods_guard BEFORE INSERT ON accounting_loading_returns
 FOR EACH ROW EXECUTE FUNCTION accounting_partial_return_full_guard();
CREATE TRIGGER accounting_partial_return_full_receipt_guard BEFORE INSERT ON accounting_receipt_events
 FOR EACH ROW EXECUTE FUNCTION accounting_partial_return_full_guard();
CREATE FUNCTION accounting_partial_return_cross_payout_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM accounting_partial_return_books p WHERE p.company_id=NEW.company_id AND p.kind='RECEIPT'
   AND upper(btrim(p.input->>'payoutReference'))=upper(btrim(NEW.input->>'payoutReference')))
 THEN RAISE EXCEPTION 'Actual payout reference is already recorded as receipt return'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_partial_return_cross_payout_guard BEFORE INSERT ON accounting_wallet_refund_books
 FOR EACH ROW EXECUTE FUNCTION accounting_partial_return_cross_payout_guard();
