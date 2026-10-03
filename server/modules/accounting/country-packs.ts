import { iraqChart } from "./iraq-chart";

export interface CountryPack {
  countryCode: string;
  timezone: string;
  baseCurrency: string;
  invoiceCalendar: "gregorian";
  electronicInvoiceProvider: null;
  // No implicit VAT: the applicable dated tax rule is selected from the DB.
  defaultTaxRule: null;
  chart: typeof iraqChart;
}
const iraq: CountryPack = {
  countryCode: "IQ", timezone: "Asia/Baghdad", baseCurrency: "IQD",
  invoiceCalendar: "gregorian", electronicInvoiceProvider: null, defaultTaxRule: null, chart: iraqChart,
};
export function getCountryPack(countryCode: string): CountryPack {
  if (countryCode !== "IQ") throw new Error(`Country pack is not configured: ${countryCode}`);
  return iraq;
}