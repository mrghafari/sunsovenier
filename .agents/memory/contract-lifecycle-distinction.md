---
name: Contract lifecycle distinction
description: Why ending a sales contract must not be inferred from its inactive flag.
---

An explicitly ended sales contract belongs in a read-only ended archive. An ordinarily inactive contract remains in the current list and may still be edited or explicitly ended.

The recorded delivery date is a contractual delivery deadline, not an automatic contract expiry. Remaining-time displays must name that deadline, use whole calendar days, and state explicitly when it is missing or a legacy date cannot be interpreted safely.

**Why:** Inactivity can be a temporary pause; treating every older inactive record as ended would silently remove editing rights and misstate its history. Ending also stops new checkout claims without erasing old orders or allocations. Contracts do not currently have a separate validity/expiry clock; treating an overdue delivery promise as expiry would invent a different lifecycle rule.

**How to apply:** Require an explicit end action and persist its occurrence. Enforce immutability on the server, not just by hiding UI buttons. Never backfill ended status from inactivity or timestamps alone without confirmed intent. An ended contract shows its ended state instead of an ongoing countdown; a merely inactive one may still display its delivery deadline.