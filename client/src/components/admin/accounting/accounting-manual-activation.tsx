import {useState} from "react";
import {useQuery,useMutation,useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";

type State={companyId:number;baseCurrency:string;approved:boolean;enabled:boolean;canActivate:boolean};
async function requestState(path:string,expectedCompanyId:number,body?:object):Promise<State> {
  const response=await fetch(path,{credentials:"include",...(body===undefined?{}:
    {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})});
  if(!response.ok)throw new Error(`Manual activation request failed (${response.status})`);
  const state=await response.json();
  if(state.companyId!==expectedCompanyId||typeof state.baseCurrency!=="string"||
    !["approved","enabled","canActivate"].every(k=>typeof state[k]==="boolean"))
    throw new Error("Invalid manual activation response");
  return state;
}
const copy={
  fa:{title:"فعال‌سازی اسناد و هزینه‌های دستی",ready:"ثبت اسناد دستی فعال است.",scope:"فقط برای دفتر مستقل جدید. این تأیید مانده‌های قدیمی، موجودی فیزیکی یا مجوزهای ارز خارجی را تغییر نمی‌دهد و پولی ایجاد یا پرداخت نمی‌کند.",reason:"دلیل و مرجع تأیید مدیر",agree:"ثبت اسناد در ارز پایه را با حفظ سوابق و مانده‌های قدیمی تأیید می‌کنم.",activate:"تأیید و فعال‌سازی",pending:"در حال بررسی…",blocked:"ابتدا دفتر مستقل، ارز پایه و دورهٔ مالی باز را آماده کنید.",failed:"فعال‌سازی انجام نشد؛ اطلاعات و دسترسی را بررسی کنید.",loading:"در حال دریافت وضعیت…",unavailable:"وضعیت فعال‌سازی دریافت نشد؛ دوباره تلاش کنید.",retry:"تلاش دوباره",permission:"فعال‌سازی به دسترسی مدیریت حسابداری نیاز دارد."},
  en:{title:"Activate manual documents and expenses",ready:"Manual posting is enabled.",scope:"New independent book only. This approval does not change legacy balances, physical stock or foreign-currency gates and does not create or pay money.",reason:"Manager's approval reason and reference",agree:"I approve base-currency posting while preserving legacy records and balances.",activate:"Approve and activate",pending:"Checking…",blocked:"Prepare the independent book, base currency and an open fiscal period first.",failed:"Activation failed; check the information and your access.",loading:"Loading activation status…",unavailable:"Activation status unavailable; try again.",retry:"Retry",permission:"Accounting management access is required."},
  ar:{title:"تفعيل المستندات والمصروفات اليدوية",ready:"ترحيل المستندات اليدوية مفعّل.",scope:"للـدفتر المستقل الجديد فقط. لا يغيّر هذا التأكيد الأرصدة القديمة أو المخزون الفعلي أو صلاحيات العملات الأجنبية، ولا ينشئ أو يدفع أموالاً.",reason:"سبب ومرجع موافقة المدير",agree:"أوافق على الترحيل بالعملة الأساسية مع حفظ السجلات والأرصدة القديمة.",activate:"الموافقة والتفعيل",pending:"جارٍ التحقق…",blocked:"جهّز الدفتر المستقل والعملة الأساسية وفترة مالية مفتوحة أولاً.",failed:"لم يتم التفعيل؛ تحقق من المعلومات والصلاحيات.",loading:"جارٍ تحميل حالة التفعيل…",unavailable:"حالة التفعيل غير متاحة؛ حاول مجدداً.",retry:"إعادة المحاولة",permission:"يلزم الوصول لإدارة المحاسبة."},
  tr:{title:"Manuel belgeleri ve giderleri etkinleştir",ready:"Manuel kayıt etkin.",scope:"Yalnızca yeni bağımsız defter. Bu onay eski bakiyeleri, fiziksel stoku veya döviz izinlerini değiştirmez; para oluşturmaz veya ödeme yapmaz.",reason:"Yönetici onayının nedeni ve referansı",agree:"Eski kayıtları ve bakiyeleri koruyarak ana para biriminde kaydı onaylıyorum.",activate:"Onayla ve etkinleştir",pending:"Kontrol ediliyor…",blocked:"Önce bağımsız defteri, ana para birimini ve açık mali dönemi hazırlayın.",failed:"Etkinleştirme başarısız; bilgileri ve erişiminizi kontrol edin.",loading:"Etkinleştirme durumu yükleniyor…",unavailable:"Etkinleştirme durumu alınamadı; tekrar deneyin.",retry:"Tekrar dene",permission:"Muhasebe yönetimi erişimi gerekir."},
};

export default function AccountingManualActivation(props:{companyId?:number;canManage:boolean;language:string}) {
  return <CompanyActivation key={props.companyId??"none"} {...props}/>;
}
function CompanyActivation({companyId,canManage,language}:{companyId?:number;canManage:boolean;language:string}) {
  const t=copy[language as keyof typeof copy]??copy.en;
  const [reason,setReason]=useState(""),[confirmed,setConfirmed]=useState(false);
  const qc=useQueryClient();
  const key=["accounting-manual-activation",companyId];
  const state=useQuery<State>({queryKey:key,enabled:!!companyId,queryFn:async()=>{
    return requestState(`/api/accounting/v2/manual-activation?companyId=${companyId}`,companyId!);
  }});
  const activation=useMutation({mutationFn:async()=>{
    if(!companyId||!canManage||!confirmed||reason.trim().length<5)throw new Error("Invalid approval");
    return requestState("/api/accounting/v2/manual-activation",companyId,
      {companyId,reason:reason.trim(),preserveLegacyConfirmed:true,baseCurrencyOnlyConfirmed:true});
  },onSuccess:result=>{
    qc.setQueryData(key,result);
    void qc.invalidateQueries({predicate:q=>q.queryKey.some(k=>typeof k==="string"&&k.includes("manual"))});
  }});
  if(!companyId)return null;
  return <section className="col-span-full rounded-xl border p-4 space-y-3 my-3" data-testid="accounting-manual-activation">
    <h3 className="font-semibold">{t.title}</h3>
    <p className="text-sm">{t.scope}</p>
    {state.isLoading?<p role="status">{t.loading}</p>:state.isError?
      <div role="alert">{t.unavailable} <Button variant="outline" onClick={()=>void state.refetch()}>{t.retry}</Button></div>:
      state.data?.enabled?<p role="status">{t.ready} <bdi>{state.data.baseCurrency}</bdi></p>:
      !state.data?.canActivate?<p>{t.blocked}</p>:!canManage?<p>{t.permission}</p>:<>
        <label className="block text-sm">{t.reason}
          <textarea className="block w-full border rounded-md p-2 mt-1" rows={2} maxLength={500}
            value={reason} onChange={e=>setReason(e.target.value)} disabled={activation.isPending}/>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={activation.isPending}/>
          <span>{t.agree} <bdi>{state.data?.baseCurrency}</bdi></span>
        </label>
        <Button disabled={!confirmed||reason.trim().length<5||activation.isPending} onClick={()=>activation.mutate()}>
          {activation.isPending?t.pending:t.activate}
        </Button>
        {activation.isError&&<p role="alert">{t.failed}</p>}
      </>}
  </section>;
}
