import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { MapLocationPicker } from '@/components/admin/map-location-picker';
import { useLanguage } from '@/contexts/LanguageContext';
import { defaultLandingPageSettings } from '@shared/landing-page-settings';
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Upload, 
  Download,
  Edit,
  Trash2,
  Plus,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  Archive,
  Send,
  Inbox,
  Building,
  FileCheck,
  Globe,
  Hash,
  Search,
  Image,
  Eye,
  X,
  Save,
  Loader2
} from 'lucide-react';

interface CompanyInfo {
  id?: number;
  companyNameEn?: string;
  companyNameAr?: string;
  companyNameTr?: string;
  companyNameKu?: string;
  tradeName?: string;
  registrationNumber?: string;
  taxNumber?: string;
  legalForm?: string;
  establishedDate?: string;
  capitalAmount?: number;
  capitalCurrency?: string;
  numberOfEmployees?: number;
  annualRevenue?: number;
  businessSector?: string;
  businessDescription?: string;
  mainAddress?: string;
  mailingAddress?: string;
  province?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  fax?: string;
  emailPrimary?: string;
  emailSecondary?: string;
  websiteUrl?: string;
  businessHoursWeekdays?: string;
  businessHoursSaturday?: string;
  weeklySchedule?: WeeklySchedule;
  contactSettings?: {
    landingPhone?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressLine3?: string;
    mapLink?: string;
    mapLatitude?: number;
    mapLongitude?: number;
    whatsappNumber?: string;
    phoneAvailability?: string;
    supportEmail?: string;
    careersEmail?: string;
    careerLine1?: string;
    careerLine2?: string;
    careerLine3?: string;
  };
  licenseNumber?: string;
  licenseType?: string;
  licenseAuthority?: string;
  licenseExpiryDate?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountHolder?: string;
  bankIban?: string;
  bankSwift?: string;
  contactPersonName?: string;
  contactPersonTitle?: string;
  contactPersonPhone?: string;
  contactPersonEmail?: string;
  parentCompany?: string;
  subsidiaries?: string;
  branches?: string;
  partnerships?: string;
  certifications?: string;
  awards?: string;
  socialLinkedin?: string;
  socialFacebook?: string;
  socialTwitter?: string;
  socialInstagram?: string;
  logoUrl?: string;
  companySealUrl?: string;
  letterheadUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CompanyImage {
  id?: number;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  tags?: string;
  isActive?: boolean;
  uploadedAt?: string;
  uploadedBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface Correspondence {
  id?: number;
  referenceNumber: string;
  subject: string;
  senderName?: string;
  recipientName?: string;
  senderOrganization?: string;
  recipientOrganization?: string;
  senderEmail?: string;
  recipientEmail?: string;
  dateReceived?: string;
  dateSent?: string;
  priority: 'high' | 'medium' | 'low';
  status: string;
  category: string;
  content: string;
  attachmentUrl?: string;
  notes: string;
  tags: string;
}

interface CompanyDocument {
  id?: number;
  documentName: string;
  documentType: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string | null;
  issuingAuthority: string;
  fileUrl: string;
  status: 'active' | 'expired' | 'renewed' | 'cancelled';
  description: string;
  tags: string;
}

type DayStatus = 'working' | 'weekend' | 'holiday';
type WeekDayKey = 'saturday' | 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
type WeeklySchedule = Record<WeekDayKey, { status: DayStatus; start: string; end: string }>;

type PageLanguage = 'en' | 'fa' | 'ar' | 'tr';
type PageTranslation = Record<PageLanguage, string>;
const p = (fa: string, en: string, ar: string, tr: string): PageTranslation => ({ fa, en, ar, tr });
const pageTranslations: Record<string, PageTranslation> = {
  'موفقیت': p('موفقیت', 'Success', 'نجاح', 'Başarılı'),
  'خطا': p('خطا', 'Error', 'خطأ', 'Hata'),
  'اطلاعات شرکت با موفقیت در دیتابیس ذخیره شد': p('اطلاعات شرکت با موفقیت در دیتابیس ذخیره شد', 'Company information was saved successfully', 'تم حفظ معلومات الشركة بنجاح', 'Şirket bilgileri başarıyla kaydedildi'),
  'خطا در ذخیره اطلاعات شرکت در دیتابیس': p('خطا در ذخیره اطلاعات شرکت در دیتابیس', 'Failed to save company information', 'تعذر حفظ معلومات الشركة', 'Şirket bilgileri kaydedilemedi'),
  'نشست مدیریت منقضی شده است. لطفاً دوباره وارد شوید.': p('نشست مدیریت منقضی شده است. لطفاً دوباره وارد شوید.', 'The admin session has expired. Please sign in again.', 'انتهت جلسة الإدارة. يرجى تسجيل الدخول مرة أخرى.', 'Yönetici oturumunun süresi doldu. Lütfen tekrar giriş yapın.'),
  'ثبت گواهینامه انجام نشد': p('ثبت گواهینامه انجام نشد', 'Certificate could not be added', 'تعذر إضافة الشهادة', 'Sertifika eklenemedi'),
  'گواهینامه با موفقیت ثبت شد': p('گواهینامه با موفقیت ثبت شد', 'Certificate added successfully', 'تمت إضافة الشهادة بنجاح', 'Sertifika başarıyla eklendi'),
  'گواهینامه با موفقیت به‌روزرسانی شد': p('گواهینامه با موفقیت به‌روزرسانی شد', 'Certificate updated successfully', 'تم تحديث الشهادة بنجاح', 'Sertifika başarıyla güncellendi'),
  'به‌روزرسانی گواهینامه انجام نشد': p('به‌روزرسانی گواهینامه انجام نشد', 'Certificate could not be updated', 'تعذر تحديث الشهادة', 'Sertifika güncellenemedi'),
  'بررسی نشست مدیریت انجام نشد. دوباره تلاش کنید.': p('بررسی نشست مدیریت انجام نشد. دوباره تلاش کنید.', 'Could not verify the admin session. Try again.', 'تعذر التحقق من جلسة الإدارة. حاول مرة أخرى.', 'Yönetici oturumu doğrulanamadı. Tekrar deneyin.'),
  'دریافت مسیر آپلود انجام نشد': p('دریافت مسیر آپلود انجام نشد', 'Upload path could not be obtained', 'تعذر الحصول على مسار الرفع', 'Yükleme yolu alınamadı'),
  'آپلود موفق': p('آپلود موفق', 'Upload successful', 'تم الرفع بنجاح', 'Yükleme başarılı'),
  'فایل گواهینامه آماده ثبت است': p('فایل گواهینامه آماده ثبت است', 'The certificate file is ready to submit', 'ملف الشهادة جاهز للإرسال', 'Sertifika dosyası gönderilmeye hazır'),
  'آپلود فایل انجام نشد': p('آپلود فایل انجام نشد', 'File upload failed', 'فشل رفع الملف', 'Dosya yüklenemedi'),
  'خطا در آپلود': p('خطا در آپلود', 'Upload error', 'خطأ في الرفع', 'Yükleme hatası'),
  'فایل تصویری انتخاب کنید': p('لطفاً فایل تصویری انتخاب کنید', 'Please select an image file', 'يرجى اختيار ملف صورة', 'Lütfen bir görsel dosyası seçin'),
  'حجم فایل نباید بیشتر از 5 مگابایت باشد': p('حجم فایل نباید بیشتر از 5 مگابایت باشد', 'File size must not exceed 5 MB', 'يجب ألا يتجاوز حجم الملف 5 ميغابايت', 'Dosya boyutu 5 MB\'ı aşmamalıdır'),
  'لوگو با موفقیت آپلود شد': p('لوگو با موفقیت آپلود شد', 'Logo uploaded successfully', 'تم رفع الشعار بنجاح', 'Logo başarıyla yüklendi'),
  'خطا در آپلود لوگو': p('خطا در آپلود لوگو', 'Failed to upload logo', 'تعذر رفع الشعار', 'Logo yüklenemedi'),
  'کارت‌ویزیت جدید با موفقیت اضافه شد': p('کارت‌ویزیت جدید با موفقیت اضافه شد', 'Business card added successfully', 'تمت إضافة بطاقة العمل بنجاح', 'Kartvizit başarıyla eklendi'),
  'خطا در اضافه کردن کارت‌ویزیت': p('خطا در اضافه کردن کارت‌ویزیت', 'Failed to add business card', 'تعذر إضافة بطاقة العمل', 'Kartvizit eklenemedi'),
  'کارت‌ویزیت با موفقیت به‌روزرسانی شد': p('کارت‌ویزیت با موفقیت به‌روزرسانی شد', 'Business card updated successfully', 'تم تحديث بطاقة العمل بنجاح', 'Kartvizit başarıyla güncellendi'),
  'خطا در به‌روزرسانی کارت‌ویزیت': p('خطا در به‌روزرسانی کارت‌ویزیت', 'Failed to update business card', 'تعذر تحديث بطاقة العمل', 'Kartvizit güncellenemedi'),
  'کارت‌ویزیت حذف شد': p('کارت‌ویزیت حذف شد', 'Business card deleted', 'تم حذف بطاقة العمل', 'Kartvizit silindi'),
  'خطا در حذف کارت‌ویزیت': p('خطا در حذف کارت‌ویزیت', 'Failed to delete business card', 'تعذر حذف بطاقة العمل', 'Kartvizit silinemedi'),
  'کارت‌ویزیت تایید شد': p('کارت‌ویزیت تایید شد', 'Business card approved', 'تم اعتماد بطاقة العمل', 'Kartvizit onaylandı'),
  'خطا در تایید کارت‌ویزیت': p('خطا در تایید کارت‌ویزیت', 'Failed to approve business card', 'تعذر اعتماد بطاقة العمل', 'Kartvizit onaylanamadı'),
  'تصویر جدید با موفقیت اضافه شد': p('تصویر جدید با موفقیت اضافه شد', 'Image added successfully', 'تمت إضافة الصورة بنجاح', 'Görsel başarıyla eklendi'),
  'خطا در اضافه کردن تصویر': p('خطا در اضافه کردن تصویر', 'Failed to add image', 'تعذر إضافة الصورة', 'Görsel eklenemedi'),
  'تصویر با موفقیت به‌روزرسانی شد': p('تصویر با موفقیت به‌روزرسانی شد', 'Image updated successfully', 'تم تحديث الصورة بنجاح', 'Görsel başarıyla güncellendi'),
  'خطا در به‌روزرسانی تصویر': p('خطا در به‌روزرسانی تصویر', 'Failed to update image', 'تعذر تحديث الصورة', 'Görsel güncellenemedi'),
  'تصویر حذف شد': p('تصویر حذف شد', 'Image deleted', 'تم حذف الصورة', 'Görsel silindi'),
  'خطا در حذف تصویر': p('خطا در حذف تصویر', 'Failed to delete image', 'تعذر حذف الصورة', 'Görsel silinemedi'),
  'در حال بارگذاری...': p('در حال بارگذاری...', 'Loading...', 'جار التحميل...', 'Yükleniyor...'),
  'اطلاعات شرکت': p('اطلاعات شرکت', 'Company Information', 'معلومات الشركة', 'Şirket Bilgileri'),
  'مدیریت کامل اطلاعات، نامه‌های وارده و صادره، و مدارک شرکت': p('مدیریت کامل اطلاعات، نامه‌های وارده و صادره، و مدارک شرکت', 'Manage company information, incoming and outgoing correspondence, and documents', 'إدارة معلومات الشركة والمراسلات الواردة والصادرة والمستندات', 'Şirket bilgilerini, gelen ve giden yazışmaları ve belgeleri yönetin'),
  'جستجو در تمام بخش‌ها...': p('جستجو در تمام بخش‌ها...', 'Search all sections...', 'البحث في جميع الأقسام...', 'Tüm bölümlerde ara...'),
  'اطلاعات کلی': p('اطلاعات کلی', 'General Information', 'المعلومات العامة', 'Genel Bilgiler'),
  'تصاویر': p('تصاویر', 'Images', 'الصور', 'Görseller'),
  'نامه‌های وارده': p('نامه‌های وارده', 'Incoming Correspondence', 'المراسلات الواردة', 'Gelen Yazışmalar'),
  'نامه‌های صادره': p('نامه‌های صادره', 'Outgoing Correspondence', 'المراسلات الصادرة', 'Giden Yazışmalar'),
  'گواهینامه‌ها و مدارک': p('گواهینامه‌ها و مدارک', 'Certificates & Documents', 'الشهادات والمستندات', 'Sertifikalar ve Belgeler'),
  'کارت‌ویزیت‌ها': p('کارت‌ویزیت‌ها', 'Business Cards', 'بطاقات العمل', 'Kartvizitler'),
  'اطلاعات پایه': p('اطلاعات پایه', 'Basic Information', 'المعلومات الأساسية', 'Temel Bilgiler'),
  'نام شرکت، لوگو و اطلاعات عمومی': p('نام شرکت، لوگو و اطلاعات عمومی', 'Company name, logo, and general information', 'اسم الشركة والشعار والمعلومات العامة', 'Şirket adı, logo ve genel bilgiler'),
  'نام شرکت (عربی)': p('نام شرکت (عربی)', 'Company Name (Arabic)', 'اسم الشركة (العربية)', 'Şirket Adı (Arapça)'),
  'نام شرکت (انگلیسی)': p('نام شرکت (انگلیسی)', 'Company Name (English)', 'اسم الشركة (الإنجليزية)', 'Şirket Adı (İngilizce)'),
  'نام شرکت (ترکی)': p('نام شرکت (ترکی)', 'Company Name (Turkish)', 'اسم الشركة (التركية)', 'Şirket Adı (Türkçe)'),
  'نام تجاری': p('نام تجاری', 'Trade Name', 'الاسم التجاري', 'Ticari Unvan'),
  'بخش تجاری': p('بخش تجاری', 'Business Sector', 'القطاع التجاري', 'İş Sektörü'),
  'توضیحات کسب‌وکار': p('توضیحات کسب‌وکار', 'Business Description', 'وصف النشاط التجاري', 'İş Açıklaması'),
  'تاریخ تأسیس': p('تاریخ تأسیس', 'Established Date', 'تاريخ التأسيس', 'Kuruluş Tarihi'),
  'سایت وب': p('سایت وب', 'Website', 'الموقع الإلكتروني', 'Web Sitesi'),
  'لوگوی شرکت': p('لوگوی شرکت', 'Company Logo', 'شعار الشركة', 'Şirket Logosu'),
  'آدرس URL لوگو': p('آدرس URL لوگو', 'Logo URL', 'رابط الشعار', 'Logo URL\'si'),
  'اطلاعات تماس': p('اطلاعات تماس', 'Contact Information', 'معلومات الاتصال', 'İletişim Bilgileri'),
  'تلفن‌ها، ایمیل‌ها و آدرس‌ها': p('تلفن‌ها، ایمیل‌ها و آدرس‌ها', 'Phones, emails, and addresses', 'الهواتف والبريد الإلكتروني والعناوين', 'Telefonlar, e-postalar ve adresler'),
  'دفتر مرکزی': p('دفتر مرکزی', 'Headquarters', 'المقر الرئيسي', 'Genel Merkez'),
  'تلفن و واتساپ': p('تلفن و واتساپ', 'Phone & WhatsApp', 'الهاتف وواتساب', 'Telefon ve WhatsApp'),
  'ایمیل‌ها': p('ایمیل‌ها', 'Emails', 'البريد الإلكتروني', 'E-postalar'),
  'ساعات کاری': p('ساعات کاری', 'Business Hours', 'ساعات العمل', 'Çalışma Saatleri'),
  'فرصت‌های شغلی': p('فرصت‌های شغلی', 'Careers', 'الوظائف', 'Kariyer'),
  'ایمیل اصلی': p('ایمیل اصلی', 'Primary Email', 'البريد الإلكتروني الرئيسي', 'Birincil E-posta'),
  'ایمیل فرعی': p('ایمیل فرعی', 'Secondary Email', 'البريد الإلكتروني الثانوي', 'İkincil E-posta'),
  'ایمیل پشتیبانی': p('ایمیل پشتیبانی', 'Support Email', 'بريد الدعم', 'Destek E-postası'),
  'تلفن اصلی': p('تلفن اصلی', 'Primary Phone', 'الهاتف الرئيسي', 'Birincil Telefon'),
  'تلفن بالای صفحه اصلی': p('تلفن بالای صفحه اصلی', 'Homepage Header Phone', 'هاتف أعلى الصفحة الرئيسية', 'Ana Sayfa Üst Telefonu'),
  'این شماره در بالای لندینگ پیج نمایش داده می‌شود؛ برای مخفی کردن، آن را خالی و ذخیره کنید.': p('این شماره در بالای لندینگ پیج نمایش داده می‌شود؛ برای مخفی کردن، آن را خالی و ذخیره کنید.', 'Shown at the top of the homepage. Clear and save to hide it.', 'يظهر أعلى الصفحة الرئيسية. امسحه واحفظ لإخفائه.', 'Ana sayfanın üstünde görünür. Gizlemek için silip kaydedin.'),
  'تلفن فرعی': p('تلفن فرعی', 'Secondary Phone', 'الهاتف الثانوي', 'İkincil Telefon'),
  'نماینده مجاز شرکت': p('نماینده مجاز شرکت', 'Authorized Company Representative', 'ممثل الشركة المخول', 'Yetkili Şirket Temsilcisi'),
  'نام نماینده': p('نام نماینده', 'Representative Name', 'اسم الممثل', 'Temsilci Adı'),
  'سمت نماینده': p('سمت نماینده', 'Representative Title', 'منصب الممثل', 'Temsilci Unvanı'),
  'تلفن نماینده': p('تلفن نماینده', 'Representative Phone', 'هاتف الممثل', 'Temsilci Telefonu'),
  'ایمیل نماینده': p('ایمیل نماینده', 'Representative Email', 'بريد الممثل', 'Temsilci E-postası'),
  'شماره واتساپ': p('شماره واتساپ', 'WhatsApp Number', 'رقم واتساب', 'WhatsApp Numarası'),
  'متن وضعیت پاسخگویی': p('متن وضعیت پاسخگویی', 'Availability Message', 'رسالة التوفر', 'Uygunluk Mesajı'),
  'فکس': p('فکس', 'Fax', 'فاكس', 'Faks'),
  'روز هفته': p('روز هفته', 'Day', 'اليوم', 'Gün'),
  'نوع روز': p('نوع روز', 'Day Type', 'نوع اليوم', 'Gün Türü'),
  'شروع کار': p('شروع کار', 'Start Time', 'وقت البدء', 'Başlangıç'),
  'پایان کار': p('پایان کار', 'End Time', 'وقت الانتهاء', 'Bitiş'),
  'روز کاری': p('روز کاری', 'Working day', 'يوم عمل', 'Çalışma günü'),
  'پایان هفته': p('پایان هفته', 'Weekend', 'عطلة نهاية الأسبوع', 'Hafta sonu'),
  'تعطیل': p('تعطیل', 'Holiday', 'عطلة', 'Tatil'),
  'ساعت شروع': p('ساعت شروع', 'Start time', 'وقت البدء', 'Başlangıç saati'),
  'ساعت پایان': p('ساعت پایان', 'End time', 'وقت الانتهاء', 'Bitiş saati'),
  'برای هر روز می‌توانید وضعیت و ساعت را مستقل تعیین کنید. انتخاب ساعت با دقت یک دقیقه امکان‌پذیر است.': p('برای هر روز می‌توانید وضعیت و ساعت را مستقل تعیین کنید. انتخاب ساعت با دقت یک دقیقه امکان‌پذیر است.', 'Set the status and hours independently for each day. Times can be selected to the minute.', 'يمكنك تحديد الحالة والساعات لكل يوم بشكل مستقل. يمكن اختيار الوقت بدقة دقيقة واحدة.', 'Her günün durumunu ve saatlerini bağımsız olarak ayarlayabilirsiniz. Saatler dakika hassasiyetinde seçilebilir.'),
  'آدرس اصلی': p('آدرس اصلی', 'Main Address', 'العنوان الرئيسي', 'Ana Adres'),
  'خط اول کارت آدرس': p('خط اول کارت آدرس', 'Address card line 1', 'السطر الأول لبطاقة العنوان', 'Adres kartı satırı 1'),
  'خط دوم کارت آدرس': p('خط دوم کارت آدرس', 'Address card line 2', 'السطر الثاني لبطاقة العنوان', 'Adres kartı satırı 2'),
  'خط سوم کارت آدرس': p('خط سوم کارت آدرس', 'Address card line 3', 'السطر الثالث لبطاقة العنوان', 'Adres kartı satırı 3'),
  'لینک موقعیت روی نقشه': p('لینک موقعیت روی نقشه', 'Map Location Link', 'رابط الموقع على الخريطة', 'Harita Konum Bağlantısı'),
  'بستن نقشه': p('بستن نقشه', 'Close Map', 'إغلاق الخريطة', 'Haritayı Kapat'),
  'انتخاب روی نقشه': p('انتخاب روی نقشه', 'Choose on Map', 'اختيار على الخريطة', 'Haritada Seç'),
  'روی هر نقطه از نقشه کلیک کنید؛ نشانگر و لینک موقعیت به‌روزرسانی می‌شوند.': p('روی هر نقطه از نقشه کلیک کنید؛ نشانگر و لینک موقعیت به‌روزرسانی می‌شوند.', 'Click anywhere on the map; the marker and location link will update.', 'انقر على أي نقطة في الخريطة؛ سيتم تحديث العلامة ورابط الموقع.', 'Haritada herhangi bir noktaya tıklayın; işaretçi ve konum bağlantısı güncellenir.'),
  'ذخیره موقعیت برای Contact': p('ذخیره موقعیت برای Contact', 'Save location for Contact', 'حفظ الموقع لجهة الاتصال', 'Konumu İletişim için Kaydet'),
  'استان': p('استان', 'Province', 'المحافظة', 'İl'),
  'شهر': p('شهر', 'City', 'المدينة', 'Şehir'),
  'انتخاب استان': p('انتخاب استان', 'Select province', 'اختر المحافظة', 'İl seçin'),
  'انتخاب شهر': p('انتخاب شهر', 'Select city', 'اختر المدينة', 'Şehir seçin'),
  'خط اول فرصت‌های شغلی': p('خط اول فرصت‌های شغلی', 'Career line 1', 'السطر الأول للوظائف', 'Kariyer satırı 1'),
  'خط دوم فرصت‌های شغلی': p('خط دوم فرصت‌های شغلی', 'Career line 2', 'السطر الثاني للوظائف', 'Kariyer satırı 2'),
  'خط سوم فرصت‌های شغلی': p('خط سوم فرصت‌های شغلی', 'Career line 3', 'السطر الثالث للوظائف', 'Kariyer satırı 3'),
  'ایمیل دریافت رزومه': p('ایمیل دریافت رزومه', 'Careers Email', 'البريد الإلكتروني للوظائف', 'Kariyer E-postası'),
  'عنوان‌ها و توضیحات این کارت به‌صورت خودکار مطابق زبان فعال سایت نمایش داده می‌شوند.': p('عنوان‌ها و توضیحات این کارت به‌صورت خودکار مطابق زبان فعال سایت نمایش داده می‌شوند.', 'The headings and descriptions on this card follow the active site language.', 'تظهر عناوين ووصف هذه البطاقة تلقائياً وفق لغة الموقع النشطة.', 'Bu kartın başlık ve açıklamaları etkin site diline göre gösterilir.'),
  'اطلاعات حقوقی': p('اطلاعات حقوقی', 'Legal Information', 'المعلومات القانونية', 'Hukuki Bilgiler'),
  'شماره ثبت، کد ملی و مدارک قانونی': p('شماره ثبت، کد ملی و مدارک قانونی', 'Registration, tax, and legal documents', 'التسجيل والضرائب والمستندات القانونية', 'Tescil, vergi ve yasal belgeler'),
  'شماره ثبت شرکت': p('شماره ثبت شرکت', 'Registration Number', 'رقم التسجيل', 'Tescil Numarası'),
  'شماره مالیاتی': p('شماره مالیاتی', 'Tax Number', 'الرقم الضريبي', 'Vergi Numarası'),
  'کشور': p('کشور', 'Country', 'الدولة', 'Ülke'),
  'عراق': p('عراق', 'Iraq', 'العراق', 'Irak'),
  'کشور به‌صورت پیشفرض عراق تنظیم شده است': p('کشور به‌صورت پیشفرض عراق تنظیم شده است', 'The country defaults to Iraq.', 'الدولة الافتراضية هي العراق.', 'Ülke varsayılan olarak Irak\'tır.'),
  'کد پستی': p('کد پستی', 'Postal Code', 'الرمز البريدي', 'Posta Kodu'),
  'توضیحات شرکت': p('توضیحات شرکت', 'Company Description', 'وصف الشركة', 'Şirket Açıklaması'),
  'درباره شرکت و فعالیت‌های آن': p('درباره شرکت و فعالیت‌های آن', 'About the company and its activities', 'عن الشركة وأنشطتها', 'Şirket ve faaliyetleri hakkında'),
  'توضیحات تجاری': p('توضیحات تجاری', 'Business Description', 'وصف النشاط التجاري', 'İş Açıklaması'),
  'اطلاعات بانکی': p('اطلاعات بانکی', 'Banking Information', 'المعلومات المصرفية', 'Banka Bilgileri'),
  'حساب‌های بانکی و اطلاعات مالی': p('حساب‌های بانکی و اطلاعات مالی', 'Bank accounts and financial information', 'الحسابات المصرفية والمعلومات المالية', 'Banka hesapları ve finansal bilgiler'),
  'نام بانک': p('نام بانک', 'Bank Name', 'اسم البنك', 'Banka Adı'),
  'شماره حساب': p('شماره حساب', 'Account Number', 'رقم الحساب', 'Hesap Numarası'),
  'نام صاحب حساب': p('نام صاحب حساب', 'Account Holder', 'اسم صاحب الحساب', 'Hesap Sahibi'),
  'شماره IBAN': p('شماره IBAN', 'IBAN', 'رقم IBAN', 'IBAN'),
  'کد SWIFT': p('کد SWIFT', 'SWIFT Code', 'رمز SWIFT', 'SWIFT Kodu'),
  'تغییرات ذخیره نشده‌ای دارید. برای ذخیره در دیتابیس کلیک کنید.': p('تغییرات ذخیره نشده‌ای دارید. برای ذخیره در دیتابیس کلیک کنید.', 'You have unsaved changes. Click to save them to the database.', 'لديك تغييرات غير محفوظة. انقر لحفظها في قاعدة البيانات.', 'Kaydedilmemiş değişiklikleriniz var. Veritabanına kaydetmek için tıklayın.'),
  'تمام اطلاعات ذخیره شده است.': p('تمام اطلاعات ذخیره شده است.', 'All information is saved.', 'تم حفظ جميع المعلومات.', 'Tüm bilgiler kaydedildi.'),
  'در حال ذخیره...': p('در حال ذخیره...', 'Saving...', 'جار الحفظ...', 'Kaydediliyor...'),
  'ذخیره اطلاعات شرکت': p('ذخیره اطلاعات شرکت', 'Save Company Information', 'حفظ معلومات الشركة', 'Şirket Bilgilerini Kaydet'),
  'نامه جدید': p('نامه جدید', 'New Letter', 'رسالة جديدة', 'Yeni Yazı'),
  'نوع:': p('نوع:', 'Type:', 'النوع:', 'Tür:'),
  'شماره:': p('شماره:', 'Number:', 'الرقم:', 'Numara:'),
  'صادرکننده:': p('صادرکننده:', 'Issuer:', 'الجهة المصدرة:', 'Düzenleyen:'),
  'تاریخ صدور:': p('تاریخ صدور:', 'Issue date:', 'تاريخ الإصدار:', 'Düzenleme tarihi:'),
  'تاریخ انقضا:': p('تاریخ انقضا:', 'Expiry date:', 'تاريخ الانتهاء:', 'Son kullanma tarihi:'),
  'ثبت نشده': p('ثبت نشده', 'Not set', 'غير محدد', 'Belirtilmedi'),
  'گواهینامه جدید': p('گواهینامه جدید', 'New Certificate', 'شهادة جديدة', 'Yeni Sertifika'),
  'گواهینامه‌ها و مدارک شرکت': p('گواهینامه‌ها و مدارک شرکت', 'Company Certificates & Documents', 'شهادات ومستندات الشركة', 'Şirket Sertifikaları ve Belgeleri'),
  'کارت‌ویزیت‌های دریافتی': p('کارت‌ویزیت‌های دریافتی', 'Received Business Cards', 'بطاقات العمل المستلمة', 'Alınan Kartvizitler'),
  'مدیریت و مشاهده کارت‌ویزیت‌های دریافت شده از مشتریان و شرکا': p('مدیریت و مشاهده کارت‌ویزیت‌های دریافت شده از مشتریان و شرکا', 'Manage and view business cards received from customers and partners', 'إدارة وعرض بطاقات العمل المستلمة من العملاء والشركاء', 'Müşterilerden ve ortaklardan alınan kartvizitleri yönetin ve görüntüleyin'),
  'آپلود کارت‌ویزیت جدید': p('آپلود کارت‌ویزیت جدید', 'Upload New Business Card', 'رفع بطاقة عمل جديدة', 'Yeni Kartvizit Yükle'),
  'کلیک کنید تا آپلود کنید': p('کلیک کنید تا آپلود کنید', 'Click to upload', 'انقر للرفع', 'Yüklemek için tıklayın'),
  'PNG، JPG یا JPEG (حداکثر 5MB)': p('PNG، JPG یا JPEG (حداکثر 5MB)', 'PNG, JPG or JPEG (max 5 MB)', 'PNG أو JPG أو JPEG (بحد أقصى 5 ميغابايت)', 'PNG, JPG veya JPEG (en fazla 5 MB)'),
  'نام فرد *': p('نام فرد *', 'Person name *', 'اسم الشخص *', 'Kişi adı *'),
  'نام شخص روی کارت‌ویزیت': p('نام شخص روی کارت‌ویزیت', 'Name on the business card', 'اسم الشخص على بطاقة العمل', 'Kartvizitteki kişi adı'),
  'سمت/موقعیت *': p('سمت/موقعیت *', 'Job title/position *', 'المسمى الوظيفي *', 'Görev/unvan *'),
  'سمت شغلی': p('سمت شغلی', 'Job title', 'المسمى الوظيفي', 'Görev unvanı'),
  'نام شرکت': p('نام شرکت', 'Company name', 'اسم الشركة', 'Şirket adı'),
  'نام شرکت یا سازمان': p('نام شرکت یا سازمان', 'Company or organization name', 'اسم الشركة أو المؤسسة', 'Şirket veya kuruluş adı'),
  'شماره تماس': p('شماره تماس', 'Phone number', 'رقم الهاتف', 'Telefon numarası'),
  'شماره موبایل یا تلفن': p('شماره موبایل یا تلفن', 'Mobile or phone number', 'رقم الجوال أو الهاتف', 'Cep telefonu veya telefon'),
  'ایمیل': p('ایمیل', 'Email', 'البريد الإلكتروني', 'E-posta'),
  'آدرس ایمیل': p('آدرس ایمیل', 'Email address', 'عنوان البريد الإلكتروني', 'E-posta adresi'),
  'یادداشت‌ها': p('یادداشت‌ها', 'Notes', 'ملاحظات', 'Notlar'),
  'یادداشت‌های اضافی در مورد این کارت‌ویزیت یا شخص...': p('یادداشت‌های اضافی در مورد این کارت‌ویزیت یا شخص...', 'Additional notes about this business card or person...', 'ملاحظات إضافية حول بطاقة العمل أو الشخص...', 'Bu kartvizit veya kişi hakkında ek notlar...'),
  'در حال پردازش...': p('در حال پردازش...', 'Processing...', 'جار المعالجة...', 'İşleniyor...'),
  'به‌روزرسانی کارت‌ویزیت': p('به‌روزرسانی کارت‌ویزیت', 'Update Business Card', 'تحديث بطاقة العمل', 'Kartviziti Güncelle'),
  'ذخیره کارت‌ویزیت': p('ذخیره کارت‌ویزیت', 'Save Business Card', 'حفظ بطاقة العمل', 'Kartviziti Kaydet'),
  'تصاویر شرکت': p('تصاویر شرکت', 'Company Images', 'صور الشركة', 'Şirket Görselleri'),
  'مدیریت تصاویر و گالری شرکت': p('مدیریت تصاویر و گالری شرکت', 'Manage company images and gallery', 'إدارة صور الشركة ومعرضها', 'Şirket görsellerini ve galerisini yönetin'),
  'افزودن تصویر جدید': p('افزودن تصویر جدید', 'Add New Image', 'إضافة صورة جديدة', 'Yeni Görsel Ekle'),
  'هیچ تصویری موجود نیست': p('هیچ تصویری موجود نیست', 'No images available', 'لا توجد صور', 'Görsel bulunamadı'),
  'نتیجه‌ای برای': p('نتیجه‌ای برای', 'No results for', 'لا توجد نتائج لـ', 'Sonuç bulunamadı:'),
  'ویرایش گواهینامه شرکت': p('ویرایش گواهینامه شرکت', 'Edit Company Certificate', 'تعديل شهادة الشركة', 'Şirket Sertifikasını Düzenle'),
  'افزودن گواهینامه شرکت': p('افزودن گواهینامه شرکت', 'Add Company Certificate', 'إضافة شهادة الشركة', 'Şirket Sertifikası Ekle'),
  'اطلاعات گواهینامه را ویرایش کنید. در صورت نیاز می‌توانید فایل آن را نیز جایگزین کنید.': p('اطلاعات گواهینامه را ویرایش کنید. در صورت نیاز می‌توانید فایل آن را نیز جایگزین کنید.', 'Edit the certificate information. You can also replace its file if needed.', 'عدّل معلومات الشهادة. يمكنك استبدال ملفها عند الحاجة.', 'Sertifika bilgilerini düzenleyin. Gerekirse dosyasını da değiştirebilirsiniz.'),
  'اطلاعات گواهینامه را وارد کرده و تصویر یا فایل PDF آن را آپلود کنید.': p('اطلاعات گواهینامه را وارد کرده و تصویر یا فایل PDF آن را آپلود کنید.', 'Enter the certificate information and upload its image or PDF.', 'أدخل معلومات الشهادة وارفع صورتها أو ملف PDF.', 'Sertifika bilgilerini girin ve görselini veya PDF dosyasını yükleyin.'),
  'فایل الزامی است': p('فایل الزامی است', 'File required', 'الملف مطلوب', 'Dosya gerekli'),
  'ابتدا فایل گواهینامه را آپلود کنید': p('ابتدا فایل گواهینامه را آپلود کنید', 'Upload the certificate file first', 'ارفع ملف الشهادة أولاً', 'Önce sertifika dosyasını yükleyin'),
  'نام گواهینامه *': p('نام گواهینامه *', 'Certificate name *', 'اسم الشهادة *', 'Sertifika adı *'),
  'شماره گواهینامه': p('شماره گواهینامه', 'Certificate number', 'رقم الشهادة', 'Sertifika numarası'),
  'شماره مدرک': p('شماره مدرک', 'Document number', 'رقم المستند', 'Belge numarası'),
  'مرجع صادرکننده *': p('مرجع صادرکننده *', 'Issuing authority *', 'الجهة المصدرة *', 'Düzenleyen kurum *'),
  'مرجع صادرکننده': p('مرجع صادرکننده', 'Issuing authority', 'الجهة المصدرة', 'Düzenleyen kurum'),
  'توضیحات': p('توضیحات', 'Description', 'الوصف', 'Açıklama'),
  'توضیحات گواهینامه': p('توضیحات گواهینامه', 'Certificate description', 'وصف الشهادة', 'Sertifika açıklaması'),
  'فایل گواهینامه *': p('فایل گواهینامه *', 'Certificate file *', 'ملف الشهادة *', 'Sertifika dosyası *'),
  'در حال آپلود فایل...': p('در حال آپلود فایل...', 'Uploading file...', 'جار رفع الملف...', 'Dosya yükleniyor...'),
  'فایل فعلی حفظ می‌شود': p('فایل فعلی حفظ می‌شود', 'The current file will be kept', 'سيتم الاحتفاظ بالملف الحالي', 'Mevcut dosya korunacak'),
  'فایل با موفقیت آپلود شد': p('فایل با موفقیت آپلود شد', 'File uploaded successfully', 'تم رفع الملف بنجاح', 'Dosya başarıyla yüklendi'),
  'انصراف': p('انصراف', 'Cancel', 'إلغاء', 'İptal'),
  'ذخیره تغییرات': p('ذخیره تغییرات', 'Save Changes', 'حفظ التغييرات', 'Değişiklikleri Kaydet'),
  'ثبت گواهینامه': p('ثبت گواهینامه', 'Add Certificate', 'إضافة الشهادة', 'Sertifika Ekle'),
  'ویرایش کارت‌ویزیت دریافتی': p('ویرایش کارت‌ویزیت دریافتی', 'Edit Received Business Card', 'تعديل بطاقة العمل المستلمة', 'Alınan Kartviziti Düzenle'),
  'کارت‌ویزیت دریافت شده از مشتری یا شریک تجاری را آپلود کنید': p('کارت‌ویزیت دریافت شده از مشتری یا شریک تجاری را آپلود کنید', 'Upload a business card received from a customer or business partner', 'ارفع بطاقة عمل مستلمة من عميل أو شريك تجاري', 'Müşteriden veya iş ortağından alınan kartviziti yükleyin'),
  'ویرایش تصویر': p('ویرایش تصویر', 'Edit Image', 'تعديل الصورة', 'Görseli Düzenle'),
  'عنوان تصویر *': p('عنوان تصویر *', 'Image title *', 'عنوان الصورة *', 'Görsel başlığı *'),
  'عنوان تصویر...': p('عنوان تصویر...', 'Image title...', 'عنوان الصورة...', 'Görsel başlığı...'),
  'توضیحات *': p('توضیحات *', 'Description *', 'الوصف *', 'Açıklama *'),
  'توضیحات کامل تصویر...': p('توضیحات کامل تصویر...', 'Full image description...', 'وصف الصورة الكامل...', 'Tam görsel açıklaması...'),
  'URL تصویر *': p('URL تصویر *', 'Image URL *', 'رابط الصورة *', 'Görsel URL\'si *'),
  'دسته‌بندی *': p('دسته‌بندی *', 'Category *', 'الفئة *', 'Kategori *'),
  'انتخاب دسته‌بندی': p('انتخاب دسته‌بندی', 'Select category', 'اختر الفئة', 'Kategori seçin'),
  'لوگو': p('لوگو', 'Logo', 'الشعار', 'Logo'),
  'ساختمان': p('ساختمان', 'Building', 'المبنى', 'Bina'),
  'محصولات': p('محصولات', 'Products', 'المنتجات', 'Ürünler'),
  'تیم': p('تیم', 'Team', 'الفريق', 'Ekip'),
  'گواهینامه‌ها': p('گواهینامه‌ها', 'Certificates', 'الشهادات', 'Sertifikalar'),
  'تجهیزات': p('تجهیزات', 'Equipment', 'المعدات', 'Ekipman'),
  'گالری': p('گالری', 'Gallery', 'المعرض', 'Galeri'),
  'سایر': p('سایر', 'Other', 'أخرى', 'Diğer'),
  'برچسب‌ها': p('برچسب‌ها', 'Tags', 'العلامات', 'Etiketler'),
  'فعال': p('فعال', 'Active', 'نشط', 'Aktif'),
  'ذخیره': p('ذخیره', 'Save', 'حفظ', 'Kaydet'),
  'به‌روزرسانی': p('به‌روزرسانی', 'Update', 'تحديث', 'Güncelle'),
  'دسته‌بندی:': p('دسته‌بندی:', 'Category:', 'الفئة:', 'Kategori:'),
  'تاریخ آپلود:': p('تاریخ آپلود:', 'Upload date:', 'تاريخ الرفع:', 'Yükleme tarihi:'),
  'وضعیت:': p('وضعیت:', 'Status:', 'الحالة:', 'Durum:'),
  'غیرفعال': p('غیرفعال', 'Inactive', 'غير نشط', 'Pasif'),
  'مشاهده': p('مشاهده', 'View', 'عرض', 'Görüntüle'),
  'ویرایش': p('ویرایش', 'Edit', 'تعديل', 'Düzenle'),
  'حذف': p('حذف', 'Delete', 'حذف', 'Sil'),
  'دانلود فایل': p('دانلود فایل', 'Download file', 'تنزيل الملف', 'Dosyayı indir'),
  'ویرایش گواهینامه': p('ویرایش گواهینامه', 'Edit certificate', 'تعديل الشهادة', 'Sertifikayı düzenle'),
  'آیا مطمئن هستید که می‌خواهید این کارت‌ویزیت را حذف کنید؟': p('آیا مطمئن هستید که می‌خواهید این کارت‌ویزیت را حذف کنید؟', 'Are you sure you want to delete this business card?', 'هل أنت متأكد من حذف بطاقة العمل هذه؟', 'Bu kartviziti silmek istediğinizden emin misiniz?'),
  'تصویر کارت‌ویزیت': p('تصویر کارت‌ویزیت', 'Business card image', 'صورة بطاقة العمل', 'Kartvizit görseli'),
  'تاریخ نامشخص': p('تاریخ نامشخص', 'Unknown date', 'تاريخ غير معروف', 'Bilinmeyen tarih'),
  'فوری': p('فوری', 'Urgent', 'عاجل', 'Acil'),
  'متوسط': p('متوسط', 'Medium', 'متوسط', 'Orta'),
  'کم': p('کم', 'Low', 'منخفض', 'Düşük'),
  'در انتظار': p('در انتظار', 'Pending', 'قيد الانتظار', 'Beklemede'),
  'در حال بررسی': p('در حال بررسی', 'In progress', 'قيد المعالجة', 'İşleniyor'),
  'تکمیل شده': p('تکمیل شده', 'Completed', 'مكتمل', 'Tamamlandı'),
  'بایگانی شده': p('بایگانی شده', 'Archived', 'مؤرشف', 'Arşivlendi'),
  'پیش‌نویس': p('پیش‌نویس', 'Draft', 'مسودة', 'Taslak'),
  'ارسال شده': p('ارسال شده', 'Sent', 'مرسل', 'Gönderildi'),
  'منقضی شده': p('منقضی شده', 'Expired', 'منتهي', 'Süresi doldu'),
  'هنوز کارت‌ویزیتی آپلود نشده': p('هنوز کارت‌ویزیتی آپلود نشده', 'No business cards uploaded yet', 'لم يتم رفع أي بطاقات عمل بعد', 'Henüz kartvizit yüklenmedi'),
  'کارت‌ویزیت‌های دریافتی از مشتریان و شرکا را اینجا آپلود کنید': p('کارت‌ویزیت‌های دریافتی از مشتریان و شرکا را اینجا آپلود کنید', 'Upload business cards received from customers and partners here', 'ارفع هنا بطاقات العمل المستلمة من العملاء والشركاء', 'Müşterilerden ve ortaklardan alınan kartvizitleri buraya yükleyin'),
  'اولین کارت‌ویزیت را آپلود کنید': p('اولین کارت‌ویزیت را آپلود کنید', 'Upload the first business card', 'ارفع بطاقة العمل الأولى', 'İlk kartviziti yükleyin'),
  'شنبه': p('شنبه', 'Saturday', 'السبت', 'Cumartesi'),
  'یکشنبه': p('یکشنبه', 'Sunday', 'الأحد', 'Pazar'),
  'دوشنبه': p('دوشنبه', 'Monday', 'الاثنين', 'Pazartesi'),
  'سه‌شنبه': p('سه‌شنبه', 'Tuesday', 'الثلاثاء', 'Salı'),
  'چهارشنبه': p('چهارشنبه', 'Wednesday', 'الأربعاء', 'Çarşamba'),
  'پنج‌شنبه': p('پنج‌شنبه', 'Thursday', 'الخميس', 'Perşembe'),
  'جمعه': p('جمعه', 'Friday', 'الجمعة', 'Cuma'),
  'ممتاز شیمی': p('ممتاز شیمی', 'Momtaz Shimi', 'ممتاز شیمی', 'Momtaz Shimi'),
  'شرح کامل فعالیت‌های تجاری شرکت': p('شرح کامل فعالیت‌های تجاری شرکت', 'Full description of the company activities', 'وصف كامل لأنشطة الشركة التجارية', 'Şirket faaliyetlerinin tam açıklaması'),
  'برای انتخاب موقعیت روی نقشه کلیک کنید': p('برای انتخاب موقعیت روی نقشه کلیک کنید', 'Click to choose a location on the map', 'انقر لاختيار موقع على الخريطة', 'Haritada konum seçmek için tıklayın'),
  'بانک ملی عراق': p('بانک ملی عراق', 'National Bank of Iraq', 'المصرف الوطني العراقي', 'Irak Ulusal Bankası'),
  'نام کامل صاحب حساب': p('نام کامل صاحب حساب', 'Full account holder name', 'الاسم الكامل لصاحب الحساب', 'Hesap sahibinin tam adı'),
  'برچسب1, برچسب2, برچسب3': p('برچسب1, برچسب2, برچسب3', 'tag1, tag2, tag3', 'وسم1، وسم2، وسم3', 'etiket1, etiket2, etiket3'),
  'Momtazchem': p('ممتازکم', 'Momtazchem', 'ممتازكيم', 'Momtazchem'),
  'Al-Entaj Al-Momtaz Company': p('شرکت الانتاج الممتاز', 'Al-Entaj Al-Momtaz Company', 'شركة الإنتاج الممتاز', 'Al-Entaj Al-Momtaz Şirketi'),
  'Chemical Products Trading': p('تجارت محصولات شیمیایی', 'Chemical Products Trading', 'تجارة المنتجات الكيميائية', 'Kimyasal Ürün Ticareti'),
  'Available on WhatsApp': p('در واتساپ در دسترس است', 'Available on WhatsApp', 'متاح على واتساب', 'WhatsApp\'ta kullanılabilir'),
  'آدرس کامل شرکت': p('آدرس کامل شرکت', 'Full company address', 'العنوان الكامل للشركة', 'Tam şirket adresi'),
  certificate: p('گواهینامه', 'Certificate', 'شهادة', 'Sertifika'),
  'پیدا نشد': p('پیدا نشد', 'not found', 'لم يتم العثور عليه', 'bulunamadı'),
  'Failed to fetch company information': p('دریافت اطلاعات شرکت انجام نشد', 'Failed to fetch company information', 'تعذر جلب معلومات الشركة', 'Şirket bilgileri alınamadı'),
  'Failed to fetch provinces': p('دریافت استان‌ها انجام نشد', 'Failed to fetch provinces', 'تعذر جلب المحافظات', 'İller alınamadı'),
  'Failed to fetch cities': p('دریافت شهرها انجام نشد', 'Failed to fetch cities', 'تعذر جلب المدن', 'Şehirler alınamadı'),
  'Failed to fetch incoming correspondence': p('دریافت نامه‌های وارده انجام نشد', 'Failed to fetch incoming correspondence', 'تعذر جلب المراسلات الواردة', 'Gelen yazışmalar alınamadı'),
  'Failed to fetch outgoing correspondence': p('دریافت نامه‌های صادره انجام نشد', 'Failed to fetch outgoing correspondence', 'تعذر جلب المراسلات الصادرة', 'Giden yazışmalar alınamadı'),
  'Failed to fetch company documents': p('دریافت مدارک شرکت انجام نشد', 'Failed to fetch company documents', 'تعذر جلب مستندات الشركة', 'Şirket belgeleri alınamadı'),
  'Failed to fetch business cards': p('دریافت کارت‌ویزیت‌ها انجام نشد', 'Failed to fetch business cards', 'تعذر جلب بطاقات العمل', 'Kartvizitler alınamadı'),
  'Failed to fetch company images': p('دریافت تصاویر شرکت انجام نشد', 'Failed to fetch company images', 'تعذر جلب صور الشركة', 'Şirket görselleri alınamadı'),
};

const WEEK_DAYS: Array<{ key: WeekDayKey; label: string }> = [
  { key: 'saturday', label: 'شنبه' },
  { key: 'sunday', label: 'یکشنبه' },
  { key: 'monday', label: 'دوشنبه' },
  { key: 'tuesday', label: 'سه‌شنبه' },
  { key: 'wednesday', label: 'چهارشنبه' },
  { key: 'thursday', label: 'پنج‌شنبه' },
  { key: 'friday', label: 'جمعه' },
];

const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  saturday: { status: 'working', start: '08:00', end: '17:00' },
  sunday: { status: 'weekend', start: '08:00', end: '17:00' },
  monday: { status: 'working', start: '08:00', end: '17:00' },
  tuesday: { status: 'working', start: '08:00', end: '17:00' },
  wednesday: { status: 'working', start: '08:00', end: '17:00' },
  thursday: { status: 'working', start: '08:00', end: '17:00' },
  friday: { status: 'holiday', start: '08:00', end: '17:00' },
};

interface BusinessCard {
  id?: number;
  employeeName: string;
  employeeNameArabic?: string;
  employeeNameKurdish?: string;
  jobTitle: string;
  jobTitleArabic?: string;
  jobTitleKurdish?: string;
  department?: string;
  directPhone?: string;
  mobilePhone?: string;
  email?: string;
  officeLocation?: string;
  linkedinProfile?: string;
  whatsappNumber?: string;
  cardDesign: 'standard' | 'executive' | 'creative';
  cardColor: string;
  includeQrCode: boolean;
  qrCodeData?: string;
  specialNotes?: string;
  isActive: boolean;
  printQuantity: number;
  lastPrintDate?: string;
  cardStatus: 'draft' | 'approved' | 'printed' | 'distributed';
  approvedBy?: number;
  approvedAt?: string;
  createdBy?: number;
}

interface CompanyImage {
  id?: number;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  tags?: string;
  isActive: boolean;
  uploadedAt?: string;
}

export default function CompanyInformation() {
  const { toast } = useToast();
  const { language: contextLanguage, direction } = useLanguage();
  const language = (['en', 'fa', 'ar', 'tr'].includes(contextLanguage) ? contextLanguage : 'en') as PageLanguage;
  const tx = (key: string) => pageTranslations[key]?.[language] || key;
  const translateEnum = (value: string) => tx({
    certificate: 'certificate',
    logo: 'لوگو',
    building: 'ساختمان',
    products: 'محصولات',
    team: 'تیم',
    certificates: 'گواهینامه‌ها',
    equipment: 'تجهیزات',
    gallery: 'گالری',
    other: 'سایر',
  }[value] || value);
  const formatDate = (value?: string | null) => value
    ? new Date(value).toLocaleDateString(language === 'fa' ? 'fa-IR-u-ca-persian' : language === 'ar' ? 'ar-u-ca-gregory' : language === 'tr' ? 'tr-TR-u-ca-gregory' : 'en-US-u-ca-gregory')
    : tx('تاریخ نامشخص');
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('info');
  const [isAddingIncoming, setIsAddingIncoming] = useState(false);
  const [isAddingOutgoing, setIsAddingOutgoing] = useState(false);
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [isAddingBusinessCard, setIsAddingBusinessCard] = useState(false);
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImageView, setSelectedImageView] = useState<CompanyImage | null>(null);
  const [formData, setFormData] = useState<CompanyInfo>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [certificateUploading, setCertificateUploading] = useState(false);
  const [certificateFileUrl, setCertificateFileUrl] = useState('');
  const [certificateExpiryDate, setCertificateExpiryDate] = useState('');
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  // Fetch company information from database
  const { data: companyInfo, isLoading: infoLoading } = useQuery<CompanyInfo>({
    queryKey: ['/api/admin/company-information'],
    queryFn: async () => {
      const response = await fetch('/api/admin/company-information', { credentials: 'include' });
      if (!response.ok) throw new Error(tx('Failed to fetch company information'));
      const result = await response.json();
      return result.data || null;
    }
  });

  const { data: landingPhoneDefaults } = useQuery<{ data?: { page?: { phoneLabel?: string } } }>({
    queryKey: ['/api/landing-content'],
  });
  const landingPhoneValue = formData.contactSettings?.landingPhone
    ?? landingPhoneDefaults?.data?.page?.phoneLabel
    ?? defaultLandingPageSettings().phoneLabel;

  // Fetch Iraqi provinces
  const { data: provinces } = useQuery({
    queryKey: ['/api/iraqi-provinces'],
    queryFn: async () => {
      const response = await fetch('/api/iraqi-provinces');
      if (!response.ok) throw new Error(tx('Failed to fetch provinces'));
      const result = await response.json();
      return result.data || [];
    }
  });

  // Fetch Iraqi cities
  const { data: cities } = useQuery({
    queryKey: ['/api/iraqi-cities'],
    queryFn: async () => {
      const response = await fetch('/api/iraqi-cities');
      if (!response.ok) throw new Error(tx('Failed to fetch cities'));
      const result = await response.json();
      return result.data || [];
    }
  });

  // Initialize formData when companyInfo loads
  useEffect(() => {
    if (companyInfo) {
      setFormData({
        ...companyInfo,
        weeklySchedule: companyInfo.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE,
      });
      // A visible default schedule must be persisted before the public Contact
      // page can use it instead of the legacy business-hours text.
      setHasUnsavedChanges(!companyInfo.weeklySchedule);
    }
  }, [companyInfo]);

  // Handle form field changes
  const handleFieldChange = (field: keyof CompanyInfo, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleContactSettingChange = (
    field: keyof NonNullable<CompanyInfo['contactSettings']>,
    value: string,
  ) => {
    handleFieldChange('contactSettings', {
      ...(formData.contactSettings || {}),
      [field]: value,
    });
  };

  const selectedLatitude = Number(formData.contactSettings?.mapLatitude) || 36.1578;
  const selectedLongitude = Number(formData.contactSettings?.mapLongitude) || 43.8822;

  const handleMapLocationChange = (latitude: number, longitude: number) => {
    handleFieldChange('contactSettings', {
      ...(formData.contactSettings || {}),
      mapLatitude: latitude,
      mapLongitude: longitude,
      mapLink: `https://www.google.com/maps?q=${latitude},${longitude}`,
    });
  };

  // Fetch incoming correspondence
  const { data: incomingMails } = useQuery<Correspondence[]>({
    queryKey: ['/api/correspondence/incoming'],
    queryFn: async () => {
      const response = await fetch('/api/correspondence/incoming', { credentials: 'include' });
      if (!response.ok) throw new Error(tx('Failed to fetch incoming correspondence'));
      const result = await response.json();
      return result.data || [];
    }
  });

  // Fetch outgoing correspondence
  const { data: outgoingMails } = useQuery<Correspondence[]>({
    queryKey: ['/api/correspondence/outgoing'],
    queryFn: async () => {
      const response = await fetch('/api/correspondence/outgoing', { credentials: 'include' });
      if (!response.ok) throw new Error(tx('Failed to fetch outgoing correspondence'));
      const result = await response.json();
      return result.data || [];
    }
  });

  // Fetch company documents
  const { data: companyDocs } = useQuery<CompanyDocument[]>({
    queryKey: ['/api/company-documents'],
    queryFn: async () => {
      const response = await fetch('/api/company-documents', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(tx('Failed to fetch company documents'));
      const result = await response.json();
      return (result.data || []).map((document: CompanyDocument & { expiry_date?: string | null }) => ({
        ...document,
        expiryDate: document.expiryDate ?? document.expiry_date ?? null,
      }));
    }
  });

  // Fetch business cards
  const { data: businessCards } = useQuery<BusinessCard[]>({
    queryKey: ['/api/business-cards'],
    queryFn: async () => {
      const response = await fetch('/api/business-cards', { credentials: 'include' });
      if (!response.ok) throw new Error(tx('Failed to fetch business cards'));
      const result = await response.json();
      return result.data || [];
    }
  });

  // Fetch company images
  const { data: companyImages } = useQuery<CompanyImage[]>({
    queryKey: ['/api/company-images'],
    queryFn: async () => {
      const response = await fetch('/api/company-images', { credentials: 'include' });
      if (!response.ok) throw new Error(tx('Failed to fetch company images'));
      const result = await response.json();
      return result.data || [];
    }
  });

  // Update company info mutation using database API
  const updateCompanyInfoMutation = useMutation({
    mutationFn: async (data: CompanyInfo) => {
      const response = await apiRequest('/api/admin/company-information', {
        method: 'PUT',
        body: {
          ...data,
          weeklySchedule: data.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE,
        },
      });
      return response;
    },
    onSuccess: () => {
      toast({ title: tx('موفقیت'), description: tx('اطلاعات شرکت با موفقیت در دیتابیس ذخیره شد') });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/company-information'] });
      queryClient.invalidateQueries({ queryKey: ['/api/company-information'] });
      setHasUnsavedChanges(false);
    },
    onError: (error) => {
      console.error('Error updating company information:', error);
      toast({ 
        title: tx('خطا'),
        description: tx('خطا در ذخیره اطلاعات شرکت در دیتابیس'),
        variant: "destructive" 
      });
    }
  });

  const addCertificateMutation = useMutation({
    mutationFn: async (data: CompanyDocument) => {
      const response = await fetch('/api/company-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => null);
      if (response.status === 401) {
        throw new Error(tx('نشست مدیریت منقضی شده است. لطفاً دوباره وارد شوید.'));
      }
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || tx('ثبت گواهینامه انجام نشد'));
      }
      return result;
    },
    onSuccess: () => {
      toast({ title: tx('موفقیت'), description: tx('گواهینامه با موفقیت ثبت شد') });
      queryClient.invalidateQueries({ queryKey: ['/api/company-documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/company-certifications'] });
      setIsAddingDocument(false);
      setCertificateFileUrl('');
      setCertificateExpiryDate('');
      setEditingItem(null);
    },
    onError: (error) => {
      console.error('Error adding certificate:', error);
       const message = error instanceof Error ? error.message : tx('ثبت گواهینامه انجام نشد');
       toast({ title: tx('خطا'), description: message, variant: "destructive" });
       if (message.includes('session') || message.includes('نشست مدیریت')) {
        window.setTimeout(() => {
          window.location.href = '/mrg/login';
        }, 1200);
      }
    }
  });

  const updateCertificateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CompanyDocument }) => {
      const response = await fetch(`/api/company-documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => null);
      if (response.status === 401) {
        throw new Error(tx('نشست مدیریت منقضی شده است. لطفاً دوباره وارد شوید.'));
      }
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || tx('به‌روزرسانی گواهینامه انجام نشد'));
      }
      return result;
    },
    onSuccess: () => {
      toast({ title: tx('موفقیت'), description: tx('گواهینامه با موفقیت به‌روزرسانی شد') });
      queryClient.invalidateQueries({ queryKey: ['/api/company-documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/company-certifications'] });
      setIsAddingDocument(false);
      setCertificateFileUrl('');
      setCertificateExpiryDate('');
      setEditingItem(null);
    },
    onError: (error) => {
       const message = error instanceof Error ? error.message : tx('به‌روزرسانی گواهینامه انجام نشد');
       toast({ title: tx('خطا'), description: message, variant: "destructive" });
       if (message.includes('session') || message.includes('نشست مدیریت')) {
        window.setTimeout(() => {
          window.location.href = '/mrg/login';
        }, 1200);
      }
    }
  });

  const handleCertificateUpload = async (file: File) => {
    setCertificateUploading(true);
    try {
      const authResponse = await fetch('/api/admin/me', { credentials: 'include' });
      if (authResponse.status === 401) {
        throw new Error(tx('نشست مدیریت منقضی شده است. لطفاً دوباره وارد شوید.'));
      }
      if (!authResponse.ok) {
        throw new Error(tx('بررسی نشست مدیریت انجام نشد. دوباره تلاش کنید.'));
      }

      const uploadBody = new FormData();
      uploadBody.append('file', file);
      const uploadResponse = await fetch('/api/company-certificates/upload', {
        method: 'POST',
        credentials: 'include',
        body: uploadBody,
      });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok || !uploadData.success || !uploadData.objectPath) {
        throw new Error(uploadData.message || tx('دریافت مسیر آپلود انجام نشد'));
      }
      setCertificateFileUrl(uploadData.objectPath);
       toast({ title: tx('آپلود موفق'), description: tx('فایل گواهینامه آماده ثبت است') });
    } catch (error) {
       const message = error instanceof Error ? error.message : tx('آپلود فایل انجام نشد');
      toast({
         title: tx('خطا در آپلود'),
        description: message,
        variant: "destructive",
      });
       if (message.includes('session') || message.includes('نشست مدیریت')) {
        window.setTimeout(() => {
          window.location.href = '/mrg/login';
        }, 1200);
      }
    } finally {
      setCertificateUploading(false);
    }
  };

  // Handle save button click
  const handleSaveCompanyInfo = () => {
    console.log('Saving company info:', formData);
    console.log('Phone Primary:', formData?.phonePrimary);
    console.log('Phone Secondary:', formData?.phoneSecondary);
    updateCompanyInfoMutation.mutate(formData);
  };

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({ 
        title: tx('خطا'),
        description: tx('فایل تصویری انتخاب کنید'),
        variant: "destructive" 
      });
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({ 
        title: tx('خطا'),
        description: tx('حجم فایل نباید بیشتر از 5 مگابایت باشد'),
        variant: "destructive" 
      });
      return;
    }

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'logo');

      const response = await fetch('/api/upload/company-logo', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      // Update logo URL in form data
      handleFieldChange('logoUrl', result.url);
      
      toast({ 
        title: tx('موفقیت'),
        description: tx('لوگو با موفقیت آپلود شد')
      });
    } catch (error) {
      console.error('Logo upload error:', error);
      toast({ 
        title: tx('خطا'),
        description: tx('خطا در آپلود لوگو'),
        variant: "destructive" 
      });
    } finally {
      setLogoUploading(false);
    }
  };

  // Business Cards mutations
  const addBusinessCardMutation = useMutation({
    mutationFn: async (data: BusinessCard) => {
      const response = await apiRequest('/api/business-cards', {
        method: 'POST',
        body: data, // Remove JSON.stringify
      });
      return response;
    },
    onSuccess: () => {
      toast({ title: tx('موفقیت'), description: tx('کارت‌ویزیت جدید با موفقیت اضافه شد') });
      queryClient.invalidateQueries({ queryKey: ['/api/business-cards'] });
      setIsAddingBusinessCard(false);
    },
    onError: (error) => {
      console.error('Error adding business card:', error);
      toast({ 
        title: tx('خطا'),
        description: tx('خطا در اضافه کردن کارت‌ویزیت'),
        variant: "destructive" 
      });
    }
  });

  const updateBusinessCardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: BusinessCard }) => {
      const response = await apiRequest(`/api/business-cards/${id}`, {
        method: 'PUT',
        body: data, // Remove JSON.stringify
      });
      return response;
    },
    onSuccess: () => {
      toast({ title: tx('موفقیت'), description: tx('کارت‌ویزیت با موفقیت به‌روزرسانی شد') });
      queryClient.invalidateQueries({ queryKey: ['/api/business-cards'] });
      setEditingItem(null);
    },
    onError: (error) => {
      console.error('Error updating business card:', error);
      toast({ 
        title: tx('خطا'),
        description: tx('خطا در به‌روزرسانی کارت‌ویزیت'),
        variant: "destructive" 
      });
    }
  });

  const deleteBusinessCardMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/business-cards/${id}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      toast({ title: tx('موفقیت'), description: tx('کارت‌ویزیت حذف شد') });
      queryClient.invalidateQueries({ queryKey: ['/api/business-cards'] });
    },
    onError: (error) => {
      console.error('Error deleting business card:', error);
      toast({ 
        title: tx('خطا'),
        description: tx('خطا در حذف کارت‌ویزیت'),
        variant: "destructive" 
      });
    }
  });

  const approveBusinessCardMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/business-cards/${id}/approve`, {
        method: 'PUT',
      });
      return response;
    },
    onSuccess: () => {
      toast({ title: tx('موفقیت'), description: tx('کارت‌ویزیت تایید شد') });
      queryClient.invalidateQueries({ queryKey: ['/api/business-cards'] });
    },
    onError: (error) => {
      console.error('Error approving business card:', error);
      toast({ 
        title: tx('خطا'),
        description: tx('خطا در تایید کارت‌ویزیت'),
        variant: "destructive" 
      });
    }
  });

  // Company Images mutations
  const addImageMutation = useMutation({
    mutationFn: async (data: CompanyImage) => {
      const response = await apiRequest('/api/company-images', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      toast({ title: tx('موفقیت'), description: tx('تصویر جدید با موفقیت اضافه شد') });
      queryClient.invalidateQueries({ queryKey: ['/api/company-images'] });
      setIsAddingImage(false);
    },
    onError: (error) => {
      console.error('Error adding image:', error);
      toast({ 
        title: tx('خطا'),
        description: tx('خطا در اضافه کردن تصویر'),
        variant: "destructive" 
      });
    }
  });

  const updateImageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CompanyImage }) => {
      const response = await apiRequest(`/api/company-images/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      toast({ title: tx('موفقیت'), description: tx('تصویر با موفقیت به‌روزرسانی شد') });
      queryClient.invalidateQueries({ queryKey: ['/api/company-images'] });
      setEditingItem(null);
    },
    onError: (error) => {
      console.error('Error updating image:', error);
      toast({ 
        title: tx('خطا'),
        description: tx('خطا در به‌روزرسانی تصویر'),
        variant: "destructive" 
      });
    }
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/company-images/${id}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      toast({ title: tx('موفقیت'), description: tx('تصویر حذف شد') });
      queryClient.invalidateQueries({ queryKey: ['/api/company-images'] });
    },
    onError: (error) => {
      console.error('Error deleting image:', error);
      toast({ 
        title: tx('خطا'),
        description: tx('خطا در حذف تصویر'),
        variant: "destructive" 
      });
    }
  });

  // Search and filter functions
  const filterBySearch = (items: any[], searchFields: string[]) => {
    if (!searchQuery.trim()) return items;
    
    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(searchQuery.toLowerCase());
      })
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800', 
      low: 'bg-green-100 text-green-800'
    };
    const labels = { high: 'فوری', medium: 'متوسط', low: 'کم' };
    return (
      <Badge className={colors[priority as keyof typeof colors]}>
        {tx(labels[priority as keyof typeof labels])}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'در انتظار', color: 'bg-orange-100 text-orange-800', icon: Clock },
      in_progress: { label: 'در حال بررسی', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      completed: { label: 'تکمیل شده', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      archived: { label: 'بایگانی شده', color: 'bg-gray-100 text-gray-800', icon: Archive },
      draft: { label: 'پیش‌نویس', color: 'bg-gray-100 text-gray-800', icon: Edit },
      sent: { label: 'ارسال شده', color: 'bg-blue-100 text-blue-800', icon: Send },
      active: { label: 'فعال', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      expired: { label: 'منقضی شده', color: 'bg-red-100 text-red-800', icon: AlertCircle }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || {
      label: status, color: 'bg-gray-100 text-gray-800', icon: AlertCircle
    };
    
    const Icon = statusInfo.icon;
    
    return (
      <Badge className={statusInfo.color}>
        <Icon className="w-3 h-3 me-1" />
         {tx(statusInfo.label)}
      </Badge>
    );
  };

  if (infoLoading) {
    return (
      <div className="container mx-auto py-8" dir={direction}>
        <div className="flex items-center justify-center">
          <div className="text-lg">{tx('در حال بارگذاری...')}</div>
        </div>
      </div>
    );
  }

  return (
      <div className="container mx-auto py-8 px-4" dir={direction}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="h-8 w-8 text-blue-600" />
          {tx('اطلاعات شرکت')}
        </h1>
        <p className="text-gray-600 mt-2">
          {tx('مدیریت کامل اطلاعات، نامه‌های وارده و صادره، و مدارک شرکت')}
        </p>
      </div>

      {/* Search Bar - Global */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute end-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={tx('جستجو در تمام بخش‌ها...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pe-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="absolute start-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            {tx('اطلاعات کلی')}
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            {tx('تصاویر')} ({companyImages?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="incoming" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            {tx('نامه‌های وارده')} ({incomingMails?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            {tx('نامه‌های صادره')} ({outgoingMails?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            {tx('گواهینامه‌ها و مدارک')} ({companyDocs?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="business-cards" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {tx('کارت‌ویزیت‌ها')}
          </TabsTrigger>
        </TabsList>

        {/* Company Information Tab */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {tx('اطلاعات پایه')}
                </CardTitle>
                <CardDescription>{tx('نام شرکت، لوگو و اطلاعات عمومی')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{tx('نام شرکت (عربی)')}</Label>
                  <Input 
                    id="companyNameAr"
                    value={formData?.companyNameAr || ''} 
                    placeholder={tx('ممتاز شیمی')}
                    onChange={(e) => handleFieldChange('companyNameAr', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('نام شرکت (انگلیسی)')}</Label>
                  <Input 
                    id="companyNameEn"
                    value={formData?.companyNameEn || ''} 
                    placeholder={tx('Momtazchem')}
                    onChange={(e) => handleFieldChange('companyNameEn', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('نام شرکت (ترکی)')}</Label>
                  <Input
                    id="companyNameTr"
                    value={formData?.companyNameTr || ''}
                    onChange={(e) => handleFieldChange('companyNameTr', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('نام تجاری')}</Label>
                  <Input 
                    id="tradeName"
                    value={formData?.tradeName || ''} 
                    placeholder={tx('Al-Entaj Al-Momtaz Company')}
                    onChange={(e) => handleFieldChange('tradeName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('بخش تجاری')}</Label>
                  <Input 
                    id="businessSector"
                    value={formData?.businessSector || ''} 
                    placeholder={tx('Chemical Products Trading')}
                    onChange={(e) => handleFieldChange('businessSector', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('توضیحات کسب‌وکار')}</Label>
                  <Textarea 
                    id="businessDescription"
                    value={formData?.businessDescription || ''} 
                    placeholder={tx('شرح کامل فعالیت‌های تجاری شرکت')}
                    onChange={(e) => handleFieldChange('businessDescription', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('تاریخ تأسیس')}</Label>
                  <Input 
                    id="establishedDate"
                    type="date"
                    value={formData?.establishedDate || ''} 
                    onChange={(e) => handleFieldChange('establishedDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('سایت وب')}</Label>
                  <Input 
                    id="websiteUrl"
                    dir="ltr"
                    value={formData?.websiteUrl || ''} 
                    placeholder="https://momtazchem.com"
                    onChange={(e) => handleFieldChange('websiteUrl', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('لوگوی شرکت')}</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="logoUrl"
                      dir="ltr"
                      value={formData?.logoUrl || ''} 
                      placeholder={tx('آدرس URL لوگو')}
                      onChange={(e) => handleFieldChange('logoUrl', e.target.value)}
                    />
                    <input
                      type="file"
                      id="logoFileInput"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleLogoUpload}
                    />
                    <Button 
                      size="sm" 
                      onClick={() => document.getElementById('logoFileInput')?.click()}
                      disabled={logoUploading}
                    >
                      {logoUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {formData?.logoUrl && (
                    <div className="mt-2">
                      <img 
                        src={formData.logoUrl} 
                        alt={tx('لوگوی شرکت')}
                        className="h-16 w-16 object-contain border rounded-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  {tx('اطلاعات تماس')}
                </CardTitle>
                <CardDescription>{tx('تلفن‌ها، ایمیل‌ها و آدرس‌ها')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="headquarters" className="space-y-5">
                  <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-6">
                    <TabsTrigger value="headquarters">{tx('دفتر مرکزی')}</TabsTrigger>
                    <TabsTrigger value="phones">{tx('تلفن و واتساپ')}</TabsTrigger>
                    <TabsTrigger value="emails">{tx('ایمیل‌ها')}</TabsTrigger>
                    <TabsTrigger value="representative">{tx('نماینده مجاز شرکت')}</TabsTrigger>
                    <TabsTrigger value="hours">{tx('ساعات کاری')}</TabsTrigger>
                    <TabsTrigger value="careers">{tx('فرصت‌های شغلی')}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="representative" className="space-y-4">
                    <div className="space-y-2">
                      <Label>{tx('نام نماینده')}</Label>
                      <Input
                        id="contactPersonName"
                        value={formData?.contactPersonName || ''}
                        onChange={(e) => handleFieldChange('contactPersonName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{tx('سمت نماینده')}</Label>
                      <Input
                        id="contactPersonTitle"
                        value={formData?.contactPersonTitle || ''}
                        onChange={(e) => handleFieldChange('contactPersonTitle', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{tx('تلفن نماینده')}</Label>
                      <Input
                        id="contactPersonPhone"
                        dir="ltr"
                        value={formData?.contactPersonPhone || ''}
                        onChange={(e) => handleFieldChange('contactPersonPhone', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{tx('ایمیل نماینده')}</Label>
                      <Input
                        id="contactPersonEmail"
                        type="email"
                        dir="ltr"
                        value={formData?.contactPersonEmail || ''}
                        onChange={(e) => handleFieldChange('contactPersonEmail', e.target.value)}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="emails" className="space-y-4">
                <div className="space-y-2">
                  <Label>{tx('ایمیل اصلی')}</Label>
                  <Input 
                    id="emailPrimary"
                    dir="ltr"
                    value={formData?.emailPrimary || ''} 
                    placeholder="info@momtazchem.com"
                    onChange={(e) => handleFieldChange('emailPrimary', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('ایمیل فرعی')}</Label>
                  <Input 
                    id="emailSecondary"
                    dir="ltr"
                    value={formData?.emailSecondary || ''} 
                    placeholder="sales@momtazchem.com"
                    onChange={(e) => handleFieldChange('emailSecondary', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('ایمیل پشتیبانی')}</Label>
                  <Input
                    value={formData.contactSettings?.supportEmail || ''}
                    dir="ltr"
                    placeholder="support@momtazchem.com"
                    onChange={(e) => handleContactSettingChange('supportEmail', e.target.value)}
                  />
                </div>
                  </TabsContent>
                  <TabsContent value="phones" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="landingPhone">{tx('تلفن بالای صفحه اصلی')}</Label>
                  <Input
                    id="landingPhone"
                    type="tel"
                    dir="ltr"
                    value={landingPhoneValue}
                    onChange={(e) => handleContactSettingChange('landingPhone', e.target.value)}
                    aria-describedby="landingPhoneHelp"
                  />
                  <p id="landingPhoneHelp" className="text-sm text-muted-foreground">
                    {tx('این شماره در بالای لندینگ پیج نمایش داده می‌شود؛ برای مخفی کردن، آن را خالی و ذخیره کنید.')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{tx('تلفن اصلی')}</Label>
                  <Input 
                    id="phonePrimary"
                    dir="ltr"
                    value={formData?.phonePrimary || ''}
                    placeholder="+964-1-234-5678"
                    onChange={(e) => handleFieldChange('phonePrimary', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('تلفن فرعی')}</Label>
                  <Input 
                    id="phoneSecondary"
                    dir="ltr"
                    value={formData?.phoneSecondary || ''}
                    placeholder="+964-1-234-5679"
                    onChange={(e) => handleFieldChange('phoneSecondary', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('شماره واتساپ')}</Label>
                  <Input
                    value={formData.contactSettings?.whatsappNumber || ''}
                    dir="ltr"
                    placeholder="+9647709996771"
                    onChange={(e) => handleContactSettingChange('whatsappNumber', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('متن وضعیت پاسخگویی')}</Label>
                  <Input
                    value={formData.contactSettings?.phoneAvailability || ''}
                    placeholder={tx('Available on WhatsApp')}
                    onChange={(e) => handleContactSettingChange('phoneAvailability', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('فکس')}</Label>
                  <Input 
                    id="fax"
                    dir="ltr"
                    value={formData?.fax || ''} 
                    placeholder="+964 750 123 4569"
                    onChange={(e) => handleFieldChange('fax', e.target.value)}
                  />
                </div>
                  </TabsContent>
                  <TabsContent value="hours" className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                     {tx('ساعات کاری')}
                  </Label>
                  <div className="space-y-3">
                    <div className="hidden md:grid grid-cols-[100px_180px_1fr_1fr] gap-3 px-3 text-sm font-medium text-muted-foreground">
                       <span>{tx('روز هفته')}</span>
                       <span>{tx('نوع روز')}</span>
                       <span>{tx('شروع کار')}</span>
                       <span>{tx('پایان کار')}</span>
                    </div>
                    {WEEK_DAYS.map(({ key, label }) => {
                      const schedule = formData.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
                      const day = schedule[key];
                      const updateDay = (patch: Partial<WeeklySchedule[WeekDayKey]>) => {
                        handleFieldChange('weeklySchedule', {
                          ...schedule,
                          [key]: { ...day, ...patch },
                        });
                      };

                      return (
                        <div key={key} className="grid grid-cols-1 md:grid-cols-[100px_180px_1fr_1fr] items-center gap-3 rounded-lg border p-3">
                           <Label className="font-semibold">{tx(label)}</Label>
                          <Select value={day.status} onValueChange={(status: DayStatus) => updateDay({ status })}>
                             <SelectTrigger aria-label={`${tx('نوع روز')} ${tx(label)}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                               <SelectItem value="working">{tx('روز کاری')}</SelectItem>
                               <SelectItem value="weekend">{tx('پایان هفته')}</SelectItem>
                               <SelectItem value="holiday">{tx('تعطیل')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="space-y-1">
                             <Label className="md:hidden">{tx('ساعت شروع')}</Label>
                            <Input
                              type="time"
                              step="60"
                              value={day.start}
                              disabled={day.status !== 'working'}
                              onChange={(event) => updateDay({ start: event.target.value })}
                               aria-label={`${tx('ساعت شروع')} ${tx(label)}`}
                            />
                          </div>
                          <div className="space-y-1">
                             <Label className="md:hidden">{tx('ساعت پایان')}</Label>
                            <Input
                              type="time"
                              step="60"
                              value={day.end}
                              disabled={day.status !== 'working'}
                              onChange={(event) => updateDay({ end: event.target.value })}
                               aria-label={`${tx('ساعت پایان')} ${tx(label)}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-sm text-muted-foreground">
                       {tx('برای هر روز می‌توانید وضعیت و ساعت را مستقل تعیین کنید. انتخاب ساعت با دقت یک دقیقه امکان‌پذیر است.')}
                    </p>
                  </div>
                </div>
                  </TabsContent>
                  <TabsContent value="headquarters" className="space-y-4">
                <div className="space-y-2">
                  <Label>{tx('آدرس اصلی')}</Label>
                  <Textarea 
                    id="mainAddress"
                    value={formData?.mainAddress || ''} 
                    placeholder={tx('آدرس کامل شرکت')}
                    onChange={(e) => handleFieldChange('mainAddress', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {([
                    ['addressLine1', 'خط اول کارت آدرس'],
                    ['addressLine2', 'خط دوم کارت آدرس'],
                    ['addressLine3', 'خط سوم کارت آدرس'],
                  ] as const).map(([field, label]) => (
                    <div className="space-y-2" key={field}>
                      <Label>{tx(label)}</Label>
                      <Input
                        value={formData.contactSettings?.[field] || ''}
                        onChange={(e) => handleContactSettingChange(field, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>{tx('لینک موقعیت روی نقشه')}</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={formData.contactSettings?.mapLink || ''}
                      dir="ltr"
                      placeholder={tx('برای انتخاب موقعیت روی نقشه کلیک کنید')}
                      onChange={(e) => handleContactSettingChange('mapLink', e.target.value)}
                      onClick={() => setIsMapPickerOpen(true)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsMapPickerOpen((open) => !open)}
                      className="shrink-0"
                    >
                      <MapPin className="me-2 h-4 w-4" />
                      {isMapPickerOpen ? tx('بستن نقشه') : tx('انتخاب روی نقشه')}
                    </Button>
                  </div>
                  {isMapPickerOpen && (
                    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                      <p className="text-sm text-muted-foreground">
                        {tx('روی هر نقطه از نقشه کلیک کنید؛ نشانگر و لینک موقعیت به‌روزرسانی می‌شوند.')}
                      </p>
                      <MapLocationPicker
                        latitude={selectedLatitude}
                        longitude={selectedLongitude}
                        onChange={handleMapLocationChange}
                      />
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <span className="text-sm font-medium" dir="ltr">
                          {selectedLatitude.toFixed(6)}, {selectedLongitude.toFixed(6)}
                        </span>
                        <Button
                          type="button"
                          onClick={() => updateCompanyInfoMutation.mutate(formData)}
                          disabled={updateCompanyInfoMutation.isPending}
                        >
                          {updateCompanyInfoMutation.isPending ? (
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="me-2 h-4 w-4" />
                          )}
                          {tx('ذخیره موقعیت برای Contact')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{tx('استان')}</Label>
                    <Select
                      value={formData?.province || ''}
                      onValueChange={(value) => handleFieldChange('province', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={tx('انتخاب استان')} />
                      </SelectTrigger>
                      <SelectContent>
                        {provinces?.map((province: any) => (
                          <SelectItem key={province.id} value={province.nameArabic}>
                            {province.nameArabic} ({province.nameEnglish})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{tx('شهر')}</Label>
                    <Select
                      value={formData?.city || ''}
                      onValueChange={(value) => handleFieldChange('city', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={tx('انتخاب شهر')} />
                      </SelectTrigger>
                      <SelectContent>
                        {cities?.map((city: any) => (
                          <SelectItem key={city.id} value={city.nameArabic}>
                            {city.nameArabic} ({city.nameEnglish}) - {city.provinceName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                  </TabsContent>
                  <TabsContent value="careers" className="space-y-4">
                    {([
                      ['careerLine1', 'خط اول فرصت‌های شغلی'],
                      ['careerLine2', 'خط دوم فرصت‌های شغلی'],
                      ['careerLine3', 'خط سوم فرصت‌های شغلی'],
                    ] as const).map(([field, label]) => (
                      <div className="space-y-2" key={field}>
                      <Label>{tx(label)}</Label>
                        <Input
                          value={formData.contactSettings?.[field] || ''}
                          onChange={(e) => handleContactSettingChange(field, e.target.value)}
                        />
                      </div>
                    ))}
                    <div className="space-y-2">
                      <Label>{tx('ایمیل دریافت رزومه')}</Label>
                      <Input
                        value={formData.contactSettings?.careersEmail || ''}
                        dir="ltr"
                        placeholder="careers@momtazchem.com"
                        onChange={(e) => handleContactSettingChange('careersEmail', e.target.value)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tx('عنوان‌ها و توضیحات این کارت به‌صورت خودکار مطابق زبان فعال سایت نمایش داده می‌شوند.')}
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Legal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  {tx('اطلاعات حقوقی')}
                </CardTitle>
                <CardDescription>{tx('شماره ثبت، کد ملی و مدارک قانونی')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{tx('شماره ثبت شرکت')}</Label>
                  <Input 
                    id="registrationNumber"
                    dir="ltr"
                    value={formData?.registrationNumber || ''} 
                    placeholder="123456789"
                    onChange={(e) => handleFieldChange('registrationNumber', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('شماره مالیاتی')}</Label>
                  <Input 
                    id="taxNumber"
                    dir="ltr"
                    value={formData?.taxNumber || ''} 
                    placeholder="987654321"
                    onChange={(e) => handleFieldChange('taxNumber', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('کشور')}</Label>
                  <Input 
                    id="country"
                    value={formData?.country || tx('عراق')}
                    disabled 
                    placeholder={tx('عراق')}
                    className="bg-gray-50"
                  />
                  <div className="text-sm text-muted-foreground">
                    {tx('کشور به‌صورت پیشفرض عراق تنظیم شده است')}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{tx('کد پستی')}</Label>
                  <Input 
                    id="postalCode"
                    dir="ltr"
                    value={formData?.postalCode || ''} 
                    placeholder="12345"
                    onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>



            {/* Company Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {tx('توضیحات شرکت')}
                </CardTitle>
                <CardDescription>{tx('درباره شرکت و فعالیت‌های آن')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{tx('توضیحات تجاری')}</Label>
                  <Textarea 
                    id="businessDescription"
                    value={formData?.businessDescription || ''} 
                    placeholder={tx('شرح کامل فعالیت‌های تجاری شرکت')}
                    rows={3}
                    onChange={(e) => handleFieldChange('businessDescription', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Banking Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  {tx('اطلاعات بانکی')}
                </CardTitle>
                <CardDescription>{tx('حساب‌های بانکی و اطلاعات مالی')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{tx('نام بانک')}</Label>
                  <Input 
                    id="bankName"
                    value={formData?.bankName || ''} 
                    placeholder={tx('بانک ملی عراق')}
                    onChange={(e) => handleFieldChange('bankName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('شماره حساب')}</Label>
                  <Input 
                    id="bankAccount"
                    dir="ltr"
                    value={formData?.bankAccount || ''} 
                    placeholder="1234567890"
                    onChange={(e) => handleFieldChange('bankAccount', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('نام صاحب حساب')}</Label>
                  <Input 
                    id="bankAccountHolder"
                    value={formData?.bankAccountHolder || ''} 
                    placeholder={tx('نام کامل صاحب حساب')}
                    onChange={(e) => handleFieldChange('bankAccountHolder', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('شماره IBAN')}</Label>
                  <Input 
                    id="bankIban"
                    dir="ltr"
                    value={formData?.bankIban || ''} 
                    placeholder="IQ123456789012345678"
                    onChange={(e) => handleFieldChange('bankIban', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx('کد SWIFT')}</Label>
                  <Input 
                    id="bankSwift"
                    dir="ltr"
                    value={formData?.bankSwift || ''} 
                    placeholder="BANKIQ22"
                    onChange={(e) => handleFieldChange('bankSwift', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Manual save section */}
          <div className="flex justify-center">
            <Card className="w-full max-w-md">
              <CardContent className="p-4">
                <div className="text-center space-y-3">
                  {hasUnsavedChanges ? (
                    <div className="flex items-center gap-2 justify-center text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{tx('تغییرات ذخیره نشده‌ای دارید. برای ذخیره در دیتابیس کلیک کنید.')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 justify-center text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">{tx('تمام اطلاعات ذخیره شده است.')}</span>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleSaveCompanyInfo}
                    disabled={!hasUnsavedChanges || updateCompanyInfoMutation.isPending}
                    className="w-full"
                  >
                    {updateCompanyInfoMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin me-2" />
                        {tx('در حال ذخیره...')}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 me-2" />
                        {tx('ذخیره اطلاعات شرکت')}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Incoming Correspondence Tab */}
        <TabsContent value="incoming" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{tx('نامه‌های وارده')}</h2>
            <Button onClick={() => setIsAddingIncoming(true)}>
              <Plus className="h-4 w-4 me-1" />
              {tx('نامه جدید')}
            </Button>
          </div>

          <div className="grid gap-4">
            {incomingMails?.map((mail) => (
              <Card key={mail.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="h-4 w-4 text-gray-500" />
                         <span className="text-sm font-mono text-gray-600" dir="ltr">{mail.referenceNumber}</span>
                        {getPriorityBadge(mail.priority)}
                        {getStatusBadge(mail.status)}
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{mail.subject}</h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{mail.senderName} ({mail.senderOrganization})</span>
                        </div>
                        {mail.senderEmail && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                           <span dir="ltr">{mail.senderEmail}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(mail.dateReceived)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" aria-label={tx('ویرایش')} title={tx('ویرایش')}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" aria-label={tx('دانلود فایل')} title={tx('دانلود فایل')}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {mail.content && (
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{mail.content}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Outgoing Correspondence Tab */}
        <TabsContent value="outgoing" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{tx('نامه‌های صادره')}</h2>
            <Button onClick={() => setIsAddingOutgoing(true)}>
              <Plus className="h-4 w-4 me-1" />
              {tx('نامه جدید')}
            </Button>
          </div>

          <div className="grid gap-4">
            {outgoingMails?.map((mail) => (
              <Card key={mail.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="h-4 w-4 text-gray-500" />
                         <span className="text-sm font-mono text-gray-600" dir="ltr">{mail.referenceNumber}</span>
                        {getPriorityBadge(mail.priority)}
                        {getStatusBadge(mail.status)}
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{mail.subject}</h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{mail.recipientName} ({mail.recipientOrganization})</span>
                        </div>
                        {mail.recipientEmail && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                           <span dir="ltr">{mail.recipientEmail}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(mail.dateSent)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" aria-label={tx('ویرایش')} title={tx('ویرایش')}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" aria-label={tx('دانلود فایل')} title={tx('دانلود فایل')}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {mail.content && (
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{mail.content}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Company Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{tx('گواهینامه‌ها و مدارک شرکت')}</h2>
            <Button onClick={() => {
              setEditingItem(null);
              setCertificateFileUrl('');
              setCertificateExpiryDate('');
              setIsAddingDocument(true);
            }}>
              <Plus className="h-4 w-4 me-1" />
              {tx('گواهینامه جدید')}
            </Button>
          </div>

          <div className="grid gap-4">
            {companyDocs?.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileCheck className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">{doc.documentName}</span>
                        {getStatusBadge(doc.status)}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                         <div>{tx('نوع:')} {translateEnum(doc.documentType)}</div>
                         {doc.documentNumber && <div>{tx('شماره:')} <span dir="ltr">{doc.documentNumber}</span></div>}
                         {doc.issuingAuthority && <div>{tx('صادرکننده:')} {doc.issuingAuthority}</div>}
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <div className="flex items-center gap-2 rounded-md border bg-gray-50 px-3 py-2">
                            <Calendar className="h-4 w-4 text-blue-600" />
                             <span className="font-medium text-gray-700">{tx('تاریخ صدور:')}</span>
                             <span>{formatDate(doc.issueDate)}</span>
                          </div>
                          <div className="flex items-center gap-2 rounded-md border bg-amber-50 px-3 py-2">
                            <Clock className="h-4 w-4 text-amber-600" />
                             <span className="font-medium text-gray-700">{tx('تاریخ انقضا:')}</span>
                            <span className={doc.expiryDate ? 'text-gray-900' : 'text-gray-500'}>
                              {doc.expiryDate
                                 ? formatDate(doc.expiryDate)
                                 : tx('ثبت نشده')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={doc.fileUrl}
                          download={doc.documentName}
                           aria-label={`${tx('دانلود فایل')} ${doc.documentName}`}
                           title={tx('دانلود فایل')}
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                         aria-label={`${tx('ویرایش')} ${doc.documentName}`}
                         title={tx('ویرایش گواهینامه')}
                        onClick={() => {
                          setEditingItem(doc);
                          setCertificateFileUrl(doc.fileUrl);
                          setCertificateExpiryDate(doc.expiryDate ? doc.expiryDate.slice(0, 10) : '');
                          setIsAddingDocument(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {doc.description && (
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{doc.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Business Cards Tab */}
        <TabsContent value="business-cards" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                     {tx('کارت‌ویزیت‌های دریافتی')}
                  </CardTitle>
                   <CardDescription>{tx('مدیریت و مشاهده کارت‌ویزیت‌های دریافت شده از مشتریان و شرکا')}</CardDescription>
                </div>
                <Button onClick={() => setIsAddingBusinessCard(true)}>
                  <Plus className="h-4 w-4 me-2" />
                   {tx('آپلود کارت‌ویزیت جدید')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterBySearch(businessCards || [], ['employeeName', 'jobTitle', 'mobile', 'email', 'specialNotes']).map((card) => (
                  <div key={card.id} className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                    <div className="aspect-[5/3] bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
                      {card.cardDesignUrl ? (
                        <img 
                          src={card.cardDesignUrl} 
                           alt={`${tx('تصویر کارت‌ویزیت')} ${card.employeeName}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-card.jpg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <User className="h-8 w-8 mx-auto mb-2" />
                             <p className="text-xs">{tx('تصویر کارت‌ویزیت')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">{card.employeeName}</h4>
                      <p className="text-xs text-gray-600">{card.jobTitle}</p>
                      {card.department && (
                        <p className="text-xs text-blue-600 font-medium">{card.department}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-1 text-xs">
                        {card.mobile && (
                          <Badge variant="outline" className="text-xs">
                             <span dir="ltr">📞 {card.mobile}</span>
                          </Badge>
                        )}
                        {card.email && (
                          <Badge variant="outline" className="text-xs">
                             <span dir="ltr">✉️ {card.email}</span>
                          </Badge>
                        )}
                      </div>
                      
                      {card.specialNotes && (
                        <p className="text-xs text-gray-500 line-clamp-2">{card.specialNotes}</p>
                      )}
                      
                      <div className="flex justify-between items-center pt-2">
                        <Badge variant="outline" className="text-xs">
                           {formatDate(card.createdAt)}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedImageView(card)}
                             title={tx('مشاهده')}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingItem(card);
                              setIsAddingBusinessCard(true);
                            }}
                             title={tx('ویرایش')}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                               if (window.confirm(tx('آیا مطمئن هستید که می‌خواهید این کارت‌ویزیت را حذف کنید؟'))) {
                                deleteBusinessCardMutation.mutate(card.id!);
                              }
                            }}
                            disabled={deleteBusinessCardMutation.isPending}
                             title={tx('حذف')}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {(!businessCards || businessCards.length === 0) && (
                <div className="text-center py-12 text-gray-500">
                  <User className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                   <h3 className="text-lg font-medium mb-2">{tx('هنوز کارت‌ویزیتی آپلود نشده')}</h3>
                   <p className="text-sm mb-4">{tx('کارت‌ویزیت‌های دریافتی از مشتریان و شرکا را اینجا آپلود کنید')}</p>
                  <Button onClick={() => setIsAddingBusinessCard(true)}>
                    <Plus className="h-4 w-4 me-2" />
                     {tx('اولین کارت‌ویزیت را آپلود کنید')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Images Tab */}
        <TabsContent value="images" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                     {tx('تصاویر شرکت')}
                  </CardTitle>
                   <CardDescription>{tx('مدیریت تصاویر و گالری شرکت')}</CardDescription>
                </div>
                <Button onClick={() => setIsAddingImage(true)}>
                  <Plus className="h-4 w-4 me-2" />
                   {tx('افزودن تصویر جدید')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterBySearch(companyImages || [], ['title', 'description', 'category', 'tags']).map((image) => (
                  <div key={image.id} className="border rounded-lg p-4 space-y-3">
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={image.imageUrl} 
                        alt={image.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.jpg';
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">{image.title}</h4>
                      <p className="text-xs text-gray-600 line-clamp-2">{image.description}</p>
                      <div className="flex justify-between items-center">
                        <Badge variant="outline" className="text-xs">
                           {translateEnum(image.category)}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedImageView(image)}
                            aria-label={tx('مشاهده')}
                            title={tx('مشاهده')}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingItem(image);
                              setIsAddingImage(true);
                            }}
                            aria-label={tx('ویرایش')}
                            title={tx('ویرایش')}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteImageMutation.mutate(image.id!)}
                            aria-label={tx('حذف')}
                            title={tx('حذف')}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!companyImages || companyImages.length === 0) && !searchQuery && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <Image className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                     <p>{tx('هیچ تصویری موجود نیست')}</p>
                  </div>
                )}

                {searchQuery && filterBySearch(companyImages || [], ['title', 'description', 'category', 'tags']).length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                     <p>{tx('نتیجه‌ای برای')} "{searchQuery}" {tx('پیدا نشد')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Company Certification Upload Dialog */}
      <Dialog open={isAddingDocument} onOpenChange={(open) => {
        setIsAddingDocument(open);
        if (!open) {
          setCertificateFileUrl('');
          setCertificateExpiryDate('');
          setEditingItem(null);
        }
      }}>
      <DialogContent dir={direction} className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? tx('ویرایش گواهینامه شرکت') : tx('افزودن گواهینامه شرکت')}</DialogTitle>
            <DialogDescription>
              {editingItem
                 ? tx('اطلاعات گواهینامه را ویرایش کنید. در صورت نیاز می‌توانید فایل آن را نیز جایگزین کنید.')
                 : tx('اطلاعات گواهینامه را وارد کرده و تصویر یا فایل PDF آن را آپلود کنید.')}
            </DialogDescription>
          </DialogHeader>
          <form key={editingItem?.id || 'new-certificate'} onSubmit={(event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            if (!certificateFileUrl) {
               toast({ title: tx('فایل الزامی است'), description: tx('ابتدا فایل گواهینامه را آپلود کنید'), variant: "destructive" });
              return;
            }
            const certificateData: CompanyDocument = {
              documentName: values.get('documentName') as string,
              documentType: 'certificate',
              documentNumber: (values.get('documentNumber') as string) || '—',
              issueDate: values.get('issueDate') as string,
              expiryDate: certificateExpiryDate || null,
              issuingAuthority: values.get('issuingAuthority') as string,
              fileUrl: certificateFileUrl,
              status: 'active',
              description: values.get('description') as string,
              tags: 'public-certification',
            };
            if (editingItem?.id) {
              updateCertificateMutation.mutate({ id: editingItem.id, data: certificateData });
            } else {
              addCertificateMutation.mutate(certificateData);
            }
          }}>
            <div className="space-y-4">
              <div className="space-y-2">
                 <Label htmlFor="certificateName">{tx('نام گواهینامه *')}</Label>
                <Input id="certificateName" name="documentName" required placeholder="ISO 9001:2015" defaultValue={editingItem?.documentName || ''} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label>{tx('شماره گواهینامه')}</Label>
                   <Input name="documentNumber" placeholder={tx('شماره مدرک')} defaultValue={editingItem?.documentNumber || ''} />
                </div>
                <div className="space-y-2">
                   <Label>{tx('مرجع صادرکننده *')}</Label>
                   <Input name="issuingAuthority" required placeholder={tx('مرجع صادرکننده')} defaultValue={editingItem?.issuingAuthority || ''} />
                </div>
                <div className="space-y-2">
                   <Label>{tx('تاریخ صدور:')} *</Label>
                  <Input name="issueDate" type="date" required defaultValue={editingItem?.issueDate ? editingItem.issueDate.slice(0, 10) : ''} />
                </div>
                <div className="space-y-2">
                   <Label>{tx('تاریخ انقضا:')}</Label>
                  <Input
                    name="expiryDate"
                    type="date"
                    value={certificateExpiryDate}
                    onChange={(event) => setCertificateExpiryDate(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                 <Label>{tx('توضیحات')}</Label>
                 <Textarea name="description" placeholder={tx('توضیحات گواهینامه')} defaultValue={editingItem?.description || ''} />
              </div>
              <div className="space-y-2">
                 <Label>{tx('فایل گواهینامه *')}</Label>
                <Input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  disabled={certificateUploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleCertificateUpload(file);
                  }}
                />
                 {certificateUploading && <p className="text-sm text-blue-600">{tx('در حال آپلود فایل...')}</p>}
                {certificateFileUrl && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    {editingItem && certificateFileUrl === editingItem.fileUrl
                       ? tx('فایل فعلی حفظ می‌شود')
                       : tx('فایل با موفقیت آپلود شد')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
               <Button type="button" variant="outline" onClick={() => setIsAddingDocument(false)}>{tx('انصراف')}</Button>
              <Button
                type="submit"
                disabled={certificateUploading || addCertificateMutation.isPending || updateCertificateMutation.isPending}
              >
                {addCertificateMutation.isPending || updateCertificateMutation.isPending
                   ? tx('در حال ذخیره...')
                   : editingItem ? tx('ذخیره تغییرات') : tx('ثبت گواهینامه')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Business Card Upload Dialog */}
      <Dialog open={isAddingBusinessCard} onOpenChange={setIsAddingBusinessCard}>
        <DialogContent dir={direction} className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
               {editingItem ? tx('ویرایش کارت‌ویزیت دریافتی') : tx('آپلود کارت‌ویزیت جدید')}
            </DialogTitle>
            <DialogDescription>
               {tx('کارت‌ویزیت دریافت شده از مشتری یا شریک تجاری را آپلود کنید')}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const businessCardData: BusinessCard = {
              employeeName: formData.get('employeeName') as string,
              jobTitle: formData.get('jobTitle') as string,
              department: formData.get('department') as string || undefined,
              mobile: formData.get('mobile') as string || undefined,
              email: formData.get('email') as string || undefined,
              specialNotes: formData.get('specialNotes') as string || undefined,
              cardDesignUrl: formData.get('cardDesignUrl') as string || undefined,
              // Set default values for upload system
              cardDesign: 'standard',
              cardColor: 'blue',
              includeQrCode: false,
              printQuantity: 1,
              isActive: true,
              cardStatus: 'active'
            };

            if (editingItem) {
              updateBusinessCardMutation.mutate({ id: editingItem.id, data: businessCardData });
            } else {
              addBusinessCardMutation.mutate(businessCardData);
            }
          }}>
            <div className="space-y-6">
              {/* Card Image Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-medium">{tx('تصویر کارت‌ویزیت')}</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                         <span className="font-semibold">{tx('کلیک کنید تا آپلود کنید')}</span>
                      </p>
                       <p className="text-xs text-gray-500">{tx('PNG، JPG یا JPEG (حداکثر 5MB)')}</p>
                    </div>
                    <input 
                      name="cardImage" 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                    />
                  </label>
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="block text-sm font-medium">{tx('نام فرد *')}</label>
                  <input
                    name="employeeName"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingItem?.employeeName || ''}
                    placeholder={tx('نام شخص روی کارت‌ویزیت')}
                  />
                </div>

                <div className="space-y-2">
                   <label className="block text-sm font-medium">{tx('سمت/موقعیت *')}</label>
                  <input
                    name="jobTitle"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingItem?.jobTitle || ''}
                    placeholder={tx('سمت شغلی')}
                  />
                </div>

                <div className="space-y-2">
                   <label className="block text-sm font-medium">{tx('نام شرکت')}</label>
                  <input
                    name="department"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingItem?.department || ''}
                    placeholder={tx('نام شرکت یا سازمان')}
                  />
                </div>

                <div className="space-y-2">
                   <label className="block text-sm font-medium">{tx('شماره تماس')}</label>
                  <input
                    name="mobile"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingItem?.mobile || ''}
                    placeholder={tx('شماره موبایل یا تلفن')}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                   <label className="block text-sm font-medium">{tx('ایمیل')}</label>
                  <input
                    name="email"
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingItem?.email || ''}
                    placeholder={tx('آدرس ایمیل')}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                   <label className="block text-sm font-medium">{tx('یادداشت‌ها')}</label>
                <textarea
                  name="specialNotes"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={editingItem?.specialNotes || ''}
                  placeholder={tx('یادداشت‌های اضافی در مورد این کارت‌ویزیت یا شخص...')}
                />
              </div>

              {/* URL Field for uploaded image */}
              <input
                name="cardDesignUrl"
                type="hidden"
                defaultValue={editingItem?.cardDesignUrl || ''}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingBusinessCard(false);
                  setEditingItem(null);
                }}
              >
                 {tx('انصراف')}
              </Button>
              <Button 
                type="submit" 
                disabled={addBusinessCardMutation.isPending || updateBusinessCardMutation.isPending}
              >
                {addBusinessCardMutation.isPending || updateBusinessCardMutation.isPending ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                     {tx('در حال پردازش...')}
                  </>
                ) : editingItem ? (
                   tx('به‌روزرسانی کارت‌ویزیت')
                ) : (
                   tx('ذخیره کارت‌ویزیت')
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Company Image Add/Edit Dialog */}
      <Dialog open={isAddingImage} onOpenChange={setIsAddingImage}>
        <DialogContent dir={direction} className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
               {editingItem ? tx('ویرایش تصویر') : tx('افزودن تصویر جدید')}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const imageData: CompanyImage = {
              title: formData.get('title') as string,
              description: formData.get('description') as string,
              imageUrl: formData.get('imageUrl') as string,
              category: formData.get('category') as string,
              tags: formData.get('tags') as string || undefined,
              isActive: formData.get('isActive') === 'on'
            };

            if (editingItem) {
              updateImageMutation.mutate({ id: editingItem.id, data: imageData });
            } else {
              addImageMutation.mutate(imageData);
            }
          }}>
            <div className="space-y-4">
              <div className="space-y-2">
                 <label className="block text-sm font-medium">{tx('عنوان تصویر *')}</label>
                <input
                  name="title"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={editingItem?.title || ''}
                  placeholder={tx('عنوان تصویر...')}
                />
              </div>

              <div className="space-y-2">
                 <label className="block text-sm font-medium">{tx('توضیحات *')}</label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={editingItem?.description || ''}
                  placeholder={tx('توضیحات کامل تصویر...')}
                />
              </div>

              <div className="space-y-2">
                 <label className="block text-sm font-medium">{tx('URL تصویر *')}</label>
                <input
                  name="imageUrl"
                  type="url"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={editingItem?.imageUrl || ''}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="space-y-2">
                 <label className="block text-sm font-medium">{tx('دسته‌بندی *')}</label>
                <Select name="category" defaultValue={editingItem?.category || ''}>
                  <SelectTrigger>
                     <SelectValue placeholder={tx('انتخاب دسته‌بندی')} />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="logo">{tx('لوگو')}</SelectItem>
                     <SelectItem value="building">{tx('ساختمان')}</SelectItem>
                     <SelectItem value="products">{tx('محصولات')}</SelectItem>
                     <SelectItem value="team">{tx('تیم')}</SelectItem>
                     <SelectItem value="certificates">{tx('گواهینامه‌ها')}</SelectItem>
                     <SelectItem value="equipment">{tx('تجهیزات')}</SelectItem>
                     <SelectItem value="gallery">{tx('گالری')}</SelectItem>
                     <SelectItem value="other">{tx('سایر')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                 <label className="block text-sm font-medium">{tx('برچسب‌ها')}</label>
                <input
                  name="tags"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={editingItem?.tags || ''}
                  placeholder={tx('برچسب1, برچسب2, برچسب3')}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  name="isActive"
                  type="checkbox"
                  id="imageIsActive"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  defaultChecked={editingItem?.isActive ?? true}
                />
                <label htmlFor="imageIsActive" className="text-sm font-medium">
                   {tx('فعال')}
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => {
                setIsAddingImage(false);
                setEditingItem(null);
              }}>
                 {tx('انصراف')}
              </Button>
              <Button 
                type="submit" 
                disabled={addImageMutation.isPending || updateImageMutation.isPending}
              >
                 {addImageMutation.isPending || updateImageMutation.isPending ? tx('در حال ذخیره...') : editingItem ? tx('به‌روزرسانی') : tx('ذخیره')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image View Dialog */}
      <Dialog open={!!selectedImageView} onOpenChange={() => setSelectedImageView(null)}>
        <DialogContent dir={direction} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedImageView?.title}</DialogTitle>
            <DialogDescription>{selectedImageView?.description}</DialogDescription>
          </DialogHeader>
          
          {selectedImageView && (
            <div className="space-y-4">
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <img 
                  src={selectedImageView.imageUrl} 
                  alt={selectedImageView.title}
                  className="w-full h-full object-contain"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                   <span className="font-medium">{tx('دسته‌بندی:')}</span>
                   <Badge variant="outline" className="ms-2">
                    {selectedImageView.category}
                  </Badge>
                </div>
                {selectedImageView.tags && (
                  <div>
                   <span className="font-medium">{tx('برچسب‌ها')}:</span>
                   <span className="ms-2">{selectedImageView.tags}</span>
                  </div>
                )}
                {selectedImageView.uploadedAt && (
                  <div>
                   <span className="font-medium">{tx('تاریخ آپلود:')}</span>
                   <span className="ms-2">{formatDate(selectedImageView.uploadedAt)}</span>
                  </div>
                )}
                <div>
                   <span className="font-medium">{tx('وضعیت:')}</span>
                   <Badge variant={selectedImageView.isActive ? "default" : "secondary"} className="ms-2">
                     {selectedImageView.isActive ? tx('فعال') : tx('غیرفعال')}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}