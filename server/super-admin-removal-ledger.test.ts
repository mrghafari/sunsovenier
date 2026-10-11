import test from "node:test";
import assert from "node:assert/strict";
import { randomInt,randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/neon-serverless";
import { pool } from "./db";
import { cleanupPlan,deleteCleanup } from "./super-admin-cleanup-service";
import { ensureRemovalSchema } from "./super-admin-removal-schema";
import * as schema from "./modules/accounting/schema";
import { iraqChart } from "./modules/accounting/iraq-chart";
import { linkWallet } from "./modules/accounting/wallet";
import { postJournalEntry } from "./modules/accounting/postJournalEntry";
import { registerInvoiceReceivable,recordCustomerReceipt } from "./modules/accounting/receipts";

test("rollback-only posted invoice removal conserves native and historical foreign wallet values", {timeout:180000},async()=>{
  const client=await pool.connect(), originalConnect=pool.connect, query=client.query.bind(client);
  let seq=0; const saves:string[]=[];
  const fixture:any={release(){},async query(input:any,params?:any[]){
    if(input==="BEGIN"){const name=`removal_${++seq}`;saves.push(name);return query(`SAVEPOINT ${name}`);}
    if(input==="COMMIT")return query(`RELEASE SAVEPOINT ${saves.pop()}`);
    if(input==="ROLLBACK"){const name=saves.pop();await query(`ROLLBACK TO SAVEPOINT ${name}`);return query(`RELEASE SAVEPOINT ${name}`);}
    return query(input,params);
  }};
  try{
    await query("BEGIN");
    await query("SET LOCAL lock_timeout='8s'; SELECT pg_advisory_xact_lock(718392,0)");
    await ensureRemovalSchema(fixture);
    const identity=(await query(`SELECT u.id FROM users u JOIN admin_roles r ON r.id=u.role_id
      WHERE u.is_active AND r.is_active AND lower(replace(replace(trim(r.name),' ','_'),'-','_'))
        IN ('super_admin','supper_admin') LIMIT 1`)).rows[0];
    assert.ok(identity,"an active super-admin is needed for this protected-operation probe");
    const actor={actorId:Number(identity.id),actorType:"admin" as const,canManage:true};
    const tx:any=drizzle({client:fixture,schema});
    (pool as any).connect=async()=>fixture;
    const dates=(await query(`SELECT CURRENT_DATE::text today,(CURRENT_DATE-2)::text issued`)).rows[0];
    for(const currency of ["IQD","USD"]){
      await query("SET CONSTRAINTS ALL DEFERRED");
      const company=Number((await query(`INSERT INTO accounting_companies(name,country_code,timezone,base_currency)
        VALUES('Removal rollback fixture','IQ','Asia/Baghdad','IQD') RETURNING id`)).rows[0].id);
      await query(`INSERT INTO accounting_fiscal_years(company_id,name,starts_on,ends_on)
        VALUES($1,'Removal probe','2000-01-01','2100-12-31')`,[company]);
      const mapped=new Map<string,number>();
      for(const a of iraqChart){
        const id=Number((await query(`INSERT INTO accounting_accounts(company_id,code,name_ar,name_en,type)
          VALUES($1,$2,$3,$4,$5) RETURNING id`,[company,a.code,a.nameAr,a.nameEn,a.type])).rows[0].id);
        if(a.key){mapped.set(a.key,id);await query(`INSERT INTO accounting_posting_rules(company_id,key,account_id) VALUES($1,$2,$3)`,[company,a.key,id]);}
      }
      await query(`INSERT INTO accounting_source_bindings(source_module,company_id,capture_enabled) VALUES('shop',$1,true)
        ON CONFLICT(source_module) DO UPDATE SET company_id=excluded.company_id,capture_enabled=true`,[company]);
      await query(`INSERT INTO accounting_wallet_cutovers(company_id,pipeline_ready,enabled_at,opening_reference,reviewed_by)
        VALUES($1,true,now(),'rollback-fixture-approved',$2)`,[company,actor.actorId]);
      await query("INSERT INTO accounting_credit_cutovers(company_id) VALUES($1)",[company]);
      await query("INSERT INTO accounting_receipt_cutovers(company_id,processing_ready) VALUES($1,true)",[company]);
      if(currency==="USD")await query(`INSERT INTO accounting_exchange_rates(company_id,currency,effective_on,rate,source,reference)
        VALUES($1,'USD',$2,2,'central_bank','rollback-invoice-rate'),
          ($1,'USD',$3,3,'central_bank','rollback-current-rate')`,[company,dates.issued,dates.today]);
      const customer=1900000000+randomInt(1,1000000),order=customer+1;
      await query(`INSERT INTO crm_customers(id,email,first_name,last_name) VALUES($1,$2,'Removal','Fixture')`,
        [customer,`${randomUUID()}@example.invalid`]);
      await query(`INSERT INTO customer_wallets(id,customer_id,balance,currency) VALUES($1,$1,0,$2)`,[customer,currency]);
      await linkWallet(company,customer,actor,tx);
      const orderNumber=`M${randomInt(1000000,9999999)}`;
      await query(`INSERT INTO customer_orders(id,order_number,customer_id,total_amount,currency,shipping_address,
        payment_method,payment_status,status) VALUES($1,$2,$3,100,$4,'{}','bank_transfer','pending','pending')`,
        [order,orderNumber,customer,currency]);
      const {entry}=await postJournalEntry({companyId:company,entryDate:dates.issued,sourceType:"SalesInvoice",
        sourceId:`removal-fixture:${order}`,description:"Rollback-only unshipped invoice",lines:[
          {accountId:mapped.get("ACCOUNTS_RECEIVABLE")!,currency,debit:"100",partyType:"customer",partyId:customer},
          {accountId:mapped.get("SALES_REVENUE")!,currency,credit:"100"},
        ]},actor,tx);
      const debt=await registerInvoiceReceivable({companyId:company,customerId:customer,currency,
        invoiceJournalId:entry.id,invoiceReference:orderNumber,dueOn:dates.today,orderId:order},actor,tx);
      await recordCustomerReceipt({companyId:company,customerId:customer,currency,sourceId:`removal-receipt:${order}`,
        entryDate:dates.today,method:"BANK",amount:"60",evidenceReference:"rollback-only-bank-proof",
        reason:"Part payment",allocations:[{receivableId:Number(debt.id),amount:"60"}]},actor,tx);
      const plan=await cleanupPlan("orders",[order],fixture);
      assert.equal(plan.canDelete,true,plan.deletionBlockers.join(","));
      assert.equal(plan.credits[0].creditAmount,"60.00");
      await deleteCleanup("orders",[order],plan.fingerprint,{namespace:"admin",id:String(actor.actorId)});
      await query("SET CONSTRAINTS ALL IMMEDIATE");
      assert.equal(Number((await query("SELECT balance FROM customer_wallets WHERE id=$1",[customer])).rows[0].balance),60);
      const balances=(await query(`SELECT
        coalesce(sum(debit-credit) FILTER(WHERE account_id=$2),0) ar_native,
        coalesce(sum(base_debit-base_credit) FILTER(WHERE account_id=$2),0) ar_base,
        coalesce(sum(credit-debit) FILTER(WHERE account_id=$3),0) wallet_native,
        coalesce(sum(base_credit-base_debit) FILTER(WHERE account_id=$3),0) wallet_base
        FROM accounting_journal_lines l JOIN accounting_journal_entries e ON e.id=l.entry_id
        WHERE e.company_id=$1 AND e.status='posted' AND l.party_id=$4`,
        [company,mapped.get("ACCOUNTS_RECEIVABLE"),mapped.get("WALLET_LIABILITY"),customer])).rows[0];
      assert.equal(Number(balances.ar_native),0);assert.equal(Number(balances.ar_base),0);
      assert.equal(Number(balances.wallet_native),60);
      assert.equal(Number(balances.wallet_base),currency==="USD"?120:60,"uses invoice carrying value, not receipt/current FX");
      assert.equal((await query("SELECT count(*)::int n FROM accounting_customer_receipts WHERE company_id=$1",[company])).rows[0].n,1);
      assert.equal((await query("SELECT count(*)::int n FROM accounting_journal_entries WHERE reversal_of_id=$1",[entry.id])).rows[0].n,1);
    }
  }finally{
    (pool as any).connect=originalConnect;
    await query("ROLLBACK");client.release();await pool.end();
  }
});
