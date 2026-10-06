---
name: Partial-return evidence and effective debt
description: Why partial returns must preserve original counters and use posted adjustments for collections and reports.
---

Partial returns preserve the original invoice, receipt and allocation evidence.
Once a receivable has a partial adjustment, retain its original payment counter;
do not rewrite it to fit subsequent refunds or collections.

**Why:** Recollection after a documented refund can make cumulative payments
exceed the original invoice face while effective debt is still valid. Rewriting
the original counter both loses evidence and conflicts with legacy face bounds.

**How to apply:** Compute effective open debt from original face minus posted
payments minus goods-return debt reductions plus receipt-return restorations.
Use the same dated evidence in collection caps, foreign carrying, exposure,
receivables and customer reports. Preserve the user's unpaid-debt-first policy.
Block legacy full reversals after partial adjustments; otherwise historical
counter-based paths can credit already refunded money a second time.

Check customer/currency AR ledger parity as well as the original invoice proof.

**Why:** A valid original invoice can coexist with an unlinked manual AR entry;
its source proof alone cannot establish the customer's current actual debt.

**How to apply:** Block adjustments until effective subledger debt and customer
AR agree. Never use unrelated balances to authorize additional customer credit.

A returned receipt already linked to a goods return needs its own coordinated
design, not an independent additional receipt payout.

**Why:** The goods return may already have reduced that debt or restored customer
credit; independently refunding the original receipt can duplicate compensation.

**How to apply:** Fail explicitly until a reviewed coordination path supplies
independent evidence. Never erase incurred freight or carrier payables as part
of a goods return.
