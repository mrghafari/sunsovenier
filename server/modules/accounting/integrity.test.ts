import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sql, eq } from "drizzle-orm";
import { accountingDb, type AccountingTransaction } from "./db";
import { pool } from "../../db";
import * as s from "./schema";
import { postJournalEntry, reverseJournalEntry } from "./postJournalEntry";
import {accountingSettingsSchemas} from "@shared/accounting-api";

// Opt-in: all fixtures, journal entries and audit rows are rolled back together.
test("live accounting database integrity (rollback-only)", {skip:process.env.ACCOUNTING_DB_TEST!=="1"}, async t => {
  const rollback = new Error("ROLLBACK_TEST_FIXTURES");
  let completed = false;
  try {
    await accountingDb.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(718392, 0)`);
      await tx.execute(sql`set constraints accounting_balance_header, accounting_balance_lines immediate`);
      const [company] = await tx.insert(s.accountingCompanies).values({
        name:`Integrity test ${randomUUID()}`,countryCode:"IQ",timezone:"Asia/Baghdad",baseCurrency:"IQD",
      }).returning();
      const [year] = await tx.insert(s.accountingFiscalYears).values({
        companyId:company.id,name:"Test year",startsOn:"2026-01-01",endsOn:"2026-12-31",
      }).returning();
      const [bank,revenue,wallet] = await tx.insert(s.accountingAccounts).values([
        {companyId:company.id,code:"1",nameEn:"Test bank",nameAr:"اختبار",type:"asset"},
        {companyId:company.id,code:"2",nameEn:"Test revenue",nameAr:"اختبار",type:"revenue"},
        {companyId:company.id,code:"3",nameEn:"Test wallet",nameAr:"اختبار",type:"liability"},
      ]).returning();
      const actor = {actorId:1,actorType:"admin" as const,canManage:true};
      await t.test("Persian-only account/center names and exact IRR journals without toman conversion",async()=>{
        const [iran]=await tx.insert(s.accountingCompanies).values({
          name:"آزمون موقت ریالی",countryCode:"IR",timezone:"Asia/Tehran",baseCurrency:"IRR",
        }).returning();
        await tx.insert(s.accountingFiscalYears).values({companyId:iran.id,name:"دوره آزمون",startsOn:"2026-01-01",endsOn:"2026-12-31"});
        const [asset,sales]=await tx.insert(s.accountingAccounts).values([
          accountingSettingsSchemas.accounts.parse({companyId:iran.id,code:"FA1",nameFa:"بانک ریالی",type:"asset"}),
          accountingSettingsSchemas.accounts.parse({companyId:iran.id,code:"FA2",nameFa:"درآمد فروش",type:"revenue"}),
        ]).returning();
        const [center]=await tx.insert(s.accountingCostCenters).values(
          accountingSettingsSchemas["cost-centers"].parse({companyId:iran.id,code:"FA",nameFa:"مرکز هزینه فارسی"})
        ).returning();
        assert.equal(asset.nameFa,"بانک ریالی");assert.equal(asset.nameAr,"");
        assert.equal(center.nameFa,"مرکز هزینه فارسی");
        const amount="10000000000000001";
        const {entry}=await postJournalEntry({companyId:iran.id,entryDate:"2026-06-01",
          description:"آزمون ریال؛ بدون تبدیل به تومان",sourceType:"Test",sourceId:randomUUID(),
          lines:[{accountId:asset.id,currency:"IRR",debit:amount,credit:"0"},
            {accountId:sales.id,currency:"IRR",debit:"0",credit:amount}]},actor,tx);
        const line=(await tx.select().from(s.accountingJournalLines).where(eq(s.accountingJournalLines.entryId,entry.id))).find(l=>l.accountId===asset.id)!;
        assert.equal(line.currency,"IRR");assert.equal(line.debit,amount+".00000000");
        assert.equal(line.exchangeRate,"1.000000000000");
        assert.equal(line.baseDebit,amount+".00000000");
        assert.equal((await tx.execute(sql`select count(*)::int as n from accounting_exchange_rates where company_id=${iran.id}`)).rows[0].n,0);
        await fails(tx=>postJournalEntry({companyId:iran.id,entryDate:"2026-06-01",sourceType:"Test",sourceId:randomUUID(),
          description:"Invalid fractional rial",lines:[{accountId:asset.id,currency:"IRR",debit:"0.1",credit:"0"},
            {accountId:sales.id,currency:"IRR",debit:"0",credit:"0.1"}]},actor,tx));
        await fails(tx=>postJournalEntry({companyId:iran.id,entryDate:"2026-06-01",sourceType:"Test",sourceId:randomUUID(),
          description:"Missing official USD/IRR rate",lines:[{accountId:asset.id,currency:"USD",debit:"1",credit:"0"},
            {accountId:sales.id,currency:"USD",debit:"0",credit:"1"}]},actor,tx));
      });
      const input = {
        companyId:company.id,entryDate:"2026-06-01",description:"Rollback-only fixture",sourceType:"Test",sourceId:randomUUID(),
        lines:[{accountId:bank.id,currency:"IQD",debit:"100",credit:"0"},{accountId:revenue.id,currency:"IQD",debit:"0",credit:"100"}],
      };
      async function fails(action:(tx:AccountingTransaction)=>Promise<unknown>, pattern?:RegExp) {
        await tx.execute(sql`savepoint expected_failure`);
        let error:unknown;
        try { await action(tx); } catch (e) { error=e; }
        await tx.execute(sql`rollback to savepoint expected_failure`);
        await tx.execute(sql`release savepoint expected_failure`);
        assert.ok(error,"Invalid operation unexpectedly succeeded");
        if (pattern) {
          const messages:string[] = [];
          let current:unknown = error;
          const seen = new Set<unknown>();
          while (current instanceof Error && !seen.has(current)) {
            seen.add(current); messages.push(current.message);
            current = (current as Error & {cause?:unknown}).cause;
          }
          assert.match(messages.join("\n"),pattern);
        }
      }
      let entryId = 0;
      await t.test("atomic posting and stable idempotency",async()=>{
        const posted = await postJournalEntry(input,actor,tx);
        entryId = posted.entry.id;
        assert.equal(posted.duplicate,false);
        const duplicate = await postJournalEntry(input,actor,tx);
        assert.equal(duplicate.entry.id,entryId); assert.equal(duplicate.duplicate,true);
        await fails(inner=>postJournalEntry({...input,description:"Changed payload"},actor,inner),/identity|different/i);
        const balance = await tx.execute(sql`select sum(base_debit)::text as debit,sum(base_credit)::text as credit
          from accounting_journal_lines where entry_id=${entryId}`);
        assert.equal(balance.rows[0].debit,balance.rows[0].credit);
      });
      await t.test("posted headers cannot be updated or deleted at DB level",async()=>{
        await fails(inner=>inner.execute(sql`update accounting_journal_entries set description='tampered' where id=${entryId}`),/immutable/i);
        await fails(inner=>inner.execute(sql`delete from accounting_journal_entries where id=${entryId}`),/immutable/i);
      });
      await t.test("posted lines cannot be inserted, updated, moved or deleted",async()=>{
        await fails(inner=>inner.execute(sql`update accounting_journal_lines set debit=101 where entry_id=${entryId}`),/immutable/i);
        await fails(inner=>inner.execute(sql`delete from accounting_journal_lines where entry_id=${entryId}`),/immutable/i);
        await fails(inner=>inner.insert(s.accountingJournalLines).values({
          entryId,accountId:bank.id,currency:"IQD",exchangeRate:"1",debit:"1",credit:"0",baseDebit:"1",baseCredit:"0",
        }),/draft/i);
      });
      await t.test("direct SQL cannot post an unbalanced journal",async()=>{
        await fails(async inner=>{
          const [draft] = await inner.insert(s.accountingJournalEntries).values({
            companyId:company.id,fiscalYearId:year.id,entryDate:"2026-06-01",description:"Unbalanced",
            sourceType:"Invalid",sourceId:randomUUID(),sourceHash:"test",createdBy:1,actorType:"admin",
          }).returning();
          await inner.insert(s.accountingJournalLines).values({
            entryId:draft.id,accountId:bank.id,currency:"IQD",exchangeRate:"1",debit:"1",credit:"0",baseDebit:"1",baseCredit:"0",
          });
          await inner.update(s.accountingJournalEntries).set({status:"posted"}).where(eq(s.accountingJournalEntries.id,draft.id));
        },/balance/i);
      });
      await t.test("fractional IQD, missing FX and viewer posting are rejected",async()=>{
        await fails(inner=>postJournalEntry({...input,sourceId:randomUUID(),lines:[
          {accountId:bank.id,currency:"IQD",debit:"100.01",credit:"0"},
          {accountId:revenue.id,currency:"IQD",debit:"0",credit:"100.01"},
        ]},actor,inner),/precision/i);
        await fails(inner=>postJournalEntry({...input,sourceId:randomUUID(),lines:[
          {accountId:bank.id,currency:"USD",debit:"10",credit:"0"},{accountId:revenue.id,currency:"USD",debit:"0",credit:"10"},
        ]},actor,inner),/rate.*missing/i);
        await fails(inner=>postJournalEntry({...input,sourceId:randomUUID()},{...actor,canManage:false},inner),/permission/i);
      });
      await t.test("account mapping types and period/tax overlap are guarded",async()=>{
        await fails(inner=>inner.insert(s.accountingPostingRules).values({companyId:company.id,key:"WALLET_LIABILITY",accountId:bank.id}),/mapping/i);
        await tx.insert(s.accountingPostingRules).values({companyId:company.id,key:"WALLET_LIABILITY",accountId:wallet.id});
        await fails(inner=>inner.insert(s.accountingFiscalYears).values({
          companyId:company.id,name:"Overlap",startsOn:"2026-02-01",endsOn:"2026-11-01",
        }),/overlap/i);
        await tx.insert(s.accountingTaxRules).values({companyId:company.id,countryCode:"IQ",productGroup:"test",ratePercent:"0",validFrom:"2026-01-01"});
        await fails(inner=>inner.insert(s.accountingTaxRules).values({companyId:company.id,countryCode:"IQ",productGroup:"test",ratePercent:"5",validFrom:"2026-06-01"}),/overlap/i);
      });
      await t.test("reversal is exact, reasoned, idempotent and does not edit original",async()=>{
        await fails(inner=>reverseJournalEntry(entryId,"2026-06-02","",actor,inner),/reason/i);
        const reversed = await reverseJournalEntry(entryId,"2026-06-02","Correct the test fixture",actor,tx);
        const duplicate = await reverseJournalEntry(entryId,"2026-06-02","Correct the test fixture",actor,tx);
        assert.equal(reversed.entry.reversalOfId,entryId); assert.equal(duplicate.duplicate,true);
        const [original] = await tx.select().from(s.accountingJournalEntries).where(eq(s.accountingJournalEntries.id,entryId));
        assert.equal(original.status,"posted");
        await fails(inner=>postJournalEntry({...input,sourceType:"Fake reversal",sourceId:randomUUID(),reversalOfId:entryId},actor,inner));
      });
      await t.test("audit immutability, fiscal close and currency precision lock",async()=>{
        await fails(inner=>inner.execute(sql`update accounting_audit_logs set action='tampered' where company_id=${company.id}`),/immutable/i);
        await fails(inner=>inner.update(s.accountingCurrencies).set({decimals:2}).where(eq(s.accountingCurrencies.code,"IQD")),/precision.*locked/i);
        await tx.update(s.accountingFiscalYears).set({status:"closed"}).where(eq(s.accountingFiscalYears.id,year.id));
        await fails(inner=>postJournalEntry({...input,sourceId:randomUUID()},actor,inner),/open/i);
        await fails(inner=>inner.update(s.accountingFiscalYears).set({status:"open"}).where(eq(s.accountingFiscalYears.id,year.id)),/reopen/i);
      });
      completed=true;
      throw rollback;
    });
  } catch (error) {
    if (error!==rollback) throw error;
  } finally { await pool.end(); }
  assert.equal(completed,true);
});