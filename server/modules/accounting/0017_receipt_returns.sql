-- Forward-only, explicit development operation. No financial activation.
-- The existing immutable lifecycle proof table is shared by cheque and cash/bank returns.
ALTER TABLE accounting_customer_receipts DROP CONSTRAINT accounting_customer_receipts_status_check;
ALTER TABLE accounting_customer_receipts ADD CONSTRAINT accounting_customer_receipts_status_check
  CHECK(status IN ('confirmed','received','deposited','cleared','bounced','returned'));
ALTER TABLE accounting_receipt_events DROP CONSTRAINT accounting_receipt_events_action_check;
ALTER TABLE accounting_receipt_events ADD CONSTRAINT accounting_receipt_events_action_check
  CHECK(action IN ('received','deposited','cleared','bounced','returned'));
ALTER TABLE accounting_cheque_book_values DROP CONSTRAINT accounting_cheque_book_values_action_check;
ALTER TABLE accounting_cheque_book_values ADD CONSTRAINT accounting_cheque_book_values_action_check
  CHECK(action IN ('deposited','cleared','bounced','returned'));

DO $$
DECLARE d text;old text;fname text;
BEGIN
  SELECT pg_get_functiondef('accounting_receipt_evidence_guard()'::regprocedure) INTO d;
  old:='    IF OLD.method<>''CHEQUE''';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected receipt lifecycle guard'; END IF;
  EXECUTE replace(d,old,'    IF OLD.method IN (''BANK'',''CASH'') AND OLD.status=''confirmed'' AND NEW.status=''returned'' THEN RETURN NEW; END IF;
    IF OLD.method<>''CHEQUE''');

  SELECT pg_get_functiondef('accounting_cheque_book_guard()'::regprocedure) INTO d;
  old:='  IF r.id IS NULL OR original.id IS NULL OR r.method<>''CHEQUE'' OR r.currency=c.base_currency';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected instrument proof identity guard'; END IF;
  -- Base-currency receipts predate carrying proofs. Derive their original evidence
  -- from the immutable received journal; never guess an opening balance.
  d:=replace(d,old,'  IF r.method IN (''BANK'',''CASH'') AND r.currency=c.base_currency AND NEW.action=''returned'' THEN
    SELECT e.id INTO original.id FROM accounting_receipt_events ev JOIN accounting_journal_entries e ON e.id=ev.journal_id
      JOIN accounting_wallet_cutovers g ON g.company_id=e.company_id AND e.created_at>=g.enabled_at
      WHERE ev.receipt_id=r.id AND ev.action=''received'' AND e.status=''posted'' AND e.company_id=r.company_id
        AND e.source_type=''PaymentReceived'' AND e.source_id=r.source_id AND e.entry_date=r.entry_date
        AND NOT EXISTS(SELECT 1 FROM accounting_journal_entries v WHERE v.reversal_of_id=e.id);
    SELECT l.account_id INTO original.funding_account_id FROM accounting_journal_lines l JOIN accounting_accounts a ON a.id=l.account_id
      WHERE l.entry_id=original.id AND l.currency=r.currency AND l.debit=r.amount AND l.credit=0
        AND l.base_debit=r.amount AND l.party_type IS NULL AND l.party_id IS NULL AND a.type=''asset'';
    SELECT p.account_id INTO original.receivable_account_id FROM accounting_posting_rules p
      WHERE p.company_id=c.id AND p.key=''ACCOUNTS_RECEIVABLE'';
    SELECT p.account_id INTO original.liability_account_id FROM accounting_posting_rules p
      WHERE p.company_id=c.id AND p.key=''WALLET_LIABILITY'';
    original.base_currency:=c.base_currency;original.funding_base:=r.amount;
    original.wallet_base:=r.wallet_credit;original.official_rate:=1;original.receivable_rate:=1;
    SELECT coalesce(sum(amount),0),coalesce(jsonb_agg(jsonb_build_object(''receivableId'',receivable_id,
      ''amount'',amount::text,''baseSettled'',amount::text)),''[]''::jsonb) INTO original.allocated,original.allocations
      FROM accounting_receipt_allocations WHERE receipt_id=r.id;
    original.receivable_base:=original.allocated;
    IF original.funding_account_id IS NULL OR original.allocated+r.wallet_credit<>r.amount
      OR original.allocated<>(SELECT coalesce(sum(credit-debit),0) FROM accounting_journal_lines
        WHERE entry_id=original.id AND account_id=original.receivable_account_id AND currency=r.currency
          AND party_type=''customer'' AND party_id=r.customer_id)
      OR r.wallet_credit<>(SELECT coalesce(sum(credit-debit),0) FROM accounting_journal_lines
        WHERE entry_id=original.id AND account_id=original.liability_account_id AND currency=r.currency
          AND party_type=''customer'' AND party_id=r.customer_id)
      THEN RAISE EXCEPTION ''Original base receipt journal needs reconciliation''; END IF;
  END IF;
  IF r.id IS NULL OR original.id IS NULL
    OR NOT ((r.method=''CHEQUE'' AND r.currency<>c.base_currency AND NEW.action IN (''deposited'',''cleared'',''bounced''))
      OR (r.method IN (''BANK'',''CASH'') AND NEW.action=''returned''))');
  d:=replace(d,'(NEW.action=''bounced'' AND r.status IN (''received'',''deposited'',''cleared''))',
    '(NEW.action=''bounced'' AND r.status IN (''received'',''deposited'',''cleared'')) OR (NEW.action=''returned'' AND r.status=''confirmed'')');
  d:=replace(d,'IF r.status<>''received'' THEN','IF r.status IN (''deposited'',''cleared'') THEN');
  d:=replace(d,'NEW.action=''bounced'' AND r.status=''cleared''','(NEW.action=''bounced'' AND r.status=''cleared'') OR NEW.action=''returned''');
  d:=replace(d,'WHEN r.status=''cleared'' THEN','WHEN r.status=''cleared'' OR NEW.action=''returned'' THEN');
  d:=replace(d,'CASE WHEN r.status=''cleared'' THEN 0','CASE WHEN r.status=''cleared'' OR NEW.action=''returned'' THEN 0');
  -- Preserve the same-currency bank/cash source account, never a newly remapped one.
  old:='    PERFORM accounting_receivable_book_remaining((x->>''receivableId'')::integer,NEW.entry_date)
      FROM jsonb_array_elements(original.allocations) x;';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected original allocation chronology check'; END IF;
  d:=replace(d,old,'    IF r.currency<>c.base_currency THEN
      PERFORM accounting_receivable_book_remaining((x->>''receivableId'')::integer,NEW.entry_date)
        FROM jsonb_array_elements(original.allocations) x;
    ELSE
      IF EXISTS(SELECT 1 FROM accounting_receipt_allocations a JOIN accounting_receivable_items ri ON ri.id=a.receivable_id
        WHERE a.receipt_id=r.id AND (ri.settled_amount<a.amount OR ri.company_id<>c.id OR ri.customer_id<>r.customer_id OR ri.currency<>r.currency))
        THEN RAISE EXCEPTION ''Original base receipt allocations need reconciliation''; END IF;
    END IF;');
  EXECUTE d;

  -- All shared journal guards must recognize the new proven source; no manual overrides.
  FOREACH fname IN ARRAY ARRAY['accounting_cheque_historical_line','accounting_assert_cheque_book_journal',
    'accounting_assert_balanced','accounting_cheque_book_used'] LOOP
    IF fname='accounting_cheque_historical_line' THEN
      SELECT pg_get_functiondef('accounting_cheque_historical_line(integer,text,text,date,integer,text,numeric,numeric,numeric,numeric,numeric,text,integer,integer,text)'::regprocedure) INTO d;
    ELSE SELECT pg_get_functiondef((fname||'()')::regprocedure) INTO d; END IF;
    old:='ELSE ''ChequeBounced'' END';
    IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected proof source mapping in %',fname; END IF;
    d:=replace(d,old,'WHEN ''returned'' THEN ''ReceiptReturned'' ELSE ''ChequeBounced'' END');
    IF fname='accounting_assert_cheque_book_journal' THEN
      d:=replace(d,'''ChequeDeposited'',''ChequeCleared'',''ChequeBounced''','''ChequeDeposited'',''ChequeCleared'',''ChequeBounced'',''ReceiptReturned''');
      d:=replace(d,'  IF proof.id IS NULL THEN','  IF proof.id IS NULL THEN
    IF NEW.source_type=''ReceiptReturned'' THEN RAISE EXCEPTION ''Receipt return proof required''; END IF;');
      d:=replace(d,'    THEN RAISE EXCEPTION ''Foreign cheque requires',
        '    THEN RAISE EXCEPTION ''Foreign cheque requires');
      -- Protect base-currency return journals and original receipts from independent reversal too.
      d:=replace(d,'JOIN accounting_receipt_book_values rb ON rb.receipt_id=ev.receipt_id',
        'JOIN accounting_customer_receipts rr ON rr.id=ev.receipt_id
        LEFT JOIN accounting_receipt_book_values rb ON rb.receipt_id=ev.receipt_id');
      d:=replace(d,'WHERE ev.journal_id=NEW.reversal_of_id)',
        'WHERE ev.journal_id=NEW.reversal_of_id AND (rb.id IS NOT NULL OR EXISTS(
          SELECT 1 FROM accounting_cheque_book_values rp WHERE rp.receipt_id=rr.id AND rp.action=''returned'')))');
    ELSIF fname='accounting_cheque_book_used' THEN
      old:='IF r.method<>''CHEQUE'' OR r.currency=(SELECT base_currency FROM accounting_companies WHERE id=r.company_id) THEN RETURN NEW; END IF;';
      IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected proof completion identity guard'; END IF;
      d:=replace(d,old,'IF NOT ((r.method=''CHEQUE'' AND r.currency<>(SELECT base_currency FROM accounting_companies WHERE id=r.company_id))
        OR r.method IN (''BANK'',''CASH'')) THEN RETURN NEW; END IF;');
      d:=replace(d,'IF r.status<>''received'' AND','IF r.status NOT IN (''received'',''confirmed'') AND');
      d:=replace(d,'proof.action=''bounced''','proof.action IN (''bounced'',''returned'')');
      d:=replace(d,'OR r.status<>''bounced''','OR r.status<>proof.action');
      old:='  PERFORM accounting_receivable_book_remaining(a.receivable_id,''infinity''::date)
    FROM accounting_receipt_allocations a WHERE a.receipt_id=rid;';
      IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected allocation parity check'; END IF;
      d:=replace(d,old,'  IF r.currency<>(SELECT base_currency FROM accounting_companies WHERE id=r.company_id) THEN
    PERFORM accounting_receivable_book_remaining(a.receivable_id,''infinity''::date)
      FROM accounting_receipt_allocations a WHERE a.receipt_id=rid;
  ELSE
    IF EXISTS(SELECT 1 FROM accounting_receipt_allocations a JOIN accounting_receivable_items ri ON ri.id=a.receivable_id
      WHERE a.receipt_id=rid AND ri.settled_amount<>(
        (SELECT coalesce(sum(amount),0) FROM accounting_receipt_allocations WHERE receivable_id=ri.id AND status=''active'')+
        (SELECT coalesce(sum(amount),0) FROM accounting_wallet_settlements WHERE receivable_id=ri.id)))
      THEN RAISE EXCEPTION ''Base receipt return AR parity required''; END IF;
  END IF;');
    END IF;
    EXECUTE d;
  END LOOP;

  SELECT pg_get_functiondef('accounting_receipt_book_used()'::regprocedure) INTO d;
  d:=replace(d,'r.status<>''confirmed''','r.status NOT IN (''confirmed'',''returned'')');
  d:=replace(d,'r.status=''bounced''','r.status IN (''bounced'',''returned'')');
  d:=replace(d,'r.status<>''bounced''','r.status NOT IN (''bounced'',''returned'')');
  EXECUTE d;
  SELECT pg_get_functiondef('accounting_foreign_allocation_guard()'::regprocedure) INTO d;
  d:=replace(d,'r.status=''bounced''','r.status IN (''bounced'',''returned'')');
  d:=replace(d,'action=''bounced''','action IN (''bounced'',''returned'')');
  EXECUTE d;
  SELECT pg_get_functiondef('accounting_receivable_book_remaining(integer,date)'::regprocedure) INTO d;
  d:=replace(d,'e.source_type=''ChequeBounced''','e.source_type IN (''ChequeBounced'',''ReceiptReturned'')');
  d:=replace(d,'proof.action=''bounced''','proof.action IN (''bounced'',''returned'')');
  EXECUTE d;
  FOREACH fname IN ARRAY ARRAY['accounting_wallet_native_guard','accounting_wallet_settlement_guard'] LOOP
    SELECT pg_get_functiondef((fname||'()')::regprocedure) INTO d;
    IF strpos(d,'''ChequeBounced''')=0 THEN RAISE EXCEPTION 'Unexpected source guard in %',fname; END IF;
    EXECUTE replace(d,'''ChequeBounced''','''ChequeBounced'',''ReceiptReturned''');
  END LOOP;
END $$;
CREATE CONSTRAINT TRIGGER accounting_receipt_return_complete AFTER UPDATE ON accounting_customer_receipts
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_cheque_book_used();