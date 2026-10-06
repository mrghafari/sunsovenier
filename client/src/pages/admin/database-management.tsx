import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table as DataTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Database, 
  Download, 
  RefreshCw, 
  HardDrive,
  Table,
  FileDown,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Trash2,
  Plus,
  Calendar,
  XCircle,
  Loader2,
  Edit,
  RotateCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

type Language = "en" | "fa" | "ar" | "tr";
const copy: Record<Language, Record<string, string>> = {
  en: {
    authError: "Authentication error", signIn: "Please sign in", title: "Database Management", back: "Back to Dashboard",
    statsError: "Error loading database statistics", databaseSize: "Database Size", tablesCount: "Tables Count", totalRecords: "Total Records", backupsCount: "Backups Count",
    backupManagement: "Backup Management", manual: "Manual Backups (Local)", automation: "S3 Backups & Automation", backupError: "Error loading backups", createBackup: "Create New Backup", loading: "Loading...", noBackups: "No backups available", download: "Download", restore: "Restore", cancel: "Cancel", delete: "Delete", warning: "Warning", confirmRestore: "To confirm, type", restoreWarning: "This action cannot be undone. All current data will be replaced with the backup data.", deleteBackup: "Delete Backup File", deleteBackupQuestion: "Are you sure you want to delete this backup file? This action cannot be undone.",
    s3Error: "Error loading S3 data", s3Backups: "S3 Backups", createS3: "Create Manual S3 Backup", loadingS3: "Loading S3 backups...", noS3: "No S3 backups available", fileName: "File Name", size: "Size", type: "Type", status: "Status", created: "Created", actions: "Actions", restoreS3: "Restore S3 Backup", restoreS3Question: "Are you sure you want to restore this backup? This will replace all current data!", deleteS3: "Delete S3 Backup", deleteS3Question: "Are you sure you want to delete this backup? This action cannot be undone.",
    schedules: "Backup Schedules", createSchedule: "Create Schedule", loadingSchedules: "Loading schedules...", noSchedules: "No backup schedules configured", name: "Name", frequency: "Frequency", time: "Time", retention: "Retention", lastRun: "Last Run", nextRun: "Next Run", active: "Active", inactive: "Inactive", never: "Never", notAvailable: "N/A", days: "days", activate: "Activate", deactivate: "Deactivate", deleteSchedule: "Delete Schedule", deleteScheduleQuestion: "Are you sure you want to delete this schedule?",
    editSchedule: "Edit Backup Schedule", newSchedule: "Create Backup Schedule", configureSchedule: "Configure automated backup schedule settings", daily: "Daily", weekly: "Weekly", monthly: "Monthly", timeOfDay: "Time of Day", dayOfWeek: "Day of Week", selectDay: "Select day", dayOfMonth: "Day of Month", retentionDays: "Retention Days", oldBackups: "Backups older than this will be automatically deleted", update: "Update", create: "Create",
    completed: "Completed", inProgress: "In Progress", failed: "Failed", pending: "Pending", tableStats: "Database Table Statistics", records: "records", unknown: "Unknown", unknownSize: "Unknown size", inserts: "Inserts", updates: "Updates", deletes: "Deletes", liveRows: "Live Rows", showingTables: "Showing top 15 tables by size. Total tables:", setup: "Personal System Setup Guide", setupSteps: "Setup steps:", installPostgres: "Install PostgreSQL", createDb: "Create a new database", downloadRestore: "Download and restore the backup file", setDbUrl: "Set the DATABASE_URL variable", runCommands: "Run npm install and npm run dev", guideAvailable: "Complete setup guide available in the project folder:",
    createdToast: "Backup created", createdDesc: "New backup created successfully", errorCreate: "Error creating backup", errorCreateDesc: "There was a problem creating the backup", deletedToast: "Backup deleted", deletedDesc: "File was deleted successfully", errorDelete: "Error deleting backup", errorDeleteDesc: "There was a problem deleting the backup file", restoredToast: "Backup restored", restoredDesc: "Backup restored successfully", errorRestore: "Error restoring backup", errorRestoreDesc: "There was a problem restoring the backup", downloadStarted: "Download started", downloading: "File is downloading", scheduleCreated: "Schedule created", scheduleUpdated: "Schedule updated", scheduleDeleted: "Schedule deleted", scheduleError: "Schedule operation failed", scheduleSuccess: "Backup schedule operation completed", s3Created: "S3 backup created", s3Deleted: "S3 backup deleted", s3Restored: "S3 backup restored"
  },
  fa: {
    authError: "خطای احراز هویت", signIn: "لطفاً وارد سیستم شوید", title: "مدیریت دیتابیس", back: "بازگشت به داشبورد", statsError: "خطا در بارگذاری آمار دیتابیس", databaseSize: "حجم دیتابیس", tablesCount: "تعداد جداول", totalRecords: "مجموع رکوردها", backupsCount: "تعداد بک‌آپ‌ها", backupManagement: "مدیریت بک‌آپ", manual: "بک‌آپ‌های دستی (محلی)", automation: "بک‌آپ‌های S3 و خودکار", backupError: "خطا در بارگذاری بک‌آپ‌ها", createBackup: "ایجاد بک‌آپ جدید", loading: "در حال بارگذاری...", noBackups: "هیچ بک‌آپی موجود نیست", download: "دانلود", restore: "بازگردانی", cancel: "لغو", delete: "حذف", warning: "هشدار", confirmRestore: "برای تأیید، عبارت", restoreWarning: "این عمل غیرقابل بازگشت است. تمامی داده‌های فعلی با داده‌های بک‌آپ جایگزین خواهند شد.", deleteBackup: "حذف فایل بک‌آپ", deleteBackupQuestion: "آیا مطمئن هستید که می‌خواهید این فایل بک‌آپ را حذف کنید؟ این عمل قابل بازگشت نیست.", s3Error: "خطا در بارگذاری داده‌های S3", s3Backups: "بک‌آپ‌های S3", createS3: "ایجاد بک‌آپ دستی S3", loadingS3: "در حال بارگذاری بک‌آپ‌های S3...", noS3: "هیچ بک‌آپ S3 موجود نیست", fileName: "نام فایل", size: "حجم", type: "نوع", status: "وضعیت", created: "ایجادشده", actions: "عملیات", restoreS3: "بازگردانی بک‌آپ S3", restoreS3Question: "آیا مطمئن هستید که می‌خواهید این بک‌آپ را بازگردانی کنید؟ تمام داده‌های فعلی جایگزین می‌شوند!", deleteS3: "حذف بک‌آپ S3", deleteS3Question: "آیا مطمئن هستید که می‌خواهید این بک‌آپ را حذف کنید؟ این عمل قابل بازگشت نیست.", schedules: "زمان‌بندی بک‌آپ", createSchedule: "ایجاد زمان‌بندی", loadingSchedules: "در حال بارگذاری زمان‌بندی‌ها...", noSchedules: "هیچ زمان‌بندی بک‌آپی تنظیم نشده است", name: "نام", frequency: "تکرار", time: "زمان", retention: "نگهداری", lastRun: "آخرین اجرا", nextRun: "اجرای بعدی", active: "فعال", inactive: "غیرفعال", never: "هرگز", notAvailable: "نامشخص", days: "روز", activate: "فعال‌سازی", deactivate: "غیرفعال‌سازی", deleteSchedule: "حذف زمان‌بندی", deleteScheduleQuestion: "آیا مطمئن هستید که می‌خواهید این زمان‌بندی را حذف کنید؟", editSchedule: "ویرایش زمان‌بندی بک‌آپ", newSchedule: "ایجاد زمان‌بندی بک‌آپ", configureSchedule: "تنظیمات زمان‌بندی خودکار بک‌آپ", daily: "روزانه", weekly: "هفتگی", monthly: "ماهانه", timeOfDay: "ساعت", dayOfWeek: "روز هفته", selectDay: "انتخاب روز", dayOfMonth: "روز ماه", retentionDays: "روزهای نگهداری", oldBackups: "بک‌آپ‌های قدیمی‌تر از این مقدار به‌صورت خودکار حذف می‌شوند", update: "به‌روزرسانی", create: "ایجاد", completed: "تکمیل‌شده", inProgress: "در حال انجام", failed: "ناموفق", pending: "در انتظار", tableStats: "آمار جداول دیتابیس", records: "رکورد", unknown: "نامشخص", unknownSize: "حجم نامشخص", inserts: "درج", updates: "به‌روزرسانی", deletes: "حذف", liveRows: "ردیف‌های فعال", showingTables: "۱۵ جدول بزرگ‌تر بر اساس حجم نمایش داده می‌شود. مجموع جداول:", setup: "راهنمای نصب در سیستم شخصی", setupSteps: "مراحل نصب:", installPostgres: "PostgreSQL را نصب کنید", createDb: "یک دیتابیس جدید ایجاد کنید", downloadRestore: "فایل بک‌آپ را دانلود و بازیابی کنید", setDbUrl: "متغیر DATABASE_URL را تنظیم کنید", runCommands: "npm install و npm run dev را اجرا کنید", guideAvailable: "فایل راهنمای کامل در پوشه پروژه موجود است:", createdToast: "بک‌آپ ایجاد شد", createdDesc: "بک‌آپ جدید با موفقیت ایجاد شد", errorCreate: "خطا در ایجاد بک‌آپ", errorCreateDesc: "مشکلی در ایجاد بک‌آپ رخ داده است", deletedToast: "بک‌آپ حذف شد", deletedDesc: "فایل با موفقیت حذف شد", errorDelete: "خطا در حذف بک‌آپ", errorDeleteDesc: "مشکلی در حذف فایل بک‌آپ رخ داده است", restoredToast: "بک‌آپ بازگردانی شد", restoredDesc: "بک‌آپ با موفقیت بازگردانی شد", errorRestore: "خطا در بازگردانی بک‌آپ", errorRestoreDesc: "مشکلی در بازگردانی بک‌آپ رخ داده است", downloadStarted: "دانلود شروع شد", downloading: "فایل در حال دانلود است", scheduleCreated: "زمان‌بندی ایجاد شد", scheduleUpdated: "زمان‌بندی به‌روزرسانی شد", scheduleDeleted: "زمان‌بندی حذف شد", scheduleError: "عملیات زمان‌بندی ناموفق بود", scheduleSuccess: "عملیات زمان‌بندی بک‌آپ با موفقیت انجام شد", s3Created: "بک‌آپ S3 ایجاد شد", s3Deleted: "بک‌آپ S3 حذف شد", s3Restored: "بک‌آپ S3 بازگردانی شد"
  },
  ar: {}, tr: {}
};
// Keep every key available in every locale; the overlays below localize the
// page-specific vocabulary while technical identifiers remain unchanged.
copy.ar = { ...copy.en, restoreS3Question: "هل أنت متأكد من استعادة هذه النسخة؟ سيتم استبدال جميع البيانات الحالية!", deleteS3Question: "هل أنت متأكد من حذف هذه النسخة؟ لا يمكن التراجع عن هذا الإجراء.", deleteBackupQuestion: "هل أنت متأكد من حذف ملف النسخة الاحتياطية هذا؟ لا يمكن التراجع عن هذا الإجراء.", deleteScheduleQuestion: "هل أنت متأكد من حذف هذه الجدولة؟", authError: "خطأ في المصادقة", signIn: "يرجى تسجيل الدخول", title: "إدارة قاعدة البيانات", back: "العودة إلى لوحة التحكم", databaseSize: "حجم قاعدة البيانات", tablesCount: "عدد الجداول", totalRecords: "إجمالي السجلات", backupsCount: "عدد النسخ الاحتياطية", backupManagement: "إدارة النسخ الاحتياطية", manual: "نسخ احتياطية يدوية (محلية)", automation: "نسخ S3 الاحتياطية والأتمتة", loading: "جارٍ التحميل...", noBackups: "لا توجد نسخ احتياطية", download: "تنزيل", restore: "استعادة", cancel: "إلغاء", delete: "حذف", warning: "تحذير", status: "الحالة", actions: "الإجراءات", created: "تاريخ الإنشاء", schedules: "جدولة النسخ الاحتياطي", createSchedule: "إنشاء جدولة", noSchedules: "لم يتم إعداد أي جدولة", name: "الاسم", frequency: "التكرار", time: "الوقت", retention: "الاحتفاظ", lastRun: "آخر تشغيل", nextRun: "التشغيل التالي", active: "نشط", inactive: "غير نشط", never: "أبدًا", days: "أيام", activate: "تفعيل", deactivate: "تعطيل", daily: "يومي", weekly: "أسبوعي", monthly: "شهري", dayOfWeek: "يوم الأسبوع", dayOfMonth: "يوم الشهر", retentionDays: "أيام الاحتفاظ", create: "إنشاء", update: "تحديث", completed: "مكتمل", inProgress: "قيد التنفيذ", failed: "فشل", pending: "معلق", tableStats: "إحصاءات جداول قاعدة البيانات", records: "سجلات", inserts: "إدخالات", updates: "تحديثات", deletes: "عمليات حذف", liveRows: "صفوف حية", setup: "دليل الإعداد على النظام الشخصي", setupSteps: "خطوات الإعداد", createDb: "إنشاء قاعدة بيانات جديدة", downloadRestore: "تنزيل ملف النسخة الاحتياطية واستعادته", guideAvailable: "يتوفر دليل الإعداد الكامل في مجلد المشروع:" };
copy.tr = { ...copy.en, authError: "Kimlik doğrulama hatası", signIn: "Lütfen giriş yapın", title: "Veritabanı Yönetimi", back: "Kontrol Paneline Dön", databaseSize: "Veritabanı Boyutu", tablesCount: "Tablo Sayısı", totalRecords: "Toplam Kayıt", backupsCount: "Yedek Sayısı", backupManagement: "Yedek Yönetimi", manual: "Elle Yedekler (Yerel)", automation: "S3 Yedekleri ve Otomasyon", loading: "Yükleniyor...", noBackups: "Yedek bulunamadı", download: "İndir", restore: "Geri Yükle", cancel: "İptal", delete: "Sil", warning: "Uyarı", status: "Durum", actions: "İşlemler", created: "Oluşturulma", schedules: "Yedekleme Zamanlamaları", createSchedule: "Zamanlama Oluştur", noSchedules: "Yedekleme zamanlaması yapılandırılmadı", name: "Ad", frequency: "Sıklık", time: "Saat", retention: "Saklama", lastRun: "Son Çalışma", nextRun: "Sonraki Çalışma", active: "Etkin", inactive: "Etkin değil", never: "Asla", days: "gün", activate: "Etkinleştir", deactivate: "Devre dışı bırak", daily: "Günlük", weekly: "Haftalık", monthly: "Aylık", dayOfWeek: "Haftanın Günü", dayOfMonth: "Ayın Günü", retentionDays: "Saklama Günleri", create: "Oluştur", update: "Güncelle", completed: "Tamamlandı", inProgress: "Devam ediyor", failed: "Başarısız", pending: "Beklemede", tableStats: "Veritabanı Tablo İstatistikleri", records: "kayıt", inserts: "Eklemeler", updates: "Güncellemeler", deletes: "Silmeler", liveRows: "Canlı Satırlar", setup: "Kişisel Sistem Kurulum Rehberi", setupSteps: "Kurulum adımları", createDb: "Yeni bir veritabanı oluşturun", downloadRestore: "Yedek dosyasını indirin ve geri yükleyin", guideAvailable: "Tam kurulum rehberi proje klasöründe:" };
Object.assign(copy.ar, { statsError: "تعذر تحميل إحصاءات قاعدة البيانات", backupError: "تعذر تحميل النسخ الاحتياطية", createBackup: "إنشاء نسخة احتياطية جديدة", confirmRestore: "للتأكيد، اكتب", restoreWarning: "لا يمكن التراجع عن هذا الإجراء. ستُستبدل جميع البيانات الحالية ببيانات النسخة الاحتياطية.", deleteBackup: "حذف ملف النسخة الاحتياطية", s3Error: "تعذر تحميل بيانات S3", s3Backups: "نسخ S3 الاحتياطية", createS3: "إنشاء نسخة S3 يدوية", loadingS3: "جارٍ تحميل نسخ S3 الاحتياطية...", noS3: "لا توجد نسخ S3 احتياطية", fileName: "اسم الملف", size: "الحجم", type: "النوع", restoreS3: "استعادة نسخة S3", editSchedule: "تعديل جدولة النسخ الاحتياطي", newSchedule: "إنشاء جدولة النسخ الاحتياطي", configureSchedule: "إعدادات جدولة النسخ الاحتياطي الآلية", selectDay: "اختر اليوم", oldBackups: "ستُحذف النسخ الأقدم من هذه المدة تلقائيًا", unknown: "غير معروف", unknownSize: "حجم غير معروف", showingTables: "عرض أكبر 15 جدولًا حسب الحجم. إجمالي الجداول:", installPostgres: "ثبّت PostgreSQL", setDbUrl: "اضبط متغير DATABASE_URL", runCommands: "شغّل npm install وnpm run dev", createdToast: "تم إنشاء النسخة الاحتياطية", createdDesc: "تم إنشاء نسخة احتياطية جديدة بنجاح", errorCreate: "خطأ في إنشاء النسخة الاحتياطية", errorCreateDesc: "حدثت مشكلة أثناء إنشاء النسخة الاحتياطية", deletedToast: "تم حذف النسخة الاحتياطية", deletedDesc: "تم حذف الملف بنجاح", errorDelete: "خطأ في حذف النسخة الاحتياطية", errorDeleteDesc: "حدثت مشكلة أثناء حذف ملف النسخة الاحتياطية", restoredToast: "تمت استعادة النسخة الاحتياطية", restoredDesc: "تمت استعادة النسخة الاحتياطية بنجاح", errorRestore: "خطأ في استعادة النسخة الاحتياطية", errorRestoreDesc: "حدثت مشكلة أثناء استعادة النسخة الاحتياطية", downloadStarted: "بدأ التنزيل", downloading: "جارٍ تنزيل الملف", scheduleCreated: "تم إنشاء الجدولة", scheduleUpdated: "تم تحديث الجدولة", scheduleDeleted: "تم حذف الجدولة", scheduleError: "فشلت عملية الجدولة", scheduleSuccess: "اكتملت عملية جدولة النسخ الاحتياطي", s3Created: "تم إنشاء نسخة S3", s3Deleted: "تم حذف نسخة S3", s3Restored: "تمت استعادة نسخة S3" });
Object.assign(copy.tr, { statsError: "Veritabanı istatistikleri yüklenemedi", backupError: "Yedekler yüklenemedi", createBackup: "Yeni Yedek Oluştur", confirmRestore: "Onaylamak için yazın", restoreWarning: "Bu işlem geri alınamaz. Mevcut tüm veriler yedek verileriyle değiştirilecektir.", deleteBackup: "Yedek Dosyasını Sil", s3Error: "S3 verileri yüklenemedi", s3Backups: "S3 Yedekleri", createS3: "Elle S3 Yedeği Oluştur", loadingS3: "S3 yedekleri yükleniyor...", noS3: "S3 yedeği bulunamadı", fileName: "Dosya Adı", size: "Boyut", type: "Tür", restoreS3: "S3 Yedeğini Geri Yükle", editSchedule: "Yedekleme Zamanlamasını Düzenle", newSchedule: "Yedekleme Zamanlaması Oluştur", configureSchedule: "Otomatik yedekleme zamanlama ayarları", selectDay: "Gün seçin", oldBackups: "Bu süreden eski yedekler otomatik olarak silinir", unknown: "Bilinmiyor", unknownSize: "Bilinmeyen boyut", showingTables: "Boyuta göre en büyük 15 tablo gösteriliyor. Toplam tablo:", installPostgres: "PostgreSQL yükleyin", setDbUrl: "DATABASE_URL değişkenini ayarlayın", runCommands: "npm install ve npm run dev komutlarını çalıştırın", createdToast: "Yedek oluşturuldu", createdDesc: "Yeni yedek başarıyla oluşturuldu", errorCreate: "Yedek oluşturma hatası", errorCreateDesc: "Yedek oluşturulurken bir sorun oluştu", deletedToast: "Yedek silindi", deletedDesc: "Dosya başarıyla silindi", errorDelete: "Yedek silme hatası", errorDeleteDesc: "Yedek dosyası silinirken bir sorun oluştu", restoredToast: "Yedek geri yüklendi", restoredDesc: "Yedek başarıyla geri yüklendi", errorRestore: "Yedek geri yükleme hatası", errorRestoreDesc: "Yedek geri yüklenirken bir sorun oluştu", downloadStarted: "İndirme başladı", downloading: "Dosya indiriliyor", scheduleCreated: "Zamanlama oluşturuldu", scheduleUpdated: "Zamanlama güncellendi", scheduleDeleted: "Zamanlama silindi", scheduleError: "Zamanlama işlemi başarısız", scheduleSuccess: "Yedekleme zamanlama işlemi tamamlandı", s3Created: "S3 yedeği oluşturuldu", s3Deleted: "S3 yedeği silindi", s3Restored: "S3 yedeği geri yüklendi" });
Object.assign(copy.fa, { restoreS3Question: "آیا مطمئن هستید که این بک‌آپ را بازگردانی می‌کنید؟ تمام داده‌های فعلی جایگزین خواهند شد!", deleteS3Question: "آیا مطمئن هستید که این بک‌آپ را حذف می‌کنید؟ این عمل قابل بازگشت نیست.", deleteScheduleQuestion: "آیا مطمئن هستید که این زمان‌بندی را حذف می‌کنید؟", notAvailable: "در دسترس نیست" });
Object.assign(copy.ar, { notAvailable: "غير متاح", restoreS3Question: "هل أنت متأكد من استعادة هذه النسخة؟ سيتم استبدال جميع البيانات الحالية!", deleteS3Question: "هل أنت متأكد من حذف هذه النسخة؟ لا يمكن التراجع عن هذا الإجراء.", deleteScheduleQuestion: "هل أنت متأكد من حذف هذه الجدولة؟" });
Object.assign(copy.tr, { notAvailable: "Mevcut değil", restoreS3Question: "Bu yedeği geri yüklemek istediğinizden emin misiniz? Tüm mevcut veriler değiştirilecek!", deleteS3Question: "Bu yedeği silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.", deleteScheduleQuestion: "Bu zamanlamayı silmek istediğinizden emin misiniz?" });
Object.assign(copy.ar, {
  deleteS3: "حذف نسخة S3", loadingSchedules: "جارٍ تحميل الجداول الزمنية...", deleteSchedule: "حذف الجدولة",
  timeOfDay: "وقت اليوم", day0: "الأحد", day1: "الاثنين", day2: "الثلاثاء", day3: "الأربعاء",
  day4: "الخميس", day5: "الجمعة", day6: "السبت",
});
Object.assign(copy.tr, {
  deleteBackupQuestion: "Bu yedek dosyasını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
  restoreS3Question: "Bu yedeği geri yüklemek istediğinizden emin misiniz? Tüm mevcut veriler değiştirilecek!",
  deleteS3: "S3 Yedeğini Sil", deleteS3Question: "Bu yedeği silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
  loadingSchedules: "Zamanlamalar yükleniyor...", notAvailable: "Mevcut değil", deleteSchedule: "Zamanlamayı Sil",
  deleteScheduleQuestion: "Bu zamanlamayı silmek istediğinizden emin misiniz?", timeOfDay: "Günün Saati",
  day0: "Pazar", day1: "Pazartesi", day2: "Salı", day3: "Çarşamba", day4: "Perşembe", day5: "Cuma", day6: "Cumartesi",
});
Object.assign(copy.en, {
  day0: "Sunday", day1: "Monday", day2: "Tuesday", day3: "Wednesday", day4: "Thursday", day5: "Friday", day6: "Saturday",
});
Object.assign(copy.fa, {
  day0: "یکشنبه", day1: "دوشنبه", day2: "سه‌شنبه", day3: "چهارشنبه", day4: "پنجشنبه", day5: "جمعه", day6: "شنبه",
});

interface BackupFile {
  filename: string;
  size: number;
  created: string;
  modified: string;
}

interface DatabaseBackup {
  id: number;
  fileName: string;
  s3Key: string;
  s3Bucket: string;
  fileSize: number;
  backupType: 'manual' | 'scheduled';
  scheduleId: number | null;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface BackupSchedule {
  id: number;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  timeOfDay: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  retentionDays: number;
  isActive: boolean | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DatabaseStats {
  database_size: string;
  table_count: number;
  total_records: number;
  table_stats: Array<{
    tablename: string;
    live_rows: number;
    actual_count: number;
    total_inserts: number;
    total_updates: number;
    total_deletes: number;
    table_size: string;
    size_bytes: number;
  }>;
}

export default function DatabaseManagement() {
  const { language, direction } = useLanguage();
  const tx = (key: string) => copy[language][key] || copy.en[key] || key;
  const locale = language === "fa" ? "fa-IR" : language === "ar" ? "ar" : language === "tr" ? "tr-TR" : "en-US";
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<BackupSchedule | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [restoreFilename, setRestoreFilename] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    name: "",
    frequency: "daily" as "daily" | "weekly" | "monthly",
    timeOfDay: "02:00",
    dayOfWeek: null as number | null,
    dayOfMonth: null as number | null,
    retentionDays: 30,
    isActive: true,
  });

  // Fetch current user data
  const { data: user, isError: userError } = useQuery<{ user: { id: number; username: string } }>({
    queryKey: ["/api/admin/me"],
    retry: 1,
  });

  // Fetch database statistics
  const { data: dbStats, isLoading: statsLoading, isError: statsError } = useQuery<DatabaseStats>({
    queryKey: ["/api/admin/database/stats"],
    retry: 1,
  });

  // Fetch backup list (old local backup system)
  const { data: backupsData, isLoading: backupsLoading, refetch: refetchBackups, isError: backupsError } = useQuery<{ backups: BackupFile[] }>({
    queryKey: ["/api/admin/backup/list"],
    retry: 1,
  });

  // Fetch S3 backups (new system)
  const { data: s3Backups, isLoading: loadingS3Backups, isError: s3Error } = useQuery<DatabaseBackup[]>({
    queryKey: ['/api/admin/backups'],
    retry: 1,
  });

  // Fetch backup schedules
  const { data: schedules, isLoading: loadingSchedules, isError: schedulesError } = useQuery<BackupSchedule[]>({
    queryKey: ['/api/admin/backup-schedules'],
    retry: 1,
  });

  // Create local backup mutation
  const createBackupMutation = useMutation({
    mutationFn: () => apiRequest("/api/admin/backup/create", { method: "POST" }),
    onSuccess: () => {
      toast({
        title: tx("createdToast"),
        description: tx("createdDesc"),
      });
      refetchBackups();
      setIsCreatingBackup(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: tx("errorCreate"),
        description: tx("errorCreateDesc"),
      });
      setIsCreatingBackup(false);
    },
  });

  // Delete local backup mutation
  const deleteBackupMutation = useMutation({
    mutationFn: (filename: string) => apiRequest(`/api/admin/backup/delete/${filename}`, { method: "DELETE" }),
    onSuccess: (_, filename) => {
      toast({
        title: tx("deletedToast"),
        description: `${tx("fileName")}: ${filename} — ${tx("deletedDesc")}`,
      });
      refetchBackups();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: tx("errorDelete"),
        description: tx("errorDeleteDesc"),
      });
    },
  });

  // S3 Backup mutations
  const createS3BackupMutation = useMutation({
    mutationFn: (notes?: string) => apiRequest("/api/admin/backups/create", { 
      method: "POST",
      body: { notes }
    }),
    onSuccess: () => {
      toast({
        title: tx("s3Created"),
        description: tx("createdDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/backups'] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: tx("errorCreate"),
        description: tx("errorCreateDesc"),
      });
    },
  });

  const deleteS3BackupMutation = useMutation({
    mutationFn: (backupId: number) => apiRequest(`/api/admin/backups/${backupId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({
        title: tx("s3Deleted"),
        description: tx("deletedDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/backups'] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: tx("errorDelete"),
        description: tx("errorDeleteDesc"),
      });
    },
  });

  // Restore database from backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: (filename: string) => apiRequest(`/api/admin/backup/restore/${filename}`, { 
      method: "POST",
      body: { confirmRestore: "RESTORE_DATABASE" }
    }),
    onSuccess: (_, filename) => {
      toast({
        title: tx("restoredToast"),
        description: `${tx("fileName")}: ${filename} — ${tx("restoredDesc")}`,
      });
      refetchBackups();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database/stats"] });
      setRestoreConfirmText("");
      setRestoreFilename(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: tx("errorRestore"),
        description: tx("errorRestoreDesc"),
      });
      setRestoreConfirmText("");
      setRestoreFilename(null);
    },
  });

  // Restore S3 backup mutation
  const restoreS3BackupMutation = useMutation({
    mutationFn: (backupId: number) => apiRequest(`/api/admin/backups/${backupId}/restore`, { method: "POST" }),
    onSuccess: () => {
      toast({
        title: tx("s3Restored"),
        description: tx("restoredDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/backups'] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database/stats"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: tx("errorRestore"),
        description: tx("errorRestoreDesc"),
      });
    },
  });

  // Schedule mutations
  const createScheduleMutation = useMutation({
    mutationFn: (data: typeof scheduleForm) => apiRequest("/api/admin/backup-schedules", {
      method: "POST",
      body: data
    }),
    onSuccess: () => {
      toast({
        title: tx("scheduleCreated"),
        description: tx("scheduleSuccess"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/backup-schedules'] });
      setShowScheduleDialog(false);
      resetScheduleForm();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: tx("scheduleError"),
        description: tx("errorCreateDesc"),
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof scheduleForm }) => 
      apiRequest(`/api/admin/backup-schedules/${id}`, {
        method: "PUT",
        body: data
      }),
    onSuccess: () => {
      toast({
        title: tx("scheduleUpdated"),
        description: tx("scheduleSuccess"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/backup-schedules'] });
      setShowScheduleDialog(false);
      setEditingSchedule(null);
      resetScheduleForm();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: tx("scheduleError"),
        description: tx("errorCreateDesc"),
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleId: number) => apiRequest(`/api/admin/backup-schedules/${scheduleId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({
        title: tx("scheduleDeleted"),
        description: tx("deletedDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/backup-schedules'] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: tx("scheduleError"),
        description: tx("errorDeleteDesc"),
      });
    },
  });

  const handleCreateBackup = () => {
    setIsCreatingBackup(true);
    createBackupMutation.mutate();
  };

  const handleDownloadBackup = (filename: string) => {
    const link = document.createElement('a');
    link.href = `/api/admin/backup/download/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: tx("downloadStarted"),
      description: `${tx("fileName")}: ${filename} — ${tx("downloading")}`,
    });
  };

  const handleDownloadS3Backup = (backupId: number, fileName: string) => {
    const link = document.createElement('a');
    link.href = `/api/admin/backups/${backupId}/download`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: tx("downloadStarted"),
      description: `${tx("fileName")}: ${fileName} — ${tx("downloading")}`,
    });
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      name: "",
      frequency: "daily",
      timeOfDay: "02:00",
      dayOfWeek: null,
      dayOfMonth: null,
      retentionDays: 30,
      isActive: true,
    });
  };

  const handleEditSchedule = (schedule: BackupSchedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      name: schedule.name,
      frequency: schedule.frequency,
      timeOfDay: schedule.timeOfDay,
      dayOfWeek: schedule.dayOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      retentionDays: schedule.retentionDays,
      isActive: schedule.isActive ?? true,
    });
    setShowScheduleDialog(true);
  };

  const handleSaveSchedule = () => {
    if (editingSchedule) {
      updateScheduleMutation.mutate({ id: editingSchedule.id, data: scheduleForm });
    } else {
      createScheduleMutation.mutate(scheduleForm);
    }
  };

  const handleToggleSchedule = (schedule: BackupSchedule) => {
    updateScheduleMutation.mutate({
      id: schedule.id,
      data: {
        ...schedule,
        isActive: !schedule.isActive,
      },
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)).toLocaleString(locale) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: DatabaseBackup['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 me-1" />{tx("completed")}</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-500"><Loader2 className="h-3 w-3 me-1 animate-spin" />{tx("inProgress")}</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 me-1" />{tx("failed")}</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 me-1" />{tx("pending")}</Badge>;
    }
  };

  if (userError) {
    return (
      <div className="space-y-6">
        <div dir={direction} className="p-4 border border-red-300 bg-red-50 rounded-lg text-red-800">
          <h2 className="font-semibold mb-2">{tx("authError")}</h2>
          <p>{tx("signIn")}</p>
        </div>
      </div>
    );
  }

  return (
    <div dir={direction} lang={language} className="space-y-6">
      <div className="flex items-center gap-4">
        {user?.user && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/admin')}
          >
            <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
            {tx("back")}
          </Button>
        )}
        <h1 className="text-2xl font-bold">{tx("title")}</h1>
      </div>

      {statsError && (
        <div className="p-4 border border-red-300 bg-red-50 rounded-lg text-red-800">
          <h3 className="font-semibold">{tx("statsError")}</h3>
        </div>
      )}

      {/* Database Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tx("databaseSize")}</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
               {statsLoading ? "..." : dbStats?.database_size || tx("unknown")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tx("tablesCount")}</CardTitle>
            <Table className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : dbStats?.table_count || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tx("totalRecords")}</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : dbStats?.total_records?.toLocaleString(locale) || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tx("backupsCount")}</CardTitle>
            <FileDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backupsLoading ? "..." : backupsData?.backups.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup Management with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {tx("backupManagement")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">{tx("manual")}</TabsTrigger>
              <TabsTrigger value="s3">{tx("automation")}</TabsTrigger>
            </TabsList>

            {/* Manual Backups Tab */}
            <TabsContent value="manual" className="space-y-4">
              {backupsError && (
                <div className="p-4 border border-red-300 bg-red-50 rounded-lg text-red-800 mb-4">
                  <h3 className="font-semibold">{tx("backupError")}</h3>
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={handleCreateBackup}
                  disabled={isCreatingBackup || createBackupMutation.isPending}
                  className="flex items-center gap-2"
                  data-testid="button-create-manual-backup"
                >
                  {isCreatingBackup || createBackupMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {tx("createBackup")}
                </Button>
              </div>

              {backupsLoading ? (
                <div className="text-center py-8">{tx("loading")}</div>
              ) : backupsData?.backups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                   {tx("noBackups")}
                </div>
              ) : (
                <div className="space-y-4">
                  {backupsData?.backups.map((backup) => (
                    <div
                      key={backup.filename}
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`backup-item-${backup.filename}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{backup.filename}</h3>
                          <Badge variant="secondary">
                            {formatFileSize(backup.size)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(backup.created)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadBackup(backup.filename)}
                          className="flex items-center gap-2"
                          data-testid={`button-download-${backup.filename}`}
                        >
                          <Download className="h-4 w-4" />
                           {tx("download")}
                        </Button>
                        <Dialog open={restoreFilename === backup.filename} onOpenChange={(open) => {
                          if (!open) {
                            setRestoreFilename(null);
                            setRestoreConfirmText("");
                          }
                        }}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={() => setRestoreFilename(backup.filename)}
                            data-testid={`button-restore-${backup.filename}`}
                          >
                            <RotateCcw className="h-4 w-4" />
                             {tx("restore")}
                          </Button>
                          <DialogContent dir={direction}>
                            <DialogHeader>
                              <DialogTitle>{tx("restore")}</DialogTitle>
                              <DialogDescription>
                                {tx("restoreS3Question").replace("this backup", `"${backup.filename}"`)}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-800">
                                   <strong>{tx("warning")}:</strong> {tx("restoreWarning")}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="restore-confirm">
                                   {tx("confirmRestore")} <strong>RESTORE</strong>:
                                </Label>
                                <Input
                                  id="restore-confirm"
                                  value={restoreConfirmText}
                                  onChange={(e) => setRestoreConfirmText(e.target.value)}
                                  placeholder="RESTORE"
                                  data-testid="input-restore-confirm"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setRestoreFilename(null);
                                  setRestoreConfirmText("");
                                }}
                              >
                                 {tx("cancel")}
                              </Button>
                              <Button
                                onClick={() => restoreBackupMutation.mutate(backup.filename)}
                                className="bg-orange-600 hover:bg-orange-700"
                                disabled={restoreConfirmText !== "RESTORE" || restoreBackupMutation.isPending}
                                data-testid="button-confirm-restore"
                              >
                                 {restoreBackupMutation.isPending ? `${tx("restore")}...` : tx("restore")}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                              data-testid={`button-delete-${backup.filename}`}
                            >
                              <Trash2 className="h-4 w-4" />
                              {tx("delete")}
                            </Button>
                          </AlertDialogTrigger>
                           <AlertDialogContent dir={direction}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{tx("deleteBackup")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {tx("deleteBackupQuestion").replace("this backup file", `"${backup.filename}"`)}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{tx("cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteBackupMutation.mutate(backup.filename)}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={deleteBackupMutation.isPending}
                              >
                                 {deleteBackupMutation.isPending ? `${tx("delete")}...` : tx("delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* S3 Backups & Automation Tab */}
            <TabsContent value="s3" className="space-y-6">
              {(s3Error || schedulesError) && (
                <div className="p-4 border border-red-300 bg-red-50 rounded-lg text-red-800 mb-4">
                  <h3 className="font-semibold">{tx("s3Error")}</h3>
                </div>
              )}
              {/* S3 Backups Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">{tx("s3Backups")}</h3>
                  <Button
                    onClick={() => createS3BackupMutation.mutate(undefined)}
                    disabled={createS3BackupMutation.isPending}
                    className="flex items-center gap-2"
                    data-testid="button-create-s3-backup"
                  >
                    {createS3BackupMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {tx("createS3")}
                  </Button>
                </div>

                {loadingS3Backups ? (
                  <div className="text-center py-8">{tx("loadingS3")}</div>
                ) : (s3Backups ?? []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                     {tx("noS3")}
                  </div>
                ) : (
                  <DataTable>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tx("fileName")}</TableHead>
                        <TableHead>{tx("size")}</TableHead>
                        <TableHead>{tx("type")}</TableHead>
                        <TableHead>{tx("status")}</TableHead>
                        <TableHead>{tx("created")}</TableHead>
                        <TableHead>{tx("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(s3Backups ?? []).map((backup) => (
                        <TableRow key={backup.id} data-testid={`s3-backup-row-${backup.id}`}>
                          <TableCell className="font-medium">{backup.fileName}</TableCell>
                          <TableCell>{formatFileSize(backup.fileSize)}</TableCell>
                          <TableCell>
                            <Badge variant={backup.backupType === 'manual' ? 'default' : 'secondary'}>
                               {backup.backupType === "manual" ? tx("manual") : tx("schedules")}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(backup.status)}</TableCell>
                          <TableCell>{formatDate(backup.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {backup.status === 'completed' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadS3Backup(backup.id, backup.fileName)}
                                  data-testid={`button-download-s3-${backup.id}`}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              {backup.status === 'completed' && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      data-testid={`button-restore-s3-${backup.id}`}
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                   <AlertDialogContent dir={direction}>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{tx("restoreS3")}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                {tx("restoreS3Question").replace("this backup", `"${backup.fileName}"`)}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{tx("cancel")}</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => restoreS3BackupMutation.mutate(backup.id)}
                                        className="bg-orange-600 hover:bg-orange-700"
                                        disabled={restoreS3BackupMutation.isPending}
                                      >
                                         {restoreS3BackupMutation.isPending ? `${tx("restore")}...` : tx("restore")}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    data-testid={`button-delete-s3-${backup.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                 <AlertDialogContent dir={direction}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{tx("deleteS3")}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {tx("deleteS3Question").replace("this backup", `"${backup.fileName}"`)}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{tx("cancel")}</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteS3BackupMutation.mutate(backup.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {tx("delete")}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </DataTable>
                )}
              </div>

              {/* Schedule Management Section */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">{tx("schedules")}</h3>
                  <Button
                    onClick={() => {
                      resetScheduleForm();
                      setEditingSchedule(null);
                      setShowScheduleDialog(true);
                    }}
                    className="flex items-center gap-2"
                    data-testid="button-create-schedule"
                  >
                    <Plus className="h-4 w-4" />
                     {tx("createSchedule")}
                  </Button>
                </div>

                {loadingSchedules ? (
                   <div className="text-center py-8">{tx("loadingSchedules")}</div>
                ) : (schedules ?? []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                     {tx("noSchedules")}
                  </div>
                ) : (
                  <DataTable>
                    <TableHeader>
                      <TableRow>
                         <TableHead>{tx("name")}</TableHead>
                         <TableHead>{tx("frequency")}</TableHead>
                         <TableHead>{tx("time")}</TableHead>
                         <TableHead>{tx("retention")}</TableHead>
                         <TableHead>{tx("status")}</TableHead>
                         <TableHead>{tx("lastRun")}</TableHead>
                         <TableHead>{tx("nextRun")}</TableHead>
                         <TableHead>{tx("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(schedules ?? []).map((schedule) => (
                        <TableRow key={schedule.id} data-testid={`schedule-row-${schedule.id}`}>
                          <TableCell className="font-medium">{schedule.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{schedule.frequency}</Badge>
                          </TableCell>
                          <TableCell>{schedule.timeOfDay}</TableCell>
                           <TableCell>{schedule.retentionDays.toLocaleString(locale)} {tx("days")}</TableCell>
                          <TableCell>
                            <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
                               {schedule.isActive ? tx("active") : tx("inactive")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                             {schedule.lastRunAt ? formatDate(schedule.lastRunAt) : tx("never")}
                          </TableCell>
                          <TableCell>
                             {schedule.nextRunAt ? formatDate(schedule.nextRunAt) : tx("notAvailable")}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleSchedule(schedule)}
                                disabled={updateScheduleMutation.isPending}
                                data-testid={`button-toggle-${schedule.id}`}
                              >
                                 {schedule.isActive ? tx("deactivate") : tx("activate")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditSchedule(schedule)}
                                data-testid={`button-edit-schedule-${schedule.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    data-testid={`button-delete-schedule-${schedule.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                 <AlertDialogContent dir={direction}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{tx("deleteSchedule")}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {tx("deleteScheduleQuestion").replace("this schedule", `"${schedule.name}"`)}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{tx("cancel")}</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {tx("delete")}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </DataTable>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent dir={direction} className="max-w-2xl" data-testid="dialog-schedule">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? tx("editSchedule") : tx("newSchedule")}
            </DialogTitle>
            <DialogDescription>
              {tx("configureSchedule")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-name">{tx("name")}</Label>
              <Input
                id="schedule-name"
                value={scheduleForm.name}
                onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                placeholder={`${tx("daily")} ${tx("backupManagement")}`}
                data-testid="input-schedule-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-frequency">{tx("frequency")}</Label>
                <Select
                  value={scheduleForm.frequency}
                  onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                    setScheduleForm({ ...scheduleForm, frequency: value })
                  }
                >
                  <SelectTrigger id="schedule-frequency" data-testid="select-frequency">
                    <SelectValue />
                  </SelectTrigger>
                    <SelectContent dir={direction}>
                    <SelectItem value="daily">{tx("daily")}</SelectItem>
                    <SelectItem value="weekly">{tx("weekly")}</SelectItem>
                    <SelectItem value="monthly">{tx("monthly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-time">{tx("timeOfDay")}</Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={scheduleForm.timeOfDay}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, timeOfDay: e.target.value })}
                  data-testid="input-time"
                />
              </div>
            </div>

            {scheduleForm.frequency === 'weekly' && (
              <div className="space-y-2">
                <Label htmlFor="schedule-day-week">{tx("dayOfWeek")}</Label>
                <Select
                  value={scheduleForm.dayOfWeek?.toString() || ''}
                  onValueChange={(value) =>
                    setScheduleForm({ ...scheduleForm, dayOfWeek: parseInt(value) })
                  }
                >
                    <SelectTrigger id="schedule-day-week" data-testid="select-day-week">
                     <SelectValue placeholder={tx("selectDay")} />
                  </SelectTrigger>
                    <SelectContent dir={direction}>
                    <SelectItem value="0">{tx("day0")}</SelectItem>
                    <SelectItem value="1">{tx("day1")}</SelectItem>
                    <SelectItem value="2">{tx("day2")}</SelectItem>
                    <SelectItem value="3">{tx("day3")}</SelectItem>
                    <SelectItem value="4">{tx("day4")}</SelectItem>
                    <SelectItem value="5">{tx("day5")}</SelectItem>
                    <SelectItem value="6">{tx("day6")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {scheduleForm.frequency === 'monthly' && (
              <div className="space-y-2">
                <Label htmlFor="schedule-day-month">{tx("dayOfMonth")}</Label>
                <Input
                  id="schedule-day-month"
                  type="number"
                  min="1"
                  max="31"
                  value={scheduleForm.dayOfMonth || ''}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, dayOfMonth: parseInt(e.target.value) || null })
                  }
                  placeholder="1-31"
                  data-testid="input-day-month"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="schedule-retention">{tx("retentionDays")}</Label>
              <Input
                id="schedule-retention"
                type="number"
                min="1"
                value={scheduleForm.retentionDays}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, retentionDays: parseInt(e.target.value) || 30 })
                }
                data-testid="input-retention"
              />
              <p className="text-sm text-muted-foreground">
                {tx("oldBackups")}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowScheduleDialog(false);
                setEditingSchedule(null);
                resetScheduleForm();
              }}
            >
              {tx("cancel")}
            </Button>
            <Button
              onClick={handleSaveSchedule}
              disabled={
                !scheduleForm.name ||
                createScheduleMutation.isPending ||
                updateScheduleMutation.isPending
              }
              data-testid="button-save-schedule"
            >
              {createScheduleMutation.isPending || updateScheduleMutation.isPending ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : null}
              {editingSchedule ? tx("update") : tx("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table className="h-5 w-5" />
            {tx("tableStats")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="text-center py-8">{tx("loading")}</div>
          ) : (
            <div className="space-y-4">
              {dbStats?.table_stats.slice(0, 15).map((table) => (
                <div key={table.tablename} className="space-y-2 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-lg">{table.tablename}</span>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-blue-50">
                        {table.actual_count?.toLocaleString(locale) || table.live_rows?.toLocaleString(locale) || 0} {tx("records")}
                      </Badge>
                      <Badge variant="secondary" className="bg-green-50">
                        {table.table_size || tx("unknownSize")}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground">
                    <span>{tx("inserts")}: {table.total_inserts?.toLocaleString(locale) || 0}</span>
                    <span>{tx("updates")}: {table.total_updates?.toLocaleString(locale) || 0}</span>
                    <span>{tx("deletes")}: {table.total_deletes?.toLocaleString(locale) || 0}</span>
                    <span>{tx("liveRows")}: {table.live_rows?.toLocaleString(locale) || 0}</span>
                  </div>
                  {table.actual_count > 0 && (
                    <Progress 
                      value={(table.actual_count / Math.max(...dbStats.table_stats.map(t => t.actual_count || t.live_rows || 0))) * 100} 
                      className="h-2" 
                    />
                  )}
                </div>
              ))}
              {dbStats?.table_stats && dbStats.table_stats.length > 15 && (
                <div className="text-center text-sm text-muted-foreground py-2">
                  {tx("showingTables")} {dbStats.table_count.toLocaleString(locale)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {tx("setup")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">{tx("setupSteps")}</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>{tx("installPostgres")}</li>
              <li>{tx("createDb")}</li>
              <li>{tx("downloadRestore")}</li>
              <li>{tx("setDbUrl")}</li>
              <li>{tx("runCommands")}</li>
            </ol>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            {tx("guideAvailable")} PORTABLE_DATABASE_SETUP.md
          </div>
        </CardContent>
      </Card>
    </div>
  );
}