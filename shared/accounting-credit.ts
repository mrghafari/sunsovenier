import {z} from "zod";
import {accountingCustomerCodeSchema} from "./accounting-customer-reports";

export const creditCustomerLookupSchema=z.object({
  companyId:z.coerce.number().int().positive().max(2147483647),
  customerCode:accountingCustomerCodeSchema,
}).strict();

export interface AccountingCreditCustomer {
  companyId:number;
  customer:{id:number;code:string;name:string};
  wallets:{id:number;currency:string}[];
  readOnly:true;
}

export interface AccountingCreditExposure {
  companyId: number;
  walletId: number;
  customerId: number;
  currency: string;
  creditLimit: string | null;
  openReceivables: string;
  unclearedChequeAllocations: string;
  approvedUnbilledCredit: string;
  exposure: string;
  remainingCredit: string | null;
  ledgerReceivables: string | null;
  openingApproved: boolean;
  reconciled: boolean;
  blockingCodes: string[];
  readOnly: true;
}