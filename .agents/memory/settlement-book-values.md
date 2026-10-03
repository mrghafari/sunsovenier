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