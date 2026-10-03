import { and, eq, sql } from "drizzle-orm";
import { accountingDb } from "./db";
import {
  accountingCurrencies as currencies, accountingCompanies as companies, accountingAccounts as accounts,
  accountingCostCenters as centers, accountingPostingRules as rules, accountingFiscalYears as years,
  accountingSettings as settings, accountingAuditLogs as audits,
} from "./schema";
import { POSTING_KEYS, type AccountingAccess } from "@shared/accounting-api";
import { getCountryPack } from "./country-packs";
import { assertLedgerReady } from "./readiness";

export async function seedAccounting(actor: Omit<AccountingAccess,"actorType"> & {actorType:"admin"|"custom"|"system"}) {
  const country = getCountryPack("IQ");
  const chart = country.chart;
  return accountingDb.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(718392, 0)`);
    await assertLedgerReady(tx);
    await tx.insert(currencies).values([
      {code:"IQD", name:"Iraqi dinar",decimals:0}, {code:"USD",name:"US dollar",decimals:2},
    ]).onConflictDoNothing();
    let [company] = await tx.select().from(companies).where(eq(companies.countryCode,"IQ")).orderBy(companies.id).limit(1);
    if (!company) [company] = await tx.insert(companies).values({
      name:"Momtazcom",countryCode:"IQ",timezone:"Asia/Baghdad",baseCurrency:"IQD",
    }).returning();
    const companyId = company.id;
    for (const a of chart) {
      const { key: _key, ...fields } = a;
      await tx.insert(accounts).values({...fields,companyId}).onConflictDoNothing();
    }
    const rows = await tx.select().from(accounts).where(eq(accounts.companyId,companyId));
    for (const key of POSTING_KEYS) {
      const template = chart.find(a => a.key === key);
      const account = rows.find(a => a.code === template?.code);
      if (!account || !account.isActive || !account.isPosting || account.type !== template?.type) {
        throw new Error(`Seed cannot safely resolve posting rule ${key}; review the existing chart`);
      }
      await tx.insert(rules).values({companyId,key,accountId:account.id}).onConflictDoNothing();
    }
    await tx.insert(centers).values({companyId,code:"FLEET",nameAr:"الأسطول",nameEn:"Fleet"}).onConflictDoNothing();
    const [fleet] = await tx.select().from(centers).where(and(eq(centers.companyId,companyId),eq(centers.code,"FLEET")));
    await tx.insert(settings).values({companyId,fleetCostCenterId:fleet.id}).onConflictDoNothing();
    const now = await tx.execute(sql`select extract(year from current_timestamp at time zone 'Asia/Baghdad')::int as year`);
    const year = Number(now.rows[0].year);
    const startsOn = `${year}-01-01`, endsOn = `${year}-12-31`;
    // Never overwrite an administrator's existing fiscal period.
    const existing = await tx.select().from(years).where(eq(years.companyId,companyId));
    if (!existing.some(y => y.startsOn <= endsOn && y.endsOn >= startsOn)) {
      await tx.insert(years).values({companyId,name:String(year),startsOn,endsOn}).onConflictDoNothing();
    }
    await tx.insert(audits).values({companyId,actorId:actor.actorId,actorType:actor.actorType,
      action:actor.actorType==="system"?"development_seed":"seed",entityType:"company",entityId:String(companyId),
      after:{template:"Iraq manufacturing",source:actor.actorType==="system"?"explicit_development_script":"authenticated_management_ui"}});
    // No invented exchange rates, taxes, balances, invoices, or journal entries.
    return {companyId,postingKeyCount:POSTING_KEYS.length};
  });
}