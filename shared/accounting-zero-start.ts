import {z} from "zod";
import {dateString} from "./accounting-api";

export const zeroStartCommandSchema=z.object({
  companyId:z.number().int().positive().max(2147483647),
  startsOn:dateString,
  reason:z.string().trim().min(5).max(500),
  preserveLegacyConfirmed:z.literal(true),
  zeroOpeningConfirmed:z.literal(true),
}).strict();
export interface ZeroStartState {
  companyId:number;approved:boolean;active:boolean;startsOn:string|null;
  firstOrderId:number|null;excludedWalletCount:number;excludedDocumentCount:number;
}
