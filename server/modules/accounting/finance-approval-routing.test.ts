import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {pool} from "../../db";
import {assertLegacyWalletApproval,findCreditApprovalCandidate} from "./finance-approval-routing";

function reader(rows:unknown[]) {
  const queries:{text:string;params:unknown[]}[]=[];
  return {
    queries,
    database:{query:async(text:string,params:unknown[])=>{
      queries.push({text,params});return {rows};
    }} as unknown as Parameters<typeof findCreditApprovalCandidate>[1],
  };
}

test("credit lookup binds the management ID and excludes paid wallet orders",async()=>{
  const fixture=reader([]);
  assert.equal(await findCreditApprovalCandidate("1223",fixture.database),undefined);
  assert.deepEqual(fixture.queries[0].params,["1223"]);
  assert.match(fixture.queries[0].text,/payment_method in \('bank_transfer','cash'\)/);
  assert.match(fixture.queries[0].text,/payment_status is distinct from 'paid'/);
  assert.match(fixture.queries[0].text,/contract_id is null/);
  assert.match(fixture.queries[0].text,/exists\(select 1 from accounting_credit_orders/);
});

test("enrolled or eligible credit orders still use credit approval",async()=>{
  assert.equal(await findCreditApprovalCandidate("20",reader([{id:30}]).database),30);
});

test("verified, already-paid historic wallets retain workflow approval",async()=>{
  await assert.doesNotReject(()=>assertLegacyWalletApproval("20",reader([
    {payment_status:"paid",verified_legacy:true},
  ]).database));
  await assert.doesNotReject(()=>assertLegacyWalletApproval("20",reader([]).database));
});

test("new, linked, unknown, or unpaid wallets cannot fall back to legacy approval",async()=>{
  for(const row of [
    {payment_status:"paid",verified_legacy:false},
    {payment_status:"paid",verified_legacy:null},
    {payment_status:"pending",verified_legacy:true},
  ]) await assert.rejects(()=>assertLegacyWalletApproval("20",reader([row]).database),{
    status:409,code:"WALLET_ORDER_REGISTRATION_REQUIRED",
  });
});

test("storage failures cannot silently grant legacy approval",async()=>{
  const database={query:async()=>{throw new Error("Database unavailable");}} as unknown as Parameters<typeof findCreditApprovalCandidate>[1];
  await assert.rejects(()=>assertLegacyWalletApproval("20",database),/Database unavailable/);
  await assert.rejects(()=>findCreditApprovalCandidate("20",database),/Database unavailable/);
});

test("staff authentication, wallet-first routing, and no repeated wallet movement stay connected",()=>{
  const routes=readFileSync(new URL("../../routes.ts",import.meta.url),"utf8");
  const start=routes.indexOf("app.post('/api/finance/orders/:id/approve',");
  const end=routes.indexOf("app.post('/api/finance/orders/:id/reject',",start);
  const route=routes.slice(start,end);
  assert.match(route,/approve', requireAuth,/);
  assert.ok(route.indexOf("approveWalletOrder(")<route.indexOf("assertLegacyWalletApproval("));
  assert.ok(route.indexOf("assertLegacyWalletApproval(")<route.indexOf("findCreditApprovalCandidate("));
  assert.match(route,/if \(!alreadyPaidWallet && receiptAmount && paidAmount !== orderTotalAmount\)/);
});

test("live database routing regression for the reported order is read-only",
  {skip:process.env.FINANCE_ROUTING_DB_TEST!=="1"},async()=>{
    try {
      assert.equal(await findCreditApprovalCandidate("1223"),undefined);
      await assertLegacyWalletApproval("1223");
    } finally {await pool.end();}
  });
