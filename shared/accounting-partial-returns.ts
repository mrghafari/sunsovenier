import {z} from "zod";
import {dateString,positiveDecimal,decimalString} from "./accounting-api";
const id=z.number().int().positive().max(2147483647);
const common={companyId:id,entryDate:dateString};
const canonicalDecimal=(value:string)=>{
  const [whole,fraction]=value.split(".");
  const tail=fraction?.replace(/0+$/,"");
  return `${whole.replace(/^0+(?=\d)/,"")}${tail?`.${tail}`:""}`;
};
export const partialReturnQuoteSchema=z.discriminatedUnion("kind",[
  z.object({...common,kind:z.literal("GOODS"),invoiceId:id,
    items:z.array(z.object({orderItemId:id,quantityTons:positiveDecimal.transform(canonicalDecimal)}).strict()).min(1).max(100)
      .transform(items=>items.sort((a,b)=>a.orderItemId-b.orderItemId))}).strict(),
  z.object({...common,kind:z.literal("RECEIPT"),receiptId:id,
    allocations:z.array(z.object({receivableId:id,amount:positiveDecimal.transform(canonicalDecimal)}).strict()).max(100)
      .transform(items=>items.sort((a,b)=>a.receivableId-b.receivableId)),
    walletAmount:decimalString.default("0").transform(canonicalDecimal)}).strict(),
]);
const evidenceFields={
  sourceId:z.string().trim().min(3).max(150),
  expectedPlanHash:z.string().regex(/^[a-f0-9]{64}$/),
  evidenceReference:z.string().trim().min(5).max(500),
  reason:z.string().trim().min(5).max(500),
  payoutReference:z.string().trim().max(150).default("").transform(value=>value.replace(/[۰-۹٠-٩]/g,c=>
    String("۰۱۲۳۴۵۶۷۸۹".includes(c)?"۰۱۲۳۴۵۶۷۸۹".indexOf(c):"٠١٢٣٤٥٦٧٨٩".indexOf(c))).toUpperCase()),
  evidenceConfirmed:z.literal(true),
};
export const partialReturnCommandSchema=z.discriminatedUnion("kind",[
  partialReturnQuoteSchema.options[0].extend(evidenceFields),
  partialReturnQuoteSchema.options[1].extend(evidenceFields),
]);
export type PartialReturnQuote=z.infer<typeof partialReturnQuoteSchema>;
export type PartialReturnCommand=z.infer<typeof partialReturnCommandSchema>;
export interface PartialReturnLine {
  accountId:number;currency:string;debit:string;credit:string;baseDebit:string;baseCredit:string;
  exchangeRate:string;partyType:"customer"|null;partyId:number|null;costCenterId:number|null;description:string;
}
export interface PartialReturnValuation {
  available:boolean;blockingReason:string|null;kind:"GOODS"|"RECEIPT";
  companyId:number;invoiceId?:number;receivableId?:number;receiptId?:number;
  currency:string;baseCurrency:string;customerId:number;amount:string;baseAmount:string;
  debtReduction:string;debtBase:string;customerCredit:string;creditBase:string;baseCost:string;
  walletId:number|null;walletBefore:string|null;walletAmount:string;walletAfter:string|null;
  goods?:string;tax?:string;goodsBase?:string;taxBase?:string;
  items?:{orderItemId:number;quantityTons:string;goods:string;tax:string}[];
  recoveries?:{consumptionId:number;layerId:number;quantityTons:string;baseCost:string}[];
  restorations?:{receivableId:number;amount:string;baseAmount:string}[];
  lines:PartialReturnLine[];
}
export interface PartialReturnPlan {
  input:PartialReturnQuote;valuation:PartialReturnValuation;postingAllowed:boolean;
  financialGateOpen:boolean;blockers:string[];planHash:string;
}
export interface PartialReturnHistory {
  rows:{id:number;kind:"GOODS"|"RECEIPT";entryDate:string;sourceId:string;
    evidenceReference:string;reason:string;payoutReference:string;journalId:number;valuation:PartialReturnValuation}[];
  pagination:{page:number;pageSize:number;totalRows:number};
}
export interface PartialReturnTargets {
  companyId:number;
  invoices:{id:number;receivableId:number;customerId:number;currency:string;amount:string;openAmount:string;
    items:{orderItemId:number;originalTons:string;returnedTons:string}[]}[];
  receipts:{id:number;customerId:number;currency:string;method:string;amount:string;returnedAmount:string;
    walletCredit:string;walletReturned:string;allocations:{receivableId:number;amount:string;returnedAmount:string}[]}[];
}
