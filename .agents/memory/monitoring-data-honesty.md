---
name: Monitoring data honesty
description: Rules for presenting server configuration and health data without implying unverified values are real.
---

Monitoring must distinguish values that are configured, values verified by a live probe, process-local metrics, and unavailable data. Missing configuration and failed queries must remain unknown rather than becoming plausible defaults or zero.

**Why:** A configured credential does not prove service reachability, wildcard IPs are not host addresses, process uptime is not machine uptime, and zero on query failure hides outages.

**How to apply:** Label generated snapshots and polling accurately, use null/unavailable states for failed metrics, identify Node heap and process uptime explicitly, and report healthy only after a relevant live check succeeds.