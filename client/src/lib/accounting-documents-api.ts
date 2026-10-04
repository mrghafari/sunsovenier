import {useQuery,useMutation,useQueryClient} from "@tanstack/react-query";
import type {ManualDocumentFilters,ManualDocumentList,ManualDocumentDetail,ManualDocumentMetadata,ManualDocumentInput,ManualDocumentPreview} from "@shared/accounting-documents";
import type {z} from "zod";
import type {saveManualDocumentSchema,manualDocumentActionSchema,reverseManualDocumentSchema} from "@shared/accounting-documents";
const base="/api/accounting/v2";
const query=(input:object)=>new URLSearchParams(Object.entries(input).filter(([,v])=>v!==undefined&&v!=="").map(([k,v])=>[k,String(v)])).toString();
async function request<T>(path:string,body?:unknown):Promise<T>{
  const res=await fetch(base+path,{credentials:"include",...(body===undefined?{}:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})});
  const data=await res.json();if(!res.ok)throw new Error(data.message||`Request failed (${res.status})`);return data;
}
export function useManualDocumentMetadata(companyId:number|undefined){
  return useQuery({queryKey:[base,"manual-document-metadata",companyId],enabled:!!companyId,retry:false,
    queryFn:()=>request<ManualDocumentMetadata>(`/manual-documents/metadata?companyId=${companyId}`)});
}
export function useManualDocuments(filters:ManualDocumentFilters|undefined){
  return useQuery({queryKey:[base,"manual-documents",filters],enabled:!!filters,retry:false,
    queryFn:()=>request<ManualDocumentList>(`/manual-documents?${query(filters!)}`)});
}
export function useManualDocument(companyId:number|undefined,id:number|undefined){
  return useQuery({queryKey:[base,"manual-document",companyId,id],enabled:!!companyId&&!!id,retry:false,
    queryFn:()=>request<ManualDocumentDetail>(`/manual-documents/${id}?companyId=${companyId}`)});
}
export function usePreviewManualDocument(){
  return useMutation({retry:false,mutationFn:(document:ManualDocumentInput)=>request<ManualDocumentPreview>("/manual-documents/preview",document)});
}
export function useSaveManualDocument(){
  const client=useQueryClient();
  return useMutation({retry:false,mutationFn:(input:z.input<typeof saveManualDocumentSchema>)=>request<{id:number;duplicate:boolean}>("/manual-documents",input),
    onSuccess:()=>client.invalidateQueries({queryKey:[base]})});
}
export function useManualDocumentAction(){
  const client=useQueryClient();
  return useMutation({retry:false,mutationFn:({id,action,input}:{id:number;action:"post"|"discard"|"reverse";input:z.input<typeof manualDocumentActionSchema>|z.input<typeof reverseManualDocumentSchema>})=>
    request<{id:number;journalId?:number;duplicate?:boolean}>(`/manual-documents/${id}/${action}`,input),
    onSuccess:()=>client.invalidateQueries({queryKey:[base]})});
}