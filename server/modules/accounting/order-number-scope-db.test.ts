import test from "node:test";
import assert from "node:assert/strict";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {resolveAccountingOrderNumber} from "./order-number-scope";
import {readLoadingInvoiceWorkbench} from "./loading-invoices";
import {readLoadingPreviews} from "./loading-previews";

test("real order number resolves for Momtazchem and loading reads match internal scope without financial writes",
  {skip:process.env.ACCOUNTING_ORDER_NUMBER_DB_TEST!=="1",timeout:45000},async()=>{
    try{
      await accountingDb.transaction(async tx=>{
        const company=(await tx.execute(sql`select id from accounting_companies where lower(name)='momtazchem'`)).rows[0];
        assert.ok(company,"Momtazchem must exist");
        const companyId=Number(company.id),orderNumber="M2601287";
        const orderId=await resolveAccountingOrderNumber(tx,companyId,orderNumber);
        const scope={companyId,page:1,pageSize:20};
        const byNumber=await readLoadingInvoiceWorkbench({...scope,orderNumber},tx);
        const byId=await readLoadingInvoiceWorkbench({...scope,orderId},tx);
        assert.deepEqual(byNumber.rows,byId.rows);
        assert.deepEqual(byNumber.pagination,byId.pagination);
        assert.equal(byNumber.filters?.orderNumber,orderNumber);
        assert.equal(byNumber.filters?.orderId,undefined);
        const previews=await readLoadingPreviews({...scope,orderNumber},tx);
        assert.equal(previews.filters.orderNumber,orderNumber);
        assert.ok(previews.rows.every(row=>row.orderId===orderId));
        console.log(`Order recognized; ${byNumber.pagination.totalRows} captured loading facts available`);
      },{accessMode:"read only",isolationLevel:"repeatable read"});
    }finally{await pool.end();}
  });
