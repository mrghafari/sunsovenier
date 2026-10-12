import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {processReviewedPostingBatch} from "./posting-queue";
import type {PostingBatchResult} from "@shared/accounting-posting-queue";

export interface PostingWorkerDependencies {
  listCompanies: () => Promise<number[]>;
  processCompany: (companyId:number) => Promise<PostingBatchResult>;
  report: (message:string) => void;
}

export function safeWorkerError(error:unknown):string {
  const e=error as {code?:unknown;cause?:{code?:unknown}} | null;
  const code=String(e?.cause?.code??e?.code??"WORKER_FAILED");
  return /^[A-Z0-9_]{1,64}$/.test(code)?code:"WORKER_FAILED";
}

/** Only reviewed commands. Never creates commands, enables a company or invents a reviewer. */
export function createPostingWorker(deps:PostingWorkerDependencies,intervalMs=30_000) {
  if(!Number.isSafeInteger(intervalMs)||intervalMs<10)throw new Error("Invalid posting worker interval");
  let timer:ReturnType<typeof setInterval>|undefined;
  let inFlight:Promise<void>|undefined;
  let lastAttemptAt:string|null=null;
  let lastCompletedAt:string|null=null;
  let lastErrorCode:string|null=null;
  let lastBatch:PostingBatchResult[]=[];

  async function run() {
    lastAttemptAt=new Date().toISOString();
    lastErrorCode=null;
    lastBatch=[];
    try {
      const companies=[...new Set(await deps.listCompanies())];
      if(companies.some(id=>!Number.isSafeInteger(id)||id<1))
        throw Object.assign(new Error("Invalid company list"),{code:"INVALID_COMPANY"});
      for(const id of companies) {
        try {
          const result=await deps.processCompany(id);
          lastBatch.push(result);
          if(result.processed)deps.report(`[ACCOUNTING WORKER] company=${id} completed=${result.completed} retry=${result.retry} review=${result.review}`);
        } catch(error) {
          lastErrorCode=safeWorkerError(error);
          deps.report(`[ACCOUNTING WORKER] company=${id} error=${lastErrorCode}`);
        }
      }
      if(!lastErrorCode)lastCompletedAt=new Date().toISOString();
    } catch(error) {
      lastErrorCode=safeWorkerError(error);
      deps.report(`[ACCOUNTING WORKER] error=${lastErrorCode}`);
    }
  }

  function tick():Promise<void> {
    if(inFlight)return inFlight;
    inFlight=run().finally(()=>{inFlight=undefined;});
    return inFlight;
  }
  return {
    tick,
    start() {
      if(timer)return;
      timer=setInterval(()=>{void tick();},intervalMs);
      timer.unref();
      deps.report("[ACCOUNTING WORKER] started; only reviewed commands in approved active companies");
      void tick();
    },
    async stop() {
      if(timer)clearInterval(timer);
      timer=undefined;
      await inFlight;
    },
    status() {
      return {scheduled:timer!==undefined,running:inFlight!==undefined,intervalMs,
        lastAttemptAt,lastCompletedAt,lastErrorCode,lastBatch:[...lastBatch]};
    },
  };
}

export const postingWorker=createPostingWorker({
  async listCompanies() {
    // A read-only selector; the existing transactional handler rechecks the
    // cutover, original reviewer, documentary plan, FX and source before posting.
    const result=await accountingDb.execute(sql`
      select q.company_id from accounting_posting_queue q
      join accounting_companies c on c.id=q.company_id and c.is_active
      where q.review_confirmed and q.status in ('pending','retry')
        and q.next_attempt_at<=now() and accounting_posting_enabled(c.id)
      group by q.company_id order by min(q.next_attempt_at),q.company_id limit 20`);
    return result.rows.map(row=>Number(row.company_id));
  },
  processCompany:companyId=>processReviewedPostingBatch(companyId,5),
  report:message=>console.log(message),
});
