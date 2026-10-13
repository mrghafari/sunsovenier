import {useMutation,useQuery,useQueryClient} from "@tanstack/react-query";
import type {AccountingCustomerAccounts} from "@shared/accounting-customer-accounts";

const base="/api/accounting/v2/customer-accounts";
async function request<T>(url:string,options?:RequestInit):Promise<T>{
  const response=await fetch(url,{credentials:"include",...options,headers:{"Content-Type":"application/json",...options?.headers}});
  const data=await response.json();
  if(!response.ok){const e=new Error(data.message||"Customer account request failed") as Error&{code?:string};e.code=data.code;throw e;}
  return data;
}
export function useCustomerAccounts(filters?:{companyId:number;customerCode:string}){
  return useQuery({queryKey:[base,filters],enabled:!!filters,retry:false,
    queryFn:()=>request<AccountingCustomerAccounts>(`${base}?${new URLSearchParams({companyId:String(filters!.companyId),customerCode:filters!.customerCode})}`)});
}
export function useCreateIndependentCustomerAccount(){
  const client=useQueryClient();
  return useMutation({
    mutationFn:(data:{companyId:number;customerCode:string;currency:"IQD"|"USD"|"EUR"|"IRR";reason:string;independentConfirmed:true})=>
      request<{walletId:number;duplicate:boolean;openingBalanceCreated:false;legacyBalancesChanged:false}>(base,{method:"POST",body:JSON.stringify(data)}),
    onSuccess:async()=>{
      await Promise.all([
        client.invalidateQueries({queryKey:[base]}),
        client.invalidateQueries({queryKey:["/api/accounting/v2"]}),
        client.invalidateQueries({queryKey:["/api/accounting/v2/credit-customer"]}),
      ]);
    },
  });
}
export function useFundIndependentCustomerAccount(){
  const client=useQueryClient();
  return useMutation({
    mutationFn:(data:{companyId:number;walletId:number;sourceId:string;entryDate:string;amount:string;
      channel:"BANK"|"GATEWAY";evidenceReference:string;reason:string})=>
      request<{movementId:number;journalId:number;duplicate:boolean}>("/api/accounting/v2/wallets/topup",
        {method:"POST",body:JSON.stringify(data)}),
    onSuccess:()=>client.invalidateQueries({queryKey:[base]}),
  });
}
export function useSetCustomerAccountCreditLimit(){
  const client=useQueryClient();
  return useMutation({
    mutationFn:(data:{companyId:number;walletId:number;creditLimit:string;reason:string;confirmed:true})=>
      request<{walletId:number;creditLimit:string;duplicate:boolean;balanceChanged:false}>(
        "/api/accounting/v2/customer-accounts/credit-limit",{method:"POST",body:JSON.stringify(data)}),
    onSuccess:async()=>{await Promise.all([
      client.invalidateQueries({queryKey:[base]}),
      client.invalidateQueries({queryKey:["/api/accounting/v2"]}),
      client.invalidateQueries({queryKey:["accounting-credit-exposure"]}),
    ]);},
  });
}
