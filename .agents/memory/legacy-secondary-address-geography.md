---
name: Legacy secondary-address geography
description: Why older free-form second addresses need a separately chosen city before quoting delivery.
---

Older customer profiles can contain a second address as a single free-form CRM string rather than a structured saved-address record. Do not parse a city or country from that string to choose a shipping route; require an explicit city selection before quoting or submitting the order. New saved addresses should retain their structured geography.

**Why:** The string may contain commas in the street address, and an earlier CRM synchronization also appended city and country for display. Splitting on commas or borrowing the primary address's city can price delivery to the wrong destination.

**How to apply:** When exposing legacy secondary addresses in checkout or migrating them to the structured address book, ask the customer to confirm the destination city and province instead of silently inferring either.