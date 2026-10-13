import test from "node:test";
import assert from "node:assert/strict";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {readCreditCustomer} from "./credit-customer";

test("real numbered CRM customer lookup uses read-only scope and only existing eligible links",
  {skip:process.env.ACCOUNTING_CUSTOMER_CODE_DB_TEST!=="1",timeout:45000},async()=>{
    try{
      await accountingDb.transaction(async tx=>{
        const customer=(await tx.execute(sql`select id,customer_code from crm_customers
          where customer_code='9300006'`)).rows[0];
        const company=(await tx.execute(sql`select id from accounting_companies where is_active order by id limit 1`)).rows[0];
        assert.ok(customer&&company);
        const companyId=Number(company.id),code=String(customer.customer_code);
        const expected=(await tx.execute(sql`select distinct w.id,w.currency from accounting_wallet_links link
          join customer_wallets w on w.id=link.wallet_id and w.customer_id=link.customer_id and w.currency=link.currency
          join accounting_currencies c on c.code=w.currency and c.is_active
          where link.company_id=${companyId} and link.customer_id=${Number(customer.id)} and w.status='active'
          order by w.currency,w.id`)).rows.map(w=>({id:Number(w.id),currency:String(w.currency)}));
        for(const entered of [code,code.replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[Number(d)]),code.replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[Number(d)])]){
          const result=await readCreditCustomer({companyId,customerCode:entered},tx);
          assert.equal(result.customer.id,Number(customer.id));
          assert.equal(result.customer.code,code);
          assert.deepEqual(result.wallets,expected);
        }
      },{accessMode:"read only",isolationLevel:"repeatable read"});
    }finally{await pool.end();}
  });
