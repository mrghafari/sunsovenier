import type { InventoryDocumentInput, InventoryDocumentMetadata, InventoryDocumentRow } from "@shared/accounting-inventory-documents";
import { normalizeAccountingDigits } from "./accounting-logic";
import type { InventoryAction } from "./accounting-inventory-api";

export type InventoryDraftLine = { productId:string; batchReference:string; quantityTons:string; totalCost:string };
export type InventoryDraft = { kind:"purchase"|"opening"; reference:string; documentDate:string; supplier:string; currency:string; evidenceReference:string; notes:string; lines:InventoryDraftLine[]; sourceId:string; id?:number; revision?:number };
export type PendingInventoryAction = { action:InventoryAction; row:InventoryDocumentRow };
export const blankInventoryLine = ():InventoryDraftLine => ({productId:"",batchReference:"",quantityTons:"",totalCost:""});
export const blankInventoryDraft = (kind:"purchase"|"opening"="purchase",currency=""):InventoryDraft => ({kind,reference:"",documentDate:"",supplier:"",currency,evidenceReference:"",notes:"",lines:[blankInventoryLine()],sourceId:""});

export function createInventorySourceId(randomUUID:()=>string|undefined=()=>globalThis.crypto?.randomUUID?.()) {
  return `inventory-${randomUUID()??`${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}
function normalize(value:string) {
  return normalizeAccountingDigits(value.trim()).replace(/٫/g,".").replace(/٬/g,"");
}
function decimalValid(value:string,decimals:number) {
  const normalized=normalize(value);
  if(!/^(?:0|[1-9]\d{0,21})(?:\.\d{1,8})?$/.test(normalized))return false;
  const [integer,fraction=""]=normalized.split(".");
  return fraction.length<=decimals&&!/^0+$/.test(integer+fraction);
}
export function gregorianInventoryDateValid(value:string) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const parsed=new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
}
export function validateInventoryDraft(draft:InventoryDraft,companyId:number|undefined,metadata:InventoryDocumentMetadata|undefined) {
  const lineErrors:Record<number,string>={};
  const fieldErrors:string[]=[];
  if(!companyId||!metadata||metadata.companyId!==companyId)fieldErrors.push("company");
  if(draft.reference.trim().length<3||draft.reference.trim().length>160)fieldErrors.push("reference");
  if(!gregorianInventoryDateValid(draft.documentDate))fieldErrors.push("documentDate");
  if(draft.kind==="purchase"&&draft.supplier.trim().length<2||draft.supplier.trim().length>200)fieldErrors.push("supplier");
  if(!draft.currency||!metadata?.currencies.some(currency=>currency.code===draft.currency))fieldErrors.push("currency");
  if(draft.evidenceReference.trim().length<5||draft.evidenceReference.trim().length>500)fieldErrors.push("evidenceReference");
  if(draft.notes.trim().length>2000)fieldErrors.push("notes");
  if(draft.sourceId.trim().length<8||draft.sourceId.trim().length>120)fieldErrors.push("sourceId");
  if(draft.lines.length<1||draft.lines.length>100)fieldErrors.push("lines");
  const currencyDecimals=metadata?.currencies.find(currency=>currency.code===draft.currency)?.decimals;
  const products=metadata?.products??[];
  const keys=new Set<string>();
  draft.lines.forEach((line,index)=>{
    const productId=Number(normalize(line.productId));
    const key=`${productId}:${line.batchReference.trim()}`;
    const invalid=!Number.isInteger(productId)||!products.some(product=>product.id===productId)||
      line.batchReference.trim().length<2||line.batchReference.trim().length>160||
      !decimalValid(line.quantityTons,8)||currencyDecimals===undefined||!decimalValid(line.totalCost,currencyDecimals)||keys.has(key);
    if(invalid)lineErrors[index]="line";
    keys.add(key);
  });
  return {valid:fieldErrors.length===0&&Object.keys(lineErrors).length===0,fieldErrors,lineErrors};
}
export function inventoryDraftInput(draft:InventoryDraft,companyId:number):InventoryDocumentInput {
  return {
    companyId,sourceId:draft.sourceId,id:draft.id,revision:draft.revision,kind:draft.kind,reference:draft.reference.trim(),
    documentDate:draft.documentDate,supplier:draft.kind==="purchase"?draft.supplier.trim():"",currency:draft.currency,
    evidenceReference:draft.evidenceReference.trim(),notes:draft.notes.trim(),
    lines:draft.lines.map(line=>({productId:Number(normalize(line.productId)),batchReference:line.batchReference.trim(),quantityTons:normalize(line.quantityTons),totalCost:normalize(line.totalCost)})),
  };
}
export function validateInventoryActionConfirmation(action:InventoryAction,reason:string,attested:boolean) {
  const preservedReason=reason.trim();
  if(preservedReason.length<5||preservedReason.length>500)return {valid:false as const,error:"reason" as const};
  if(action==="approve"&&!attested)return {valid:false as const,error:"attestation" as const};
  return {valid:true as const,reason:preservedReason};
}
export async function confirmInventoryDocumentAction(input:{
  canManage:boolean; companyId:number|undefined; pending:PendingInventoryAction|null; reason:string; attested:boolean;
  submit:(request:{id:number;action:InventoryAction;companyId:number;revision:number;reason:string})=>Promise<unknown>;
}) {
  const pending=input.pending;
  if(!pending||!inventoryActionAllowed(input.canManage,pending.row,input.companyId,pending.action))return {submitted:false as const,error:"permission" as const};
  const confirmation=validateInventoryActionConfirmation(pending.action,input.reason,input.attested);
  if(!confirmation.valid)return {submitted:false as const,error:confirmation.error};
  await input.submit({id:pending.row.id,action:pending.action,companyId:pending.row.companyId,revision:pending.row.revision,reason:confirmation.reason});
  return {submitted:true as const};
}
export function isStaleInventoryDocumentError(error:unknown) {
  return Boolean(error&&typeof error==="object"&&("code" in error&&(error as {code?:string}).code==="STALE_DOCUMENT"))||
    (error instanceof Error&&error.message.includes("STALE_DOCUMENT"));
}
export function inventoryDraftFromRow(row:InventoryDocumentRow):InventoryDraft {
  return {kind:row.kind,reference:row.reference,documentDate:row.documentDate,supplier:row.supplier,currency:row.currency,evidenceReference:row.evidenceReference,notes:row.notes,sourceId:row.sourceId,id:row.id,revision:row.revision,lines:row.lines.map(line=>({productId:String(line.productId),batchReference:line.batchReference,quantityTons:line.quantityTons,totalCost:line.totalCost}))};
}
export function scopedInventoryDocument(row:InventoryDocumentRow|undefined,companyId:number|undefined,id:number|undefined) {
  return row&&row.companyId===companyId&&row.id===id?row:undefined;
}
export function inventoryActionAllowed(canManage:boolean,row:InventoryDocumentRow,companyId:number|undefined,action:"edit"|InventoryAction) {
  if(!canManage||row.companyId!==companyId)return false;
  if(action==="edit"||action==="approve"||action==="discard")return row.status==="draft";
  return row.status==="approved";
}
export async function reloadInventoryStaleRecord(input:{
  selectedId:number|undefined; companyId:number|undefined; formOpen:boolean; pendingAction:PendingInventoryAction|null;
  refetchDetail:()=>Promise<{data?:InventoryDocumentRow}>; refetchList:()=>Promise<unknown>;
}) {
  const result=input.selectedId?await input.refetchDetail():undefined;
  const row=result?.data;
  const fresh=Boolean(row&&row.companyId===input.companyId&&row.id===input.selectedId);
  await input.refetchList();
  if(!fresh||!row)return {resolved:!input.selectedId,row:undefined,draft:undefined,closeForm:false,pendingAction:input.pendingAction};
  const action=input.pendingAction;
  const actionStillValid=action?.row.id===row.id&&((action.action==="approve"||action.action==="discard")?row.status==="draft":row.status==="approved");
  return {
    resolved:true,row,draft:input.formOpen&&row.status==="draft"?inventoryDraftFromRow(row):undefined,
    closeForm:input.formOpen&&row.status!=="draft",
    pendingAction:actionStillValid?{...action,row}:null,
  };
}
