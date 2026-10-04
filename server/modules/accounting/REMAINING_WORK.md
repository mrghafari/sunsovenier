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

These foundations do not mean a loading creates a live invoice, inventory
valuation is verified, legacy openings are reconciled, or a consumer is enabled.

## Remaining sequence

1. **Complete loading invoice and stock-cost evidence.** The preview calculates
   captured tons × locked per-ton prices, line-rounded goods/tax, explicit
   per-ton shipping, and due dates from captured payment terms. It rejects
   unknown units, missing/legacy snapshots and nonzero fixed-order shipping
   without allocation evidence. Still required: a frozen, reviewed fixed-shipping
   allocation/residual policy; actual FIFO/stock cost attribution; aggregate
   loaded-vs-ordered weight/tolerance controls and excess-weight finance approval.
   Required changes to warehouse/logistics/order modules need prior user approval.
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
4. **Connect credit exposure to finance approval.** Use validated customer/CRM
   identities, customer-currency limits, open AR and uncleared cheques without
   counting the same cheque exposure twice. Explain exact external-module
   changes and obtain approval before editing finance approval.
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
price basis (or a native unit explicitly identifying metric tons). Captured line
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