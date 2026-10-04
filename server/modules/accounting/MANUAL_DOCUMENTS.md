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

Only **company base-currency** documents are supported. There are no client
exchange rates, historical overrides, customer/carrier settlement dimensions,
arbitrary source types or journal IDs. Account mappings that control customer
receivables, wallets, inventory, cheques and automated FX are excluded. Bank,
cash, bank fee and shipping expense mappings remain available; safe unmapped
posting accounts are available for ordinary manual journals.

A **paid expense** has exactly two equal lines: expense debit with an active cost
center, and mapped bank/cash credit. This is not a supplier invoice, unpaid bill,
tax calculation, stock-cost posting or wallet-funded expense.

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

Additive module migration `0018_manual_documents.sql` installs tables and guards.
`npm run accounting:migrate:dev` applies it **only in development**, never on
application startup or build. Production requires the approved migration/rollout
procedure; do not assume publishing JavaScript installs database tables.

Unit tests cover decimal precision, unbalanced drafts, expense structure, rejected
unsafe dimensions/source overrides and strict filters. The opt-in DB suite uses
one new company inside a fully rolled-back transaction. Its activation fixtures
are never committed; it exercises cutover/RBAC blocks, CRUD, revision/retry safety,
posting/reporting, reversal, direct tampering and successive financial operations
after a previous operation made constraints immediate.