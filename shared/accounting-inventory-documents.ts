import {z} from "zod";
const id=z.coerce.number().int().positive().max(2147483647);
const weight=z.string().regex(/^(?:0|[1-9]\d{0,21})(?:\.\d{1,8})?$/).refine(v=>Number(v)>0,"Positive measured tons required");
const amount=z.string().regex(/^(?:0|[1-9]\d{0,21})(?:\.\d{1,8})?$/).refine(v=>Number(v)>0,"Positive documented cost required");
export const inventoryDocumentSchema=z.object({
  companyId:id,sourceId:z.string().trim().min(8).max(120),id:id.optional(),revision:id.optional(),
  kind:z.enum(["purchase","opening"]),reference:z.string().trim().min(3).max(160),
  documentDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{
    const d=new Date(v+"T00:00:00Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;
  },"Real Gregorian date required"),
  supplier:z.string().trim().max(200),currency:z.string().regex(/^[A-Z]{3}$/),
  evidenceReference:z.string().trim().min(5).max(500),notes:z.string().trim().max(2000).default(""),
  lines:z.array(z.object({productId:id,batchReference:z.string().trim().min(2).max(160),
    quantityTons:weight,totalCost:amount}).strict()).min(1).max(100),
}).strict().superRefine((d,c)=>{
  if(d.kind==="purchase"&&d.supplier.length<2)c.addIssue({code:"custom",path:["supplier"],message:"Supplier required"});
  if(Boolean(d.id)!==Boolean(d.revision))c.addIssue({code:"custom",path:["revision"],message:"ID and revision must be supplied together"});
  const keys=d.lines.map(l=>`${l.productId}:${l.batchReference}`);
  if(new Set(keys).size!==keys.length)c.addIssue({code:"custom",path:["lines"],message:"Duplicate product/batch line"});
});
export const inventoryDocumentActionSchema=z.object({companyId:id,revision:id,reason:z.string().trim().min(5).max(500)}).strict();
export const inventoryDocumentQuerySchema=z.object({companyId:id,page:id.default(1),pageSize:id.max(100).default(20)}).strict();
export type InventoryDocumentInput=z.infer<typeof inventoryDocumentSchema>;
export interface InventoryDocumentLine {productId:number;productName:string;productSku:string|null;batchReference:string;quantityTons:string;totalCost:string;}
export interface InventoryDocumentRow {
  id:number;companyId:number;sourceId:string;revision:number;kind:"purchase"|"opening";reference:string;
  documentDate:string;supplier:string;currency:string;evidenceReference:string;notes:string;
  lines:InventoryDocumentLine[];totalCost:string;totalTons:string;status:"draft"|"approved"|"discarded"|"voided";
  approval:null|{actorId:string;actorType:string;at:string;reason:string};
  closure:null|{actorId:string;actorType:string;at:string;reason:string};
  postingAllowed:false;stockChanged:false;valuationStatus:"documentary_only";
}
export interface InventoryDocumentList {rows:InventoryDocumentRow[];total:number;page:number;pageSize:number;}
export interface InventoryDocumentMetadata {
  companyId:number;currencies:{code:string;decimals:number}[];
  products:{id:number;name:string;sku:string|null}[];
  postingAllowed:false;stockChanged:false;valuationStatus:"documentary_only";
}
