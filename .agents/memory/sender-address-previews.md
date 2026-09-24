---
name: Sender address previews
description: Keep displayed email sender addresses consistent with the actual delivery path.
---

Display the sender address resolved by the same SMTP configuration logic used for delivery, including its category fallback. Do not infer the address from a category label or a separately maintained setting.

**Why:** A selected category can have no active SMTP configuration and fall back to another sender. A preview based only on category metadata would promise an address that is not used.

**How to apply:** When adding a sender selector or confirmation anywhere in the project, use the delivery resolver for its address preview and show an unavailable state if no active sender is configured.