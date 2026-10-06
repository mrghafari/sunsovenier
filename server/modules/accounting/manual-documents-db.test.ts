import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb,type AccountingTransaction} from "./db";
import {pool} from "../../db";
import {AccountingError} from "./access";
import * as s from "./schema";
import {readManualMetadata,readManualDocuments,readManualDocument,saveManualDocument,postManualDocument,discardManualDocument,reverseManualDocument,previewManualDocument} from "./manual-documents";
import {postJournalEntry,reverseJournalEntry} from "./postJournalEntry";
import {readAccountingReport} from "./reports";
import type {ManualDocumentInput} from "@shared/accounting-documents";

test("manual documents, paid expenses and exact reversals (rollback-only)",{skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback=new Error("ROLLBACK_MANUAL_FIXTURE");let completed=false;
  try{
    await accountingDb.transaction(async tx=>{
      await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
      const [c]=await tx.insert(s.accountingCompanies).values({name:`Manual fixture ${randomUUID()}`,countryCode:"IQ",timezone:"Asia/Baghdad",baseCurrency:"IQD"}).returning();
      const [year]=await tx.insert(s.accountingFiscalYears).values({companyId:c.id,name:"Manual year",startsOn:"2026-01-01",endsOn:"2026-12-31"}).returning();
      const [bank,expense,equity,protectedAccount]=await tx.insert(s.accountingAccounts).values([
        {companyId:c.id,code:"B",nameAr:"بنك",nameEn:"Bank",type:"asset"},
        {companyId:c.id,code:"E",nameAr:"مصروف",nameEn:"Expense",type:"expense"},
        {companyId:c.id,code:"Q",nameAr:"رأس المال",nameEn:"Equity",type:"equity"},
        {companyId:c.id,code:"AR",nameAr:"مدين",nameEn:"Controlled AR",type:"asset"},
      ]).returning();
      const [center]=await tx.insert(s.accountingCostCenters).values({companyId:c.id,code:"HQ",nameAr:"مركز",nameEn:"Center"}).returning();
      await tx.insert(s.accountingPostingRules).values([{companyId:c.id,key:"BANK",accountId:bank.id},{companyId:c.id,key:"ACCOUNTS_RECEIVABLE",accountId:protectedAccount.id}]);
      const actor={actorId:1,actorType:"admin" as const,canManage:true};
      const doc:ManualDocumentInput={companyId:c.id,sourceId:randomUUID(),kind:"expense",entryDate:"2026-04-01",
        description:"Verified test paid expense",evidenceReference:"verified-fixture-evidence",
        lines:[{accountId:expense.id,debit:"40",credit:"0",costCenterId:center.id,description:"staff text"},
          {accountId:bank.id,debit:"0",credit:"40",costCenterId:null,description:"bank debit proof"}]};
      async function rejected(run:(inner:AccountingTransaction)=>Promise<unknown>,code?:string){
        await tx.execute(sql`savepoint manual_invalid`);
        try{await assert.rejects(()=>run(tx),e=>!code||e instanceof AccountingError&&e.code===code);}
        finally{await tx.execute(sql`rollback to savepoint manual_invalid`);await tx.execute(sql`release savepoint manual_invalid`);}
      }
      let id=0;
      await t.test("closed cutovers allow true draft CRUD, not any posted money",async()=>{
        const meta=await readManualMetadata(c.id,tx);assert.equal(meta.postingReady,false);assert.equal(meta.manualCutoverReady,false);
        assert.equal(meta.ledgerGuardsReady,true);assert.ok(!meta.accounts.some(a=>a.id===protectedAccount.id));
        const saved=await saveManualDocument({document:doc},actor,tx);id=saved.id;
        assert.equal((await saveManualDocument({document:doc},actor,tx)).duplicate,true);
        const detail=await readManualDocument(id,c.id,tx);assert.equal(detail.row.status,"draft");assert.equal(detail.row.journalId,null);
        assert.equal(detail.history.length,1);assert.equal(detail.preview.balanced,true);assert.equal(detail.postedLines.length,0);
        await rejected(inner=>postManualDocument(id,{companyId:c.id,revision:1,attested:true},actor,inner),"MANUAL_CUTOVER_REQUIRED");
        assert.equal((await tx.execute(sql`select count(*)::integer n from accounting_journal_entries where company_id=${c.id}`)).rows[0].n,0);
        await rejected(inner=>saveManualDocument({document:{...doc,description:"changed same source"}},actor,inner),"IDEMPOTENCY_CONFLICT");
        await rejected(inner=>saveManualDocument({document:{...doc,sourceId:randomUUID()}},{...actor,canManage:false},inner),"ACCESS_DENIED");
        await rejected(inner=>readManualDocument(id,c.id+900000,inner),"NOT_FOUND");
      });
      await t.test("draft edits use optimistic revisions; discard retains audited history without journals",async()=>{
        const temp={...doc,sourceId:randomUUID(),kind:"manual",lines:[{...doc.lines[0],debit:"50"},doc.lines[1]]};
        const saved=await saveManualDocument({document:temp},actor,tx);
        const p=await previewManualDocument(temp,tx);assert.equal(p.balanced,false);assert.equal(p.difference,"10");
        const edited={...temp,description:"Updated evidence description"};
        await saveManualDocument({id:saved.id,revision:1,document:edited},actor,tx);
        assert.equal((await saveManualDocument({id:saved.id,revision:1,document:edited},actor,tx)).duplicate,true);
        await rejected(inner=>saveManualDocument({id:saved.id,revision:1,document:temp},actor,inner),"STALE_REVISION");
        await discardManualDocument(saved.id,{companyId:c.id,revision:2,attested:true},actor,tx);
        assert.equal((await discardManualDocument(saved.id,{companyId:c.id,revision:2,attested:true},actor,tx)).duplicate,true);
        const d=await readManualDocument(saved.id,c.id,tx);assert.equal(d.row.status,"discarded");assert.equal(d.history.length,3);
        await rejected(inner=>saveManualDocument({id:saved.id,revision:3,document:edited},actor,inner),"IMMUTABLE_DOCUMENT");
        const list=await readManualDocuments({companyId:c.id,status:"discarded",pageSize:1},tx);
        assert.equal(list.totalRows,1);assert.equal(list.items.length,1);
      });
      await t.test("unsafe account/center, expense shape and over-precision fail without partial drafts",async()=>{
        await rejected(inner=>saveManualDocument({document:{...doc,sourceId:randomUUID(),lines:[{...doc.lines[0],accountId:protectedAccount.id},doc.lines[1]]}},actor,inner),"ACCOUNT_NOT_ALLOWED");
        await rejected(inner=>saveManualDocument({document:{...doc,sourceId:randomUUID(),lines:[{...doc.lines[0],costCenterId:center.id+900000},doc.lines[1]]}},actor,inner),"COST_CENTER_MISMATCH");
        await rejected(inner=>saveManualDocument({document:{...doc,sourceId:randomUUID(),lines:[{...doc.lines[0],costCenterId:null},doc.lines[1]]}},actor,inner),"EXPENSE_REQUIRED");
        await rejected(inner=>saveManualDocument({document:{...doc,sourceId:randomUUID(),lines:[{...doc.lines[0],debit:"40.123456789"},doc.lines[1]]}},actor,inner));
      });
      await t.test("isolated activation posts exactly once with matching evidence and reporting",async()=>{
        // This company exists only inside this rollback transaction; never enable live cutovers.
        await tx.execute(sql`insert into accounting_manual_cutovers(company_id,processing_ready) values(${c.id},true)`);
        await tx.execute(sql`insert into accounting_receipt_cutovers(company_id,processing_ready) values(${c.id},true)`);
        await tx.execute(sql`insert into accounting_wallet_cutovers(company_id,pipeline_ready,enabled_at,opening_reference,reviewed_by)
          values(${c.id},true,'2026-01-01','Rollback-only test company opening',1)`);
        assert.equal((await readManualMetadata(c.id,tx)).postingReady,true);
        const posted=await postManualDocument(id,{companyId:c.id,revision:1,attested:true},actor,tx);
        assert.equal((await postManualDocument(id,{companyId:c.id,revision:1,attested:true},actor,tx)).duplicate,true);
        const detail=await readManualDocument(id,c.id,tx);assert.equal(detail.row.journalId,posted.journalId);
        assert.equal(detail.row.status,"posted");assert.equal(detail.row.revision,2);assert.equal(detail.postedLines.length,2);
        assert.equal(detail.history.length,2);assert.equal(detail.postedLines[0].costCenterId,center.id);
        const ledger=await readAccountingReport("ledger",{companyId:c.id,accountId:expense.id,from:"2026-04-01",to:"2026-04-01"},tx);
        assert.equal(ledger.pagination.totalRows,1);
        await rejected(inner=>saveManualDocument({id,revision:2,document:doc},actor,inner),"IMMUTABLE_DOCUMENT");
        await rejected(inner=>discardManualDocument(id,{companyId:c.id,revision:2,attested:true},actor,inner),"IMMUTABLE_DOCUMENT");
        await rejected(inner=>postManualDocument(id,{companyId:c.id,revision:99,attested:true},actor,inner),"STALE_REVISION");
      });
      await t.test("exact reversal preserves original ledger and requires date/reason/evidence",async()=>{
        await rejected(inner=>reverseManualDocument(id,{companyId:c.id,revision:2,attested:true,
          entryDate:"2026-03-31",reason:"Actual cancellation proof",evidenceReference:"proof-of-cancellation"},actor,inner),"INVALID_REVERSAL");
        const input={companyId:c.id,revision:2,attested:true,entryDate:"2026-04-02",reason:"Actual cancellation proof",evidenceReference:"proof-of-cancellation"};
        const result=await reverseManualDocument(id,input,actor,tx);
        assert.equal((await reverseManualDocument(id,input,actor,tx)).duplicate,true);
        const d=await readManualDocument(id,c.id,tx);assert.equal(d.row.status,"reversed");assert.equal(d.row.reversalJournalId,result.journalId);
        assert.equal(d.row.revision,3);assert.equal(d.history.length,3);
        const lines=(await tx.execute(sql`select debit::text,credit::text,base_debit::text,base_credit::text,exchange_rate::text
          from accounting_journal_lines where entry_id=${result.journalId} order by id`)).rows;
        assert.equal(Number(lines[0].credit),40);assert.equal(Number(lines[1].debit),40);assert.equal(Number(lines[0].exchange_rate),1);
        await rejected(inner=>reverseManualDocument(id,{...input,reason:"Different cancellation reason"},actor,inner),"IDEMPOTENCY_CONFLICT");
      });
      await t.test("direct posted edits, forged manual journals and unlinked reversals fail closed",async()=>{
        await rejected(async inner=>{await inner.execute(sql`update accounting_manual_documents set input=jsonb_set(input,'{description}','\"tampered text\"'),revision=revision+1 where id=${id}`);});
        await rejected(async inner=>{await inner.execute(sql`delete from accounting_manual_documents where id=${id}`);});
        await rejected(async inner=>{
          await postJournalEntry({companyId:c.id,entryDate:"2026-04-03",description:"Unlinked forged manual",
            sourceType:"ManualJournal",sourceId:randomUUID(),lines:[{accountId:bank.id,currency:"IQD",debit:"1",credit:"0"},{accountId:equity.id,currency:"IQD",debit:"0",credit:"1"}]},actor,inner);
          await inner.execute(sql`set constraints accounting_manual_complete immediate`);
        });
        // Composition: earlier posting made the constraint immediate; a second valid posting must still work.
        const fresh=await saveManualDocument({document:{...doc,sourceId:randomUUID(),entryDate:"2026-04-03"}},actor,tx);
        const next=await postManualDocument(fresh.id,{companyId:c.id,revision:1,attested:true},actor,tx);
        await rejected(async inner=>{
          await reverseJournalEntry(next.journalId,"2026-04-04","Unlinked reversal evidence",actor,inner);
          await inner.execute(sql`set constraints accounting_manual_complete immediate`);
        });
        await tx.execute(sql`update accounting_fiscal_years set status='closed' where id=${year.id}`);
        await rejected(inner=>reverseManualDocument(fresh.id,{companyId:c.id,revision:2,attested:true,entryDate:"2026-04-04",
          reason:"Cannot reverse closed fiscal",evidenceReference:"fiscal-proof-reference"},actor,inner));
      });
      await tx.execute(sql`set constraints all immediate`);completed=true;throw rollback;
    });
  }catch(e){if(e!==rollback)throw e;}
  finally{await pool.end();}
  assert.ok(completed);
});