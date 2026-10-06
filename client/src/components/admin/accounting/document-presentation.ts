import Decimal from "decimal.js";
import type { ManualAccount, ManualDocumentRow, ManualDocumentDetail, ManualDocumentMetadata } from "@shared/accounting-documents";
import { normalizeAccountingDigits } from "./accounting-logic";

const LocalDecimal = Decimal.clone({ precision: 80, rounding: Decimal.ROUND_HALF_UP });
export function exactDocumentAmount(value: string, decimals = 2): string | null {
  const normalized = normalizeAccountingDigits(value.trim());
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;
  try { return new LocalDecimal(normalized).toDecimalPlaces(decimals, LocalDecimal.ROUND_HALF_UP).toFixed(decimals); } catch { return null; }
}
export function preserveExactDecimal(value:string):string|null {
  const normalized=normalizeAccountingDigits(value.trim());
  return /^-?\d+(?:\.\d+)?$/.test(normalized)?normalized:null;
}
export function validPositiveAmount(value: string, maxDecimals?: number): boolean {
  const normalized = normalizeAccountingDigits(value.trim());
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return false;
  if (maxDecimals !== undefined && (normalized.split(".")[1]?.length ?? 0) > maxDecimals) return false;
  try { return new LocalDecimal(normalized).gt(0); } catch { return false; }
}
export function validNonNegativeAmount(value:string,maxDecimals?:number):boolean {
  const normalized=normalizeAccountingDigits(value.trim());
  if(!/^\d+(?:\.\d+)?$/.test(normalized))return false;
  if(maxDecimals!==undefined&&(normalized.split(".")[1]?.length??0)>maxDecimals)return false;
  try{return new LocalDecimal(normalized).gte(0);}catch{return false;}
}
export function equalDocumentAmounts(left: string, right: string): boolean {
  const a = normalizeAccountingDigits(left.trim()), b = normalizeAccountingDigits(right.trim());
  if (!/^\d+(?:\.\d+)?$/.test(a) || !/^\d+(?:\.\d+)?$/.test(b)) return false;
  try { return new LocalDecimal(a).eq(new LocalDecimal(b)); } catch { return false; }
}
function isZero(value:string) {
  const normalized=normalizeAccountingDigits(value.trim());
  if(!/^\d+(?:\.\d+)?$/.test(normalized))return false;
  try{return new LocalDecimal(normalized).isZero();}catch{return false;}
}
export function accountLabel(account: ManualAccount, language: string) {
  const name = language === "fa" ? account.nameFa : language === "ar" ? account.nameAr : language === "tr" ? account.nameEn : account.nameEn;
  return `${account.code} · ${name || account.nameEn}`;
}
export function statusTone(status: ManualDocumentRow["status"]) {
  return status === "posted" ? "bg-[#e4eee4] text-[#3f6751]" : status === "draft" ? "bg-[#f5eddc] text-[#80663a]" : status === "reversed" ? "bg-[#e6e9e4] text-[#66756d]" : "bg-[#f2e5e0] text-[#88564a]";
}
export function documentLanguageName(value: string, language: string) {
  if (language === "fa") return value;
  if (language === "ar") return value;
  return value;
}
export function expenseDocumentAllowed(detail: ManualDocumentDetail | undefined) {
  if (!detail || detail.row.kind !== "expense" || detail.document.lines.length !== 2) return false;
  const [expense, funding] = detail.document.lines;
  const currency=detail.document.currency??detail.metadata.company.baseCurrency;
  const decimals=currency===detail.metadata.company.baseCurrency?detail.metadata.currencyDecimals:detail.metadata.currencies.find(item=>item.code===currency)?.decimals;
  if(decimals===undefined)return false;
  const expenseAccount = detail.metadata.accounts.find(account => account.id === expense.accountId);
  const fundingAccount = detail.metadata.accounts.find(account => account.id === funding.accountId);
  return Boolean(expenseAccount?.type === "expense" && fundingAccount?.funding
    && validPositiveAmount(expense.debit,decimals) && validPositiveAmount(funding.credit,decimals)
    && equalDocumentAmounts(expense.debit, funding.credit)
    && isZero(expense.credit) && isZero(funding.debit) && expense.costCenterId !== null);
}
export function foreignValuationAvailable(value:ManualDocumentDetail["preview"]["foreignExpense"]|ManualDocumentDetail["foreignExpense"],baseCurrency:string) {
  return Boolean(value?.available&&value.baseCurrency===baseCurrency&&value.officialRate!==null
    &&value.expenseBase!==null&&value.fundingBase!==null&&value.fxGain!==null&&value.fxLoss!==null
    &&value.availableNative!==null&&value.availableBase!==null);
}
export function documentCapabilities(canManage: boolean, detail: ManualDocumentDetail | undefined, metadata:ManualDocumentMetadata|undefined=detail?.metadata) {
  const draft = Boolean(detail?.row.status === "draft");
  const postedDocument = Boolean(detail?.row.status === "posted" && (detail.row.kind === "manual" || detail.row.kind === "expense"));
  const financialReady=Boolean(metadata&&detail&&metadata.company.id===detail.row.companyId
    &&metadata.company.isActive&&metadata.currencyActive&&metadata.postingReady&&metadata.ledgerGuardsReady
    &&metadata.manualCutoverReady&&metadata.pipelineReady);
  const expenseValid=detail?.row.kind!=="expense"||expenseDocumentAllowed(detail);
  const foreign=Boolean(detail&&detail.row.kind==="expense"&&(detail.document.currency??metadata?.company.baseCurrency)!==metadata?.company.baseCurrency);
  const foreignCurrencyActive=!foreign||Boolean(metadata&&metadata.currencies.some(currency=>currency.code===detail?.document.currency));
  const foreignReady=!foreign||Boolean(metadata?.foreignExpenseReady&&foreignCurrencyActive&&foreignValuationAvailable(detail?.preview.foreignExpense,metadata?.company.baseCurrency??""));
  return {
    edit: canManage && draft,
    discard: canManage && draft,
    post: canManage && draft && financialReady && expenseValid && foreignReady && Boolean(detail?.preview.balanced && detail.preview.periodOpen),
    reverse: canManage && postedDocument && financialReady && (!foreign||Boolean(metadata?.foreignExpenseReady&&foreignCurrencyActive&&foreignValuationAvailable(detail?.foreignExpense,metadata?.company.baseCurrency??""))) && Boolean(detail?.preview.balanced),
  };
}
export function documentSaveAllowed(canManage:boolean,metadata:ManualDocumentMetadata|undefined,companyId:number|undefined) {
  return Boolean(canManage&&metadata&&metadata.company.id===companyId&&metadata.company.isActive&&metadata.currencyActive);
}
export function reversalDateAllowed(detail: ManualDocumentDetail | undefined, metadata: ManualDocumentMetadata | undefined, entryDate: string) {
  return Boolean(detail && metadata && detail.row.status === "posted" && detail.metadata.company.id === metadata.company.id
    && detail.row.companyId === metadata.company.id && entryDate >= detail.row.entryDate
    && metadata.fiscalPeriods.some(period => period.status === "open" && entryDate >= period.startsOn && entryDate <= period.endsOn));
}