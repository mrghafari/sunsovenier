import { sql } from "drizzle-orm";
import { accountingDb, type AccountingTransaction } from "./db";
import { AccountingError } from "./access";

const requiredGuards = [
  "accounting_guard_company", "accounting_guard_currency", "accounting_guard_fiscal_year",
  "accounting_guard_tax_rule", "accounting_guard_account", "accounting_guard_posting_rule",
  "accounting_guard_journal", "accounting_guard_journal_line",
  "accounting_balance_header", "accounting_balance_lines",
  "accounting_immutable_audit", "accounting_validate_posted_dimensions",
  "accounting_wallet_settlement_guard","accounting_wallet_settlement_native_evidence",
  "accounting_wallet_settlement_immutable","accounting_settlement_reversal_guard",
  "accounting_wallet_settlement_journal_evidence",
  "accounting_wallet_book_guard","accounting_wallet_book_immutable","accounting_wallet_book_used",
  "accounting_assert_wallet_book_journal",
  "accounting_receipt_book_guard","accounting_receipt_book_immutable","accounting_receipt_book_used",
  "accounting_assert_receipt_book_journal","accounting_foreign_receipt_complete","accounting_foreign_allocation_guard",
  "accounting_foreign_ar_parity",
];
export async function assertLedgerReady(db: typeof accountingDb | AccountingTransaction = accountingDb) {
  const result = await db.execute(sql`
    select t.tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname like 'accounting_%'
      and not t.tgisinternal and t.tgenabled in ('O','A')
      and (select count(*) from pg_attribute a where a.attname='name_fa' and not a.attisdropped
        and a.attrelid in (to_regclass('public.accounting_accounts'),to_regclass('public.accounting_cost_centers')))=2
  `);
  const found = new Set(result.rows.map(r=>String(r.tgname)));
  if (requiredGuards.some(g=>!found.has(g))) {
    throw new AccountingError("Accounting database guards are not installed or enabled; financial changes are blocked",503,"LEDGER_GUARDS_MISSING");
  }
}
export async function assertEventBridgeReady(db: typeof accountingDb | AccountingTransaction = accountingDb) {
  const result = await db.execute(sql`select t.tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
    and not t.tgisinternal and t.tgenabled in ('O','A')`);
  const found = new Set(result.rows.map(r=>String(r.tgname)));
  const required = ["accounting_capture_order_snapshot","accounting_capture_line_snapshot",
    "accounting_emit_customer_order","accounting_emit_managed_order","accounting_emit_wallet",
    "accounting_emit_operational_fact","accounting_guard_event_payload"];
  if (required.some(g=>!found.has(g))) {
    throw new AccountingError("Accounting event bridge migration is missing or disabled",503,"EVENT_BRIDGE_MISSING");
  }
}