---
name: Destination-local delivery appointments
description: Interpreting dispatcher-selected delivery dates and times when the destination differs from the dispatcher's location.
---

The dispatcher's selected delivery appointment is local to the recipient's delivery destination, not the browser or dispatch office. Store the instant and its IANA destination timezone separately. The actual time the order was dispatched is a different event and must not be replaced by the selected appointment. When an older checkout snapshot lacks a reliable country, require an explicit timezone rather than inferring it from a mutable customer profile or free-form address.

**Why:** An appointment at 10:00 in Iran must not be treated as 10:00 in Iraq; many existing orders lack a country in their saved delivery snapshot, and guessed zones could silently alter promised times.

**How to apply:** Use the recipient's checkout destination for known-country defaults, label the chosen timezone, reject ambiguous or nonexistent local times, and keep legacy date-only estimates date-only until a dispatcher selects a new appointment. Format the appointment consistently in the saved destination timezone across logistics and tracking.