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
      await rejects(()=>recordCustomerReceipt({companyId:company,customerId:fxCustomer,currency:"USD",sourceId:"still-blocked-fx-receipt",
        entryDate:"2026-06-10",method:"BANK",amount:"1",evidenceReference:"Foreign receipt not implemented",
        reason:"No invented foreign asset carrying value"},actor,tx));
    });
    done=true;throw end;
  });}catch(e){if(e!==end)throw e;}finally{await pool.end();}
  assert.ok(done);
});