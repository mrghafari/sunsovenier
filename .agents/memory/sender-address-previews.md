---
name: Sender address previews
description: Keep displayed email sender addresses consistent with the actual delivery path.
---

Display the sender address resolved by the same SMTP configuration logic used for delivery, including its category fallback. Do not infer the address from a category label or a separately maintained setting. Distinguish an assigned SMTP account from a fallback and show the last test status separately: an address stored in settings does not prove the connection works.

Invoice emails are different from automatic category-based messages: staff explicitly choose an active sender account, and sending must fail if that account becomes inactive rather than silently falling back to another address.

**Why:** A selected category can have no active SMTP configuration and fall back to another sender. A preview based only on category metadata would promise an address that is not used. Even an active setting can have a failed or untested connection. An explicit invoice sender choice must not be replaced without the operator's knowledge.

**How to apply:** When adding a sender selector or confirmation anywhere in the project, use the delivery resolver for its address preview and show an unavailable state if no active sender is configured. For manual invoice sends, list active accounts, bind the selected account by ID at delivery time, and report SMTP acceptance rather than claiming delivery to the inbox.