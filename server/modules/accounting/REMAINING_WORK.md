# Accounting completion and activation boundary

## Delivered foundations

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
   actual FIFO/stock cost attribution; aggregate
   loaded-vs-ordered weight/tolerance controls and aggregate excess-weight
   Commercial department approval (the user's designated approver, not finance).
   The user specified that the permitted aggregate overweight must be stated
   in the contract and that this contractual condition is the governing limit,
   rather than a general company tolerance. Use the agreement version belonging
   to the order; missing or unverifiable terms are unknown, not an assumed zero
   or default percentage. Do not reinterpret product-quality tolerance as an
   aggregate order-weight allowance. This contract-based control remains to be
   implemented; Commercial review cannot silently change contractual limits.
   The user approved only the limited measurement/document-evidence connection
   in warehouse/logistics/order surfaces. Changes to reservation, physical stock,
   selling prices, payment timing or live financial activation remain excluded.
2. **Implement staged transactional consumers/handlers.** Invoice recognition
   must post AR first, attach a real receivable item and COGS evidence, then
   settle/release only that loading's approved hold. Original event identity,
   retry/backoff, posting/error provenance, cancellation/reversal and no
   double-debit for historical paid orders must be tested together.
   Never flip event eligibility or start a consumer merely because arithmetic
   succeeds.
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