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
const iran: CountryPack={
  countryCode:"IR",timezone:"Asia/Tehran",baseCurrency:"IRR",
  invoiceCalendar:"gregorian",electronicInvoiceProvider:null,defaultTaxRule:null,
  // Editable operational template, not a government-mandated Iranian chart.
  chart:iraqChart,
};
export function getCountryPack(countryCode: string): CountryPack {
  if(countryCode==="IQ")return iraq;
  if(countryCode==="IR")return iran;
  throw new Error(`Country pack is not configured: ${countryCode}`);
}