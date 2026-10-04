---
name: Serial sequence safety
description: Prevent duplicate-key failures when imported or restored rows advance IDs without advancing PostgreSQL sequences.
---

Tables written by public or customer-facing forms must be included in the application's sequence-synchronization coverage when their data can be imported, restored, or copied with explicit IDs.

**Why:** A table can contain rows whose maximum ID is ahead of its serial sequence. The next normal insert then fails with a duplicate primary key and appears to users as an unrelated HTTP 500.

**How to apply:** When adding an auto-increment table to import, restore, seed, or data-copy workflows, ensure its sequence is synchronized to the current maximum ID before accepting new writes.

Do not restart the sequence-synchronizing application while rollback-only tests
are inserting into legacy shared tables.

**Why:** Startup MAX(id) cannot see the test transaction's uncommitted rows, but
setval changes the sequence outside that transaction. It can reset the sequence
behind IDs already inserted by the same test and cause artificial duplicate keys.

**How to apply:** Finish the application restart before running those integration
suites; rerun a suite affected by startup synchronization without another restart.