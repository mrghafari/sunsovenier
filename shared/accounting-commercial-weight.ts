import {z} from "zod";
import type {LoadingWeightControl} from "./accounting-loading-preview";
const id=z.coerce.number().int().positive().max(2147483647);
export const commercialWeightQuerySchema=z.object({
  companyId:id,orderId:id.optional(),orderNumber:z.string().trim().min(1).max(150).optional(),
}).strict().refine(d=>Boolean(d.orderId)!==Boolean(d.orderNumber),"Exactly one order ID or order number is required");
export const commercialWeightApprovalSchema=z.object({
  companyId:id,orderId:id,historyKey:z.string().regex(/^[a-f0-9]{64}$/),
  evidenceReference:z.string().trim().min(5).max(500),reason:z.string().trim().min(5).max(500),
}).strict();
export interface CommercialWeightReview {
  companyId:number;orderId:number;orderNumber:string|null;weightControl:LoadingWeightControl;
  historyKey:string;approved:boolean;canApprove:boolean;postingAllowed:false;
  approval:null|{evidenceReference:string;reason:string;actorId:string;actorType:string;approvedAt:string};
}
