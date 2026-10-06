---
name: Contract number namespace
description: Why contract and order numbers have similar formats but independent sequences.
---

Contract numbers should use the order-style two-digit year and five-digit annual counter with a C prefix, but use an independent annual counter from customer orders.

**Why:** The requested visual consistency does not mean a shared sequence. Contract creation must not advance the M order counter or change the next customer order number. Existing manual contract numbers may already occupy part of the C range.

**How to apply:** Keep number generation atomic with contract creation. When changing the format or importing old contracts, account for existing C numbers without modifying order numbering.