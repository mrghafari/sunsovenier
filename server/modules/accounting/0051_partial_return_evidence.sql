-- Real, independently gated adjustments; original invoices and allocations stay intact.
CREATE TABLE accounting_partial_return_cutovers (
 company_id integer PRIMARY KEY REFERENCES accounting_companies(id),
 processing_ready boolean NOT NULL DEFAULT false, starts_on date,
 reviewed_by integer, evidence_reference text,
 CHECK(NOT processing_ready OR (starts_on IS NOT NULL AND reviewed_by>0
   AND length(btrim(evidence_reference)) BETWEEN 5 AND 500))
);
CREATE TABLE accounting_partial_return_books (
 id serial PRIMARY KEY, company_id integer NOT NULL REFERENCES accounting_companies(id),
 kind text NOT NULL CHECK(kind IN('GOODS','RECEIPT')),
 source_id text NOT NULL, input jsonb NOT NULL, valuation jsonb NOT NULL,
 journal_id integer UNIQUE REFERENCES accounting_journal_entries(id),
 actor_id integer NOT NULL, actor_type text NOT NULL CHECK(actor_type IN('admin','custom')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,source_id),
 CHECK(length(source_id) BETWEEN 3 AND 150),
 CHECK(input->>'kind'=kind AND (input->>'companyId')::integer=company_id),
 CHECK(coalesce(length(btrim(input->>'evidenceReference')),0) BETWEEN 5 AND 500),
 CHECK(coalesce(length(btrim(input->>'reason')),0) BETWEEN 5 AND 500),
 CHECK(input->'evidenceConfirmed' IS NOT DISTINCT FROM 'true'::jsonb),
 CHECK(kind<>'RECEIPT' OR coalesce(length(btrim(input->>'payoutReference')),0) BETWEEN 5 AND 150),
 CHECK(kind<>'RECEIPT' OR input->>'payoutReference'=upper(btrim(translate(input->>'payoutReference',
   '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩','01234567890123456789'))))
);
CREATE UNIQUE INDEX accounting_partial_return_payout_reference ON accounting_partial_return_books
 (company_id,upper(btrim(input->>'payoutReference'))) WHERE kind='RECEIPT';
CREATE UNIQUE INDEX accounting_partial_return_goods_reference ON accounting_partial_return_books
 (company_id,(input->>'invoiceId'),upper(btrim(input->>'evidenceReference'))) WHERE kind='GOODS';
CREATE FUNCTION accounting_receivable_return_adjustment(rid integer,dated date)
RETURNS TABLE(debt_reduction numeric,debt_base numeric,restored numeric,restored_base numeric)
LANGUAGE sql STABLE AS $$
 SELECT
 coalesce(sum(CASE WHEN p.kind='GOODS' AND (p.valuation->>'receivableId')::integer=rid
   THEN (p.valuation->>'debtReduction')::numeric ELSE 0 END),0),
 coalesce(sum(CASE WHEN p.kind='GOODS' AND (p.valuation->>'receivableId')::integer=rid
   THEN (p.valuation->>'debtBase')::numeric ELSE 0 END),0),
 coalesce(sum(CASE WHEN p.kind='RECEIPT' THEN (x->>'amount')::numeric ELSE 0 END),0),
 coalesce(sum(CASE WHEN p.kind='RECEIPT' THEN (x->>'baseAmount')::numeric ELSE 0 END),0)
 FROM accounting_partial_return_books p JOIN accounting_journal_entries j ON j.id=p.journal_id AND j.status='posted'
 LEFT JOIN LATERAL jsonb_array_elements(p.valuation->'restorations') x ON (x->>'receivableId')::integer=rid
 WHERE j.entry_date<=dated AND (p.kind='GOODS' AND (p.valuation->>'receivableId')::integer=rid OR x IS NOT NULL)
$$;
CREATE FUNCTION accounting_receivable_paid_native(rid integer,dated date) RETURNS numeric LANGUAGE sql STABLE AS $$
 SELECT coalesce(sum(n),0) FROM (
 SELECT s.amount n FROM accounting_wallet_settlements s JOIN accounting_journal_entries j ON j.id=s.journal_id
 WHERE s.receivable_id=rid AND j.status='posted' AND j.entry_date<=dated
   AND NOT EXISTS(SELECT 1 FROM accounting_journal_entries v WHERE v.reversal_of_id=j.id AND v.entry_date<=dated)
 UNION ALL
 SELECT a.amount FROM accounting_receipt_allocations a JOIN accounting_customer_receipts r ON r.id=a.receipt_id
 WHERE a.receivable_id=rid AND r.entry_date<=dated AND EXISTS(
   SELECT 1 FROM accounting_receipt_events ev JOIN accounting_journal_entries j ON j.id=ev.journal_id
   WHERE ev.receipt_id=r.id AND ev.action='received' AND j.status='posted' AND j.entry_date<=dated)
 AND NOT EXISTS(SELECT 1 FROM accounting_receipt_events ev JOIN accounting_journal_entries j ON j.id=ev.journal_id
   WHERE ev.receipt_id=r.id AND ev.action IN('bounced','returned') AND j.status='posted' AND j.entry_date<=dated)
 ) p
$$;
CREATE FUNCTION accounting_receivable_open_native(rid integer,dated date) RETURNS numeric LANGUAGE sql STABLE AS $$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM accounting_journal_entries j WHERE j.reversal_of_id=r.invoice_journal_id
   AND j.status='posted' AND j.entry_date<=dated) THEN 0
 ELSE r.amount-accounting_receivable_paid_native(rid,dated)-a.debt_reduction+a.restored END
 FROM accounting_receivable_items r CROSS JOIN accounting_receivable_return_adjustment(rid,dated) a WHERE r.id=rid
$$;
CREATE FUNCTION accounting_partial_return_line(aid integer,cur text,n numeric,b numeric,fx numeric,
 debit_side boolean,customer integer DEFAULT NULL) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_build_object('accountId',aid,'currency',cur,
 'debit',CASE WHEN debit_side THEN n ELSE 0 END::text,'credit',CASE WHEN debit_side THEN 0 ELSE n END::text,
 'baseDebit',CASE WHEN debit_side THEN b ELSE 0 END::text,'baseCredit',CASE WHEN debit_side THEN 0 ELSE b END::text,
 'exchangeRate',fx::text,'partyType',CASE WHEN customer IS NULL THEN NULL ELSE 'customer' END,
 'partyId',customer,'costCenterId',NULL,'description','')
$$;
CREATE FUNCTION accounting_partial_goods_valuation(doc jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE i accounting_loading_invoices;r accounting_receivable_items;c accounting_companies;
 nd integer;bd integer;dated date;line jsonb;origin jsonb;item integer;qty numeric;prior_qty numeric;
 prior_goods numeric;prior_tax numeric;goods numeric:=0;tax numeric:=0;g numeric;t numeric;
 recoveries jsonb:='[]';items jsonb:='[]';ls jsonb:='[]';s record;used_qty numeric;used_cost numeric;
 need numeric;take numeric;cost numeric;total_cost numeric:=0;gb numeric;tb numeric;prior_native numeric;prior_base numeric;
 sale record;ar record;liability integer;inventory integer;cogs integer;open_native numeric;open_base numeric;
debt numeric;debt_value numeric;credit numeric;credit_value numeric;w customer_wallets;component_key text;result jsonb;
BEGIN
 SELECT * INTO i FROM accounting_loading_invoices WHERE id=(doc->>'invoiceId')::integer AND company_id=(doc->>'companyId')::integer;
 SELECT * INTO r FROM accounting_receivable_items WHERE id=i.receivable_id;
 SELECT * INTO c FROM accounting_companies WHERE id=i.company_id;
 dated:=(doc->>'entryDate')::date;
 result:=jsonb_build_object('available',false,'blockingReason','PARTIAL_GOODS_EVIDENCE_REQUIRED','kind','GOODS',
   'companyId',i.company_id,'invoiceId',i.id,'receivableId',r.id,'lines','[]'::jsonb);
 IF i.id IS NULL OR accounting_loading_return_evidence(i.id)->'evidenceValid' IS DISTINCT FROM 'true'::jsonb
   OR EXISTS(SELECT 1 FROM accounting_journal_entries WHERE reversal_of_id IN(i.journal_id,i.cogs_journal_id))
   OR dated<accounting_loading_return_min_date(i.company_id,i.id)
   OR dated<(SELECT max(j.entry_date) FROM accounting_journal_entries j JOIN accounting_journal_lines l ON l.entry_id=j.id
     WHERE j.company_id=c.id AND j.status='posted' AND l.party_type='customer' AND l.party_id=r.customer_id AND l.currency=r.currency)
   OR dated<(SELECT max((p.input->>'entryDate')::date) FROM accounting_partial_return_books p WHERE p.company_id=c.id)
   OR EXISTS(SELECT 1 FROM accounting_receipt_allocations a JOIN accounting_customer_receipts rc ON rc.id=a.receipt_id
     WHERE a.receivable_id=r.id AND a.status='active' AND rc.method='CHEQUE' AND rc.status<>'cleared')
   OR NOT accounting_stock_ledger_reconciled(c.id)
 THEN RETURN result; END IF;
 SELECT decimals INTO nd FROM accounting_currencies WHERE code=r.currency AND is_active;
 SELECT decimals INTO bd FROM accounting_currencies WHERE code=c.base_currency AND is_active;
 IF nd IS NULL OR bd IS NULL OR jsonb_array_length(doc->'items')<1
   OR (SELECT count(*) FROM jsonb_array_elements(doc->'items'))<>
      (SELECT count(DISTINCT x->>'orderItemId') FROM jsonb_array_elements(doc->'items') x)
 THEN RETURN result; END IF;
 FOR line IN SELECT x FROM jsonb_array_elements(doc->'items') x ORDER BY (x->>'orderItemId')::integer LOOP
   item:=(line->>'orderItemId')::integer;qty:=(line->>'quantityTons')::numeric;
   SELECT x INTO origin FROM jsonb_array_elements(i.plan->'amounts'->'lines') x WHERE (x->>'orderItemId')::integer=item;
   SELECT coalesce(sum((x->>'quantityTons')::numeric),0),coalesce(sum((x->>'goods')::numeric),0),
     coalesce(sum((x->>'tax')::numeric),0) INTO prior_qty,prior_goods,prior_tax
     FROM accounting_partial_return_books p CROSS JOIN LATERAL jsonb_array_elements(p.valuation->'items') x
     WHERE p.kind='GOODS' AND p.journal_id IS NOT NULL AND (p.valuation->>'invoiceId')::integer=i.id AND (x->>'orderItemId')::integer=item;
   IF origin IS NULL OR qty<=0 OR qty<>round(qty,8) OR prior_qty+qty>(origin->>'weightTons')::numeric THEN RETURN result; END IF;
   g:=round((origin->>'goods')::numeric*(prior_qty+qty)/(origin->>'weightTons')::numeric,nd)-prior_goods;
   t:=round((origin->>'tax')::numeric*(prior_qty+qty)/(origin->>'weightTons')::numeric,nd)-prior_tax;
   IF g<0 OR t<0 THEN RETURN result; END IF;
   goods:=goods+g;tax:=tax+t;
   items:=items||jsonb_build_array(jsonb_build_object('orderItemId',item,'quantityTons',qty::text,'goods',g::text,'tax',t::text));
   need:=qty;
   FOR s IN SELECT * FROM accounting_stock_consumptions WHERE invoice_id=i.id AND order_item_id=item ORDER BY id LOOP
     SELECT coalesce(sum((x->>'quantityTons')::numeric),0),coalesce(sum((x->>'baseCost')::numeric),0) INTO used_qty,used_cost
       FROM accounting_partial_return_books p CROSS JOIN LATERAL jsonb_array_elements(p.valuation->'recoveries') x
       WHERE p.kind='GOODS' AND p.journal_id IS NOT NULL AND (x->>'consumptionId')::integer=s.id;
     take:=least(need,s.quantity_tons-used_qty);
     IF take>0 THEN
       cost:=round(s.base_cost*(used_qty+take)/s.quantity_tons,bd)-used_cost;
       IF cost<0 THEN RETURN result; END IF;
       recoveries:=recoveries||jsonb_build_array(jsonb_build_object('consumptionId',s.id,'layerId',s.layer_id,
         'quantityTons',take::text,'baseCost',cost::text));
       total_cost:=total_cost+cost;need:=need-take;
     END IF;
     EXIT WHEN need=0;
   END LOOP;
   IF need<>0 THEN RETURN result; END IF;
 END LOOP;
 IF goods+tax<=0 THEN RETURN result||jsonb_build_object('blockingReason','RETURN_VALUE_ROUNDS_TO_ZERO'); END IF;
 FOR component_key IN SELECT unnest(ARRAY['SALES_REVENUE','TAX_PAYABLE']) LOOP
   g:=CASE WHEN component_key='SALES_REVENUE' THEN goods ELSE tax END;
   IF g=0 THEN CONTINUE; END IF;
   SELECT l.* INTO sale FROM accounting_journal_lines l JOIN accounting_posting_rules p ON p.account_id=l.account_id
     AND p.company_id=c.id AND p.key=component_key WHERE l.entry_id=i.journal_id AND l.currency=r.currency AND l.credit>0;
   IF sale.id IS NULL OR sale.party_type IS NOT NULL OR sale.cost_center_id IS NOT NULL THEN RETURN result; END IF;
   SELECT coalesce(sum((p.valuation->>CASE WHEN component_key='SALES_REVENUE' THEN 'goods' ELSE 'tax' END)::numeric),0),
     coalesce(sum((p.valuation->>CASE WHEN component_key='SALES_REVENUE' THEN 'goodsBase' ELSE 'taxBase' END)::numeric),0)
     INTO prior_native,prior_base FROM accounting_partial_return_books p
     WHERE p.kind='GOODS' AND p.journal_id IS NOT NULL AND (p.valuation->>'invoiceId')::integer=i.id;
   cost:=round(sale.base_credit*(prior_native+g)/sale.credit,bd)-prior_base;
   IF component_key='SALES_REVENUE' THEN gb:=cost; ELSE tb:=cost; END IF;
   ls:=ls||jsonb_build_array(accounting_partial_return_line(sale.account_id,r.currency,g,cost,sale.exchange_rate,true));
 END LOOP;
 gb:=coalesce(gb,0);tb:=coalesce(tb,0);
 SELECT * INTO ar FROM accounting_journal_lines WHERE entry_id=i.journal_id AND party_type='customer'
   AND party_id=r.customer_id AND currency=r.currency AND debit=r.amount;
 IF ar.id IS NULL THEN RETURN result; END IF;
 SELECT native_before,base_before INTO open_native,open_base FROM accounting_partial_receivable_book_remaining(r.id,dated);
 debt:=least(goods+tax,open_native);credit:=goods+tax-debt;
 -- Preserve the exact remaining AR carrying on a final debt reduction.
 debt_value:=CASE WHEN debt=open_native THEN open_base ELSE gb+tb END;
 credit_value:=gb+tb-debt_value;
 IF debt<0 OR debt_value<0 OR credit_value<0 OR (credit=0 AND credit_value<>0)
 THEN RETURN result||jsonb_build_object('blockingReason','RETURN_CARRYING_RECONCILIATION_REQUIRED'); END IF;
 IF debt>0 THEN ls:=ls||jsonb_build_array(accounting_partial_return_line(ar.account_id,r.currency,debt,debt_value,ar.exchange_rate,false,r.customer_id)); END IF;
 IF credit>0 THEN
   SELECT cw.* INTO w FROM accounting_wallet_links link JOIN customer_wallets cw ON cw.id=link.wallet_id
     WHERE link.company_id=c.id AND link.customer_id=r.customer_id AND link.currency=r.currency AND cw.status='active';
   SELECT account_id INTO liability FROM accounting_posting_rules WHERE company_id=c.id AND key='WALLET_LIABILITY';
   IF w.id IS NULL OR liability IS NULL OR w.balance+credit>=10000000000 OR credit<>round(credit,2)
     OR w.balance IS DISTINCT FROM (SELECT coalesce(sum(l.credit-l.debit),0) FROM accounting_journal_lines l
       JOIN accounting_journal_entries j ON j.id=l.entry_id AND j.status='posted' WHERE j.company_id=c.id
       AND l.account_id=liability AND l.party_type='customer' AND l.party_id=r.customer_id AND l.currency=r.currency)
   THEN RETURN result||jsonb_build_object('blockingReason','CREDIT_WALLET_UNAVAILABLE'); END IF;
   ls:=ls||jsonb_build_array(accounting_partial_return_line(liability,r.currency,credit,credit_value,ar.exchange_rate,false,r.customer_id));
 END IF;
 IF total_cost>0 THEN
   SELECT account_id INTO inventory FROM accounting_posting_rules WHERE company_id=c.id AND key='INVENTORY';
   SELECT account_id INTO cogs FROM accounting_posting_rules WHERE company_id=c.id AND key='COGS';
   ls:=ls||jsonb_build_array(accounting_partial_return_line(inventory,c.base_currency,total_cost,total_cost,1,true),
     accounting_partial_return_line(cogs,c.base_currency,total_cost,total_cost,1,false));
 END IF;
 RETURN result||jsonb_build_object('available',true,'blockingReason',NULL,'currency',r.currency,'baseCurrency',c.base_currency,
   'customerId',r.customer_id,'amount',(goods+tax)::text,'baseAmount',(gb+tb)::text,'debtReduction',debt::text,
   'debtBase',debt_value::text,'customerCredit',credit::text,'creditBase',credit_value::text,'baseCost',total_cost::text,
   'walletId',w.id,'walletBefore',w.balance::text,'walletAmount',credit::text,'walletAfter',(w.balance+credit)::text,
   'goods',goods::text,'tax',tax::text,'goodsBase',gb::text,'taxBase',tb::text,
   'items',items,'recoveries',recoveries,'restorations','[]'::jsonb,'lines',ls);
END $$;
CREATE FUNCTION accounting_partial_receipt_valuation(doc jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE r accounting_customer_receipts;c accounting_companies;b accounting_receipt_book_values;nd integer;bd integer;
dated date;result jsonb;ls jsonb:='[]';rest jsonb:='[]';x jsonb;allocation_row accounting_receipt_allocations;
 amount numeric:=0;rest_base numeric:=0;value numeric;prior numeric;prior_base numeric;original_base numeric;used numeric;
 wallet_amount numeric;wallet_prior numeric;wallet_base numeric:=0;w customer_wallets;liability integer;ar integer;funding integer;
 wn numeric;wb numeric;an numeric;ab numeric;fb numeric;rate numeric;last_date date;fx numeric;
BEGIN
 SELECT * INTO r FROM accounting_customer_receipts WHERE id=(doc->>'receiptId')::integer AND company_id=(doc->>'companyId')::integer;
 SELECT * INTO c FROM accounting_companies WHERE id=r.company_id;
 SELECT * INTO b FROM accounting_receipt_book_values WHERE receipt_id=r.id;
 dated:=(doc->>'entryDate')::date;wallet_amount:=(doc->>'walletAmount')::numeric;
 result:=jsonb_build_object('available',false,'blockingReason','PARTIAL_RECEIPT_EVIDENCE_REQUIRED','kind','RECEIPT',
   'companyId',c.id,'receiptId',r.id,'lines','[]'::jsonb);
 IF r.id IS NULL OR r.method NOT IN('BANK','CASH') OR r.status<>'confirmed' OR wallet_amount<0 OR wallet_amount IS NULL
   OR NOT EXISTS(SELECT 1 FROM accounting_receipt_events ev JOIN accounting_journal_entries j ON j.id=ev.journal_id
     WHERE ev.receipt_id=r.id AND ev.action='received' AND j.status='posted' AND j.source_type='PaymentReceived'
       AND j.source_id=r.source_id AND j.company_id=c.id AND j.entry_date=r.entry_date
       AND NOT EXISTS(SELECT 1 FROM accounting_journal_entries v WHERE v.reversal_of_id=j.id))
   OR dated<r.entry_date OR dated<(SELECT max((p.input->>'entryDate')::date) FROM accounting_partial_return_books p WHERE p.company_id=c.id)
   OR EXISTS(SELECT 1 FROM accounting_receipt_allocations a JOIN accounting_loading_invoices i ON i.receivable_id=a.receivable_id
     WHERE a.receipt_id=r.id AND (EXISTS(SELECT 1 FROM accounting_loading_returns ret WHERE ret.invoice_id=i.id)
       OR EXISTS(SELECT 1 FROM accounting_partial_return_books p WHERE p.kind='GOODS' AND (p.valuation->>'invoiceId')::integer=i.id)))
 THEN RETURN result; END IF;
 SELECT decimals INTO nd FROM accounting_currencies WHERE code=r.currency AND is_active;
 SELECT decimals INTO bd FROM accounting_currencies WHERE code=c.base_currency AND is_active;
 IF nd IS NULL OR bd IS NULL OR wallet_amount<>round(wallet_amount,nd) OR wallet_amount<>round(wallet_amount,2)
   OR (r.currency<>c.base_currency AND b.id IS NULL)
   OR (SELECT count(*) FROM jsonb_array_elements(doc->'allocations'))<>
     (SELECT count(DISTINCT candidate->>'receivableId') FROM jsonb_array_elements(doc->'allocations') candidate)
 THEN RETURN result; END IF;
 SELECT account_id INTO ar FROM accounting_posting_rules WHERE company_id=c.id AND key='ACCOUNTS_RECEIVABLE';
 SELECT account_id INTO funding FROM accounting_posting_rules WHERE company_id=c.id AND key=r.method;
 SELECT account_id INTO liability FROM accounting_posting_rules WHERE company_id=c.id AND key='WALLET_LIABILITY';
 FOR x IN SELECT v FROM jsonb_array_elements(doc->'allocations') v ORDER BY (v->>'receivableId')::integer LOOP
   SELECT * INTO allocation_row FROM accounting_receipt_allocations WHERE receipt_id=r.id AND receivable_id=(x->>'receivableId')::integer AND status='active';
   value:=(x->>'amount')::numeric;
   SELECT coalesce(sum((q->>'amount')::numeric),0),coalesce(sum((q->>'baseAmount')::numeric),0) INTO prior,prior_base
     FROM accounting_partial_return_books p CROSS JOIN LATERAL jsonb_array_elements(p.valuation->'restorations') q
     WHERE p.kind='RECEIPT' AND p.journal_id IS NOT NULL AND (p.valuation->>'receiptId')::integer=r.id
       AND (q->>'receivableId')::integer=allocation_row.receivable_id;
   IF allocation_row.id IS NULL OR value<=0 OR value<>round(value,nd) OR prior+value>allocation_row.amount THEN RETURN result; END IF;
   IF EXISTS(SELECT 1 FROM accounting_receivable_items ri JOIN accounting_journal_entries j ON j.reversal_of_id=ri.invoice_journal_id
     WHERE ri.id=allocation_row.receivable_id) THEN RETURN result; END IF;
   original_base:=CASE WHEN r.currency=c.base_currency THEN allocation_row.amount ELSE (
     SELECT (q->>'baseSettled')::numeric FROM jsonb_array_elements(b.allocations) q
     WHERE (q->>'receivableId')::integer=allocation_row.receivable_id AND (q->>'amount')::numeric=allocation_row.amount) END;
   IF original_base IS NULL OR original_base<0 THEN RETURN result; END IF;
   used:=round(original_base*(prior+value)/allocation_row.amount,bd)-prior_base;
   rate:=CASE WHEN r.currency=c.base_currency THEN 1 ELSE (
     SELECT min(l.exchange_rate) FROM accounting_journal_lines l JOIN accounting_receivable_items ri ON ri.invoice_journal_id=l.entry_id
     WHERE ri.id=allocation_row.receivable_id AND l.account_id=ar AND l.currency=r.currency) END;
   ls:=ls||jsonb_build_array(accounting_partial_return_line(ar,r.currency,value,used,rate,true,r.customer_id));
   rest:=rest||jsonb_build_array(jsonb_build_object('receivableId',allocation_row.receivable_id,'amount',value::text,'baseAmount',used::text));
   amount:=amount+value;rest_base:=rest_base+used;
 END LOOP;
 SELECT coalesce(sum((p.valuation->>'walletAmount')::numeric),0) INTO wallet_prior
   FROM accounting_partial_return_books p WHERE p.kind='RECEIPT' AND p.journal_id IS NOT NULL AND (p.valuation->>'receiptId')::integer=r.id;
 IF wallet_amount+wallet_prior>r.wallet_credit THEN RETURN result; END IF;
 IF wallet_amount>0 THEN
   SELECT cw.* INTO w FROM accounting_wallet_links link JOIN customer_wallets cw ON cw.id=link.wallet_id
     WHERE link.company_id=c.id AND link.customer_id=r.customer_id AND link.currency=r.currency AND cw.status='active';
   IF w.id IS NULL THEN RETURN result; END IF;
   SELECT coalesce(sum(l.credit-l.debit),0),coalesce(sum(l.base_credit-l.base_debit),0),max(j.entry_date)
     INTO wn,wb,last_date FROM accounting_journal_lines l JOIN accounting_journal_entries j ON j.id=l.entry_id AND j.status='posted'
     WHERE j.company_id=c.id AND l.account_id=liability AND l.currency=r.currency AND l.party_type='customer' AND l.party_id=r.customer_id;
   IF wn IS DISTINCT FROM w.balance OR wb<0 OR wallet_amount>wn OR dated<last_date OR
     wallet_amount>wn-coalesce((SELECT sum(h.amount-h.consumed_amount) FROM accounting_wallet_holds h WHERE h.wallet_id=w.id AND h.status='active'),0)
       -greatest(w.reserved_balance,coalesce((SELECT sum(nt.amount) FROM wallet_transactions nt WHERE nt.wallet_id=w.id AND nt.status='reserved'),0))
       -accounting_pending_cheque_funds(w.id)
   THEN RETURN result||jsonb_build_object('blockingReason','RECEIPT_CREDIT_UNAVAILABLE_OR_HELD'); END IF;
   wallet_base:=CASE WHEN wallet_amount=wn THEN wb ELSE round(wb*wallet_amount/wn,bd) END;
   SELECT l.exchange_rate INTO rate FROM accounting_journal_lines l JOIN accounting_journal_entries j ON j.id=l.entry_id
     WHERE j.company_id=c.id AND j.status='posted' AND l.account_id=liability AND l.currency=r.currency
       AND l.party_type='customer' AND l.party_id=r.customer_id AND l.credit>0 ORDER BY j.entry_date DESC,j.id DESC,l.id DESC LIMIT 1;
   ls:=ls||jsonb_build_array(accounting_partial_return_line(liability,r.currency,wallet_amount,wallet_base,rate,true,r.customer_id));
 END IF;
 amount:=amount+wallet_amount;
 IF amount<=0 THEN RETURN result; END IF;
 SELECT coalesce(sum(l.debit-l.credit),0),coalesce(sum(l.base_debit-l.base_credit),0),max(j.entry_date) INTO an,ab,last_date
   FROM accounting_journal_lines l JOIN accounting_journal_entries j ON j.id=l.entry_id AND j.status='posted'
   WHERE j.company_id=c.id AND l.account_id=funding AND l.currency=r.currency;
 IF funding IS NULL OR an<amount OR ab<0 OR dated<last_date OR dated<(SELECT max(j.entry_date)
   FROM accounting_journal_entries j JOIN accounting_journal_lines l ON l.entry_id=j.id WHERE j.company_id=c.id
     AND j.status='posted' AND l.party_type='customer' AND l.party_id=r.customer_id AND l.currency=r.currency)
 THEN RETURN result||jsonb_build_object('blockingReason','RECEIPT_FUNDING_UNAVAILABLE_OR_BACKDATED'); END IF;
 fb:=CASE WHEN amount=an THEN ab ELSE round(ab*amount/an,bd) END;
 SELECT l.exchange_rate INTO rate FROM accounting_journal_lines l JOIN accounting_journal_entries j ON j.id=l.entry_id
   WHERE j.company_id=c.id AND j.status='posted' AND l.account_id=funding AND l.currency=r.currency AND l.debit>0
   ORDER BY j.entry_date DESC,j.id DESC,l.id DESC LIMIT 1;
 ls:=ls||jsonb_build_array(accounting_partial_return_line(funding,r.currency,amount,fb,rate,false));
 fx:=rest_base+wallet_base-fb;
 IF fx<>0 THEN
   SELECT account_id INTO funding FROM accounting_posting_rules WHERE company_id=c.id AND key=CASE WHEN fx>0 THEN 'FX_GAIN' ELSE 'FX_LOSS' END;
   IF funding IS NULL THEN RETURN result; END IF;
   ls:=ls||jsonb_build_array(accounting_partial_return_line(funding,c.base_currency,abs(fx),abs(fx),1,fx<0));
 END IF;
 RETURN result||jsonb_build_object('available',true,'blockingReason',NULL,'currency',r.currency,'baseCurrency',c.base_currency,
   'customerId',r.customer_id,'amount',amount::text,'baseAmount',fb::text,'debtReduction','0','debtBase','0',
   'customerCredit','0','creditBase','0','baseCost','0','walletId',w.id,'walletBefore',w.balance::text,
   'walletAmount',wallet_amount::text,'walletAfter',(w.balance-wallet_amount)::text,'recoveries','[]'::jsonb,
   'restorations',rest,'lines',ls);
END $$;
CREATE FUNCTION accounting_partial_return_valuation(doc jsonb) RETURNS jsonb LANGUAGE sql AS $$
 SELECT CASE WHEN doc->>'kind'='GOODS' THEN accounting_partial_goods_valuation(doc)
   ELSE accounting_partial_receipt_valuation(doc) END
$$;
CREATE FUNCTION accounting_partial_return_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Partial return evidence must be retained'; END IF;
 IF TG_OP='UPDATE' THEN
   IF OLD.journal_id IS NOT NULL OR NEW.journal_id IS NULL OR to_jsonb(OLD)-'journal_id' IS DISTINCT FROM to_jsonb(NEW)-'journal_id'
   THEN RAISE EXCEPTION 'Partial return evidence is immutable except atomic completion'; END IF;
   RETURN NEW;
 END IF;
 expected:=accounting_partial_return_valuation(NEW.input);
 IF NEW.journal_id IS NOT NULL OR NEW.valuation IS DISTINCT FROM expected OR expected->'available' IS DISTINCT FROM 'true'::jsonb
   OR NOT coalesce(accounting_pipeline_actor_allowed(NEW.actor_id,NEW.actor_type),false)
   OR NOT EXISTS(SELECT 1 FROM accounting_partial_return_cutovers g JOIN accounting_companies c ON c.id=g.company_id AND c.is_active
     JOIN accounting_wallet_cutovers w ON w.company_id=c.id AND w.pipeline_ready
     JOIN accounting_receipt_cutovers r ON r.company_id=c.id AND r.processing_ready
     JOIN accounting_fiscal_years y ON y.company_id=c.id AND y.status='open'
     WHERE g.company_id=NEW.company_id AND g.processing_ready AND (NEW.input->>'entryDate')::date>=g.starts_on
       AND (NEW.input->>'entryDate')::date BETWEEN y.starts_on AND y.ends_on
       AND (NEW.input->>'entryDate')::date<=(now() AT TIME ZONE c.timezone)::date)
 THEN RAISE EXCEPTION 'Reviewed original partial-return evidence, active manager and open cutover required'; END IF;
 IF NEW.kind='RECEIPT' AND EXISTS(SELECT 1 FROM accounting_wallet_refund_books p WHERE p.company_id=NEW.company_id
   AND p.input->>'payoutReference'=NEW.input->>'payoutReference')
 THEN RAISE EXCEPTION 'Actual payout reference already recorded'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_partial_return_guard BEFORE INSERT OR UPDATE OR DELETE ON accounting_partial_return_books
 FOR EACH ROW EXECUTE FUNCTION accounting_partial_return_guard();
CREATE FUNCTION accounting_partial_return_gate_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retain partial return cutovers'; END IF;
 IF NEW.processing_ready AND (coalesce(length(btrim(NEW.evidence_reference)),0) NOT BETWEEN 5 AND 500
   OR NOT coalesce(accounting_pipeline_actor_allowed(NEW.reviewed_by,'admin'),false)
   OR NOT EXISTS(SELECT 1 FROM accounting_wallet_cutovers w JOIN accounting_receipt_cutovers r ON r.company_id=w.company_id
     AND r.processing_ready JOIN accounting_companies c ON c.id=w.company_id AND c.is_active
     WHERE w.company_id=NEW.company_id AND w.pipeline_ready AND NEW.starts_on<=(now() AT TIME ZONE c.timezone)::date))
 THEN RAISE EXCEPTION 'Actual reconciled opening and reviewed cutover required'; END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM accounting_partial_return_books WHERE company_id=OLD.company_id)
   AND (NEW.company_id<>OLD.company_id OR NEW.starts_on IS DISTINCT FROM OLD.starts_on)
 THEN RAISE EXCEPTION 'Used partial return boundary is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_partial_return_gate_guard BEFORE INSERT OR UPDATE OR DELETE ON accounting_partial_return_cutovers
 FOR EACH ROW EXECUTE FUNCTION accounting_partial_return_gate_guard();
DO $$ DECLARE d text;
BEGIN
 d:=pg_get_functiondef('accounting_historical_line(integer,text,text,date,integer,text,numeric,numeric,numeric,numeric,numeric,text,integer,integer,text)'::regprocedure);
 EXECUTE replace(d,'FUNCTION public.accounting_historical_line(', 'FUNCTION public.accounting_before_partial_return_historical_line(');
END $$;
CREATE OR REPLACE FUNCTION accounting_historical_line(
 cid integer,stype text,sid text,dated date,aid integer,cur text,dr numeric,cr numeric,
 bdr numeric,bcr numeric,fx numeric,ptype text,pid integer,cc integer,basis text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT accounting_before_partial_return_historical_line(cid,stype,sid,dated,aid,cur,dr,cr,bdr,bcr,fx,ptype,pid,cc,basis)
 OR (stype='PartialReturn' AND basis='historical_carrying' AND EXISTS(
 SELECT 1 FROM accounting_partial_return_books p CROSS JOIN LATERAL jsonb_array_elements(p.valuation->'lines') x
 WHERE p.company_id=cid AND p.source_id=sid AND (p.input->>'entryDate')::date=dated
   AND p.valuation->'available'='true'::jsonb AND (x->>'accountId')::integer=aid AND x->>'currency'=cur
   AND (x->>'debit')::numeric=dr AND (x->>'credit')::numeric=cr AND (x->>'baseDebit')::numeric=bdr
   AND (x->>'baseCredit')::numeric=bcr AND (x->>'exchangeRate')::numeric=fx
   AND x->>'partyType' IS NOT DISTINCT FROM ptype AND (x->>'partyId')::integer IS NOT DISTINCT FROM pid
   AND (x->>'costCenterId')::integer IS NOT DISTINCT FROM cc))
$$;
CREATE FUNCTION accounting_partial_return_completion_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p accounting_partial_return_books;j accounting_journal_entries;w customer_wallets;v jsonb;
BEGIN
 IF TG_TABLE_NAME='accounting_journal_entries' THEN
   IF NEW.source_type<>'PartialReturn' THEN RETURN NULL; END IF;
   SELECT * INTO p FROM accounting_partial_return_books WHERE journal_id=NEW.id;
 ELSE SELECT * INTO p FROM accounting_partial_return_books WHERE id=NEW.id; END IF;
 SELECT * INTO j FROM accounting_journal_entries WHERE id=p.journal_id;
 IF p.id IS NULL OR j.id IS NULL OR j.company_id<>p.company_id OR j.source_type<>'PartialReturn' OR j.source_id<>p.source_id
   OR j.status<>'posted' OR j.reversal_of_id IS NOT NULL OR j.created_by<>p.actor_id OR j.actor_type<>p.actor_type
   OR j.entry_date<>(p.input->>'entryDate')::date
   OR (SELECT count(*) FROM accounting_journal_lines WHERE entry_id=j.id)<>jsonb_array_length(p.valuation->'lines')
   OR EXISTS(SELECT (x->>'accountId')::integer,x->>'currency',(x->>'debit')::numeric,(x->>'credit')::numeric,
      (x->>'baseDebit')::numeric,(x->>'baseCredit')::numeric,(x->>'exchangeRate')::numeric,x->>'partyType',
      (x->>'partyId')::integer,(x->>'costCenterId')::integer FROM jsonb_array_elements(p.valuation->'lines') x
     EXCEPT ALL SELECT account_id,currency,debit,credit,base_debit,base_credit,exchange_rate,party_type,party_id,cost_center_id
       FROM accounting_journal_lines WHERE entry_id=j.id)
 THEN RAISE EXCEPTION 'Partial return and exact original-value journal must commit together'; END IF;
 v:=p.valuation;
 IF (v->>'walletAmount')::numeric>0 THEN
   SELECT * INTO w FROM customer_wallets WHERE id=(v->>'walletId')::integer;
   IF NOT EXISTS(SELECT 1 FROM wallet_transactions n WHERE n.wallet_id=w.id AND n.customer_id=w.customer_id
     AND n.currency=w.currency AND n.reference_type='accounting_journal' AND n.reference_id=j.id AND n.status='completed'
     AND n.transaction_type=CASE WHEN p.kind='GOODS' THEN 'credit' ELSE 'debit' END
     AND n.amount=(v->>'walletAmount')::numeric AND n.balance_before=(v->>'walletBefore')::numeric
     AND n.balance_after=(v->>'walletAfter')::numeric)
   THEN RAISE EXCEPTION 'Partial return requires exact native wallet evidence'; END IF;
 END IF;
 IF p.kind='GOODS' AND NOT accounting_stock_ledger_reconciled(p.company_id)
 THEN RAISE EXCEPTION 'Partial returned stock must reconcile to posted carrying value'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER accounting_partial_return_completion_guard AFTER INSERT OR UPDATE ON accounting_partial_return_books
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_partial_return_completion_guard();
CREATE CONSTRAINT TRIGGER accounting_partial_return_journal_guard AFTER INSERT OR UPDATE ON accounting_journal_entries
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_partial_return_completion_guard();
CREATE FUNCTION accounting_partial_return_reversal_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM accounting_partial_return_books WHERE journal_id=NEW.reversal_of_id)
 THEN RAISE EXCEPTION 'Partial returns cannot be independently reversed'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_partial_return_reversal_guard BEFORE INSERT OR UPDATE ON accounting_journal_entries
 FOR EACH ROW EXECUTE FUNCTION accounting_partial_return_reversal_guard();
DO $$ DECLARE d text;needle text;
BEGIN
 d:=pg_get_functiondef('accounting_wallet_native_guard()'::regprocedure);
 needle:='e.source_type IN (''WalletTopUp'',''PaymentReceived'',''LoadingReturnCredit'')';
 IF strpos(d,needle)=0 THEN RAISE EXCEPTION 'Unexpected native credit source guard'; END IF;
 d:=replace(d,needle,'e.source_type IN (''WalletTopUp'',''PaymentReceived'',''LoadingReturnCredit'',''PartialReturn'')');
 needle:='e.source_type = ''WalletRefund''';
 -- Installed native guards evolved through settlement/receipt migrations.
 d:=replace(d,'e.source_type IN (''WalletRefund'',''ChequeBounced'',''ReceiptReturned'')',
   'e.source_type IN (''WalletRefund'',''ChequeBounced'',''ReceiptReturned'',''PartialReturn'')');
 d:=replace(d,'e.source_type IN (''WalletRefund'',''ChequeBounced'',''ReceiptReturned'',''WalletSettlement'')',
   'e.source_type IN (''WalletRefund'',''ChequeBounced'',''ReceiptReturned'',''WalletSettlement'',''PartialReturn'')');
 d:=replace(d,'e.source_type IN (''WalletRefund'',''ChequeBounced'')',
   'e.source_type IN (''WalletRefund'',''ChequeBounced'',''PartialReturn'')');
 d:=replace(d,'e.source_type=''WalletRefund''','e.source_type IN (''WalletRefund'',''PartialReturn'')');
 d:=replace(d,needle,'e.source_type IN (''WalletRefund'',''PartialReturn'')');
 EXECUTE d;
 d:=pg_get_functiondef('accounting_assert_balanced()'::regprocedure);
 needle:='debit_sum<=0 AND NOT EXISTS';
 IF strpos(d,needle)=0 THEN RAISE EXCEPTION 'Unexpected zero-base balance guard'; END IF;
 EXECUTE replace(d,needle,'debit_sum<=0 AND NOT EXISTS(SELECT 1 FROM accounting_partial_return_books p
   JOIN accounting_journal_entries j ON j.id=target_id AND j.source_type=''PartialReturn'' AND j.source_id=p.source_id
    AND j.company_id=p.company_id WHERE p.valuation->''available''=''true''::jsonb) AND NOT EXISTS');
END $$;
