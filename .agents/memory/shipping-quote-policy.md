---
name: Shipping quote policy
description: Why smart vehicle quotes and standard shipping rates have distinct validation paths.
---

Smart vehicle shipping must use a short-lived server-verifiable quote bound to the catalog cart, active center, destination, route, selected method, and checkout flow. A quote from one checkout's vehicle pricing algorithm is not interchangeable with another's. Standard methods instead use the active server-side rate and route, independent of whether vehicle templates are available.

**Why:** Rejecting all client-submitted prices without a verifiable replacement broke smart checkout; allowing any signed vehicle quote for any method would reintroduce undercharging by method substitution. Requiring a vehicle quote for standard methods would block legitimate orders with no vehicle templates.

**How to apply:** In future checkout changes, never trust the posted shipping cost or vehicle. Reject stale or mismatched smart quotes before payment or reservation; price ordinary delivery from its server rate after route validation, and validate active pickup methods before applying their route exemption.

Every checkout's quote issuer must carry the authenticated contract identity when
checkout binds the quote to a contract. Apply the saved contract shipping mode in
every purchase form, not just one checkout page.

**Why:** The bilingual purchase form requested an ordinary quote for contractual
goods and ignored the contract's shipping mode, while order validation correctly
required a matching contract identity. That produced binding failures and could
send customer-arranged transport through company vehicle pricing.

**How to apply:** Invalidate cached quotes when contract identity or shipping mode
changes. Customer-arranged transport selects the active self-pickup method and
uses the server's quote-exempt zero-freight path; company-arranged bulk transport
uses bulk-category templates in both issuance and validation. Do not silently
change contractual shipping terms to make an order succeed.

For automatic-delivery contracts, customer-arranged self transport is always an
allowed customer choice, even when a company template is available.

**Why:** The user explicitly chose “always, at the customer's choice”; automatic
template selection does not make company transport mandatory.

**How to apply:** Accept the active canonical self-pickup method without a vehicle
quote and charge no company freight. Keep ordinary vehicle-quote checks for
company delivery, and retain customer-only restrictions on self-transport contracts.

An ordinary delivery quote requires an active rate that covers the selected destination. Do not interpret a delivery method's zero default cost as free shipping when no rate matches.

**Why:** A zero default on a method can otherwise present an unsupported destination as free delivery, even though no actual rate was configured for it.

**How to apply:** Make the cart quote and order validation use the same catalog, method, destination, and rate facts. If a route or rate is unavailable, show that state rather than a perpetual calculation or a zero price.

React shipping-quote effects must use stable references for optional geography lists while those lists are unavailable.

**Why:** Creating a fresh empty array on every render retriggers a quote effect, whose cleanup aborts the previous request. Even a valid rate can then remain stuck as calculating or unavailable indefinitely.

**How to apply:** When optional cities or regions are dependencies of quote effects or quote callbacks, use a shared immutable empty fallback or memoized array and check for similar unstable default values.

Frontend quote readiness must follow the address source that the order will actually use, not whether an optional address editor is open. A city placeholder derived from a country name is not a selected city.

**Why:** An optional second-address editor may start open even while a customer has selected a complete saved address. Using editor visibility to choose the quote destination blocks valid saved addresses; falling back to the primary city while a second address is incomplete can price the wrong route.

**How to apply:** Resolve the selected saved/primary address versus an entered secondary or recipient address first, then require street, city and country from that source before requesting a non-pickup quote or showing a payable total. A missing city must remain missing.