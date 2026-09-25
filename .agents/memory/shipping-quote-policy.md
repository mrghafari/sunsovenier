---
name: Shipping quote policy
description: Why smart vehicle quotes and standard shipping rates have distinct validation paths.
---

Smart vehicle shipping must use a short-lived server-verifiable quote bound to the catalog cart, active center, destination, route, selected method, and checkout flow. A quote from one checkout's vehicle pricing algorithm is not interchangeable with another's. Standard methods instead use the active server-side rate and route, independent of whether vehicle templates are available.

**Why:** Rejecting all client-submitted prices without a verifiable replacement broke smart checkout; allowing any signed vehicle quote for any method would reintroduce undercharging by method substitution. Requiring a vehicle quote for standard methods would block legitimate orders with no vehicle templates.

**How to apply:** In future checkout changes, never trust the posted shipping cost or vehicle. Reject stale or mismatched smart quotes before payment or reservation; price ordinary delivery from its server rate after route validation, and validate active pickup methods before applying their route exemption.

An ordinary delivery quote requires an active rate that covers the selected destination. Do not interpret a delivery method's zero default cost as free shipping when no rate matches.

**Why:** A zero default on a method can otherwise present an unsupported destination as free delivery, even though no actual rate was configured for it.

**How to apply:** Make the cart quote and order validation use the same catalog, method, destination, and rate facts. If a route or rate is unavailable, show that state rather than a perpetual calculation or a zero price.

React shipping-quote effects must use stable references for optional geography lists while those lists are unavailable.

**Why:** Creating a fresh empty array on every render retriggers a quote effect, whose cleanup aborts the previous request. Even a valid rate can then remain stuck as calculating or unavailable indefinitely.

**How to apply:** When optional cities or regions are dependencies of quote effects or quote callbacks, use a shared immutable empty fallback or memoized array and check for similar unstable default values.