import {useRef,useState} from "react";
import type {Language} from "@/lib/i18n";
import type {LoadingPreviewRow} from "@shared/accounting-loading-preview";
import {loadingShippingApprovalSchema} from "@shared/accounting-loading-shipping";
import {normalizeAccountingDigits} from "./accounting-logic";
import {shippingCopy,shippingErrorCopy} from "./loading-shipping-copy";
import {Button} from "@/components/ui/button";

export function LoadingShippingApproval({row,companyId,language,canManage=false,onApproved}:{
  row:LoadingPreviewRow;companyId:number;language:Language;canManage?:boolean;onApproved?:()=>Promise<unknown>;
}){
  const text=shippingCopy[language],shipping=row.fixedShipping;
  const [amount,setAmount]=useState(""),[reference,setReference]=useState(""),[reason,setReason]=useState("");
  const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState(false);
  const pending=useRef(false);
  if(!shipping)return null;
  const approved=shipping.allocation!==null||saved;
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();
    if(!canManage||!confirmed||approved||pending.current)return;
    setError("");
    const parsed=loadingShippingApprovalSchema.safeParse({
      companyId,factId:row.factId,amount:normalizeAccountingDigits(amount.trim()),evidenceReference:reference,reason,
    });
    if(!parsed.success){setError(text.invalid);return;}
    pending.current=true;setBusy(true);
    try{
      const response=await fetch("/api/accounting/v2/loading-shipping/approve",{
        method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(parsed.data),
      });
      const result=await response.json();
      if(!response.ok)throw new Error(shippingErrorCopy[language][result.code]??(typeof result.message==="string"?result.message:text.failed));
      if(result.factId!==row.factId||result.postingAllowed!==false)throw new Error(text.failed);
      setSaved(true);
      await onApproved?.();
    }catch(error){setError(error instanceof Error?error.message:text.failed);}
    finally{pending.current=false;setBusy(false);}
  };
  const inputClass="w-full rounded-lg border border-[#d4ddd4] bg-white p-2 text-sm disabled:opacity-60";
  return <section aria-label={text.title} className="mt-4 space-y-3 rounded-xl border border-[#dce4dc] bg-[#f7f9f5] p-4">
    <h4 className="text-sm font-semibold text-[#294540]">{text.title}</h4>
    <div className="grid gap-3 sm:grid-cols-3">
      {[[text.total,shipping.orderTotal],[text.approved,shipping.approvedTotal],[text.remaining,shipping.remaining]].map(([label,value])=>
        <div key={label}><p className="text-xs text-[#758179]">{label}</p><p dir="ltr" className="font-mono text-sm">{value} {row.currency}</p></div>)}
    </div>
    <p className="text-xs leading-6 text-[#806844]">{text.notice}</p>
    {approved?<div role="status" className="space-y-2 text-sm text-[#496b57]">
      <p>{text.saved}</p>
      <p>{text.allocation}: <span dir="ltr">{shipping.allocation??amount} {row.currency}</span></p>
      {shipping.evidenceReference&&<p>{text.reference}: {shipping.evidenceReference}</p>}
      {shipping.reason&&<p>{text.reason}: {shipping.reason}</p>}
      {shipping.approvedAt&&<p>{text.approvedAt}: <span dir="ltr">{shipping.approvedAt}</span></p>}
      {shipping.actorId&&<p>{text.actor}: <span dir="ltr">{shipping.actorType} #{shipping.actorId}</span></p>}
    </div>:canManage?<form onSubmit={submit} className="space-y-3">
      <label className="block text-sm">{text.allocation} · {row.currency}<input dir="ltr" inputMode="decimal" required value={amount}
        onChange={event=>setAmount(event.target.value)} disabled={busy} className={inputClass}/></label>
      <label className="block text-sm">{text.reference}<input required minLength={5} maxLength={500} value={reference}
        onChange={event=>setReference(event.target.value)} disabled={busy} className={inputClass}/></label>
      <label className="block text-sm">{text.reason}<textarea required minLength={5} maxLength={500} value={reason}
        onChange={event=>setReason(event.target.value)} disabled={busy} className={inputClass}/></label>
      <label className="flex items-start gap-2 text-xs leading-6"><input type="checkbox" required checked={confirmed}
        onChange={event=>setConfirmed(event.target.checked)} disabled={busy} className="mt-1.5"/>{text.confirmation}</label>
      <Button type="submit" disabled={busy||!confirmed} className="bg-[#20484a] text-white">{busy?text.busy:text.submit}</Button>
    </form>:<p className="text-xs text-[#758179]">{text.viewOnly}</p>}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
