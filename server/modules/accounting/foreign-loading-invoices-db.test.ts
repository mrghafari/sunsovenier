import test from "node:test";
import assert from "node:assert/strict";
import {randomInt,randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {iraqChart} from "./iraq-chart";
import {postJournalEntry,reverseJournalEntry} from "./postJournalEntry";
import {saveInventoryDocument,actInventoryDocument,readInventoryDocumentMetadata} from "./inventory-documents";
import {registerStockBook} from "./loading-invoice-stock";
import {readLoadingInvoiceWorkbench,issueLoadingInvoice} from "./loading-invoices";
import {recordOperationalEvent} from "./events";
import {linkWallet,recordWalletMovement,prepareWalletOrder,approveWalletOrder} from "./wallet";
import {approveLoadingShipping} from "./loading-shipping";
import {decimal} from "./money";
test("foreign loading original valuation, stock COGS and historical hold settlement (rollback-only)",
 {skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback=new Error("ROLLBACK_FOREIGN_LOADING");let finished=false;
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const role=(await tx.execute(sql`select id from admin_roles where is_active and
      lower(regexp_replace(btrim(name),'[[:space:]-]+','_','g')) in ('super_admin','supper_admin','admin') limit 1`)).rows[0];
    assert.ok(role);
    const actorId=Number((await tx.execute(sql`insert into users(username,email,password_hash,role_id)
      values(${"disabled-foreign-loading-"+randomUUID()},${randomUUID()+"@example.invalid"},'disabled-fixture-hash',${role.id}) returning id`)).rows[0].id);
    const actor={actorId,actorType:"admin" as const,canManage:true};
    const companyId=Number((await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
      values(${"Foreign loading fixture "+randomUUID()},'IQ','Asia/Baghdad','IQD') returning id`)).rows[0].id);
    await tx.execute(sql`insert into accounting_fiscal_years(company_id,name,starts_on,ends_on)
      values(${companyId},'Rollback period','2026-01-01','2026-12-31')`);
    const accounts=new Map<string,number>();
    for(const key of ["BANK","WALLET_LIABILITY","ACCOUNTS_RECEIVABLE","SALES_REVENUE","TAX_PAYABLE","SHIPPING_REVENUE","COGS","INVENTORY","OPENING_BALANCE_EQUITY","FX_GAIN","FX_LOSS"]){
      const a=iraqChart.find(x=>x.key===key)!;
      const id=Number((await tx.execute(sql`insert into accounting_accounts(company_id,code,name_ar,name_en,type)
        values(${companyId},${a.code},${a.nameAr},${a.nameEn},${a.type}) returning id`)).rows[0].id);
      accounts.set(key,id);await tx.execute(sql`insert into accounting_posting_rules(company_id,key,account_id) values(${companyId},${key},${id})`);
    }
    await tx.execute(sql`insert into accounting_source_bindings(source_module,company_id,capture_enabled)
      values('shop',${companyId},true) on conflict(source_module) do update set company_id=excluded.company_id,capture_enabled=true`);
    await tx.execute(sql`insert into accounting_exchange_rates(company_id,currency,effective_on,rate,source,reference)
      values(${companyId},'USD','2026-06-01',100,'central_bank','Rollback original funding rate'),
      (${companyId},'USD','2026-06-03',150,'central_bank','Rollback original invoice official rate')`);
    await tx.execute(sql`insert into accounting_wallet_cutovers(company_id,pipeline_ready,enabled_at,opening_reference,reviewed_by)
      values(${companyId},true,'2026-01-01','Rollback verified wallet opening',${actorId})`);
    await tx.execute(sql`insert into accounting_receipt_cutovers(company_id,processing_ready) values(${companyId},true)`);
    await tx.execute(sql`insert into accounting_credit_cutovers(company_id,processing_ready,enabled_at,opening_reference,reviewed_by)
      values(${companyId},true,'2026-01-01','Rollback verified receivable opening',${actorId})`);
    const customerId=1900000000+randomInt(1,1000000),orderId=customerId+2;
    await tx.execute(sql`insert into crm_customers(id,email,first_name,last_name)
      values(${customerId},${randomUUID()+"@example.invalid"},'Foreign loading','Fixture')`);
    await tx.execute(sql`insert into customer_wallets(id,customer_id,balance,currency,credit_limit) values(${customerId},${customerId},0,'USD',0)`);
    await linkWallet(companyId,customerId,actor,tx);
    await recordWalletMovement("topup",{companyId,walletId:customerId,sourceId:randomUUID(),entryDate:"2026-06-01",
      amount:"5",channel:"BANK",evidenceReference:"Rollback dated foreign receipt",reason:"Rollback foreign funding"},actor,tx);
    const productId=(await readInventoryDocumentMetadata(companyId,tx)).products[0].id;
    const group=(await tx.execute(sql`select category from shop_products where id=${productId}`)).rows[0].category;
    await tx.execute(sql`insert into accounting_tax_rules(company_id,country_code,product_group,rate_percent,valid_from,is_active)
      values(${companyId},'IQ',${String(group??"default")},100,'2026-01-01',true)`);
    const catalogBefore=(await tx.execute(sql`select to_jsonb(p) as data from shop_products p where id=${productId}`)).rows[0].data;
    let doc=await saveInventoryDocument({companyId,sourceId:randomUUID(),kind:"opening",reference:randomUUID(),
      documentDate:"2026-06-01",supplier:"",currency:"IQD",evidenceReference:"Rollback real base stock source",notes:"",
      lines:[{productId,batchReference:randomUUID(),quantityTons:"3",totalCost:"100"}]},actor,tx);
    doc=await actInventoryDocument(doc.id,"approve",{companyId,revision:doc.revision,reason:"Reviewed rollback stock source"},actor,tx);
    await tx.execute(sql`set constraints accounting_balance_header,accounting_balance_lines deferred`);
    const stock=await postJournalEntry({companyId,entryDate:"2026-06-01",sourceType:"InventoryOpening",sourceId:String(doc.id),
      description:"Rollback original base carrying source",lines:[
        {accountId:accounts.get("INVENTORY")!,currency:"IQD",debit:"100"},
        {accountId:accounts.get("OPENING_BALANCE_EQUITY")!,currency:"IQD",credit:"100"},
      ]},actor,tx);
    await registerStockBook({companyId,documentId:doc.id,lineIndex:0,journalId:stock.entry.id,baseCost:"100",
      evidenceReference:"Rollback approved original inventory carrying"},actor,tx);
    await tx.execute(sql`insert into customer_orders(id,order_number,customer_id,total_amount,currency,shipping_address,
      payment_method,payment_status,created_at,delivery_method,shipping_cost)
      values(${orderId},${"TEST-"+randomUUID()},${customerId},0.09,'USD','{}','wallet_full','pending','2026-06-02','courier',0.03)`);
    await tx.execute(sql`insert into order_items(id,order_id,product_id,product_name,product_sku,quantity,unit_price,total_price,unit)
      values(${orderId},${orderId},${productId},'Rollback metric goods','FIXTURE',3,0.01,0.03,'tons')`);
    await prepareWalletOrder(orderId,customerId,tx);await approveWalletOrder(orderId,"Rollback approved foreign order hold",actor,tx);
    const facts:number[]=[];
    for(let n=0;n<2;n++){
      const fact=await recordOperationalEvent(tx,{eventType:"LoadingCompleted",orderId,sourceId:`foreign-truck-${n}`,
        eventDate:"2026-06-03",weighbridgeReference:`foreign-scale-${n}`,actualWeightTons:"1",
        lines:[{orderItemId:orderId,actualWeightTons:"1"}]},actor);
      facts.push(fact.factId);
      await approveLoadingShipping({companyId,factId:fact.factId,amount:"0.01",
        evidenceReference:"Rollback approved one-truck freight share",reason:"Reviewed actual fixed freight allocation"},actor,tx);
    }
    await tx.execute(sql`insert into accounting_invoice_cutovers(company_id,processing_ready,starts_on,first_order_id,reviewed_by,evidence_reference)
      values(${companyId},true,'2026-06-01',${orderId},${actorId},'Rollback reconciled base stock opening')`);
    const plan=async(fid:number)=>(await readLoadingInvoiceWorkbench({companyId,orderId},tx)).rows.find(p=>p.factId===fid)!;
    const command=async(fid:number)=>({companyId,factId:fid,expectedPlanHash:(await plan(fid)).planHash,
      reason:"Reviewed real foreign loading invoice",settleFromHold:true});
    const remaining=async(id:number)=>decimal(String((await tx.execute(sql`select r.amount-
      coalesce((select sum(s.amount) from accounting_wallet_settlements s where s.receivable_id=r.id),0) as remaining
      from accounting_receivable_items r where r.id=${id}`)).rows[0].remaining)).toFixed();
    const reject=async(fn:()=>Promise<unknown>)=>{
      await tx.execute(sql`savepoint foreign_rejected`);let error:unknown;
      try{await fn();}catch(e){error=e;}finally{await tx.execute(sql`rollback to savepoint foreign_rejected`);await tx.execute(sql`release savepoint foreign_rejected`);}
      assert.ok(error,"Expected safe rejection");
    };
    const nativeBefore=(await tx.execute(sql`select to_jsonb(o) as data from customer_orders o where id=${orderId}`)).rows[0].data;
    await t.test("separate foreign gate is closed even with valid rate, reviewed native hold and stock",async()=>{
      const p=await plan(facts[0]);assert.ok(p.blockers.includes("FOREIGN_INVOICE_CUTOVER_CLOSED"));
      assert.equal(p.foreignValuation?.available,true);
      assert.deepEqual([p.foreignValuation!.baseGoods,p.foreignValuation!.baseTax,p.foreignValuation!.baseShipping,p.foreignValuation!.baseTotal],["2","1","2","5"]);
      assert.equal(p.baseCost,"33");await reject(async()=>issueLoadingInvoice(await command(facts[0]),actor,tx));
    });
    await tx.execute(sql`insert into accounting_foreign_invoice_cutovers(company_id,processing_ready,reviewed_by,evidence_reference)
      values(${companyId},true,${actorId},'Rollback-only reviewed foreign valuation boundary')`);
    await t.test("missing official evidence blocks; supplied base/rate values cannot bypass source evidence",async()=>{
      await tx.execute(sql`savepoint missing_rate`);
      await tx.execute(sql`delete from accounting_exchange_rates where company_id=${companyId} and currency='USD'`);
      assert.ok((await plan(facts[0])).blockers.includes("FOREIGN_INVOICE_VALUATION_REQUIRED"));
      await reject(async()=>issueLoadingInvoice(await command(facts[0]),actor,tx));
      await tx.execute(sql`rollback to savepoint missing_rate`);await tx.execute(sql`release savepoint missing_rate`);
      await reject(async()=>issueLoadingInvoice({...await command(facts[0]),officialRate:"1"},actor,tx));
      await tx.execute(sql`savepoint zero_base`);
      await tx.execute(sql`update accounting_exchange_rates set rate=1 where company_id=${companyId} and currency='USD'`);
      assert.ok((await plan(facts[0])).blockers.includes("FOREIGN_INVOICE_BASE_VALUE_REQUIRED"));
      assert.equal((await plan(facts[0])).foreignValuation,null);
      await reject(async()=>issueLoadingInvoice(await command(facts[0]),actor,tx));
      await tx.execute(sql`rollback to savepoint zero_base`);await tx.execute(sql`release savepoint zero_base`);
    });
    await t.test("a caught downstream failure rolls back the frozen FX proof, journals, AR, stock and native debit",async()=>{
      const name="foreign_loading_failure_"+actorId;
      await tx.execute(sql`create function ${sql.identifier(name)}() returns trigger language plpgsql as
        $$ begin raise exception 'Rollback foreign downstream failure'; end $$`);
      await tx.execute(sql`create trigger ${sql.identifier(name)} before insert on accounting_stock_consumptions for each row execute function ${sql.identifier(name)}()`);
      await assert.rejects(async()=>issueLoadingInvoice(await command(facts[0]),actor,tx),
        (error:unknown)=>String((error as {cause?:{message?:string}}).cause?.message).includes("Rollback foreign downstream failure"));
      assert.equal((await tx.execute(sql`select count(*) as n from accounting_foreign_loading_books where company_id=${companyId}`)).rows[0].n,"0");
      assert.equal((await tx.execute(sql`select count(*) as n from accounting_receivable_items where company_id=${companyId}`)).rows[0].n,"0");
      assert.equal(decimal(String((await tx.execute(sql`select balance from customer_wallets where id=${customerId}`)).rows[0].balance)).toFixed(),"5");
      await tx.execute(sql`drop trigger ${sql.identifier(name)} on accounting_stock_consumptions`);await tx.execute(sql`drop function ${sql.identifier(name)}()`);
    });
    let first:Awaited<ReturnType<typeof issueLoadingInvoice>>|undefined;
    let firstCommand:Awaited<ReturnType<typeof command>>;
    await t.test("native invoice remains exact while base components balance without a fake rounding FX journal",async()=>{
      firstCommand=await command(facts[0]);first=await issueLoadingInvoice(firstCommand,actor,tx);
      const invoiceLines=(await tx.execute(sql`select account_id,currency,debit::text,credit::text,base_debit::text,base_credit::text,valuation_basis
        from accounting_journal_lines where entry_id=${first.journalId}`)).rows;
      assert.equal(invoiceLines.length,4);assert.ok(invoiceLines.every(l=>l.currency==="USD"&&l.valuation_basis==="historical_carrying"));
      assert.equal(invoiceLines.find(l=>Number(l.account_id)===accounts.get("ACCOUNTS_RECEIVABLE"))!.base_debit,"5.00000000");
      assert.equal(invoiceLines.find(l=>Number(l.account_id)===accounts.get("TAX_PAYABLE"))!.base_credit,"1.00000000");
      const cogs=(await tx.execute(sql`select currency,base_debit::text from accounting_journal_lines where entry_id=${first.cogsJournalId} and debit>0`)).rows[0];
      assert.equal(cogs.currency,"IQD");assert.equal(cogs.base_debit,"33.00000000");
      const loss=(await tx.execute(sql`select sum(l.base_debit) as amount from accounting_journal_lines l
        join accounting_journal_entries e on e.id=l.entry_id where e.company_id=${companyId} and e.source_type='WalletSettlement'
        and l.account_id=${accounts.get("FX_LOSS")!}`)).rows[0].amount;
      assert.equal(decimal(String(loss)).toFixed(),"2");
      assert.equal(await remaining(first.receivableId!),"0");
      assert.equal((await tx.execute(sql`select accounting_stock_ledger_reconciled(${companyId}) as ok`)).rows[0].ok,true);
      assert.deepEqual((await tx.execute(sql`select to_jsonb(o) as data from customer_orders o where id=${orderId}`)).rows[0].data,nativeBefore);
      assert.deepEqual((await tx.execute(sql`select to_jsonb(p) as data from shop_products p where id=${productId}`)).rows[0].data,catalogBefore);
    });
    if(!first)throw new Error("First foreign invoice failed; stop dependent fixtures");
    await t.test("retries retain original rate and values; later unposted invoices require a fresh valuation hash",async()=>{
      const oldSecond=await command(facts[1]);
      await tx.execute(sql`update accounting_exchange_rates set rate=600 where company_id=${companyId} and currency='USD' and effective_on='2026-06-03'`);
      assert.equal((await issueLoadingInvoice(firstCommand!,actor,tx)).duplicate,true);
      assert.equal(decimal((await plan(facts[0])).foreignValuation!.officialRate).toFixed(),"150");
      assert.equal((await plan(facts[0])).foreignValuation!.baseTotal,"5");
      await reject(()=>issueLoadingInvoice(oldSecond,actor,tx));
      const secondPlan=await plan(facts[1]);assert.equal(secondPlan.baseCost,"34");assert.equal(secondPlan.foreignValuation!.baseTotal,"18");
      const second=await issueLoadingInvoice(await command(facts[1]),actor,tx);
      assert.equal(await remaining(second.receivableId!),"0");
      await reject(()=>reverseJournalEntry(first!.journalId!,"2026-06-04","No independent reversal of foreign invoice evidence",actor,tx));
      await reject(()=>tx.execute(sql`update accounting_foreign_loading_books set amounts='{}'::jsonb where fact_id=${facts[0]}`));
      assert.equal(decimal(String((await tx.execute(sql`select balance from customer_wallets where id=${customerId}`)).rows[0].balance)).toFixed(),"4.94");
    });
    finished=true;throw rollback;
  });}catch(e){if(e!==rollback){console.error("Foreign loading database cause:",(e as {cause?:{message?:string}}).cause?.message);throw e;}}
  finally{await pool.end();}assert.ok(finished);
});
