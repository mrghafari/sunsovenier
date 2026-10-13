import test from "node:test";
import assert from "node:assert/strict";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {readCustomerReport} from "./customer-reports";
import {customerReportFiltersSchema} from "@shared/accounting-customer-reports";

test("customer business code resolves read scope without relinking accounts or falling back to an internal ID",
  {skip:process.env.ACCOUNTING_CUSTOMER_CODE_DB_TEST!=="1",timeout:45000},async()=>{
    try{
      await accountingDb.transaction(async tx=>{
        const customer=(await tx.execute(sql`select id,customer_code from crm_customers
          where customer_code ~ '^9[0-9]{6}$' order by id limit 1`)).rows[0];
        const company=(await tx.execute(sql`select id from accounting_companies where is_active order by id limit 1`)).rows[0];
        assert.ok(customer&&company,"An active company and numbered CRM customer are required");
        const code=String(customer.customer_code);
        const scope={companyId:Number(company.id),from:"2026-01-01",to:"2026-12-31"};
        const byId=await readCustomerReport("customer-statement",{...scope,customerId:Number(customer.id)},tx);
        for(const entered of [code,code.replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[Number(d)]),
          code.replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[Number(d)])]){
          const report=await readCustomerReport("customer-statement",{...scope,customerCode:entered},tx);
          assert.equal(report.customer?.id,Number(customer.id));
          assert.equal(report.customer?.code,code);
          assert.equal(report.filters.customerCode,code);
          assert.equal(report.filters.customerId,undefined);
          assert.ok(customerReportFiltersSchema.safeParse(report.filters).success);
          assert.deepEqual(report.rows,byId.rows);
          assert.deepEqual(report.balances,byId.balances);
          const aging=await readCustomerReport("receivables-aging",
            {companyId:Number(company.id),customerCode:entered,asOf:"2026-12-31"},tx);
          assert.equal(aging.customer?.id,Number(customer.id));
        }
        const missing=(await tx.execute(sql`select s::text as code from generate_series(9999000,9999999) s
          where not exists(select 1 from crm_customers c where c.customer_code=s::text) limit 1`)).rows[0];
        assert.ok(missing);
        await assert.rejects(()=>readCustomerReport("customer-statement",
          {...scope,customerCode:String(missing.code)},tx),(error:any)=>error.code==="NOT_FOUND");
      },{accessMode:"read only",isolationLevel:"repeatable read"});
    }finally{await pool.end();}
  });
