import {z} from "zod";
import {dateString,positiveDecimal} from "./accounting-api";
const id=z.number().int().positive().max(2147483647);
export const walletRefundQuoteSchema=z.object({
  companyId:id,walletId:id,amount:positiveDecimal,entryDate:dateString,channel:z.enum(["BANK","CASH"]),
}).strict();
export const walletRefundCommandSchema=walletRefundQuoteSchema.extend({
  sourceId:z.string().trim().min(3).max(150),expectedPlanHash:z.string().regex(/^[a-f0-9]{64}$/),
  payoutReference:z.string().trim().min(5).max(150).transform(value=>value.replace(/[۰-۹٠-٩]/g,c=>
    String("۰۱۲۳۴۵۶۷۸۹".includes(c)?"۰۱۲۳۴۵۶۷۸۹".indexOf(c):"٠١٢٣٤٥٦٧٨٩".indexOf(c))).toUpperCase())
    .pipe(z.string().min(5).max(150)),
  evidenceReference:z.string().trim().min(5).max(500),reason:z.string().trim().min(5).max(500),
  payoutDocumentConfirmed:z.literal(true),
}).strict();
export type WalletRefundQuote=z.infer<typeof walletRefundQuoteSchema>;
export type WalletRefundCommand=z.infer<typeof walletRefundCommandSchema>;
export interface RefundBookLine{
  accountId:number;currency:string;debit:string;credit:string;baseDebit:string;baseCredit:string;
  exchangeRate:string;partyType:"customer"|null;partyId:number|null;costCenterId:null;description:string;
}
export interface WalletRefundValuation {
  available:boolean;blockingReason:string|null;currency:string|null;baseCurrency:string|null;
  amount:string|null;walletId:number;customerId:number|null;
  walletNativeBefore:string|null;walletBaseBefore:string|null;availableNative:string|null;
  fundingNativeBefore:string|null;fundingBaseBefore:string|null;
  liabilityBase:string|null;fundingBase:string|null;fxGain:string|null;fxLoss:string|null;
  historicalRateEvidence?:{liabilitySourceLineId:number|null;fundingSourceLineId:number|null};
  lines:RefundBookLine[];
}
export interface WalletRefundPlan {
  input:WalletRefundQuote;valuation:WalletRefundValuation;planHash:string;
  financialGateOpen:boolean;postingAllowed:boolean;blockers:string[];
}
export interface WalletRefundHistory {
  rows:{id:number;walletId:number;entryDate:string;channel:"BANK"|"CASH";currency:string;baseCurrency:string;
    amount:string;payoutReference:string;evidenceReference:string;reason:string;sourceId:string;
    liabilityBase:string;fundingBase:string;fxGain:string;fxLoss:string;journalId:number;movementId:number}[];
  pagination:{page:number;pageSize:number;totalRows:number};
}
