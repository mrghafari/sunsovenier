---
name: Settlement book values
description: Why foreign-currency settlements must not blindly reuse the latest FX rate.
---

Foreign-currency settlement must clear the actual remaining historical base-currency
book value of AR and customer prepaid liability, not recalculate both at the newest
rate. Record the realized FX difference explicitly and close the final residual exactly.

**Why:** A zero customer-currency balance can otherwise leave a nonzero company-base
balance in the control account, so the native balance looks settled while the GL is wrong.

**How to apply:** Review invoice and prepaid carrying values when implementing
partial/final settlement, refunds, cheque transfers and chargebacks. Keep unsupported
FX flows explicitly blocked rather than booking apparently balanced but incorrectly
valued journals. Activation must wait for that valuation path to be verified.

Treat a customer's same-currency prepaid balance as a pooled liability: allocate
its remaining actual GL carrying value proportionally, not by invented funding
lots. AR uses the individual invoice's remaining carrying value. Final settlement
uses each exact residual rather than rounding a fraction of the original again.

**Why:** Customer prepaid funds are fungible; there is no business agreement
assigning particular top-ups to particular invoices. Individual invoice debts,
however, must retain their own historical valuation and settlement history.

**How to apply:** Keep this policy consistent when extending settlement and
refund handling. Do not silently switch to FIFO funding or current-rate values.
Revaluation support must maintain invoice-specific carrying values as well as
the customer-currency control-account balance.

A positive native foreign balance can legitimately have zero remaining base
carrying value after rounding in a coarse base currency.

**Why:** Base-currency rounding can consume the last base unit before the last
foreign minor unit. Rejecting its final settlement leaves a real customer-currency
debt open; fabricating a minimum base unit invents money.

**How to apply:** Allow this only for explicitly proven historical settlement
lines. Preserve the native amount and exact zero base residual; ordinary journals
must retain their positive-base and official-rate safeguards.