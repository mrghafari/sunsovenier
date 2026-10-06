-- Forward-only amendment: never rewrite a checksummed, applied migration.
DO $$
DECLARE definition text;
 old_sources text := 'AND e.source_type IN (''WalletTopUp'',''WalletRefund'',''PaymentReceived'',''ChequeBounced'')';
 new_sources text := 'AND ((NEW.transaction_type=''credit'' AND e.source_type IN (''WalletTopUp'',''PaymentReceived''))
   OR (NEW.transaction_type=''debit'' AND e.source_type IN (''WalletRefund'',''ChequeBounced'')))';
 old_reserve text := 'IF resulting_balance<held+accounting_pending_cheque_funds(w.id) THEN';
 new_reserve text := 'IF resulting_balance<held+accounting_pending_cheque_funds(w.id)+greatest(w.reserved_balance,
   (SELECT coalesce(sum(amount),0) FROM wallet_transactions WHERE wallet_id=w.id AND status=''reserved'')) THEN';
BEGIN
 SELECT pg_get_functiondef('accounting_wallet_native_guard()'::regprocedure) INTO definition;
 IF strpos(definition,old_sources)=0 OR strpos(definition,old_reserve)=0
   THEN RAISE EXCEPTION 'Unexpected wallet guard version; review before amending it'; END IF;
 EXECUTE replace(replace(definition,old_sources,new_sources),old_reserve,new_reserve);
END $$;