import test from "node:test";
import assert from "node:assert/strict";
import {randomInt,randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {iraqChart} from "./iraq-chart";
import {postJournalEntry,reverseJournalEntry} from "./postJournalEntry";
import {saveInventoryDocument,actInventoryDocument,readInventoryDocumentMetadata} from "./inventory-documents";
import {stockBookMetadata,registerStockBook} from "./loading-invoice-stock";
import {readLoadingInvoiceWorkbench,issueLoadingInvoice} from "./loading-invoices";
import {recordOperationalEvent} from "./events";
import {linkWallet,recordWalletMovement,prepareWalletOrder,approveWalletOrder} from "./wallet";
test("loading invoice/AR/COGS/own-hold pipeline is guarded and atomic (rollback-only)",
  {skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback=new Error("ROLLBACK_LOADING_INVOICES");let finished=false;
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const role=(await tx.execute(sql`select id from admin_roles where is_active
      and lower(regexp_replace(btrim(name),'[[:space:]-]+','_','g')) in ('super_admin','supper_admin','admin') limit 1`)).rows[0];
    assert.ok(role);
    const actorId=Number((await tx.execute(sql`insert into users(username,email,password_hash,role_id)
      values(${"disabled-loading-fixture-"+randomUUID()},${randomUUID()+"@example.invalid"},'disabled-fixture-hash',${role.id}) returning id`)).rows[0].id);
    const actor={actorId,actorType:"admin" as const,canManage:true};
    const companyId=Number((await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
      values(${"Loading invoice fixture "+randomUUID()},'IQ','Asia/Baghdad','IQD') returning id`)).rows[0].id);
    await tx.execute(sql`insert into accounting_fiscal_years(company_id,name,starts_on,ends_on)
      values(${companyId},'Fixture period','2026-01-01','2026-12-31')`);
    const accounts=new Map<string,number>();
    for(const key of ["BANK","WALLET_LIABILITY","ACCOUNTS_RECEIVABLE","SALES_REVENUE","TAX_PAYABLE","SHIPPING_REVENUE","COGS","INVENTORY","OPENING_BALANCE_EQUITY"]){
      const a=iraqChart.find(x=>x.key===key)!;
      const id=Number((await tx.execute(sql`insert into accounting_accounts(company_id,code,name_ar,name_en,type)
        values(${companyId},${a.code},${a.nameAr},${a.nameEn},${a.type}) returning id`)).rows[0].id);
      accounts.set(key,id);await tx.execute(sql`insert into accounting_posting_rules(company_id,key,account_id) values(${companyId},${key},${id})`);
    }
    await tx.execute(sql`insert into accounting_source_bindings(source_module,company_id,capture_enabled)
      values('shop',${companyId},true) on conflict(source_module) do update set company_id=excluded.company_id,capture_enabled=true`);
    await tx.execute(sql`insert into accounting_wallet_cutovers(company_id,pipeline_ready,enabled_at,opening_reference,reviewed_by)
      values(${companyId},true,'2026-01-01','Rollback-only verified wallet opening',${actorId})`);
    await tx.execute(sql`insert into accounting_receipt_cutovers(company_id,processing_ready) values(${companyId},true)`);
    await tx.execute(sql`insert into accounting_credit_cutovers(company_id,processing_ready,enabled_at,opening_reference,reviewed_by)
      values(${companyId},true,'2026-01-01','Rollback-only verified AR opening',${actorId})`);
    const customerId=1900000000+randomInt(1,1000000),orderId=customerId+2;
    await tx.execute(sql`insert into crm_customers(id,email,first_name,last_name)
      values(${customerId},${randomUUID()+"@example.invalid"},'Loading','Fixture')`);
    await tx.execute(sql`insert into customer_wallets(id,customer_id,balance,currency,credit_limit) values(${customerId},${customerId},0,'IQD',0)`);
    await linkWallet(companyId,customerId,actor,tx);
    await recordWalletMovement("topup",{companyId,walletId:customerId,sourceId:randomUUID(),entryDate:"2026-06-01",
      amount:"1000",channel:"BANK",evidenceReference:"Rollback-only bank receipt",reason:"Rollback-only prepaid funding"},actor,tx);
    const productId=(await readInventoryDocumentMetadata(companyId,tx)).products[0].id;
    const catalogBefore=(await tx.execute(sql`select to_jsonb(p) as data from shop_products p where id=${productId}`)).rows[0].data;
    let doc=await saveInventoryDocument({companyId,sourceId:randomUUID(),kind:"opening",reference:randomUUID(),
      documentDate:"2026-06-01",supplier:"",currency:"IQD",evidenceReference:"Rollback actual stock evidence",notes:"",
      lines:[{productId,batchReference:randomUUID(),quantityTons:"3",totalCost:"100"}]},actor,tx);
    doc=await actInventoryDocument(doc.id,"approve",{companyId,revision:doc.revision,reason:"Review rollback opening evidence"},actor,tx);
    await tx.execute(sql`set constraints accounting_balance_header,accounting_balance_lines deferred`);
    const stock=await postJournalEntry({companyId,entryDate:"2026-06-01",sourceType:"InventoryOpening",sourceId:String(doc.id),
      description:"Rollback-only stock journal",lines:[{accountId:accounts.get("INVENTORY")!,currency:"IQD",debit:"100"},
        {accountId:accounts.get("OPENING_BALANCE_EQUITY")!,currency:"IQD",credit:"100"}]},actor,tx);
    const bookInput={companyId,documentId:doc.id,lineIndex:0,journalId:stock.entry.id,baseCost:"100",evidenceReference:"Rollback checked stock carrying proof"};
    const book=await registerStockBook(bookInput,actor,tx);
    await tx.execute(sql`insert into customer_orders(id,order_number,customer_id,total_amount,currency,shipping_address,
      payment_method,payment_status,created_at,delivery_method,shipping_cost)
      values(${orderId},${"TEST-"+randomUUID()},${customerId},300,'IQD','{}','wallet_full','pending','2026-06-02','personal_pickup',0)`);
    await tx.execute(sql`insert into order_items(id,order_id,product_id,product_name,product_sku,quantity,unit_price,total_price,unit)
      values(${orderId},${orderId},${productId},'Metric fixture','FIXTURE',3,100,300,'tons')`);
    await prepareWalletOrder(orderId,customerId,tx);await approveWalletOrder(orderId,"Rollback-only approval of prepaid hold",actor,tx);
    const facts:number[]=[];
    for(let n=0;n<2;n++)facts.push((await recordOperationalEvent(tx,{eventType:"LoadingCompleted",orderId,
      sourceId:`fixture-truck-${n}`,eventDate:"2026-06-03",weighbridgeReference:`fixture-scale-${n}`,
      actualWeightTons:"1",lines:[{orderItemId:orderId,actualWeightTons:"1"}]},actor)).factId);
    const plans=()=>readLoadingInvoiceWorkbench({companyId,orderId},tx);
    const balance=async()=>String((await tx.execute(sql`select balance::text as b from customer_wallets where id=${customerId}`)).rows[0].b);
    const rejected=async(fn:()=>Promise<unknown>)=>{
      await tx.execute(sql`savepoint rejected_loading`);let err:unknown;
      try{await fn();}catch(e){err=e;}finally{await tx.execute(sql`rollback to savepoint rejected_loading`);await tx.execute(sql`release savepoint rejected_loading`);}
      assert.ok(err,"Expected safe rejection");
    };
    await t.test("closed cutover, wrong scope, missing posted source and invalid actors cannot issue money",async()=>{
      const p=(await plans()).rows.find(x=>x.factId===facts[0])!;
      assert.equal(p.postingAllowed,false);assert.ok(p.blockers.includes("CUTOVER_CLOSED"));assert.equal(p.baseCost,"33");
      await rejected(()=>issueLoadingInvoice({companyId,factId:facts[0],expectedPlanHash:p.planHash,reason:"Blocked fixture issuance"},actor,tx));
      await rejected(()=>registerStockBook({...bookInput,journalId:2147483647},actor,tx));
      await rejected(()=>registerStockBook(bookInput,{...actor,canManage:false},tx));
      await rejected(()=>issueLoadingInvoice({companyId:2147483647,factId:facts[0],expectedPlanHash:p.planHash,reason:"Cross-company fixture"},actor,tx));
      assert.equal(await balance(),"1000.00");
      assert.equal((await tx.execute(sql`select count(*) as n from accounting_loading_invoices where company_id=${companyId}`)).rows[0].n,"0");
      assert.equal((await registerStockBook(bookInput,actor,tx)).duplicate,true);
      assert.equal((await stockBookMetadata(companyId,tx)).books[0].id,book.id);
    });
    // Temporary, reviewed fixture activation is always rolled back.
    await tx.execute(sql`insert into accounting_invoice_cutovers(company_id,processing_ready,starts_on,first_order_id,reviewed_by,evidence_reference)
      values(${companyId},true,'2026-06-01',${orderId},${actorId},'Rollback-only exact inventory and ledger opening reconciliation')`);
    const reason="Issue rollback fixture loading";let issued:Awaited<ReturnType<typeof issueLoadingInvoice>>;
    let firstPlan=(await plans()).rows.find(x=>x.factId===facts[0])!;
    await t.test("chronological FIFO and stale hashes cannot bypass readiness",async()=>{
      assert.deepEqual(firstPlan.blockers,[]);assert.equal(firstPlan.postingAllowed,true);
      const second=(await plans()).rows.find(x=>x.factId===facts[1])!;
      assert.ok(second.blockers.includes("EARLIER_LOADING_PENDING"));
      await rejected(()=>issueLoadingInvoice({companyId,factId:facts[1],expectedPlanHash:second.planHash,reason},actor,tx));
      await rejected(()=>issueLoadingInvoice({companyId,factId:facts[0],expectedPlanHash:"f".repeat(64),reason},actor,tx));
    });
    await t.test("a downstream allocation failure rolls back posted journals, AR, native debit and hold consumption",async()=>{
      const failureName=`accounting_loading_fixture_fail_${actorId}`;
      await tx.execute(sql`create function ${sql.identifier(failureName)}() returns trigger language plpgsql as
        $$ begin raise exception 'Rollback fixture downstream allocation failure'; end $$`);
      await tx.execute(sql`create trigger ${sql.identifier(failureName)} before insert on accounting_stock_consumptions
        for each row execute function ${sql.identifier(failureName)}()`);
      await assert.rejects(()=>issueLoadingInvoice({companyId,factId:facts[0],expectedPlanHash:firstPlan.planHash,reason,settleFromHold:true},actor,tx),
        (error:unknown)=>/downstream allocation failure/.test(String((error as {cause?:{message?:string}}).cause?.message)));
      await tx.execute(sql`drop trigger ${sql.identifier(failureName)} on accounting_stock_consumptions`);
      await tx.execute(sql`drop function ${sql.identifier(failureName)}()`);
      assert.equal(await balance(),"1000.00");
      assert.equal((await tx.execute(sql`select consumed_amount::text as n from accounting_wallet_holds where order_id=${orderId}`)).rows[0].n,"0.00000000");
      assert.equal((await tx.execute(sql`select count(*)::int as n from accounting_loading_invoices where company_id=${companyId}`)).rows[0].n,0);
      assert.equal((await tx.execute(sql`select count(*)::int as n from accounting_journal_entries where company_id=${companyId}
        and source_type in ('LoadingCompleted','LoadingCOGS','WalletSettlement')`)).rows[0].n,0);
    });
    await t.test("invoice, AR, frozen COGS and only this loading hold settle atomically",async()=>{
      issued=await issueLoadingInvoice({companyId,factId:facts[0],expectedPlanHash:firstPlan.planHash,reason,settleFromHold:true},actor,tx);
      assert.ok(issued.journalId);assert.ok(issued.cogsJournalId);assert.ok(issued.settlementId);
      assert.equal(await balance(),"900.00");
      const ar=(await tx.execute(sql`select amount::text,settled_amount::text from accounting_receivable_items where id=${issued.receivableId}`)).rows[0];
      assert.equal(ar.amount,"100.00000000");assert.equal(ar.settled_amount,"100.00000000");
      const h=(await tx.execute(sql`select amount::text,consumed_amount::text,status from accounting_wallet_holds where order_id=${orderId}`)).rows[0];
      assert.equal(h.amount,"300.00000000");assert.equal(h.consumed_amount,"100.00000000");assert.equal(h.status,"active");
      const cost=(await tx.execute(sql`select base_cost::text from accounting_stock_consumptions where invoice_id=${issued.invoiceId}`)).rows[0];
      assert.equal(cost.base_cost,"33.00000000");
      const native=(await tx.execute(sql`select payment_status from customer_orders where id=${orderId}`)).rows[0];
      assert.equal(native.payment_status,"pending");
    });
    await t.test("retry returns the same invoice and never double-debits or rewrites cost; isolated reversal is blocked",async()=>{
      const retry=await issueLoadingInvoice({companyId,factId:facts[0],expectedPlanHash:firstPlan.planHash,reason,settleFromHold:true},actor,tx);
      assert.equal(retry.duplicate,true);assert.equal(retry.invoiceId,issued.invoiceId);assert.equal(await balance(),"900.00");
      await rejected(()=>issueLoadingInvoice({companyId,factId:facts[0],expectedPlanHash:firstPlan.planHash,reason:"Changed retry reason",settleFromHold:true},actor,tx));
      await rejected(()=>reverseJournalEntry(issued.journalId!,"2026-06-04","Attempt isolated invoice reversal",actor,tx));
      await rejected(()=>actInventoryDocument(doc.id,"void",{companyId,revision:doc.revision,reason:"Attempt to discard posted stock proof"},actor,tx));
      await rejected(()=>tx.execute(sql`update accounting_stock_consumptions set base_cost=0 where invoice_id=${issued.invoiceId}`));
    });
    await t.test("second composed invoice preserves cumulative rounding and leaves unpaid AR when not settling",async()=>{
      const p=(await plans()).rows.find(x=>x.factId===facts[1])!;
      assert.deepEqual(p.blockers,[]);assert.equal(p.baseCost,"34");
      const second=await issueLoadingInvoice({companyId,factId:facts[1],expectedPlanHash:p.planHash,reason:"Second rollback loading"},actor,tx);
      assert.equal(second.settlementId,null);assert.equal(await balance(),"900.00");
      assert.equal((await tx.execute(sql`select settled_amount::text as n from accounting_receivable_items where id=${second.receivableId}`)).rows[0].n,"0.00000000");
      assert.deepEqual((await tx.execute(sql`select to_jsonb(p) as data from shop_products p where id=${productId}`)).rows[0].data,catalogBefore);
      assert.equal((await plans()).rows.filter(x=>x.posted).length,2);
    });
    await t.test("late earlier trucks cannot silently change the already-posted FIFO history",async()=>{
      const late=await recordOperationalEvent(tx,{eventType:"LoadingCompleted",orderId,sourceId:"late-earlier-truck",
        eventDate:"2026-06-02",weighbridgeReference:"late-scale-proof",actualWeightTons:"1",
        lines:[{orderItemId:orderId,actualWeightTons:"1"}]},actor);
      const p=(await plans()).rows.find(x=>x.factId===late.factId)!;
      assert.ok(p.blockers.includes("BACKDATED_HISTORY_RECONCILIATION_REQUIRED"));assert.equal(p.postingAllowed,false);
      await rejected(()=>issueLoadingInvoice({companyId,factId:late.factId,expectedPlanHash:p.planHash,reason:"Late loading needs reconciliation"},actor,tx));
      assert.equal(await balance(),"900.00");
    });
    await t.test("late earlier purchase layers and unexplained inventory control balances require reconciliation",async()=>{
      await tx.execute(sql`savepoint late_stock_fixture`);
      let lateDoc=await saveInventoryDocument({companyId,sourceId:randomUUID(),kind:"opening",reference:randomUUID(),
        documentDate:"2026-05-30",supplier:"",currency:"IQD",evidenceReference:"Rollback late stock evidence",notes:"",
        lines:[{productId,batchReference:randomUUID(),quantityTons:"1",totalCost:"10"}]},actor,tx);
      lateDoc=await actInventoryDocument(lateDoc.id,"approve",{companyId,revision:lateDoc.revision,reason:"Review late stock fixture"},actor,tx);
      await tx.execute(sql`set constraints accounting_balance_header,accounting_balance_lines deferred`);
      const j=await postJournalEntry({companyId,entryDate:"2026-05-30",sourceType:"InventoryOpening",sourceId:String(lateDoc.id),
        description:"Rollback-only backdated stock",lines:[{accountId:accounts.get("INVENTORY")!,currency:"IQD",debit:"10"},
          {accountId:accounts.get("OPENING_BALANCE_EQUITY")!,currency:"IQD",credit:"10"}]},actor,tx);
      await rejected(()=>registerStockBook({companyId,documentId:lateDoc.id,lineIndex:0,journalId:j.entry.id,baseCost:"10",
        evidenceReference:"Late stock cannot rewrite FIFO"},actor,tx));
      const open=(await plans()).rows.find(x=>!x.posted)!;
      assert.ok(open.blockers.includes("STOCK_RECONCILIATION_REQUIRED"));
      await tx.execute(sql`rollback to savepoint late_stock_fixture`);await tx.execute(sql`release savepoint late_stock_fixture`);
      assert.equal((await tx.execute(sql`select accounting_stock_ledger_reconciled(${companyId}) as ok`)).rows[0].ok,true);
    });
    await t.test("pausing another financial cutover blocks new issuance without hiding posted history",async()=>{
      await tx.execute(sql`update accounting_receipt_cutovers set processing_ready=false where company_id=${companyId}`);
      const state=await plans();assert.equal(state.activationEnabled,false);assert.equal(state.rows.filter(x=>x.posted).length,2);
      await tx.execute(sql`update accounting_receipt_cutovers set processing_ready=true where company_id=${companyId}`);
    });
    finished=true;throw rollback;
  });}catch(e){if(e!==rollback)throw e;}finally{await pool.end();}
  assert.ok(finished);
});
