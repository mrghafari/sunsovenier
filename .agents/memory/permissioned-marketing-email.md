---
name: Permissioned marketing email
description: Safety rules for campaigns sent to customers and prospects.
---

Marketing campaigns must treat an email address as contact data, not permission to send. Existing customers need active explicit marketing consent; prospects need mailbox verification. Normalize and deduplicate recipients by email and recheck consent, suppression, and campaign state immediately before delivery.

**Why:** Customer and prospect identities come from separate sources, concurrent subscription requests can race, and SMTP acceptance cannot be transacted with database updates. Unsafe shortcuts can cause unauthorized or duplicate email.

**How to apply:** Keep privileged campaign controls restricted to verified active super admins. Use global email suppression, signed absolute unsubscribe links, bounded database-backed leases, conservative non-retryable handling after uncertain SMTP acceptance, and a trusted HTTPS public origin. Keep the worker disabled until origin and campaign SMTP are explicitly validated.