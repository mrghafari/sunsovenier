---
name: Historical receivables reporting
description: Date-based customer debt reporting must use historical posting evidence rather than mutable settlement counters.
---

For an as-of receivables report, reconstruct settlements from posted journal dates and their receipt/cheque/wallet evidence. Do not use today's settled amount or receipt/allocation status to calculate an earlier date.

**Why:** A later receipt return or cheque bounce restores the current debt and changes allocation status. Using those current fields would incorrectly change a previously reported month even though its original payment was valid then.

**How to apply:** Count a payment only when its posted journal is effective by the selected date; restore it only from the posted return/bounce date. Apply the same date boundary to wallet settlements and reversals. Keep legacy opening reconciliation explicitly unverified.

Do not invent deadlines for ledger debt that lacks registered invoice due-date evidence. Show the unexplained debit or credit separately per customer and currency, rather than marking it overdue or netting different customers together.

**Why:** General ledger entries can establish a balance without proving its invoice or payment deadline; an unassigned credit does not prove that a particular invoice was settled.

**How to apply:** Age only registered, posted invoice debt with stored due dates. Reconcile its remaining native amount to the customer's posted AR balance and expose the signed difference as unknown-due debt or unclassified credit.