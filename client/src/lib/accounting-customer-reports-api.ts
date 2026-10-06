import {useQuery} from "@tanstack/react-query";
import type {CustomerAccountingReport,CustomerReportFilters,CustomerReportName} from "@shared/accounting-customer-reports";
const base="/api/accounting/v2/customer-reports";
const query=(filters:CustomerReportFilters)=>new URLSearchParams(Object.entries(filters)
  .filter(([,value])=>value!==undefined&&value!=="").map(([key,value])=>[key,String(value)])).toString();
export function useCustomerAccountingReport(report:CustomerReportName,filters:CustomerReportFilters|undefined){
  return useQuery({queryKey:[base,report,filters],enabled:!!filters,retry:false,queryFn:async()=>{
    const res=await fetch(`${base}/${report}?${query(filters!)}`,{credentials:"include"});
    const body=await res.json();if(!res.ok)throw new Error(body.message||`Report failed (${res.status})`);
    return body as CustomerAccountingReport;
  }});
}
export async function downloadCustomerAccountingReport(report:CustomerReportName,filters:CustomerReportFilters){
  const scope=Object.fromEntries(Object.entries(filters).filter(([key])=>key!=="page"&&key!=="pageSize")) as CustomerReportFilters;
  const res=await fetch(`${base}/${report}/csv?${query(scope)}`,{credentials:"include"});
  if(!res.ok){const body=await res.json();throw new Error(body.message||`Export failed (${res.status})`);}
  const url=URL.createObjectURL(await res.blob()),a=document.createElement("a");
  a.href=url;a.download=`accounting-${report}-${filters.companyId}-${filters.asOf??filters.to}.csv`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}