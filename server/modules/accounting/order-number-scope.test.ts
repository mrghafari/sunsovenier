import test from "node:test";
import assert from "node:assert/strict";
import {PgDialect} from "drizzle-orm/pg-core";
import {resolveAccountingOrderNumber} from "./order-number-scope";
import type {AccountingTransaction} from "./db";
import {loadingPreviewFiltersSchema} from "@shared/accounting-loading-preview";
import {loadingOrderCopy,loadingOrderError,parseLoadingOrderReference} from "../../../client/src/components/admin/accounting/loading-order-number-copy";

test("loading filters accept business order numbers, normalize scripts and keep namespaces separate",()=>{
  for(const orderNumber of ["M2601287","m2601287"," M۲۶۰۱۲۸۷ ","M٢٦٠١٢٨٧"]){
    const filters=loadingPreviewFiltersSchema.parse({companyId:"1",orderNumber});
    assert.equal(filters.orderNumber,"M2601287");
    assert.equal(filters.orderId,undefined);
  }
  assert.ok(loadingPreviewFiltersSchema.safeParse({companyId:1,orderId:8}).success);
  assert.ok(loadingPreviewFiltersSchema.safeParse({companyId:1}).success);
  for(const filter of [{companyId:1,orderNumber:"8"},{companyId:1,orderNumber:"M2601287",orderId:8},{companyId:1,orderNumber:"M; select 1"}]){
    assert.equal(loadingPreviewFiltersSchema.safeParse(filter).success,false);
  }
});
test("one input accepts either business number or numeric internal ID, including Persian and Arabic digits",()=>{
  for(const input of ["M2601287","m2601287","M۲۶۰۱۲۸۷","M٢٦٠١٢٨٧"])
    assert.deepEqual(parseLoadingOrderReference(input),{orderNumber:"M2601287"});
  for(const input of ["123","۱۲۳","١٢٣"," 123 "])
    assert.deepEqual(parseLoadingOrderReference(input),{orderId:123});
  assert.deepEqual(parseLoadingOrderReference(""),{});
  for(const input of ["0","-1","2147483648","1.5","bogus","M123;","1e3"])
    assert.equal(parseLoadingOrderReference(input),undefined);
});
test("order reference is resolved by exact number with company evidence and no writes",async()=>{
  let query:{sql:string;params:unknown[]}|undefined;
  const tx={execute:async(input:any)=>{
    query=new PgDialect().sqlToQuery(input);
    return {rows:[{id:123,in_scope:true}]};
  }} as unknown as AccountingTransaction;
  assert.equal(await resolveAccountingOrderNumber(tx,1,"M2601287"),123);
  assert.match(query!.sql,/where o\.order_number=/);
  assert.match(query!.sql,/accounting_company_id/);
  assert.match(query!.sql,/accounting_operational_facts/);
  assert.match(query!.sql,/f\.company_id=/);
  assert.deepEqual(query!.params,[1,1,1,"M2601287"]);
  assert.match(query!.sql,/^select /);
});
test("missing, duplicated and other-company orders fail without fallback",async()=>{
  for(const [rows,code] of [
    [[],"ORDER_NOT_FOUND"],[[{id:1,in_scope:false}],"ORDER_SCOPE"],
    [[{id:1,in_scope:true},{id:2,in_scope:true}],"AMBIGUOUS_ORDER"],
  ] as const){
    const tx={execute:async()=>({rows})} as unknown as AccountingTransaction;
    await assert.rejects(()=>resolveAccountingOrderNumber(tx,1,"M2601287"),(e:any)=>e.code===code);
  }
});
test("order lookup failures are explained in four languages",()=>{
  for(const language of ["fa","ar","en","tr"] as const){
    for(const code of ["ORDER_NOT_FOUND","ORDER_SCOPE","AMBIGUOUS_ORDER"]){
      assert.notEqual(loadingOrderError({code},language,"fallback"),"fallback");
      assert.notEqual(loadingOrderError({code},language,"fallback"),code);
    }
    assert.ok(loadingOrderCopy[language].help.includes("M2601287"));
  }
});
