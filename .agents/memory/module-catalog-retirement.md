---
name: Module catalog retirement
description: Retiring assignable navigation modules without breaking permissions still used by operational workflows.
---

Retiring a management tile removes it from the active module catalog and role-assignment display, but does not automatically delete historical role grants or internal order-processing APIs.

**Why:** The old Order Management tile was removed while finance, warehouse, and other order workflows still depended on legacy permission IDs. Deleting grants as part of a display cleanup could silently remove access to those workflows.

**How to apply:** Change the shared active catalog for future module additions/removals; verify the management navigation and assignable counts follow it. Treat old saved permissions as compatibility data unless a separate, explicit authorization migration has been requested.