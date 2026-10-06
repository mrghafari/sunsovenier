# Manual journals and paid expenses

The existing accounting workspace has a Documents & Expenses panel. It does not
modify checkout, stock, logistics, customer wallets, or supplier/payables modules.

## Drafts versus financial posting

`accounting_manual_documents` holds versioned staff documents outside the ledger.
A draft is not a journal, expense recognized in reports, cash payment, or opening
balance. Structurally valid unbalanced drafts and drafts dated in a closed period
can be saved for later correction. Each row must still use one positive debit or
credit, exact currency precision, company-safe active accounts and cost centers.

Create and edit require management permission. Source IDs remain stable across
retry and edit; optimistic revision checks prevent stale overwrites. Discarding a
draft retains immutable history rather than physically deleting its evidence.
Posted and discarded documents cannot be edited or revived.

General manual journals remain **company base-currency only**. Paid expenses
also support an active foreign currency through the proven path below. There are no client
exchange rates, historical overrides, customer/carrier settlement dimensions,
arbitrary source types or journal IDs. Account mappings that control customer
receivables, wallets, inventory, cheques and automated FX are excluded. Bank,
cash, bank fee and shipping expense mappings remain available; safe unmapped
posting accounts are available for ordinary manual journals.

A **paid expense** has exactly two equal lines: expense debit with an active cost
center, and mapped bank/cash credit. This is not a supplier invoice, unpaid bill,
tax calculation, stock-cost posting or wallet-funded expense.

## Foreign paid expenses

Both staff-entered lines use one active native currency and its own precision.
The official central-bank rate effective on the expense date values the expense.
The bank/cash credit consumes the account/currency's remaining **pooled historical
GL carrying value**, proportionally for a partial outflow and exactly for its final
native residual. The difference is an explicit mapped FX gain/FX loss line in base
currency. Insufficient native funds, negative/unreconciled carrying values,
backdated funding, missing official rates and missing FX accounts block posting.
They do not prohibit preparing a structurally valid draft.

Preview is read-only and uses actual posted ledger balances, not a claim about
physical cash or a fabricated opening. Posting recalculates under the ledger lock.
`accounting_manual_expense_books` is immutable, derived by a database trigger and
contains the original document and complete native/base/FX lines. Clients cannot
supply historical bases, rates, account overrides, or valuation proofs.

The proof, document linkage, journal and audit commit together. Orphan proofs,
changed evidence and journals that differ from the proof fail closed. Composable
writers defer proof checks before their first dependent insert and verify them
immediately before returning. The native last minor unit may legitimately carry
zero base value; only exact proven lines get this exception.

Reversal copies every original native amount, rate and base carrying value exactly,
including zero residuals and the FX line; it never reprices at the cancellation
date's rate. It cannot predate later movements of the same funding pool.
Posted detail displays the original proof snapshot, not today's balance or rate.
Foreign readiness guards are separate from the still-closed financial cutovers.

## Closed activation boundary

Financial actions require all of:
- Active company and its active base currency.
- Core and manual-document database integrity guards.
- Existing wallet and receipt pipeline cutovers.
- Separate `accounting_manual_cutovers.processing_ready`, absent/default false.

There is no UI/API action to enable these flags. Migration creates no enabled
company rows and does not insert openings. Staff can prepare drafts while
financial activation stays closed.

Posting requires explicit staff attestation, evidence reference, a balanced
document and an open posting period. It atomically posts through the existing
`postJournalEntry`, links the immutable document and records its audit entry.
Manual sources cannot produce an orphan journal through another writer.

Reversal only targets the document's own posted journal, uses the existing exact
reversal writer and preserves the original. Its date cannot precede the original,
and must lie in an open period (which may be later than a now-closed original
period). Reason, evidence and explicit attestation are required. Document linkage
and reversal evidence are checked before the transaction returns.

## API

Under `/api/accounting/v2/manual-documents`, all endpoints require accounting
viewer access and normal same-origin protection for POST:
- `GET /metadata?companyId=...`, `GET /?companyId=...`, `GET /:id?companyId=...`:
  real company-scoped, no-store repeatable-read snapshots; filtered pagination.
- `POST /preview`: authoritative read-only validation and base debit/credit,
  signed difference, balance and fiscal-period eligibility; no draft/journal write.
- `POST /`: create/edit draft `{document,id?,revision?}`.
- `POST /:id/discard`: `{companyId,revision,attested:true}`.
- `POST /:id/post`: same shape, closed financial gates enforced server-side.
- `POST /:id/reverse`: additionally `{entryDate,reason,evidenceReference}`.

History displays staff-authored descriptions/reasons/evidence unchanged, action
labels localized, linked journal identifiers and actual audit timestamps. Draft
amounts are not combined with posted report totals.

## Migration and checks

Additive module migrations `0018` through `0021` install tables and guards.
`npm run accounting:migrate:dev` applies it **only in development**, never on
application startup or build. Production requires the approved migration/rollout
procedure; do not assume publishing JavaScript installs database tables.

Unit tests cover decimal precision, unbalanced drafts, expense structure, rejected
unsafe dimensions/source overrides and strict filters. The opt-in DB suite uses
one new company inside a fully rolled-back transaction. Its activation fixtures
are never committed; it exercises cutover/RBAC blocks, CRUD, revision/retry safety,
posting/reporting, reversal, direct tampering and successive financial operations
after a previous operation made constraints immediate.

The rollback-only foreign expense suite covers bank gains, cash losses, partial
and exact final consumption, later-rate reversals, zero-value final minor units,
closed gates, unproven sources, immutable proofs and unsafe chronology. It creates
its own temporary base currency so real currency precision settings are untouched.