import test from "node:test";
import assert from "node:assert/strict";
import {PgDialect} from "drizzle-orm/pg-core";
import {readCreditCustomer} from "./credit-customer";
import type {AccountingTransaction} from "./db";
import {creditCustomerLookupSchema} from "@shared/accounting-credit";
import {creditCustomerCopy,creditReadErrorText,CreditReadError} from "../../../client/src/components/admin/accounting/credit-customer-copy";

function fixture(customers:Record<string,unknown>[],wallets:Record<string,unknown>[]=[],company=true){
  const results=[company?[{id:1}]:[],customers,wallets];
  const queries:{sql:string;params:unknown[]}[]=[];
  const dialect=new PgDialect();
  const tx={execute:async(query:any)=>{
    queries.push(dialect.sqlToQuery(query));
    return {rows:results.shift()??[]};
  }} as unknown as AccountingTransaction;
  return {tx,queries};
}
const customer={id:8,customer_code:"9300006",name:"Test customer"};
test("credit customer lookup normalizes business numbers and rejects internal/wallet identities",()=>{
  for(const code of ["9300006","۹۳۰۰۰۰۶","٩٣٠٠٠٠٦"]){
    assert.equal(creditCustomerLookupSchema.parse({companyId:"1",customerCode:code}).customerCode,"9300006");
  }
  for(const customerCode of ["8","930006","8300006","93000060"]){
    assert.equal(creditCustomerLookupSchema.safeParse({companyId:1,customerCode}).success,false);
  }
  assert.equal(creditCustomerLookupSchema.safeParse({companyId:1,customerCode:"9300006",walletId:8}).success,false);
});
test("recognized unlinked customer returns explicit empty account list without writes",async()=>{
  const {tx,queries}=fixture([customer]);
  const result=await readCreditCustomer({companyId:1,customerCode:"۹۳۰۰۰۰۶"},tx);
  assert.equal(result.customer.id,8);
  assert.equal(result.customer.code,"9300006");
  assert.deepEqual(result.wallets,[]);
  assert.equal(result.readOnly,true);
  assert.deepEqual(queries[1].params,["9300006"]);
  assert.deepEqual(queries[2].params,[1,8]);
  assert.ok(queries.every(q=>/^select /i.test(q.sql)));
  assert.match(queries[2].sql,/w\.customer_id=link\.customer_id/);
  assert.match(queries[2].sql,/w\.currency=link\.currency/);
  assert.match(queries[2].sql,/w\.status='active'/);
  assert.match(queries[2].sql,/c\.is_active/);
});
test("lookup retains all linked currency accounts rather than silently picking one",async()=>{
  const {tx}=fixture([customer],[{id:12,currency:"IQD"},{id:15,currency:"USD"}]);
  assert.deepEqual((await readCreditCustomer({companyId:1,customerCode:"9300006"},tx)).wallets,
    [{id:12,currency:"IQD"},{id:15,currency:"USD"}]);
});
test("missing, ambiguous and inactive scopes fail distinctly without fallback",async()=>{
  for(const [customers,company,code] of [
    [[],true,"CUSTOMER_NOT_FOUND"],[[customer,customer],true,"AMBIGUOUS_CUSTOMER"],
    [[customer],false,"COMPANY_NOT_FOUND"],
  ] as const){
    const {tx}=fixture([...customers],[],company);
    await assert.rejects(()=>readCreditCustomer({companyId:1,customerCode:"9300006"},tx),(e:any)=>e.code===code);
  }
  const {tx,queries}=fixture([customer]);
  await assert.rejects(()=>readCreditCustomer({companyId:1,customerCode:"8"},tx),(e:any)=>e.code==="INVALID_CUSTOMER_NUMBER");
  assert.equal(queries.length,0);
});
test("lookup and missing-link errors have explanatory messages in all four languages",()=>{
  for(const language of ["fa","ar","en","tr"]){
    const copy=creditCustomerCopy(language);
    assert.ok(copy.missing.length>100);
    for(const code of ["CUSTOMER_NOT_FOUND","AMBIGUOUS_CUSTOMER","COMPANY_NOT_FOUND","INVALID_CUSTOMER_NUMBER","WALLET_LINK_REQUIRED"]){
      assert.notEqual(creditReadErrorText(new CreditReadError(code),language),code);
      assert.notEqual(creditReadErrorText(new CreditReadError(code),language),copy.errors.failed);
    }
  }
});
