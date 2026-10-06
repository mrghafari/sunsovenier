export const LOADING_STATES=["ORDER_CREATED","CARRIER_ASSIGNED","ENTRY_PERMIT_ISSUED","MAIN_GATE_IN","WAITING_YARD","CALLED",
  "WAREHOUSE_GATE_IN","TARE_WEIGH","LOADING","GROSS_WEIGH","DOCUMENTS_ISSUED","WAREHOUSE_GATE_OUT","MAIN_GATE_OUT","CLOSED","CANCELLED"] as const;
export type LoadingState=typeof LOADING_STATES[number];
export const LOADING_ROLES=["customer","sales_admin","main_gate_officer","warehouse_gate_officer","weighbridge_operator",
  "loading_operator","warehouse_manager","hse_officer","loading_manager"] as const;
export type LoadingRole=typeof LOADING_ROLES[number];
export const LOADING_SECTIONS=["overview","orders","main-gate","yard","warehouse-gate","weighbridge","loading","documents","reports","settings","simulator"] as const;
export type LoadingSection=typeof LOADING_SECTIONS[number];
export const ROLE_SECTIONS:Record<LoadingRole,readonly LoadingSection[]>={
  customer:["overview","orders","documents"],sales_admin:["overview","orders","reports"],
  main_gate_officer:["overview","main-gate","yard"],warehouse_gate_officer:["overview","warehouse-gate"],
  weighbridge_operator:["overview","weighbridge"],loading_operator:["overview","loading"],
  warehouse_manager:["overview","yard","warehouse-gate","loading","reports"],hse_officer:["overview","settings"],
  loading_manager:LOADING_SECTIONS,
};
export interface LoadingModuleStatus{enabled:boolean;phase:2;inventoryMode:"module-owned-simulation";realInventoryEnabled:false;financialPostingEnabled:false}
export interface LoadingFoundation extends LoadingModuleStatus{
  schemaReady:boolean;missingTables:string[];actor:{namespace:"admin"|"custom";id:number};
  roles:LoadingRole[];sections:LoadingSection[];states:readonly LoadingState[];workflowApiAvailable:false;
}