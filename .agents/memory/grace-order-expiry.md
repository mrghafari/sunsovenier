---
name: Grace-order expiry
description: Rules for reminder timing, expiry selection, and audit history of payment-grace orders.
---

Treat each order’s stored payment deadline as authoritative. Reminder workers should catch up after the configured hour while the deadline is still in the future, and automatic expiry must update both order views plus status history with a system reason.

**Why:** Inferring expiry from creation time and hard-coded payment labels diverges from admin-configured deadlines. Exact-hour reminder checks permanently miss orders created later that day, and notes alone do not provide a reliable workflow audit.

**How to apply:** Select only unpaid grace-payment orders with no receipt and a passed stored deadline; recheck under a database lock, record the cancellation reason atomically, and deduplicate successful reminders across later catch-up runs.