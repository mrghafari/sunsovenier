---
name: Contract lifecycle distinction
description: Why ending a sales contract must not be inferred from its inactive flag.
---

An explicitly ended sales contract belongs in a read-only ended archive. An ordinarily inactive contract remains in the current list and may still be edited or explicitly ended.

**Why:** Inactivity can be a temporary pause; treating every older inactive record as ended would silently remove editing rights and misstate its history. Ending also stops new checkout claims without erasing old orders or allocations.

**How to apply:** Require an explicit end action and persist its occurrence. Enforce immutability on the server, not just by hiding UI buttons. Never backfill ended status from inactivity or timestamps alone without confirmed intent.