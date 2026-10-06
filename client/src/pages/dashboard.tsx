import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  AlertCircle,
  BarChart3,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  Filter,
  Mail,
  MessageSquare,
  Phone,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";

interface Inquiry {
  id: number;
  inquiryNumber: string;
  contactEmail: string;
  contactPhone?: string;
  company?: string;
  subject: string;
  message: string;
  type: string;
  priority: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  productIds?: number[];
}

const copy = {
  en: {
    title: "Inquiry management", subtitle: "Review, triage, and prioritize customer requests.",
    total: "Total inquiries", open: "Open inquiries", progress: "In progress", resolved: "Resolved",
    filters: "Filters & search", search: "Search by subject, email, or number", allStatus: "All statuses",
    allPriority: "All priorities", allCategories: "All categories", clear: "Clear filters",
    inquiries: "Inquiries", row: "Row", number: "Inquiry number", subject: "Subject",
    contact: "Email / phone", company: "Company", category: "Category", priority: "Priority",
    status: "Status", date: "Date", actions: "Actions", details: "View details",
    loading: "Loading inquiries…", empty: "No inquiries found", emptyHint: "No inquiries match your current filters.",
    openLabel: "Open", inProgress: "In progress", resolvedLabel: "Resolved", closed: "Closed",
    urgent: "Urgent", high: "High", normal: "Normal", fuel: "Fuel additives",
    water: "Water treatment", paint: "Paint & thinner", agriculture: "Agricultural fertilizers",
    dateLocale: "en-US",
  },
  fa: {
    title: "مدیریت استعلام‌ها", subtitle: "درخواست‌های مشتریان را بررسی و اولویت‌بندی کنید.",
    total: "مجموع استعلام‌ها", open: "استعلام‌های باز", progress: "در حال بررسی", resolved: "حل‌شده",
    filters: "جستجو و فیلترها", search: "جستجو بر اساس موضوع، ایمیل یا شماره", allStatus: "همه وضعیت‌ها",
    allPriority: "همه اولویت‌ها", allCategories: "همه دسته‌ها", clear: "پاک کردن فیلترها",
    inquiries: "استعلام‌ها", row: "ردیف", number: "شماره استعلام", subject: "موضوع",
    contact: "ایمیل / تلفن", company: "شرکت", category: "دسته‌بندی", priority: "اولویت",
    status: "وضعیت", date: "تاریخ", actions: "عملیات", details: "جزئیات",
    loading: "در حال بارگذاری استعلام‌ها…", empty: "استعلامی پیدا نشد", emptyHint: "هیچ استعلامی با فیلترهای فعلی مطابقت ندارد.",
    openLabel: "باز", inProgress: "در حال بررسی", resolvedLabel: "حل‌شده", closed: "بسته",
    urgent: "فوری", high: "زیاد", normal: "عادی", fuel: "افزودنی سوخت",
    water: "تصفیه آب", paint: "رنگ و تینر", agriculture: "کودهای کشاورزی",
    dateLocale: "fa-IR",
  },
  ar: {
    title: "إدارة الاستفسارات", subtitle: "راجع طلبات العملاء وفرزها وحدد أولوياتها.",
    total: "إجمالي الاستفسارات", open: "الاستفسارات المفتوحة", progress: "قيد المعالجة", resolved: "تم الحل",
    filters: "البحث والتصفية", search: "البحث بالموضوع أو البريد أو الرقم", allStatus: "كل الحالات",
    allPriority: "كل الأولويات", allCategories: "كل الفئات", clear: "مسح المرشحات",
    inquiries: "الاستفسارات", row: "الصف", number: "رقم الاستفسار", subject: "الموضوع",
    contact: "البريد / الهاتف", company: "الشركة", category: "الفئة", priority: "الأولوية",
    status: "الحالة", date: "التاريخ", actions: "الإجراءات", details: "عرض التفاصيل",
    loading: "جارٍ تحميل الاستفسارات…", empty: "لم يتم العثور على استفسارات", emptyHint: "لا توجد استفسارات تطابق المرشحات الحالية.",
    openLabel: "مفتوح", inProgress: "قيد المعالجة", resolvedLabel: "تم الحل", closed: "مغلق",
    urgent: "عاجل", high: "مرتفع", normal: "عادي", fuel: "إضافات الوقود",
    water: "معالجة المياه", paint: "الطلاء والمخفف", agriculture: "الأسمدة الزراعية",
    dateLocale: "ar",
  },
  tr: {
    title: "Talep yönetimi", subtitle: "Müşteri taleplerini inceleyin, sınıflandırın ve önceliklendirin.",
    total: "Toplam talepler", open: "Açık talepler", progress: "İşlemde", resolved: "Çözüldü",
    filters: "Arama ve filtreler", search: "Konu, e-posta veya numaraya göre ara", allStatus: "Tüm durumlar",
    allPriority: "Tüm öncelikler", allCategories: "Tüm kategoriler", clear: "Filtreleri temizle",
    inquiries: "Talepler", row: "Sıra", number: "Talep numarası", subject: "Konu",
    contact: "E-posta / telefon", company: "Şirket", category: "Kategori", priority: "Öncelik",
    status: "Durum", date: "Tarih", actions: "İşlemler", details: "Detayları gör",
    loading: "Talepler yükleniyor…", empty: "Talep bulunamadı", emptyHint: "Mevcut filtrelerle eşleşen talep yok.",
    openLabel: "Açık", inProgress: "İşlemde", resolvedLabel: "Çözüldü", closed: "Kapalı",
    urgent: "Acil", high: "Yüksek", normal: "Normal", fuel: "Yakıt katkıları",
    water: "Su arıtma", paint: "Boya ve tiner", agriculture: "Tarımsal gübreler",
    dateLocale: "tr-TR",
  },
} as const;

const Dashboard = () => {
  const { language, direction } = useLanguage();
  const t = copy[language];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/admin/check-auth");
        if (!response.ok) window.location.href = "/mrg/login";
      } catch (error) {
        console.error("Auth check failed:", error);
        window.location.href = "/mrg/login";
      }
    };
    checkAuth();
  }, []);

  const { data: inquiries, isLoading } = useQuery<Inquiry[]>({
    queryKey: ["/api/inquiries"],
    queryFn: () => fetch("/api/inquiries").then((res) => res.json()),
  });
  const { data: stats } = useQuery({
    queryKey: ["/api/inquiries/stats"],
    queryFn: () => fetch("/api/inquiries/stats").then((res) => res.json()),
  });

  const filteredInquiries = Array.isArray(inquiries) ? inquiries.filter((inquiry) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = inquiry.subject.toLowerCase().includes(query)
      || inquiry.contactEmail.toLowerCase().includes(query)
      || inquiry.inquiryNumber.toLowerCase().includes(query);
    return matchesSearch
      && (statusFilter === "all" || inquiry.status === statusFilter)
      && (priorityFilter === "all" || inquiry.priority === priorityFilter)
      && (categoryFilter === "all" || inquiry.category === categoryFilter);
  }) : [];

  const statusLabel = (value: string) => ({
    open: t.openLabel, in_progress: t.inProgress, resolved: t.resolvedLabel, closed: t.closed,
  }[value] || value);
  const priorityLabel = (value: string) => ({ urgent: t.urgent, high: t.high, normal: t.normal }[value] || value);
  const categoryLabel = (value: string) => ({
    "fuel-additives": t.fuel, "water-treatment": t.water, "paint-thinner": t.paint,
    "agricultural-fertilizers": t.agriculture,
  }[value] || value);
  const dateLabel = (value: string) => new Intl.DateTimeFormat(t.dateLocale, {
    year: "numeric", month: "short", day: "numeric",
  }).format(new Date(value));
  const statusClass = (value: string) => ({
    open: "border-blue-200 bg-blue-50 text-blue-700",
    in_progress: "border-amber-200 bg-amber-50 text-amber-700",
    resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
    closed: "border-slate-200 bg-slate-100 text-slate-600",
  }[value] || "border-slate-200 bg-slate-100 text-slate-600");
  const priorityClass = (value: string) => ({
    urgent: "border-rose-200 bg-rose-50 text-rose-700",
    high: "border-orange-200 bg-orange-50 text-orange-700",
    normal: "border-blue-200 bg-blue-50 text-blue-700",
  }[value] || "border-slate-200 bg-slate-100 text-slate-600");
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
  };

  return (
    <div className="min-h-screen bg-slate-100" dir={direction}>
      <main className="mx-auto max-w-[1500px] space-y-4 px-4 py-5 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{t.subtitle}</p>
          </div>
          <Badge variant="outline" className="border-slate-300 bg-white text-slate-600">{filteredInquiries.length} {t.inquiries}</Badge>
        </header>

        {stats && (
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              [t.total, stats.totalInquiries || 0, MessageSquare, "text-slate-700"],
              [t.open, stats.openInquiries || 0, AlertCircle, "text-blue-600"],
              [t.progress, stats.inProgressInquiries || 0, Clock, "text-amber-600"],
              [t.resolved, stats.resolvedInquiries || 0, CheckCircle, "text-emerald-600"],
            ].map(([label, value, Icon, color]) => (
              <Card key={label as string} className="border-slate-300 shadow-sm">
                <CardContent className="flex items-center justify-between p-3 sm:p-4">
                  <div><p className="text-xs font-medium text-slate-500">{label as string}</p><p className="mt-1 text-xl font-bold text-slate-900">{value as number}</p></div>
                  <Icon className={`h-5 w-5 ${color as string}`} />
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        <Card className="border-slate-300 shadow-sm">
          <CardContent className="flex flex-wrap items-center gap-2 p-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t.search} className="h-9 border-slate-300 ps-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="h-9 w-full border-slate-300 sm:w-[155px]"><SelectValue placeholder={t.status} /></SelectTrigger><SelectContent>
              <SelectItem value="all">{t.allStatus}</SelectItem><SelectItem value="open">{t.openLabel}</SelectItem><SelectItem value="in_progress">{t.inProgress}</SelectItem><SelectItem value="resolved">{t.resolvedLabel}</SelectItem><SelectItem value="closed">{t.closed}</SelectItem>
            </SelectContent></Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger className="h-9 w-full border-slate-300 sm:w-[155px]"><SelectValue placeholder={t.priority} /></SelectTrigger><SelectContent>
              <SelectItem value="all">{t.allPriority}</SelectItem><SelectItem value="urgent">{t.urgent}</SelectItem><SelectItem value="high">{t.high}</SelectItem><SelectItem value="normal">{t.normal}</SelectItem>
            </SelectContent></Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="h-9 w-full border-slate-300 sm:w-[190px]"><SelectValue placeholder={t.category} /></SelectTrigger><SelectContent>
              <SelectItem value="all">{t.allCategories}</SelectItem><SelectItem value="fuel-additives">{t.fuel}</SelectItem><SelectItem value="water-treatment">{t.water}</SelectItem><SelectItem value="paint-thinner">{t.paint}</SelectItem><SelectItem value="agricultural-fertilizers">{t.agriculture}</SelectItem>
            </SelectContent></Select>
            <Button variant="outline" className="h-9 w-full border-slate-300 sm:w-auto" onClick={resetFilters}><Filter className="me-2 h-4 w-4" />{t.clear}</Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-300 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-300 bg-white px-4 py-3">
            <BarChart3 className="h-4 w-4 text-slate-500" /><h2 className="font-semibold text-slate-800">{t.inquiries} ({filteredInquiries.length})</h2>
          </div>
          {isLoading ? (
            <div className="space-y-2 p-4">{[...Array(5)].map((_, index) => <div key={index} className="h-9 animate-pulse rounded bg-slate-200" />)}</div>
          ) : filteredInquiries.length === 0 ? (
            <div className="py-14 text-center"><MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-300" /><h3 className="font-semibold text-slate-700">{t.empty}</h3><p className="mt-1 text-sm text-slate-500">{t.emptyHint}</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1180px] text-xs">
                <TableHeader className="sticky top-0 z-10 bg-slate-700"><TableRow className="border-slate-700 hover:bg-slate-700">
                  {[t.row, t.number, t.subject, t.contact, t.company, t.category, t.priority, t.status, t.date, t.actions].map((label) => <TableHead key={label} className="h-9 border-e border-slate-600 px-3 text-start font-semibold text-slate-50">{label}</TableHead>)}
                </TableRow></TableHeader>
                <TableBody>{filteredInquiries.map((inquiry, index) => (
                  <TableRow key={inquiry.id} className="border-slate-200 odd:bg-slate-50 even:bg-white hover:bg-amber-50">
                    <TableCell className="border-e border-slate-200 px-3 py-2 font-mono text-slate-500">{index + 1}</TableCell>
                    <TableCell className="border-e border-slate-200 px-3 py-2 font-mono font-semibold text-slate-800">{inquiry.inquiryNumber}</TableCell>
                    <TableCell className="max-w-[230px] whitespace-normal border-e border-slate-200 px-3 py-2 font-semibold text-slate-900">{inquiry.subject}</TableCell>
                    <TableCell className="border-e border-slate-200 px-3 py-2"><div className="flex items-center gap-1.5 text-slate-700"><Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />{inquiry.contactEmail}</div>{inquiry.contactPhone && <div className="mt-1 flex items-center gap-1.5 text-slate-500"><Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />{inquiry.contactPhone}</div>}</TableCell>
                    <TableCell className="border-e border-slate-200 px-3 py-2 text-slate-700">{inquiry.company ? <span className="flex items-center gap-1.5"><Building className="h-3.5 w-3.5 text-slate-400" />{inquiry.company}</span> : "—"}</TableCell>
                    <TableCell className="border-e border-slate-200 px-3 py-2 text-slate-700">{categoryLabel(inquiry.category)}</TableCell>
                    <TableCell className="border-e border-slate-200 px-3 py-2"><Badge variant="outline" className={priorityClass(inquiry.priority)}>{priorityLabel(inquiry.priority)}</Badge></TableCell>
                    <TableCell className="border-e border-slate-200 px-3 py-2"><Badge variant="outline" className={statusClass(inquiry.status)}>{statusLabel(inquiry.status)}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap border-e border-slate-200 px-3 py-2 text-slate-600"><span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" />{dateLabel(inquiry.createdAt)}</span></TableCell>
                    <TableCell className="px-3 py-2"><Link href={`/admin/inquiry/${inquiry.id}`} className="inline-flex h-7 items-center rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"><Eye className="me-1.5 h-3.5 w-3.5" />{t.details}</Link></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;