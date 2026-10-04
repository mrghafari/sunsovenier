# Centralized accounting — integration boundary

## Staged credit approval (not live financial completion)

The accounting panel now includes four-language credit exposure and explicit
credit-order registration/approval. Migration 0022 adds a separate, closed credit
opening gate; 0023 stores immutable reviewed order/customer associations. Both
are included in the explicit development migration runner and schema inventory.
No company gate is enabled by these migrations or by the UI.

- `GET /api/accounting/v2/credit-exposure?companyId=…&walletId=…` reads one
  explicitly linked active CRM customer/currency policy. It reports observed
  open invoice AR, active allocations of uncleared cheques, approved unbilled
  commitments, ledger parity and unavailable/unapproved dependencies.
- `POST /api/accounting/v2/credit-orders` requires company, linked wallet, new
  internal customer order ID and an explicit staff-reviewed identity reference.
  It does not infer customer identity from equal IDs, names or contact details.
  Only unpaid, non-contract bank/cash orders after the approved boundary can
  enroll. The full frozen order amount is committed as credit at approval.
- `POST /api/accounting/v2/credit-orders/:orderId/approve` checks the currency
  credit limit under the financial advisory lock. Native finance approval for
  new cutover orders invokes the same service and never falls through to the
  old paid/debit branch. New prepaid approvals also check credit opening/parity.
- A cheque's unallocated wallet credit is liability, not credit exposure.
  Depositing a cheque does not remove its AR exposure; clearing it does.
  Each registered invoice replaces the corresponding part of an unbilled
  order commitment. Existing invoices still count in open AR until settled.
- Approval updates only the new order's finance/warehouse readiness and audit;
  payment remains pending, no wallet debit occurs and no invoice is fabricated.
  Native prices, stock/reservation rules and the independent loading module
  are unchanged. Historical orders retain their previous route.

The credit gate is an explicit approval record, not proof that a loading
consumer is operational. Actual opening/cheque evidence, verified stock costs,
loading invoice/COGS consumers, coordinated returns/reversals and complete
end-to-end verification remain required. Do not enable a gate merely because
the credit panel or its tests succeed. See REMAINING_WORK.md.

## Scope and current status

Manual journals and paid-expense drafts, their separate closed activation gate
and exact posting/reversal workflow are documented in [MANUAL_DOCUMENTS.md](MANUAL_DOCUMENTS.md).

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

**The full live financial pipeline is not complete.** Staged wallet, receipt,
manual-document and report paths now have their own controls and tests, and the
workspace includes read-only loading arithmetic and accounting audit history.
See [REMAINING_WORK.md](REMAINING_WORK.md) for the remaining activation dependencies.
Business events are captured transactionally;
no accounting consumer is running and no captured event is eligible for posting.
No live invoice/stock/receipt/wallet pipeline has been activated. Reports now inspect
real posted ledger records (including manually posted records and their reversals),
but do not import or verify legacy openings or infer business balances from an empty
ledger. The UI states these limits explicitly.
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
- Existing dispatch, estimated weights, warehouse approval and delivery do not
  emit LoadingCompleted and are not weighbridge proof. A separately approved,
  capture-only entry in logistics/warehouse now records actual ticket/line weights
  and optional documented batch-cost attestations via `/v2/loading-context` and
  `/v2/loading-capture`. It preserves native order/status/stock/price/wallet flows.
  Manual batch documents are not verified FIFO carrying value; invoice/COGS and
  financial activation remain blocked. See `REMAINING_WORK.md`.

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
  activation. The limited weighbridge-entry connection must not substitute
  estimates for actual measurements or broaden source-module financial behavior.

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
- `POST /v2/receipts/:id/return`
- `POST /v2/wallets/settle`

Receivable registration is a trusted invoice integration, not an HTTP endpoint
accepting arbitrary amounts. A new posted LoadingCompleted/SalesInvoice journal
must already contain the matching CRM customer's AR debit. The receipt flow cannot
create an invoice, revenue, loading measurement or stock deduction. No legacy
order or payment backfill is run.

The receipt and prepaid cutover gates both default to closed. There is deliberately
no activation UI/endpoint. The backend is not an activated financial pipeline or a
finished phase-five UI. New receipt guards retain financial control even if a
prepaid gate is later disabled.

The wallet-to-AR bridge now posts liability debit / AR credit and atomically
records native wallet debit, invoice allocation, audit and immutable settlement
evidence. It accepts `companyId`, `walletId`, `receivableId`, decimal-string
`amount`, `entryDate`, unique `sourceId`, `reason`, and optional `holdId`.
Company, CRM and currency must match; a new unreversed posted invoice is required.
An order hold additionally requires that exact order's measured LoadingCompleted
fact and matching posted loading invoice. Invoice amounts are not calculated from
estimated weights. It changes neither order paid status nor stock.

Partial settlement consumes only the required part of the hold. Availability
subtracts remaining, not original, held amounts. Additional payment beyond the
remaining quote uses available free funds only. Other orders' holds, legacy
reservations and uncleared cheques remain blocked. Explicit release frees only
the unconsumed remainder, without increasing wallet balance or emitting a false
refund. Full consumption is terminal. Generic journal reversal cannot reverse
a settlement or its paid invoice without coordinated AR/native handling.
Journal provenance and native/AR/hold consistency are verified by deferred DB
guards; replay is idempotent, conflicting replay fails.

Wallet-to-AR also supports an explicitly linked foreign wallet and a posted
receivable in that **same** customer currency (no cross-currency conversion).
Foreign invoice registration remains a trusted integration, not a new public
invoice endpoint. Settlement takes the liability's pooled remaining GL carrying
value and the individual invoice's remaining carrying value. Native and base
balances are both closed; differences post to configured FX_GAIN/FX_LOSS in the
company's base currency. The current exchange rate is not used to erase either
historical balance. Partial payments proportionally consume the remaining values;
the final payment consumes the exact residual. Valid zero-base minor-unit
remainders can still close their nonzero native balances.

`valuationBasis`, `walletBaseSettled`, `receivableBaseSettled`, `baseCurrency`
and `realizedFx` are included in the settlement audit/result. Historical journal
lines are explicitly tagged; their rate is a carrying-value indicator, not an
assertion about the current official rate. An immutable DB-derived proof controls
the precise accounts, parties, native amounts, base values and realized-FX line.
Clients cannot submit manual base overrides; ordinary journals still require
positive base totals and dated official rates. Proofs cannot be orphaned or
reused for another settlement; backdating before the wallet's latest posting,
unknown prior allocations and unreconciled balances are blocked.

Foreign BANK/CASH receipt confirmation is now supported, using a dated official
rate for the actual incoming asset and any prepaid excess, and each allocated
invoice's own remaining historical carrying value for AR. A receipt can settle
several invoices with different historical rates without averaging their original
debts. Partial allocations consume proportional remaining values; final allocations
consume exact residuals. Their shared invoice valuation also accounts for previous
wallet settlements, and later wallet settlements account for these receipts.
Explicit base-currency FX_GAIN/FX_LOSS balances the actual asset against the
historical AR and prepaid excess (including base-unit rounding differences).

The immutable DB-derived receipt proof controls source, accounts, parties, native
amounts, base amounts, allocations and official rate. Receipt, proof, allocation
rows, AR balances, journal, native wallet credit and audit commit together.
Orphan proofs, unproven journals, independently reversed receipts/settled invoices,
invented AR balances and backdated allocations are blocked. Legitimate zero-base
foreign minor-unit receipts are proven narrowly, not rounded up to invented money.
Returned `bookValues` include the booked asset, closed AR, credited liability,
per-invoice snapshots and explicit realized FX. Funds remain staff-attested; this
does not claim provider verification or introduce a bank integration.

Foreign CHEQUE receipt/deposit/clearance/bounce is now implemented. Received
instruments use a dated official rate, with invoice-specific historical AR closure
and blocked prepaid excess. Deposit and clearance preserve that instrument's
exact native and base amounts; changing the exchange rate does not create a
gain/loss merely for moving the same cheque between asset accounts.

A bounce before clearance removes the instrument's original asset basis. After
clearance, bank cash is fungible: the outflow consumes the bank account/currency's
pooled remaining GL carrying value, with exact residual closure for a full outflow.
Insufficient or negative asset values and out-of-order outflows fail closed.
Original invoice allocations reopen at their exact original allocated book values.
Recoverable excess consumes the customer's pooled wallet liability value without
spending other holds, legacy reservations or other uncleared cheques. Already-spent
excess becomes a separately valued, settleable AR debt, never a negative wallet.
Differences are explicit base-currency realized FX, not implicit current-rate changes.
Legitimate proven zero-base minor-unit transfers and returns remain supported.

Immutable DB-derived cheque proofs control the complete journal multiset. Status,
event, allocations, debt and native recovery must commit together; direct status
changes, orphan proofs, fabricated foreign journals and independent reversals fail.
Receipt/cheque mutations retain permission, fiscal, evidence and retry checks.

Full BANK/CASH receipt returns now support both company base currency and the
original foreign currency. The return endpoint takes a unique `sourceId`,
Gregorian `entryDate`, `evidenceReference` and `reason`; it does not accept a
manual amount, account, rate, or valuation override. This is a staff-attested
full return of one actual receipt, not an arbitrary wallet refund or provider
verification. Partial receipt returns are not implemented.

The return consumes the original funding account/currency's actual pooled
remaining asset carrying value (exact residual for a full outflow), reopens every
original invoice allocation at its stored book value and recovers only free
same-currency prepaid funds using pooled remaining liability value. Other active
holds, legacy reservations and uncleared cheques remain protected. Spent excess
becomes an explicit, subsequently settleable historical receivable; neither bank/
cash nor wallet balances may be overdrawn. The balancing difference is explicit
base-currency FX. Base-currency original evidence is derived from the immutable
received journal, not invented historical rates.

Returns share the immutable lifecycle proof infrastructure with cheques. Proof,
complete journal, returned status, allocation reopening, native debit, optional
new debt, event and audit commit together. Matching retries are harmless; changed
retries, direct status changes, orphan evidence, fabricated journals, independent
reversal, unsupported dates and insufficient assets fail closed. Ordinary receipt
creation, cheque processing and wallet settlement remain backward compatible.

**Still required in this phase:** foreign wallet refunds. Partial receipt returns
are also unsupported. These operations remain blocked; never erase historical AR/prepaid
values or invent conversion between a customer's currencies.
Financial activation still requires the full invoice/stock/cost pipeline, opening
reconciliation and approved cutover. Receipt UI belongs to the planned frontend
integration; signed-in UI has not been verified here.

Run `npm run test:accounting:db` for rollback-only receipt lifecycle, guards,
over-allocation, retry, chargeback, Native/GL/AR parity and older accounting tests.
`ACCOUNTING_DB_TEST=1 ACCOUNTING_FX_ONLY=1 npx tsx --test server/modules/accounting/receipts.test.ts`
runs the isolated foreign wallet and BANK/CASH receipt cases; the normal suite
never uses this filter.
`ACCOUNTING_DB_TEST=1 npx tsx --test server/modules/accounting/receipt-returns.test.ts`
runs the isolated full bank/cash return checks, including base/foreign values,
pooled residuals, spent excess, debt settlement, protected funds and DB provenance.

### Posted ledger reports and visible accounting workspace

By explicit user choice, report UI work precedes the remaining foreign wallet
refund and external finance credit-limit integration. Those paths remain deferred;
no native finance approval behavior or financial activation flag changed.

The existing `/mrg/accounting-management` page has Reference setup and Reports
views. Reports cover Journal (posted entry lines and provenance, with entry-ID
detail filtering), General ledger (one account, with opening/movement/closing and
running balances), and Trial balance (account opening, period debits/credits and
closing debit/credit). All three have real CSV export and fa/ar/en/tr copy.

Read-only authenticated accounting viewers and managers share these routes:
- `GET /api/accounting/v2/reports/journal`
- `GET /api/accounting/v2/reports/ledger`
- `GET /api/accounting/v2/reports/trial-balance`
- Append `/csv` for the whole matching scope, not just the visible page.

Queries require `companyId`, Gregorian `from` and `to`; optional `accountId`,
`currency`, `costCenterId`, and paired `partyType` (`customer`/`carrier`) plus
`partyId` filter the same opening/period/closing scope. Ledger requires an
account. Journal alone accepts `entryId`. IDs are company-checked; currencies
must exist. Page size is 1–200 (default 50). Reports include inactive historical
accounts/centers/currencies, not just current operational choices.

Only posted entries count. Drafts and captured-only events are excluded. Both
the original posted entry and its posted reversal remain in the ledger; effects
cancel at the reversal date rather than rewriting earlier reports. Rows sort by
entry date, entry ID and line ID, so running balances include earlier pages.
Money stays an exact decimal string; native running balances and totals are
partitioned by transaction currency, never added across currencies. Trial balance
uses company base currency. Filtered dimensions can legitimately form an
unbalanced subset; they are explicitly not the full company's trial balance.

Each standalone report runs in a repeatable-read, read-only transaction, so
metadata, count, openings, totals and the page share one snapshot. Whole-filter
totals do not change with pagination. JSON/CSV responses are private and no-store.
CSV includes UTF-8 BOM, coverage/filter/base-currency/total metadata, exact native
currency summaries, properly quoted Unicode and multiline text, and spreadsheet
formula protection for untrusted text. Exports above 10,000 rows fail explicitly
instead of silently truncating; narrow the filters.

Coverage shows actual posted-entry counts and current receipt/wallet cutover
flags. No posted records means no posted records, not zero legacy business
balances. These reports do not certify legacy opening reconciliation.

`ACCOUNTING_DB_TEST=1 npx tsx --test server/modules/accounting/reports-db.test.ts`
checks rollback-only report fixtures, huge exact values, opening/running balances,
currency partitioning, reversals, scoped filters, company isolation and exports.
`npm run test:accounting` includes query-validation and safe-CSV unit checks.
`node client/src/components/admin/accounting/run-report-ssr-smoke.mjs` checks the
presentation layer in all four languages, exact decimal strings, separate native
currency summaries, and empty periods that still have an opening balance. This
supplements, rather than replaces, the complete app build and type check.

### Customer statements and historical receivables aging

The Reports view now includes customer statements and receivables aging.
`GET /api/accounting/v2/customer-reports/customer-statement` requires company,
CRM primary-key `customerId`, Gregorian `from` and `to`. It shows AR-only
opening, posted movement, closing and running native/base carrying balances.
`GET /api/accounting/v2/customer-reports/receivables-aging` requires company
and Gregorian `asOf`; customer is optional. Both accept an optional native
currency and bounded paging, and `/csv` exports the whole filtered scope
(maximum 10,000 rows, with explicit rejection rather than truncation).
Customer business codes and names are displayed; business codes are not
silently treated as CRM primary keys. No CRM email/phone is exposed.

AR scope includes current mappings, historical receipt/wallet book-value account
evidence, and unambiguous registered invoice asset-debit evidence. Thus inactive
historical AR accounts remain readable. Missing AR configuration/evidence and
no posted data remain explicitly distinguishable from zero legacy debt.

Aging uses stored invoice due dates and reconstructs settlement at the selected
posted-entry date, not the mutable current settled counter or receipt status.
Receipt received events reduce debt; later posted returns or cheque bounces
restore it only from their own entry date. Posted wallet settlements count from
their journal date. Posted invoice/journal reversals count only when effective.
Invalid negative invoice balances fail as reconciliation errors rather than
being silently clamped away.

Native amounts are grouped by currency. Aging buckets are not overdue (due on
or after as-of), 1–30, 31–60, 61–90 and over 90 days. Registered invoice amounts
are not translated at today's FX rate. Statement base balances retain historical
book values; per-invoice base aging is not invented.

Ledger-minus-tracked-invoice differences are shown per customer and currency:
positive differences have unknown due dates; negative differences are
unclassified/unapplied credits. They are not assigned a guessed invoice or due
date and are not netted across customers. Currency summaries preserve these
debit and credit amounts separately and reconcile to the native ledger closing.
Legacy opening reconciliation is still explicitly unverified.

Read-only repeatable-read snapshots, viewer access, no-store responses and
safe quoted UTF-8 CSV follow the existing ledger reports. No cutover,
processor, external business module or production schema is activated/changed.
Opt-in DB fixtures enable processing only inside their rolled-back transaction.

`ACCOUNTING_DB_TEST=1 npx tsx --test server/modules/accounting/customer-reports-db.test.ts`
checks actual posted receipt returns, foreign cheque bounces, wallet settlements,
historical statements, unknown due debts/credits, bucket boundaries and exports.
`node client/src/components/admin/accounting/run-customer-reports-ssr-smoke.mjs`
checks four-language presentation, exact amounts and honest no-row openings.

### Receipts and cheques workbench

The accounting workspace has a separate Receipts & Cheques view. It lists actual
receipt records, with company/customer/currency/method/current-status and original
receipt-date filters, server pagination and full-scope exact per-currency summaries.
Summary amounts are original receipt/credited amounts by current lifecycle status,
not net available cash or a customer's current wallet balance. Received/deposited
cheques are provisional, not cleared funds. Empty history does not verify old
financial openings.

Read endpoints share the accounting viewer permission:
- `GET /api/accounting/v2/receipts` and `/receipts/csv` (max 10,000 full-filter rows).
- `GET /api/accounting/v2/receipts/:id?companyId=...` returns current invoice
  allocations, receipt evidence and chronological journal-linked lifecycle events.
- `GET /api/accounting/v2/receipt-workbench/customers?companyId=...&q=...`
  searches company-linked customer names/business codes without exposing contact
  data or treating the business code as the CRM primary key.
- `GET /api/accounting/v2/receipt-workbench/receivables?companyId=...&customerId=...&currency=...`
  returns up to 100 eligible open posted, unreversed invoices per page.

Read endpoints use a repeatable-read, read-only snapshot and no-store responses.
The metadata reports actual company activity, installed ledger guards, active
currencies and existing receipt/wallet cutover flags. These flags cannot be enabled
from the workbench. Disabled processing leaves records readable, not writable.

Managers use the existing validated receipt and lifecycle writers: actual
bank/cash/cheque receipt, cheque deposit/clear/bounce and full bank/cash return.
The form requires staff attestation, evidence, reason and an explicit entry date.
Allocation amounts stay exact strings, same customer/currency and within both
the selected invoice's current outstanding amount and the receipt total.
Unallocated funds require an explicitly linked same-currency CRM wallet; the
server does not silently create one. Native receipts now reject a stale selection
of a reversed invoice, matching existing foreign-invoice protection.

Mutation permission, cutover checks, date/evidence validation, atomic journal
posting, money precision, wallet reconciliation and lifecycle/idempotency checks
remain enforced by the server even if UI controls are bypassed. Source identifiers
remain stable on retries; automatic mutation retries are disabled. Returns/bounces
explicitly disclose restoration of invoice debt and recovery of credited funds or
new debt when consumed. No partial refund or arbitrary outgoing amount is added.

No financial cutover, migration, processor or other business module is activated.

### Cost-center expenses and fleet absorption

`GET /api/accounting/v2/cost-reports` and its `/csv` companion are read-only,
repeatable-snapshot reports of posted **expense** lines in the requested period.
They use the strict journal report filters, include original and reversal entries,
retain unassigned centers and retired historical resources, and export the full
filtered scope (up to 10,000 grouped center/currency rows), not just the visible
page. Account, center and entry selections must belong to the selected company.
These endpoints inherit accounting RBAC and never activate a cutover, post a
journal, reconstruct an opening balance or change a business module.

Rows separate native actual-expense amounts by currency; cross-currency totals
are base-currency amounts only. Operating costs exclude the mapped
`FLEET_COST_ABSORBED` contra-account. A mapped `SHIPPING_EXPENSE` line is an
internal allocation charge, rather than a second operating expense, only when
its source is `ShipmentCostRecorded` (or a reversal of that source) and the same
journal contains the mapped absorption account. Both sides keep their original
posted signs and amounts. Every result reconciles
`netExpenseBase = actualCostBase + allocationChargeBase - absorbedBase`.
Positive `actualCostBase - absorbedBase` means under-absorption; negative means
over-absorption. Base and native calculations never use JavaScript floating money.

**Safe assumptions and limits:** classification uses the **current** posting
mapping and configured fleet center, not an invented historical configuration.
Reports disclose this basis, the unverified legacy openings, and the fact that
posted ledger amounts do not verify physical trips, fuel use or shipment rates.
Fleet comparisons are unavailable (null, never fabricated zero) when the center
or distinct expense-account mappings are missing, when absorption lines use
another/missing center anywhere in the period, or when an account/party/entry/
currency filter narrows one side of the comparison. A fleet-center-only filter
is allowed, but cannot conceal misplaced absorption. Cost-center expense
analysis remains usable in these narrower scopes.

The four-language report tab exposes the actual cost, allocation, absorption,
net expense and over/under variance, exact currency precision, full-scope totals,
pagination and safe CSV download. A recorded cutover flag is not a claim that an
operational consumer is live. Empty posted scopes are labeled as incomplete
coverage, not proof that historical costs were zero. Shipping margin per
loading/order still requires trustworthy posted invoice and shipment attribution;
this report does not synthesize that missing integration.

Cost-report database tests run rollback-only and cover period/company isolation,
closed activation, multicurrency precision, partial scopes, unassigned costs,
large exact totals, reversals, misplaced absorption, missing configuration and
historical retired resources. Regression checks include existing GL reports;
SSR checks render the real result component in all four locales.

### Booked shipping margin per loading/order

`GET /api/accounting/v2/shipping-margin` and `/shipping-margin/csv` are read-only
accounting-RBAC reports, available before financial activation. Strict filters
support company, date range, loading/order view, numeric order ID, exact loading
reference, currency, party and cost center. Loading references are opaque Unicode
identifiers; only numeric IDs normalize Persian/Arabic digits. CSV exports the
entire selected scope, bounded to 10,000 grouped rows, with spreadsheet-safe text,
exact decimal amounts, provenance metadata and explicit blank unknown amounts.

Shipping account classification uses current same-company `SHIPPING_REVENUE`
(revenue) and `SHIPPING_EXPENSE` (expense) mappings; this is disclosed rather
than represented as frozen historical configuration. A line is attributable only
through the original posted journal's exact company/source identity and an
immutable, same-order operational fact. Revenue requires `LoadingCompleted`;
cost requires `ShipmentCostRecorded` and its explicit loading reference. Reversals
inherit their original attribution and retain original posted signs/amounts.
Unlinked invoices (including `SalesInvoice` without a loading fact), manual
shipping entries, malformed facts and ambiguous history remain visible as
unattributed evidence; they are never spread across an order's trucks or guessed
from current logistics, prices, rates, native order status or outbox amounts.

**Date basis:** row inclusion uses captured fact or posted financial activity in
FROM..TO. Main row amounts are cumulative posted amounts **through TO** for the
selected groups, so a late shipment cost can compare with earlier booked revenue.
Separate period amounts use journal entry dates strictly within FROM..TO.
Order view includes every captured loading in that selected order through TO,
even when only one loading had period activity. Totals cover all selected groups,
not just the current page, and their cumulative basis is explicitly labeled.

**Evidence and unknowns:** capture-only facts are not journals. Missing revenue,
missing cost for any loading, pending cost facts, partial currency/party/center
line filters, and incomplete mappings block the margin, not turn unknown cost
into zero. Original native shipment costs must match immutable external
actual-cost/currency evidence or the internal frozen rate × frozen measured
tons/km, rounded at the registered currency precision; reversals are not compared
as net values against the original expected cost. Missing/malformed snapshots
and amount/currency mismatches block margin while preserving the booked figures.
No current fleet rate or FX rate recalculates historical amounts.

Known-margin totals sum only complete groups; full selected-scope margin is null
when there are incomplete groups, unmatched company-period lines, unlinked
company facts or no groups. Unmatched-line coverage follows company-period line
filters, not order/loading selection. Unlinked-fact coverage is company-wide
through TO and includes invalid-date facts as temporally unknown evidence.
Invalid calendar dates/decimal JSON are checked without unsafe casts that could
abort the report. Retained facts survive business deletion; no live customer/
order edits or financial cutover are performed by this report.

The UI is Persian/Arabic/English/Turkish with RTL and exact base-currency display,
null-vs-zero semantics, paging, refresh, scope-safe CSV and localized evidence
warnings. Booked margins do **not** prove physical shipment completion, a verified
legacy opening, an active event consumer, or all actual transport costs.
Rollback-only database tests cover the two views, late costs, multicurrency
filters, company isolation, zero/reversal amounts, pending/mismatched evidence,
frozen fleet rates, malformed dates and unlinked income. SSR tests render the
actual result component, including incomplete multi-loading order totals.
DB workbench checks run inside the existing rollback-only customer-report fixture;
receipt/return regression suites verify unchanged posting and carrying values.