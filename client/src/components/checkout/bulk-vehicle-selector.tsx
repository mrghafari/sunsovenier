import {useQuery} from "@tanstack/react-query";
import {eligibleTransportTemplates} from "@shared/bulk-transport";

const copy={
  fa:{title:"حمل فله‌ای",vehicle:"قالب خودروی فله‌ای",auto:"انتخاب خودکار از دستهٔ فله‌ای",loading:"در حال دریافت قالب‌ها…",empty:"قالب فعال فله‌ای موجود نیست؛ ابتدا در مدیریت قالب خودرو، دستهٔ فله‌ای را تعیین کنید.",error:"دریافت قالب‌های فله‌ای ناموفق بود.",notice:"قیمت کالا طبق قرارداد است. کرایه و تعداد خودرو بر اساس قالب، مسیر و ظرفیت محاسبه می‌شوند."},
  ar:{title:"نقل سائب",vehicle:"قالب مركبة سائبة",auto:"اختيار تلقائي من الفئة السائبة",loading:"تحميل القوالب…",empty:"لا توجد قوالب سائبة نشطة. حدد الفئة في إدارة المركبات.",error:"تعذر تحميل القوالب.",notice:"سعر البضاعة حسب العقد. النقل وعدد المركبات حسب القالب والمسار والسعة."},
  en:{title:"Bulk transport",vehicle:"Bulk vehicle template",auto:"Automatic bulk-category selection",loading:"Loading templates…",empty:"No active bulk templates. Assign the category in vehicle management first.",error:"Could not load templates.",notice:"Goods retain contract prices. Freight and vehicle count follow template, route and capacity."},
  tr:{title:"Dökme taşıma",vehicle:"Dökme araç şablonu",auto:"Dökme kategorisinden otomatik seçim",loading:"Şablonlar yükleniyor…",empty:"Aktif dökme şablonu yok. Araç yönetiminde kategoriyi belirleyin.",error:"Şablonlar yüklenemedi.",notice:"Ürünler sözleşme fiyatını korur. Nakliye ve araç sayısı şablon, rota ve kapasiteye bağlıdır."},
};
export default function BulkVehicleSelector({language,value,onChange,selfTransport=false}:{language:string;value:string;onChange:(id:string)=>void;selfTransport?:boolean}){
  const t=copy[language as keyof typeof copy]??copy.en;
  const query=useQuery({
    queryKey:["/api/logistics/vehicle-templates","bulk-checkout"],retry:false,
    queryFn:async()=>{
      const response=await fetch("/api/logistics/vehicle-templates",{credentials:"include"});
      if(!response.ok)throw new Error(t.error);
      const result=await response.json();
      if(!result.success||!Array.isArray(result.data))throw new Error(t.error);
      return result.data as {id:number;name:string;nameEn?:string;isActive:boolean;transportCategory:string;maxWeightKg:string}[];
    },
  });
  const templates=eligibleTransportTemplates(query.data??[],"bulk");
  return <section className="my-3 space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
    <h3 className="font-semibold">{t.title}</h3>
    <label className="block text-sm">{t.vehicle}
      <select className="mt-1 w-full rounded border bg-white p-2" value={value} disabled={query.isPending||query.isError||!templates.length}
        onChange={e=>onChange(e.target.value)}>
        <option value="">{selfTransport?"—":t.auto}</option>{templates.map(vehicle=><option key={vehicle.id} value={String(vehicle.id)}>
          {(language==="en"&&vehicle.nameEn)||vehicle.name} · {vehicle.maxWeightKg} kg
        </option>)}
      </select>
    </label>
    {query.isPending?<p>{t.loading}</p>:query.isError?<p role="alert">{t.error}</p>:!templates.length?<p role="alert">{t.empty}</p>:null}
    <p className="text-xs">{selfTransport
      ?language==="fa"?"طبق قرارداد، حمل توسط مشتری است؛ انتخاب قالب فقط نوع خودرو را ثبت می‌کند و کرایهٔ شرکت اضافه نمی‌شود."
        :language==="ar"?"النقل على العميل حسب العقد؛ الاختيار يسجل نوع المركبة فقط دون أجرة نقل للشركة."
        :language==="tr"?"Sözleşmeye göre taşıma müşteriye aittir; seçim yalnızca araç tipini kaydeder, şirket nakliye ücreti eklenmez."
        :"Transport is customer-arranged under the contract. This records a vehicle type only; no company freight is added."
      :t.notice}</p>
  </section>;
}
