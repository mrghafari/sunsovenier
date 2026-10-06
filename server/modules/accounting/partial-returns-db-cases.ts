import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import type {TestContext} from "node:test";
import type {AccountingTransaction} from "./db";
import type {AccountingAccess} from "@shared/accounting-api";
import type {PartialReturnQuote} from "@shared/accounting-partial-returns";
import {readPartialReturnPlan,postPartialReturn,readPartialReturnHistory,readPartialReturnTargets} from "./partial-returns";
import {settleWalletReceivable} from "./wallet-settlement";
import {recordCustomerReceipt} from "./receipts";
import {readCustomerReport} from "./customer-reports";
import {readCarryingLayers} from "./loading-invoice-stock";
import {postJournalEntry,reverseJournalEntry} from "./postJournalEntry";
import {decimal} from "./money";
export async function exercisePartialReturns(t:TestContext,tx:AccountingTransaction,scope:{
  actor:AccountingAccess;companyId:number;customerId:number;orderItemId:number;invoiceId:number;receivableId:number;currency:string;
}){
  const {actor,companyId,customerId,orderItemId,invoiceId,receivableId,currency}=scope;
  async function isolated(name:string,run:()=>Promise<void>){
    await t.test(`${currency}: ${name}`,async()=>{
      await tx.execute(sql`savepoint partial_case`);
      try{await run();}catch(e){console.error("Partial return SQL cause:",(e as {cause?:{message?:string}}).cause?.message);throw e;}
      finally{await tx.execute(sql`rollback to savepoint partial_case`);await tx.execute(sql`release savepoint partial_case`);}
    });
  }
  const goods=(quantityTons:string):PartialReturnQuote=>({kind:"GOODS",companyId,invoiceId,entryDate:"2026-06-04",items:[{orderItemId,quantityTons}]});
  const plan=(q:PartialReturnQuote)=>readPartialReturnPlan(q,tx);
  const open=async()=>String((await tx.execute(sql`select accounting_receivable_open_native(${receivableId},'infinity'::date)::text n`)).rows[0].n);
  const command=async(q:PartialReturnQuote)=>({...q,sourceId:randomUUID(),expectedPlanHash:(await plan(q)).planHash,
    evidenceReference:"Rollback documented partial return "+randomUUID(),reason:"Rollback reviewed actual partial return",
    evidenceConfirmed:true as const,payoutReference:q.kind==="RECEIPT"?randomUUID():""});
  await isolated("partial return gates are independent and stay closed",async()=>{
    const p=await plan(goods("0.4"));assert.ok(p.blockers.includes("PARTIAL_RETURN_GATE_CLOSED"));
    await assert.rejects(postPartialReturn(await command(goods("0.4")),actor,tx),/blocked/);
  });
  await tx.execute(sql`insert into accounting_partial_return_cutovers(company_id,processing_ready,starts_on,reviewed_by,evidence_reference)
    values(${companyId},true,'2026-06-01',${actor.actorId},'Rollback actual reconciled opening and cutover')`);
  if(currency==="IQD")await isolated("unlinked manual AR cannot be mistaken for verified invoice debt",async()=>{
    const accounts=(await tx.execute(sql`select key,account_id from accounting_posting_rules
      where company_id=${companyId} and key in ('ACCOUNTS_RECEIVABLE','BANK')`)).rows;
    const accountId=(key:string)=>Number(accounts.find(x=>x.key===key)!.account_id);
    await postJournalEntry({companyId,sourceType:"ManualARFixture",sourceId:randomUUID(),entryDate:"2026-06-04",
      description:"Rollback unmatched native AR evidence",lines:[
        {accountId:accountId("ACCOUNTS_RECEIVABLE"),currency,debit:"1",credit:"0",partyType:"customer",partyId:customerId},
        {accountId:accountId("BANK"),currency,debit:"0",credit:"1"}]},actor,tx);
    const p=await plan(goods("0.4"));
    assert.ok(p.blockers.includes("PARTIAL_RETURN_AR_RECONCILIATION_REQUIRED"));
    await assert.rejects(postPartialReturn(await command(goods("0.4")),actor,tx),/blocked/);
  });
  await isolated("goods returns reduce this invoice debt first, then credit only excess; original counters persist",async()=>{
    await settleWalletReceivable({companyId,walletId:customerId,receivableId,sourceId:randomUUID(),entryDate:"2026-06-03",
      amount:"60",reason:"Rollback original partial collection"},actor,tx);
    const q=goods("0.4"),p=await plan(q);
    assert.equal(p.valuation.available,true,JSON.stringify(p));
    assert.equal(decimal(p.valuation.debtReduction).toFixed(),"40");assert.equal(decimal(p.valuation.customerCredit).toFixed(),"0");
    const d=await command(q),posted=await postPartialReturn(d,actor,tx);
    assert.equal(decimal(await open()).toFixed(),"0");
    assert.equal((await postPartialReturn(d,actor,tx)).duplicate,true);
    await assert.rejects(postPartialReturn({...d,sourceId:randomUUID(),expectedPlanHash:(await plan(q)).planHash},actor,tx),/unique|reference/i);
    const second=await plan(goods("0.2"));
    assert.equal(decimal(second.valuation.customerCredit).toFixed(),"20");
    await postPartialReturn(await command(goods("0.2")),actor,tx);
    assert.equal(decimal(String((await tx.execute(sql`select settled_amount from accounting_receivable_items where id=${receivableId}`)).rows[0].settled_amount)).toFixed(),"60");
    assert.ok((await readPartialReturnHistory({companyId},tx)).rows.some(x=>x.id===posted.id));
    assert.ok((await readCarryingLayers(tx,companyId)).some(x=>x.hasReturns));
    assert.equal((await tx.execute(sql`select accounting_stock_ledger_reconciled(${companyId}) ok`)).rows[0].ok,true);
    const targets=await readPartialReturnTargets({companyId},tx);assert.ok(targets.invoices.find(x=>x.id===invoiceId));
    const before=await readCustomerReport("receivables-aging",{companyId,customerId,currency,asOf:"2026-06-03"},tx);
    const after=await readCustomerReport("receivables-aging",{companyId,customerId,currency,asOf:"2026-06-04"},tx);
    assert.ok(before.rows.some(x=>x.receivableId===String(receivableId)&&decimal(String(x.outstanding)).eq(40)));
    assert.ok(!after.rows.some(x=>x.receivableId===String(receivableId)));
    await assert.rejects(settleWalletReceivable({companyId,walletId:customerId,receivableId,sourceId:randomUUID(),entryDate:"2026-06-04",
      amount:"1",reason:"Reject overcollection on adjusted invoice"},actor,tx),/exceeds/);
    await assert.rejects(postPartialReturn(await command(goods("0.5")),actor,tx),/blocked/);
    await tx.execute(sql`savepoint independent_return_reversal`);
    await assert.rejects(reverseJournalEntry(posted.journalId,"2026-06-04","Reject independent partial return reversal",actor,tx));
    await tx.execute(sql`rollback to savepoint independent_return_reversal`);
    await tx.execute(sql`release savepoint independent_return_reversal`);
  });
  await isolated("receipt partial return reopens original allocations and supports subsequent real collection without raw counter rewrites",async()=>{
    const receipt=await recordCustomerReceipt({companyId,customerId,currency,sourceId:randomUUID(),entryDate:"2026-06-03",
      method:"BANK",amount:"80",allocations:[{receivableId,amount:"60"}],evidenceReference:"Rollback original actual bank receipt",
      reason:"Rollback original receipt collection"},actor,tx);
    const receiptId=Number(receipt.receipt.id),q:PartialReturnQuote={kind:"RECEIPT",companyId,receiptId,entryDate:"2026-06-04",
      allocations:[{receivableId,amount:"20"}],walletAmount:"10"};
    const p=await plan(q);assert.equal(p.valuation.available,true,JSON.stringify(p));
    const d=await command(q);await postPartialReturn(d,actor,tx);
    assert.equal(decimal(await open()).toFixed(),"60");
    assert.equal((await postPartialReturn(d,actor,tx)).duplicate,true);
    await assert.rejects(postPartialReturn({...await command(q),payoutReference:d.payoutReference},actor,tx),/unique|reference/i);
    await settleWalletReceivable({companyId,walletId:customerId,receivableId,sourceId:randomUUID(),entryDate:"2026-06-04",
      amount:"60",reason:"Rollback recollect actual reopened debt"},actor,tx);
    assert.equal(decimal(await open()).toFixed(),"0");
    assert.equal(decimal(String((await tx.execute(sql`select settled_amount from accounting_receivable_items where id=${receivableId}`)).rows[0].settled_amount)).toFixed(),"60");
    const next={...q,allocations:[{receivableId,amount:"10"}],walletAmount:"0"};
    await postPartialReturn(await command(next),actor,tx);assert.equal(decimal(await open()).toFixed(),"10");
    const report=await readCustomerReport("receivables-aging",{companyId,customerId,currency,asOf:"2026-06-04"},tx);
    assert.ok(report.rows.some(x=>x.receivableId===String(receivableId)&&decimal(String(x.outstanding)).eq(10)));
  });
  await isolated("stale, unauthorized and altered commands roll back locally, final residual quantities conserve value",async()=>{
    const d=await command(goods("0.4"));
    await assert.rejects(postPartialReturn({...d,expectedPlanHash:"f".repeat(64)},actor,tx),/changed/);
    await assert.rejects(postPartialReturn(d,{...actor,canManage:false},tx),/manager/);
    await postPartialReturn(d,actor,tx);
    await assert.rejects(postPartialReturn({...d,reason:"Changed historical return evidence"},actor,tx),/conflicts/);
    await postPartialReturn(await command(goods("0.6")),actor,tx);
    assert.equal(decimal(await open()).toFixed(),"0");
    assert.equal((await tx.execute(sql`select accounting_stock_ledger_reconciled(${companyId}) ok`)).rows[0].ok,true);
    assert.equal((await plan(goods("0.01"))).valuation.available,false);
  });
  await isolated("a native wallet failure rolls back the journal, stock, AR, return proof and audit without aborting the caller",async()=>{
    await settleWalletReceivable({companyId,walletId:customerId,receivableId,sourceId:randomUUID(),entryDate:"2026-06-03",
      amount:"100",reason:"Rollback fully paid invoice before actual goods return"},actor,tx);
    const snapshot=async()=>({open:await open(),...(await tx.execute(sql`select
      (select balance::text from customer_wallets where id=${customerId}) balance,
      (select count(*)::integer from accounting_journal_entries where company_id=${companyId}) journals,
      (select count(*)::integer from accounting_partial_return_books where company_id=${companyId}) books,
      (select count(*)::integer from accounting_audit_logs where company_id=${companyId}) audit`)).rows[0]});
    const before=await snapshot(),d=await command(goods("0.4"));
    await tx.execute(sql.raw(`create function pg_temp.partial_wallet_fail() returns trigger language plpgsql as $$
      begin if NEW.metadata->>'partialReturnId' is not null then
        raise exception 'Rollback injected partial wallet failure'; end if; return NEW; end $$`));
    await tx.execute(sql.raw(`create trigger partial_wallet_failure before insert on wallet_transactions
      for each row execute function pg_temp.partial_wallet_fail()`));
    await assert.rejects(postPartialReturn(d,actor,tx));
    assert.deepEqual(await snapshot(),before);
    await tx.execute(sql.raw(`drop trigger partial_wallet_failure on wallet_transactions`));
    await postPartialReturn(d,actor,tx);
    assert.equal((await tx.execute(sql`select accounting_stock_ledger_reconciled(${companyId}) ok`)).rows[0].ok,true);
  });
}
