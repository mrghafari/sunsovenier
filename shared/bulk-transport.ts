export type TransportCategory="standard"|"bulk";
export function requiresBulkContractTransport(contractId:unknown,products:{isBulkSale?:boolean|null}[],packagingType?:string|null):boolean {
  return Number.isSafeInteger(Number(contractId))&&Number(contractId)>0&&
    (packagingType != null ? packagingType === "bulk" : products.some(p=>p.isBulkSale===true));
}
export function eligibleTransportTemplates<T extends {
  id:number;isActive?:boolean|null;transportCategory?:string|null;
  supportsContract?:boolean|null;supportsBulk?:boolean|null;
}>(
  templates:T[],category:TransportCategory,selectedId?:number|null,contractRequired=false):T[] {
  // Legacy bulk templates retain their former permissions until migrated.
  // Explicit false always wins, so disabling a capability cannot fall back.
  return templates.filter(t=>t.isActive===true&&
    (category==="bulk" ? (t.supportsBulk??t.transportCategory==="bulk")
      : (t.transportCategory??"standard")==="standard")&&
    (!contractRequired||(t.supportsContract??t.transportCategory==="bulk"))&&
    (selectedId==null||t.id===selectedId));
}
