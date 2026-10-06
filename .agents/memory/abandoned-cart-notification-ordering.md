---
name: Abandoned-cart notification ordering
description: Reliability rules for warning customers before automatic cart deletion.
---

Create the in-app notification independently of email or SMS delivery, and treat each delivery channel’s actual result honestly. If the final-warning and deletion thresholds coincide, defer deletion until a later worker run.

**Why:** Email configuration can be unavailable, SMS may not be connected, and equal timing thresholds can otherwise create and immediately erase the final warning before the customer can see it.

**How to apply:** Deduplicate in-app notices per cart and notification stage, report failed or unavailable delivery channels without claiming success, and exclude carts newly given their final warning from deletion in that same processing run.