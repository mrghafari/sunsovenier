// The module's checksum-tracked SQL migration is authoritative. Never include
// this isolated schema in the legacy application's global schema-push.
export const loadingTableNames=[
  "loading_roles","loading_role_assignments","loading_settings","loading_products","loading_batches","loading_stock",
  "loading_carriers","loading_drivers","loading_vehicles","loading_orders","loading_bays","loading_loadings","loading_permits",
  "loading_pass_cards","loading_gate_events","loading_weighings","loading_loading_records","loading_documents",
  "loading_exceptions","loading_blacklist","loading_audit_logs","loading_stock_movements","loading_notifications",
] as const;