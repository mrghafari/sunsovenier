import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useAccountingResource } from "@/lib/accounting-api";
import { useLanguage } from "@/contexts/LanguageContext";
import { normalizeAccountingDigits } from "./accounting-logic";
import { shipmentCostCaptureText as t } from "./accounting-shipment-cost-capture-copy";
import { useCaptureShipmentCost, type ShipmentCostCaptureEvent } from "./accounting-shipment-costs-api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Archive, ShieldAlert } from "lucide-react";

type CostType = "" | "EXTERNAL_CARRIER" | "INTERNAL_FLEET";
type FormValues = {
  orderId:string;sourceId:string;eventDate:string;loadingSourceId:string;costType:CostType;
  carrierReference:string;costDocumentReference:string;actualCost:string;currency:string;distanceKm:string;
};
const freshForm = (): FormValues => ({
  orderId:"",sourceId:"",eventDate:"",loadingSourceId:"",costType:"",
  carrierReference:"",costDocumentReference:"",actualCost:"",currency:"",distanceKm:"",
});
const inputClass = "h-10 w-full rounded-lg border border-[#d4ddd4] bg-[#f7f9f5] px-3 text-sm text-[#29423f] outline-none focus:border-[#9a7650] focus:ring-2 focus:ring-[#9a7650]/15 disabled:opacity-60";
const decimalPattern = /^\d+(?:\.\d{1,8})?$/;
const rtlLanguages = ["fa","ar","ku"];

function validPositiveDecimal(value:string) {
  return decimalPattern.test(value) && /[1-9]/.test(value.replace(".", ""));
}
function validDate(value:string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}

export default function AccountingShipmentCostCapture({ companyId, companyName, canManage = false }: {
  companyId: number; companyName: string; canManage?: boolean;
}) {
  const { language } = useLanguage();
  const direction = rtlLanguages.includes(language) ? "rtl" : "ltr";
  const [form,setForm] = useState<FormValues>(freshForm);
  const [formError,setFormError] = useState("");
  const [success,setSuccess] = useState<{factId:number;duplicate:boolean}|null>(null);
  const mutation = useCaptureShipmentCost();
  const settingsQuery = useAccountingResource("settings",companyId);
  const settings = settingsQuery.data?.find(row=>Number(row.companyId)===companyId);
  const perKilometre = settings?.fleetRateBasis === "per_km";
  const settingsBlocked = form.costType === "INTERNAL_FLEET" && (settingsQuery.isLoading || settingsQuery.isError || !settings);

  const edit = (key:keyof FormValues,value:string) => {
    setForm(current=>({...current,[key]:value}));
    setFormError("");
    setSuccess(null);
    mutation.reset();
  };
  const validate = () => {
    const order = normalizeAccountingDigits(form.orderId.trim());
    const orderId = Number(order);
    if (!Number.isSafeInteger(orderId) || orderId <= 0) return t(language,"orderRequired");
    if (!form.sourceId.trim() || form.sourceId.trim().length > 150) return t(language,"referenceRequired");
    if (!validDate(form.eventDate)) return t(language,"dateRequired");
    if (!form.loadingSourceId.trim() || form.loadingSourceId.trim().length > 150) return t(language,"loadingRequired");
    if (!form.costType) return t(language,"costTypeRequired");
    if (form.costType === "EXTERNAL_CARRIER") {
      if (!form.carrierReference.trim() || form.carrierReference.trim().length > 150) return t(language,"carrierRequired");
      if (!form.costDocumentReference.trim() || form.costDocumentReference.trim().length > 150) return t(language,"documentRequired");
      if (!validPositiveDecimal(form.actualCost.trim())) return t(language,"amountRequired");
      if (!/^[A-Z]{3}$/.test(form.currency.trim())) return t(language,"currencyRequired");
    } else {
      if (settingsQuery.isLoading) return t(language,"settingsLoading");
      if (settingsQuery.isError || !settings) return t(language,"settingsError");
      if (perKilometre && !validPositiveDecimal(form.distanceKm.trim())) return t(language,"distanceRequired");
      if (form.distanceKm.trim() && !validPositiveDecimal(form.distanceKm.trim())) return t(language,"distanceRequired");
    }
    return "";
  };
  const capture = async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setSuccess(null);
    mutation.reset();
    const error = validate();
    if (error) { setFormError(error); return; }
    const orderId = Number(normalizeAccountingDigits(form.orderId.trim()));
    let costEvent: ShipmentCostCaptureEvent;
    if (form.costType === "EXTERNAL_CARRIER") {
      costEvent = {
        eventType:"ShipmentCostRecorded",orderId,sourceId:form.sourceId.trim(),eventDate:form.eventDate,
        loadingSourceId:form.loadingSourceId.trim(),costType:"EXTERNAL_CARRIER",
        carrierReference:form.carrierReference.trim(),costDocumentReference:form.costDocumentReference.trim(),
        actualCost:form.actualCost.trim(),currency:form.currency.trim(),
      };
    } else {
      costEvent = {
        eventType:"ShipmentCostRecorded",orderId,sourceId:form.sourceId.trim(),eventDate:form.eventDate,
        loadingSourceId:form.loadingSourceId.trim(),costType:"INTERNAL_FLEET",
        ...(form.distanceKm.trim()?{distanceKm:form.distanceKm.trim()}:{}),
      };
    }
    const command = {companyId,event:costEvent};
    if (!window.confirm(t(language,"confirmText"))) return;
    try {
      const result = await mutation.mutateAsync(command);
      setSuccess({factId:result.factId,duplicate:result.duplicate});
    } catch {
      // Keep the exact input unchanged so a deliberate retry sends the same source reference and payload.
    }
  };
  const setText = (key:keyof FormValues) => (event:ChangeEvent<HTMLInputElement>) => {
    const value = key === "orderId" ? normalizeAccountingDigits(event.target.value)
      : key === "currency" ? event.target.value.toUpperCase()
      : event.target.value;
    edit(key,value);
  };

  return <section dir={direction} data-testid="accounting-shipment-cost-capture" className="overflow-hidden rounded-2xl border border-[#e5ded2] bg-[#fbfcf8]">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e8e3da] bg-[#f7f3ec] px-4 py-4 md:px-5">
      <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#735b3e] text-[#fbf6ed]"><Archive className="h-4 w-4"/></span><div>
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#897c68]">MOMTAZCOM · SOURCE EVIDENCE</p>
        <h3 className="font-display text-lg font-semibold text-[#494337]">{t(language,"title")}</h3>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-[#756c5d]">{t(language,"intro")}</p>
      </div></div>
      <span className="inline-flex items-center gap-2 rounded-lg border border-[#e4d6c2] bg-[#fbf8f1] px-3 py-2 text-[10px] font-bold text-[#755c3d]"><ShieldAlert className="h-4 w-4"/>{t(language,"evidenceImmutable")}</span>
    </header>
    <div className="space-y-4 p-4 md:p-5">
      <div className="rounded-lg border border-[#e2d8ca] bg-[#faf6ed] px-3 py-2 text-xs text-[#6d5b41]"><strong>{t(language,"company")}:</strong> {companyName} · #{companyId}</div>
      {!canManage ? <p className="rounded-lg border border-[#e6d8b7] bg-[#f6f0df] px-3 py-2 text-xs text-[#695638]">{t(language,"managerOnly")}</p> :
        <>
          {settingsBlocked && form.costType === "INTERNAL_FLEET" && (settingsQuery.isLoading
            ? <div className="space-y-2" aria-label={t(language,"settingsLoading")}><Skeleton className="h-10 rounded-lg bg-[#e8ede7]"/><p className="text-xs text-[#756c5d]">{t(language,"settingsLoading")}</p></div>
            : <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language,"settingsError")}</AlertTitle><AlertDescription className="mt-2"><Button type="button" variant="outline" size="sm" onClick={()=>void settingsQuery.refetch()}>{t(language,"retry")}</Button></AlertDescription></Alert>)}
          <form onSubmit={capture} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Field label={t(language,"order")}><input inputMode="numeric" value={form.orderId} onChange={setText("orderId")} className={inputClass} disabled={mutation.isPending}/></Field>
            <Field label={t(language,"source")}><input maxLength={150} value={form.sourceId} onChange={setText("sourceId")} className={inputClass} disabled={mutation.isPending}/><small>{t(language,"sourceHelp")}</small></Field>
            <Field label={t(language,"eventDate")}><input type="date" value={form.eventDate} onChange={event=>edit("eventDate",event.target.value)} className={inputClass} disabled={mutation.isPending}/></Field>
            <Field label={t(language,"loadingSource")}><input maxLength={150} value={form.loadingSourceId} onChange={setText("loadingSourceId")} className={inputClass} disabled={mutation.isPending}/><small>{t(language,"loadingHelp")}</small></Field>
            <Field label={t(language,"costType")}><select value={form.costType} onChange={event=>edit("costType",event.target.value as CostType)} className={inputClass} disabled={mutation.isPending}>
              <option value="">{t(language,"costType")}</option><option value="EXTERNAL_CARRIER">{t(language,"external")}</option><option value="INTERNAL_FLEET">{t(language,"internal")}</option>
            </select></Field>
            {form.costType === "EXTERNAL_CARRIER" && <>
              <Field label={t(language,"carrier")}><input maxLength={150} value={form.carrierReference} onChange={setText("carrierReference")} className={inputClass} disabled={mutation.isPending}/></Field>
              <Field label={t(language,"document")}><input maxLength={150} value={form.costDocumentReference} onChange={setText("costDocumentReference")} className={inputClass} disabled={mutation.isPending}/></Field>
              <Field label={t(language,"actualCost")}><input inputMode="decimal" value={form.actualCost} onChange={setText("actualCost")} className={inputClass} disabled={mutation.isPending}/><small>{t(language,"amount")}</small></Field>
              <Field label={t(language,"currency")}><input maxLength={3} value={form.currency} onChange={setText("currency")} className={inputClass} disabled={mutation.isPending}/></Field>
            </>}
            {form.costType === "INTERNAL_FLEET" && <Field label={`${t(language,"distance")}${perKilometre?" · required":""}`}><input inputMode="decimal" value={form.distanceKm} onChange={setText("distanceKm")} className={inputClass} disabled={mutation.isPending}/><small>{t(language,"distanceHelp")}</small></Field>}
            {formError && <p role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-sm text-[#883f37] sm:col-span-2 xl:col-span-3">{formError}</p>}
            {mutation.isError && <Alert variant="destructive" className="sm:col-span-2 xl:col-span-3"><AlertCircle className="h-4 w-4"/><AlertTitle>{t(language,"failed")}</AlertTitle><AlertDescription>{mutation.error instanceof Error?mutation.error.message:t(language,"failed")}</AlertDescription></Alert>}
            {success && <p role="status" className="rounded-lg border border-[#cbdccf] bg-[#edf4eb] px-3 py-2 text-sm text-[#42634e] sm:col-span-2 xl:col-span-3">{success.duplicate?t(language,"duplicate"):t(language,"success")} · {t(language,"fact")} <bdi dir="ltr">#{success.factId}</bdi> · {t(language,"evidenceImmutable")}</p>}
            <div className="flex flex-col gap-2 sm:col-span-2 xl:col-span-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] leading-5 text-[#807663]">{t(language,"confirmText")}</p>
              <Button type="submit" disabled={mutation.isPending||settingsBlocked} className="shrink-0 bg-[#735b3e] text-[#fbf6ed] hover:bg-[#624b32]">{mutation.isPending?t(language,"capturing"):t(language,"capture")}</Button>
            </div>
          </form>
        </>}
    </div>
  </section>;
}

function Field({label,children}:{label:string;children:ReactNode}) {
  return <label className="block space-y-1.5 text-xs font-semibold text-[#53665d]"><span>{label}</span>{children}</label>;
}
