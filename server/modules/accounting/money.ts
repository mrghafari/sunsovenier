import Decimal from "decimal.js";

// 38-digit storage plus intermediate FX/tax multiplication needs guard digits.
export const Money = Decimal.clone({ precision: 80, rounding: Decimal.ROUND_HALF_UP });
export function decimal(value: string) {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)(\.\d+)?$/.test(value) || value.length > 48) {
    throw new Error("Amounts must be non-negative decimal strings");
  }
  return new Money(value);
}
export function roundMoney(value: string, decimals: number) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 8) throw new Error("Invalid currency precision");
  return decimal(value).toDecimalPlaces(decimals).toFixed(decimals);
}
export function exactMoney(value: string, decimals: number) {
  const result = roundMoney(value, decimals);
  if (!decimal(value).eq(result)) throw new Error("Amount exceeds the currency's decimal precision");
  if (decimal(result).gte("1000000000000000000000000000000")) throw new Error("Amount exceeds storage precision");
  return result;
}
export function convertBase(value: string, rate: string, decimals: number) {
  const fx = decimal(rate);
  if (!fx.gt(0)) throw new Error("Exchange rate must be positive");
  const result = decimal(value).times(fx).toDecimalPlaces(decimals).toFixed(decimals);
  return exactMoney(result, decimals);
}
export function assertBalanced(lines: { baseDebit: string; baseCredit: string }[]) {
  if (lines.length < 2) throw new Error("An entry needs at least two lines");
  const debit = lines.reduce((sum, l) => sum.plus(decimal(l.baseDebit)), new Money(0));
  const credit = lines.reduce((sum, l) => sum.plus(decimal(l.baseCredit)), new Money(0));
  if (!debit.gt(0) || !debit.eq(credit)) throw new Error("Journal is not balanced in base currency");
}