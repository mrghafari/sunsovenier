import type { Language } from "@/lib/i18n";

export const CRM_LOCALES: Record<Language, string> = {
  en: "en-US",
  fa: "fa-IR",
  ar: "ar-IQ",
  tr: "tr-TR",
};

type CrmCopy = {
  [key: string]: string;
};

const copy: Record<Language, CrmCopy> = {
  en: {
    loading: "Loading…", error: "Error", success: "Success", cancel: "Cancel", save: "Save",
    edit: "Edit", delete: "Delete", customer: "Customer", customers: "Customers", dashboard: "Dashboard",
    activities: "Activities", settings: "Settings", search: "Search by name, email, company, or phone…",
    totalCustomers: "Total Customers", activeCustomers: "Active Customers", newThisMonth: "New This Month",
    topCustomers: "Top Customers", highestPurchase: "Customers with highest purchase amounts", name: "Name",
    email: "Email", company: "Company", type: "Type", status: "Status", totalSpent: "Total Spent",
    orders: "Orders", totalPurchases: "Total Purchases", registrationDate: "Registration Date", actions: "Actions",
    customerList: "Customer List", manageCustomers: "Manage store customer information", recentActivities: "Recent Activities",
    latestActivities: "Latest CRM system activities", by: "By", on: "on", exportAnalytics: "Export Analytics",
    newCustomer: "New Customer", crmTitle: "CRM Dashboard", crmSubtitle: "Customer Relationship Management System",
    loadingStats: "Loading statistics…", enterCustomer: "Enter new customer information", firstName: "First Name",
    lastName: "Last Name", mobilePhone: "Mobile Phone", verificationSettings: "Customer Verification Settings",
    verificationDescription: "Configure which verification methods are enabled for customer registration",
    noOrders: "No orders found for this customer.", noActivities: "No activities recorded for this customer.",
    unknown: "Unknown", carrier: "Carrier", orderHistory: "Order History", completeOrderHistory: "Complete order history for this customer",
    activityTimeline: "Timeline of all customer interactions and activities", loadingSettings: "Loading settings…",
    saving: "Saving changes…", emailVerification: "Email Verification", smsVerification: "SMS Verification",
    whatsappVerification: "WhatsApp Verification", allowSkip: "Allow Skip Verification", enableForAll: "Enable {channel} for everyone",
    disableForAll: "Disable {channel} for everyone", processing: "Processing…",
  },
  fa: {
    loading: "در حال بارگذاری…", error: "خطا", success: "موفقیت", cancel: "انصراف", save: "ذخیره",
    edit: "ویرایش", delete: "حذف", customer: "مشتری", customers: "مشتریان", dashboard: "داشبورد",
    activities: "فعالیت‌ها", settings: "تنظیمات", search: "جستجو بر اساس نام، ایمیل، شرکت یا تلفن…",
    totalCustomers: "کل مشتریان", activeCustomers: "مشتریان فعال", newThisMonth: "جدید در این ماه",
    topCustomers: "مشتریان برتر", highestPurchase: "مشتریان با بیشترین مبلغ خرید", name: "نام", email: "ایمیل",
    company: "شرکت", type: "نوع", status: "وضعیت", totalSpent: "مجموع هزینه", orders: "سفارش‌ها",
    totalPurchases: "مجموع خریدها", registrationDate: "تاریخ ثبت‌نام", actions: "عملیات", customerList: "فهرست مشتریان",
    manageCustomers: "مدیریت اطلاعات مشتریان فروشگاه", recentActivities: "فعالیت‌های اخیر", latestActivities: "آخرین فعالیت‌های سامانه CRM",
    by: "توسط", on: "در", exportAnalytics: "خروجی گزارش‌ها", newCustomer: "مشتری جدید", crmTitle: "داشبورد CRM",
    crmSubtitle: "سامانه مدیریت ارتباط با مشتری", loadingStats: "در حال بارگذاری آمار…", enterCustomer: "اطلاعات مشتری جدید را وارد کنید",
    firstName: "نام", lastName: "نام خانوادگی", mobilePhone: "شماره همراه", verificationSettings: "تنظیمات تأیید مشتری",
    verificationDescription: "روش‌های تأیید فعال هنگام ثبت‌نام مشتری را تنظیم کنید", noOrders: "سفارشی برای این مشتری یافت نشد.",
    noActivities: "فعالیتی برای این مشتری ثبت نشده است.", unknown: "نامشخص", carrier: "حمل‌کننده", orderHistory: "تاریخچه سفارش‌ها",
    completeOrderHistory: "تاریخچه کامل سفارش‌های این مشتری", activityTimeline: "خط زمانی همه تعاملات و فعالیت‌های مشتری",
    loadingSettings: "در حال بارگذاری تنظیمات…", saving: "در حال ذخیره تغییرات…", emailVerification: "تأیید ایمیل",
    smsVerification: "تأیید پیامک", whatsappVerification: "تأیید واتساپ", allowSkip: "اجازه رد کردن تأیید",
    enableForAll: "فعال‌سازی {channel} برای همه", disableForAll: "غیرفعال‌سازی {channel} برای همه", processing: "در حال پردازش…",
  },
  ar: {
    loading: "جار التحميل…", error: "خطأ", success: "نجاح", cancel: "إلغاء", save: "حفظ", edit: "تعديل",
    delete: "حذف", customer: "العميل", customers: "العملاء", dashboard: "لوحة التحكم", activities: "الأنشطة",
    settings: "الإعدادات", search: "البحث بالاسم أو البريد أو الشركة أو الهاتف…", totalCustomers: "إجمالي العملاء",
    activeCustomers: "العملاء النشطون", newThisMonth: "الجدد هذا الشهر", topCustomers: "أفضل العملاء",
    highestPurchase: "العملاء أصحاب أعلى مبالغ شراء", name: "الاسم", email: "البريد الإلكتروني", company: "الشركة",
    type: "النوع", status: "الحالة", totalSpent: "إجمالي الإنفاق", orders: "الطلبات", totalPurchases: "إجمالي المشتريات",
    registrationDate: "تاريخ التسجيل", actions: "الإجراءات", customerList: "قائمة العملاء", manageCustomers: "إدارة معلومات عملاء المتجر",
    recentActivities: "الأنشطة الأخيرة", latestActivities: "أحدث أنشطة نظام CRM", by: "بواسطة", on: "في",
    exportAnalytics: "تصدير التحليلات", newCustomer: "عميل جديد", crmTitle: "لوحة CRM", crmSubtitle: "نظام إدارة علاقات العملاء",
    loadingStats: "جار تحميل الإحصاءات…", enterCustomer: "أدخل معلومات العميل الجديد", firstName: "الاسم الأول", lastName: "اسم العائلة",
    mobilePhone: "الهاتف المحمول", verificationSettings: "إعدادات التحقق من العميل", verificationDescription: "تكوين طرق التحقق المفعلة لتسجيل العملاء",
    noOrders: "لم يتم العثور على طلبات لهذا العميل.", noActivities: "لا توجد أنشطة مسجلة لهذا العميل.", unknown: "غير معروف",
    carrier: "الناقل", orderHistory: "سجل الطلبات", completeOrderHistory: "سجل الطلبات الكامل لهذا العميل",
    activityTimeline: "الخط الزمني لجميع تفاعلات وأنشطة العميل", loadingSettings: "جار تحميل الإعدادات…", saving: "جار حفظ التغييرات…",
    emailVerification: "التحقق من البريد", smsVerification: "التحقق عبر الرسائل", whatsappVerification: "التحقق عبر واتساب",
    allowSkip: "السماح بتخطي التحقق", enableForAll: "تفعيل {channel} للجميع", disableForAll: "تعطيل {channel} للجميع", processing: "جار المعالجة…",
  },
  tr: {
    loading: "Yükleniyor…", error: "Hata", success: "Başarılı", cancel: "İptal", save: "Kaydet", edit: "Düzenle",
    delete: "Sil", customer: "Müşteri", customers: "Müşteriler", dashboard: "Kontrol paneli", activities: "Etkinlikler",
    settings: "Ayarlar", search: "Ad, e-posta, şirket veya telefonla ara…", totalCustomers: "Toplam Müşteri",
    activeCustomers: "Aktif Müşteriler", newThisMonth: "Bu Ay Yeni", topCustomers: "En İyi Müşteriler",
    highestPurchase: "En yüksek alışveriş tutarına sahip müşteriler", name: "Ad", email: "E-posta", company: "Şirket",
    type: "Tür", status: "Durum", totalSpent: "Toplam Harcama", orders: "Siparişler", totalPurchases: "Toplam Alışveriş",
    registrationDate: "Kayıt Tarihi", actions: "İşlemler", customerList: "Müşteri Listesi", manageCustomers: "Mağaza müşteri bilgilerini yönetin",
    recentActivities: "Son Etkinlikler", latestActivities: "Son CRM sistemi etkinlikleri", by: "Yapan", on: "tarihinde",
    exportAnalytics: "Analizleri Dışa Aktar", newCustomer: "Yeni Müşteri", crmTitle: "CRM Paneli", crmSubtitle: "Müşteri İlişkileri Yönetim Sistemi",
    loadingStats: "İstatistikler yükleniyor…", enterCustomer: "Yeni müşteri bilgilerini girin", firstName: "Ad", lastName: "Soyad",
    mobilePhone: "Cep Telefonu", verificationSettings: "Müşteri Doğrulama Ayarları", verificationDescription: "Müşteri kaydı için etkin doğrulama yöntemlerini yapılandırın",
    noOrders: "Bu müşteri için sipariş bulunamadı.", noActivities: "Bu müşteri için kayıtlı etkinlik yok.", unknown: "Bilinmiyor",
    carrier: "Taşıyıcı", orderHistory: "Sipariş Geçmişi", completeOrderHistory: "Bu müşterinin tüm sipariş geçmişi",
    activityTimeline: "Tüm müşteri etkileşimleri ve etkinliklerinin zaman çizelgesi", loadingSettings: "Ayarlar yükleniyor…", saving: "Değişiklikler kaydediliyor…",
    emailVerification: "E-posta Doğrulama", smsVerification: "SMS Doğrulama", whatsappVerification: "WhatsApp Doğrulama",
    allowSkip: "Doğrulamayı Atlamaya İzin Ver", enableForAll: "{channel} herkese açılsın", disableForAll: "{channel} herkese kapatılsın", processing: "İşleniyor…",
  },
};

const supplemental: Record<Language, CrmCopy> = {
  en: {
    now: "just now", phone: "Phone", customerActivities: "Customer Activities", latestLoginActivities: "Latest customer sign-in and sign-out activity",
    customerLogin: "Customer login", customerLogout: "Customer logout", failedFetchPassword: "Failed to fetch password status", passwordChanged: "Password changed successfully",
    failedChangePassword: "Failed to change password", passwordGenerated: "Random password generated successfully", generatedPassword: "Generated Password",
    newPassword: "New password", failedGeneratePassword: "Failed to generate password", passwordEmpty: "Password cannot be empty", passwordMin: "Password must be at least 6 characters long",
    passwordManagement: "Password Management", managePassword: "Manage customer password and authentication settings", currentPassword: "Current Password", noPassword: "No password set",
    changePassword: "Change Password", changeCustomerPassword: "Change Customer Password", setPasswordFor: "Set a new password for", enterNewPassword: "Enter new password",
    sendNotification: "Send password notification", emailWillBeSent: "Email will be sent to", smsWillBeSent: "SMS will be sent to", changing: "Changing…",
    generateRandomPassword: "Generate Random Password", generateSecurePasswordFor: "Generate a secure random password for", note: "Note",
    passwordNote: "A secure 8-character password will be generated containing letters, numbers, and special characters.", generating: "Generating…", generatePassword: "Generate Password",
    customer: "Customer", passwordStatus: "Password Status", set: "Set", notSet: "Not Set", lastUpdated: "Last Updated", saveChanges: "Save Changes", editProfile: "Edit Profile",
    overview: "Overview", contactInfo: "Contact Info", businessInfo: "Business Info", customerOverview: "Customer Overview", totalOrders: "Total Orders", avgOrderValue: "Avg Order Value",
    customerDetails: "Customer Details", order: "Order", customerNotFound: "Customer not found", loadingCustomerProfile: "Loading customer profile…", unknownActivity: "Unknown activity",
    verificationUpdated: "Verification settings updated successfully", failedUpdateSettings: "Failed to update settings", emailVerificationDesc: "Send a verification code by email during registration",
    smsVerificationDesc: "Send a verification code by SMS during registration", whatsappVerificationDesc: "Send a verification code by WhatsApp during registration", allowSkipDesc: "Allow customers to skip verification when no channels are enabled (not recommended)",
  },
  fa: {
    now: "همین حالا", phone: "تلفن", customerActivities: "فعالیت‌های مشتریان", latestLoginActivities: "آخرین فعالیت‌های ورود و خروج مشتریان", customerLogin: "ورود مشتری", customerLogout: "خروج مشتری",
    failedFetchPassword: "دریافت وضعیت رمز عبور ناموفق بود", passwordChanged: "رمز عبور با موفقیت تغییر کرد", failedChangePassword: "تغییر رمز عبور ناموفق بود", passwordGenerated: "رمز عبور تصادفی ایجاد شد", generatedPassword: "رمز عبور ایجادشده", newPassword: "رمز عبور جدید", failedGeneratePassword: "ایجاد رمز عبور ناموفق بود", passwordEmpty: "رمز عبور نمی‌تواند خالی باشد", passwordMin: "رمز عبور باید حداقل ۶ کاراکتر باشد", passwordManagement: "مدیریت رمز عبور", managePassword: "مدیریت رمز عبور و تنظیمات احراز هویت مشتری", currentPassword: "رمز عبور فعلی", noPassword: "رمز عبوری تنظیم نشده", changePassword: "تغییر رمز عبور", changeCustomerPassword: "تغییر رمز عبور مشتری", setPasswordFor: "رمز عبور جدید برای", enterNewPassword: "رمز عبور جدید را وارد کنید", sendNotification: "ارسال اطلاع‌رسانی رمز عبور", emailWillBeSent: "ایمیل ارسال می‌شود به", smsWillBeSent: "پیامک ارسال می‌شود به", changing: "در حال تغییر…", generateRandomPassword: "ایجاد رمز عبور تصادفی", generateSecurePasswordFor: "ایجاد رمز عبور تصادفی امن برای", note: "نکته", passwordNote: "رمز عبور امن ۸ کاراکتری شامل حروف، اعداد و نویسه‌های ویژه ایجاد می‌شود.", generating: "در حال ایجاد…", generatePassword: "ایجاد رمز عبور", passwordStatus: "وضعیت رمز عبور", set: "تنظیم شده", notSet: "تنظیم نشده", lastUpdated: "آخرین به‌روزرسانی", saveChanges: "ذخیره تغییرات", editProfile: "ویرایش پروفایل", overview: "نمای کلی", contactInfo: "اطلاعات تماس", businessInfo: "اطلاعات تجاری", customerOverview: "نمای کلی مشتری", totalOrders: "کل سفارش‌ها", avgOrderValue: "میانگین ارزش سفارش", customerDetails: "جزئیات مشتری", order: "سفارش", customerNotFound: "مشتری یافت نشد", loadingCustomerProfile: "در حال بارگذاری پروفایل مشتری…", unknownActivity: "فعالیت نامشخص", verificationUpdated: "تنظیمات تأیید با موفقیت به‌روزرسانی شد", failedUpdateSettings: "به‌روزرسانی تنظیمات ناموفق بود", emailVerificationDesc: "ارسال کد تأیید از طریق ایمیل هنگام ثبت‌نام", smsVerificationDesc: "ارسال کد تأیید از طریق پیامک هنگام ثبت‌نام", whatsappVerificationDesc: "ارسال کد تأیید از طریق واتساپ هنگام ثبت‌نام", allowSkipDesc: "اجازه رد کردن تأیید در صورت نبود کانال فعال (توصیه نمی‌شود)",
  },
  ar: {
    now: "الآن", phone: "الهاتف", customerActivities: "أنشطة العملاء", latestLoginActivities: "أحدث أنشطة دخول وخروج العملاء", customerLogin: "دخول العميل", customerLogout: "خروج العميل",
    failedFetchPassword: "فشل جلب حالة كلمة المرور", passwordChanged: "تم تغيير كلمة المرور بنجاح", failedChangePassword: "فشل تغيير كلمة المرور", passwordGenerated: "تم إنشاء كلمة مرور عشوائية", generatedPassword: "كلمة المرور المُنشأة", newPassword: "كلمة المرور الجديدة", failedGeneratePassword: "فشل إنشاء كلمة المرور", passwordEmpty: "لا يمكن أن تكون كلمة المرور فارغة", passwordMin: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل", passwordManagement: "إدارة كلمة المرور", managePassword: "إدارة كلمة مرور العميل وإعدادات المصادقة", currentPassword: "كلمة المرور الحالية", noPassword: "لم يتم تعيين كلمة مرور", changePassword: "تغيير كلمة المرور", changeCustomerPassword: "تغيير كلمة مرور العميل", setPasswordFor: "تعيين كلمة مرور جديدة لـ", enterNewPassword: "أدخل كلمة المرور الجديدة", sendNotification: "إرسال إشعار كلمة المرور", emailWillBeSent: "سيتم إرسال البريد إلى", smsWillBeSent: "سيتم إرسال الرسالة إلى", changing: "جار التغيير…", generateRandomPassword: "إنشاء كلمة مرور عشوائية", generateSecurePasswordFor: "إنشاء كلمة مرور عشوائية آمنة لـ", note: "ملاحظة", passwordNote: "سيتم إنشاء كلمة مرور آمنة من 8 أحرف تتضمن حروفاً وأرقاماً ورموزاً خاصة.", generating: "جار الإنشاء…", generatePassword: "إنشاء كلمة المرور", passwordStatus: "حالة كلمة المرور", set: "مُعيّنة", notSet: "غير مُعيّنة", lastUpdated: "آخر تحديث", saveChanges: "حفظ التغييرات", editProfile: "تعديل الملف", overview: "نظرة عامة", contactInfo: "معلومات الاتصال", businessInfo: "معلومات العمل", customerOverview: "نظرة عامة على العميل", totalOrders: "إجمالي الطلبات", avgOrderValue: "متوسط قيمة الطلب", customerDetails: "تفاصيل العميل", order: "الطلب", customerNotFound: "لم يتم العثور على العميل", loadingCustomerProfile: "جار تحميل ملف العميل…", unknownActivity: "نشاط غير معروف", verificationUpdated: "تم تحديث إعدادات التحقق بنجاح", failedUpdateSettings: "فشل تحديث الإعدادات", emailVerificationDesc: "إرسال رمز التحقق عبر البريد أثناء التسجيل", smsVerificationDesc: "إرسال رمز التحقق عبر الرسائل أثناء التسجيل", whatsappVerificationDesc: "إرسال رمز التحقق عبر واتساب أثناء التسجيل", allowSkipDesc: "السماح بتخطي التحقق عند عدم تفعيل القنوات (غير موصى به)",
  },
  tr: {
    now: "şimdi", phone: "Telefon", customerActivities: "Müşteri Etkinlikleri", latestLoginActivities: "Son müşteri giriş ve çıkış etkinlikleri", customerLogin: "Müşteri girişi", customerLogout: "Müşteri çıkışı",
    failedFetchPassword: "Parola durumu alınamadı", passwordChanged: "Parola başarıyla değiştirildi", failedChangePassword: "Parola değiştirilemedi", passwordGenerated: "Rastgele parola oluşturuldu", generatedPassword: "Oluşturulan Parola", newPassword: "Yeni parola", failedGeneratePassword: "Parola oluşturulamadı", passwordEmpty: "Parola boş olamaz", passwordMin: "Parola en az 6 karakter olmalıdır", passwordManagement: "Parola Yönetimi", managePassword: "Müşteri parolası ve kimlik doğrulama ayarlarını yönetin", currentPassword: "Mevcut Parola", noPassword: "Parola ayarlanmadı", changePassword: "Parolayı Değiştir", changeCustomerPassword: "Müşteri Parolasını Değiştir", setPasswordFor: "Şunun için yeni parola belirleyin:", enterNewPassword: "Yeni parolayı girin", sendNotification: "Parola bildirimi gönder", emailWillBeSent: "E-posta gönderilecek:", smsWillBeSent: "SMS gönderilecek:", changing: "Değiştiriliyor…", generateRandomPassword: "Rastgele Parola Oluştur", generateSecurePasswordFor: "Şunun için güvenli rastgele parola oluştur:", note: "Not", passwordNote: "Harf, rakam ve özel karakterlerden oluşan güvenli 8 karakterli parola oluşturulur.", generating: "Oluşturuluyor…", generatePassword: "Parola Oluştur", passwordStatus: "Parola Durumu", set: "Ayarlı", notSet: "Ayarlı değil", lastUpdated: "Son Güncelleme", saveChanges: "Değişiklikleri kaydet", editProfile: "Profili Düzenle", overview: "Genel Bakış", contactInfo: "İletişim Bilgileri", businessInfo: "İşletme Bilgileri", customerOverview: "Müşteri Özeti", totalOrders: "Toplam Sipariş", avgOrderValue: "Ortalama Sipariş Değeri", customerDetails: "Müşteri Ayrıntıları", order: "Sipariş", customerNotFound: "Müşteri bulunamadı", loadingCustomerProfile: "Müşteri profili yükleniyor…", unknownActivity: "Bilinmeyen etkinlik", verificationUpdated: "Doğrulama ayarları başarıyla güncellendi", failedUpdateSettings: "Ayarlar güncellenemedi", emailVerificationDesc: "Kayıt sırasında e-posta ile doğrulama kodu gönder", smsVerificationDesc: "Kayıt sırasında SMS ile doğrulama kodu gönder", whatsappVerificationDesc: "Kayıt sırasında WhatsApp ile doğrulama kodu gönder", allowSkipDesc: "Kanal etkin değilse doğrulamayı atlamaya izin ver (önerilmez)",
  },
};

Object.keys(copy).forEach((language) => Object.assign(copy[language as Language], supplemental[language as Language]));

export function crmText(language: Language, key: string, vars?: Record<string, string>) {
  const extra: Record<Language, CrmCopy> = {
    en: { profileUpdated: "Customer profile updated successfully", profileUpdateFailed: "Failed to update customer profile", notAvailable: "N/A", notSpecified: "Not specified" },
    fa: { profileUpdated: "پروفایل مشتری با موفقیت به‌روزرسانی شد", profileUpdateFailed: "به‌روزرسانی پروفایل مشتری ناموفق بود", notAvailable: "موجود نیست", notSpecified: "مشخص نشده" },
    ar: { profileUpdated: "تم تحديث ملف العميل بنجاح", profileUpdateFailed: "فشل تحديث ملف العميل", notAvailable: "غير متوفر", notSpecified: "غير محدد" },
    tr: { profileUpdated: "Müşteri profili başarıyla güncellendi", profileUpdateFailed: "Müşteri profili güncellenemedi", notAvailable: "Mevcut değil", notSpecified: "Belirtilmedi" },
  };
  let value = copy[language][key] || extra[language][key] || copy.en[key] || key;
  Object.entries(vars || {}).forEach(([name, replacement]) => { value = value.replace(`{${name}}`, replacement); });
  return value;
}

export function crmLocale(language: Language) { return CRM_LOCALES[language]; }
export function crmDate(value: string | Date, language: Language) {
  return new Intl.DateTimeFormat(crmLocale(language), { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
export function crmNumber(value: number | string, language: Language) {
  return new Intl.NumberFormat(crmLocale(language)).format(Number(value) || 0);
}
export function crmCurrency(value: number | string, language: Language, currency = "IQD") {
  return new Intl.NumberFormat(crmLocale(language), { style: "currency", currency, minimumFractionDigits: 2 }).format(Number(value) || 0);
}
export function crmEnum(value: string | undefined | null, language: Language) {
  if (!value) return crmText(language, "unknown");
  const labels: Record<string, Record<Language, string>> = {
    retail: { en: "Retail", fa: "خرده‌فروشی", ar: "تجزئة", tr: "Perakende" },
    wholesale: { en: "Wholesale", fa: "عمده‌فروشی", ar: "جملة", tr: "Toptan" },
    b2b: { en: "B2B", fa: "B2B", ar: "B2B", tr: "B2B" },
    distributor: { en: "Distributor", fa: "توزیع‌کننده", ar: "موزع", tr: "Distribütör" },
    end_user: { en: "End User", fa: "مصرف‌کننده نهایی", ar: "مستخدم نهائي", tr: "Son Kullanıcı" },
    active: { en: "Active", fa: "فعال", ar: "نشط", tr: "Aktif" },
    inactive: { en: "Inactive", fa: "غیرفعال", ar: "غير نشط", tr: "Pasif" },
    vip: { en: "VIP", fa: "ویژه", ar: "مميز", tr: "VIP" },
    blacklisted: { en: "Blacklisted", fa: "مسدود", ar: "مدرج في القائمة السوداء", tr: "Kara listede" },
    website: { en: "Website", fa: "وب‌سایت", ar: "الموقع الإلكتروني", tr: "Web sitesi" },
    referral: { en: "Referral", fa: "معرفی", ar: "إحالة", tr: "Referans" },
    marketing: { en: "Marketing", fa: "بازاریابی", ar: "تسويق", tr: "Pazarlama" },
    cold_call: { en: "Cold Call", fa: "تماس سرد", ar: "اتصال بارد", tr: "Soğuk arama" },
    trade_show: { en: "Trade Show", fa: "نمایشگاه", ar: "معرض تجاري", tr: "Ticaret fuarı" },
    email: { en: "Email", fa: "ایمیل", ar: "البريد الإلكتروني", tr: "E-posta" },
    phone: { en: "Phone", fa: "تلفن", ar: "الهاتف", tr: "Telefon" },
    sms: { en: "SMS", fa: "پیامک", ar: "رسائل نصية", tr: "SMS" },
    whatsapp: { en: "WhatsApp", fa: "واتساپ", ar: "واتساب", tr: "WhatsApp" },
    persian: { en: "Persian", fa: "فارسی", ar: "الفارسية", tr: "Farsça" },
    arabic: { en: "Arabic", fa: "عربی", ar: "العربية", tr: "Arapça" },
    english: { en: "English", fa: "انگلیسی", ar: "الإنجليزية", tr: "İngilizce" },
    manufacturer: { en: "Manufacturer", fa: "تولیدکننده", ar: "مصنع", tr: "Üretici" },
    retailer: { en: "Retailer", fa: "خرده‌فروش", ar: "بائع تجزئة", tr: "Perakendeci" },
    immediate: { en: "Immediate", fa: "فوری", ar: "فوري", tr: "Peşin" },
    net_30: { en: "Net 30", fa: "خالص ۳۰", ar: "صافي 30", tr: "Net 30" },
    net_60: { en: "Net 60", fa: "خالص ۶۰", ar: "صافي 60", tr: "Net 60" },
    net_90: { en: "Net 90", fa: "خالص ۹۰", ar: "صافي 90", tr: "Net 90" },
    pending: { en: "Pending", fa: "در انتظار", ar: "قيد الانتظار", tr: "Beklemede" },
    confirmed: { en: "Confirmed", fa: "تأییدشده", ar: "مؤكد", tr: "Onaylandı" },
    shipped: { en: "Shipped", fa: "ارسال‌شده", ar: "تم الشحن", tr: "Kargolandı" },
    delivered: { en: "Delivered", fa: "تحویل‌شده", ar: "تم التسليم", tr: "Teslim edildi" },
    cancelled: { en: "Cancelled", fa: "لغوشده", ar: "ملغى", tr: "İptal edildi" },
    login: { en: "Login", fa: "ورود", ar: "تسجيل الدخول", tr: "Giriş" },
    logout: { en: "Logout", fa: "خروج", ar: "تسجيل الخروج", tr: "Çıkış" },
    payment_received: { en: "Payment Received", fa: "پرداخت دریافت شد", ar: "تم استلام الدفع", tr: "Ödeme alındı" },
    payment_pending: { en: "Payment Pending", fa: "پرداخت در انتظار", ar: "الدفع قيد الانتظار", tr: "Ödeme beklemede" },
    created: { en: "Customer Created", fa: "مشتری ایجاد شد", ar: "تم إنشاء العميل", tr: "Müşteri oluşturuldu" },
    registration: { en: "Customer Registered", fa: "مشتری ثبت‌نام کرد", ar: "تم تسجيل العميل", tr: "Müşteri kaydoldu" },
    profile_updated: { en: "Profile Updated", fa: "پروفایل به‌روزرسانی شد", ar: "تم تحديث الملف", tr: "Profil güncellendi" },
    authentication_request: { en: "Authentication Requested", fa: "درخواست احراز هویت", ar: "تم طلب المصادقة", tr: "Kimlik doğrulama istendi" },
    order_placed: { en: "Order Placed", fa: "سفارش ثبت شد", ar: "تم تقديم الطلب", tr: "Sipariş verildi" },
    password_change: { en: "Password Changed", fa: "رمز عبور تغییر کرد", ar: "تم تغيير كلمة المرور", tr: "Parola değiştirildi" },
    password_changed: { en: "Password Changed", fa: "رمز عبور تغییر کرد", ar: "تم تغيير كلمة المرور", tr: "Parola değiştirildi" },
    password_reset_requested: { en: "Password Reset Requested", fa: "درخواست بازنشانی رمز عبور", ar: "تم طلب إعادة تعيين كلمة المرور", tr: "Parola sıfırlama istendi" },
    sms_sent: { en: "SMS Sent", fa: "پیامک ارسال شد", ar: "تم إرسال الرسالة النصية", tr: "SMS gönderildi" },
    sms_verification_completed: { en: "SMS Verification Completed", fa: "تأیید پیامکی تکمیل شد", ar: "اكتمل التحقق عبر الرسائل", tr: "SMS doğrulaması tamamlandı" },
    admin: { en: "Admin", fa: "مدیر", ar: "المشرف", tr: "Yönetici" },
    system: { en: "System", fa: "سامانه", ar: "النظام", tr: "Sistem" },
    customer: { en: "Customer", fa: "مشتری", ar: "العميل", tr: "Müşteri" },
  };
  return labels[value.toLowerCase()]?.[language] || value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}