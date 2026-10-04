import {
  LOADING_SECTIONS,
  ROLE_SECTIONS,
  type LoadingFoundation,
  type LoadingRole,
  type LoadingSection,
} from "@shared/loading/contracts";

export function authorizedLoadingSections(foundation: LoadingFoundation): LoadingSection[] {
  const serverSections = new Set(foundation.sections);
  const roleSections = new Set<LoadingSection>();
  for (const role of foundation.roles) {
    for (const section of ROLE_SECTIONS[role]) roleSections.add(section);
  }
  return LOADING_SECTIONS.filter(section => serverSections.has(section) && roleSections.has(section));
}

export function hasLoadingSectionAccess(
  foundation: LoadingFoundation,
  section: LoadingSection,
): boolean {
  return authorizedLoadingSections(foundation).includes(section);
}

export function loadingRoleLabel(role: LoadingRole, language: "fa" | "ar" | "en" | "tr") {
  const labels: Record<LoadingRole, Record<"fa" | "ar" | "en" | "tr", string>> = {
    customer: { en: "Customer", fa: "مشتری", ar: "عميل", tr: "Müşteri" },
    sales_admin: { en: "Sales administrator", fa: "مدیر فروش", ar: "مسؤول المبيعات", tr: "Satış yöneticisi" },
    main_gate_officer: { en: "Main gate officer", fa: "نگهبان دروازه اصلی", ar: "مسؤول البوابة الرئيسية", tr: "Ana kapı görevlisi" },
    warehouse_gate_officer: { en: "Warehouse gate officer", fa: "نگهبان دروازه انبار", ar: "مسؤول بوابة المستودع", tr: "Depo kapı görevlisi" },
    weighbridge_operator: { en: "Weighbridge operator", fa: "اپراتور باسکول", ar: "مشغل الميزان", tr: "Kantar operatörü" },
    loading_operator: { en: "Loading operator", fa: "اپراتور بارگیری", ar: "مشغل التحميل", tr: "Yükleme operatörü" },
    warehouse_manager: { en: "Warehouse manager", fa: "مدیر انبار", ar: "مدير المستودع", tr: "Depo yöneticisi" },
    hse_officer: { en: "HSE officer", fa: "مسئول ایمنی", ar: "مسؤول السلامة", tr: "İSG görevlisi" },
    loading_manager: { en: "Loading manager", fa: "مدیر بارگیری", ar: "مدير التحميل", tr: "Yükleme yöneticisi" },
  };
  return labels[role][language];
}