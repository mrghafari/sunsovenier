# Centralized accounting — integration boundary

## Scope and current status

Steps 0–2 of the supplied ten-step specification are implemented. This is a new
module because the draft accounting files named in the specification were absent.
The operator explicitly authorized building a new core from the specification.

- Existing admin route: `/mrg/accounting-management`.
- Module API namespace: `/api/accounting/v2`.
- Real reference-data create/edit UI in Persian, Arabic, English and Turkish.
- Generated Drizzle schema migration plus custom PostgreSQL ledger guards.
- Decimal-string money, base-currency balance validation, immutable posted entries,
  exact, reasoned reversal, source-payload idempotency and fiscal locking.
- Iraq country pack, manufacturing chart, IQD/USD, current Baghdad-calendar fiscal
  year, Fleet cost center and all posting-rule mappings.
- Active management roles and accounting module permissions are checked server-side.
  Authenticated finance viewers have no setting mutation permission. API mutations
  and seed actions are audited. System/developer seed runs are explicitly identified.

**Steps 3–10 are not complete.** No business-event emitter/consumer is running.
No real invoices, customer receivables, wallet movements, receipts, cheques or
financial reports are produced by this module yet. The UI states this explicitly.
The legacy accounting-only sample invoice endpoints now return 410 rather than
pretending to persist invoices. Existing shop invoices and manual invoice records
are not modified.

## Existing records and mapping

- Keep `customer_orders` and `order_items` as authoritative order/item snapshots.
  Do not recalculate old unit prices from the current product catalogue.
- Keep `order_management` and `order_status_history` for the current workflow.
- Reuse `customer_wallets` and `wallet_transactions`. Never create a second balance
  or double-debit historical paid orders.
- Customer identities exist in both `customers` and `crm_customers`; existing wallet
  foreign keys point to CRM identities. Do not assume their independent IDs match.
  The order-to-CRM mapping must be validated before enabling posting/settlement.
- `db`/`pool` and `customerDb`/`customerPool` currently point at the configured app
  database through separate clients. Future emitters must pass the *same transaction*
  as the business change; another client or an after-the-fact API call is not atomic.
- Accounting tables are prefixed `accounting_` to avoid collisions with live invoices,
  customer and wallet tables. Accounting uses the existing main pool, not a new database.

## Financial defaults and assumptions

- Iraq is the only enabled country pack; unsupported countries fail explicitly.
  Gregorian DATE and UTC timestamptz storage; company timezone Asia/Baghdad.
- Functional currency is seeded IQD with 0 decimals; USD with 2. Currency precision
  and base currency cannot change after relevant journals exist.
- No VAT or exchange rate is guessed. No tax rules or USD rate are seeded. Admins
  must enter dated central-bank rates and a verifiable source reference.
- No opening balances, stock valuation, revenue or wallet liabilities are invented.
  Existing balances must be reconciled and opened through an approved cutover before
  business events are enabled. Zero journal balance is not evidence that legacy
  wallets have zero balances.
- Weight tolerance starts at 0; fleet rate starts at 0 (not a claimed observed cost).
  These are editable configuration values, not live operational measurements.
- Posting-rule accounts are resolved by key/company, never hardcoded numeric IDs.
- Idempotency is scoped by company/sourceType/sourceId; matching source payload
  returns the same posted entry, a different payload with that identity is rejected.
- Reversal retains original currency/rate/dimensions and swaps debit/credit exactly;
  the original is untouched. A new open-period date and a meaningful reason are required.
- Country templates and country-specific defaults belong behind `CountryPack`.

## Development commands

```
npm run accounting:generate
npm run accounting:migrate:dev
npm run accounting:seed:dev
npm run test:accounting
npm run test:accounting:db
npx tsx --test client/src/components/admin/accounting/accounting-logic.test.ts
npm run check
npm run build
```

Migration and seed scripts are explicit, development-only operations. They are not
startup hooks or deployment build hooks. Migration batches are transactional,
serialized, checksummed and do not alter existing business tables. Database tests
wrap all fixtures/journals/audit rows in a transaction that is always rolled back.
Seeding is repeatable and does not overwrite administrator edits.

Files applied in order:
1. `migrations/accounting/0000_strange_praxagora.sql`
2. `server/modules/accounting/0001_ledger_guards.sql`
3. `server/modules/accounting/0002_ledger_hardening.sql`

Do not modify an already-applied migration. Add another migration for changes.

## Production release is not authorized or performed

The app uses the existing Neon-compatible connection. Confirm the actual published
database target before applying changes: a connection driver alone does not prove
whether it is Replit-managed or external.

For a Replit-managed production database, use Publish's supported schema flow;
do not run these developer scripts against production or add deployment/startup
DDL. For an external production database, obtain explicit target/operation approval
and use its established migration process. Never replace the database.

**Tables alone are insufficient.** The custom trigger/function guards must be
present and enabled in the target environment. The module checks their presence
and fails closed with `LEDGER_GUARDS_MISSING` if protection is absent; it never
self-installs production guards. Initializing reference data is a separate,
authenticated administrative action, not a claim that development rows were copied
to production. Do not enable business posting before guard verification and wallet/
receivable/stock opening-balance reconciliation.

## Manual check list for steps 1–2

1. Sign in as an active site admin, open Accounting and confirm seeded resources.
2. Change each of the four site languages; confirm RTL for fa/ar and readable forms.
3. Add/edit a cost center and an unreferenced account; reload and verify persistence.
4. Edit a currency; verify the currency code is the API identifier, not a numeric ID.
5. Remap a posting rule to a valid same-company posting account. Invalid type or
   company mappings must fail, visibly, without a success message.
6. Add a dated USD central-bank rate with a reference. Invalid decimal input or
   date must fail. No conversion should silently use an invented rate.
7. Add a zero/nonzero tax rule; overlapping active date ranges must fail.
8. Edit tolerance/fleet settings. These changes must not affect existing orders yet.
9. Repeat seed; verify no duplicate accounts/mappings/periods or overwritten edits.
10. With an accounting viewer, verify create/edit/seed are unavailable and direct
    mutations return 403. Customer-only/unsigned sessions must not access the API.
11. On an isolated test company, close a fiscal period after explicit confirmation;
    posting into it and reopening it must fail.
12. Run rollback-only DB tests; ensure posted header/line mutation, deletion,
    unbalanced posting, reused identities and unauthorised posting are rejected.

## Approval needed before the next integration step

The user requires approval before necessary edits outside accounting. Existing
full-wallet checkout debits immediately; the requested new design holds on finance
approval and consumes at loading. Existing warehouse approval finalizes physical
batch reservations; the supplied rule says reservation only. Dispatch/delivery is
not proof of a weighbridge measurement. These differences must not be silently
changed or treated as already compatible.

Before changing order, finance, inventory, logistics or wallet behavior, report the
specific integration points, backward-compatibility/cutover policy and affected
screens. Price/weight units and stock valuation must be explicit; never assume that
an old per-item price is a per-ton price or infer actual loaded weight from an estimate.