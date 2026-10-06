import {z} from "zod";
import {loadingInvoiceCommandSchema} from "./accounting-loading-invoices";
import {shipmentCostCommandSchema} from "./accounting-shipment-costs";

export const postingQueueCommandSchema=z.discriminatedUnion("kind",[
  z.object({kind:z.literal("LOADING_INVOICE"),command:loadingInvoiceCommandSchema}).strict(),
  z.object({kind:z.literal("SHIPMENT_COST"),command:shipmentCostCommandSchema}).strict(),
]);
export const postingQueueSubmitSchema=z.object({
  sourceId:z.string().trim().min(5).max(150),reviewConfirmed:z.literal(true),posting:postingQueueCommandSchema,
}).strict();
export const postingQueueScopeSchema=z.object({
  companyId:z.coerce.number().int().positive().max(2147483647),
  page:z.coerce.number().int().min(1).default(1),
  pageSize:z.coerce.number().int().min(1).max(100).default(20),
}).strict();
export type PostingQueueCommand=z.infer<typeof postingQueueCommandSchema>;
export const postingSourceSchema=z.object({
  companyId:z.number().int().positive().max(2147483647),
  factId:z.number().int().positive().max(2147483647),kind:z.enum(["LOADING_INVOICE","SHIPMENT_COST"]),
}).strict();
export interface PostingBatchResult {companyId:number;paused:boolean;processed:number;completed:number;retry:number;review:number}
export interface PostingQueueHistory {
  companyId:number;processingEnabled:boolean;
  rows:{id:number;sourceId:string;kind:PostingQueueCommand["kind"];factId:number;
    status:"pending"|"running"|"retry"|"review"|"completed";attempts:number;nextAttemptAt:string;
    errorCode:string|null;errorStep:string|null;result:Record<string,unknown>|null;posting:PostingQueueCommand}[];
  pagination:{page:number;pageSize:number;totalRows:number};
}
