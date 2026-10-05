# Accounting completion and activation boundary

## Delivered foundations

- Documented shipment-cost capture and a separately closed-gate financial
  workbench for external-carrier payables and frozen internal-fleet absorption.
  Original native/base cost and dated official FX are retained; stale manager
  plans, duplicate/conflicting commands and independent reversal are blocked.
  This is not a live worker, carrier payment or approved real-world cutover.
- Approved purchase/opening capitalization workbench: one original GL journal
  and every inventory carrying layer commit atomically, with documentary cost,
  supplier reference, dated official acquisition FX evidence, cumulative rounding,
  immutable provenance and command-idempotent retry. Dedicated supplier-invoice
  liability recognition is not a bank payment or a supplier master/statement.
  Base-currency opening evidence is required; foreign openings cannot be
  manufactured from current/acquisition rates. All capitalization activation
  remains closed; no real opening, physical stock change or funds are seeded.
- Foreign loading invoice valuation uses a separately closed gate, real dated
  official-rate evidence and immutable native/base receivable and component values.
  Cumulative component conversion conserves the original total without fictional
  FX rounding income; stock COGS always consumes original base-currency carrying
  layers. Optional own-order hold settlement clears original AR and pooled wallet
  carrying values with explicit realized FX, preserving retry and rollback safety.

- Immutable, balanced ledger, fiscal closing, reversal, source idempotency, RBAC
  and accounting action capture.
- Reference setup, country packs, currency/rate/tax/account mapping management.
- Staged wallet liability/holds, settlements, receipts/cheques/returns and manual
  documents, with individually closed financial activation gates.
- Posted journal, ledger, trial balance, customer statement/aging, reconciliation,
  cost-center/fleet absorption and booked shipping-margin reports.
- Four-language UI for reference setup, reports, receipts and manual documents.
- Read-only captured-loading arithmetic and metadata-only audit history.
- Capture-only loading entry linked to frozen shop orders, with exact measured
  line weights, explicit kg/ton price conversion and documented inventory-cost
  attestations. This is not verified inventory valuation or invoice issuance.
- Contract-based cumulative order-weight control and immutable Commercial
  review evidence, with a four-language Commercial sales review surface.
- Four-language documentary purchase/opening inventory register with explicit
  batch quantities, currency-precise documented costs and review/withdrawal history.
- Read-only documentary FIFO replay with purchase-layer provenance, exact
  cumulative cost rounding and explicit unknown/shortfall states in four languages.
- Closed-gate loading invoice handler: real AR, immutable posted-stock FIFO
  allocations, base-currency COGS and optional same-order hold settlement commit
  atomically. The four-language workbench shows blockers and posted references;
  it does not offer financial activation.

These foundations do not mean a loading creates a live invoice, inventory
valuation is verified, legacy openings are reconciled, or a consumer is enabled.

## Remaining sequence

The user selected **reviewed manual allocation** for fixed-order freight:
finance enters and approves each loading's share; combined approvals must not
exceed the immutable order freight total. The reviewed approval service and
four-language form are available in Accounting → Reports → Loading preview;
the development migration is applied. The report exposes the fixed order total,
approved shares, unallocated remainder and each loading's approval provenance.
Currency precision, snapshot consistency, immutable approvals, idempotency and
the combined cap are enforced. A zero share requires explicit approval.
This records allocation evidence only: it does not issue invoices, post journals,
move stock, debit wallets or activate consumers. Production migration and
activation remain separate decisions.
The customer cart/contract amount is sales consideration, not verified supplier
purchase cost or stock carrying value. Do not treat it as COGS evidence.

1. **Complete loading invoice and stock-cost evidence.** The preview calculates
   captured tons × locked per-ton prices, line-rounded goods/tax, explicit
   per-ton shipping, and due dates from captured payment terms. It rejects
   unknown units, missing/legacy snapshots and nonzero fixed-order shipping
   without allocation evidence. Fixed freight now uses reviewed manual shares;
   its remainder stays explicitly unallocated. Still required:
   actual opening/historical-consumption reconciliation and real purchase/
   opening source documents. Closed-gate capitalization, transactional stock cost attribution and
   reviewed weight checks are available in the closed-gate handler.
   Aggregate loaded-vs-ordered
   control and Commercial approval are implemented (the user's designated
   approver, not finance), not financially activated.
   The user specified that the permitted aggregate overweight must be stated
   in the contract and that this contractual condition is the governing limit,
   rather than a general company tolerance. Use the agreement version belonging
   to the order; missing or unverifiable terms are unknown, not an assumed zero
   or default percentage. Do not reinterpret product-quality tolerance as an
   aggregate order-weight allowance. The report includes every captured loading,
   not just the visible page. New captures freeze their contract evidence; missing
   terms cannot become known retroactively. A new loading requires a new review
   of the cumulative total. Commercial review cannot change contractual limits.
   The user approved only the limited measurement/document-evidence connection
   in warehouse/logistics/order surfaces. Changes to reservation, physical stock,
   selling prices, payment timing or live financial activation remain excluded.
2. **Complete the staged financial pipeline.** Base and reviewed foreign-currency loading invoice,
   real receivable, fixed carrying-layer consumption and optional own-hold
   settlement now have a transactional handler and rollback-only integration
   tests. There is no automatic consumer or eligibility change. Stock layers
   require approved documents and matching original posted inventory journals;
   documentary FIFO or staff cost attestations alone cannot supply them.
   Stock ledger/remaining-layer value must reconcile, earlier late-recorded
   trucks/layers cannot rewrite booked FIFO, and independent reversals/voids
   of financially attached evidence are blocked. Closed-gate purchase/opening
   capitalization and foreign invoices with original base-stock costs now have
   transactional handlers. Remaining: actual documentary openings and reconciliation,
   coordinated invoice/AR/stock/settlement returns,
    coordinated shipment-cost returns, and separately approved worker retry/backoff and
   error provenance. Real opening evidence and activation are still outstanding.
   Never flip event eligibility or start a consumer merely because arithmetic
   succeeds.
    Shipment/fleet posting now has an explicit manager handler and four-language
    capture/posting workbench, not an automatic consumer. The independent base
    and foreign shipment cutovers remain closed; genuine opening/cutover evidence
    must be reviewed before activation. A posted external cost recognizes the
    carrier payable, not a bank payment. Carrier party IDs are explicitly
    accountant-attested identifiers, not inferred from customer/vehicle IDs.
3. **Complete foreign wallet refunds and partial receipt returns.** Preserve
   pooled native/base book values, original allocations and settlement evidence,
   protect holds/other currencies, and recognize realized FX explicitly.
   No direct balance/status edits or independent reversal shortcuts.
4. **Credit approval connection is staged, not activated.** New prepaid orders
   and explicitly registered new bank/cash credit orders have a finance approval
   path. Customer/currency policies come from explicitly linked CRM wallets.
   Exposure includes open AR, only active AR allocations of uncleared cheques,
   and approved unbilled order commitments. Partial invoices replace rather than
   duplicate their corresponding commitments. Ledger parity and a separate
   reconciled credit opening are mandatory. Historical, paid and contract orders
   cannot be enrolled. A four-language accounting panel exposes real amounts,
   missing evidence and management registration/approval actions.
   The user approved new-order finance connections while preserving pricing and
   inventory rules. Native finance changes are limited to the new-order branch;
   old orders retain their previous route. Both new finance branches require
   accounting management permission and same-origin requests.
   Still required before activation: actual AR/cheque opening evidence, complete
   invoice/COGS/settlement consumers, coordinated reversal/cancellation of issued
   documents and full signed-in/multi-currency end-to-end verification.
5. **Reconcile openings and approve a cutover.** Obtain actual opening/stock/
   wallet/AR/asset evidence, reconcile native balances with GL and freeze the
   old/new order boundary. Never manufacture zeros or conversion rates.
6. **Full end-to-end verification, then explicit activation approval.** Cover
   finance hold → repeated/multi-truck loadings → AR/COGS → settlement →
   shipment cost → cancellation/refund/reversal and tied-out reports in all
   supported currencies. Signed-in UI verification remains outstanding without
   test credentials. Production migration/activation/publishing are separate
   decisions and have not been performed.

## Read-only loading arithmetic

### Documentary FIFO replay

Accounting → FIFO documentary trace uses
`GET /api/accounting/v2/inventory-fifo-preview`. All current approved inventory
documents and all captured `LoadingCompleted` history in the selected company
are replayed before any order filter or pagination. Draft/discarded/voided
documents and other companies are excluded. Layer order is document date,
document ID, then line index; outflows are event date then fact ID. Future-dated
layers cannot supply earlier loadings. Allocations identify original document
revision/reference/date, product/batch, measured tons and native-currency cost.
Cumulative currency rounding conserves the original layer cost across splits;
no selling price, catalog quantity, loading cost declaration or guessed FX is used.

An unresolved earlier stock shortfall blocks later calculations for that product;
an invalid prior capture blocks all subsequent replay. A malformed unknown date
blocks the whole history. Repeated product/batch identities across documents
are ambiguous, not additional stock. Partial allocations can show known
documented portions, but the loading's total remains null until fully covered.
Unknown shortage quantities are null, not zero. Native currency groups are never
summed across currencies. Known rounding zeros remain distinct from missing costs.
History above the explicit calculation limit fails rather than being truncated.

This is `documentary_simulation`, with `postingAllowed:false` and
`stockChanged:false` even when coverage is complete. Current approved sources
are recalculated; these are not immutable historical financial allocations.
Uncaptured historical movements, stock opening reconciliation, base carrying
values and transactional invoice consumption remain unresolved. No allocation
is persisted/reserved, no cost journal/receivable/wallet movement is created,
and no outbox eligibility or processing/cutover flag changes. Production
activation and publishing have not been performed.

### Documentary purchase and opening inventory source

The user selected document entry inside Accounting and will provide actual
documents separately. Accounting → Purchase & opening inventory uses
`/api/accounting/v2/inventory-documents` to register those source records.
Nothing is seeded: empty companies/records, missing documents and unavailable
values remain explicit. Purchase records require a supplier; both purchase and
opening records require a document reference, Gregorian date, documentary
evidence reference, currency and positive measured-ton product/batch lines with
exact documented costs. Foreign values remain in their original currency;
no FX rate, base carrying amount, opening balance or selling-price cost is invented.

Drafts support revisioned editing and retained-history discard. Review requires
a staff-entered reason; approval freezes the document. Voiding retains the prior
approval and adds attributed withdrawal evidence; financially used documents
cannot be voided through this registry. Company, active-manager access, actual
dates, unique source/active-document references, exact totals, decision timestamps,
idempotency and immutable history are enforced server-side and by database guards.
All transitions write accounting audit records atomically.

Approval is **documentary only**, not posted inventory valuation, available
stock, an opening reconciliation or FIFO allocation. The register creates no
journal, AR, wallet movement, outbox event or native catalog/stock/reservation
change. No purchase supplier payable or cost capitalization journal is issued
here. Linking actual documented layers to reconciled stock carrying values and
implementing controlled FIFO consumption remain part of steps 1–2.
The UI includes real metadata, pagination, create/edit/detail/approve/discard/void,
read-only role states, stale-revision reload and duplicate-submit protection in
all four languages. The legacy Accounting identity interface remains numeric;
this addition does not claim to migrate its UUID-incompatible staff-auth path.

`GET /api/accounting/v2/loading-previews` accepts company, optional numeric order
ID, page and page size. Existing accounting RBAC applies. The report enumerates
immutable `LoadingCompleted` facts, including blocked legacy/malformed facts,
using a consistent read-only transaction. No catalog, current shipping/rate,
native order status, estimated delivery weight or edited customer terms is used.

The calculator validates company/order/source identity and weighbridge reference.
Every measured line must have a unique stored line ID and explicit metric-ton
price basis (or a native unit explicitly identifying metric tons, or new matching
immutable evidence for the physical 1,000 kg/ton conversion). Captured line
weights must sum exactly to the captured total. Goods and tax round per line at
the registered transaction currency precision; tax is the captured goods-line
percentage, not a current-country default. This preliminary calculator does not
infer additional shipping tax rules. Shipping uses explicit captured per-ton
terms; zero fixed shipping needs no allocation, nonzero fixed shipping is blocked.
Due date is loading date plus immutable payment terms.

Unknown tax is not zero, package/kg price is not per-ton price, and legacy
snapshots are not accepted by updating them. Results carry unconditional
`postingAllowed:false`, `readOnly:true` and explicit pending inventory-cost,
weight-approval, AR/settlement and opening/cutover dependencies. Even valid
arithmetic is **not** an issued invoice or financial posting readiness.

## Limited measured-loading connection

`GET /api/accounting/v2/loading-context` resolves one native customer order ID or
its actual business order number, scoped to the selected bound accounting company.
`POST /api/accounting/v2/loading-capture` requires accounting management permission.
Operational department access alone does not grant permission to attest cost data.
Source binding must already be configured; company choice cannot bind/reprice an
unconfigured order. No automatic source binding, opening or financial activation
is performed.

The additional warehouse/logistics surface records a stable loading reference,
real weighbridge-ticket reference, Gregorian event day and measured decimal-string
weights for persisted order lines. Totals must match exactly. Future company-local
days are rejected. It never copies an estimated dispatch weight or updates native
order/warehouse status, inventory, quantity, price, wallet balance or reservation.

Optional batch cost attestations specify the order line, batch reference, purchase
document reference, measured batch weight, actual documented amount and currency.
Several batches may cover one line; supplied batch weights must equal that measured
line. Cost amounts respect active currency precision. No cost is inferred from
`batch_sales_tracking.unit_price`, which is sale information, and no default costs
are generated for undocumented lines. This is staff-document attestation only,
not verified purchase evidence, FIFO allocation or stock carrying value; all
inventory-cost posting dependencies remain pending.

Immutable native price snapshots are unchanged. New loading facts separately
freeze the exact conversion for explicit metric units only, so a captured kg price
can be converted by 1,000; unknown package conversions and legacy snapshots remain
blocked. Existing loading facts are never amended or retroactively enabled.

The operational fact, cost/price evidence, actor, accounting audit and ineligible
outbox event are written in one transaction. Stable source identity supports exact
retries and rejects conflicting input. No edit/delete or consumer activation is
provided. Stored attestations are visible in the loading history. Rollback-only
tests cover scope, idempotency, precision, nonmutation and absence of financial
entries. No schema migration is needed.

No migration is required. Unit tests include the 24.350-ton case, IQD/USD/IRR,
rounding, unknown units/taxes, duplicates, malformed facts, fixed shipping and
overflow. Rollback-only DB tests cover scope, pagination, legacy data and absence
of journals, receivables, wallet mutations or activation.

## Accounting action history

Commercial weight reviews also have their own immutable evidence registry,
available under Commercial → Weight reviews (`/mrg/shop?unit=sales&tab=weight-reviews`).
Its active-role authorization checks Commercial permissions independently of
Accounting and preserves custom-user UUIDs rather than inventing numeric IDs.
Numeric admin approvals additionally appear in the existing accounting audit;
custom-user approvals retain their real UUID in the Commercial registry, since
the legacy accounting audit's actor column supports numeric IDs only.
Development migrations are applied; no real order has been approved in testing,
no financial gate has been enabled, and publishing remains a separate decision.
Rollback-only DB tests cover contractual limits, namespace identity, scope,
exact retries, changed history, immutable evidence and no financial effects.
Four-language component smoke tests and the frontend/server builds pass.
The signed-in UI still requires an authenticated browser verification.

`GET /api/accounting/v2/audit` and `/audit/csv` expose selected-company accounting
audit **metadata only**: actor namespace/ID, exact action and entity identifiers,
UTC timestamp and whether a before/after snapshot was stored. Raw snapshot JSON,
contact data and account credentials are not part of the response or CSV.
This view does not claim tamper-proof audit storage or coverage of unlogged
actions in other modules; global/unbound actions are explicitly excluded.

Date filters follow the selected company's local calendar day, including its
midnight and excluding the next midnight. Actor ID zero is valid for system
actions. Action/type filters are exact literal matches, not wildcard searches.
Pagination has stable timestamp/ID ordering. CSV covers all selected records,
not the visible page, is capped at 10,000, and neutralizes spreadsheet formulas.
All new routes send `Cache-Control: no-store`.

The UI retains raw action codes rather than inventing their meaning, renders
timestamps in the company's timezone/Gregorian calendar with localized labels,
and has company/filter/page guards against stale results or exports. Database
tests cover Tehran midnight boundaries, company isolation, system actions,
literal filters, redacted payloads, export and nonmutation. Four-language SSR
tests exercise the actual view.