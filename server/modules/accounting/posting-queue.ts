import {createHash,randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {postingQueueSubmitSchema,postingQueueScopeSchema,postingSourceSchema,postingQueueCommandSchema,POSTING_QUEUE_STAGEABLE_BLOCKERS,
  type PostingQueueCommand,type PostingQueueHistory,type PostingBatchResult} from "@shared/accounting-posting-queue";
import type {AccountingAccess} from "@shared/accounting-api";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {assertPipelineManager} from "./loading-invoice-stock";
import {readLoadingPostingPlan,issueLoadingInvoice} from "./loading-invoices";
import {readShipmentPostingPlan,postShipmentCost} from "./shipment-costs";

async function assertQueueGuards(tx:AccountingTransaction){
  const rows=(await tx.execute(sql`select tgname from pg_trigger where tgname in
    ('accounting_posting_queue_guard','accounting_posting_boundary_guard') and not tgisinternal and tgenabled in ('O','A')`)).rows;
  if(rows.length!==2)throw new AccountingError("Posting queue guards missing",503,"QUEUE_GUARDS_MISSING");
}
async function sourcePlan(tx:AccountingTransaction,input:{kind:PostingQueueCommand["kind"];companyId:number;factId:number}){
  return input.kind==="LOADING_INVOICE"?readLoadingPostingPlan(input.companyId,input.factId,tx):
    readShipmentPostingPlan(input.companyId,input.factId,tx);
}
export async function previewQueuedPosting(input:unknown,callerTx?:AccountingTransaction){
  const p=postingSourceSchema.safeParse(input);
  if(!p.success)throw new AccountingError(p.error.issues[0].message);
  const run=(tx:AccountingTransaction)=>sourcePlan(tx,p.data);
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}
export async function enqueueReviewedPosting(input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction){
  const p=postingQueueSubmitSchema.safeParse(input);
  if(!p.success)throw new AccountingError(p.error.issues[0].message);
  const d=p.data,companyId=d.posting.command.companyId;
  const hash=createHash("sha256").update(JSON.stringify(d.posting)).digest("hex");
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    await assertPipelineManager(tx,actor);await assertQueueGuards(tx);
    const old=(await tx.execute(sql`select id,command_hash from accounting_posting_queue
      where company_id=${companyId} and source_id=${d.sourceId}`)).rows[0];
    if(old){
      if(old.command_hash!==hash)throw new AccountingError("Queue identity reused with another command",409,"IDEMPOTENCY_CONFLICT");
      return {id:Number(old.id),duplicate:true};
    }
    const plan=await sourcePlan(tx,{...d.posting.command,kind:d.posting.kind});
    if(plan.posted||plan.blockers.some(x=>!POSTING_QUEUE_STAGEABLE_BLOCKERS.has(x)))
      throw new AccountingError("Original source requires review or is already posted",409,"SOURCE_NOT_READY");
    if(plan.planHash!==d.posting.command.expectedPlanHash)
      throw new AccountingError("Review a fresh source plan",409,"STALE_QUEUE_PLAN");
    const active=(await tx.execute(sql`select id from accounting_posting_queue where company_id=${companyId}
      and kind=${d.posting.kind} and fact_id=${d.posting.command.factId} and status<>'review'`)).rows[0];
    if(active)throw new AccountingError("This source is already queued",409,"SOURCE_ALREADY_QUEUED");
    const row=(await tx.execute(sql`insert into accounting_posting_queue(company_id,source_id,kind,fact_id,posting,
      command_hash,actor_id,actor_type,review_confirmed) values(${companyId},${d.sourceId},${d.posting.kind},
      ${d.posting.command.factId},${JSON.stringify(d.posting)}::jsonb,${hash},${actor.actorId},${actor.actorType},true) returning id`)).rows[0];
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,"after")
      values(${companyId},${actor.actorId},${actor.actorType},'reviewed_posting_queued','posting_queue',${String(row.id)},
      ${JSON.stringify({sourceId:d.sourceId,kind:d.posting.kind,factId:d.posting.command.factId,commandHash:hash})}::jsonb)`);
    return {id:Number(row.id),duplicate:false};
  };
  if(!callerTx)return accountingDb.transaction(run);
  const sp=sql.identifier(`queue_submit_${randomUUID().replaceAll("-","")}`);
  await callerTx.execute(sql`savepoint ${sp}`);
  try{const result=await run(callerTx);await callerTx.execute(sql`release savepoint ${sp}`);return result;}
  catch(e){await callerTx.execute(sql`rollback to savepoint ${sp}`);await callerTx.execute(sql`release savepoint ${sp}`);throw e;}
}
export async function readPostingQueue(input:unknown,callerTx?:AccountingTransaction):Promise<PostingQueueHistory>{
  const p=postingQueueScopeSchema.safeParse(input);
  if(!p.success)throw new AccountingError(p.error.issues[0].message);
  const d=p.data,run=async(tx:AccountingTransaction)=>{
    const company=(await tx.execute(sql`select accounting_posting_enabled(id) enabled from accounting_companies where id=${d.companyId}`)).rows[0];
    if(!company)throw new AccountingError("Company not found",404,"NOT_FOUND");
    const count=(await tx.execute(sql`select count(*)::integer n from accounting_posting_queue where company_id=${d.companyId}`)).rows[0];
    const rows=(await tx.execute(sql`select id,source_id as "sourceId",kind,fact_id as "factId",status,attempts,
      next_attempt_at as "nextAttemptAt",error_code as "errorCode",error_step as "errorStep",result,posting
      from accounting_posting_queue where company_id=${d.companyId} order by id desc
      limit ${d.pageSize} offset ${(d.page-1)*d.pageSize}`)).rows as unknown as PostingQueueHistory["rows"];
    return {companyId:d.companyId,processingEnabled:company.enabled===true,rows,
      pagination:{page:d.page,pageSize:d.pageSize,totalRows:Number(count.n)}};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}
export function postingFailure(error:unknown,attempts:number){
  const e=error as {code?:string;cause?:{code?:string}};
  const raw=String(e?.cause?.code??e?.code??"POSTING_FAILED");
  const code=/^[A-Z0-9_]{1,64}$/.test(raw)?raw:"POSTING_FAILED";
  const transient=new Set(["40001","40P01","08006","08003","57P01","ECONNRESET","ETIMEDOUT","EPIPE"]);
  return {code,status:transient.has(code)&&attempts<5?"retry" as const:"review" as const,
    delaySeconds:Math.min(3600,30*2**Math.max(0,attempts-1))};
}
async function processOne(tx:AccountingTransaction,companyId:number){
  await assertQueueGuards(tx);
  if((await tx.execute(sql`select accounting_posting_enabled(${companyId}) ok`)).rows[0].ok!==true)return {paused:true} as const;
  const q=(await tx.execute(sql`select * from accounting_posting_queue where company_id=${companyId}
    and status in ('pending','retry') and next_attempt_at<=now() order by id for update skip locked limit 1`)).rows[0];
  if(!q)return null;
  const actor:AccountingAccess={actorId:Number(q.actor_id),actorType:String(q.actor_type) as AccountingAccess["actorType"],canManage:true};
  const savepoint=`posting_job_${randomUUID().replace(/-/g,"")}`;
  await tx.execute(sql.raw(`savepoint ${savepoint}`));
  let step="reviewer";
  try{
    await assertPipelineManager(tx,actor);
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    if((await tx.execute(sql`select accounting_posting_enabled(${companyId}) ok`)).rows[0].ok!==true){
      await tx.execute(sql.raw(`release savepoint ${savepoint}`));
      return {paused:true} as const;
    }
    const posting=postingQueueCommandSchema.parse(q.posting);
    await tx.execute(sql`update accounting_posting_queue set status='running',attempts=attempts+1 where id=${Number(q.id)}`);
    step="financial_posting";
    const result=posting.kind==="LOADING_INVOICE"?await issueLoadingInvoice(posting.command,actor,tx):
      await postShipmentCost(posting.command,actor,tx);
    step="completion";
    await tx.execute(sql`update accounting_posting_queue set status='completed',error_code=null,error_step=null,
      result=${JSON.stringify(result)}::jsonb where id=${Number(q.id)}`);
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,"after")
      values(${companyId},${actor.actorId},${actor.actorType},'reviewed_posting_completed','posting_queue',${String(q.id)},
      ${JSON.stringify({result,commandHash:q.command_hash})}::jsonb)`);
    await tx.execute(sql`set constraints all immediate`);
    await tx.execute(sql.raw(`release savepoint ${savepoint}`));
    return {status:"completed" as const,id:Number(q.id)};
  }catch(error){
    await tx.execute(sql.raw(`rollback to savepoint ${savepoint}`));
    await tx.execute(sql.raw(`release savepoint ${savepoint}`));
    const failure=postingFailure(error,Number(q.attempts)+1);
    // The running update rolled back too; persist this attempt and terminal review
    // without retaining ANY failed financial writes.
    if(step==="reviewer"){
      await tx.execute(sql`update accounting_posting_queue set status='review',error_code=${failure.code},
        error_step=${step} where id=${Number(q.id)}`);
      return {status:"review" as const,id:Number(q.id)};
    }
    await tx.execute(sql`update accounting_posting_queue set status='running',attempts=attempts+1 where id=${Number(q.id)}`);
    await tx.execute(sql`update accounting_posting_queue set status=${failure.status},error_code=${failure.code},
      error_step=${step},next_attempt_at=now()+${failure.delaySeconds}*interval '1 second' where id=${Number(q.id)}`);
    return {status:failure.status,id:Number(q.id)};
  }
}
export async function processReviewedPostingBatch(companyId:number,limit=5,callerTx?:AccountingTransaction):Promise<PostingBatchResult>{
  if(!Number.isSafeInteger(companyId)||companyId<=0||!Number.isSafeInteger(limit)||limit<1||limit>10)
    throw new AccountingError("Valid company and bounded batch required");
  const result:PostingBatchResult={companyId,paused:false,processed:0,completed:0,retry:0,review:0};
  for(let i=0;i<limit;i++){
    const row=callerTx?await processOne(callerTx,companyId):await accountingDb.transaction(tx=>processOne(tx,companyId));
    if(!row)break;
    if("paused" in row){result.paused=true;break;}
    result.processed++;result[row.status]++;
  }
  return result;
}
// Prepared consumer: never started by server/index.ts or by an environment flag.
// A future independently approved scheduler may call tick after documentary cutover.
export function createReviewedPostingConsumer(companyIds:number[]){
  return {tick:async()=>{const results:PostingBatchResult[]=[];
    for(const id of [...new Set(companyIds)])results.push(await processReviewedPostingBatch(id));
    return results;
  }};
}
