import {z} from "zod";
import {dateString} from "./accounting-api";
import type {LoadingReturnSettlementPolicy} from "./accounting-return-settlement";
const id=z.number().int().positive().max(2147483647);
export const loadingReturnFiltersSchema=z.object({
  companyId:z.coerce.number().int().positive().max(2147483647),
  orderId:z.coerce.number().int().positive().max(2147483647).optional(),
  page:z.coerce.number().int().positive().default(1),
  pageSize:z.coerce.number().int().min(1).max(100).default(20),
}).strict();
export const loadingReturnCommandSchema=z.object({
  companyId:id,invoiceId:id,expectedPlanHash:z.string().regex(/^[a-f0-9]{64}$/),
  returnDate:dateString,goodsReceiptReference:z.string().trim().min(5).max(500),
  reason:z.string().trim().min(5).max(500),
  creditToCustomerConfirmed:z.literal(true).optional(),
}).strict();
export type LoadingReturnBlocker="RETURN_GATE_CLOSED"|"COMPANY_INACTIVE"|"SETTLEMENT_EXISTS"
  |"RECEIPT_ALLOCATION_EXISTS"|"ALREADY_REVERSED"|"EVIDENCE_MISMATCH"
  |"STOCK_RECONCILIATION_REQUIRED"|"ACCOUNT_INACTIVE"|"PAID_RETURN_GATE_CLOSED"
  |"CREDIT_EVIDENCE_MISMATCH"|"CREDIT_WALLET_UNAVAILABLE";
export interface LoadingReturnPlan {
  companyId:number;invoiceId:number;factId:number;orderId:number;customerId:number;
  invoiceJournalId:number;cogsJournalId:number|null;receivableId:number;
  originalDate:string;minReturnDate:string;currency:string;baseCurrency:string;
  originalAmount:string;originalBaseAmount:string|null;baseCost:string;quantityTons:string|null;
  planHash:string;blockers:LoadingReturnBlocker[];postingAllowed:boolean;
  settlementPolicy?:LoadingReturnSettlementPolicy;
  customerCredit?:{walletId:number;amount:string;baseAmount:string;baseCurrency:string};
  returned:{id:number;invoiceReversalId:number;cogsReversalId:number|null;returnDate:string;
    goodsReceiptReference:string;reason:string;customerCreditJournalId?:number|null;customerCreditAmount?:string}|null;
}
export interface LoadingReturnWorkbench {
  company:{id:number;name:string;baseCurrency:string};
  rows:LoadingReturnPlan[];
  pagination:{page:number;pageSize:number;totalRows:number};
  financialGateOpen:boolean;
}
