import type {LoadingModuleStatus} from "../../../shared/loading/contracts";
export function loadingModuleEnabled(value=process.env.LOADING_MODULE_ENABLED,environment=process.env.NODE_ENV){
  // Safe production default; development foundation is inspectable without
  // changing any shared environment/configuration or starting business workers.
  return value===undefined?environment==="development":value==="true";
}
export function loadingModuleStatus():LoadingModuleStatus{
  return {enabled:loadingModuleEnabled(),phase:2,inventoryMode:"module-owned-simulation",realInventoryEnabled:false,financialPostingEnabled:false};
}