import {useQuery,useMutation,useQueryClient} from "@tanstack/react-query";
import type {LoadingCaptureContext,LoadingCaptureInput,LoadingCaptureResult,LoadingCaptureScope} from "@shared/accounting-loading-capture";
const base="/api/accounting/v2";
async function request(url:string,body?:unknown){
  const res=await fetch(url,{credentials:"include",...(body===undefined?{}:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})});
  if(!res.ok){
    let message=`Loading capture request failed (${res.status})`;
    try{const b=await res.json();if(typeof b.message==="string")message=b.message;}catch{/* Preserve gateway status. */}
    throw new Error(message);
  }
  return await res.json();
}
export function useLoadingCaptureContext(filters?:LoadingCaptureScope){
  return useQuery({queryKey:[`${base}/loading-context`,filters],enabled:!!filters,retry:false,
    queryFn:async()=>await request(`${base}/loading-context?${new URLSearchParams(Object.entries(filters!).filter(([,v])=>v!==undefined).map(([k,v])=>[k,String(v)]))}`) as LoadingCaptureContext});
}
export function useCaptureMeasuredLoading(){
  const qc=useQueryClient();
  return useMutation({retry:false,mutationFn:async(input:LoadingCaptureInput)=>await request(`${base}/loading-capture`,input) as LoadingCaptureResult,
    onSuccess:async()=>{
      await Promise.all(["loading-context","loading-previews","shipping-margin","audit"].map(key=>qc.invalidateQueries({queryKey:[`${base}/${key}`]})));
    }});
}