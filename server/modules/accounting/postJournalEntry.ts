import { createHash } from "node:crypto";
import { and, eq, lte, gte, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { currencyCode, dateString, decimalString, type AccountingAccess } from "@shared/accounting-api";
import { accountingDb, type AccountingTransaction } from "./db";
import {
  accountingCompanies as companies, accountingFiscalYears as years, accountingCurrencies as currencies,
  accountingExchangeRates as rates, accountingJournalEntries as entries, accountingJournalLines as lines,
  accountingAuditLogs as audits,
} from "./schema";
import { exactMoney, convertBase, decimal, assertBalanced } from "./money";
import { AccountingError } from "./access";
import { assertLedgerReady } from "./readiness";

export const journalInputSchema = z.object({
  companyId:z.number().int().positive(), entryDate:dateString,
  description:z.string().trim().min(1).max(2000),
  sourceType:z.string().trim().min(1).max(100), sourceId:z.string().trim().min(1).max(200),
  reversalOfId:z.number().int().positive().nullable().default(null),
  lines:z.array(z.object({
    accountId:z.number().int().positive(), currency:currencyCode,
    debit:decimalString.default("0"), credit:decimalString.default("0"),
    partyType:z.enum(["customer","carrier"]).nullable().default(null), partyId:z.number().int().positive().nullable().default(null),
    costCenterId:z.number().int().positive().nullable().default(null), description:z.string().max(2000).default(""),
  }).strict()).min(2).max(500),
}).strict();
export type JournalInput = z.input<typeof journalInputSchema>;

async function postWithinTransaction(tx: AccountingTransaction, input: JournalInput, actor: AccountingAccess) {
  const data = journalInputSchema.parse(input);
  await tx.execute(sql`select pg_advisory_xact_lock(718392, 0)`);
  await assertLedgerReady(tx);
  // Only normalized source data is hashed, not changing rate lookup results.
  const normalized = {...data,lines:data.lines.map(l=>({...l,debit:decimal(l.debit).toFixed(),credit:decimal(l.credit).toFixed()}))};
  const sourceHash = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  const [existing] = await tx.select().from(entries).where(and(
    eq(entries.companyId,data.companyId),eq(entries.sourceType,data.sourceType),eq(entries.sourceId,data.sourceId),
  )).limit(1);
  if (existing) {
    if (existing.sourceHash!==sourceHash || existing.status!=="posted") throw new AccountingError("Source identity was reused for different or unfinished journal data",409,"IDEMPOTENCY_CONFLICT");
    return {entry:existing,duplicate:true};
  }
  const [company] = await tx.select().from(companies).where(eq(companies.id,data.companyId)).limit(1);
  if (!company?.isActive) throw new AccountingError("Active company required");
  const [year] = await tx.select().from(years).where(and(
    eq(years.companyId,data.companyId),eq(years.status,"open"),lte(years.startsOn,data.entryDate),gte(years.endsOn,data.entryDate),
  )).limit(1);
  if (!year) throw new AccountingError("Entry date does not belong to an open fiscal period");
  const currencyRows = await tx.select().from(currencies);
  const base = currencyRows.find(c=>c.code===company.baseCurrency && c.isActive);
  if (!base) throw new AccountingError("Active base currency required");
  const prepared = [];
  const cachedRates = new Map<string,string>([[company.baseCurrency,"1"]]);
  let originalLines: typeof lines.$inferSelect[] = [];
  if (data.reversalOfId) {
    const [original] = await tx.select().from(entries).where(eq(entries.id,data.reversalOfId));
    if (!original || original.status!=="posted" || original.companyId!==data.companyId || original.reversalOfId) {
      throw new AccountingError("Invalid reversal target");
    }
    if (data.description.trim().length<5) throw new AccountingError("A reversal reason is required");
    originalLines = await tx.select().from(lines).where(eq(lines.entryId,original.id)).orderBy(lines.id);
  }
  for (const [lineIndex,line] of data.lines.entries()) {
    const currency = currencyRows.find(c=>c.code===line.currency && c.isActive);
    if (!currency) throw new AccountingError(`Active currency required: ${line.currency}`);
    let rate = data.reversalOfId ? originalLines[lineIndex]?.exchangeRate : cachedRates.get(line.currency);
    if (data.reversalOfId && !rate) throw new AccountingError("Reversal line count does not match the original");
    if (!rate) {
      const [official] = await tx.select().from(rates).where(and(
        eq(rates.companyId,data.companyId),eq(rates.currency,line.currency),lte(rates.effectiveOn,data.entryDate),
      )).orderBy(desc(rates.effectiveOn)).limit(1);
      if (!official || official.source!=="central_bank") throw new AccountingError(`Official exchange rate is missing for ${line.currency}`);
      rate = official.rate; cachedRates.set(line.currency,rate);
    }
    const debit = exactMoney(line.debit,currency.decimals), credit = exactMoney(line.credit,currency.decimals);
    if (decimal(debit).gt(0)===decimal(credit).gt(0)) throw new AccountingError("Each line must have exactly one positive debit or credit");
    if (Boolean(line.partyType)!==Boolean(line.partyId)) throw new AccountingError("Party type and ID must be provided together");
    prepared.push({...line,debit,credit,exchangeRate:rate,
      baseDebit:convertBase(debit,rate,base.decimals),baseCredit:convertBase(credit,rate,base.decimals)});
  }
  assertBalanced(prepared);
  const [draft] = await tx.insert(entries).values({
    companyId:data.companyId,fiscalYearId:year.id,entryDate:data.entryDate,description:data.description,
    sourceType:data.sourceType,sourceId:data.sourceId,sourceHash,reversalOfId:data.reversalOfId,
    createdBy:actor.actorId,actorType:actor.actorType,status:"draft",
  }).returning();
  await tx.insert(lines).values(prepared.map(l=>({...l,entryId:draft.id})));
  const [posted] = await tx.update(entries).set({status:"posted"}).where(eq(entries.id,draft.id)).returning();
  // Check immediately, not only at commit, including when composing into caller's transaction.
  await tx.execute(sql`set constraints accounting_balance_header, accounting_balance_lines immediate`);
  await tx.insert(audits).values({
    companyId:data.companyId,actorId:actor.actorId,actorType:actor.actorType,
    action:"post_journal",entityType:"journal",entityId:String(posted.id),after:{sourceType:data.sourceType,sourceId:data.sourceId},
  });
  return {entry:posted,duplicate:false};
}
// Trusted module interface; this is intentionally not an unauthenticated HTTP endpoint.
export async function postJournalEntry(input: JournalInput, actor: AccountingAccess, tx?: AccountingTransaction) {
  if (!Number.isSafeInteger(actor.actorId) || actor.actorId<=0 || !["admin","custom"].includes(actor.actorType)) {
    throw new AccountingError("Valid posting actor required");
  }
  if (!actor.canManage) throw new AccountingError("Posting permission required",403,"ACCESS_DENIED");
  return tx ? postWithinTransaction(tx,input,actor) : accountingDb.transaction(inner=>postWithinTransaction(inner,input,actor));
}
export async function reverseJournalEntry(entryId: number, entryDate: string, reason: string, actor: AccountingAccess, tx?: AccountingTransaction) {
  if (typeof reason!=="string" || reason.trim().length<5) throw new AccountingError("A reversal reason of at least five characters is required");
  const reverse = async (inner: AccountingTransaction) => {
    const [original] = await inner.select().from(entries).where(eq(entries.id,entryId));
    if (!original) throw new AccountingError("Journal not found",404,"NOT_FOUND");
    const originalLines = await inner.select().from(lines).where(eq(lines.entryId,entryId)).orderBy(lines.id);
    return postJournalEntry({
      companyId:original.companyId,entryDate,description:reason.trim(),sourceType:"Reversal",sourceId:String(entryId),reversalOfId:entryId,
      lines:originalLines.map(l=>({accountId:l.accountId,currency:l.currency,debit:l.credit,credit:l.debit,
        partyType:l.partyType as "customer"|"carrier"|null,partyId:l.partyId,costCenterId:l.costCenterId,description:l.description})),
    },actor,inner);
  };
  return tx ? reverse(tx) : accountingDb.transaction(reverse);
}