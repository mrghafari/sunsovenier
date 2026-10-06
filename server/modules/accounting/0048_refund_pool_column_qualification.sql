-- Preserve immutable migration checksums; qualify aggregate columns that otherwise
-- conflict with the payout amount PL/pgSQL variable, including empty hold pools.
DO $$
DECLARE d text;held text;legacy text;
BEGIN
 d:=pg_get_functiondef('accounting_wallet_refund_valuation(jsonb)'::regprocedure);
 held:='SELECT coalesce(sum(amount-consumed_amount),0) INTO held FROM accounting_wallet_holds WHERE wallet_id=w.id AND status=''active'';';
 legacy:='SELECT greatest(w.reserved_balance,coalesce(sum(amount),0)) INTO legacy FROM wallet_transactions WHERE wallet_id=w.id AND status=''reserved'';';
 IF strpos(d,held)=0 OR strpos(d,legacy)=0 THEN RAISE EXCEPTION 'Unexpected refund reservation pool function'; END IF;
 d:=replace(d,held,'SELECT coalesce(sum(h.amount-h.consumed_amount),0) INTO held FROM accounting_wallet_holds h WHERE h.wallet_id=w.id AND h.status=''active'';');
 d:=replace(d,legacy,'SELECT greatest(w.reserved_balance,coalesce(sum(n.amount),0)) INTO legacy FROM wallet_transactions n WHERE n.wallet_id=w.id AND n.status=''reserved'';');
 EXECUTE d;
END $$;
