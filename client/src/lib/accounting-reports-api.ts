import {useQuery} from "@tanstack/react-query";
import type {AccountingReport,AccountingReportFilters,AccountingReportName} from "@shared/accounting-reports";
const base="/api/accounting/v2/reports";
function query(filters:AccountingReportFilters){
  const params=new URLSearchParams();
  for(const [key,value] of Object.entries(filters))if(value!==undefined&&value!=="")params.set(key,String(value));
  return params.toString();
}
export function useAccountingReport(report:AccountingReportName,filters:AccountingReportFilters|undefined){
  return useQuery({queryKey:[base,report,filters],enabled:!!filters,retry:false,queryFn:async()=>{
    const res=await fetch(`${base}/${report}?${query(filters!)}`,{credentials:"include"});
    const data=await res.json();
    if(!res.ok)throw new Error(data.message||`Report request failed (${res.status})`);
    return data as AccountingReport;
  }});
}
export async function downloadAccountingReport(report:AccountingReportName,filters:AccountingReportFilters){
  const res=await fetch(`${base}/${report}/csv?${query(filters)}`,{credentials:"include"});
  if(!res.ok){const data=await res.json();throw new Error(data.message||`Export failed (${res.status})`);}
  const url=URL.createObjectURL(await res.blob());
  const anchor=document.createElement("a");
  anchor.href=url;anchor.download=`accounting-${report}-${filters.companyId}-${filters.from}-${filters.to}.csv`;
  document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
}