import test from "node:test";
import assert from "node:assert/strict";
import {customerAccountLookupSchema,createCustomerAccountSchema,customerAccountCreditLimitSchema} from "@shared/accounting-customer-accounts";
import {createIndependentCustomerAccount} from "./customer-accounts";

test("independent accounts accept exact localized customer codes and explicit zero confirmation",()=>{
  const valid={companyId:1,customerCode:"۹۳۰۰۰۰۶",currency:"IQD",reason:"Explicit independent zero account",independentConfirmed:true};
  const p=createCustomerAccountSchema.parse(valid);
  assert.equal(p.customerCode,"9300006");
  for(const change of [
    {companyId:0},{customerCode:"1300006"},{customerCode:"930000"},{currency:"GBP"},
    {reason:""},{independentConfirmed:false},{balance:"100"},{walletId:1},
  ])assert.equal(createCustomerAccountSchema.safeParse({...valid,...change}).success,false);
  assert.equal(customerAccountLookupSchema.parse({companyId:"1",customerCode:"٩٣٠٠٠٠٦"}).customerCode,"9300006");
});
test("invalid creation fails before database access",async()=>{
  await assert.rejects(()=>createIndependentCustomerAccount({}, {actorId:1,actorType:"admin",canManage:true}),/confirmation/);
});
test("credit policy is explicit nonnegative exact string, never a balance mutation",()=>{
  const valid={companyId:1,walletId:2,creditLimit:"0",reason:"Manager authorization",confirmed:true};
  assert.equal(customerAccountCreditLimitSchema.safeParse(valid).success,true);
  for(const change of [{creditLimit:-1},{creditLimit:"-1"},{creditLimit:250},{confirmed:false},{balance:"10"}])
    assert.equal(customerAccountCreditLimitSchema.safeParse({...valid,...change}).success,false);
});
