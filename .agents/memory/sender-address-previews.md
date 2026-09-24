---
name: Sender address previews
description: Keep displayed email sender addresses consistent with the actual delivery path.
---

Display the sender address resolved by the same SMTP configuration logic used for delivery, including its category fallback. Do not infer the address from a category label or a separately maintained setting. Distinguish an assigned SMTP account from a fallback and show the last test status separately: an address stored in settings does not prove the connection works.

**Why:** A selected category can have no active SMTP configuration and fall back to another sender. A preview based only on category metadata would promise an address that is not used. Even an active setting can have a failed or untested connection.

**How to apply:** When adding a sender selector or confirmation anywhere in the project, use the delivery resolver for its address preview and show an unavailable state if no active sender is configured.