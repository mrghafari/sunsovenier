import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import type {TestContext} from "node:test";
import type {AccountingTransaction} from "./db";
import type {AccountingAccess} from "@shared/accounting-api";
import {enqueueReviewedPosting,previewQueuedPosting,processReviewedPostingBatch,readPostingQueue} from "./posting-queue";

export async function exercisePostingQueue(t:TestContext,tx:AccountingTransaction,scope:{
  actor:AccountingAccess;companyId:number;factId:number;currency:string;
}){
  const {actor,companyId,factId,currency}=scope;
  async function isolated(name:string,run:()=>Promise<void>){
    await t.test(`${currency}: ${name}`,async()=>{
      await tx.execute(sql`savepoint queue_case`);
      try{await run();}catch(e){console.error("Queue SQL cause:",(e as {cause?:{message?:string}}).cause?.message);throw e;}
      finally{await tx.execute(sql`rollback to savepoint queue_case`);await tx.execute(sql`release savepoint queue_case`);}
    });
  }
  const command=async()=>({sourceId:randomUUID(),reviewConfirmed:true as const,posting:{kind:"LOADING_INVOICE" as const,
    command:{companyId,factId,expectedPlanHash:(await previewQueuedPosting({companyId,factId,kind:"LOADING_INVOICE"},tx)).planHash,
      reason:"Rollback reviewed queued invoice",settleFromHold:false}}});
  const enable=()=>tx.execute(sql`insert into accounting_posting_cutovers(company_id,processing_ready,starts_on,reviewed_by,evidence_reference)
    values(${companyId},true,'2026-06-01',${actor.actorId},'Rollback independently approved worker boundary')`);
  const count=async()=>Number((await tx.execute(sql`select count(*)::integer n from accounting_loading_invoices
    where company_id=${companyId} and fact_id=${factId}`)).rows[0].n);
  await isolated("closed processor stages immutable intent but never posts or recaptures historical events",async()=>{
    const d=await command(),queued=await enqueueReviewedPosting(d,actor,tx);
    assert.equal((await enqueueReviewedPosting(d,actor,tx)).duplicate,true);
    await assert.rejects(enqueueReviewedPosting({...d,posting:{...d.posting,command:{...d.posting.command,reason:"Another command"}}},actor,tx),
      /another command/);
    await assert.rejects(enqueueReviewedPosting({...d,sourceId:randomUUID()},actor,tx),/already queued/);
    await assert.rejects(enqueueReviewedPosting({...d,sourceId:randomUUID()}, {...actor,canManage:false},tx));
    const batch=await processReviewedPostingBatch(companyId,5,tx);
    assert.equal(batch.paused,true);assert.equal(batch.processed,0);assert.equal(await count(),0);
    const history=await readPostingQueue({companyId},tx);
    assert.equal(history.processingEnabled,false);assert.equal(history.rows[0].id,queued.id);
    assert.equal(history.rows[0].status,"pending");assert.equal(history.rows[0].attempts,0);
    await tx.execute(sql`savepoint tamper`);
    await assert.rejects(tx.execute(sql`update accounting_posting_queue set posting=posting||'{"kind":"SHIPMENT_COST"}'::jsonb where id=${queued.id}`));
    await tx.execute(sql`rollback to savepoint tamper`);await tx.execute(sql`release savepoint tamper`);
  });
  await isolated("reviewed source posts and queue completion commit atomically exactly once",async()=>{
    const d=await command();await enqueueReviewedPosting(d,actor,tx);await enable();
    const batch=await processReviewedPostingBatch(companyId,5,tx);
    assert.equal(batch.completed,1);assert.equal(batch.processed,1);assert.equal(await count(),1);
    const h=await readPostingQueue({companyId},tx);
    assert.equal(h.rows[0].status,"completed");assert.equal(h.rows[0].attempts,1);
    assert.ok(h.rows[0].result?.journalId);
    assert.equal((await processReviewedPostingBatch(companyId,5,tx)).processed,0);
    assert.equal((await enqueueReviewedPosting(d,actor,tx)).duplicate,true);
  });
  await isolated("late completion failure rolls back all financial writes and retains terminal review",async()=>{
    const d=await command();await enqueueReviewedPosting(d,actor,tx);await enable();
    const journalCount=Number((await tx.execute(sql`select count(*)::integer n from accounting_journal_entries where company_id=${companyId}`)).rows[0].n);
    await tx.execute(sql.raw(`create function accounting_fixture_queue_failure() returns trigger language plpgsql as $$
      begin if NEW.status='completed' then raise exception 'Fixture completion failure';end if;return NEW;end $$;
      create trigger accounting_fixture_queue_failure before update on accounting_posting_queue
      for each row execute function accounting_fixture_queue_failure();`));
    const batch=await processReviewedPostingBatch(companyId,1,tx);
    assert.equal(batch.review,1);assert.equal(batch.completed,0);assert.equal(await count(),0);
    const h=await readPostingQueue({companyId},tx);
    assert.equal(h.rows[0].status,"review");assert.equal(h.rows[0].attempts,1);assert.equal(h.rows[0].errorStep,"completion");
    assert.equal(h.rows[0].result,null);
    assert.equal(Number((await tx.execute(sql`select count(*)::integer n from accounting_journal_entries
      where company_id=${companyId}`)).rows[0].n),journalCount);
    // A new explicitly reviewed revision can follow terminal review; the failed intent never changes.
    await enqueueReviewedPosting({...d,sourceId:randomUUID()},actor,tx);
    assert.equal((await readPostingQueue({companyId},tx)).rows.length,2);
  });
  await isolated("stale financial boundary stops for review rather than refreshing the accepted command",async()=>{
    await enqueueReviewedPosting(await command(),actor,tx);await enable();
    await tx.execute(sql`update accounting_invoice_cutovers set processing_ready=false where company_id=${companyId}`);
    const batch=await processReviewedPostingBatch(companyId,1,tx);
    assert.equal(batch.review,1);assert.equal(await count(),0);
    assert.equal((await readPostingQueue({companyId},tx)).rows[0].errorCode,"LOADING_INVOICE_BLOCKED");
  });
}
