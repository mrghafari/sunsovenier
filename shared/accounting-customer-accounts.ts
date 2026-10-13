import {z} from "zod";
import {accountingCustomerCodeSchema} from "./accounting-customer-reports";

export const customerAccountLookupSchema=z.object({
  companyId:z.coerce.number().int().positive().max(2147483647),
  customerCode:accountingCustomerCodeSchema,
}).strict();
export const createCustomerAccountSchema=customerAccountLookupSchema.extend({
  currency:z.enum(["IQD","USD","EUR","IRR"]),
  reason:z.string().trim().min(5).max(500),
  independentConfirmed:z.literal(true),
}).strict();
export const customerAccountCreditLimitSchema=z.object({
  companyId:z.number().int().positive(),walletId:z.number().int().positive(),
  creditLimit:z.string().regex(/^(0|[1-9]\d*)(\.\d+)?$/),
  reason:z.string().trim().min(5).max(500),confirmed:z.literal(true),
}).strict();
export interface AccountingCustomerAccounts {
  companyId:number;
  customer:{id:number;code:string;name:string};
  independentOpeningApproved:boolean;
  accounts:{id:number;currency:string;balance:string;reservedBalance:string;creditLimit:string;status:string}[];
  legacyAccounts:{id:number;currency:string;balance:string;reservedBalance:string;creditLimit:string;status:string}[];
  readOnly:true;
}
