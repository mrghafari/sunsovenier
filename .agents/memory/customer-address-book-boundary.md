---
name: Customer address-book boundary
description: Why additional delivery addresses should not overwrite the CRM legacy secondary fields.
---

Store additional named delivery destinations in the customer address book; do not copy each checkout's destination or mobile into the CRM customer's single legacy secondary address and alternate-phone fields. Order delivery details remain immutable snapshots.

**Why:** A customer can have many distinct titled addresses. Updating a single CRM secondary slot for every newly saved address or checkout destroys the preceding legacy value and makes deleted addresses appear to return.

**How to apply:** Use address-book CRUD for new destinations, leave CRM primary contact details to profile editing, and keep old free-form CRM secondary addresses selectable only with explicitly confirmed geography. Do not silently parse a city or country from legacy free-form text.

Order review must show only the delivery destination selected in the cart, whether primary, secondary, saved or newly entered. It is a confirmation step, not another address selector.

**Why:** The user explicitly requested that “Review your order” retain the cart's selected address and remove all other address options.

**How to apply:** Keep address selection in the cart and preserve that destination through review and submission. Do not delete saved address-book records or silently replace a missing selection with the primary address.