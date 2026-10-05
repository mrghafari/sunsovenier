import {z} from "zod";

export const loadingShippingApprovalSchema=z.object({
  companyId:z.number().int().positive().max(2147483647),
  factId:z.number().int().positive().max(2147483647),
  amount:z.string().regex(/^[0-9]{1,30}([.][0-9]{1,8})?$/),
  evidenceReference:z.string().trim().min(5).max(500),
  reason:z.string().trim().min(5).max(500),
}).strict();
export interface LoadingFixedShipping {
  orderTotal:string;
  approvedTotal:string;
  remaining:string;
  allocation:string|null;
  evidenceReference:string|null;
}
