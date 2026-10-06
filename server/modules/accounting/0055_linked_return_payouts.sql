-- A receipt associated with a goods return is not reversed a second time.
-- Instead record the actual payout against its already restored wallet credit.
-- No activation, real opening, receipt-counter mutation or bank call.
DO $$ DECLARE d text;
BEGIN
 d:=pg_get_functiondef('accounting_wallet_refund_valuation(jsonb)'::regprocedure);
 EXECUTE replace(d,'FUNCTION public.accounting_wallet_refund_valuation(',
   'FUNCTION public.accounting_before_linked_refund_valuation(');
END $$;
CREATE OR REPLACE FUNCTION accounting_wallet_refund_valuation(doc jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE v jsonb;g accounting_partial_return_books;r accounting_customer_receipts;
 w customer_wallets;credit numeric;spent numeric;remaining numeric;allocated numeric;used numeric;
 credit_tx integer;rid integer;cid integer;amount numeric;
BEGIN
 v:=accounting_before_linked_refund_valuation(doc);
 IF NOT (doc ? 'goodsReturnId') AND NOT (doc ? 'receiptId') THEN RETURN v; END IF;
 IF NOT (doc ? 'goodsReturnId') OR NOT (doc ? 'receiptId') THEN
   RETURN v||jsonb_build_object('available',false,'blockingReason','RETURN_CREDIT_LINK_REQUIRED');
 END IF;
 SELECT * INTO g FROM accounting_partial_return_books WHERE id=(doc->>'goodsReturnId')::integer
   AND company_id=(doc->>'companyId')::integer AND kind='GOODS' AND journal_id IS NOT NULL;
 SELECT * INTO r FROM accounting_customer_receipts WHERE id=(doc->>'receiptId')::integer;
 SELECT * INTO w FROM customer_wallets WHERE id=(doc->>'walletId')::integer;
 IF g.id IS NULL OR r.id IS NULL OR w.id IS NULL OR r.company_id<>g.company_id OR r.customer_id<>w.customer_id
   OR r.currency<>w.currency OR r.method NOT IN ('BANK','CASH') OR r.status<>'confirmed'
   OR (g.valuation->>'walletId')::integer IS DISTINCT FROM w.id
   OR (g.valuation->>'customerId')::integer IS DISTINCT FROM w.customer_id
   OR g.valuation->>'currency' IS DISTINCT FROM w.currency
   OR r.entry_date>(g.input->>'entryDate')::date
   OR (doc->>'entryDate')::date<(g.input->>'entryDate')::date
   OR NOT EXISTS(SELECT 1 FROM accounting_journal_entries j WHERE j.id=g.journal_id AND j.status='posted'
     AND NOT EXISTS(SELECT 1 FROM accounting_journal_entries rev WHERE rev.reversal_of_id=j.id))
   OR NOT EXISTS(SELECT 1 FROM accounting_receipt_events e JOIN accounting_journal_entries j ON j.id=e.journal_id
     WHERE e.receipt_id=r.id AND e.action='received' AND j.status='posted' AND j.company_id=g.company_id
       AND j.source_type='PaymentReceived' AND j.source_id=r.source_id AND j.entry_date=r.entry_date
       AND NOT EXISTS(SELECT 1 FROM accounting_journal_entries rev WHERE rev.reversal_of_id=j.id))
 THEN RETURN v||jsonb_build_object('available',false,'blockingReason','RETURN_CREDIT_LINK_INVALID'); END IF;
 rid:=(g.valuation->>'receivableId')::integer;cid:=g.company_id;
 SELECT coalesce(sum(a.amount),0) INTO allocated FROM accounting_receipt_allocations a
   WHERE a.receipt_id=r.id AND a.receivable_id=rid AND a.status='active';
 SELECT coalesce(sum((x->>'amount')::numeric),0) INTO used
   FROM accounting_partial_return_books p CROSS JOIN LATERAL jsonb_array_elements(p.valuation->'restorations') x
   WHERE p.company_id=cid AND p.kind='RECEIPT' AND p.journal_id IS NOT NULL
     AND (p.valuation->>'receiptId')::integer=r.id AND (x->>'receivableId')::integer=rid;
 SELECT used+coalesce(sum((p.input->>'amount')::numeric),0) INTO used
   FROM accounting_wallet_refund_books p WHERE p.company_id=cid AND p.journal_id IS NOT NULL
     AND (p.input->>'receiptId')::integer=r.id;
 SELECT min(t.id) INTO credit_tx FROM wallet_transactions t
   WHERE t.wallet_id=w.id AND t.customer_id=w.customer_id AND t.currency=w.currency AND t.status='completed'
     AND t.transaction_type='credit' AND t.reference_type='accounting_journal'
     AND t.reference_id=g.journal_id AND (t.metadata->>'partialReturnId')::integer=g.id;
 credit:=(g.valuation->>'walletAmount')::numeric;amount:=(doc->>'amount')::numeric;
 -- Any later withdrawal conservatively consumes attributable return credit.
 -- Independent payouts and settlements cannot then be documented again as this return.
 SELECT coalesce(sum(t.amount),0) INTO spent FROM wallet_transactions t
   WHERE t.wallet_id=w.id AND t.customer_id=w.customer_id AND t.currency=w.currency
     AND t.status='completed' AND t.transaction_type='debit' AND t.id>credit_tx;
 remaining:=greatest(credit-spent,0);
 v:=v||jsonb_build_object('returnCredit',jsonb_build_object('goodsReturnId',g.id,'receiptId',r.id,
   'originalCredit',credit::text,'availableCredit',remaining::text,'receiptAvailable',greatest(allocated-used,0)::text));
 IF credit_tx IS NULL OR credit IS NULL OR credit<=0 OR amount>remaining OR amount>allocated-used OR amount<=0 THEN
   RETURN v||jsonb_build_object('available',false,'blockingReason','RETURN_CREDIT_EXHAUSTED');
 END IF;
 RETURN v;
END $$;
