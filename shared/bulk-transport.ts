export type TransportCategory="standard"|"bulk";
export function requiresBulkContractTransport(contractId:unknown,products:{isBulkSale?:boolean|null}[]):boolean {
  return Number.isSafeInteger(Number(contractId))&&Number(contractId)>0&&products.some(p=>p.isBulkSale===true);
}
export function eligibleTransportTemplates<T extends {id:number;isActive?:boolean|null;transportCategory?:string|null}>(
  templates:T[],category:TransportCategory,selectedId?:number|null):T[] {
  return templates.filter(t=>t.isActive===true&&(t.transportCategory??"standard")===category&&
    (selectedId==null||t.id===selectedId));
}
