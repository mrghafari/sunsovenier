---
name: Foreign invoice rounding
description: Source-specific rounding, original carrying evidence and coordinated historical reversals of foreign invoices.
---

Value the native customer receivable at the official rate documented for the
invoice date. Convert its goods, tax and freight in that fixed order using
cumulative component rounding so the frozen base credits equal that original
receivable. Preserve all native component amounts exactly.

For historical payouts, a final native remainder may legitimately have zero
base carrying value. Keep that exact zero value authoritative and preserve a
positive historical incoming-rate reference from the same customer liability or
funding pool; never substitute today's rate, invent a nonzero carrying amount,
or relax the ordinary positive-rate/zero-journal safeguards.

**Why:** Historical carrying amounts and rate provenance are different evidence.
Coarse base-currency rounding can consume the entire base value before the final
native unit. Repricing that final unit creates an unsupported balance or FX
event; widening generic journal permissions lets unrelated zero entries through.

**How to apply:** Any zero-carry or below-rate-precision foreign settlement needs
immutable, source-specific amount evidence and traceable historical rate evidence,
with an exact final residual and independent ordinary-zero rejection tests.

**Why:** Independently rounding each foreign component and the invoice total can
produce an unbalanced base journal. Treating that difference as realized FX
would invent an exchange event. The source-specific evidence records the
allocation explicitly; it is not a general journal override or a claim that
country-specific statutory reporting rules have been reviewed.

**How to apply:** Keep conversions immutable and visible with their rate date
and reference. New rate records affect only unposted plans and require a fresh
plan hash; retries of posted invoices use their original proof. Financial
activation still requires real documents and review.

Foreign sales do not make inventory carrying principal foreign. Consume the
original base-currency stock layers for COGS; settlement clears the invoice's
own historical base receivable and the wallet's remaining pooled liability,
with genuine realized FX recorded separately.

**Why:** Converting acquisition costs at the later selling/settling rate would
rewrite inventory history, and clearing native balances alone can leave base
control-account residuals.

**How to apply:** Keep native debt, base sales valuation, stock cost and payment
FX distinct in the ledger and UI. Never change physical stock, selling prices
or financial activation merely because the invoice arithmetic is supported.

Exact reversal arithmetic alone is not sufficient for a newly supported
historical-valued source: database provenance permissions must recognize its
coordinated reversal without permitting arbitrary historical-value journals.

**Why:** A foreign loading reversal could retain every original amount and rate
yet be rejected because the historical-source proof did not cover reversals.
Changing an official rate after the original invoice exposed the missing proof.

**How to apply:** Test foreign reversals after a rate change, preserve existing
source-specific permissions, and admit only exact original lines backed by an
authorized atomic return command. Do not revalue at today's rate or weaken the
general historical-cost checks to make the reversal pass.
