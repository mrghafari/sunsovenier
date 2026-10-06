import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import * as s from "./schema";
import {readAccountingAudit,accountingAuditCsv} from "./audit-reports";
test("audit metadata scope, company-local dates, paging and private snapshots (rollback-only)",
  {skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback=new Error("ROLLBACK_AUDIT_REPORT");let complete=false;
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    let currency="";
    do{currency="Z"+[...randomUUID().slice(0,2)].map(x=>String.fromCharCode(65+parseInt(x,16))).join("");}
    while((await tx.execute(sql`select 1 from accounting_currencies where code=${currency}`)).rows.length);
    await tx.insert(s.accountingCurrencies).values({code:currency,name:"Audit temporary currency",decimals:0});
    const [c,other]=await tx.insert(s.accountingCompanies).values([
      {name:"Audit "+randomUUID(),countryCode:"IR",timezone:"Asia/Tehran",baseCurrency:currency},
      {name:"Other audit "+randomUUID(),countryCode:"IQ",timezone:"Asia/Baghdad",baseCurrency:currency},
    ]).returning();
    const filters={companyId:c.id,from:"2026-10-04",to:"2026-10-04",page:1,pageSize:1};
    await tx.insert(s.accountingAuditLogs).values([
      {companyId:c.id,actorId:0,actorType:"system",action:"opening_probe",entityType:"company",entityId:"1",createdAt:new Date("2026-10-03T20:30:00Z"),
        after:{privateMarker:"never-output"}},
      {companyId:c.id,actorId:1,actorType:"admin",action:"save%_account",entityType:"account",entityId:"=bad",createdAt:new Date("2026-10-04T20:29:59Z")},
      {companyId:c.id,actorId:2,actorType:"custom",action:"outside",entityType:"account",entityId:"2",createdAt:new Date("2026-10-04T20:30:00Z")},
      {companyId:other.id,actorId:1,actorType:"admin",action:"other-company",entityType:"company",entityId:"2",createdAt:new Date("2026-10-04T12:00:00Z")},
      {companyId:null,actorId:0,actorType:"system",action:"global-action",entityType:"company",entityId:"0",createdAt:new Date("2026-10-04T12:00:00Z")},
    ]);
    await t.test("company-local midnight is inclusive and next midnight exclusive",async()=>{
      const r=await readAccountingAudit(filters,tx);assert.equal(r.pagination.totalRows,2);
      assert.equal(r.rows.length,1);assert.equal(r.rows[0].action,"save%_account");
      assert.equal(r.dateBasis,"company-local-day");assert.equal(r.company.timezone,"Asia/Tehran");
      assert.equal(r.includesGlobalActions,false);
    });
    await t.test("actor zero and exact literal action filters are supported",async()=>{
      const system=await readAccountingAudit({...filters,actorId:0},tx);assert.equal(system.rows[0].action,"opening_probe");
      assert.equal(system.rows[0].actorId,0);
      const literal=await readAccountingAudit({...filters,action:"save%_account"},tx);assert.equal(literal.pagination.totalRows,1);
      assert.equal((await readAccountingAudit({...filters,action:"save"},tx)).pagination.totalRows,0);
      assert.equal((await readAccountingAudit({...filters,actorType:"custom"},tx)).pagination.totalRows,0);
    });
    await t.test("full export is scope-wide, sanitized, and never exposes snapshot payloads",async()=>{
      const r=await readAccountingAudit(filters,tx,true);assert.equal(r.rows.length,2);
      assert.ok(r.rows.some(x=>x.hasAfter));assert.equal(r.snapshotPayloadsExposed,false);
      assert.ok(r.rows.every(x=>!("before" in x)&&!("after" in x)));
      const csv=accountingAuditCsv(r);assert.match(csv,/'=bad/);
      assert.ok(!csv.includes("never-output"));assert.ok(!JSON.stringify(r).includes("privateMarker"));
      const second=await readAccountingAudit({...filters,page:2},tx);assert.equal(second.rows[0].action,"opening_probe");
    });
    await t.test("unknown companies/filter mutations fail and no records are written by readers",async()=>{
      const before=Number((await tx.execute(sql`select count(*) n from accounting_audit_logs where company_id=${c.id}`)).rows[0].n);
      await readAccountingAudit(filters,tx);await readAccountingAudit(filters,tx,true);
      const after=Number((await tx.execute(sql`select count(*) n from accounting_audit_logs where company_id=${c.id}`)).rows[0].n);
      assert.equal(before,after);
      await assert.rejects(()=>readAccountingAudit({...filters,companyId:2147483647},tx),/not found/);
      await assert.rejects(()=>readAccountingAudit({...filters,post:true},tx),/Unrecognized key/);
    });
    await tx.execute(sql`set constraints all immediate`);complete=true;throw rollback;
  });}catch(e){if(e!==rollback)throw e;}finally{await pool.end();}assert.ok(complete);
});