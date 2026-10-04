import {useQuery} from "@tanstack/react-query";
import type {AccountingAuditFilters,AccountingAuditReport} from "@shared/accounting-audit";
const base="/api/accounting/v2/audit";
const params=(f:AccountingAuditFilters)=>{
  const q=new URLSearchParams();
  for(const [k,v] of Object.entries(f))if(v!==undefined)q.set(k,String(v));
  return q.toString();
};
async function request(path:string){
  const res=await fetch(path,{credentials:"include"});
  if(!res.ok){
    let message=`Audit request failed (${res.status})`;
    try{const b=await res.json();if(typeof b.message==="string")message=b.message;}catch{/* Preserve non-JSON error status. */}
    throw new Error(message);
  }
  return res;
}
export function useAccountingAudit(filters?:AccountingAuditFilters){
  return useQuery({queryKey:[base,filters],enabled:!!filters,retry:false,queryFn:async()=>
    await (await request(`${base}?${params(filters!)}`)).json() as AccountingAuditReport});
}
export async function downloadAccountingAudit(filters:AccountingAuditFilters){
  const res=await request(`${base}/csv?${params(filters)}`),url=URL.createObjectURL(await res.blob());
  const a=document.createElement("a");a.href=url;a.download=`accounting-audit-${filters.companyId}-${filters.from}-${filters.to}.csv`;
  document.body.appendChild(a);try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),0);}
}