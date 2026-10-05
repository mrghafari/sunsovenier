-- Full goods returns with a customer-payable credit, NOT a bank payout.
-- Original settlements/receipt allocations and realized FX remain history.
-- No real cutover is enabled, no wallet/order/stock opening is invented.
ALTER TABLE accounting_loading_return_cutovers ADD COLUMN allow_paid_returns boolean NOT NULL DEFAULT false,
 ADD CONSTRAINT accounting_paid_return_gate_check CHECK(NOT allow_paid_returns OR processing_ready);
ALTER TABLE accounting_loading_returns ADD COLUMN customer_credit_journal_id integer UNIQUE REFERENCES accounting_journal_entries(id);

CREATE FUNCTION accounting_loading_return_credit_evidence(invoice_key integer)
RETURNS jsonb LANGUAGE sql STABLE AS $$
 WITH target AS (
   SELECT i.*,r.customer_id,r.currency,r.amount,r.settled_amount,c.base_currency,
     ar.account_id AS ar_account_id,wl.account_id AS liability_account_id
   FROM accounting_loading_invoices i JOIN accounting_receivable_items r ON r.id=i.receivable_id
   JOIN accounting_companies c ON c.id=i.company_id
   LEFT JOIN accounting_posting_rules ar ON ar.company_id=i.company_id AND ar.key='ACCOUNTS_RECEIVABLE'
   LEFT JOIN accounting_posting_rules wl ON wl.company_id=i.company_id AND wl.key='WALLET_LIABILITY'
   WHERE i.id=invoice_key
 ), payments AS (
   SELECT s.amount AS native_amount,
     CASE WHEN t.currency=t.base_currency THEN s.amount ELSE b.receivable_base END AS base_amount,
     j.entry_date AS dated,
     coalesce(s.company_id=t.company_id AND s.currency=t.currency AND j.company_id=t.company_id
       AND j.status='posted' AND j.source_type='WalletSettlement' AND j.source_id=s.source_id
       AND NOT EXISTS(SELECT 1 FROM accounting_journal_entries v WHERE v.reversal_of_id=j.id)
       AND EXISTS(SELECT 1 FROM customer_wallets w WHERE w.id=s.wallet_id AND w.customer_id=t.customer_id AND w.currency=t.currency)
       AND EXISTS(SELECT 1 FROM wallet_transactions n WHERE n.wallet_id=s.wallet_id
         AND n.reference_type='accounting_journal' AND n.reference_id=s.journal_id
         AND n.transaction_type='debit' AND n.status='completed' AND n.amount=s.amount AND n.currency=s.currency)
       AND (t.currency=t.base_currency OR (b.receivable_id=t.receivable_id AND b.amount=s.amount))
       AND (SELECT sum(l.credit-l.debit) FROM accounting_journal_lines l WHERE l.entry_id=j.id
         AND l.account_id=t.ar_account_id AND l.party_type='customer' AND l.party_id=t.customer_id AND l.currency=t.currency)=s.amount
       AND (SELECT sum(l.base_credit-l.base_debit) FROM accounting_journal_lines l WHERE l.entry_id=j.id
         AND l.account_id=t.ar_account_id AND l.party_type='customer' AND l.party_id=t.customer_id AND l.currency=t.currency)
         =CASE WHEN t.currency=t.base_currency THEN s.amount ELSE b.receivable_base END,false) AS valid,
     jsonb_build_object('kind','wallet','id',s.id,'journalId',j.id,'amount',s.amount::text,
       'baseAmount',(CASE WHEN t.currency=t.base_currency THEN s.amount ELSE b.receivable_base END)::text) AS evidence
   FROM target t JOIN accounting_wallet_settlements s ON s.receivable_id=t.receivable_id
   LEFT JOIN accounting_wallet_book_values b ON b.company_id=s.company_id AND b.source_id=s.source_id
   LEFT JOIN accounting_journal_entries j ON j.id=s.journal_id
   UNION ALL
   SELECT a.amount,
     CASE WHEN t.currency=t.base_currency THEN a.amount ELSE (x->>'baseSettled')::numeric END,
     greatest(r.entry_date,(SELECT max(j.entry_date) FROM accounting_receipt_events ev
       JOIN accounting_journal_entries j ON j.id=ev.journal_id WHERE ev.receipt_id=r.id)),
     coalesce(r.company_id=t.company_id AND r.customer_id=t.customer_id AND r.currency=t.currency
       AND ((r.method IN('BANK','CASH') AND r.status='confirmed') OR (r.method='CHEQUE' AND r.status='cleared'))
       AND EXISTS(SELECT 1 FROM accounting_receipt_events ev JOIN accounting_journal_entries j ON j.id=ev.journal_id
         WHERE ev.receipt_id=r.id AND ev.action='received' AND j.company_id=t.company_id AND j.status='posted'
           AND j.source_type='PaymentReceived' AND j.source_id=r.source_id AND j.entry_date=r.entry_date
           AND NOT EXISTS(SELECT 1 FROM accounting_journal_entries v WHERE v.reversal_of_id=j.id))
       AND (t.currency=t.base_currency OR ((x->>'receivableId')::integer=t.receivable_id AND (x->>'amount')::numeric=a.amount))
       AND EXISTS(SELECT 1 FROM jsonb_array_elements(r.input->'allocations') q
         WHERE (q->>'receivableId')::integer=t.receivable_id AND (q->>'amount')::numeric=a.amount),false),
     jsonb_build_object('kind','receipt','id',a.id,'receiptId',r.id,'amount',a.amount::text,
       'baseAmount',(CASE WHEN t.currency=t.base_currency THEN a.amount ELSE (x->>'baseSettled')::numeric END)::text)
   FROM target t JOIN accounting_receipt_allocations a ON a.receivable_id=t.receivable_id AND a.status='active'
   JOIN accounting_customer_receipts r ON r.id=a.receipt_id
   LEFT JOIN accounting_receipt_book_values b ON b.receipt_id=r.id
   LEFT JOIN LATERAL (SELECT q AS x FROM jsonb_array_elements(b.allocations) q
     WHERE (q->>'receivableId')::integer=t.receivable_id) allocation ON true
 ), paid AS (
   SELECT coalesce(sum(native_amount),0) AS amount,coalesce(sum(base_amount),0) AS base_amount,
     coalesce(bool_and(valid AND base_amount IS NOT NULL),false) AS valid,max(dated) AS last_date,
     coalesce(jsonb_agg(evidence ORDER BY evidence->>'kind',evidence->>'id'),'[]'::jsonb) AS evidence FROM payments
 ), wallet AS (
   SELECT w.* FROM target t JOIN accounting_wallet_links link ON link.company_id=t.company_id
     AND link.customer_id=t.customer_id AND link.currency=t.currency
   JOIN customer_wallets w ON w.id=link.wallet_id AND w.customer_id=t.customer_id AND w.currency=t.currency
   WHERE w.status='active'
 ), proof AS (
   SELECT t.*,p.amount AS paid_amount,p.base_amount AS paid_base,p.evidence AS payment_evidence,
     w.id AS wallet_id,w.balance AS wallet_balance,
     (SELECT sum(l.credit-l.debit) FROM accounting_journal_lines l JOIN accounting_journal_entries j ON j.id=l.entry_id
       WHERE j.company_id=t.company_id AND j.status='posted' AND l.account_id=t.liability_account_id
         AND l.party_type='customer' AND l.party_id=t.customer_id AND l.currency=t.currency) AS wallet_native_book,
     greatest(p.last_date,(SELECT max(j.entry_date) FROM accounting_journal_lines l
       JOIN accounting_journal_entries j ON j.id=l.entry_id WHERE j.company_id=t.company_id AND j.status='posted'
         AND l.account_id=t.liability_account_id AND l.party_type='customer' AND l.party_id=t.customer_id AND l.currency=t.currency)) AS min_date,
     CASE WHEN p.base_amount>0 THEN round(p.base_amount/nullif(p.amount,0),12)
       ELSE (SELECT min(exchange_rate) FROM accounting_journal_lines WHERE entry_id=t.journal_id AND currency=t.currency) END AS rate,
     p.valid AND p.amount=t.settled_amount AND p.amount>0 AND p.amount<=t.amount
       AND p.base_amount>=0 AND p.base_amount<=(accounting_loading_return_evidence(t.id)->>'originalBaseAmount')::numeric
       AND EXISTS(SELECT 1 FROM accounting_accounts WHERE id=t.ar_account_id AND company_id=t.company_id AND is_active AND is_posting AND type='asset')
       AND EXISTS(SELECT 1 FROM accounting_accounts WHERE id=t.liability_account_id AND company_id=t.company_id AND is_active AND is_posting AND type='liability')
       AND (SELECT sum(debit-credit) FROM accounting_journal_lines WHERE entry_id=t.journal_id
         AND account_id=t.ar_account_id AND party_type='customer' AND party_id=t.customer_id AND currency=t.currency)=t.amount AS valid
   FROM target t CROSS JOIN paid p LEFT JOIN wallet w ON true
 )
 SELECT jsonb_build_object('amount',paid_amount::text,'baseAmount',paid_base::text,
   'currency',currency,'baseCurrency',base_currency,'customerId',customer_id,'walletId',wallet_id,
   'walletBalance',wallet_balance::text,'walletNativeBook',coalesce(wallet_native_book,0)::text,
   'receivableAccountId',ar_account_id,'liabilityAccountId',liability_account_id,'rate',rate::text,
   'minDate',min_date::text,'payments',payment_evidence,
   'walletAvailable',coalesce((SELECT count(*) FROM wallet)=1 AND wallet_balance>=0
     AND wallet_balance+paid_amount<10000000000 AND paid_amount=round(paid_amount,2)
     AND wallet_balance=coalesce(wallet_native_book,0),false),
   'valid',coalesce(valid AND rate>0,false)) FROM proof
$$;

CREATE FUNCTION accounting_loading_paid_return_ready(invoice_key integer,proof jsonb,dated date)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT coalesce(proof=accounting_loading_return_credit_evidence(invoice_key)
   AND proof->'valid'='true'::jsonb AND proof->'walletAvailable'='true'::jsonb
   AND dated>=(proof->>'minDate')::date AND EXISTS(
     SELECT 1 FROM accounting_loading_invoices i
     JOIN accounting_loading_return_cutovers g ON g.company_id=i.company_id AND g.processing_ready AND g.allow_paid_returns
     JOIN accounting_wallet_cutovers w ON w.company_id=i.company_id AND w.pipeline_ready
     JOIN accounting_receipt_cutovers r ON r.company_id=i.company_id AND r.processing_ready WHERE i.id=invoice_key),false)
$$;

DO $$
DECLARE d text;old text;
BEGIN
 d:=pg_get_functiondef('accounting_loading_return_guard()'::regprocedure);
 old:='OR r.settled_amount IS DISTINCT FROM 0::numeric OR i.settlement_id IS NOT NULL
   OR EXISTS(SELECT 1 FROM accounting_wallet_settlements WHERE receivable_id=r.id)
   OR EXISTS(SELECT 1 FROM accounting_receipt_allocations WHERE receivable_id=r.id AND status=''active'')';
 IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected unsettled loading return guard'; END IF;
 d:=replace(d,old,'OR ((r.settled_amount IS DISTINCT FROM 0::numeric OR i.settlement_id IS NOT NULL
    OR EXISTS(SELECT 1 FROM accounting_wallet_settlements WHERE receivable_id=r.id)
    OR EXISTS(SELECT 1 FROM accounting_receipt_allocations WHERE receivable_id=r.id AND status=''active''))
    AND NOT accounting_loading_paid_return_ready(i.id,NEW.plan->''creditEvidence'',NEW.return_date))');
 old:='OR NEW.invoice_reversal_id IS NOT NULL OR NEW.cogs_reversal_id IS NOT NULL';
 IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected return initial reversal guard'; END IF;
 d:=replace(d,old,old||'
   OR NEW.customer_credit_journal_id IS NOT NULL
   OR (NEW.plan ? ''creditEvidence'' AND (
     NOT accounting_loading_paid_return_ready(i.id,NEW.plan->''creditEvidence'',NEW.return_date)
     OR NEW.plan->''customerCredit'' IS DISTINCT FROM jsonb_build_object(
       ''walletId'',NEW.plan->''creditEvidence''->''walletId'',
       ''amount'',NEW.plan->''creditEvidence''->''amount'',
       ''baseAmount'',NEW.plan->''creditEvidence''->''baseAmount'',
       ''baseCurrency'',NEW.plan->''creditEvidence''->''baseCurrency'')))');
 old:='(to_jsonb(NEW)-''invoice_reversal_id''-''cogs_reversal_id'') IS DISTINCT FROM
        (to_jsonb(OLD)-''invoice_reversal_id''-''cogs_reversal_id'')';
 IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected return completion immutability guard'; END IF;
 EXECUTE replace(d,old,'(to_jsonb(NEW)-''invoice_reversal_id''-''cogs_reversal_id''-''customer_credit_journal_id'') IS DISTINCT FROM
         (to_jsonb(OLD)-''invoice_reversal_id''-''cogs_reversal_id''-''customer_credit_journal_id'')');
 d:=pg_get_functiondef('accounting_wallet_native_guard()'::regprocedure);
 old:='e.source_type IN (''WalletTopUp'',''PaymentReceived'')';
 IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected prepaid credit native guard'; END IF;
 EXECUTE replace(d,old,'e.source_type IN (''WalletTopUp'',''PaymentReceived'',''LoadingReturnCredit'')');
END $$;

-- Preserve independent-reversal blocking. A paid sale return is NOT reversal
-- of its original payments, and cannot authorize reversing a wallet settlement.
CREATE OR REPLACE FUNCTION accounting_settlement_reversal_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.reversal_of_id IS NOT NULL AND (
   EXISTS(SELECT 1 FROM accounting_wallet_settlements WHERE journal_id=NEW.reversal_of_id) OR
   (EXISTS(SELECT 1 FROM accounting_wallet_settlements s JOIN accounting_receivable_items r ON r.id=s.receivable_id
     WHERE r.invoice_journal_id=NEW.reversal_of_id) AND NOT EXISTS(
       SELECT 1 FROM accounting_loading_returns x JOIN accounting_loading_invoices i ON i.id=x.invoice_id
       WHERE i.journal_id=NEW.reversal_of_id AND x.invoice_reversal_id IS NULL AND x.company_id=NEW.company_id
         AND x.actor_id=NEW.created_by AND x.actor_type=NEW.actor_type AND x.return_date=NEW.entry_date
         AND accounting_loading_paid_return_ready(i.id,x.plan->'creditEvidence',x.return_date))))
 THEN RAISE EXCEPTION 'Wallet settlements require a coordinated native/AR reversal, not a generic journal reversal'; END IF;
 RETURN NEW;
END $$;

-- Keep receipt/payment journal reversals blocked. Only a paid invoice's own
-- validated pending goods-return command may reverse its allocated sale.
DO $$
DECLARE d text;needle text;
BEGIN
 d:=pg_get_functiondef('accounting_assert_receipt_book_journal()'::regprocedure);
 needle:='WHERE r.invoice_journal_id=NEW.reversal_of_id))';
 IF strpos(d,needle)=0 THEN RAISE EXCEPTION 'Unexpected foreign allocated-invoice reversal guard'; END IF;
 EXECUTE replace(d,needle,'WHERE r.invoice_journal_id=NEW.reversal_of_id)
   AND NOT EXISTS(SELECT 1 FROM accounting_loading_returns ret JOIN accounting_loading_invoices i ON i.id=ret.invoice_id
     WHERE i.journal_id=NEW.reversal_of_id AND ret.invoice_reversal_id IS NULL AND ret.company_id=NEW.company_id
       AND ret.actor_id=NEW.created_by AND ret.actor_type=NEW.actor_type AND ret.return_date=NEW.entry_date
       AND accounting_loading_paid_return_ready(i.id,ret.plan->''creditEvidence'',ret.return_date)))');
END $$;

DO $$
DECLARE d text;
BEGIN
 d:=pg_get_functiondef('accounting_historical_line(integer,text,text,date,integer,text,numeric,numeric,numeric,numeric,numeric,text,integer,integer,text)'::regprocedure);
 EXECUTE replace(d,'FUNCTION public.accounting_historical_line(', 'FUNCTION public.accounting_before_paid_return_historical_line(');
END $$;
CREATE OR REPLACE FUNCTION accounting_historical_line(
 cid integer,stype text,sid text,dated date,aid integer,cur text,dr numeric,cr numeric,
 bdr numeric,bcr numeric,fx numeric,ptype text,pid integer,cc integer,basis text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT accounting_before_paid_return_historical_line(cid,stype,sid,dated,aid,cur,dr,cr,bdr,bcr,fx,ptype,pid,cc,basis)
 OR (stype='LoadingReturnCredit' AND basis='historical_carrying' AND ptype='customer' AND cc IS NULL AND EXISTS(
   SELECT 1 FROM accounting_loading_returns x WHERE x.id::text=sid AND x.company_id=cid AND x.return_date=dated
     AND x.customer_credit_journal_id IS NULL AND x.plan->'creditEvidence'->'valid'='true'::jsonb
     AND pid=(x.plan->'creditEvidence'->>'customerId')::integer AND cur=x.plan->'creditEvidence'->>'currency'
     AND fx=(x.plan->'creditEvidence'->>'rate')::numeric
     AND ((aid=(x.plan->'creditEvidence'->>'receivableAccountId')::integer AND cr=0 AND bcr=0
       AND dr=(x.plan->'creditEvidence'->>'amount')::numeric AND bdr=(x.plan->'creditEvidence'->>'baseAmount')::numeric)
     OR (aid=(x.plan->'creditEvidence'->>'liabilityAccountId')::integer AND dr=0 AND bdr=0
       AND cr=(x.plan->'creditEvidence'->>'amount')::numeric AND bcr=(x.plan->'creditEvidence'->>'baseAmount')::numeric))))
$$;

CREATE FUNCTION accounting_loading_credit_completion_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE x accounting_loading_returns;e jsonb;j accounting_journal_entries;w customer_wallets;
BEGIN
 IF TG_TABLE_NAME='accounting_journal_entries' THEN
   IF NEW.source_type<>'LoadingReturnCredit' OR NEW.status<>'posted' THEN RETURN NULL; END IF;
   SELECT * INTO x FROM accounting_loading_returns WHERE customer_credit_journal_id=NEW.id;
 ELSE SELECT * INTO x FROM accounting_loading_returns WHERE id=NEW.id; END IF;
 IF x.id IS NULL THEN RAISE EXCEPTION 'Customer credit must belong to a completed loading return'; END IF;
 e:=x.plan->'creditEvidence';
 IF e IS NULL THEN
   IF x.customer_credit_journal_id IS NOT NULL THEN RAISE EXCEPTION 'Unpaid return cannot create customer credit'; END IF;
   RETURN NULL;
 END IF;
 SELECT * INTO j FROM accounting_journal_entries WHERE id=x.customer_credit_journal_id;
 SELECT * INTO w FROM customer_wallets WHERE id=(e->>'walletId')::integer;
 IF x.invoice_reversal_id IS NULL OR j.id IS NULL OR j.company_id<>x.company_id OR j.status<>'posted'
   OR j.source_type<>'LoadingReturnCredit' OR j.source_id<>x.id::text OR j.entry_date<>x.return_date
   OR j.created_by<>x.actor_id OR j.actor_type<>x.actor_type OR j.reversal_of_id IS NOT NULL
   OR e->'valid' IS DISTINCT FROM 'true'::jsonb OR e->'walletAvailable' IS DISTINCT FROM 'true'::jsonb
   OR (e-'walletBalance'-'walletNativeBook'-'walletAvailable'-'minDate') IS DISTINCT FROM
      (accounting_loading_return_credit_evidence(x.invoice_id)-'walletBalance'-'walletNativeBook'-'walletAvailable'-'minDate')
   OR (SELECT count(*) FROM accounting_journal_lines WHERE entry_id=j.id)<>2
   OR NOT EXISTS(SELECT 1 FROM accounting_journal_lines l WHERE l.entry_id=j.id
     AND l.account_id=(e->>'receivableAccountId')::integer AND l.currency=e->>'currency'
     AND l.party_type='customer' AND l.party_id=(e->>'customerId')::integer AND l.cost_center_id IS NULL
     AND l.debit=(e->>'amount')::numeric AND l.credit=0 AND l.base_debit=(e->>'baseAmount')::numeric AND l.base_credit=0)
   OR NOT EXISTS(SELECT 1 FROM accounting_journal_lines l WHERE l.entry_id=j.id
     AND l.account_id=(e->>'liabilityAccountId')::integer AND l.currency=e->>'currency'
     AND l.party_type='customer' AND l.party_id=(e->>'customerId')::integer AND l.cost_center_id IS NULL
     AND l.credit=(e->>'amount')::numeric AND l.debit=0 AND l.base_credit=(e->>'baseAmount')::numeric AND l.base_debit=0)
   OR NOT EXISTS(SELECT 1 FROM wallet_transactions n WHERE n.wallet_id=w.id AND n.customer_id=w.customer_id
     AND n.currency=w.currency AND n.amount=(e->>'amount')::numeric AND n.transaction_type='credit' AND n.status='completed'
     AND n.reference_type='accounting_journal' AND n.reference_id=j.id
     AND n.balance_before=(e->>'walletBalance')::numeric AND n.balance_after=n.balance_before+n.amount)
   OR w.balance<>(e->>'walletBalance')::numeric+(e->>'amount')::numeric
 THEN RAISE EXCEPTION 'Original paid carrying value, completed invoice return and exact native customer credit must commit together'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER accounting_loading_credit_completion_guard AFTER INSERT OR UPDATE ON accounting_loading_returns
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_loading_credit_completion_guard();
CREATE CONSTRAINT TRIGGER accounting_loading_credit_journal_guard AFTER INSERT OR UPDATE ON accounting_journal_entries
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_loading_credit_completion_guard();
CREATE FUNCTION accounting_loading_credit_reversal_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM accounting_loading_returns WHERE customer_credit_journal_id=NEW.reversal_of_id)
 THEN RAISE EXCEPTION 'A customer return credit cannot be independently reversed'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_loading_credit_reversal_guard BEFORE INSERT OR UPDATE ON accounting_journal_entries
 FOR EACH ROW EXECUTE FUNCTION accounting_loading_credit_reversal_guard();

-- Retained payment counters are history, not collectible debt on a returned
-- invoice. Deferred AR callbacks can outlive the return in composed operations.
-- Keep the open-invoice valuation helper strict; prove closed returned AR here.
CREATE OR REPLACE FUNCTION accounting_foreign_ar_parity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actual accounting_receivable_items; outstanding record;x accounting_loading_returns;
  aid integer;n numeric;b numeric;paid numeric;paid_base numeric;
BEGIN
 SELECT * INTO actual FROM accounting_receivable_items WHERE id=NEW.id;
 IF actual.currency<>(SELECT base_currency FROM accounting_companies WHERE id=actual.company_id) THEN
   SELECT r.* INTO x FROM accounting_loading_returns r JOIN accounting_loading_invoices i ON i.id=r.invoice_id
     WHERE i.receivable_id=actual.id AND r.invoice_reversal_id IS NOT NULL;
   IF x.id IS NULL THEN
     SELECT * INTO outstanding FROM accounting_receivable_book_remaining(actual.id,'infinity'::date);
   ELSE
     SELECT account_id INTO aid FROM accounting_posting_rules
       WHERE company_id=actual.company_id AND key='ACCOUNTS_RECEIVABLE';
     paid:=coalesce((x.plan->'creditEvidence'->>'amount')::numeric,0);
     paid_base:=coalesce((x.plan->'creditEvidence'->>'baseAmount')::numeric,0);
     SELECT sum(l.debit-l.credit),sum(l.base_debit-l.base_credit) INTO n,b
       FROM accounting_journal_lines l JOIN accounting_journal_entries j ON j.id=l.entry_id AND j.status='posted'
       WHERE j.company_id=actual.company_id
         AND j.id IN(actual.invoice_journal_id,x.invoice_reversal_id,x.customer_credit_journal_id)
         AND l.account_id=aid AND l.currency=actual.currency
         AND l.party_type='customer' AND l.party_id=actual.customer_id;
     IF n IS NULL OR b IS NULL OR n<>paid OR b<>paid_base OR actual.settled_amount<>paid
     THEN RAISE EXCEPTION 'Returned foreign receivable must close at original paid carrying value'; END IF;
   END IF;
 END IF;
 RETURN NEW;
END $$;

-- Preserve the shared all-zero-base safeguards for a proven foreign minor-unit
-- credit; a generic zero journal is still forbidden.
DO $$
DECLARE d text;needle text;
BEGIN
 d:=pg_get_functiondef('accounting_assert_balanced()'::regprocedure);
 needle:='debit_sum<=0 AND NOT EXISTS';
 IF strpos(d,needle)=0 THEN RAISE EXCEPTION 'Unexpected shared zero-base guard'; END IF;
 EXECUTE replace(d,needle,'debit_sum<=0 AND NOT EXISTS(SELECT 1 FROM accounting_journal_entries j
   JOIN accounting_loading_returns x ON x.id::text=j.source_id
   WHERE j.id=target_id AND j.source_type=''LoadingReturnCredit'' AND j.company_id=x.company_id
     AND x.plan->''creditEvidence''->''valid''=''true''::jsonb
     AND (x.plan->''creditEvidence''->>''baseAmount'')::numeric=0)
   AND NOT EXISTS');
END $$;
