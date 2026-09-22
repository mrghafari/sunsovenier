import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { ArrowLeft, Save, Shield, Phone, Mail, Building, MapPin, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const normalizeProfileCountry = (country?: string) => {
  const value = (country || "").trim().toLowerCase();
  if (["iran", "ir", "ایران", "إيران"].includes(value)) return "ایران";
  if (["turkey", "turkiye", "türkiye", "tr", "ترکیه", "تركيا"].includes(value)) return "ترکیه";
  if (["iraq", "iq", "عراق", "العراق"].includes(value)) return "عراق";
  return country || "";
};

const EDIT_T = {
  en: {
    backToCrm: "Back to CRM", newCustomer: "Create New Customer (CRM)", editCustomer: "Edit Customer (CRM)",
    createDescription: "Create a new customer through the CRM system", editDescription: "Edit customer information through the CRM system",
    firstName: "First name", lastName: "Last name", phone: "Phone number", email: "Email",
    emailPlaceholder: "Email address", company: "Company name", companyOptional: "Company name (optional)",
    addressInfo: "Address information", country: "Country", province: "Province", city: "City",
    selectProvince: "Select province", selectCity: "Select city", fullAddress: "Full address",
    secondaryAddress: "Secondary address (optional)", secondaryPlaceholder: "Secondary address or workplace",
    postalCode: "Postal code", additionalContact: "Additional contact information",
    alternatePhone: "Second phone number (optional)", alternatePlaceholder: "Second landline or mobile number",
    businessInfo: "Business information", industry: "Industry", selectIndustry: "Select industry",
    businessType: "Business type", selectBusinessType: "Select business type", companySize: "Company size",
    selectCompanySize: "Select company size", website: "Company website", taxId: "Tax ID",
    taxIdPlaceholder: "Company tax ID", registrationNumber: "Company registration number",
    registrationPlaceholder: "Official company registration number", customerSettings: "Customer settings",
    customerType: "Customer type", selectCustomerType: "Select customer type",
    paymentMethod: "Preferred payment method", selectPaymentMethod: "Select payment method",
    creditLimit: "Credit limit (IQD)", creditLimitPlaceholder: "Credit limit amount",
    leadSource: "Customer source", selectLeadSource: "How did you find us?",
    preferences: "User preferences", preferredLanguage: "Preferred language", selectLanguage: "Select language",
    communicationPreference: "Preferred communication method", selectCommunication: "Select communication method",
    marketingConsent: "Consent to receive marketing information",
    marketingDescription: "If you agree, we will send you information about new products and special offers.",
    crmInfo: "Additional CRM information", annualRevenue: "Estimated annual revenue",
    selectAnnualRevenue: "Select annual revenue", priceRange: "Preferred price range", selectPriceRange: "Select price range",
    orderFrequency: "Order frequency", selectOrderFrequency: "Select order frequency", creditStatus: "Credit status",
    selectCreditStatus: "Select credit status", smsEnabled: "Enable SMS", smsDescription: "Receive important notifications and messages by SMS",
    emailEnabled: "Enable email", emailDescription: "Receive notifications and invoices by email",
    additionalNotes: "Additional notes", notesPlaceholder: "Notes, special requirements, or additional information",
    creating: "Creating...", create: "Create customer", saving: "Saving...", saveChanges: "Save changes",
    cancel: "Cancel", verifyPhone: "Verify phone number", codeSent: "A verification code was sent to the new number. Please enter it.",
    verificationCode: "Verification code", codePlaceholder: "4-digit code", verifying: "Verifying...", verifySave: "Verify and save",
    success: "Success", customerCreated: "New customer created successfully", error: "Error",
    customerCreateFailed: "Customer creation failed", smsSent: "SMS verification code sent successfully",
    smsFailed: "Failed to send SMS verification", profileUpdated: "Profile updated successfully",
    profileUpdateFailed: "Profile update failed",
    options: {
      chemical: "Chemical", petrochemical: "Petrochemical", pharmaceutical: "Pharmaceutical", agriculture: "Agriculture",
      construction: "Construction", automotive: "Automotive", textile: "Textile", food: "Food", waterTreatment: "Water treatment",
      paint: "Paint and resin", other: "Other", manufacturer: "Manufacturer", distributor: "Distributor", retailer: "Retailer",
      serviceProvider: "Service provider", research: "Research and development", consultant: "Consultant", endUser: "End user",
      under10: "1–10 people", under50: "11–50 people", under200: "51–200 people", under500: "201–500 people", over500: "Over 500 people",
      under100m: "Under 100 million IQD", range100m500m: "100–500 million IQD", range500m1b: "500 million–1 billion IQD",
      range1b5b: "1–5 billion IQD", over5b: "Over 5 billion IQD", confidential: "Confidential",
      budget: "Budget (under 50 thousand IQD)", midRange: "Mid-range (50–200 thousand IQD)",
      premium: "Premium (200–500 thousand IQD)", enterprise: "Enterprise (over 500 thousand IQD)", custom: "Custom price",
      weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly", asNeeded: "As needed", seasonal: "Seasonal",
      excellent: "Excellent", good: "Good", fair: "Fair", poor: "Poor", noCredit: "No credit", pending: "Pending review",
      regular: "Regular", vip: "VIP", wholesale: "Wholesale", retail: "Retail", industrial: "Industrial",
      cash: "Cash", bankTransfer: "Bank transfer", check: "Check", credit: "Credit", installment: "Installment",
      website: "Website", referral: "Referral", socialMedia: "Social media", advertising: "Advertising",
      exhibition: "Exhibition", coldCall: "Cold call", persian: "Persian", arabic: "Arabic", english: "English", kurdish: "Kurdish",
      phone: "Phone", email: "Email", sms: "SMS", whatsapp: "WhatsApp", telegram: "Telegram",
    },
  },
  ar: {
    backToCrm: "العودة إلى CRM", newCustomer: "إنشاء عميل جديد (CRM)", editCustomer: "تعديل العميل (CRM)",
    createDescription: "إنشاء عميل جديد عبر نظام CRM", editDescription: "تعديل معلومات العميل عبر نظام CRM",
    firstName: "الاسم الأول", lastName: "اسم العائلة", phone: "رقم الهاتف", email: "البريد الإلكتروني",
    emailPlaceholder: "عنوان البريد الإلكتروني", company: "اسم الشركة", companyOptional: "اسم الشركة (اختياري)",
    addressInfo: "معلومات العنوان", country: "الدولة", province: "المحافظة", city: "المدينة",
    selectProvince: "اختر المحافظة", selectCity: "اختر المدينة", fullAddress: "العنوان الكامل",
    secondaryAddress: "العنوان الثاني (اختياري)", secondaryPlaceholder: "العنوان الثاني أو مكان العمل",
    postalCode: "الرمز البريدي", additionalContact: "معلومات اتصال إضافية",
    alternatePhone: "رقم الهاتف الثاني (اختياري)", alternatePlaceholder: "رقم الهاتف الأرضي أو المحمول الثاني",
    businessInfo: "معلومات العمل", industry: "مجال النشاط", selectIndustry: "اختر مجال النشاط",
    businessType: "نوع العمل", selectBusinessType: "اختر نوع العمل", companySize: "حجم الشركة",
    selectCompanySize: "اختر حجم الشركة", website: "موقع الشركة", taxId: "الرقم الضريبي",
    taxIdPlaceholder: "الرقم الضريبي للشركة", registrationNumber: "رقم تسجيل الشركة",
    registrationPlaceholder: "رقم تسجيل الشركة الرسمي", customerSettings: "إعدادات العميل",
    customerType: "نوع العميل", selectCustomerType: "اختر نوع العميل", paymentMethod: "طريقة الدفع المفضلة",
    selectPaymentMethod: "اختر طريقة الدفع", creditLimit: "حد الائتمان (IQD)", creditLimitPlaceholder: "قيمة حد الائتمان",
    leadSource: "مصدر العميل", selectLeadSource: "كيف وجدتنا؟", preferences: "تفضيلات المستخدم",
    preferredLanguage: "اللغة المفضلة", selectLanguage: "اختر اللغة", communicationPreference: "طريقة التواصل المفضلة",
    selectCommunication: "اختر طريقة التواصل", marketingConsent: "الموافقة على استلام المعلومات التسويقية",
    marketingDescription: "بموافقتك سنرسل لك معلومات عن المنتجات الجديدة والعروض الخاصة.",
    crmInfo: "معلومات CRM إضافية", annualRevenue: "الإيرادات السنوية التقريبية", selectAnnualRevenue: "اختر الإيرادات السنوية",
    priceRange: "نطاق السعر المفضل", selectPriceRange: "اختر نطاق السعر", orderFrequency: "تكرار الطلب",
    selectOrderFrequency: "اختر تكرار الطلب", creditStatus: "حالة الائتمان", selectCreditStatus: "اختر حالة الائتمان",
    smsEnabled: "تفعيل الرسائل النصية", smsDescription: "استلام الإشعارات والرسائل المهمة عبر الرسائل النصية",
    emailEnabled: "تفعيل البريد الإلكتروني", emailDescription: "استلام الإشعارات والفواتير عبر البريد الإلكتروني",
    additionalNotes: "ملاحظات إضافية", notesPlaceholder: "ملاحظات أو متطلبات خاصة أو معلومات إضافية",
    creating: "جاري الإنشاء...", create: "إنشاء العميل", saving: "جاري الحفظ...", saveChanges: "حفظ التغييرات",
    cancel: "إلغاء", verifyPhone: "تأكيد رقم الهاتف", codeSent: "تم إرسال رمز التحقق إلى الرقم الجديد. يرجى إدخال الرمز.",
    verificationCode: "رمز التحقق", codePlaceholder: "رمز من 4 أرقام", verifying: "جاري التحقق...", verifySave: "تأكيد وحفظ",
    success: "نجاح", customerCreated: "تم إنشاء العميل الجديد بنجاح", error: "خطأ", customerCreateFailed: "فشل إنشاء العميل",
    smsSent: "تم إرسال رمز التحقق عبر الرسائل النصية بنجاح", smsFailed: "فشل إرسال رمز التحقق",
    profileUpdated: "تم تحديث الملف الشخصي بنجاح", profileUpdateFailed: "فشل تحديث الملف الشخصي",
    options: {
      chemical: "كيميائي", petrochemical: "بتروكيماويات", pharmaceutical: "دوائي", agriculture: "زراعي", construction: "إنشاءات",
      automotive: "سيارات", textile: "نسيج", food: "غذائي", waterTreatment: "معالجة المياه", paint: "دهانات وراتنجات", other: "أخرى",
      manufacturer: "مصنع", distributor: "موزع", retailer: "بائع تجزئة", serviceProvider: "مقدم خدمات", research: "بحث وتطوير",
      consultant: "استشاري", endUser: "مستخدم نهائي", under10: "1–10 أشخاص", under50: "11–50 شخصاً", under200: "51–200 شخص",
      under500: "201–500 شخص", over500: "أكثر من 500 شخص", under100m: "أقل من 100 مليون دينار", range100m500m: "100–500 مليون دينار",
      range500m1b: "500 مليون–مليار دينار", range1b5b: "1–5 مليارات دينار", over5b: "أكثر من 5 مليارات دينار", confidential: "سري",
      budget: "اقتصادي", midRange: "متوسط", premium: "مميز", enterprise: "مؤسسات", custom: "سعر مخصص",
      weekly: "أسبوعي", monthly: "شهري", quarterly: "ربع سنوي", yearly: "سنوي", asNeeded: "حسب الحاجة", seasonal: "موسمي",
      excellent: "ممتاز", good: "جيد", fair: "متوسط", poor: "ضعيف", noCredit: "بدون ائتمان", pending: "قيد المراجعة",
      regular: "عادي", vip: "VIP", wholesale: "جملة", retail: "تجزئة", industrial: "صناعي", cash: "نقدي",
      bankTransfer: "تحويل بنكي", check: "شيك", credit: "ائتمان", installment: "تقسيط", website: "الموقع الإلكتروني",
      referral: "إحالة", socialMedia: "التواصل الاجتماعي", advertising: "إعلان", exhibition: "معرض", coldCall: "اتصال بارد",
      persian: "الفارسية", arabic: "العربية", english: "الإنجليزية", kurdish: "الكردية", phone: "هاتف", email: "بريد إلكتروني",
      sms: "رسائل نصية", whatsapp: "واتساب", telegram: "تلغرام",
    },
  },
  tr: {
    backToCrm: "CRM'ye dön", newCustomer: "Yeni müşteri oluştur (CRM)", editCustomer: "Müşteriyi düzenle (CRM)",
    createDescription: "CRM sistemi üzerinden yeni müşteri oluşturun", editDescription: "CRM sistemi üzerinden müşteri bilgilerini düzenleyin",
    firstName: "Ad", lastName: "Soyad", phone: "Telefon numarası", email: "E-posta", emailPlaceholder: "E-posta adresi",
    company: "Şirket adı", companyOptional: "Şirket adı (isteğe bağlı)", addressInfo: "Adres bilgileri", country: "Ülke",
    province: "İl", city: "Şehir", selectProvince: "İl seçin", selectCity: "Şehir seçin", fullAddress: "Tam adres",
    secondaryAddress: "İkinci adres (isteğe bağlı)", secondaryPlaceholder: "İkinci adres veya iş yeri", postalCode: "Posta kodu",
    additionalContact: "Ek iletişim bilgileri", alternatePhone: "İkinci telefon numarası (isteğe bağlı)",
    alternatePlaceholder: "İkinci sabit veya mobil telefon", businessInfo: "İşletme bilgileri", industry: "Sektör",
    selectIndustry: "Sektör seçin", businessType: "İşletme türü", selectBusinessType: "İşletme türü seçin", companySize: "Şirket büyüklüğü",
    selectCompanySize: "Şirket büyüklüğü seçin", website: "Şirket web sitesi", taxId: "Vergi numarası",
    taxIdPlaceholder: "Şirket vergi numarası", registrationNumber: "Şirket sicil numarası", registrationPlaceholder: "Resmi şirket sicil numarası",
    customerSettings: "Müşteri ayarları", customerType: "Müşteri türü", selectCustomerType: "Müşteri türü seçin",
    paymentMethod: "Tercih edilen ödeme yöntemi", selectPaymentMethod: "Ödeme yöntemi seçin", creditLimit: "Kredi limiti (IQD)",
    creditLimitPlaceholder: "Kredi limiti tutarı", leadSource: "Müşteri kaynağı", selectLeadSource: "Bizi nasıl buldunuz?",
    preferences: "Kullanıcı tercihleri", preferredLanguage: "Tercih edilen dil", selectLanguage: "Dil seçin",
    communicationPreference: "Tercih edilen iletişim yöntemi", selectCommunication: "İletişim yöntemi seçin",
    marketingConsent: "Pazarlama bilgilerini alma izni", marketingDescription: "Onay verirseniz yeni ürünler ve özel teklifler hakkında bilgi göndeririz.",
    crmInfo: "Ek CRM bilgileri", annualRevenue: "Tahmini yıllık gelir", selectAnnualRevenue: "Yıllık gelir seçin",
    priceRange: "Tercih edilen fiyat aralığı", selectPriceRange: "Fiyat aralığı seçin", orderFrequency: "Sipariş sıklığı",
    selectOrderFrequency: "Sipariş sıklığı seçin", creditStatus: "Kredi durumu", selectCreditStatus: "Kredi durumu seçin",
    smsEnabled: "SMS'i etkinleştir", smsDescription: "Önemli bildirimleri ve mesajları SMS ile alın",
    emailEnabled: "E-postayı etkinleştir", emailDescription: "Bildirimleri ve faturaları e-posta ile alın",
    additionalNotes: "Ek notlar", notesPlaceholder: "Notlar, özel gereksinimler veya ek bilgiler",
    creating: "Oluşturuluyor...", create: "Müşteri oluştur", saving: "Kaydediliyor...", saveChanges: "Değişiklikleri kaydet",
    cancel: "İptal", verifyPhone: "Telefon numarasını doğrula", codeSent: "Yeni numaraya doğrulama kodu gönderildi. Lütfen kodu girin.",
    verificationCode: "Doğrulama kodu", codePlaceholder: "4 haneli kod", verifying: "Doğrulanıyor...", verifySave: "Doğrula ve kaydet",
    success: "Başarılı", customerCreated: "Yeni müşteri başarıyla oluşturuldu", error: "Hata", customerCreateFailed: "Müşteri oluşturulamadı",
    smsSent: "SMS doğrulama kodu başarıyla gönderildi", smsFailed: "SMS doğrulaması gönderilemedi",
    profileUpdated: "Profil başarıyla güncellendi", profileUpdateFailed: "Profil güncellenemedi",
    options: {
      chemical: "Kimya", petrochemical: "Petrokimya", pharmaceutical: "İlaç", agriculture: "Tarım", construction: "İnşaat",
      automotive: "Otomotiv", textile: "Tekstil", food: "Gıda", waterTreatment: "Su arıtma", paint: "Boya ve reçine", other: "Diğer",
      manufacturer: "Üretici", distributor: "Distribütör", retailer: "Perakendeci", serviceProvider: "Hizmet sağlayıcı",
      research: "Araştırma ve geliştirme", consultant: "Danışman", endUser: "Son kullanıcı", under10: "1–10 kişi", under50: "11–50 kişi",
      under200: "51–200 kişi", under500: "201–500 kişi", over500: "500'den fazla kişi", under100m: "100 milyon IQD'den az",
      range100m500m: "100–500 milyon IQD", range500m1b: "500 milyon–1 milyar IQD", range1b5b: "1–5 milyar IQD", over5b: "5 milyar IQD'den fazla",
      confidential: "Gizli", budget: "Ekonomik", midRange: "Orta", premium: "Premium", enterprise: "Kurumsal", custom: "Özel fiyat",
      weekly: "Haftalık", monthly: "Aylık", quarterly: "Üç aylık", yearly: "Yıllık", asNeeded: "İhtiyaca göre", seasonal: "Mevsimlik",
      excellent: "Mükemmel", good: "İyi", fair: "Orta", poor: "Zayıf", noCredit: "Kredi yok", pending: "İnceleme bekliyor",
      regular: "Standart", vip: "VIP", wholesale: "Toptan", retail: "Perakende", industrial: "Endüstriyel", cash: "Nakit",
      bankTransfer: "Banka havalesi", check: "Çek", credit: "Kredi", installment: "Taksit", website: "Web sitesi",
      referral: "Referans", socialMedia: "Sosyal medya", advertising: "Reklam", exhibition: "Fuar", coldCall: "Soğuk arama",
      persian: "Farsça", arabic: "Arapça", english: "İngilizce", kurdish: "Kürtçe", phone: "Telefon", email: "E-posta",
      sms: "SMS", whatsapp: "WhatsApp", telegram: "Telegram",
    },
  },
} as const;

const PERSIAN_EDIT_T = {
  ...EDIT_T.en,
  backToCrm: "بازگشت به CRM",
  newCustomer: "ایجاد مشتری جدید (CRM)",
  editCustomer: "ویرایش مشتری (CRM)",
  createDescription: "ایجاد مشتری جدید از طریق سیستم CRM",
  editDescription: "ویرایش اطلاعات مشتری از طریق سیستم CRM",
  firstName: "نام",
  lastName: "نام خانوادگی",
  phone: "شماره تلفن",
  email: "ایمیل",
  emailPlaceholder: "آدرس ایمیل",
  company: "نام شرکت",
  companyOptional: "نام شرکت (اختیاری)",
  addressInfo: "اطلاعات آدرس",
  country: "کشور",
  province: "استان",
  city: "شهر",
  selectProvince: "انتخاب استان",
  selectCity: "انتخاب شهر",
  fullAddress: "آدرس کامل",
  secondaryAddress: "آدرس دوم (اختیاری)",
  secondaryPlaceholder: "آدرس دوم یا محل کار",
  postalCode: "کد پستی",
  additionalContact: "اطلاعات تماس تکمیلی",
  alternatePhone: "شماره تلفن دوم (اختیاری)",
  alternatePlaceholder: "شماره تلفن ثابت یا همراه دوم",
  businessInfo: "اطلاعات تجاری",
  industry: "صنعت فعالیت",
  selectIndustry: "انتخاب صنعت",
  businessType: "نوع کسب‌وکار",
  selectBusinessType: "انتخاب نوع کسب‌وکار",
  companySize: "اندازه شرکت",
  selectCompanySize: "انتخاب اندازه شرکت",
  website: "وب‌سایت شرکت",
  taxId: "شناسه مالیاتی",
  taxIdPlaceholder: "شناسه مالیاتی شرکت",
  registrationNumber: "شماره ثبت شرکت",
  registrationPlaceholder: "شماره ثبت رسمی شرکت",
  customerSettings: "تنظیمات مشتری",
  customerType: "نوع مشتری",
  selectCustomerType: "انتخاب نوع مشتری",
  paymentMethod: "روش پرداخت ترجیحی",
  selectPaymentMethod: "انتخاب روش پرداخت",
  creditLimit: "حد اعتبار (IQD)",
  creditLimitPlaceholder: "مقدار حد اعتبار",
  leadSource: "منبع مشتری",
  selectLeadSource: "چگونه ما را پیدا کردید؟",
  preferences: "تنظیمات کاربری",
  preferredLanguage: "زبان ترجیحی",
  selectLanguage: "انتخاب زبان",
  communicationPreference: "روش ارتباط ترجیحی",
  selectCommunication: "انتخاب روش ارتباط",
  marketingConsent: "موافقت با دریافت اطلاعات بازاریابی",
  marketingDescription: "در صورت موافقت، اطلاعات محصولات جدید و پیشنهادهای ویژه را برای شما ارسال می‌کنیم.",
  crmInfo: "اطلاعات تکمیلی CRM",
  annualRevenue: "درآمد سالانه تقریبی",
  selectAnnualRevenue: "انتخاب درآمد سالانه",
  priceRange: "بازه قیمت مورد علاقه",
  selectPriceRange: "انتخاب بازه قیمت",
  orderFrequency: "تناوب سفارش",
  selectOrderFrequency: "انتخاب تناوب سفارش",
  creditStatus: "وضعیت اعتبار",
  selectCreditStatus: "انتخاب وضعیت اعتبار",
  smsEnabled: "فعال‌سازی پیامک",
  smsDescription: "دریافت اطلاعیه‌ها و پیام‌های مهم از طریق پیامک",
  emailEnabled: "فعال‌سازی ایمیل",
  emailDescription: "دریافت اطلاعیه‌ها و فاکتورها از طریق ایمیل",
  additionalNotes: "یادداشت‌های اضافی",
  notesPlaceholder: "یادداشت‌ها، نیازهای خاص یا توضیحات اضافی",
  creating: "در حال ایجاد...",
  create: "ایجاد مشتری",
  saving: "در حال ذخیره...",
  saveChanges: "ذخیره تغییرات",
  cancel: "انصراف",
  verifyPhone: "تأیید شماره تلفن",
  codeSent: "کد تأیید به شماره جدید ارسال شد. لطفاً کد را وارد کنید.",
  verificationCode: "کد تأیید",
  codePlaceholder: "کد ۴ رقمی",
  verifying: "در حال تأیید...",
  verifySave: "تأیید و ذخیره",
  success: "موفقیت",
  customerCreated: "مشتری جدید با موفقیت ایجاد شد",
  error: "خطا",
  customerCreateFailed: "ایجاد مشتری ناموفق بود",
  smsSent: "کد تأیید پیامکی با موفقیت ارسال شد",
  smsFailed: "ارسال کد تأیید پیامکی ناموفق بود",
  profileUpdated: "پروفایل با موفقیت به‌روزرسانی شد",
  profileUpdateFailed: "به‌روزرسانی پروفایل ناموفق بود",
  options: {
    ...EDIT_T.en.options,
    chemical: "شیمیایی", petrochemical: "پتروشیمی", pharmaceutical: "دارویی", agriculture: "کشاورزی",
    construction: "ساختمان", automotive: "خودرویی", textile: "نساجی", food: "مواد غذایی",
    waterTreatment: "تصفیه آب", paint: "رنگ و رزین", other: "سایر", manufacturer: "تولیدکننده",
    distributor: "توزیع‌کننده", retailer: "خرده‌فروش", serviceProvider: "ارائه‌دهنده خدمات",
    research: "تحقیق و توسعه", consultant: "مشاور", endUser: "مصرف‌کننده نهایی",
    under10: "۱ تا ۱۰ نفر", under50: "۱۱ تا ۵۰ نفر", under200: "۵۱ تا ۲۰۰ نفر", under500: "۲۰۱ تا ۵۰۰ نفر",
    over500: "بیش از ۵۰۰ نفر", under100m: "کمتر از ۱۰۰ میلیون دینار", range100m500m: "۱۰۰ تا ۵۰۰ میلیون دینار",
    range500m1b: "۵۰۰ میلیون تا ۱ میلیارد دینار", range1b5b: "۱ تا ۵ میلیارد دینار", over5b: "بیش از ۵ میلیارد دینار",
    confidential: "محرمانه", budget: "اقتصادی", midRange: "متوسط", premium: "بالا", enterprise: "سازمانی", custom: "قیمت مخصوص",
    weekly: "هفتگی", monthly: "ماهانه", quarterly: "فصلی", yearly: "سالانه", asNeeded: "بر اساس نیاز", seasonal: "فصلی",
    excellent: "عالی", good: "خوب", fair: "متوسط", poor: "ضعیف", noCredit: "بدون اعتبار", pending: "در انتظار بررسی",
    regular: "عادی", vip: "VIP", wholesale: "عمده‌فروشی", retail: "خرده‌فروشی", industrial: "صنعتی",
    cash: "نقدی", bankTransfer: "حواله بانکی", check: "چک", credit: "اعتباری", installment: "قسطی",
    website: "وب‌سایت", referral: "معرفی", socialMedia: "شبکه‌های اجتماعی", advertising: "تبلیغات",
    exhibition: "نمایشگاه", coldCall: "تماس سرد", persian: "فارسی", arabic: "عربی", english: "انگلیسی", kurdish: "کردی",
    phone: "تلفن", email: "ایمیل", sms: "پیامک", whatsapp: "واتساپ", telegram: "تلگرام",
  },
};

// Schema for profile editing - includes all CRM fields
const createEditProfileSchema = (t: any) => z.object({
  firstName: z.string().min(1, t.firstName + " is required"),
  lastName: z.string().min(1, t.lastName + " is required"),
  phone: z.string().min(1, t.phone + " is required"),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  company: z.string().optional(),
  country: z.string().min(1, t.country + " is required"),
  province: z.string().min(1, "Province is required"),
  city: z.string().min(1, t.city + " is required"),
  address: z.string().min(1, t.address + " is required"),
  secondaryAddress: z.string().optional(),
  postalCode: z.string().optional(),
  secondaryPostalCode: z.string().optional(),
  alternatePhone: z.string().optional(),
  industry: z.string().optional(),
  businessType: z.string().optional(),
  companySize: z.string().optional(),
  communicationPreference: z.string().optional(),
  preferredLanguage: z.string().optional(),
  marketingConsent: z.boolean().optional(),
  notes: z.string().optional(),
  customerType: z.string().optional(),
  customerStatus: z.string().optional(),
  preferredPaymentMethod: z.string().optional(),
  creditLimit: z.string().optional(),
  website: z.string().optional(),
  taxId: z.string().optional(),
  registrationNumber: z.string().optional(),
  leadSource: z.string().optional(),
  assignedSalesRep: z.string().optional(),
  // Additional CRM fields
  annualRevenue: z.string().optional(),
  priceRange: z.string().optional(),
  orderFrequency: z.string().optional(),
  creditStatus: z.string().optional(),
  smsEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
});

const createSmsVerificationSchema = (t: any) => z.object({
  code: z.string().min(4, "Verification code must be at least 4 digits"),
});

export default function CustomerProfileEdit() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, direction, language } = useLanguage();
  const et = language === 'fa' ? PERSIAN_EDIT_T : EDIT_T[language];
  const [showSmsDialog, setShowSmsDialog] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<any>(null);
  
  const editProfileSchema = createEditProfileSchema(t);
  const smsVerificationSchema = createSmsVerificationSchema(t);
  
  type EditProfileForm = z.infer<typeof editProfileSchema>;
  type SmsVerificationForm = z.infer<typeof smsVerificationSchema>;

  // Get parameters from query string
  const urlParams = new URLSearchParams(window.location.search);
  const customerId = urlParams.get('customerId');
  const mode = urlParams.get('mode'); // 'create' for new customer creation
  const isCreateMode = mode === 'create';
  
  // Fetch customer data - only if not in create mode
  const { data: customer, isLoading, error: customerError } = useQuery<any>({
    queryKey: customerId ? ["/api/crm/customers", customerId] : ["/api/customers/me"],
    queryFn: async () => {
      if (isCreateMode) return null; // Skip loading for create mode
      
      const endpoint = customerId ? `/api/crm/customers/${customerId}` : "/api/customers/me";
      const response = await fetch(endpoint, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch customer data');
      const result = await response.json();
      return customerId ? result.data : result;
    },
    retry: 1,
    enabled: !isCreateMode, // Only fetch if not in create mode
  });

  const [locationCountryCode, setLocationCountryCode] = useState("");
  const [selectedRegionId, setSelectedRegionId] = useState("");

  // Fetch all selectable locations from the central geography API.
  const { data: provincesData } = useQuery({
    queryKey: ["/api/geography/regions", locationCountryCode],
    queryFn: () => fetch(`/api/geography/regions?country=${locationCountryCode}`).then(res => res.json()),
    retry: 1,
    enabled: !!locationCountryCode,
  });

  const { data: citiesData } = useQuery({
    queryKey: ["/api/geography/cities", selectedRegionId],
    queryFn: () => fetch(`/api/geography/cities?regionId=${selectedRegionId}`).then(res => res.json()),
    retry: 1,
    enabled: !!selectedRegionId,
    staleTime: 5 * 60 * 1000,
  });

  const provinces = (provincesData && typeof provincesData === 'object' && 'data' in provincesData) ? provincesData.data as any[] : [];
  const cities = (citiesData && typeof citiesData === 'object' && 'data' in citiesData) ? citiesData.data as any[] : [];

  const form = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      company: "",
      country: "",
      province: "",
      city: "",
      address: "",
      secondaryAddress: "",
      postalCode: "",
      secondaryPostalCode: "",
      alternatePhone: "",
      industry: "",
      businessType: "",
      companySize: "",
      communicationPreference: "",
      preferredLanguage: "",
      marketingConsent: false,
      notes: "",
      customerType: "",
      customerStatus: "",
      preferredPaymentMethod: "",
      creditLimit: "",
      website: "",
      taxId: "",
      registrationNumber: "",
      leadSource: "",
      assignedSalesRep: "",
      // Additional CRM fields
      annualRevenue: "",
      priceRange: "",
      orderFrequency: "",
      creditStatus: "",
      smsEnabled: false,
      emailEnabled: false,
    },
  });

  const selectedCountry = form.watch("country");
  const isIran = selectedCountry === "ایران";
  const isIraq = selectedCountry === "عراق";

  const smsForm = useForm<SmsVerificationForm>({
    resolver: zodResolver(smsVerificationSchema),
    defaultValues: {
      code: ""
    }
  });

  // Update form values when customer data is loaded  
  useEffect(() => {
    if (customer) {
      const customerData = customer.customer || customer; // CRITICAL FIX: Handle both nested and flat structure
      

      
      form.reset({
        firstName: customerData.firstName || "",
        lastName: customerData.lastName || "",
        phone: customerData.phone || "",
        email: customerData.email || "",
        company: customerData.company || "",
        country: normalizeProfileCountry(customerData.country),
        province: customerData.province || "",
        city: customerData.cityRegion || customerData.city || "", // CRITICAL: Use cityRegion from database
        address: customerData.address || "",
        secondaryAddress: customerData.state || customerData.secondaryAddress || "",
        postalCode: customerData.postalCode || "",
        secondaryPostalCode: customerData.secondaryPostalCode || "",
        alternatePhone: customerData.alternatePhone || "",
        industry: customerData.industry || "",
        businessType: customerData.businessType || "",
        companySize: customerData.companySize || "",
        communicationPreference: customerData.communicationPreference || "",
        preferredLanguage: customerData.preferredLanguage || "",
        marketingConsent: customerData.marketingConsent || false,
        notes: customerData.publicNotes || customerData.notes || "",
        customerType: customerData.customerType || "",
        customerStatus: customerData.customerStatus || "",
        preferredPaymentMethod: customerData.preferredPaymentMethod || "",
        creditLimit: customerData.creditLimit ? customerData.creditLimit.toString() : "",
        website: customerData.website || "",
        taxId: customerData.taxId || "",
        registrationNumber: customerData.registrationNumber || "",

        leadSource: customerData.customerSource || customerData.leadSource || "",
        assignedSalesRep: customerData.assignedSalesRep || "",
        // Additional CRM fields
        annualRevenue: customerData.annualRevenue || "",
        priceRange: customerData.priceRange || "",
        orderFrequency: customerData.orderFrequency || "",
        creditStatus: customerData.creditStatus || "",
        smsEnabled: customerData.smsEnabled || false,
        emailEnabled: customerData.emailEnabled || false,
      });
      setLocationCountryCode(normalizeProfileCountry(customerData.country) === "ایران" ? "IR" : "IQ");
      

    }
  }, [customer, form]);

  // Set selected province ID when provinces data and customer data are loaded
  useEffect(() => {
    const actualCustomer = customer?.customer || customer;
    
    if (actualCustomer?.province && provinces.length > 0) {
      const customerProvince = provinces.find((p: any) => 
        p.nameEnglish === actualCustomer.province || 
        p.name === actualCustomer.province ||
        p.nameArabic === actualCustomer.province
      );
      
      if (customerProvince) {
        setSelectedRegionId(String(customerProvince.id));
        
        // Set form value if not already set correctly
        const currentFormValue = form.getValues('province');
        const targetProvinceValue = customerProvince.namePersian || customerProvince.nameArabic || customerProvince.nameEnglish;
        
        if (currentFormValue !== targetProvinceValue) {
          form.setValue('province', targetProvinceValue, { 
            shouldValidate: true, 
            shouldDirty: true 
          });
        }
      }
    }
  }, [customer, provinces, form]);

  // CRITICAL FIX: City setting with stable dependencies
  useEffect(() => {
    const actualCustomer = customer?.customer || customer;
    const customerCityValue = actualCustomer?.cityRegion || actualCustomer?.city;
    
    // Only run if we have all necessary data and haven't set city yet
    if (!customerCityValue || cities.length === 0 || form.getValues('city')) {
      return;
    }

    // Find matching city
    const foundCity = cities.find((c: any) => 
      c.nameEnglish === customerCityValue ||
      c.nameArabic === customerCityValue ||
      c.name === customerCityValue ||
      c.namePersian === customerCityValue
    );

    if (foundCity) {
      form.setValue('city', foundCity.nameEnglish, { shouldValidate: false });
    }
  }, [customer?.customer?.cityRegion, cities.length, form.watch('city')]);

  // Send SMS verification code
  const sendSmsCodeMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await fetch('/api/sms/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to send SMS');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t.loading,
        description: et.smsSent,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t.error,
        description: error.message || et.smsFailed,
      });
    }
  });

  // Update profile with SMS verification
  const verifySmsAndUpdateMutation = useMutation({
    mutationFn: async ({ code, profileData }: { code: string; profileData: EditProfileForm }) => {
      const response = await fetch('/api/customers/verify-and-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ verificationCode: code, ...profileData }),
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Verification failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t.save,
        description: et.profileUpdated,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/me"] });
      setShowSmsDialog(false);
      setPendingChanges(null);
      setLocation("/customer/profile");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t.error,
        description: error.message || et.profileUpdateFailed,
      });
    }
  });

  // Create new customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (data: EditProfileForm) => {
      console.log('📤 [FRONTEND] Creating new customer:', data);
      
      const response = await fetch('/api/crm/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Customer creation failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: et.success,
        description: et.customerCreated,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/customers"] });
      setLocation("/admin/crm");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: et.error,
        description: error.message || et.customerCreateFailed,
      });
    }
  });

  // Update profile without SMS (if no phone change)
  const updateProfileMutation = useMutation({
    mutationFn: async (data: EditProfileForm) => {
      console.log('📤 [FRONTEND] Sending profile update data:', data);
      
      // Choose the appropriate endpoint based on whether we're editing from CRM or customer portal
      const endpoint = customerId ? `/api/crm/customers/${customerId}` : '/api/customers/profile';
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Update failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t.save,
        description: "Profile updated successfully",
      });
      // Invalidate appropriate cache
      if (customerId) {
        queryClient.invalidateQueries({ queryKey: ["/api/crm/customers", customerId] });
        queryClient.invalidateQueries({ queryKey: ["/api/crm/customers"] });
        setLocation("/admin/crm");
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/customers/me"] });
        setLocation("/customer/profile");
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t.error,
        description: error.message || "Profile update failed",
      });
    }
  });

  const onSubmit = (data: EditProfileForm) => {
    if (isCreateMode) {
      // Creating new customer
      createCustomerMutation.mutate(data);
    } else {
      // Updating existing customer
      // Check if phone number changed
      const currentPhone = customer?.customer?.phone;
      const newPhone = data.phone;
      
      if (currentPhone !== newPhone) {
        // Phone changed, require SMS verification
        setPendingChanges(data);
        sendSmsCodeMutation.mutate(newPhone);
        setShowSmsDialog(true);
      } else {
        // No phone change, update directly
        updateProfileMutation.mutate(data);
      }
    }
  };

  const onSmsVerify = (data: SmsVerificationForm) => {
    if (pendingChanges) {
      verifySmsAndUpdateMutation.mutate({
        code: data.code,
        profileData: pendingChanges
      });
    }
  };

  if (isLoading) {
    return (
      <div className={`container mx-auto py-8 ${direction === 'rtl' ? 'rtl' : 'ltr'}`}>
        <div className="flex items-center justify-center">
          <div className="text-lg">{t.loading}</div>
        </div>
      </div>
    );
  }

  // Check for authentication errors or missing data (skip for create mode)
  if (!isCreateMode && (customerError || (!isLoading && (!customer || !customer.success)))) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${direction === 'rtl' ? 'rtl' : 'ltr'}`}>
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">{t.error}</h2>
            <p className="text-gray-500 mb-6">{t.loginToAccessWallet}</p>
            <div className="space-y-3">
              <Button onClick={() => setLocation("/customer/login")} className="w-full">
                {t.login}
              </Button>
              <Button onClick={() => setLocation("/shop")} variant="outline" className="w-full">
                {t.continueShopping}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 py-8 ${direction === 'rtl' ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(isCreateMode || customerId ? "/admin/crm" : "/customer/profile")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className={`h-4 w-4 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
            {isCreateMode || customerId ? et.backToCrm : t.cancel}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isCreateMode ? et.newCustomer : (customerId ? et.editCustomer : t.editProfile)}
            </h1>
            <p className="text-gray-600">
              {isCreateMode ? et.createDescription : (customerId ? et.editDescription : t.manageAccount)}
            </p>
          </div>
        </div>

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t.accountInformation}
            </CardTitle>
            <CardDescription>
              {t.manageAccount}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="required-field">{et.firstName} <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={et.firstName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="required-field">{et.lastName} <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={et.lastName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contact Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 required-field">
                          <Phone className="h-4 w-4" />
                          {et.phone} <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={!isCreateMode} className={isCreateMode ? "" : "bg-gray-50"} placeholder={isCreateMode ? et.phone : ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 required-field">
                          <Mail className="h-4 w-4" />
                          {et.email} <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder={et.emailPlaceholder} readOnly={!isCreateMode} className={isCreateMode ? "" : "bg-gray-50"} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Company Field */}
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {et.company}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={et.companyOptional} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Address Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">{et.addressInfo}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="required-field">{et.country} <span className="text-red-500">*</span></FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue("province", "");
                              form.setValue("city", "");
                              setLocationCountryCode(value === "ایران" ? "IR" : value === "عراق" ? "IQ" : "");
                              setSelectedRegionId("");
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={et.country} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="عراق">عراق / Iraq</SelectItem>
                              <SelectItem value="ایران">ایران / Iran</SelectItem>
                              <SelectItem value="ترکیه">ترکیه / Turkey</SelectItem>
                            </SelectContent>
                          </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="required-field">{et.province} <span className="text-red-500">*</span></FormLabel>
                        {isIran || isIraq ? (
                          <Select
                            onValueChange={(value) => {
                              form.setValue("city", "");
                              const selectedProvince = provinces.find((province: any) => String(province.id) === value);
                              if (selectedProvince) {
                                setSelectedRegionId(String(selectedProvince.id));
                                field.onChange(selectedProvince.namePersian || selectedProvince.nameArabic || selectedProvince.nameEnglish);
                              }
                            }}
                            value={selectedRegionId}
                          >
                            <FormControl>
                              <SelectTrigger>
                                 <SelectValue placeholder={et.selectProvince} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {provinces.map((province: any) => (
                                <SelectItem key={province.id} value={String(province.id)}>
                                  {province.namePersian} / {province.nameEnglish}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <FormControl>
                            <Input {...field} placeholder={et.province} />
                          </FormControl>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="required-field">{et.city} <span className="text-red-500">*</span></FormLabel>
                        {isIran || isIraq ? (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                 <SelectValue placeholder={et.selectCity} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {cities.map((city: any) => (
                                <SelectItem key={city.id} value={city.namePersian}>
                                  {city.namePersian} / {city.nameEnglish}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <FormControl>
                            <Input {...field} placeholder={et.city} />
                          </FormControl>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                  <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 required-field">
                            <MapPin className="h-4 w-4" />
                            {et.fullAddress} <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={et.fullAddress} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.postalCode} ({et.fullAddress})</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={et.postalCode} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
                    <FormField
                      control={form.control}
                      name="secondaryAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.secondaryAddress}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={et.secondaryPlaceholder} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="secondaryPostalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.postalCode} ({et.secondaryAddress})</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={et.postalCode} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Additional Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">{et.additionalContact}</h3>
                  
                  <FormField
                    control={form.control}
                    name="alternatePhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{et.alternatePhone}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={et.alternatePlaceholder} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Business Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">{et.businessInfo}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.industry}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={et.selectIndustry} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="chemical">{et.options.chemical}</SelectItem>
                              <SelectItem value="petrochemical">{et.options.petrochemical}</SelectItem>
                              <SelectItem value="pharmaceutical">{et.options.pharmaceutical}</SelectItem>
                              <SelectItem value="agriculture">{et.options.agriculture}</SelectItem>
                              <SelectItem value="construction">{et.options.construction}</SelectItem>
                              <SelectItem value="automotive">{et.options.automotive}</SelectItem>
                              <SelectItem value="textile">{et.options.textile}</SelectItem>
                              <SelectItem value="food">{et.options.food}</SelectItem>
                              <SelectItem value="water_treatment">{et.options.waterTreatment}</SelectItem>
                              <SelectItem value="paint">{et.options.paint}</SelectItem>
                              <SelectItem value="other">{et.options.other}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="businessType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.businessType}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={et.selectBusinessType} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="manufacturer">{et.options.manufacturer}</SelectItem>
                              <SelectItem value="distributor">{et.options.distributor}</SelectItem>
                              <SelectItem value="retailer">{et.options.retailer}</SelectItem>
                              <SelectItem value="service_provider">{et.options.serviceProvider}</SelectItem>
                              <SelectItem value="research">{et.options.research}</SelectItem>
                              <SelectItem value="consultant">{et.options.consultant}</SelectItem>
                              <SelectItem value="end_user">{et.options.endUser}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="companySize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.companySize}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={et.selectCompanySize} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1-10">{et.options.under10}</SelectItem>
                              <SelectItem value="11-50">{et.options.under50}</SelectItem>
                              <SelectItem value="51-200">{et.options.under200}</SelectItem>
                              <SelectItem value="201-500">{et.options.under500}</SelectItem>
                              <SelectItem value="500+">{et.options.over500}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.website}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://www.example.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.taxId}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={et.taxIdPlaceholder} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="registrationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.registrationNumber}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={et.registrationPlaceholder} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Customer Management */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">{et.customerSettings}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.customerType}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={et.selectCustomerType} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="regular">{et.options.regular}</SelectItem>
                              <SelectItem value="vip">VIP</SelectItem>
                              <SelectItem value="wholesale">{et.options.wholesale}</SelectItem>
                              <SelectItem value="retail">{et.options.retail}</SelectItem>
                              <SelectItem value="industrial">{et.options.industrial}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="preferredPaymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.paymentMethod}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={et.selectPaymentMethod} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">{et.options.cash}</SelectItem>
                              <SelectItem value="bank_transfer">{et.options.bankTransfer}</SelectItem>
                              <SelectItem value="check">{et.options.check}</SelectItem>
                              <SelectItem value="credit">{et.options.credit}</SelectItem>
                              <SelectItem value="installment">{et.options.installment}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="creditLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.creditLimit}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={et.creditLimitPlaceholder} type="number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="leadSource"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.leadSource}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={et.selectLeadSource} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="website">{et.options.website}</SelectItem>
                              <SelectItem value="referral">{et.options.referral}</SelectItem>
                              <SelectItem value="social_media">{et.options.socialMedia}</SelectItem>
                              <SelectItem value="advertising">{et.options.advertising}</SelectItem>
                              <SelectItem value="exhibition">{et.options.exhibition}</SelectItem>
                              <SelectItem value="cold_call">{et.options.coldCall}</SelectItem>
                              <SelectItem value="other">{et.options.other}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Preferences */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">{et.preferences}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="preferredLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.preferredLanguage}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={et.selectLanguage} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="persian">{et.options.persian}</SelectItem>
                              <SelectItem value="arabic">{et.options.arabic}</SelectItem>
                              <SelectItem value="english">{et.options.english}</SelectItem>
                              <SelectItem value="kurdish">{et.options.kurdish}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="communicationPreference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.communicationPreference}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={et.selectCommunication} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="phone">{et.options.phone}</SelectItem>
                              <SelectItem value="email">{et.options.email}</SelectItem>
                              <SelectItem value="sms">{et.options.sms}</SelectItem>
                              <SelectItem value="whatsapp">{et.options.whatsapp}</SelectItem>
                              <SelectItem value="telegram">{et.options.telegram}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="marketingConsent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="mt-2"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            {et.marketingConsent}
                          </FormLabel>
                          <FormDescription>
                            {et.marketingDescription}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Additional CRM Fields */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">{et.crmInfo}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="annualRevenue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.annualRevenue}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={et.selectAnnualRevenue} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="under_100m">{et.options.under100m}</SelectItem>
                              <SelectItem value="100m_500m">{et.options.range100m500m}</SelectItem>
                              <SelectItem value="500m_1b">{et.options.range500m1b}</SelectItem>
                              <SelectItem value="1b_5b">{et.options.range1b5b}</SelectItem>
                              <SelectItem value="over_5b">{et.options.over5b}</SelectItem>
                              <SelectItem value="confidential">{et.options.confidential}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="priceRange"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.priceRange}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={et.selectPriceRange} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="budget">{et.options.budget}</SelectItem>
                              <SelectItem value="mid_range">{et.options.midRange}</SelectItem>
                              <SelectItem value="premium">{et.options.premium}</SelectItem>
                              <SelectItem value="enterprise">{et.options.enterprise}</SelectItem>
                              <SelectItem value="custom">{et.options.custom}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="orderFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.orderFrequency}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={et.selectOrderFrequency} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="weekly">{et.options.weekly}</SelectItem>
                              <SelectItem value="monthly">{et.options.monthly}</SelectItem>
                              <SelectItem value="quarterly">{et.options.quarterly}</SelectItem>
                              <SelectItem value="yearly">{et.options.yearly}</SelectItem>
                              <SelectItem value="as_needed">{et.options.asNeeded}</SelectItem>
                              <SelectItem value="seasonal">{et.options.seasonal}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="creditStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{et.creditStatus}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={et.selectCreditStatus} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="excellent">{et.options.excellent}</SelectItem>
                              <SelectItem value="good">{et.options.good}</SelectItem>
                              <SelectItem value="fair">{et.options.fair}</SelectItem>
                              <SelectItem value="poor">{et.options.poor}</SelectItem>
                              <SelectItem value="no_credit">{et.options.noCredit}</SelectItem>
                              <SelectItem value="pending">{et.options.pending}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="smsEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="mt-2"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              {et.smsEnabled}
                            </FormLabel>
                            <FormDescription>
                              {et.smsDescription}
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emailEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="mt-2"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              {et.emailEnabled}
                            </FormLabel>
                            <FormDescription>
                              {et.emailDescription}
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{et.additionalNotes}</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder={et.notesPlaceholder} rows={4} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Save Button */}
                <div className="flex gap-4 pt-6">
                  <Button 
                    type="submit" 
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                    disabled={isCreateMode ? createCustomerMutation.isPending : updateProfileMutation.isPending}
                  >
                    <Save className="h-4 w-4" />
                    {isCreateMode 
                      ? (createCustomerMutation.isPending ? et.creating : et.create)
                      : (updateProfileMutation.isPending ? et.saving : et.saveChanges)
                    }
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setLocation(isCreateMode || customerId ? "/admin/crm" : "/customer/profile")}
                  >
                    {et.cancel}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* SMS Verification Dialog */}
      <Dialog open={showSmsDialog} onOpenChange={setShowSmsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{et.verifyPhone}</DialogTitle>
            <DialogDescription>
              {et.codeSent}
            </DialogDescription>
          </DialogHeader>
          <Form {...smsForm}>
            <form onSubmit={smsForm.handleSubmit(onSmsVerify)} className="space-y-4">
              <FormField
                control={smsForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{et.verificationCode}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={et.codePlaceholder} maxLength={6} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={verifySmsAndUpdateMutation.isPending}>
                  {verifySmsAndUpdateMutation.isPending ? et.verifying : et.verifySave}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowSmsDialog(false)}>
                  {et.cancel}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
