import test from "node:test";
import assert from "node:assert/strict";
import {createPostingWorker,safeWorkerError} from "./posting-worker";
import type {PostingBatchResult} from "@shared/accounting-posting-queue";

const batch=(companyId:number):PostingBatchResult=>({
  companyId,paused:false,processed:1,completed:1,retry:0,review:0,
});

test("worker cannot invent work when no approved company has a reviewed command",async()=>{
  let calls=0;
  const worker=createPostingWorker({listCompanies:async()=>[],
    processCompany:async id=>{calls++;return batch(id);},report:()=>{}});
  assert.equal(worker.status().lastCompletedAt,null);
  await worker.tick();
  assert.equal(calls,0);
  assert.ok(worker.status().lastCompletedAt);
  assert.equal(worker.status().scheduled,false);
});

test("deduplicates companies and isolates a failed company's processing",async()=>{
  const calls:number[]=[],logs:string[]=[];
  const worker=createPostingWorker({listCompanies:async()=>[1,1,2,3],
    async processCompany(id){calls.push(id);if(id===2)throw {cause:{code:"40001"}};return batch(id);},
    report:message=>logs.push(message)});
  await worker.tick();
  assert.deepEqual(calls,[1,2,3]);
  assert.equal(worker.status().lastErrorCode,"40001");
  assert.equal(worker.status().lastCompletedAt,null);
  assert.equal(worker.status().lastBatch.length,2);
  assert.ok(logs.some(log=>log.includes("company=2 error=40001")));
});

test("overlapping ticks share one run and stopping drains its transaction",async()=>{
  let release!:()=>void,calls=0;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const worker=createPostingWorker({listCompanies:async()=>[1],
    async processCompany(id){calls++;await gate;return batch(id);},report:()=>{}});
  const first=worker.tick(),second=worker.tick();
  assert.equal(first,second);
  let stopped=false;
  const stopping=worker.stop().then(()=>{stopped=true;});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(stopped,false);
  assert.equal(calls,1);
  release();
  await Promise.all([first,second,stopping]);
  assert.equal(stopped,true);
  assert.equal(worker.status().running,false);
});

test("worker errors reveal no SQL, personal data or exception messages",async()=>{
  assert.equal(safeWorkerError({message:"private",code:"SELECT private"}),"WORKER_FAILED");
  assert.equal(safeWorkerError(null),"WORKER_FAILED");
  const logs:string[]=[];
  const worker=createPostingWorker({listCompanies:async()=>{throw {code:"private SQL",message:"private"};},
    processCompany:async id=>batch(id),report:message=>logs.push(message)});
  await worker.tick();
  assert.equal(worker.status().lastErrorCode,"WORKER_FAILED");
  assert.ok(logs.every(log=>!log.includes("private")));
});

test("invalid company identities fail before any financial writer runs",async()=>{
  let calls=0;
  const worker=createPostingWorker({listCompanies:async()=>[0],
    processCompany:async id=>{calls++;return batch(id);},report:()=>{}});
  await worker.tick();
  assert.equal(calls,0);
  assert.equal(worker.status().lastErrorCode,"INVALID_COMPANY");
});

test("start is idempotent, paused results are not reported as posted money",async()=>{
  let calls=0;
  const logs:string[]=[];
  const worker=createPostingWorker({listCompanies:async()=>[1],
    processCompany:async id=>{calls++;return {...batch(id),paused:true,processed:0,completed:0};},
    report:message=>logs.push(message)},10_000);
  worker.start();worker.start();
  await worker.stop();
  assert.equal(calls,1);
  assert.equal(logs.filter(log=>log.includes("started;")).length,1);
  assert.ok(!logs.some(log=>log.includes("completed=")));
  assert.equal(worker.status().scheduled,false);
});
