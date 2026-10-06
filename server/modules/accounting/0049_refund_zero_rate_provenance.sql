-- Historical base amounts remain authoritative. A rounded zero base residual
-- must preserve a positive, proven incoming rate, never manufacture today's FX
-- or weaken the positive-rate journal constraint.
DO $$
DECLARE d text;decl text;needle text;
BEGIN
 d:=pg_get_functiondef('accounting_wallet_refund_valuation(jsonb)'::regprocedure);
 decl:='DECLARE c accounting_companies;w customer_wallets;curdigits integer;digits integer;';
 needle:='ls:=jsonb_build_array(';
 IF strpos(d,decl)=0 OR strpos(d,needle)=0 THEN RAISE EXCEPTION 'Unexpected refund historical rate function'; END IF;
 d:=replace(d,decl,'DECLARE wr numeric;fr numeric;wline integer;fline integer;c accounting_companies;w customer_wallets;curdigits integer;digits integer;');
 d:=replace(d,needle,'wr:=round(lb/amount,12);fr:=round(fb/amount,12);
  IF wr=0 THEN
    SELECT l.exchange_rate,l.id INTO wr,wline FROM accounting_journal_lines l
      JOIN accounting_journal_entries e ON e.id=l.entry_id AND e.status=''posted''
      WHERE e.company_id=c.id AND l.account_id=liability AND l.currency=w.currency
        AND l.party_type=''customer'' AND l.party_id=w.customer_id AND l.credit>0 AND l.exchange_rate>0
      ORDER BY e.entry_date DESC,e.id DESC,l.id DESC LIMIT 1;
  END IF;
  IF fr=0 THEN
    SELECT l.exchange_rate,l.id INTO fr,fline FROM accounting_journal_lines l
      JOIN accounting_journal_entries e ON e.id=l.entry_id AND e.status=''posted''
      WHERE e.company_id=c.id AND l.account_id=funding AND l.currency=w.currency AND l.debit>0 AND l.exchange_rate>0
      ORDER BY e.entry_date DESC,e.id DESC,l.id DESC LIMIT 1;
  END IF;
  IF wr IS NULL OR wr<=0 OR fr IS NULL OR fr<=0 THEN
    RETURN r||jsonb_build_object(''blockingReason'',''REFUND_RATE_PROVENANCE_REQUIRED'');
  END IF;
  r:=r||jsonb_build_object(''historicalRateEvidence'',jsonb_build_object(
    ''liabilitySourceLineId'',wline,''fundingSourceLineId'',fline));
  ls:=jsonb_build_array(');
 d:=replace(d,'''exchangeRate'',round(lb/amount,12)::text','''exchangeRate'',wr::text');
 d:=replace(d,'''exchangeRate'',round(fb/amount,12)::text','''exchangeRate'',fr::text');
 EXECUTE d;
END $$;
