import test from "node:test";
import assert from "node:assert/strict";
import {randomInt,randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {iraqChart} from "./iraq-chart";
import {postJournalEntry,reverseJournalEntry} from "./postJournalEntry";
import {linkWallet,recordWalletMovement} from "./wallet";
import {receiptInputSchema,recordCustomerReceipt,registerInvoiceReceivable,transitionCheque} from "./receipts";
import {settleWalletReceivable,walletSettlementSchema} from "./wallet-settlement";
test("receipts use exact money, unique allocations and cheque identity",()=>{
  const d={companyId:1,customerId:1,currency:"IQD",sourceId:"test-1",entryDate:"2026-06-01",amount:"100",
    method:"BANK",reason:"Actual receipt",evidenceReference:"statement-1",allocations:[]};
  assert.equal(receiptInputSchema.safeParse(d).success,true);
  assert.equal(receiptInputSchema.safeParse({...d,amount:100}).success,false);
  assert.equal(receiptInputSchema.safeParse({...d,method:"CHEQUE"}).success,false);
  assert.equal(receiptInputSchema.safeParse({...d,allocations:[{receivableId:1,amount:"1"},{receivableId:1,amount:"2"}]}).success,false);
  const settlement={companyId:1,walletId:1,receivableId:1,sourceId:"settle-1",entryDate:"2026-06-01",amount:"10",reason:"Invoice settlement"};
  assert.equal(walletSettlementSchema.safeParse(settlement).success,true);
  assert.equal(walletSettlementSchema.safeParse({...settlement,amount:10}).success,false);
  assert.equal(walletSettlementSchema.safeParse({...settlement,baseAmount:"20"}).success,false);
});
test("receipt/cheque integration remains rollback-only",{skip:process.env.ACCOUNTING_DB_TEST!=="1"},async context=>{
  const t={test:(name:string,fn:()=>Promise<void>)=>context.test(name,{
    skip:process.env.ACCOUNTING_FX_ONLY==="1"&&!name.startsWith("foreign wallet"),
  },fn)};
  const end=new Error("ROLLBACK_RECEIPTS");let done=false;
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const company=(await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
      values('Receipt test','IQ','Asia/Baghdad','IQD') returning id`)).rows[0].id as number;
    await tx.execute(sql`insert into accounting_fiscal_years(company_id,name,starts_on,ends_on) values(${company},'2026','2026-01-01','2026-12-31')`);
    const ids:Record<string,number>={};
    for(const key of ["BANK","CASH","CHEQUES_ON_HAND","CHEQUE_CLEARING","ACCOUNTS_RECEIVABLE","WALLET_LIABILITY","SALES_REVENUE"]){
      const c=iraqChart.find(a=>a.key===key)!;
      ids[key]=(await tx.execute(sql`insert into accounting_accounts(company_id,code,name_ar,name_en,type)
        values(${company},${c.code},${c.nameAr},${c.nameEn},${c.type}) returning id`)).rows[0].id as number;
      await tx.execute(sql`insert into accounting_posting_rules(company_id,key,account_id) values(${company},${key},${ids[key]})`);
    }
    await tx.execute(sql`insert into accounting_wallet_cutovers(company_id,pipeline_ready,enabled_at,opening_reference,reviewed_by)
      values(${company},true,'2026-01-01','Rollback zero opening',1)`);
    await tx.execute(sql`insert into accounting_receipt_cutovers(company_id) values(${company})`);
    const customer=1700000000+randomInt(1,1000000);
    await tx.execute(sql`insert into crm_customers(id,email,first_name,last_name)
      values(${customer},${randomUUID()+"@example.invalid"},'Receipt','Fixture')`);
    await tx.execute(sql`insert into customer_wallets(id,customer_id,balance,currency) values(${customer},${customer},0,'IQD')`);
    const actor={actorId:1,actorType:"admin" as const,canManage:true};
    await linkWallet(company,customer,actor,tx);
    const input={companyId:company,customerId:customer,currency:"IQD",sourceId:"bank-1",entryDate:"2026-06-02",
      amount:"100",method:"BANK" as const,reason:"Observed bank receipt",evidenceReference:"staff statement reference"};
    const rejects=async(fn:()=>Promise<unknown>)=>{
      await tx.execute(sql`savepoint receipt_fail`);let error:unknown;
      try{await fn();}catch(e){error=e;}
      await tx.execute(sql`rollback to savepoint receipt_fail`);await tx.execute(sql`release savepoint receipt_fail`);assert.ok(error);
      return error;
    };
    const balance=async()=>String((await tx.execute(sql`select balance::text as n from customer_wallets where id=${customer}`)).rows[0].n);
    const invoice=async(sourceId:string,amount:string,orderId?:number,sourceType="SalesInvoice")=>{
      const {entry}=await postJournalEntry({companyId:company,entryDate:"2026-06-01",sourceType,sourceId,
        description:"Rollback-only invoice",lines:[
          {accountId:ids.ACCOUNTS_RECEIVABLE,currency:"IQD",debit:amount,credit:"0",partyType:"customer",partyId:customer},
          {accountId:ids.SALES_REVENUE,currency:"IQD",debit:"0",credit:amount},
        ]},actor,tx);
      return registerInvoiceReceivable({companyId:company,customerId:customer,currency:"IQD",
        invoiceJournalId:entry.id,invoiceReference:sourceId,dueOn:"2026-07-01",orderId},actor,tx);
    };
    await t.test("receipt gate blocks all financial mutation",async()=>{
      await rejects(()=>recordCustomerReceipt(input,actor,tx));assert.equal(await balance(),"0.00");
    });
    await tx.execute(sql`update accounting_receipt_cutovers set processing_ready=true where company_id=${company}`);
    let ar1:number,ar2:number;
    await t.test("invoice must post first; AR amount cannot be invented",async()=>{
      await rejects(()=>registerInvoiceReceivable({companyId:company,customerId:customer,currency:"IQD",
        invoiceJournalId:1,invoiceReference:"unknown",dueOn:"2026-07-01"},actor,tx));
      ar1=(await invoice("invoice-1","80")).id as number;ar2=(await invoice("invoice-2","20")).id as number;
    });
    await t.test("bank receipt partially settles several invoices and credits only unallocated funds",async()=>{
      const d={...input,allocations:[{receivableId:ar1,amount:"50"},{receivableId:ar2,amount:"20"}]};
      const r=await recordCustomerReceipt(d,actor,tx);assert.ok(r.journalId);assert.equal(await balance(),"30.00");
      assert.equal((await recordCustomerReceipt({...d,amount:"100.00"},actor,tx)).duplicate,true);
      await rejects(()=>recordCustomerReceipt({...d,amount:"101"},actor,tx));
      assert.equal(await balance(),"30.00");
    });
    await t.test("invalid allocation, over-settlement, viewers and unsupported FX fail atomically",async()=>{
      await rejects(()=>recordCustomerReceipt({...input,sourceId:"over",allocations:[{receivableId:ar1,amount:"31"}]},actor,tx));
      await rejects(()=>recordCustomerReceipt({...input,sourceId:"bad-item",allocations:[{receivableId:2147483640,amount:"1"}]},actor,tx));
      await rejects(()=>recordCustomerReceipt({...input,sourceId:"viewer"},{...actor,canManage:false},tx));
      await rejects(()=>recordCustomerReceipt({...input,sourceId:"fx",currency:"USD"},actor,tx));
      assert.equal(await balance(),"30.00");
    });
    await t.test("cash receipt can finish a partially open invoice",async()=>{
      await recordCustomerReceipt({...input,sourceId:"cash-1",amount:"30",method:"CASH",allocations:[{receivableId:ar1,amount:"30"}]},actor,tx);
      assert.equal((await tx.execute(sql`select settled_amount::text as n from accounting_receivable_items where id=${ar1}`)).rows[0].n,"80.00000000");
    });
    let cheque:number,chequeAr:number;
    const event={sourceId:"deposit-1",entryDate:"2026-06-03",evidenceReference:"bank stamped deposit",reason:"Cheque deposited"};
    await t.test("received cheque funds cannot be refunded before clearing",async()=>{
      chequeAr=(await invoice("invoice-cheque","80")).id as number;
      const r=await recordCustomerReceipt({...input,sourceId:"cheque-1",method:"CHEQUE",chequeNumber:"fixture-check-1",
        allocations:[{receivableId:chequeAr,amount:"80"}]},actor,tx);
      cheque=r.receipt.id as number;assert.equal(await balance(),"50.00");
      await rejects(()=>recordWalletMovement("refund",{companyId:company,walletId:customer,sourceId:"blocked-cheque-refund",
        entryDate:"2026-06-02",amount:"31",channel:"BANK",evidenceReference:"refund proof",reason:"Refund requested"},actor,tx));
      const error=await rejects(()=>tx.execute(sql`insert into accounting_wallet_holds(company_id,wallet_id,order_id,amount,currency,created_by)
        values(${company},${customer},2147483600,40,'IQD',1)`));
      assert.match(String((error as any).cause?.message||(error as Error).message),/Uncleared cheque funds/);
    });
    await t.test("deposit and clearance post separate accounts; transitions and retries are guarded",async()=>{
      await rejects(()=>transitionCheque(cheque,"cleared",event,actor,tx));
      await transitionCheque(cheque,"deposited",event,actor,tx);
      assert.equal((await transitionCheque(cheque,"deposited",event,actor,tx)).duplicate,true);
      await transitionCheque(cheque,"cleared",{...event,sourceId:"clear-1",entryDate:"2026-06-04",reason:"Bank confirmed clearance"},actor,tx);
      assert.equal((await tx.execute(sql`select accounting_pending_cheque_funds(${customer})::text as n`)).rows[0].n,"0");
    });
    await t.test("bank return after clearance reopens allocated invoices without negative wallets",async()=>{
      await transitionCheque(cheque,"bounced",{...event,sourceId:"bounce-1",entryDate:"2026-06-05",reason:"Bank returned cheque"},actor,tx);
      assert.equal(await balance(),"30.00");
      assert.equal((await tx.execute(sql`select settled_amount::text as n from accounting_receivable_items where id=${chequeAr}`)).rows[0].n,"0.00000000");
    });
    await t.test("uncleared cheque bounce removes blocked excess and restores invoice balances",async()=>{
      const ar=(await invoice("invoice-bounce","10")).id as number;
      const r=await recordCustomerReceipt({...input,sourceId:"cheque-2",amount:"20",method:"CHEQUE",chequeNumber:"fixture-check-2",
        allocations:[{receivableId:ar,amount:"10"}]},actor,tx);
      await transitionCheque(r.receipt.id as number,"bounced",{...event,sourceId:"bounce-2",reason:"Cheque rejected before deposit"},actor,tx);
      assert.equal(await balance(),"30.00");
    });
    await t.test("spent cleared-cheque excess becomes an explicit receivable, not negative wallet money",async()=>{
      await tx.execute(sql`savepoint spent_cheque_case`);
      try{
        const r=await recordCustomerReceipt({...input,sourceId:"cheque-spent",amount:"20",method:"CHEQUE",
          chequeNumber:"fixture-spent"},actor,tx);
        const id=r.receipt.id as number;
        await transitionCheque(id,"deposited",{...event,sourceId:"deposit-spent"},actor,tx);
        await transitionCheque(id,"cleared",{...event,sourceId:"clear-spent",entryDate:"2026-06-04"},actor,tx);
        await recordWalletMovement("refund",{companyId:company,walletId:customer,sourceId:"spent-cheque-funds",
          entryDate:"2026-06-04",amount:"50",channel:"BANK",evidenceReference:"Actual payout reference",
          reason:"Customer funds paid out"},actor,tx);
        assert.equal(await balance(),"0.00");
        const returned=await transitionCheque(id,"bounced",{...event,sourceId:"return-spent",
          entryDate:"2026-06-05",reason:"Bank returned cleared cheque"},actor,tx);
        assert.equal(returned.recoveredWalletAmount,"0");assert.equal(returned.newReceivable,"20");
        assert.equal(await balance(),"0.00");
        const totals=(await tx.execute(sql`select
          (select sum(l.debit-l.credit) from accounting_journal_lines l join accounting_journal_entries e on e.id=l.entry_id
            where e.company_id=${company} and l.account_id=${ids.ACCOUNTS_RECEIVABLE} and e.status='posted')::text as ledger,
          (select sum(amount-settled_amount) from accounting_receivable_items where company_id=${company})::text as items`)).rows[0];
        assert.equal(totals.ledger,totals.items);
      }finally{await tx.execute(sql`rollback to savepoint spent_cheque_case`);await tx.execute(sql`release savepoint spent_cheque_case`);}
    });
    await t.test("direct native writes preserve legacy reserves and directional source proof",async()=>{
      const unsafe=async(sourceType:string,setReserve:boolean)=>{
        if(setReserve)await tx.execute(sql`update customer_wallets set reserved_balance=25 where id=${customer}`);
        const {entry}=await postJournalEntry({companyId:company,entryDate:"2026-06-05",sourceType,sourceId:`invalid-${sourceType}`,
          description:"Rollback native guard test",lines:[
            {accountId:ids.WALLET_LIABILITY,currency:"IQD",debit:"10",credit:"0",partyType:"customer",partyId:customer},
            {accountId:ids.BANK,currency:"IQD",debit:"0",credit:"10"}]},actor,tx);
        await tx.execute(sql`insert into wallet_transactions(wallet_id,customer_id,transaction_type,amount,currency,
          balance_before,balance_after,description,reference_type,reference_id,status,processed_by)
          values(${customer},${customer},'debit',10,'IQD',30,20,'Guard fixture','accounting_journal',${entry.id},'completed',1)`);
      };
      await rejects(()=>unsafe("WalletRefund",true));
      await rejects(()=>unsafe("WalletTopUp",false));
      assert.equal(await balance(),"30.00");
    });
    await t.test("wallet liability, receivables subledger and trial balance agree",async()=>{
      const result=(await tx.execute(sql`select
        (select sum(l.credit-l.debit) from accounting_journal_lines l join accounting_journal_entries e on e.id=l.entry_id
          where e.company_id=${company} and l.account_id=${ids.WALLET_LIABILITY} and e.status='posted')::text as wallet,
        (select sum(l.debit-l.credit) from accounting_journal_lines l join accounting_journal_entries e on e.id=l.entry_id
          where e.company_id=${company} and l.account_id=${ids.ACCOUNTS_RECEIVABLE} and e.status='posted')::text as ar,
        (select sum(amount-settled_amount) from accounting_receivable_items where company_id=${company})::text as ar_items,
        (select sum(base_debit-base_credit) from accounting_journal_lines l join accounting_journal_entries e on e.id=l.entry_id
          where e.company_id=${company} and e.status='posted')::text as trial`)).rows[0];
      assert.equal(result.wallet,"30.00000000");assert.equal(result.ar,result.ar_items);assert.equal(result.trial,"0.00000000");
    });
    await t.test("wallet-to-AR and loading holds settle atomically; retries, partial loads and surplus are safe",async()=>{
      await recordWalletMovement("topup",{companyId:company,walletId:customer,sourceId:"settlement-funding",entryDate:"2026-06-01",
        amount:"100",channel:"BANK",evidenceReference:"Rollback bank evidence",reason:"Settlement test funding"},actor,tx);
      assert.equal(await balance(),"130.00");
      const free=await invoice("free-settlement","50");
      const request={companyId:company,walletId:customer,receivableId:free.id as number,sourceId:"free-settle-1",
        entryDate:"2026-06-02",amount:"20",reason:"Pay actual posted invoice"};
      const foreignWallet=customer+2;
      await tx.execute(sql`insert into crm_customers(id,email,first_name,last_name)
        values(${foreignWallet},${randomUUID()+"@example.invalid"},'Foreign','Rollback fixture')`);
      await tx.execute(sql`insert into customer_wallets(id,customer_id,balance,currency) values(${foreignWallet},${foreignWallet},0,'USD')`);
      await tx.execute(sql`insert into accounting_wallet_links(wallet_id,company_id,customer_id,currency)
        values(${foreignWallet},${company},${foreignWallet},'USD')`);
      assert.equal((await rejects(()=>settleWalletReceivable({...request,walletId:foreignWallet,sourceId:"wrong-currency-customer"},actor,tx)) as {code:string}).code,"RECEIVABLE_MISMATCH");
      assert.equal((await rejects(()=>recordWalletMovement("refund",{companyId:company,walletId:foreignWallet,sourceId:"blocked-fx-refund",
        entryDate:"2026-06-02",amount:"1",channel:"BANK",evidenceReference:"Unsupported FX evidence",reason:"Unsupported FX refund"},actor,tx)) as {code:string}).code,"FX_SETTLEMENT_NOT_READY");
      await rejects(()=>settleWalletReceivable(request,{...actor,canManage:false},tx));
      const paid=await settleWalletReceivable(request,actor,tx);
      assert.equal(paid.duplicate,false);assert.equal(await balance(),"110.00");
      await rejects(async()=>{
        await tx.execute(sql`set constraints accounting_wallet_settlement_journal_evidence deferred`);
        await postJournalEntry({companyId:company,entryDate:"2026-06-02",sourceType:"WalletSettlement",
          sourceId:"forged-settlement",description:"Reject missing native and receivable proof",lines:[
            {accountId:ids.WALLET_LIABILITY,currency:"IQD",debit:"1",partyType:"customer",partyId:customer},
            {accountId:ids.ACCOUNTS_RECEIVABLE,currency:"IQD",credit:"1",partyType:"customer",partyId:customer},
          ]},actor,tx);
        await tx.execute(sql`set constraints accounting_wallet_settlement_journal_evidence immediate`);
      });
      assert.equal((await settleWalletReceivable({...request,amount:"20.00"},actor,tx)).duplicate,true);
      assert.equal(await balance(),"110.00");
      await rejects(()=>settleWalletReceivable({...request,amount:"21"},actor,tx));
      await rejects(()=>settleWalletReceivable({...request,sourceId:"excess",amount:"31"},actor,tx));
      await rejects(()=>reverseJournalEntry(paid.journalId as number,"2026-06-03","Invalid uncoordinated reversal",actor,tx));
      const order=customer+1;
      await tx.execute(sql`insert into accounting_wallet_orders(order_id,wallet_id,company_id,snapshot)
        values(${order},${customer},${company},${JSON.stringify({orderTotal:"80",currency:"IQD",crmCustomerId:customer})}::jsonb)`);
      const hold=(await tx.execute(sql`insert into accounting_wallet_holds(company_id,wallet_id,order_id,amount,currency,created_by)
        values(${company},${customer},${order},80,'IQD',1) returning id`)).rows[0].id as number;
      const open=await invoice("blocked-funds","100");
      await rejects(()=>settleWalletReceivable({...request,receivableId:open.id as number,sourceId:"other-hold-spend",amount:"40"},actor,tx));
      await rejects(()=>settleWalletReceivable({...request,holdId:hold,sourceId:"non-loading"},actor,tx));
      await rejects(()=>tx.execute(sql`update accounting_wallet_holds set consumed_amount=1 where id=${hold}`));
      const loadingInvoice=async(ticket:string,amount:string)=>{
        const identity=`${order}:${ticket}`;
        const input={eventType:"LoadingCompleted",orderId:order,sourceId:ticket,eventDate:"2026-06-01",
          actualWeightTons:"1",weighbridgeReference:`fixture-${ticket}`,lines:[{orderItemId:1,actualWeightTons:"1"}]};
        await tx.execute(sql`insert into accounting_operational_facts(company_id,order_id,event_type,source_id,payload,actor_id,actor_type)
          values(${company},${order},'LoadingCompleted',${identity},${JSON.stringify({input,captureOnly:true,postingEligible:false})}::jsonb,1,'admin')`);
        return invoice(identity,amount,order,"LoadingCompleted");
      };
      const load=await loadingInvoice("truck-1","65");
      const loadRequest={...request,receivableId:load.id as number,holdId:hold,sourceId:"load-settle-1"};
      const partial=await settleWalletReceivable(loadRequest,actor,tx);
      assert.equal("remainingHeld" in partial&&partial.remainingHeld,"60");
      assert.equal(await balance(),"90.00");
      const h=()=>tx.execute(sql`select amount::text,consumed_amount::text,status from accounting_wallet_holds where id=${hold}`);
      assert.equal((await h()).rows[0].consumed_amount,"20.00000000");
      await tx.execute(sql`savepoint release_unused_fixture`);
      await tx.execute(sql`update accounting_wallet_holds set status='released',released_at=now(),
        release_reason='Explicit unused loading quote release' where id=${hold}`);
      assert.equal(await balance(),"90.00");
      const released=(await tx.execute(sql`select payload->>'amount' as amount from accounting_outbox
        where company_id=${company} and source_id=${`accounting-hold:${hold}:WalletHoldReleased`}`)).rows[0];
      assert.equal(released.amount,"60.00000000");
      await tx.execute(sql`rollback to savepoint release_unused_fixture`);
      await tx.execute(sql`release savepoint release_unused_fixture`);
      await settleWalletReceivable({...loadRequest,amount:"45",sourceId:"load-settle-2"},actor,tx);
      assert.equal(await balance(),"45.00");assert.equal((await h()).rows[0].status,"active");
      const second=await loadingInvoice("truck-2","20");
      const finished=await settleWalletReceivable({...loadRequest,receivableId:second.id as number,amount:"20",sourceId:"load-settle-3"},actor,tx);
      assert.equal("holdConsumed" in finished&&finished.holdConsumed,"15");
      assert.equal((await h()).rows[0].status,"consumed");assert.equal(await balance(),"25.00");
      assert.equal((await h()).rows[0].consumed_amount,"80.00000000");
      await rejects(()=>tx.execute(sql`update accounting_wallet_holds set status='active',consumed_amount=0 where id=${hold}`));
      await rejects(()=>tx.execute(sql`delete from accounting_wallet_settlements where journal_id=${paid.journalId}`));
      await tx.execute(sql`update accounting_wallet_cutovers set pipeline_ready=false where company_id=${company}`);
      await rejects(()=>settleWalletReceivable({...request,sourceId:"cutover-blocked"},actor,tx));
      await rejects(()=>tx.execute(sql`update customer_wallets set balance=26 where id=${customer}`));
      await tx.execute(sql`update accounting_wallet_cutovers set pipeline_ready=true where company_id=${company}`);
      const totals=(await tx.execute(sql`select
        (select sum(l.credit-l.debit) from accounting_journal_lines l join accounting_journal_entries e on e.id=l.entry_id
          where e.company_id=${company} and l.account_id=${ids.WALLET_LIABILITY} and e.status='posted')::text as wallet,
        (select sum(l.debit-l.credit) from accounting_journal_lines l join accounting_journal_entries e on e.id=l.entry_id
          where e.company_id=${company} and l.account_id=${ids.ACCOUNTS_RECEIVABLE} and e.status='posted')::text as ar,
        (select sum(amount-settled_amount) from accounting_receivable_items where company_id=${company})::text as items`)).rows[0];
      assert.equal(totals.wallet,"25.00000000");assert.equal(totals.ar,totals.items);
    });
    await t.test("foreign wallet settlement closes historical invoice and pooled liability values, not today's rate",async()=>{
      await tx.execute(sql`update accounting_receipt_cutovers set processing_ready=true where company_id=${company}`);
      const fxCustomer=customer+3;
      await tx.execute(sql`insert into crm_customers(id,email,first_name,last_name)
        values(${fxCustomer},${randomUUID()+"@example.invalid"},'FX','Rollback fixture')`);
      await tx.execute(sql`insert into customer_wallets(id,customer_id,balance,currency) values(${fxCustomer},${fxCustomer},0,'USD')`);
      await tx.execute(sql`insert into accounting_wallet_links(wallet_id,company_id,customer_id,currency)
        values(${fxCustomer},${company},${fxCustomer},'USD')`);
      for(const [key,code,type] of [["FX_GAIN","FX990","revenue"],["FX_LOSS","FX991","expense"]]){
        ids[key]=(await tx.execute(sql`insert into accounting_accounts(company_id,code,name_ar,name_en,type)
          values(${company},${code},'اختبار فروق العملة',${key},${type}) returning id`)).rows[0].id as number;
        await tx.execute(sql`insert into accounting_posting_rules(company_id,key,account_id) values(${company},${key},${ids[key]})`);
      }
      const rate=async(date:string,value:string)=>tx.execute(sql`insert into accounting_exchange_rates(company_id,currency,effective_on,rate,source,reference)
        values(${company},'USD',${date},${value},'central_bank','Rollback-only central bank reference')`);
      const fund=async(source:string,date:string,amount:string)=>recordWalletMovement("topup",{
        companyId:company,walletId:fxCustomer,sourceId:source,entryDate:date,amount,channel:"BANK",
        evidenceReference:"Rollback foreign funding evidence",reason:"Foreign wallet funding"},actor,tx);
      const issue=async(source:string,date:string,amount:string)=>{
        const {entry}=await postJournalEntry({companyId:company,sourceType:"SalesInvoice",sourceId:source,entryDate:date,
          description:"Rollback foreign invoice",lines:[
            {accountId:ids.ACCOUNTS_RECEIVABLE,currency:"USD",debit:amount,partyType:"customer",partyId:fxCustomer},
            {accountId:ids.SALES_REVENUE,currency:"USD",credit:amount},
          ]},actor,tx);
        return registerInvoiceReceivable({companyId:company,customerId:fxCustomer,currency:"USD",
          invoiceJournalId:entry.id,invoiceReference:source,dueOn:date},actor,tx);
      };
      const settle=async(source:string,date:string,amount:string,receivableId:number)=>settleWalletReceivable({
        companyId:company,walletId:fxCustomer,receivableId,sourceId:source,entryDate:date,amount,reason:"Close historic foreign book values"},actor,tx);
      const ledger=async(accountId:number)=> (await tx.execute(sql`select coalesce(sum(l.debit-l.credit),0)::text as native,
        coalesce(sum(l.base_debit-l.base_credit),0)::text as base from accounting_journal_lines l
        join accounting_journal_entries e on e.id=l.entry_id and e.status='posted'
        where e.company_id=${company} and l.account_id=${accountId} and l.party_type='customer'
          and l.party_id=${fxCustomer} and l.currency='USD'`)).rows[0];
      await rate("2026-06-01","1.2");await fund("fx-funded-1","2026-06-01","100");
      await rate("2026-06-02","1.4");await fund("fx-funded-2","2026-06-02","100");
      await rate("2026-06-03","1.7");const claim=await issue("fx-invoice-1","2026-06-03","200");
      await rate("2026-06-04","9");
      const partial=await settle("fx-partial-1","2026-06-04","33.33",claim.id as number);
      assert.equal("walletBaseSettled" in partial&&partial.walletBaseSettled,"43.00000000");
      assert.equal("receivableBaseSettled" in partial&&partial.receivableBaseSettled,"57.00000000");
      assert.deepEqual("realizedFx" in partial&&partial.realizedFx,{gain:"0",loss:"14"});
      assert.equal((await settle("fx-partial-1","2026-06-04","33.330",claim.id as number)).duplicate,true);
      await rejects(()=>settle("fx-partial-1","2026-06-04","34",claim.id as number));
      await rejects(()=>settle("fx-backdated","2026-06-03","1",claim.id as number));
      const second=await settle("fx-partial-2","2026-06-04","66.67",claim.id as number);
      assert.equal("walletBaseSettled" in second&&second.walletBaseSettled,"87.00000000");
      assert.equal("receivableBaseSettled" in second&&second.receivableBaseSettled,"113.00000000");
      const closed=await settle("fx-final-1","2026-06-04","100",claim.id as number);
      assert.equal("walletBaseSettled" in closed&&closed.walletBaseSettled,"130.00000000");
      assert.equal("receivableBaseSettled" in closed&&closed.receivableBaseSettled,"170.00000000");
      assert.deepEqual(await ledger(ids.WALLET_LIABILITY),{native:"0.00000000",base:"0.00000000"});
      assert.deepEqual(await ledger(ids.ACCOUNTS_RECEIVABLE),{native:"0.00000000",base:"0.00000000"});
      const loss=(await tx.execute(sql`select sum(l.base_debit-l.base_credit)::text as value from accounting_journal_lines l
        join accounting_journal_entries e on e.id=l.entry_id and e.status='posted'
        where e.company_id=${company} and l.account_id=${ids.FX_LOSS}`)).rows[0];
      assert.equal(loss.value,"80.00000000");
      await rejects(()=>tx.execute(sql`delete from accounting_wallet_book_values where source_id='fx-partial-1' and company_id=${company}`));
      await rejects(()=>reverseJournalEntry(closed.journalId as number,"2026-06-04","Uncoordinated FX reversal",actor,tx));
      // A falling receivable valuation realizes a gain, without changing the current rate.
      await rate("2026-06-05","2");await fund("fx-gain-funding","2026-06-05","50");
      await rate("2026-06-06","1");const gainClaim=await issue("fx-invoice-gain","2026-06-06","50");
      await rate("2026-06-07","4");
      const gain=await settle("fx-gain-close","2026-06-07","50",gainClaim.id as number);
      assert.deepEqual("realizedFx" in gain&&gain.realizedFx,{gain:"50",loss:"0"});
      // Legitimate native foreign remainders may already have zero base carrying value.
      await rate("2026-06-08","1");await fund("fx-zero-funding","2026-06-08","1");
      const tiny=await issue("fx-invoice-tiny","2026-06-08","1");
      await settle("fx-zero-partial","2026-06-09","0.50",tiny.id as number);
      await tx.execute(sql`savepoint orphan_book_fixture`);
      await tx.execute(sql`set constraints accounting_wallet_book_used deferred`);
      const derived=(await tx.execute(sql`insert into accounting_wallet_book_values(company_id,source_id,entry_date,wallet_id,
        receivable_id,amount,wallet_base,receivable_base) values(${company},'orphan-proof','2026-06-10',${fxCustomer},
          ${tiny.id},0.5,999,999) returning wallet_base::text,receivable_base::text`)).rows[0];
      assert.deepEqual(derived,{wallet_base:"0.00000000",receivable_base:"0.00000000"});
      await rejects(()=>tx.execute(sql`set constraints accounting_wallet_book_used immediate`));
      await tx.execute(sql`rollback to savepoint orphan_book_fixture`);await tx.execute(sql`release savepoint orphan_book_fixture`);
      const finalTiny=await settle("fx-zero-final","2026-06-10","0.50",tiny.id as number);
      const zeroLines=(await tx.execute(sql`select currency,debit::text,credit::text,base_debit::text,base_credit::text,
        valuation_basis from accounting_journal_lines where entry_id=${finalTiny.journalId}`)).rows;
      assert.equal(zeroLines.length,2);assert.ok(zeroLines.every(l=>l.base_debit==="0.00000000"&&
        l.base_credit==="0.00000000"&&l.valuation_basis==="historical_carrying"));
      assert.deepEqual(await ledger(ids.WALLET_LIABILITY),{native:"0.00000000",base:"0.00000000"});
      assert.deepEqual(await ledger(ids.ACCOUNTS_RECEIVABLE),{native:"0.00000000",base:"0.00000000"});
      await rejects(async()=>{
        const draft=(await tx.execute(sql`insert into accounting_journal_entries(company_id,fiscal_year_id,entry_date,
          description,source_type,source_id,source_hash,created_by,actor_type,status)
          select ${company},id,'2026-06-10','Reject manual historical conversion','WalletSettlement','forged-history',
            ${"f".repeat(64)},1,'admin','draft' from accounting_fiscal_years where company_id=${company} returning id`)).rows[0];
        await tx.execute(sql`insert into accounting_journal_lines(entry_id,account_id,currency,exchange_rate,debit,
          credit,base_debit,base_credit,party_type,party_id,valuation_basis)
          values(${draft.id},${ids.WALLET_LIABILITY},'USD',1,1,0,0,0,'customer',${fxCustomer},'historical_carrying')`);
      });
      const receive=async(source:string,date:string,amount:string,method:"BANK"|"CASH",
        allocations:{receivableId:number;amount:string}[]=[])=>recordCustomerReceipt({
        companyId:company,customerId:fxCustomer,currency:"USD",sourceId:source,entryDate:date,amount,method,allocations,
        reason:"Rollback-only actual foreign receipt",evidenceReference:"Staff-attested rollback statement"},actor,tx);
      await rate("2026-06-11","2");const cashClaim=await issue("fx-cash-claim","2026-06-11","100");
      await rate("2026-06-12","3");
      const received=await receive("fx-bank-partial","2026-06-12","50","BANK",[{receivableId:cashClaim.id as number,amount:"50"}]);
      assert.equal(received.bookValues?.assetBaseBooked,"150.00000000");
      assert.equal(received.bookValues?.receivableBaseSettled,"100.00000000");
      assert.deepEqual(received.bookValues?.realizedFx,{gain:"50",loss:"0"});
      assert.equal((await receive("fx-bank-partial","2026-06-12","50.00","BANK",
        [{receivableId:cashClaim.id as number,amount:"50.000"}])).duplicate,true);
      await rejects(()=>receive("fx-bank-partial","2026-06-12","51","BANK",[{receivableId:cashClaim.id as number,amount:"50"}]));
      const surplus=await receive("fx-bank-surplus","2026-06-12","25","BANK",[{receivableId:cashClaim.id as number,amount:"10"}]);
      assert.equal(surplus.bookValues?.walletBaseCredited,"45.00000000");
      assert.deepEqual(surplus.bookValues?.realizedFx,{gain:"10",loss:"0"});
      await rejects(()=>receive("fx-backdated-receipt","2026-06-11","1","CASH",[{receivableId:cashClaim.id as number,amount:"1"}]));
      const fromExcess=await settle("fx-surplus-setoff","2026-06-12","10",cashClaim.id as number);
      assert.equal("walletBaseSettled" in fromExcess&&fromExcess.walletBaseSettled,"30.00000000");
      assert.equal("receivableBaseSettled" in fromExcess&&fromExcess.receivableBaseSettled,"20.00000000");
      await rate("2026-06-13","1");
      const lossReceipt=await receive("fx-cash-loss","2026-06-13","25","CASH",[{receivableId:cashClaim.id as number,amount:"25"}]);
      assert.deepEqual(lossReceipt.bookValues?.realizedFx,{gain:"0",loss:"25"});
      await rate("2026-06-14","4");
      const finalReceipt=await receive("fx-bank-final","2026-06-14","5","BANK",[{receivableId:cashClaim.id as number,amount:"5"}]);
      assert.equal(finalReceipt.bookValues?.receivableBaseSettled,"10.00000000");
      assert.deepEqual(await ledger(ids.ACCOUNTS_RECEIVABLE),{native:"0.00000000",base:"0.00000000"});
      await rejects(()=>reverseJournalEntry(received.journalId as number,"2026-06-14","Unsafe isolated receipt reversal",actor,tx));
      await rejects(()=>reverseJournalEntry(cashClaim.invoice_journal_id as number,"2026-06-14","Unsafe settled invoice reversal",actor,tx));
      await rejects(()=>tx.execute(sql`update accounting_receipt_book_values set funding_base=999 where receipt_id=${received.receipt.id}`));
      await rejects(()=>tx.execute(sql`delete from accounting_receipt_book_values where receipt_id=${received.receipt.id}`));
      await rejects(async()=>{
        await tx.execute(sql`update accounting_receivable_items set settled_amount=99 where id=${cashClaim.id}`);
        await tx.execute(sql`set constraints accounting_foreign_ar_parity immediate`);
      });
      await rate("2026-06-15","2");const surplusClaim=await issue("fx-excess-claim","2026-06-15","5");
      await settle("fx-excess-close","2026-06-15","5",surplusClaim.id as number);
      assert.deepEqual(await ledger(ids.WALLET_LIABILITY),{native:"0.00000000",base:"0.00000000"});
      await rate("2026-06-16","1");const firstClaim=await issue("fx-multi-invoice-1","2026-06-16","20");
      await rate("2026-06-17","3");const secondClaim=await issue("fx-multi-invoice-2","2026-06-17","20");
      await rate("2026-06-18","2");
      const multi=await receive("fx-multiple-claims","2026-06-18","40","CASH",[
        {receivableId:firstClaim.id as number,amount:"20"},{receivableId:secondClaim.id as number,amount:"20"}]);
      assert.equal(multi.bookValues?.assetBaseBooked,"80.00000000");
      assert.equal(multi.bookValues?.receivableBaseSettled,"80.00000000");
      assert.deepEqual(multi.bookValues?.realizedFx,{gain:"0",loss:"0"});
      const amounts=(multi.bookValues?.allocations as {baseSettled:string}[]).map(x=>Number(x.baseSettled));
      assert.deepEqual(amounts,[20,60]);
      await rejects(()=>receive("fx-rate-missing","2026-02-01","1","BANK"));
      await rejects(()=>receive("fx-over-allocation","2026-06-18","5","BANK",[{receivableId:firstClaim.id as number,amount:"6"}]));
      await rate("2026-06-19","1");
      const zeroReceipt=await receive("fx-zero-receipt","2026-06-19","0.01","BANK");
      assert.equal(zeroReceipt.bookValues?.assetBaseBooked,"0.00000000");
      assert.equal(zeroReceipt.bookValues?.walletBaseCredited,"0.00000000");
      const smallClaim=await issue("fx-tiny-receipt-claim","2026-06-19","1");
      await settle("fx-zero-excess-setoff","2026-06-19","0.01",smallClaim.id as number);
      await receive("fx-tiny-final-receipt","2026-06-19","0.99","CASH",[{receivableId:smallClaim.id as number,amount:"0.99"}]);
      assert.deepEqual(await ledger(ids.ACCOUNTS_RECEIVABLE),{native:"0.00000000",base:"0.00000000"});
      assert.deepEqual(await ledger(ids.WALLET_LIABILITY),{native:"0.00000000",base:"0.00000000"});
      await rejects(()=>postJournalEntry({companyId:company,entryDate:"2026-06-19",sourceType:"PaymentReceived",
        sourceId:"fx-no-receipt-proof",description:"Reject fabricated receipt journal",lines:[
          {accountId:ids.BANK,currency:"USD",debit:"1"},
          {accountId:ids.ACCOUNTS_RECEIVABLE,currency:"USD",credit:"1",partyType:"customer",partyId:fxCustomer},
        ]},actor,tx));
    });
    await t.test("foreign wallet and cheque lifecycle preserve instrument, pooled assets and original invoice book values",async()=>{
      const fxCustomer=customer+4;
      await tx.execute(sql`insert into crm_customers(id,email,first_name,last_name)
        values(${fxCustomer},${randomUUID()+"@example.invalid"},'Cheque FX','Rollback fixture')`);
      await tx.execute(sql`insert into customer_wallets(id,customer_id,balance,currency) values(${fxCustomer},${fxCustomer},0,'USD')`);
      await tx.execute(sql`insert into accounting_wallet_links(wallet_id,company_id,customer_id,currency)
        values(${fxCustomer},${company},${fxCustomer},'USD')`);
      const rate=async(date:string,value:string)=>tx.execute(sql`insert into accounting_exchange_rates(company_id,currency,effective_on,rate,source,reference)
        values(${company},'USD',${date},${value},'central_bank','Rollback FX cheque rate')`);
      const issue=async(source:string,date:string,amount:string)=>{
        const {entry}=await postJournalEntry({companyId:company,entryDate:date,sourceType:"SalesInvoice",sourceId:source,
          description:"Foreign cheque invoice",lines:[
            {accountId:ids.ACCOUNTS_RECEIVABLE,currency:"USD",debit:amount,partyType:"customer",partyId:fxCustomer},
            {accountId:ids.SALES_REVENUE,currency:"USD",credit:amount},
          ]},actor,tx);
        return registerInvoiceReceivable({companyId:company,customerId:fxCustomer,currency:"USD",
          invoiceJournalId:entry.id,invoiceReference:source,dueOn:"2026-12-01"},actor,tx);
      };
      const receive=async(source:string,date:string,amount:string,allocations:{receivableId:number;amount:string}[]=[],method:"CHEQUE"|"BANK"="CHEQUE")=>
        recordCustomerReceipt({companyId:company,customerId:fxCustomer,currency:"USD",sourceId:source,entryDate:date,
          method,chequeNumber:method==="CHEQUE"?source:undefined,amount,allocations,
          evidenceReference:"Rollback staff cheque attestation",reason:"Actual cheque received, not automatically verified"},actor,tx);
      const transition=async(rid:number,action:"deposited"|"cleared"|"bounced",date:string,source=`${action}-${rid}`)=>
        transitionCheque(rid,action,{entryDate:date,sourceId:source,evidenceReference:"Rollback bank cheque document",
          reason:"Actual staff-attested cheque lifecycle"},actor,tx);
      const gl=async(aid:number,liability=false)=>(await tx.execute(sql`select
        coalesce(sum(l.debit-l.credit),0)::text as native,coalesce(sum(l.base_debit-l.base_credit),0)::text as base
        from accounting_journal_lines l join accounting_journal_entries e on e.id=l.entry_id and e.status='posted'
        where e.company_id=${company} and l.account_id=${aid} and l.currency='USD'
        and (${!liability} or l.party_id=${fxCustomer})`)).rows[0];
      await rate("2026-07-01","2");const claim=await issue("cheque-fx-original","2026-07-01","20");
      await rate("2026-07-02","3");
      const received=await receive("cheque-fx-received","2026-07-02","30",[{receivableId:Number(claim.id),amount:"20"}]);
      const rid=Number(received.receipt.id);
      assert.equal(received.bookValues?.assetBaseBooked,"90.00000000");
      assert.equal(received.bookValues?.receivableBaseSettled,"40.00000000");
      assert.equal(received.bookValues?.walletBaseCredited,"30.00000000");
      assert.equal((await receive("cheque-fx-received","2026-07-02","30.00",[{receivableId:Number(claim.id),amount:"20"}])).duplicate,true);
      const nextClaim=await issue("cheque-fx-spending","2026-07-02","10");
      await rejects(()=>settleWalletReceivable({companyId:company,walletId:fxCustomer,receivableId:Number(nextClaim.id),
        sourceId:"cheque-fx-unavailable",entryDate:"2026-07-02",amount:"1",reason:"Cannot spend an uncleared cheque"},actor,tx));
      await rejects(()=>transition(rid,"cleared","2026-07-02"));
      await rejects(()=>transition(rid,"deposited","2026-07-01"));
      await rate("2026-07-03","9");
      const deposited=await transition(rid,"deposited","2026-07-03");
      assert.equal("bookValues" in deposited&&deposited.bookValues.assetBaseTransferred,"90.00000000");
      assert.equal((await transition(rid,"deposited","2026-07-03")).duplicate,true);
      await rejects(()=>transition(rid,"deposited","2026-07-03","different-deposit-source"));
      assert.equal((await gl(ids.CHEQUES_ON_HAND)).base,"0.00000000");
      assert.equal((await gl(ids.CHEQUE_CLEARING)).base,"90.00000000");
      await rate("2026-07-04","11");
      const cleared=await transition(rid,"cleared","2026-07-04");
      assert.equal("bookValues" in cleared&&cleared.bookValues.assetBaseTransferred,"90.00000000");
      assert.equal((await gl(ids.CHEQUE_CLEARING)).base,"0.00000000");
      await settleWalletReceivable({companyId:company,walletId:fxCustomer,receivableId:Number(nextClaim.id),
        sourceId:"cheque-fx-consumed",entryDate:"2026-07-04",amount:"10",reason:"Spend only a cleared cheque"},actor,tx);
      // Other bank inflows affect the pooled bank basis, not the returned cheque's original AR.
      await rate("2026-07-05","4");await receive("cheque-fx-other-bank","2026-07-05","10",[],"BANK");
      const bank=await gl(ids.BANK);
      const expectedBankBase=(await tx.execute(sql`select round(${bank.base}::numeric*30/${bank.native}::numeric,0)::text as n`)).rows[0].n;
      const bounced=await transition(rid,"bounced","2026-07-05");
      assert.equal(bounced.recoveredWalletAmount,"10.00000000");
      assert.equal(bounced.newReceivable,"0.00000000");
      assert.equal("bookValues" in bounced&&Number(bounced.bookValues.assetBaseTransferred),Number(expectedBankBase));
      assert.equal("bookValues" in bounced&&bounced.bookValues.receivableBaseRestored,"40.00000000");
      assert.equal("bookValues" in bounced&&bounced.bookValues.walletBaseRecovered,"40.00000000");
      assert.equal((await transition(rid,"bounced","2026-07-05")).duplicate,true);
      assert.equal((await gl(ids.WALLET_LIABILITY,true)).native,"0.00000000");
      assert.equal((await tx.execute(sql`select settled_amount::text as n from accounting_receivable_items where id=${claim.id}`)).rows[0].n,"0.00000000");
      await rejects(()=>reverseJournalEntry(cleared.journalId as number,"2026-07-05","Do not reverse one cheque transfer",actor,tx));
      await rejects(()=>transition(rid,"cleared","2026-07-05"));
      await rejects(()=>tx.execute(sql`update accounting_cheque_book_values set asset_base=999 where receipt_id=${rid}`));
      await rejects(()=>tx.execute(sql`delete from accounting_cheque_book_values where receipt_id=${rid}`));
      // A spent excess becomes a separate, subsequently settleable historical receivable.
      await rate("2026-07-06","2");
      const debtClaim=await issue("cheque-fx-return-debt","2026-07-06","5");
      const spent=await receive("cheque-fx-all-spent","2026-07-06","5");
      const spentId=Number(spent.receipt.id);
      await transition(spentId,"deposited","2026-07-06");
      await transition(spentId,"cleared","2026-07-06");
      await settleWalletReceivable({companyId:company,walletId:fxCustomer,receivableId:Number(debtClaim.id),
        sourceId:"cheque-fx-spent-all",entryDate:"2026-07-06",amount:"5",reason:"Spend cleared funds"},actor,tx);
      const debtReturn=await transition(spentId,"bounced","2026-07-06");
      assert.equal(debtReturn.recoveredWalletAmount,"0.00000000");
      assert.equal(debtReturn.newReceivable,"5.00000000");
      assert.equal("bookValues" in debtReturn&&debtReturn.bookValues.newReceivableBase,"10.00000000");
      const debt=(await tx.execute(sql`select * from accounting_receivable_items where invoice_journal_id=${debtReturn.journalId}`)).rows[0];
      const paidDebt=await receive("cheque-fx-pay-return-debt","2026-07-06","5",[{receivableId:Number(debt.id),amount:"2"}],"BANK");
      assert.equal(paidDebt.bookValues?.receivableBaseSettled,"4.00000000");
      const walletDebt=await settleWalletReceivable({companyId:company,walletId:fxCustomer,receivableId:Number(debt.id),
        sourceId:"cheque-fx-wallet-return-debt",entryDate:"2026-07-06",amount:"3",reason:"Close proven cheque debt with prepaid funds"},actor,tx);
      assert.equal("receivableBaseSettled" in walletDebt&&walletDebt.receivableBaseSettled,"6.00000000");
      // Bounces before clearance recover all blocked excess and restore the exact original invoice basis.
      const pending=await receive("cheque-fx-pending-bounce","2026-07-06","3",[{receivableId:Number(claim.id),amount:"2"}]);
      const pendingReturn=await transition(Number(pending.receipt.id),"bounced","2026-07-06");
      assert.equal(pendingReturn.recoveredWalletAmount,"1.00000000");
      assert.equal("bookValues" in pendingReturn&&pendingReturn.bookValues.receivableBaseRestored,"4.00000000");
      const clearing=await receive("cheque-fx-clearing-bounce","2026-07-06","1");
      await transition(Number(clearing.receipt.id),"deposited","2026-07-06");
      await transition(Number(clearing.receipt.id),"bounced","2026-07-06");
      assert.equal((await gl(ids.CHEQUES_ON_HAND)).native,"0.00000000");
      assert.equal((await gl(ids.CHEQUE_CLEARING)).native,"0.00000000");
      // Proven zero-base native minor units must not invent a base-currency unit.
      const tiny=await receive("cheque-fx-zero-base","2026-07-06","0.01");
      const tinyId=Number(tiny.receipt.id);
      await transition(tinyId,"deposited","2026-07-06");
      await transition(tinyId,"bounced","2026-07-06");
      assert.equal((await gl(ids.WALLET_LIABILITY,true)).base,"0.00000000");
      // Direct status changes, orphan proofs, and fabricated foreign transfer journals fail closed.
      const orphan=await receive("cheque-fx-orphan-source","2026-07-06","1");
      await rejects(async()=>{
        await tx.execute(sql`update accounting_customer_receipts set status='deposited' where id=${orphan.receipt.id}`);
        await tx.execute(sql`set constraints accounting_foreign_cheque_status immediate`);
      });
      await rejects(async()=>{
        await tx.execute(sql`insert into accounting_cheque_book_values(receipt_id,action,entry_date,input)
          values(${orphan.receipt.id},'deposited','2026-07-06',
            '{"sourceId":"orphan-proof","entryDate":"2026-07-06","reason":"Missing completed journal","evidenceReference":"Rollback orphan evidence"}'::jsonb)`);
        await tx.execute(sql`set constraints accounting_cheque_book_used immediate`);
      });
      await rejects(()=>postJournalEntry({companyId:company,entryDate:"2026-07-06",sourceType:"ChequeDeposited",
        sourceId:"cheque-fx-forged-transfer",description:"Cannot invent a foreign cheque transfer",lines:[
          {accountId:ids.CHEQUE_CLEARING,currency:"USD",debit:"1"},
          {accountId:ids.CHEQUES_ON_HAND,currency:"USD",credit:"1"}]},actor,tx));
      await rejects(()=>transitionCheque(Number(orphan.receipt.id),"deposited",{sourceId:"viewer-cheque",
        entryDate:"2026-07-06",reason:"Viewer cannot mutate cheque",evidenceReference:"Viewer cheque evidence"},
        {...actor,canManage:false},tx));
      await rejects(async()=>{
        const proof=(await tx.execute(sql`insert into accounting_cheque_book_values(receipt_id,action,entry_date,input)
          values(${orphan.receipt.id},'deposited','2026-07-06',
          '{"sourceId":"padded-proof","entryDate":"2026-07-06","reason":"Reject padded transfer","evidenceReference":"Rollback padded evidence"}'::jsonb) returning *`)).rows[0];
        const proven=(proof.lines as {accountId:number;currency:string;debit:string;credit:string;partyType:null;partyId:null}[])
          .map(({accountId,currency,debit,credit,partyType,partyId})=>({accountId,currency,debit,credit,partyType,partyId}));
        await postJournalEntry({companyId:company,entryDate:"2026-07-06",sourceType:"ChequeDeposited",
          sourceId:String(proof.source_id),description:"No unrelated balanced padding",lines:[...proven,
            {accountId:ids.CASH,currency:"IQD",debit:"1"},
            {accountId:ids.BANK,currency:"IQD",credit:"1"}]},actor,tx);
      });
      await tx.execute(sql`set constraints all immediate`);
    });
    done=true;throw end;
  });}catch(e){if(e!==end)throw e;}finally{await pool.end();}
  assert.ok(done);
});