import { sql } from "drizzle-orm";
import { accountingDb, type AccountingTransaction } from "./db";
import { AccountingError } from "./access";

const requiredGuards = [
  "accounting_guard_company", "accounting_guard_currency", "accounting_guard_fiscal_year",
  "accounting_guard_tax_rule", "accounting_guard_account", "accounting_guard_posting_rule",
  "accounting_guard_journal", "accounting_guard_journal_line",
  "accounting_balance_header", "accounting_balance_lines",
  "accounting_immutable_audit", "accounting_validate_posted_dimensions",
];
export async function assertLedgerReady(db: typeof accountingDb | AccountingTransaction = accountingDb) {
  const result = await db.execute(sql`
    select t.tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname like 'accounting_%'
      and not t.tgisinternal and t.tgenabled in ('O','A')
  `);
  const found = new Set(result.rows.map(r=>String(r.tgname)));
  if (requiredGuards.some(g=>!found.has(g))) {
    throw new AccountingError("Accounting database guards are not installed or enabled; financial changes are blocked",503,"LEDGER_GUARDS_MISSING");
  }
}