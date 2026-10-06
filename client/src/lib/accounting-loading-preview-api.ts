import {useQuery} from "@tanstack/react-query";
import type {LoadingPreviewFilters,LoadingPreviewReport} from "@shared/accounting-loading-preview";
export function useLoadingPreviews(filters?:LoadingPreviewFilters){
  return useQuery({queryKey:["/api/accounting/v2/loading-previews",filters],enabled:!!filters,retry:false,queryFn:async()=>{
    const q=new URLSearchParams();
    for(const [k,v] of Object.entries(filters!))if(v!==undefined)q.set(k,String(v));
    const res=await fetch(`/api/accounting/v2/loading-previews?${q}`,{credentials:"include"});
    if(!res.ok){
      let message=`Loading preview failed (${res.status})`;
      try{const body=await res.json();if(typeof body.message==="string")message=body.message;}catch{/* Preserve the status when the gateway returns no JSON. */}
      throw new Error(message);
    }
    return await res.json() as LoadingPreviewReport;
  }});
}