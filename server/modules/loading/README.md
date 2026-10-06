# Independent Loading Management — phase 2 foundation

This is a module of the existing application, not a separate app or an extension
of the old logistics/accounting capture screens.

## Current delivery

Phase 2 installs the isolated schema, scoped role catalogue, state machine,
exact kg quantities, authenticated foundation API and a foundation-only UI.
**It does not yet expose operational workflow APIs or customer forms, hardware
simulators, generated PDFs, reports or operational sample data.**
These are phases 3–5. Do not treat the foundation screen as a live plant board.

The approved MVP inventory is **module-owned simulation only**. No call deducts
native shop/Kardex stock, changes wallet/payment timing or posts accounting.
Every new order, loading, document and stock operation is explicitly simulated.
Products/customer adapters are read-only contracts; implementations follow.
CoA/MSDS may not be invented for real use. Sample documents must be watermarked.

## Development migration and tests

```
NODE_ENV=development npx tsx server/modules/loading/migrate.ts
npx tsx --test server/modules/loading/state-machine.test.ts server/modules/loading/access.test.ts
NODE_ENV=development LOADING_DB_TEST=1 npx tsx --test --test-concurrency=1 server/modules/loading/inventory-db.test.ts
```

The checksum-tracked SQL migration owns all `loading_` objects and runs in one
transaction with an advisory lock. It refuses production, never runs at boot,
does not use global schema-push, and seeds only module settings/role metadata.
Operational demo data is a separate future action. Database tests roll back their
public-module fixtures; the real parallel-connection test uses a disposable
`loading_test_` schema and removes it in `finally`. No native stock/financial
writes are required, and no operational/audit test rows are left in the module.

## Flag, routes and access

`LOADING_MODULE_ENABLED=true` enables the module; `false` disables it.
Absent flag: development foundation enabled, production disabled. Invalid
values are disabled. No secret or shared environment setting is changed here.
`/api/loading/module-status` is public feature metadata only; all other routes
are disabled with 404 when the flag is off.
`/api/loading/foundation` reuses existing verified management sessions and active
roles; unauthenticated requests receive 401 and ungranted roles 403.
The new `loading_management` permission participates in the existing module
catalogue. Nine workflow roles live in `loading_roles`, with scoped assignments
in `loading_role_assignments` referencing native identity namespaces. Existing
administrator access follows the native privileged role convention, including
the known historical `Supper Admin` spelling. No users or old grants are changed.
Customer-session ownership and the assignment-management API arrive in phase 3;
no customer operational endpoints are exposed in this phase.

Frontend mounts are `/management/loading` and `/management/loading/*`. The
Management menu entry follows existing permissions and hides when the flag is off.

## Workflow and integrity

The sequence includes CALLED as a distinct warehouse authorization. Gates,
weighing, loading, document issue and exits require evidence and scoped roles.
Tare overrides/returns need supervisor approval with a reason. A rejected gross
reading cannot issue documents. Cancellation of an inside-plant truck is refused
until a controlled exit exception is implemented; it cannot hide occupancy or
silently restore deducted inventory.

Canonical mass is exact kg with up to eight decimal places. Bag/pallet conversion
requires explicit per-unit evidence in phase 3; no catalog unit is guessed.
NaN/infinite/negative quantities are refused. UTC timestamps and configured plant
timezone are separate from localized/Jalali presentation. Initial Asia/Baghdad
is an editable simulation setting, not inferred user location or live telemetry.

Document issuance foundation locks the loading, parent order and simulation
stock; checks five ready document records, stored weights, batch and tolerance;
inserts a unique immutable deduction, advances state and appends immutable audit
in one transaction. Repeated/parallel calls for a Loading ID do not deduct twice.
This internal primitive is not an endpoint or a substitute for phase-3 evidence
and authorization services. File existence, source CoA/MSDS validation and
document rendering must be implemented before any public issuance API.

## Remaining phases

3. Authenticated customer/staff operational APIs, read-only master-data adapters,
   module-stock adapter, permits, gate/queue operations, safety and blacklists,
   measured evidence, approvals, settings, simulated devices/notifications.
4. Functional forms/screens, private uploads/documents, QR permits, PDF generation,
   four languages/RTL/Jalali and polling of actual module queues.
5. Honest timestamp-based reports and Excel, simulator UI, explicit module-only
   demo seed, full workflow/regression tests and real-device replacement guide.