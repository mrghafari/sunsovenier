import test from "node:test";
import assert from "node:assert/strict";
import {randomInt,randomUUID} from "node:crypto";
import {readFile} from "node:fs/promises";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {iraqChart} from "./iraq-chart";
import {postJournalEntry,reverseJournalEntry} from "./postJournalEntry";
import {saveInventoryDocument,actInventoryDocument,readInventoryDocumentMetadata} from "./inventory-documents";
import {registerStockBook,readCarryingLayers} from "./loading-invoice-stock";
import {readLoadingInvoiceWorkbench,issueLoadingInvoice} from "./loading-invoices";
import {readLoadingReturns,returnLoadingInvoice as returnOriginal} from "./loading-returns";
import {readShipmentCosts,postShipmentCost,captureShipmentCost} from "./shipment-costs";
import {recordOperationalEvent} from "./events";
import {linkWallet,recordWalletMovement,prepareWalletOrder,approveWalletOrder} from "./wallet";
import {decimal} from "./money";
import {settleWalletReceivable as settleOriginal} from "./wallet-settlement";
import {readCustomerReport} from "./customer-reports";
import {readCreditExposure} from "./credit-exposure";
import {readReceiptOpenItems} from "./receipt-workbench";
import {recordCustomerReceipt,returnCustomerReceipt} from "./receipts";
import {exercisePartialReturns} from "./partial-returns-db-cases";
import {exercisePostingQueue} from "./posting-queue-db-cases";
async function settleWalletReceivable(...args:Parameters<typeof settleOriginal>){
  try{return await settleOriginal(...args);}catch(error){
    console.error("Settlement SQL cause:",(error as {cause?:{message?:string}}).cause?.message);throw error;
  }
}
async function returnLoadingInvoice(...args:Parameters<typeof returnOriginal>){
  try{return await returnOriginal(...args);}catch(error){
    if((error as {cause?:unknown}).cause)console.error("Return SQL cause:",(error as {cause:{message?:string}}).cause.message);
    throw error;
  }
}
test("full unsettled loading returns preserve original books and never change native workflows (rollback-only)",
 {skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const currencies=process.env.ACCOUNTING_RETURN_TEST_CURRENCY?[process.env.ACCOUNTING_RETURN_TEST_CURRENCY]:["IQD","USD"];
  assert.ok(currencies.every(c=>c==="IQD"||c==="USD"));
  try{for(const currency of currencies){
    const rollback=new Error("ROLLBACK_LOADING_RETURNS");let finished=false;
    try{await accountingDb.transaction(async tx=>{
      await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
      if(process.env.ACCOUNTING_COMPLETION_MIGRATION_DRY_RUN==="1"){
        if(process.env.NODE_ENV==="production")throw new Error("No production migration dry run");
        for(const f of ["0055_linked_return_payouts.sql","0056_reviewed_posting_queue.sql"])
          await tx.execute(sql.raw(await readFile("server/modules/accounting/"+f,"utf8")));
      }
      if(process.env.ACCOUNTING_PARTIAL_RETURN_DRY_RUN==="1"){
        if(process.env.NODE_ENV==="production")throw new Error("No production migration dry run");
        await tx.execute(sql.raw(await readFile("server/modules/accounting/0051_partial_return_evidence.sql","utf8")));
        await tx.execute(sql.raw(await readFile("server/modules/accounting/0052_partial_return_connections.sql","utf8")));
      }
      if(process.env.ACCOUNTING_PARTIAL_RETURN_AR_DRY_RUN==="1"){
        if(process.env.NODE_ENV==="production")throw new Error("No production migration dry run");
        await tx.execute(sql.raw(await readFile("server/modules/accounting/0053_partial_return_ar_parity.sql","utf8")));
      }
       if(process.env.ACCOUNTING_PARTIAL_RETURN_CHEQUE_DRY_RUN==="1"){
         if(process.env.NODE_ENV==="production")throw new Error("No production migration dry run");
         await tx.execute(sql.raw(await readFile("server/modules/accounting/0054_partial_return_cheque_history.sql","utf8")));
       }
      // Explicit development-only dry run permits reviewing a not-yet-applied
      // migration AND its real triggers before freezing its checksum.
      if(process.env.ACCOUNTING_RETURN_MIGRATION_DRY_RUN==="1"){
        if(process.env.NODE_ENV==="production")throw new Error("No production migration dry run");
        await tx.execute(sql.raw(await readFile("server/modules/accounting/0043_loading_returns.sql","utf8")));
      }
       if(process.env.ACCOUNTING_PAID_RETURN_MIGRATION_DRY_RUN==="1"){
         if(process.env.NODE_ENV==="production")throw new Error("No production migration dry run");
         await tx.execute(sql.raw(await readFile("server/modules/accounting/0044_paid_loading_returns.sql","utf8")));
       }
      const role=(await tx.execute(sql`select id from admin_roles where is_active and
        lower(regexp_replace(btrim(name),'[[:space:]-]+','_','g')) in ('super_admin','supper_admin','admin') limit 1`)).rows[0];
      assert.ok(role);
      const actorId=Number((await tx.execute(sql`insert into users(username,email,password_hash,role_id)
        values(${"disabled-return-"+randomUUID()},${randomUUID()+"@example.invalid"},'disabled-fixture-hash',${role.id}) returning id`)).rows[0].id);
      const actor={actorId,actorType:"admin" as const,canManage:true};
      const companyId=Number((await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
        values(${"Return "+currency+" "+randomUUID()},'IQ','Asia/Baghdad','IQD') returning id`)).rows[0].id);
      await tx.execute(sql`insert into accounting_fiscal_years(company_id,name,starts_on,ends_on)
        values(${companyId},'Fixture period','2026-01-01','2026-12-31')`);
      const accounts=new Map<string,number>();
      for(const key of ["BANK","WALLET_LIABILITY","ACCOUNTS_RECEIVABLE","SALES_REVENUE","TAX_PAYABLE","SHIPPING_REVENUE",
         "COGS","INVENTORY","OPENING_BALANCE_EQUITY","FX_GAIN","FX_LOSS","SHIPPING_EXPENSE","CARRIER_PAYABLE",
         "CHEQUES_ON_HAND","CHEQUE_CLEARING"]){
        const a=iraqChart.find(x=>x.key===key)!;assert.ok(a,key);
        const id=Number((await tx.execute(sql`insert into accounting_accounts(company_id,code,name_ar,name_en,type)
          values(${companyId},${a.code},${a.nameAr},${a.nameEn},${a.type}) returning id`)).rows[0].id);
        accounts.set(key,id);await tx.execute(sql`insert into accounting_posting_rules(company_id,key,account_id)
          values(${companyId},${key},${id})`);
      }
      await tx.execute(sql`insert into accounting_source_bindings(source_module,company_id,capture_enabled)
        values('shop',${companyId},true) on conflict(source_module) do update set company_id=excluded.company_id,capture_enabled=true`);
      await tx.execute(sql`insert into accounting_wallet_cutovers(company_id,pipeline_ready,enabled_at,opening_reference,reviewed_by)
        values(${companyId},true,'2026-01-01','Rollback reviewed wallet opening',${actorId})`);
      await tx.execute(sql`insert into accounting_receipt_cutovers(company_id,processing_ready) values(${companyId},true)`);
      await tx.execute(sql`insert into accounting_credit_cutovers(company_id,processing_ready,enabled_at,opening_reference,reviewed_by)
        values(${companyId},true,'2026-01-01','Rollback reviewed actual AR opening',${actorId})`);
      if(currency==="USD")await tx.execute(sql`insert into accounting_exchange_rates(company_id,currency,effective_on,rate,source,reference)
        values(${companyId},'USD','2026-06-01',1500,'central_bank','Rollback original official rate')`);
      const customerId=1900000000+randomInt(1,1000000),orderId=customerId+2;
      await tx.execute(sql`insert into crm_customers(id,email,first_name,last_name)
        values(${customerId},${randomUUID()+"@example.invalid"},'Return','Fixture')`);
      await tx.execute(sql`insert into customer_wallets(id,customer_id,balance,currency,credit_limit)
        values(${customerId},${customerId},0,${currency},0)`);
      await linkWallet(companyId,customerId,actor,tx);
      await recordWalletMovement("topup",{companyId,walletId:customerId,sourceId:randomUUID(),entryDate:"2026-06-01",
        amount:"1000",channel:"BANK",evidenceReference:"Rollback bank funding document",reason:"Rollback prepaid funding"},actor,tx);
      const productId=(await readInventoryDocumentMetadata(companyId,tx)).products[0].id;
      const catalogBefore=(await tx.execute(sql`select to_jsonb(p) data from shop_products p where id=${productId}`)).rows[0].data;
      let doc=await saveInventoryDocument({companyId,sourceId:randomUUID(),kind:"opening",reference:randomUUID(),
        documentDate:"2026-06-01",supplier:"",currency:"IQD",evidenceReference:"Rollback exact opening source",notes:"",
        lines:[{productId,batchReference:randomUUID(),quantityTons:"3",totalCost:"2"}]},actor,tx);
      doc=await actInventoryDocument(doc.id,"approve",{companyId,revision:doc.revision,reason:"Review actual fixture stock"},actor,tx);
      await tx.execute(sql`set constraints accounting_balance_header,accounting_balance_lines deferred`);
      const stock=await postJournalEntry({companyId,entryDate:"2026-06-01",sourceType:"InventoryOpening",sourceId:String(doc.id),
        description:"Rollback stock opening",lines:[{accountId:accounts.get("INVENTORY")!,currency:"IQD",debit:"2"},
          {accountId:accounts.get("OPENING_BALANCE_EQUITY")!,currency:"IQD",credit:"2"}]},actor,tx);
      await registerStockBook({companyId,documentId:doc.id,lineIndex:0,journalId:stock.entry.id,baseCost:"2",
        evidenceReference:"Rollback checked carrying evidence"},actor,tx);
      await tx.execute(sql`insert into customer_orders(id,order_number,customer_id,total_amount,currency,shipping_address,
        payment_method,payment_status,created_at,delivery_method,shipping_cost)
        values(${orderId},${"TEST-"+randomUUID()},${customerId},400,${currency},'{}','wallet_full','pending','2026-06-02','courier',0)`);
      await tx.execute(sql`insert into order_items(id,order_id,product_id,product_name,product_sku,quantity,unit_price,total_price,unit)
        values(${orderId},${orderId},${productId},'Rollback returned goods','FIXTURE',4,100,400,'tons')`);
      await prepareWalletOrder(orderId,customerId,tx);await approveWalletOrder(orderId,"Rollback own hold approval",actor,tx);
      const facts:number[]=[];
      for(let n=0;n<3;n++)facts.push((await recordOperationalEvent(tx,{eventType:"LoadingCompleted",orderId,
        sourceId:`return-truck-${n}`,eventDate:"2026-06-03",weighbridgeReference:`real-fixture-scale-${n}`,
        actualWeightTons:"1",lines:[{orderItemId:orderId,actualWeightTons:"1"}]},actor)).factId);
      await tx.execute(sql`insert into accounting_invoice_cutovers(company_id,processing_ready,starts_on,first_order_id,reviewed_by,evidence_reference)
        values(${companyId},true,'2026-06-01',${orderId},${actorId},'Rollback exact inventory opening review')`);
      if(currency==="USD")await tx.execute(sql`insert into accounting_foreign_invoice_cutovers(company_id,processing_ready,reviewed_by,evidence_reference)
        values(${companyId},true,${actorId},'Rollback reviewed foreign valuation')`);
      const invoices:Awaited<ReturnType<typeof issueLoadingInvoice>>[]=[];
      if(process.env.ACCOUNTING_COMPLETION_TEST==="1")
        await exercisePostingQueue(t,tx,{actor,companyId,factId:facts[0],currency});
      for(const factId of facts){
        const plan=(await readLoadingInvoiceWorkbench({companyId,orderId},tx)).rows.find(p=>p.factId===factId)!;
        assert.deepEqual(plan.blockers,[]);
        invoices.push(await issueLoadingInvoice({companyId,factId,expectedPlanHash:plan.planHash,
          reason:"Issue full unsettled fixture loading",settleFromHold:false},actor,tx));
      }
      assert.equal(invoices[1].cogsJournalId,null);
      const nativeBefore=(await tx.execute(sql`select to_jsonb(o) data from customer_orders o where id=${orderId}`)).rows[0].data;
      const walletBefore=(await tx.execute(sql`select to_jsonb(w) data from customer_wallets w where id=${customerId}`)).rows[0].data;
      const holdBefore=(await tx.execute(sql`select to_jsonb(h) data from accounting_wallet_holds h where order_id=${orderId}`)).rows[0].data;
      const plans=()=>readLoadingReturns({companyId,orderId},tx);
      const command=async(invoiceId:number,date="2026-06-04")=>{
        const plan=(await plans()).rows.find(p=>p.invoiceId===invoiceId)!;
        return {companyId,invoiceId,expectedPlanHash:plan.planHash,returnDate:date,
          goodsReceiptReference:"Actual full goods receipt fixture",reason:"Return all original measured invoice goods"};
      };
      const rejected=async(fn:()=>Promise<unknown>,pattern?:RegExp)=>{
        await tx.execute(sql`savepoint rejected_return`);
        try{await assert.rejects(fn,(e:unknown)=>!pattern||pattern.test(String((e as {cause?:{message?:string};message?:string}).cause?.message??(e as Error).message)));}
        finally{await tx.execute(sql`rollback to savepoint rejected_return`);await tx.execute(sql`release savepoint rejected_return`);}
      };
      await t.test(currency+": reads and closed gates cannot create a return or waive active manager permission",async()=>{
        const r=await plans();assert.equal(r.financialGateOpen,false);assert.equal(r.pagination.totalRows,3);
        assert.ok(r.rows.every(p=>p.blockers.includes("RETURN_GATE_CLOSED")));
        await rejected(async()=>returnLoadingInvoice(await command(invoices[1].invoiceId),{...actor,canManage:false},tx));
        await rejected(async()=>returnLoadingInvoice(await command(invoices[1].invoiceId),actor,tx),/RETURN_GATE_CLOSED/);
        await rejected(()=>tx.execute(sql`insert into accounting_loading_return_cutovers(company_id,processing_ready)
          values(${companyId},true)`),/review|check/i);
        await rejected(()=>reverseJournalEntry(invoices[0].journalId!,"2026-06-04","No independent loading reversal",actor,tx),/standalone/);
        assert.equal((await tx.execute(sql`select count(*)::integer n from accounting_loading_returns where company_id=${companyId}`)).rows[0].n,0);
      });
      await tx.execute(sql`insert into accounting_loading_return_cutovers(company_id,processing_ready,starts_on,reviewed_by,evidence_reference)
        values(${companyId},true,'2026-06-01',${actorId},'Rollback actual reviewed return opening')`);
      await exercisePartialReturns(t,tx,{actor,companyId,customerId,orderItemId:orderId,invoiceId:invoices[1].invoiceId,
        receivableId:invoices[1].receivableId!,currency});
      if(process.env.ACCOUNTING_PARTIAL_RETURN_ONLY==="1"){finished=true;throw rollback;}
      await t.test(currency+": stale review, incorrect scope and unsettled/cheque protections cannot be bypassed",async()=>{
        const c=await command(invoices[1].invoiceId);
        await rejected(()=>returnLoadingInvoice({...c,expectedPlanHash:"f".repeat(64)},actor,tx),/changed/);
        await rejected(()=>returnLoadingInvoice({...c,companyId:2147483647},actor,tx),/not found/);
        await rejected(()=>returnLoadingInvoice(c,{...actor,canManage:false},tx),/manager/);
        await rejected(()=>returnLoadingInvoice({...c,returnDate:"2026-06-02"},actor,tx),/precede/);
        await rejected(()=>returnLoadingInvoice({...c,returnDate:"2099-01-01"},actor,tx),/Nonfuture/);
        await tx.execute(sql`savepoint settlement_protection`);
        await settleWalletReceivable({companyId,walletId:customerId,receivableId:invoices[1].receivableId!,
          sourceId:"actual-wallet-return-protection",entryDate:"2026-06-03",amount:"1",
          reason:"Rollback original invoice partial settlement"},actor,tx);
        assert.ok((await plans()).rows.find(p=>p.invoiceId===invoices[1].invoiceId)!.blockers.includes("SETTLEMENT_EXISTS"));
        await rejected(()=>returnLoadingInvoice(c,actor,tx),/SETTLEMENT_EXISTS/);
        await tx.execute(sql`rollback to savepoint settlement_protection`);await tx.execute(sql`release savepoint settlement_protection`);
        await tx.execute(sql`savepoint receipt_protection`);
        // A genuine received uncleared cheque allocates AR but must not be
        // silently erased by a sales return.
        const receipt=Number((await tx.execute(sql`insert into accounting_customer_receipts(company_id,customer_id,currency,
          source_id,entry_date,method,amount,wallet_credit,input,status) values(${companyId},${customerId},${currency},
          ${randomUUID()},'2026-06-03','CHEQUE',1,0,'{}','received') returning id`)).rows[0].id);
        const allocate=()=>tx.execute(sql`insert into accounting_receipt_allocations(receipt_id,receivable_id,amount)
          values(${receipt},${invoices[1].receivableId},1)`);
        if(currency==="IQD"){
          await allocate();
          assert.ok((await plans()).rows.find(p=>p.invoiceId===invoices[1].invoiceId)!.blockers.includes("RECEIPT_ALLOCATION_EXISTS"));
          await rejected(()=>returnLoadingInvoice(c,actor,tx),/RECEIPT_ALLOCATION_EXISTS/);
        }else{
          // Never bypass the independent foreign-cheque carrying proof merely
          // to manufacture an allocation in a loading-return test.
          await rejected(allocate,/immutable receipt carrying value/);
        }
        await tx.execute(sql`rollback to savepoint receipt_protection`);await tx.execute(sql`release savepoint receipt_protection`);
      });
      await t.test(currency+": a pending command cannot authorize an incomplete monetary reversal",async()=>{
        const p=(await plans()).rows.find(p=>p.invoiceId===invoices[1].invoiceId)!;
        await rejected(async()=>{
          await tx.execute(sql`set constraints accounting_loading_return_completion_guard deferred`);
          await tx.execute(sql`insert into accounting_loading_returns(company_id,invoice_id,return_date,goods_receipt_reference,
            reason,command_hash,plan,actor_id,actor_type) values(${companyId},${p.invoiceId},'2026-06-04',
            'Verified receipt proof','Return all goods',${"a".repeat(64)},${JSON.stringify(p)}::jsonb,${actorId},'admin')`);
          await tx.execute(sql`set constraints accounting_loading_return_completion_guard immediate`);
        },/commit together/);
      });
      if(currency==="USD")await tx.execute(sql`update accounting_exchange_rates set rate=2000 where company_id=${companyId}`);
      let returnedCommand=await command(invoices[1].invoiceId);
      await t.test(currency+": exact full zero-cost return restores original measured capacity, with no wallet/native edits",async()=>{
        let result:Awaited<ReturnType<typeof returnLoadingInvoice>>;
        try{result=await returnLoadingInvoice(returnedCommand,actor,tx);}
        catch(error){console.error("Exact reversal cause:",(error as {cause?:{message?:string}}).cause?.message);throw error;}
        assert.ok(result.invoiceReversalId);assert.equal(result.cogsReversalId,null);
        assert.equal((await returnLoadingInvoice(returnedCommand,actor,tx)).duplicate,true);
        await rejected(()=>returnLoadingInvoice({...returnedCommand,reason:"Different documentary reason"},actor,tx),/cannot be changed/);
        assert.equal((await tx.execute(sql`select accounting_stock_ledger_reconciled(${companyId}) ok`)).rows[0].ok,true);
        const layers=await readCarryingLayers(tx,companyId);assert.equal(decimal(layers[0].usedTons).toFixed(),"2");
        assert.equal(decimal(layers[0].usedCost).toFixed(),"2");assert.equal(layers[0].hasReturns,true);
        assert.equal((await readLoadingInvoiceWorkbench({companyId,orderId},tx)).rows.find(p=>p.factId===facts[1])!.posted!.returned!.id,result.id);
        // Historical native/base FX is reversed exactly, even after editing
        // the currently published official rate.
        const sums=(await tx.execute(sql`select sum(debit-credit)::text native,sum(base_debit-base_credit)::text base
          from accounting_journal_lines where entry_id in (${invoices[1].journalId},${result.invoiceReversalId})
          and account_id=${accounts.get("ACCOUNTS_RECEIVABLE")!}`)).rows[0];
        assert.equal(decimal(String(sums.native)).toFixed(),"0");assert.equal(decimal(String(sums.base)).toFixed(),"0");
        await rejected(()=>settleWalletReceivable({companyId,walletId:customerId,receivableId:invoices[1].receivableId!,
          sourceId:"forbidden-after-full-return",entryDate:"2026-06-04",amount:"1",
          reason:"Cannot collect the original reversed debt"},actor,tx),/unreversed/);
        await rejected(()=>tx.execute(sql`update accounting_receivable_items set settled_amount=1
          where id=${invoices[1].receivableId}`),/Returned loading receivable/);
        await tx.execute(sql`savepoint returned_receipt_protection`);
        const receipt=Number((await tx.execute(sql`insert into accounting_customer_receipts(company_id,customer_id,currency,
          source_id,entry_date,method,amount,wallet_credit,input,status) values(${companyId},${customerId},${currency},
          ${randomUUID()},'2026-06-04','CHEQUE',1,0,'{}','received') returning id`)).rows[0].id);
        await rejected(()=>tx.execute(sql`insert into accounting_receipt_allocations(receipt_id,receivable_id,amount)
          values(${receipt},${invoices[1].receivableId},1)`));
        // Preserve receipt immutability: discard this unsupported documentary
        // fixture with its savepoint, not a DELETE.
        await tx.execute(sql`rollback to savepoint returned_receipt_protection`);
        await tx.execute(sql`release savepoint returned_receipt_protection`);
      });
      assert.equal((await tx.execute(sql`select count(*)::integer n from accounting_loading_returns
        where company_id=${companyId} and invoice_reversal_id is not null`)).rows[0].n,1,"Stop dependent tests after a failed full return");
      await t.test(currency+": subsequent invoicing uses actual returned residual value, not a negative rounded prefix",async()=>{
        const next=(await recordOperationalEvent(tx,{eventType:"LoadingCompleted",orderId,sourceId:"after-return-loading",
          eventDate:"2026-06-05",weighbridgeReference:"Actual next weighbridge receipt",actualWeightTons:"0.1",
          lines:[{orderItemId:orderId,actualWeightTons:"0.1"}]},actor)).factId;
        const p=(await readLoadingInvoiceWorkbench({companyId,orderId},tx)).rows.find(p=>p.factId===next)!;
        assert.deepEqual(p.blockers,[]);assert.equal(p.baseCost,"0");
        const nextInvoice=await issueLoadingInvoice({companyId,factId:next,expectedPlanHash:p.planHash,
          reason:"Invoice original known zero residual cost"},actor,tx);assert.equal(nextInvoice.cogsJournalId,null);
        assert.equal((await tx.execute(sql`select accounting_stock_ledger_reconciled(${companyId}) ok`)).rows[0].ok,true);
      });
      await t.test(currency+": original nonzero COGS and incurred carrier costs remain independently traceable",async()=>{
        await tx.execute(sql`insert into accounting_shipment_cutovers(company_id,processing_ready,starts_on,reviewed_by,evidence_reference)
          values(${companyId},true,'2026-06-01',${actorId},'Rollback verified freight opening')`);
        const costFact=await captureShipmentCost({companyId,event:{eventType:"ShipmentCostRecorded",orderId,
          sourceId:"actual-carrier-cost",loadingSourceId:"return-truck-0",eventDate:"2026-06-03",
          costType:"EXTERNAL_CARRIER",actualCost:"10",currency:"IQD",carrierReference:"Actual fixture carrier",
          costDocumentReference:"Actual fixture carrier bill"}},actor,tx);
        const costPlan=(await readShipmentCosts({companyId,orderId},tx)).rows[0];
        const freight=await postShipmentCost({companyId,factId:costFact.factId,expectedPlanHash:costPlan.planHash,
          carrierPartyId:17,reason:"Reviewed actual fixture carrier cost"},actor,tx);
        const c=await command(invoices[0].invoiceId,"2026-06-06");
        const countBefore=Number((await tx.execute(sql`select count(*)::integer n from accounting_journal_entries where company_id=${companyId}`)).rows[0].n);
        const failureName=`accounting_return_fixture_fail_${actorId}`;
        await tx.execute(sql`create function ${sql.identifier(failureName)}() returns trigger language plpgsql as
          $$ begin raise exception 'Return downstream fixture failure'; end $$`);
        await tx.execute(sql`create trigger ${sql.identifier(failureName)} before update on accounting_loading_returns
          for each row execute function ${sql.identifier(failureName)}()`);
        await assert.rejects(()=>returnLoadingInvoice(c,actor,tx),e=>/downstream fixture failure/.test(String((e as {cause?:{message?:string}}).cause?.message)));
        assert.equal((await tx.execute(sql`select count(*)::integer n from accounting_journal_entries where company_id=${companyId}`)).rows[0].n,countBefore);
        await tx.execute(sql`drop trigger ${sql.identifier(failureName)} on accounting_loading_returns`);
        await tx.execute(sql`drop function ${sql.identifier(failureName)}()`);
        const result=await returnLoadingInvoice(c,actor,tx);assert.ok(result.cogsReversalId);
        await rejected(()=>reverseJournalEntry(freight.journalId,"2026-06-06","Do not erase incurred freight",actor,tx),/coordinated/);
        assert.equal((await tx.execute(sql`select count(*)::integer n from accounting_journal_entries
          where reversal_of_id=${freight.journalId}`)).rows[0].n,0);
        const ar=(await tx.execute(sql`select sum(l.debit-l.credit)::text n from accounting_journal_lines l
          join accounting_journal_entries j on j.id=l.entry_id and j.company_id=${companyId} and j.status='posted'
          where l.account_id=${accounts.get("ACCOUNTS_RECEIVABLE")!} and l.party_id=${customerId}`)).rows[0];
        assert.equal(decimal(String(ar.n)).toFixed(),"110");
        assert.equal((await tx.execute(sql`select accounting_stock_ledger_reconciled(${companyId}) ok`)).rows[0].ok,true);
        await rejected(()=>tx.execute(sql`update accounting_loading_returns set reason='Tampered reason' where id=${result.id}`),/immutable/);
        await rejected(()=>tx.execute(sql`delete from accounting_loading_returns where id=${result.id}`),/immutable/);
        await tx.execute(sql`update accounting_loading_return_cutovers set processing_ready=false where company_id=${companyId}`);
        assert.equal((await returnLoadingInvoice(c,actor,tx)).duplicate,true);
        assert.deepEqual((await tx.execute(sql`select to_jsonb(o) data from customer_orders o where id=${orderId}`)).rows[0].data,nativeBefore);
        assert.deepEqual((await tx.execute(sql`select to_jsonb(w) data from customer_wallets w where id=${customerId}`)).rows[0].data,walletBefore);
        assert.deepEqual((await tx.execute(sql`select to_jsonb(h) data from accounting_wallet_holds h where order_id=${orderId}`)).rows[0].data,holdBefore);
        assert.deepEqual((await tx.execute(sql`select to_jsonb(p) data from shop_products p where id=${productId}`)).rows[0].data,catalogBefore);
      });
      await t.test(currency+": current and historical debt reflect the actual posting date of each return",async()=>{
        const earlier=await readCustomerReport("receivables-aging",{companyId,customerId,currency,asOf:"2026-06-03"},tx);
        assert.equal(decimal(earlier.agingSummaries[0].trackedOutstanding).toFixed(),"300");
        assert.equal(decimal(earlier.agingSummaries[0].ledgerClosing).toFixed(),"300");
        const current=await readCustomerReport("receivables-aging",{companyId,customerId,currency,asOf:"2026-06-06"},tx);
        assert.equal(decimal(current.agingSummaries[0].trackedOutstanding).toFixed(),"110");
        assert.equal(decimal(current.agingSummaries[0].ledgerClosing).toFixed(),"110");
        const exposure=await readCreditExposure(companyId,customerId,tx);
        assert.equal(decimal(exposure.openReceivables).toFixed(),"110");
        assert.equal(exposure.reconciled,true);
        const selectable=await readReceiptOpenItems({companyId,customerId,currency},tx);
        assert.equal(selectable.items.length,2);
        assert.ok(selectable.items.every(r=>r.id!==invoices[0].receivableId&&r.id!==invoices[1].receivableId));
      });
      await t.test(currency+": paid returns stay independently gated and require exact fresh credit review",async()=>{
        await recordWalletMovement("topup",{companyId,walletId:customerId,sourceId:randomUUID(),entryDate:"2026-06-07",
          amount:"100",channel:"BANK",evidenceReference:"Actual additional customer funding",reason:"Reviewed funding before original payment"},actor,tx);
        await settleWalletReceivable({companyId,walletId:customerId,receivableId:invoices[2].receivableId!,
          holdId:Number(holdBefore.id),sourceId:randomUUID(),entryDate:"2026-06-07",amount:"50",
          reason:"Original partial payment from own held funds"},actor,tx);
        assert.ok((await plans()).rows.find(p=>p.invoiceId===invoices[2].invoiceId)!.blockers.includes("PAID_RETURN_GATE_CLOSED"));
        await rejected(()=>reverseJournalEntry(invoices[2].journalId!,"2026-06-08","No independent paid invoice reversal",actor,tx),/coordinated|standalone/);
        await tx.execute(sql`update accounting_loading_return_cutovers set processing_ready=true,allow_paid_returns=true where company_id=${companyId}`);
        const p=(await plans()).rows.find(p=>p.invoiceId===invoices[2].invoiceId)!;
        assert.deepEqual(p.blockers,[]);assert.equal(p.customerCredit!.amount,"50.00000000");
        assert.equal(decimal(p.customerCredit!.baseAmount).toFixed(),currency==="USD"?"75000":"50");
        await rejected(async()=>returnLoadingInvoice(await command(p.invoiceId,"2026-06-08"),actor,tx),/Explicit review/);
        const stale={...await command(p.invoiceId,"2026-06-08"),creditToCustomerConfirmed:true as const};
        await recordWalletMovement("topup",{companyId,walletId:customerId,sourceId:randomUUID(),entryDate:"2026-06-07",
          amount:"1",channel:"BANK",evidenceReference:"Intervening confirmed funding evidence",reason:"Current customer credit plan changed"},actor,tx);
        await rejected(()=>returnLoadingInvoice(stale,actor,tx),/changed/);
      });
      await t.test(currency+": customer credit rolls back with failed completion and cannot be paid twice",async()=>{
        const c={...await command(invoices[2].invoiceId,"2026-06-08"),creditToCustomerConfirmed:true as const};
        const wallet=(await tx.execute(sql`select to_jsonb(w) data from customer_wallets w where id=${customerId}`)).rows[0].data;
        const hold=(await tx.execute(sql`select to_jsonb(h) data from accounting_wallet_holds h where order_id=${orderId}`)).rows[0].data;
        const settlements=(await tx.execute(sql`select jsonb_agg(to_jsonb(s) order by id) data from accounting_wallet_settlements s where company_id=${companyId}`)).rows[0].data;
        const fxBefore=(await tx.execute(sql`select coalesce(sum(l.base_credit-l.base_debit),0)::text n from accounting_journal_lines l
          join accounting_journal_entries j on j.id=l.entry_id where j.company_id=${companyId} and j.status='posted'
            and l.account_id in (${accounts.get("FX_GAIN")!},${accounts.get("FX_LOSS")!})`)).rows[0].n;
        const failure=`paid_return_failure_${actorId}`;
        await tx.execute(sql`create function ${sql.identifier(failure)}() returns trigger language plpgsql as
          $$ begin raise exception 'Paid return downstream failure'; end $$`);
        await tx.execute(sql`create trigger ${sql.identifier(failure)} before update on accounting_loading_returns
          for each row execute function ${sql.identifier(failure)}()`);
        await assert.rejects(()=>returnLoadingInvoice(c,actor,tx),e=>/downstream failure/.test(String((e as {cause?:{message?:string}}).cause?.message)));
        assert.deepEqual((await tx.execute(sql`select to_jsonb(w) data from customer_wallets w where id=${customerId}`)).rows[0].data,wallet);
        assert.equal((await tx.execute(sql`select count(*)::integer n from accounting_loading_returns where invoice_id=${c.invoiceId}`)).rows[0].n,0);
        await tx.execute(sql`drop trigger ${sql.identifier(failure)} on accounting_loading_returns`);
        await tx.execute(sql`drop function ${sql.identifier(failure)}()`);
        const result=await returnLoadingInvoice(c,actor,tx);assert.ok(result.customerCreditJournalId);
        assert.equal((await returnLoadingInvoice(c,actor,tx)).duplicate,true);
        const balance=(await tx.execute(sql`select balance::text n from customer_wallets where id=${customerId}`)).rows[0].n;
        assert.equal(decimal(String(balance)).minus(String(wallet.balance)).toFixed(),"50");
        assert.deepEqual((await tx.execute(sql`select to_jsonb(h) data from accounting_wallet_holds h where order_id=${orderId}`)).rows[0].data,hold);
        assert.deepEqual((await tx.execute(sql`select jsonb_agg(to_jsonb(s) order by id) data from accounting_wallet_settlements s where company_id=${companyId}`)).rows[0].data,settlements);
        assert.equal((await tx.execute(sql`select settled_amount::text n from accounting_receivable_items where id=${invoices[2].receivableId}`)).rows[0].n,"50.00000000");
        assert.equal((await tx.execute(sql`select coalesce(sum(l.base_credit-l.base_debit),0)::text n from accounting_journal_lines l
          join accounting_journal_entries j on j.id=l.entry_id where j.company_id=${companyId} and j.status='posted'
            and l.account_id in (${accounts.get("FX_GAIN")!},${accounts.get("FX_LOSS")!})`)).rows[0].n,fxBefore);
        await rejected(()=>reverseJournalEntry(result.customerCreditJournalId!,"2026-06-08","No independent credit reversal",actor,tx),/independently/);
        assert.equal(decimal((await readCreditExposure(companyId,customerId,tx)).openReceivables).toFixed(),"10");
        assert.equal((await tx.execute(sql`select accounting_stock_ledger_reconciled(${companyId}) ok`)).rows[0].ok,true);
        assert.deepEqual((await tx.execute(sql`select to_jsonb(o) data from customer_orders o where id=${orderId}`)).rows[0].data,nativeBefore);
      });
      await t.test(currency+": fully bank-paid returns credit only that invoice, retaining cash receipt and original FX",async()=>{
        const p=(await plans()).rows.find(p=>!p.returned&&decimal(p.originalAmount).eq("10"))!;
        assert.ok(p);
        const receipt=await recordCustomerReceipt({companyId,customerId,currency,sourceId:randomUUID(),entryDate:"2026-06-09",
          method:"BANK",amount:"10",evidenceReference:"Confirmed original bank transfer",reason:"Actual full bank invoice collection",
          allocations:[{receivableId:p.receivableId,amount:"10"}]},actor,tx);
        const original=(await tx.execute(sql`select to_jsonb(r) data from accounting_customer_receipts r where id=${receipt.receipt.id}`)).rows[0].data;
        const allocated=(await tx.execute(sql`select to_jsonb(a) data from accounting_receipt_allocations a where receipt_id=${receipt.receipt.id}`)).rows[0].data;
        const bank=(await tx.execute(sql`select sum(l.base_debit-l.base_credit)::text n from accounting_journal_lines l
          join accounting_journal_entries j on j.id=l.entry_id where j.company_id=${companyId} and j.status='posted' and l.account_id=${accounts.get("BANK")!}`)).rows[0].n;
        const before=(await tx.execute(sql`select balance::text n from customer_wallets where id=${customerId}`)).rows[0].n;
        const cmd={...await command(p.invoiceId,"2026-06-10"),creditToCustomerConfirmed:true as const};
        const returned=await returnLoadingInvoice(cmd,actor,tx);assert.ok(returned.customerCreditJournalId);
        assert.equal(decimal(String((await tx.execute(sql`select balance::text n from customer_wallets where id=${customerId}`)).rows[0].n)).minus(String(before)).toFixed(),"10");
        assert.deepEqual((await tx.execute(sql`select to_jsonb(r) data from accounting_customer_receipts r where id=${receipt.receipt.id}`)).rows[0].data,original);
        assert.deepEqual((await tx.execute(sql`select to_jsonb(a) data from accounting_receipt_allocations a where receipt_id=${receipt.receipt.id}`)).rows[0].data,allocated);
        assert.equal((await tx.execute(sql`select sum(l.base_debit-l.base_credit)::text n from accounting_journal_lines l
          join accounting_journal_entries j on j.id=l.entry_id where j.company_id=${companyId} and j.status='posted' and l.account_id=${accounts.get("BANK")!}`)).rows[0].n,bank);
        const exposure=await readCreditExposure(companyId,customerId,tx);
        assert.equal(decimal(exposure.openReceivables).toFixed(),"0");assert.equal(exposure.reconciled,true);
        await rejected(()=>returnCustomerReceipt(Number(receipt.receipt.id),{sourceId:randomUUID(),entryDate:"2026-06-11",
          evidenceReference:"Cannot refund the same original receipt twice",reason:"Already transferred to customer credit"},actor,tx));
        assert.deepEqual((await tx.execute(sql`select to_jsonb(p) data from shop_products p where id=${productId}`)).rows[0].data,catalogBefore);
      });
      await t.test(currency+": full wallet-paid returns retain original payment, FX, holds and exact historical credit",async()=>{
        const fact=(await recordOperationalEvent(tx,{eventType:"LoadingCompleted",orderId,sourceId:"full-paid-wallet-truck",
          eventDate:"2026-06-11",weighbridgeReference:"Reviewed full-paid invoice goods",actualWeightTons:"0.1",
          lines:[{orderItemId:orderId,actualWeightTons:"0.1"}]},actor)).factId;
        const p=(await readLoadingInvoiceWorkbench({companyId,orderId},tx)).rows.find(p=>p.factId===fact)!;
        assert.deepEqual(p.blockers,[]);
        const issued=await issueLoadingInvoice({companyId,factId:fact,expectedPlanHash:p.planHash,
          reason:"Actual full wallet-paid goods invoice"},actor,tx);
        const payment=await settleWalletReceivable({companyId,walletId:customerId,receivableId:issued.receivableId!,
          holdId:Number(holdBefore.id),sourceId:randomUUID(),entryDate:"2026-06-12",amount:"10",
          reason:"Actual full own-hold invoice settlement"},actor,tx);
        await tx.execute(sql`savepoint unavailable_credit_wallet`);
        await tx.execute(sql`update customer_wallets set status='inactive' where id=${customerId}`);
        assert.ok((await plans()).rows.find(r=>r.invoiceId===issued.invoiceId)!.blockers.includes("CREDIT_WALLET_UNAVAILABLE"));
        await tx.execute(sql`rollback to savepoint unavailable_credit_wallet`);await tx.execute(sql`release savepoint unavailable_credit_wallet`);
        const c={...await command(issued.invoiceId,"2026-06-13"),creditToCustomerConfirmed:true as const};
        const before=(await tx.execute(sql`select balance::text n from customer_wallets where id=${customerId}`)).rows[0].n;
        const plan=(await plans()).rows.find(r=>r.invoiceId===issued.invoiceId)!;
        if(currency==="USD"){
          await tx.execute(sql`update accounting_exchange_rates set rate=2500 where company_id=${companyId}`);
          assert.equal((await plans()).rows.find(r=>r.invoiceId===issued.invoiceId)!.planHash,c.expectedPlanHash);
        }
        const result=await returnLoadingInvoice(c,actor,tx);assert.ok(result.customerCreditJournalId);
        assert.equal(decimal(String((await tx.execute(sql`select balance::text n from customer_wallets where id=${customerId}`)).rows[0].n)).minus(String(before)).toFixed(),"10");
        const actual=(await tx.execute(sql`select sum(base_credit)::text n from accounting_journal_lines where entry_id=${result.customerCreditJournalId}`)).rows[0].n;
        assert.equal(decimal(String(actual)).toFixed(),decimal(plan.customerCredit!.baseAmount).toFixed());
        assert.equal((await tx.execute(sql`select count(*)::integer n from accounting_journal_entries where reversal_of_id=${payment.journalId}`)).rows[0].n,0);
        assert.equal((await tx.execute(sql`select count(*)::integer n from wallet_transactions where reference_type='accounting_journal' and reference_id=${result.customerCreditJournalId}`)).rows[0].n,1);
        assert.equal((await returnLoadingInvoice(c,actor,tx)).duplicate,true);
      });
      if(currency==="USD")await t.test("USD: known zero paid base value is a proven native credit, not missing valuation or a general zero-journal bypass",async()=>{
        await tx.execute(sql`update accounting_exchange_rates set rate=30 where company_id=${companyId}`);
        const fact=(await recordOperationalEvent(tx,{eventType:"LoadingCompleted",orderId,sourceId:"zero-base-paid-credit",
          eventDate:"2026-06-14",weighbridgeReference:"Original fractional measured goods",actualWeightTons:"0.0003",
          lines:[{orderItemId:orderId,actualWeightTons:"0.0003"}]},actor)).factId;
        const p=(await readLoadingInvoiceWorkbench({companyId,orderId},tx)).rows.find(p=>p.factId===fact)!;
        assert.deepEqual(p.blockers,[]);
        const issued=await issueLoadingInvoice({companyId,factId:fact,expectedPlanHash:p.planHash,
          reason:"Original small foreign invoice carrying proof"},actor,tx);
        await settleWalletReceivable({companyId,walletId:customerId,receivableId:issued.receivableId!,
          sourceId:randomUUID(),entryDate:"2026-06-15",amount:"0.01",reason:"Actual partial minor-unit settlement"},actor,tx);
        const plan=(await plans()).rows.find(r=>r.invoiceId===issued.invoiceId)!;
        assert.deepEqual(plan.blockers,[]);assert.equal(decimal(plan.customerCredit!.baseAmount).toFixed(),"0");
        const c={...await command(issued.invoiceId,"2026-06-16"),creditToCustomerConfirmed:true as const};
        const result=await returnLoadingInvoice(c,actor,tx);assert.ok(result.customerCreditJournalId);
        const sums=(await tx.execute(sql`select sum(debit)::text n,sum(base_debit)::text b from accounting_journal_lines
          where entry_id=${result.customerCreditJournalId}`)).rows[0];
        assert.equal(decimal(String(sums.n)).toFixed(),"0.01");assert.equal(decimal(String(sums.b)).toFixed(),"0");
        await rejected(()=>postJournalEntry({companyId,entryDate:"2026-06-16",sourceType:"UnprovenZero",sourceId:randomUUID(),
          description:"No general zero journal exception",lines:[{accountId:accounts.get("BANK")!,currency:"USD",debit:"0.01"},
            {accountId:accounts.get("WALLET_LIABILITY")!,currency:"USD",credit:"0.01",partyType:"customer",partyId:customerId}]},actor,tx));
        assert.equal((await readCreditExposure(companyId,customerId,tx)).reconciled,true);
      });
      finished=true;throw rollback;
    });}catch(error){if(error!==rollback){console.error("Loading return cause:",(error as {cause?:{message?:string}}).cause?.message);throw error;}}
    assert.ok(finished);
  }}finally{await pool.end();}
});
