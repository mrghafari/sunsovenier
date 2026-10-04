import {z} from "zod";
import {dateString} from "./accounting-api";
export const accountingAuditFiltersSchema=z.object({
  companyId:z.coerce.number().int().positive().max(2147483647),
  from:dateString,to:dateString,
  actorId:z.coerce.number().int().min(0).max(2147483647).optional(),
  actorType:z.string().trim().min(1).max(50).optional(),
  action:z.string().trim().min(1).max(100).optional(),
  entityType:z.string().trim().min(1).max(100).optional(),
  page:z.coerce.number().int().min(1).max(100000).default(1),
  pageSize:z.coerce.number().int().min(1).max(200).default(50),
}).strict().superRefine((v,c)=>{
  if(v.from>v.to||v.from<"0001-01-01")c.addIssue({code:"custom",message:"Invalid audit date range",path:["from"]});
});
export type AccountingAuditFilters=z.infer<typeof accountingAuditFiltersSchema>;
export interface AccountingAuditRow {
  id:number;actorId:number;actorType:string;action:string;entityType:string;entityId:string;createdAt:string;
  hasBefore:boolean;hasAfter:boolean;
}
export interface AccountingAuditReport {
  company:{id:number;name:string;timezone:string};filters:AccountingAuditFilters;
  rows:AccountingAuditRow[];pagination:{page:number;pageSize:number;totalRows:number};
  scope:"selected-company-accounting-only";dateBasis:"company-local-day";includesGlobalActions:false;
  snapshotPayloadsExposed:false;
}