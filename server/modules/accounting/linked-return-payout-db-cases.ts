import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import type {TestContext} from "node:test";
import type {AccountingTransaction} from "./db";
import type {AccountingAccess} from "@shared/accounting-api";
import {readPartialReturnPlan,postPartialReturn} from "./partial-returns";
import {recordCustomerReceipt} from "./receipts";
import {readWalletRefundPlan,recordDocumentedWalletRefund,readDocumentedWalletRefunds} from "./wallet-refunds";
import {decimal} from "./money";

export async function exerciseLinkedReturnPayouts(t:TestContext,tx:AccountingTransaction,scope:{
  actor:AccountingAccess;companyId:number;customerId:number;orderItemId:number;invoiceId:number;receivableId:number;currency:string;
}){
  const {actor,companyId,customerId,orderItemId,invoiceId,receivableId,currency}=scope;
  for(const channel of ["BANK","CASH"] as const)await t.test(`${currency}: ${channel} linked return-credit payout never reopens debt or compensates twice`,async()=>{
    await tx.execute(sql`savepoint linked_payout_case`);
    try{
      const walletId=Number((await tx.execute(sql`select wallet_id from accounting_wallet_links
        where company_id=${companyId} and customer_id=${customerId} and currency=${currency}`)).rows[0].wallet_id);
      const receipt=await recordCustomerReceipt({companyId,customerId,currency,sourceId:randomUUID(),entryDate:"2026-06-03",
        method:channel,amount:"60",allocations:[{receivableId,amount:"60"}],
        evidenceReference:"Rollback original actual customer payment",reason:"Rollback documented paid goods"},actor,tx);
      const receiptId=Number(receipt.receipt.id);
      const goods={kind:"GOODS" as const,companyId,invoiceId,entryDate:"2026-06-04",items:[{orderItemId,quantityTons:"0.6"}]};
      const gp=await readPartialReturnPlan(goods,tx);
      assert.equal(decimal(gp.valuation.debtReduction).toFixed(),"40");
      assert.equal(decimal(gp.valuation.walletAmount).toFixed(),"20");
      const returned=await postPartialReturn({...goods,sourceId:randomUUID(),expectedPlanHash:gp.planHash,evidenceConfirmed:true,
        evidenceReference:"Rollback actual goods returned",reason:"Rollback credit after debt-first goods return"},actor,tx);
      const snapshot=async()=>JSON.stringify((await tx.execute(sql`select
        (select to_jsonb(r) from accounting_customer_receipts r where id=${receiptId}) receipt,
        (select to_jsonb(r) from accounting_receivable_items r where id=${receivableId}) receivable,
        (select jsonb_agg(to_jsonb(a)) from accounting_receipt_allocations a where receipt_id=${receiptId}) allocations,
        (select to_jsonb(i) from accounting_loading_invoices i where id=${invoiceId}) invoice`)).rows[0]);
      const originals=await snapshot();
      const quote={companyId,walletId,entryDate:"2026-06-04",channel,amount:"10",goodsReturnId:returned.id,receiptId};
      const before=await readWalletRefundPlan(quote,tx);
      assert.ok(before.blockers.includes("REFUND_GATE_CLOSED"));
      assert.equal(decimal(before.valuation.returnCredit!.availableCredit).toFixed(),"20");
      await tx.execute(sql`insert into accounting_wallet_refund_cutovers(company_id,processing_ready,starts_on,reviewed_by,evidence_reference)
        values(${companyId},true,'2026-06-01',${actor.actorId},'Rollback independently approved documentary payout')`);
      const p=await readWalletRefundPlan(quote,tx);
      assert.equal(p.postingAllowed,true);
      const d={...quote,sourceId:randomUUID(),expectedPlanHash:p.planHash,payoutReference:randomUUID(),
        payoutDocumentConfirmed:true as const,evidenceReference:"Rollback bank payment or actual cash voucher",
        reason:"Rollback payout of already credited goods return"};
      await tx.execute(sql`savepoint linked_late_failure`);
      await tx.execute(sql.raw(`create function accounting_fixture_payout_failure() returns trigger language plpgsql as $$
        begin raise exception 'Fixture late payout failure';end $$;
        create trigger accounting_fixture_payout_failure before insert on accounting_wallet_movements
        for each row execute function accounting_fixture_payout_failure();`));
      const walletBefore=String((await tx.execute(sql`select balance from customer_wallets where id=${walletId}`)).rows[0].balance);
      await assert.rejects(recordDocumentedWalletRefund(d,actor,tx));
      assert.equal(String((await tx.execute(sql`select balance from customer_wallets where id=${walletId}`)).rows[0].balance),walletBefore);
      assert.equal(Number((await tx.execute(sql`select count(*)::integer n from accounting_wallet_refund_books
        where company_id=${companyId}`)).rows[0].n),0);
      await tx.execute(sql`rollback to savepoint linked_late_failure`);await tx.execute(sql`release savepoint linked_late_failure`);
      const result=await recordDocumentedWalletRefund(d,actor,tx);
      assert.equal((await recordDocumentedWalletRefund(d,actor,tx)).duplicate,true);
      assert.equal(await snapshot(),originals,"Original receipt, allocation and invoice evidence must not change");
      assert.equal(decimal(String((await tx.execute(sql`select accounting_receivable_open_native(${receivableId},'infinity'::date)::text n`)).rows[0].n)).toFixed(),"0");
      const history=await readDocumentedWalletRefunds({companyId,walletId},tx);
      assert.equal(history.rows[0].id,result.id);assert.equal(history.rows[0].goodsReturnId,returned.id);
      assert.equal(history.rows[0].receiptId,receiptId);
      await assert.rejects(recordDocumentedWalletRefund({...d,receiptId:2147483647},actor,tx),/different evidence/);
      const remaining=await readWalletRefundPlan(quote,tx);
      assert.equal(decimal(remaining.valuation.returnCredit!.availableCredit).toFixed(),"10");
      assert.ok((await readWalletRefundPlan({...quote,amount:"11"},tx)).blockers.includes("RETURN_CREDIT_EXHAUSTED"));
      assert.ok((await readWalletRefundPlan({...quote,receiptId:2147483647},tx)).blockers.includes("RETURN_CREDIT_LINK_INVALID"));
      const {receiptId:_,...oneLink}=quote;
      assert.ok((await readWalletRefundPlan(oneLink,tx)).blockers.includes("RETURN_CREDIT_LINK_REQUIRED"));
      // An independent withdrawal also consumes the remaining attributable credit.
      const independent={companyId,walletId,entryDate:quote.entryDate,channel,amount:"1"};
      await recordDocumentedWalletRefund({...independent,sourceId:randomUUID(),
        expectedPlanHash:(await readWalletRefundPlan(independent,tx)).planHash,payoutReference:randomUUID(),
        payoutDocumentConfirmed:true,evidenceReference:"Rollback later independent actual payout",reason:"Rollback unrelated withdrawal"},actor,tx);
      assert.ok((await readWalletRefundPlan(quote,tx)).blockers.includes("RETURN_CREDIT_EXHAUSTED"));
      assert.equal(decimal((await readWalletRefundPlan({...quote,amount:"9"},tx)).valuation.returnCredit!.availableCredit).toFixed(),"9");
      const blockedReceipt=await readPartialReturnPlan({kind:"RECEIPT",companyId,receiptId,entryDate:quote.entryDate,
        allocations:[{receivableId,amount:"10"}],walletAmount:"0"},tx);
      assert.equal(blockedReceipt.postingAllowed,false,"The original receipt still cannot be reversed after a goods return");
    }catch(e){console.error("Linked payout SQL cause:",(e as {cause?:{message?:string}}).cause?.message);throw e;}
    finally{await tx.execute(sql`rollback to savepoint linked_payout_case`);await tx.execute(sql`release savepoint linked_payout_case`);}
  });
}
