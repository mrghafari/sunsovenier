# Centralized accounting — integration boundary

## Scope and current status

Steps 0–2 and the approved limited capture bridge of step 3 are implemented. This is a new
module because the draft accounting files named in the specification were absent.
The operator explicitly authorized building a new core from the specification.

- Existing admin route: `/mrg/accounting-management`.
- Module API namespace: `/api/accounting/v2`.
- Real reference-data create/edit UI in Persian, Arabic, English and Turkish.
- Generated Drizzle schema migration plus custom PostgreSQL ledger guards.
- Decimal-string money, base-currency balance validation, immutable posted entries,
  exact, reasoned reversal, source-payload idempotency and fiscal locking.
- Iraq and Iran reference packs, editable operational chart, IQD/USD/IRR,
  Persian/Arabic/English account and cost-center names, Fleet center and posting mappings.
- Active management roles and accounting module permissions are checked server-side.
  Authenticated finance viewers have no setting mutation permission. API mutations
  and seed actions are audited. System/developer seed runs are explicitly identified.

**Financial steps 4–10 are not complete.** Business events are captured transactionally;
no accounting consumer is running and no captured event is eligible for posting.
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

- Iraq uses Asia/Baghdad; Iran uses Asia/Tehran. Other countries fail explicitly.
  Gregorian DATE and UTC timestamptz storage are unchanged. Iran's actual fiscal
  period must be configured explicitly; setup does not invent Solar-Hijri boundaries.
- IQD and IRR are seeded with 0 decimals; USD with 2. IRR means Iranian rial,
  not toman: amounts are never divided or multiplied by ten. Currency precision
  and base currency cannot change after relevant journals exist.
- No VAT or exchange rate is guessed. No tax rules or USD rate are seeded. Admins
  must enter dated central-bank rates and a verifiable source reference.
- No opening balances, stock valuation, revenue or wallet liabilities are invented.
  Existing balances must be reconciled and opened through an approved cutover before
   financial processing is enabled. Zero journal balance is not evidence that legacy
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

### Step 4 — staged customer prepaid liability

The native wallet remains the single customer balance; it is a **company payable
to the customer**, not revenue. Added migrations `0005_wallet_liability.sql`
and `0006_wallet_write_guards.sql` are additive, development-only, checksum tracked.
Wallet schema inventory is included in both Drizzle configurations. Do not use
blind `db:push`: snapshot columns and custom SQL guards still require the
reviewed migration path described below.

Implemented:
- Explicit immutable wallet/company/CRM/currency links, with audited setup.
  Portal customer IDs are never presumed equal to independent CRM IDs.
- Exact decimal-string top-up: Dr configured BANK or GATEWAY asset / Cr
  WALLET_LIABILITY, party = CRM customer. Gateway clearing has its own posting
  key and an editable, localized mapping, not a hardcoded account ID.
- Refund of **unblocked prepaid funds**: Dr WALLET_LIABILITY / Cr selected
  BANK/GATEWAY. A staff-attested evidence reference and reason are mandatory;
  this does not claim automatic provider or bank-statement verification.
- Native balance, transaction, posted journal, immutable movement, audit and
  outbox event commit in one transaction. Source retries match normalized
  input; changed input conflicts instead of moving funds again.
- `FOR UPDATE` wallet locks, fiscal/currency precision checks and conservative
  native `numeric(12,2)` transaction range checks. No financial floats.
- Full-wallet new-order registration in both existing checkouts. Checkout does
  not debit or mark paid; finance approval holds the locked quoted order total.
  Holds block available balance but create **no journal and no revenue**.
- The existing finance management-ID approval URL intercepts only registered
  new prepaid orders, using active accounting permissions. Other native finance
  status writers share the database hold guard. Zero-ID auto-approval cannot
  create a new hold. Invalid states and insufficient funds fail atomically.
- Hold release on native order cancellation/deletion, plus a reasoned manager
  release API. Hold evidence cannot be erased or reactivated. Customer wallet
  summary includes new holds. A controlled prepaid account does not treat a
  credit limit as company-held customer cash.
- Controlled native wallets reject unjournaled legacy credits/debits and direct
  balance edits, including after deactivation when financial evidence remains.
  Old/unlinked wallets are unchanged. New prepared quotes/identities are immutable.

Manager APIs under `/api/accounting`: `POST /v2/wallets/link`,
`POST /v2/wallets/topup`, `POST /v2/wallets/refund`,
`POST /v2/wallet-orders/:orderId/approve`, and
`POST /v2/wallet-holds/:orderId/release`. Linking uses `{companyId,walletId}`.
Movement requires `{companyId,walletId,sourceId,entryDate,amount,channel,
evidenceReference,reason}`; money is a string and channel is BANK or GATEWAY.

**Not activated:** cutover rows default to `pipeline_ready=false`; there is no
activation UI/API. An opening reference alone is not an activation authorization.
Do not change this flag in live data until the remaining financial pipeline,
verified opening/party/currency reconciliation and an audited rollout are complete.
No legacy balances, receipts or captured events are promoted to financial facts.
Already paid, pre-cutover, contract and cross-currency orders cannot be enrolled.
Split wallet/bank processing, receipt allocation, loading consumption/partial
settlement and paid transitions await the following steps. Step 4 intentionally
blocks native paid transitions for future-cutover wallet orders until that bridge
exists. It is **not yet safe to activate** the full business flow.

Before activation, retire/reroute all recharge, manual adjustment and mixed-payment
writers for controlled wallets; resolve old pending reservations and pending wallet
orders. Do not activate a shared wallet while legacy mutations still need to run:
those mutations cannot safely bypass its liability ledger. Native pricing and
physical stock behavior have not been rewritten. Weight/ton conversion and FIFO
valuation sources remain prerequisites for the later loading pipeline.

`wallet.test.ts` uses one rollback-only fixture transaction and synthetic temporary
cutover proof. It leaves no company, balance, posted journal or native test order.
Customer/admin signed-in screens require separate authenticated UI verification;
unauthenticated screenshots cannot validate those screens.

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
serialized and checksummed. Capture migrations add shadow snapshot columns and
triggers to native order/item/wallet transaction tables without rewriting their
original prices, statuses, balances or inventory. Database tests
wrap all fixtures/journals/audit rows in a transaction that is always rolled back.
Seeding is repeatable and does not overwrite administrator edits.

Files applied in order:
1. `migrations/accounting/0000_strange_praxagora.sql`
2. `server/modules/accounting/0001_ledger_guards.sql`
3. `server/modules/accounting/0002_ledger_hardening.sql`
4. `server/modules/accounting/0003_transactional_outbox.sql`
5. `server/modules/accounting/0004_event_capture_hardening.sql`
6. Subsequent wallet/receipt migrations through `0008_receipt_wallet_guard_hardening.sql`
7. `server/modules/accounting/0009_persian_rial.sql` — additive localized columns,
   IRR reference currency and translations only for unchanged template labels.

New Persian-only accounts/centers are permitted; at least one nonblank localized
name is required. Old clients omitting `nameFa` do not erase an existing Persian
name. The authenticated setup action now accepts `{countryCode:"IQ"|"IR"}` and
does not change existing company currencies, customer wallets, rates or balances.
The Iran chart is an editable operational suggestion, not certified statutory
compliance or an electronic tax-invoice integration. No Iran company is created
by the migration; setup still requires an explicit management action.

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

## Limited event capture: scope, assumptions and checks

The user approved atomic recording and fixed accounting copies only, explicitly
excluding changes to wallet deduction timing, inventory rules or pricing behavior.

- Native SQL triggers observe WalletTopUp, WalletHoldCreated, WalletHoldReleased,
  PaymentReceived and OrderCancelled in the exact transaction that changes their
  native source row. Cancellation from customer orders and management uses one
  canonical identity. Identical retries are harmless; conflicting inputs fail.
- Native credit, debit and reservation-confirmation record/balance writes now share
  a transaction. Legacy numeric arithmetic, validation, timestamps in the workflow
  and return shapes remain unchanged. This does **not** implement new HOLD/consume
  policy or solve concurrent wallet reads; row locks and exact financial handlers
  belong to step 4. Order/payment/receipt changes elsewhere are not represented as
  one larger atomic transaction merely because wallet writes are now atomic.
- `paid` is only a legacy declaration: PaymentReceived records `amount: null` and
  `receiptVerified: false`. Native wallet credits retain an unverified funding-source
  label. They are not inferred bank/cash/cheque receipts.
- All captured payloads are immutable, `captureOnly: true`, `postingEligible: false`
  and outbox `status: captured`, not pending. Do not requeue them as financial events
  or double-charge old purchases during cutover.
- Shop company binding is automatic only with exactly one active Iraqi company.
  Otherwise capture needs an explicit, approved binding; no numeric company ID is
  hardcoded. This association is capture context, not proof of legacy company ownership.
- Historical snapshots have version 0. Only persisted price/shipping/currency facts
  are copied; historical tax, terms, FX and ownership remain unknown. New snapshots
  have version 1 and copy configured tax rules and dated FX using company country/
  timezone. Unsupported native payment/delivery terminology remains unknown.
- Pricing stays `native_order_unit`. Stored per-item prices are **not** per-ton prices.
  Changing today's catalogue, tax rules or native order fields does not rewrite
  already-captured accounting price/tax/shipping copies.
- Native shadow columns are deliberately excluded from legacy Drizzle selections/
  returns, preserving existing ORM response shapes. They are custom SQL, not a
  promise that `db:push`/generated snapshots fully describe the native tables.
  Before publishing, reconcile schema inventory/migration metadata and verify that
  the approved schema path preserves these columns, indexes, functions and triggers.
  Do not use blind schema push to remove this drift.
- Existing logistics has no authoritative multi-truck weighbridge capture. Dispatch,
  estimated weights, warehouse approval and delivery do not emit LoadingCompleted.
  There is no operational weight-entry UI connected yet; the adapter is the backend
  foundation, not a claim of a completed weighbridge workflow.

### Public operational recording interface

`POST /api/accounting/v2/integrations/operational-events` requires an authenticated
active accounting manager, same-origin request and installed ledger/event guards.
An existing operational caller may use `recordOperationalEvent(tx,input,actor)` with
its own transaction; never call the standalone HTTP wrapper after committing its
business change and describe that as atomic.

LoadingCompleted accepts a persisted `orderId`, stable truck/loading `sourceId`,
Gregorian `eventDate`, `weighbridgeReference`, measured `actualWeightTons` as a
positive decimal string, and distinct `{orderItemId,actualWeightTons}` lines from
that order. Exact line weights must sum to the measured total. The same ticket
cannot be recorded twice for that order by changing sourceId.

ShipmentCostRecorded requires the corresponding `loadingSourceId`. EXTERNAL_CARRIER
requires carrier/document references and actual cost/currency strings respecting
currency precision. INTERNAL_FLEET snapshots a positive configured rate, basis and
active same-company cost center; per-km requires measured distance. Missing facts
or configuration fail explicitly. These are operator-recorded facts, not verified
sensor/provider readings and not journals or carrier payments.

Operational fact, outbox row and actor audit commit/rollback together. Facts retain
the frozen order/line and fleet context. No native order-delete FK is imposed by
these facts: accounting evidence must survive business deletion without silently
changing existing super-admin deletion behavior.

### Verification and remaining questions

- Run `npm run test:accounting` and `npm run test:accounting:db`: exact money/form
  checks, ledger guards, capture retries, native update rollback on outbox conflict,
  immutable snapshots, non-financial warehouse/dispatch, real weight sums, missing
  loading rejection and documented shipment-cost validation.
- In an authorized session, record a measured loading with real ticket/line IDs;
  retry and confirm the same fact ID. Changed input with the same identity must
  return 409. A second source ID with the same ticket must also fail.
- Record its actual carrier cost or configured fleet measurement; verify no journal,
  invoice, stock mutation or additional wallet deduction is created.
- Without signing in, API access must return 401. Viewers cannot record operational
  events. Signed-in UI must be checked separately; screenshots cannot sign in.
- Decide financial cutover/opening reconciliation, existing versus new order policy,
  explicit native-unit-to-ton pricing and real stock-cost source before financial
  activation. Connecting a weighbridge-entry UI needs a separately scoped change;
  it must not substitute estimates for actual measurements.

### Step 5 — receipts and cheque accounting foundation (in progress, disabled)

This increment implements operator-attested BANK/CASH/CHEQUE receipts, exact
same-company/customer/currency allocation to multiple posted receivables, partial
settlement, and transfer of unallocated funds to an explicitly linked CRM prepaid
account. Amounts are never inferred from a screenshot, order status or provider
configuration. Staff evidence references are attestations, not provider verification.

Received cheques debit CHEQUES_ON_HAND; deposit transfers the instrument to
CHEQUE_CLEARING; clearance transfers it to BANK. Receipt allocation credits AR,
and unallocated funds credit the customer's prepaid liability. That credit remains
blocked from refunds and order holds until clearance. A bounced cheque reopens
its allocations, recovers only legally available prepaid funds, and books any
already-spent cleared-cheque excess as a separate receivable instead of a negative
prepaid balance. Events, original receipt facts and allocations cannot be erased
or rewritten. A duplicate source with matching normalized input is harmless;
conflicting evidence is rejected atomically.

Routes under `/api/accounting`:
- `GET /v2/receivables?companyId=...`
- `POST /v2/receipts`
- `POST /v2/receipts/:id/cheque/deposited|cleared|bounced`

Receivable registration is a trusted invoice integration, not an HTTP endpoint
accepting arbitrary amounts. A new posted LoadingCompleted/SalesInvoice journal
must already contain the matching CRM customer's AR debit. The receipt flow cannot
create an invoice, revenue, loading measurement or stock deduction. No legacy
order or payment backfill is run.

The receipt and prepaid cutover gates both default to closed. There is deliberately
no activation UI/endpoint. The backend is not an activated financial pipeline or a
finished phase-five UI. New receipt guards retain financial control even if a
prepaid gate is later disabled.

**Still required in this phase:** consuming order holds against loading invoices,
the wallet-to-AR settlement bridge, and correct foreign-currency book-value/realized
FX handling. Receipts currently require company base currency; unsupported FX
fails explicitly before any write. Do not simply clear the currency guard: invoice
AR and prepaid liability must use their actual historical remaining book values,
not today's rate, with explicit realized FX and exact final residual closure.
Financial activation still requires the full invoice/stock/cost pipeline, opening
reconciliation and approved cutover. Receipt UI belongs to the planned frontend
integration; signed-in UI has not been verified here.

Run `npm run test:accounting:db` for rollback-only receipt lifecycle, guards,
over-allocation, retry, chargeback, Native/GL/AR parity and older accounting tests.