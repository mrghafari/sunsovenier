/**
 * Native-currency debt/credit split selected by the user.
 * This is arithmetic only: it is not goods valuation, payment verification,
 * a journal, a stock return or authorization to pay money.
 */
export interface UnpaidFirstReturnInput {
  invoiceAmount:string;
  settledAmount:string;
  returnAmount:string;
  currencyDecimals:number;
}
export interface UnpaidFirstReturnResult {
  invoiceAmount:string;settledAmount:string;unpaidBefore:string;returnAmount:string;
  debtReduction:string;unpaidAfter:string;customerCredit:string;
}
export interface LoadingReturnSettlementPolicy {
  kind:"UNPAID_FIRST";
  invoiceAmount:string;
  settledAmount:string;
  currencyDecimals:number;
}
function minorUnits(value:string,decimals:number):bigint {
  if(typeof value!=="string"||!/^\d{1,30}(?:\.\d{1,8})?$/.test(value))
    throw new Error("INVALID_RETURN_AMOUNT");
  const [whole,fraction=""]=value.split(".");
  if(/[1-9]/.test(fraction.slice(decimals)))throw new Error("CURRENCY_PRECISION");
  return BigInt(whole)*10n**BigInt(decimals)+BigInt(fraction.slice(0,decimals).padEnd(decimals,"0")||"0");
}
function nativeAmount(value:bigint,decimals:number):string {
  if(!decimals)return value.toString();
  const s=value.toString().padStart(decimals+1,"0");
  const fraction=s.slice(-decimals).replace(/0+$/,"");
  return s.slice(0,-decimals)+(fraction?`.${fraction}`:"");
}
export function calculateUnpaidFirstReturn(input:UnpaidFirstReturnInput):UnpaidFirstReturnResult {
  if(!Number.isInteger(input.currencyDecimals)||input.currencyDecimals<0||input.currencyDecimals>8)
    throw new Error("INVALID_CURRENCY_PRECISION");
  const digits=input.currencyDecimals;
  const invoice=minorUnits(input.invoiceAmount,digits),paid=minorUnits(input.settledAmount,digits);
  const returned=minorUnits(input.returnAmount,digits);
  if(invoice<=0n||paid>invoice)throw new Error("INVALID_SETTLEMENT_EVIDENCE");
  if(returned<=0n||returned>invoice)throw new Error("RETURN_EXCEEDS_INVOICE");
  const unpaid=invoice-paid,debtReduction=returned<unpaid?returned:unpaid;
  const amounts={invoiceAmount:invoice,settledAmount:paid,unpaidBefore:unpaid,returnAmount:returned,
    debtReduction,unpaidAfter:unpaid-debtReduction,customerCredit:returned-debtReduction};
  return Object.fromEntries(Object.entries(amounts).map(([key,value])=>[key,nativeAmount(value,digits)])) as unknown as UnpaidFirstReturnResult;
}
