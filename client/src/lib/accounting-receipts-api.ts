import {useQuery,useMutation,useQueryClient} from "@tanstack/react-query";
import type {ReceiptListFilters,ReceiptList,ReceiptDetail,ReceiptCustomer,ReceiptOpenItems,ReceiptInput,ReceiptEventInput,ReceiptAction} from "@shared/accounting-receipts";
const base="/api/accounting/v2";
const query=(f:object)=>new URLSearchParams(Object.entries(f).filter(([,v])=>v!==undefined&&v!=="").map(([k,v])=>[k,String(v)])).toString();
async function request<T>(path:string,body?:unknown):Promise<T>{
  const res=await fetch(base+path,{credentials:"include",...(body===undefined?{}:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})});
  const data=await res.json();if(!res.ok)throw new Error(data.message||`Request failed (${res.status})`);return data;
}
export function useAccountingReceipts(filters:ReceiptListFilters|undefined){
  return useQuery({queryKey:[base,"receipts",filters],enabled:!!filters,retry:false,queryFn:()=>request<ReceiptList>(`/receipts?${query(filters!)}`)});
}
export function useAccountingReceipt(companyId:number|undefined,id:number|undefined){
  return useQuery({queryKey:[base,"receipt",companyId,id],enabled:!!companyId&&!!id,retry:false,
    queryFn:()=>request<ReceiptDetail>(`/receipts/${id}?companyId=${companyId}`)});
}
export function useReceiptCustomers(companyId:number|undefined,search:string){
  return useQuery({queryKey:[base,"receipt-customers",companyId,search],enabled:!!companyId,retry:false,
    queryFn:()=>request<{items:ReceiptCustomer[]}>(`/receipt-workbench/customers?${query({companyId,q:search})}`)});
}
export function useReceiptOpenItems(companyId:number|undefined,customerId:number|undefined,currency:string,page=1){
  return useQuery({queryKey:[base,"receipt-open-items",companyId,customerId,currency,page],enabled:!!companyId&&!!customerId&&!!currency,retry:false,
    queryFn:()=>request<ReceiptOpenItems>(`/receipt-workbench/receivables?${query({companyId,customerId,currency,page})}`)});
}
export function useRecordAccountingReceipt(){
  const client=useQueryClient();
  return useMutation({retry:false,mutationFn:(input:ReceiptInput)=>request<{receipt:{id:number};journalId?:number;duplicate:boolean}>("/receipts",input),
    onSuccess:()=>client.invalidateQueries({queryKey:[base]})});
}
export function useAccountingReceiptAction(){
  const client=useQueryClient();
  return useMutation({retry:false,mutationFn:({id,action,input}:{id:number;action:ReceiptAction;input:ReceiptEventInput})=>
    request<{receiptId:number;status:string;journalId:number;duplicate:boolean}>(`/receipts/${id}/${action==="returned"?"return":`cheque/${action}`}`,input),
    onSuccess:()=>client.invalidateQueries({queryKey:[base]})});
}
export async function downloadAccountingReceipts(filters:ReceiptListFilters){
  const res=await fetch(`${base}/receipts/csv?${query(filters)}`,{credentials:"include"});
  if(!res.ok){const body=await res.json();throw new Error(body.message||`Export failed (${res.status})`);}
  const url=URL.createObjectURL(await res.blob()),a=document.createElement("a");a.href=url;a.download=`accounting-receipts-${filters.companyId}.csv`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}