import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import type {AccountingCreditExposure} from "@shared/accounting-credit";
import {useLanguage} from "@/contexts/LanguageContext";
import {apiRequest} from "@/lib/queryClient";
import {Button} from "@/components/ui/button";
import {normalizeAccountingDigits} from "./accounting-logic";

export const creditCopy={
  fa:{title:"کنترل اعتبار",notice:"اعتبار، موجودی نقدی حساب نزد شرکت نیست. فعال‌سازی به تطبیق افتتاحیه نیاز دارد؛ این صفحه آن را فعال نمی‌کند.",
    company:"شرکت",wallet:"شناسه حساب مشتری نزد شرکت",view:"بررسی اعتبار",open:"بدهی باز فاکتورها",cheque:"تخصیص چک‌های وصول‌نشده",
    unbilled:"سفارش اعتباری تأییدشده و هنوز فاکتورنشده",limit:"سقف اعتبار",exposure:"کل ریسک اعتباری",remaining:"اعتبار باقی‌مانده",
    ready:"افتتاحیه تأیید شده",blocked:"افتتاحیه تأیید نشده / تأیید مالی مسدود",reconciled:"مطابق دفتر کل",unreconciled:"نیازمند تطبیق دفتر کل",
    order:"شناسه داخلی سفارش جدید",evidence:"مرجع تطبیق هویت سفارش با مشتری CRM",notes:"دلیل تأیید مالی",
    register:"ثبت ارتباط اعتباری",approve:"تأیید سفارش اعتباری",unavailable:"نامشخص",loading:"در حال بررسی…",invalid:"شناسه‌های معتبر وارد کنید.",
    success:"عملیات ثبت شد؛ پرداخت همچنان در انتظار است. این عملیات فاکتور صادر نمی‌کند یا از کیف پول کسر نمی‌کند.",
    scope:"ثبت اعتباری فقط برای سفارش جدیدِ پرداخت‌نشدهٔ بانکی/نقدی و غیرقراردادی است. تمام مبلغ ثابت سفارش به‌عنوان اعتبار تعهد می‌شود؛ ابتدا هویت دو رکورد را با مدرک تطبیق دهید.",
    source:"مشتری CRM",stale:"فیلترها تغییر کرده‌اند؛ دوباره بررسی کنید.",disabled:"ثبت و تأیید تا تأیید افتتاحیه و تطبیق بدهی‌ها غیرفعال است."},
  ar:{title:"الرقابة الائتمانية",notice:"حد الائتمان ليس رصيداً نقدياً للعميل. يتطلب التفعيل مطابقة الأرصدة الافتتاحية؛ هذه الصفحة لا تفعّله.",
    company:"الشركة",wallet:"معرّف حساب العميل",view:"فحص الائتمان",open:"ذمم الفواتير المفتوحة",cheque:"تخصيصات الشيكات غير المحصلة",
    unbilled:"طلبات ائتمانية معتمدة لم تفوتر بعد",limit:"حد الائتمان",exposure:"إجمالي التعرض",remaining:"الائتمان المتبقي",
    ready:"الافتتاحية معتمدة",blocked:"الافتتاحية غير معتمدة / الموافقة المالية محظورة",reconciled:"مطابق لدفتر الأستاذ",unreconciled:"بحاجة إلى المطابقة",
    order:"معرّف الطلب الجديد",evidence:"مرجع مطابقة هوية الطلب بعميل CRM",notes:"سبب الموافقة المالية",
    register:"تسجيل ارتباط الائتمان",approve:"اعتماد الطلب الائتماني",unavailable:"غير متاح",loading:"جارٍ الفحص…",invalid:"أدخل معرّفات صحيحة.",
    success:"سُجلت العملية؛ الدفع ما زال معلقاً. لا تصدر هذه العملية فاتورة ولا تخصم من المحفظة.",
    scope:"للطلبيات البنكية/النقدية الجديدة غير المدفوعة وغير التعاقدية فقط. يُحجز كامل مبلغ الطلب الثابت كائتمان؛ طابق هويتي السجلين بالمستندات أولاً.",
    source:"عميل CRM",stale:"تغيرت المرشحات؛ أعد الفحص.",disabled:"التسجيل والاعتماد معطلان حتى اعتماد الافتتاحية ومطابقة الذمم."},
  en:{title:"Credit control",notice:"A credit limit is not customer cash. Activation requires opening reconciliation; this page cannot enable it.",
    company:"Company",wallet:"Customer prepaid account ID",view:"Check credit",open:"Open invoice receivables",cheque:"Uncleared cheque allocations",
    unbilled:"Approved unbilled credit orders",limit:"Credit limit",exposure:"Total exposure",remaining:"Remaining credit",
    ready:"Opening approved",blocked:"Opening not approved / finance approval blocked",reconciled:"Reconciled to ledger",unreconciled:"Ledger reconciliation required",
    order:"New internal order ID",evidence:"Order-to-CRM identity review reference",notes:"Financial approval reason",
    register:"Register credit link",approve:"Approve credit order",unavailable:"Unavailable",loading:"Checking…",invalid:"Enter valid IDs.",
    success:"Recorded; payment remains pending. This operation does not issue an invoice or debit a wallet.",
    scope:"New unpaid, non-contract bank/cash orders only. The entire frozen order amount is committed as credit; verify both record identities against evidence first.",
    source:"CRM customer",stale:"Filters changed; check again.",disabled:"Registration and approval are disabled until openings and receivables are reconciled."},
  tr:{title:"Kredi kontrolü",notice:"Kredi limiti müşteri nakdi değildir. Etkinleştirme açılış mutabakatı gerektirir; bu sayfa etkinleştiremez.",
    company:"Şirket",wallet:"Müşteri ön ödeme hesabı kimliği",view:"Krediyi kontrol et",open:"Açık fatura alacakları",cheque:"Tahsil edilmemiş çek dağıtımları",
    unbilled:"Onaylanmış, faturalanmamış kredili siparişler",limit:"Kredi limiti",exposure:"Toplam risk",remaining:"Kalan kredi",
    ready:"Açılış onaylandı",blocked:"Açılış onaylanmadı / mali onay engellendi",reconciled:"Defterle mutabık",unreconciled:"Defter mutabakatı gerekli",
    order:"Yeni dahili sipariş kimliği",evidence:"Sipariş-CRM kimlik incelemesi referansı",notes:"Mali onay nedeni",
    register:"Kredi bağlantısını kaydet",approve:"Kredili siparişi onayla",unavailable:"Bilinmiyor",loading:"Kontrol ediliyor…",invalid:"Geçerli kimlikler girin.",
    success:"Kaydedildi; ödeme beklemede. Bu işlem fatura oluşturmaz veya cüzdandan para çekmez.",
    scope:"Yalnızca yeni, ödenmemiş, sözleşmesiz banka/nakit siparişleri. Sabit sipariş tutarının tamamı kredi olarak ayrılır; önce her iki kaydın kimliğini belgeyle doğrulayın.",
    source:"CRM müşterisi",stale:"Filtreler değişti; yeniden kontrol edin.",disabled:"Açılış ve alacak mutabakatı onaylanana kadar kayıt ve onay devre dışıdır."},
};
export default function AccountingCredit({companies,canManage}:{companies:{id:number;name:string}[];canManage:boolean}){
  const {language,direction}=useLanguage();
  const t=creditCopy[language as keyof typeof creditCopy]??creditCopy.en;
  const [company,setCompany]=useState(""),[wallet,setWallet]=useState("");
  const [scope,setScope]=useState<{companyId:number;walletId:number}|null>(null);
  const [order,setOrder]=useState(""),[evidence,setEvidence]=useState(""),[notes,setNotes]=useState("");
  const [message,setMessage]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const matches=scope?.companyId===Number(company)&&scope?.walletId===Number(wallet);
  const query=useQuery<AccountingCreditExposure>({
    queryKey:["/api/accounting/v2/credit-exposure",scope?.companyId,scope?.walletId],
    enabled:!!scope&&matches,
    queryFn:async()=>apiRequest(`/api/accounting/v2/credit-exposure?companyId=${scope!.companyId}&walletId=${scope!.walletId}`,{method:"GET"}),
  });
  const report=matches?query.data:undefined;
  const eligible=!!report&&!report.blockingCodes.length&&!query.isFetching;
  const fieldClass="w-full rounded-lg border border-[#dfe6de] bg-white px-3 py-2";
  const check=()=>{
    setMessage("");setError("");
    if(![company,wallet].every(v=>/^[1-9]\d*$/.test(v)&&Number.isSafeInteger(Number(v)))){setError(t.invalid);return;}
    const next={companyId:Number(company),walletId:Number(wallet)};
    if(matches)void query.refetch();else setScope(next);
  };
  const mutate=async(kind:"register"|"approve")=>{
    if(!report||!eligible||!/^[1-9]\d*$/.test(order)||!Number.isSafeInteger(Number(order))){setError(t.invalid);return;}
    const captured={company,wallet,order};setBusy(true);setMessage("");setError("");
    try{
      await apiRequest(kind==="register"?"/api/accounting/v2/credit-orders":`/api/accounting/v2/credit-orders/${order}/approve`,
        {method:"POST",body:kind==="register"?{companyId:report.companyId,walletId:report.walletId,orderId:Number(order),evidenceReference:evidence}:{notes}});
      // Inputs are disabled while posting, so a result cannot appear under another customer.
      if(captured.company===company&&captured.wallet===wallet&&captured.order===order){setMessage(t.success);await query.refetch();}
    }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
  };
  return <section dir={direction} className="space-y-4 rounded-2xl border border-[#dfe6de] bg-white p-5">
    <h2 className="text-xl font-semibold">{t.title}</h2><p className="text-sm leading-7">{t.notice}</p>
    <form onSubmit={e=>{e.preventDefault();check();}} className="grid gap-3 md:grid-cols-3">
      <label>{t.company}<select disabled={busy} className={fieldClass} value={company} onChange={e=>{setCompany(e.target.value);setMessage("");setError("");}}>
        <option value="">—</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>{t.wallet}<input disabled={busy} className={fieldClass} inputMode="numeric" value={wallet} onChange={e=>{setWallet(normalizeAccountingDigits(e.target.value));setMessage("");setError("");}}/></label>
      <Button type="submit" disabled={busy||query.isFetching}>{query.isFetching?t.loading:t.view}</Button>
    </form>
    {scope&&!matches&&<p role="status">{t.stale}</p>}
    {(error||(matches&&query.isError))&&<p role="alert" className="text-red-700">{error||(query.error instanceof Error?query.error.message:t.unavailable)}</p>}
    {report&&<>
      <CreditExposureResult report={report} language={language}/>
      {canManage&&<div className="space-y-3 border-t pt-4">
        <p className="text-sm leading-7">{t.scope}</p>{!eligible&&<p>{t.disabled}</p>}
        <label className="block">{t.order}<input disabled={busy} className={fieldClass} inputMode="numeric" value={order} onChange={e=>{setOrder(normalizeAccountingDigits(e.target.value));setMessage("");}}/></label>
        <label className="block">{t.evidence}<input disabled={busy} className={fieldClass} value={evidence} onChange={e=>setEvidence(e.target.value)} maxLength={500}/></label>
        <Button disabled={busy||!eligible||evidence.trim().length<5} onClick={()=>void mutate("register")}>{t.register}</Button>
        <label className="block">{t.notes}<input disabled={busy} className={fieldClass} value={notes} onChange={e=>setNotes(e.target.value)} maxLength={500}/></label>
        <Button disabled={busy||!eligible||notes.trim().length<5} onClick={()=>void mutate("approve")}>{t.approve}</Button>
      </div>}
    </>}
    {message&&<p role="status">{message}</p>}
  </section>;
}

export function CreditExposureResult({report,language}:{report:AccountingCreditExposure;language:string}){
  const t=creditCopy[language as keyof typeof creditCopy]??creditCopy.en;
  return <div className="space-y-3">
    <p>{t.source}: #{report.customerId} · {report.currency}</p>
    <p role="status">{report.openingApproved?t.ready:t.blocked} · {report.reconciled?t.reconciled:t.unreconciled}</p>
    <dl className="grid gap-3 md:grid-cols-2">{([
      [t.limit,report.creditLimit],[t.open,report.openReceivables],[t.cheque,report.unclearedChequeAllocations],
      [t.unbilled,report.approvedUnbilledCredit],[t.exposure,report.exposure],[t.remaining,report.remainingCredit],
    ] as const).map(([label,value])=><div key={label} className="rounded-lg bg-[#f4f7f1] p-3"><dt>{label}</dt><dd dir="ltr" className="font-mono">{value??t.unavailable} {report.currency}</dd></div>)}</dl>
    {!!report.blockingCodes.length&&<ul role="alert">{report.blockingCodes.map(code=><li key={code}>{code}</li>)}</ul>}
  </div>;
}