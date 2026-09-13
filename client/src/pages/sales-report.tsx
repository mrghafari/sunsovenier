import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Calendar, TrendingUp, Package, DollarSign, FileText, Printer, Store, Percent } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface VendorCommissionDetail {
  vendorName: string;
  totalSales: number;
  commissionRate: number;
  commissionAmount: number;
  totalPaid: number;
  currentBalance: number;
}

interface SalesReportData {
  totalSales: number;
  totalOrders: number;
  totalQuantity: number;
  productSales: Array<{
    productName: string;
    quantity: number;
    totalAmount: number;
    orders: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
  topProducts: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  vendorCommission?: {
    totalCommissionRevenue: number;
    totalVendorSales: number;
    vendorCount: number;
    details: VendorCommissionDetail[];
  };
  grandTotalRevenue?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

type ReportLanguage = 'en' | 'ar' | 'tr' | 'fa';
type ReportTranslation = Partial<Record<ReportLanguage, string>>;

const REPORT_TRANSLATIONS: Record<string, ReportTranslation> = {
  loading: { en: 'Generating sales report...', ar: 'جارٍ إنشاء تقرير المبيعات...', tr: 'Satış raporu oluşturuluyor...', fa: 'در حال تولید گزارش فروش...' },
  title: { en: 'Sales Report', ar: 'تقرير المبيعات', tr: 'Satış Raporu', fa: 'گزارش فروش' },
  analysisPeriod: { en: 'Comprehensive sales analysis from {start} to {end}', ar: 'تحليل شامل للمبيعات من {start} إلى {end}', tr: '{start} - {end} tarihleri arası kapsamlı satış analizi', fa: 'تحلیل جامع فروش از {start} تا {end}' },
  printReport: { en: 'Print Report', ar: 'طباعة التقرير', tr: 'Raporu Yazdır', fa: 'چاپ گزارش' },
  from: { en: 'From:', ar: 'من:', tr: 'Başlangıç:', fa: 'از:' },
  to: { en: 'To:', ar: 'إلى:', tr: 'Bitiş:', fa: 'تا:' },
  generateReport: { en: 'Generate Report', ar: 'إنشاء التقرير', tr: 'Rapor Oluştur', fa: 'تولید گزارش' },
  directSales: { en: 'Direct Company Sales', ar: 'مبيعات الشركة المباشرة', tr: 'Doğrudan Şirket Satışları', fa: 'فروش مستقیم شرکت' },
  totalOrders: { en: 'Total Orders', ar: 'إجمالي الطلبات', tr: 'Toplam Sipariş', fa: 'تعداد سفارشات' },
  vendorCommissionRevenue: { en: 'Vendor Commission Revenue', ar: 'إيرادات عمولات البائعين', tr: 'Satıcı Komisyon Geliri', fa: 'درآمد کمیسیون وندورها' },
  totalRevenue: { en: 'Total Revenue', ar: 'إجمالي الإيرادات', tr: 'Toplam Gelir', fa: 'کل درآمد' },
  period: { en: 'Period', ar: 'الفترة', tr: 'Dönem', fa: 'دوره' },
  companyProductDistribution: { en: 'Company Product Sales Distribution', ar: 'توزيع مبيعات منتجات الشركة', tr: 'Şirket Ürün Satış Dağılımı', fa: 'توزیع فروش محصولات شرکت' },
  dailySalesTrend: { en: 'Daily Company Sales Trend', ar: 'اتجاه مبيعات الشركة اليومية', tr: 'Günlük Şirket Satış Trendi', fa: 'روند فروش روزانه شرکت' },
  sales: { en: 'Sales', ar: 'المبيعات', tr: 'Satışlar', fa: 'فروش' },
  salesDetails: { en: 'Company Product Sales Details', ar: 'تفاصيل مبيعات منتجات الشركة', tr: 'Şirket Ürün Satış Detayları', fa: 'جزئیات فروش محصولات شرکت' },
  productName: { en: 'Product Name', ar: 'اسم المنتج', tr: 'Ürün Adı', fa: 'نام محصول' },
  unitsSold: { en: 'Units Sold', ar: 'الوحدات المباعة', tr: 'Satılan Birim', fa: 'تعداد فروش' },
  totalAmount: { en: 'Total Amount', ar: 'المبلغ الإجمالي', tr: 'Toplam Tutar', fa: 'مبلغ کل' },
  orders: { en: 'Orders', ar: 'الطلبات', tr: 'Siparişler', fa: 'سفارشات' },
  averagePerOrder: { en: 'Average/Order', ar: 'المتوسط/الطلب', tr: 'Ortalama/Sipariş', fa: 'میانگین/سفارش' },
  grandTotal: { en: 'Grand Total', ar: 'الإجمالي الكلي', tr: 'Genel Toplam', fa: 'جمع کل' },
  vendorCommission: { en: 'Revenue from Vendor Commissions', ar: 'الإيرادات من عمولات البائعين', tr: 'Satıcı Komisyon Geliri', fa: 'درآمد حاصل از کمیسیون وندورها' },
  vendorSales: { en: 'Total Vendor Sales', ar: 'إجمالي مبيعات البائعين', tr: 'Toplam Satıcı Satışı', fa: 'کل فروش وندورها' },
  commissionRevenue: { en: 'Commission Revenue', ar: 'إيرادات العمولات', tr: 'Komisyon Geliri', fa: 'درآمد کمیسیون' },
  vendorCount: { en: 'Vendor Count', ar: 'عدد البائعين', tr: 'Satıcı Sayısı', fa: 'تعداد وندورها' },
  vendorName: { en: 'Vendor Name', ar: 'اسم البائع', tr: 'Satıcı Adı', fa: 'نام وندور' },
  vendorTotalSales: { en: 'Total Vendor Sales', ar: 'إجمالي مبيعات البائع', tr: 'Toplam Satıcı Satışı', fa: 'کل فروش وندور' },
  commissionRate: { en: 'Commission Rate', ar: 'معدل العمولة', tr: 'Komisyon Oranı', fa: 'نرخ کمیسیون' },
  commissionReceived: { en: 'Commission Received', ar: 'العمولة المستلمة', tr: 'Alınan Komisyon', fa: 'کمیسیون دریافتی' },
  paid: { en: 'Paid', ar: 'المدفوع', tr: 'Ödenen', fa: 'پرداخت شده' },
  outstandingBalance: { en: 'Outstanding Balance', ar: 'الرصيد المستحق', tr: 'Ödenmemiş Bakiye', fa: 'مانده بدهی' },
  noVendorCommission: { en: 'No vendor commission information found', ar: 'لم يتم العثور على معلومات عمولات البائعين', tr: 'Satıcı komisyon bilgisi bulunamadı', fa: 'اطلاعات کمیسیون وندور یافت نشد' },
  companyTotalRevenue: { en: 'Total Company Revenue', ar: 'إجمالي إيرادات الشركة', tr: 'Toplam Şirket Geliri', fa: 'کل درآمد شرکت' },
  generatedAt: { en: 'Report generated on {date}', ar: 'تم إنشاء التقرير في {date}', tr: 'Rapor oluşturma tarihi: {date}', fa: 'گزارش تولید شده در {date}' },
  confidential: { en: 'Momtazchem Sales Analytics - Confidential', ar: 'تحليلات مبيعات ممتاز شيمي - سري', tr: 'Momtazchem Satış Analitiği - Gizli', fa: 'تحلیل فروش ممتاز شیمی - محرمانه' },
  noData: { en: 'No data available', ar: 'لا توجد بيانات', tr: 'Veri mevcut değil', fa: 'داده‌ای موجود نیست' },
  choosePeriod: { en: 'Choose a date range and click "Generate Report".', ar: 'اختر نطاقاً زمنياً وانقر على «إنشاء التقرير».', tr: 'Bir tarih aralığı seçin ve «Rapor Oluştur» düğmesine tıklayın.', fa: 'بازه زمانی را انتخاب کرده و روی «تولید گزارش» کلیک کنید.' },
};

export default function SalesReport() {
  const { language, direction } = useLanguage();
  const tr = (key: string, values: Record<string, string | number> = {}) => {
    const template = REPORT_TRANSLATIONS[key]?.[language] || REPORT_TRANSLATIONS[key]?.en || key;
    return Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), template);
  };
  const locale = language === 'fa' ? 'fa-IR' : language === 'ar' ? 'ar' : language === 'tr' ? 'tr-TR' : 'en-GB';

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const { data: reportData, isLoading, refetch } = useQuery<SalesReportData>({
    queryKey: [`/api/reports/sales?startDate=${startDate}&endDate=${endDate}`],
    enabled: !!startDate && !!endDate,
  });

  const handleGenerateReport = () => {
    refetch();
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number, currency: string = 'IQD') => {
    const validCurrencies = ['USD', 'EUR', 'IQD'];
    const currencyCode = validCurrencies.includes(currency) ? currency : 'IQD';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode
    }).format(amount);
  };

  const formatQuantity = (quantity: number) => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(quantity);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6" dir={direction}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">{tr('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 print:bg-white print:p-4" dir={direction}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 print:mb-4">
          <div className="flex items-center justify-between mb-6 print:mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 print:text-2xl">{tr('title')}</h1>
              <p className="text-gray-600 print:text-sm">
                {tr('analysisPeriod', { start: formatDate(startDate), end: formatDate(endDate) })}
              </p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button onClick={handlePrint} variant="outline">
                <Printer className="w-4 h-4 mr-2" />
                {tr('printReport')}
              </Button>
            </div>
          </div>

          <Card className="print:hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <Label htmlFor="start-date">{tr('from')}</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="end-date">{tr('to')}</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <Button onClick={handleGenerateReport}>
                  <FileText className="w-4 h-4 mr-2" />
                  {tr('generateReport')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {reportData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 print:hidden">
              <Card>
                <CardContent className="p-6 print:p-4">
                  <div className="flex items-center">
                    <DollarSign className="w-8 h-8 text-green-600" />
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600">{tr('directSales')}</p>
                      <p className="text-2xl font-bold text-gray-900 print:text-xl">
                        {formatCurrency(reportData.totalSales)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 print:p-4">
                  <div className="flex items-center">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600">{tr('totalOrders')}</p>
                      <p className="text-2xl font-bold text-gray-900 print:text-xl">
                        {reportData.totalOrders}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 print:p-4">
                  <div className="flex items-center">
                    <Percent className="w-8 h-8 text-amber-600" />
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600">{tr('vendorCommissionRevenue')}</p>
                      <p className="text-2xl font-bold text-amber-700 print:text-xl">
                        {formatCurrency(reportData.vendorCommission?.totalCommissionRevenue || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-200 bg-green-50">
                <CardContent className="p-6 print:p-4">
                  <div className="flex items-center">
                    <TrendingUp className="w-8 h-8 text-green-700" />
                    <div className="mr-4">
                      <p className="text-sm font-medium text-green-700">{tr('totalRevenue')}</p>
                      <p className="text-2xl font-bold text-green-800 print:text-xl">
                        {formatCurrency(reportData.grandTotalRevenue || reportData.totalSales)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 print:hidden print:mb-4 print:gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>{tr('companyProductDistribution')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 print:h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportData.topProducts}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {reportData.topProducts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{tr('dailySalesTrend')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 print:h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.dailyBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => new Intl.DateTimeFormat(locale, { month: '2-digit', day: '2-digit' }).format(new Date(value))}
                        />
                        <YAxis tickFormatter={(value) => `${value}`} />
                        <Tooltip 
                          labelFormatter={(value) => formatDate(value as string)}
                          formatter={(value) => [formatCurrency(value as number), tr('sales')]}
                        />
                        <Bar dataKey="sales" fill="#0088FE" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="hidden print:block print:mb-4">
              <div className="print:summary-box">
                <div>
                  <strong>{tr('directSales')}:</strong> {formatCurrency(reportData.totalSales)}
                </div>
                <div>
                  <strong>{tr('commissionRevenue')}:</strong> {formatCurrency(reportData.vendorCommission?.totalCommissionRevenue || 0)}
                </div>
                <div>
                  <strong>{tr('totalRevenue')}:</strong> {formatCurrency(reportData.grandTotalRevenue || reportData.totalSales)}
                </div>
                <div>
                  <strong>{tr('totalOrders')}:</strong> {reportData.totalOrders}
                </div>
                <div>
                  <strong>{tr('period')}:</strong> {formatDate(startDate)} - {formatDate(endDate)}
                </div>
              </div>
            </div>

            <Card className="print:no-shadow mb-8">
              <CardHeader className="print:p-2">
                <CardTitle className="print:text-lg print:mb-2 flex items-center gap-2">
                  <Store className="w-5 h-5 text-blue-600 print:hidden" />
                  {tr('salesDetails')}
                </CardTitle>
              </CardHeader>
              <CardContent className="print:p-2">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse print:compact-table">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right p-3 font-semibold text-gray-900 print:text-sm">{tr('productName')}</th>
                        <th className="text-left p-3 font-semibold text-gray-900 print:text-sm">{tr('unitsSold')}</th>
                        <th className="text-left p-3 font-semibold text-gray-900 print:text-sm">{tr('totalAmount')}</th>
                        <th className="text-left p-3 font-semibold text-gray-900 print:text-sm">{tr('orders')}</th>
                        <th className="text-left p-3 font-semibold text-gray-900 print:text-sm">{tr('averagePerOrder')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.productSales.map((product, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3 print:text-sm">
                            <div className="font-medium text-gray-900">{product.productName}</div>
                          </td>
                          <td className="p-3 text-left print:text-sm">
                            <Badge variant="secondary" className="print:hidden">{formatQuantity(product.quantity)}</Badge>
                            <span className="hidden print:inline">{formatQuantity(product.quantity)}</span>
                          </td>
                          <td className="p-3 text-left font-semibold text-green-600 print:text-sm">
                            {formatCurrency(product.totalAmount)}
                          </td>
                          <td className="p-3 text-left print:text-sm">{product.orders}</td>
                          <td className="p-3 text-left text-gray-600 print:text-sm">
                            {formatCurrency(product.orders > 0 ? product.totalAmount / product.orders : 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-gray-50">
                        <td className="p-3 font-bold text-gray-900 print:text-sm">{tr('grandTotal')}</td>
                        <td className="p-3 text-left font-bold print:text-sm">
                          <Badge variant="default" className="print:hidden">{formatQuantity(reportData.totalQuantity)}</Badge>
                          <span className="hidden print:inline font-bold">{formatQuantity(reportData.totalQuantity)}</span>
                        </td>
                        <td className="p-3 text-left font-bold text-green-600 print:text-sm">
                          {formatCurrency(reportData.totalSales)}
                        </td>
                        <td className="p-3 text-left font-bold print:text-sm">{reportData.totalOrders}</td>
                        <td className="p-3 text-left font-bold text-gray-600 print:text-sm">
                          {formatCurrency(reportData.totalOrders > 0 ? reportData.totalSales / reportData.totalOrders : 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {reportData.vendorCommission && (
              <Card className="print:no-shadow mb-8 border-2 border-amber-200">
                <CardHeader className="print:p-2 bg-amber-50">
                  <CardTitle className="print:text-lg print:mb-2 flex items-center gap-2 text-amber-800">
                    <Percent className="w-5 h-5 text-amber-600 print:hidden" />
                    {tr('vendorCommission')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="print:p-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:hidden">
                    <div className="bg-amber-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-amber-700">{tr('vendorSales')}</p>
                      <p className="text-xl font-bold text-amber-900">{formatCurrency(reportData.vendorCommission.totalVendorSales)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-green-700">{tr('commissionRevenue')}</p>
                      <p className="text-xl font-bold text-green-800">{formatCurrency(reportData.vendorCommission.totalCommissionRevenue)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-blue-700">{tr('vendorCount')}</p>
                      <p className="text-xl font-bold text-blue-900">{reportData.vendorCommission.vendorCount}</p>
                    </div>
                  </div>

                  {reportData.vendorCommission.details.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse print:compact-table">
                        <thead>
                          <tr className="border-b bg-amber-50">
                            <th className="text-right p-3 font-semibold text-gray-900 print:text-sm">{tr('vendorName')}</th>
                            <th className="text-left p-3 font-semibold text-gray-900 print:text-sm">{tr('vendorTotalSales')}</th>
                            <th className="text-left p-3 font-semibold text-gray-900 print:text-sm">{tr('commissionRate')}</th>
                            <th className="text-left p-3 font-semibold text-gray-900 print:text-sm">{tr('commissionReceived')}</th>
                            <th className="text-left p-3 font-semibold text-gray-900 print:text-sm">{tr('paid')}</th>
                            <th className="text-left p-3 font-semibold text-gray-900 print:text-sm">{tr('outstandingBalance')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.vendorCommission.details.map((detail, index) => (
                            <tr key={index} className="border-b hover:bg-amber-50/50">
                              <td className="p-3 print:text-sm">
                                <div className="font-medium text-gray-900">{detail.vendorName}</div>
                              </td>
                              <td className="p-3 text-left print:text-sm">
                                {formatCurrency(detail.totalSales)}
                              </td>
                              <td className="p-3 text-left print:text-sm">
                                <Badge variant="outline" className="text-amber-700 border-amber-300">{detail.commissionRate}%</Badge>
                              </td>
                              <td className="p-3 text-left font-semibold text-orange-600 print:text-sm">
                                {formatCurrency(detail.commissionAmount)}
                              </td>
                              <td className="p-3 text-left text-blue-600 print:text-sm">
                                {formatCurrency(detail.totalPaid)}
                              </td>
                              <td className={`p-3 text-left font-semibold print:text-sm ${detail.currentBalance > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                {formatCurrency(detail.currentBalance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 bg-amber-50">
                            <td className="p-3 font-bold text-gray-900 print:text-sm">{tr('grandTotal')}</td>
                            <td className="p-3 text-left font-bold print:text-sm">
                              {formatCurrency(reportData.vendorCommission.totalVendorSales)}
                            </td>
                            <td className="p-3 text-left font-bold print:text-sm">-</td>
                            <td className="p-3 text-left font-bold text-orange-600 print:text-sm">
                              {formatCurrency(reportData.vendorCommission.totalCommissionRevenue)}
                            </td>
                            <td className="p-3 text-left font-bold text-blue-600 print:text-sm">
                              {formatCurrency(reportData.vendorCommission.details.reduce((s, d) => s + d.totalPaid, 0))}
                            </td>
                            <td className="p-3 text-left font-bold text-red-600 print:text-sm">
                              {formatCurrency(reportData.vendorCommission.details.reduce((s, d) => s + d.currentBalance, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <Store className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>{tr('noVendorCommission')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="print:no-shadow mb-8 border-2 border-green-300 bg-green-50">
              <CardContent className="p-6 print:p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                      <p className="text-sm text-green-700 mb-1">{tr('directSales')}</p>
                    <p className="text-xl font-bold text-green-800">{formatCurrency(reportData.totalSales)}</p>
                  </div>
                  <div className="text-2xl text-green-600">+</div>
                  <div>
                      <p className="text-sm text-green-700 mb-1">{tr('vendorCommissionRevenue')}</p>
                    <p className="text-xl font-bold text-green-800">{formatCurrency(reportData.vendorCommission?.totalCommissionRevenue || 0)}</p>
                  </div>
                  <div className="text-2xl text-green-600">=</div>
                  <div className="bg-green-100 rounded-lg p-4">
                      <p className="text-sm text-green-700 mb-1">{tr('companyTotalRevenue')}</p>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(reportData.grandTotalRevenue || reportData.totalSales)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="print:block hidden mt-8 pt-4 border-t text-center text-sm text-gray-500">
              <p>{tr('generatedAt', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date()) })}</p>
              <p>{tr('confidential')}</p>
            </div>
          </>
        )}

        {!reportData && !isLoading && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">{tr('noData')}</h3>
              <p className="text-gray-500 mb-6">
                {tr('choosePeriod')}
              </p>
              <Button onClick={handleGenerateReport}>
                {tr('generateReport')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <style>{`
        @media print {
          @page {
            margin: 0.5in;
            size: A4;
          }
          
          .print\\:hidden,
          button,
          .lucide,
          .print\\:hide-charts {
            display: none !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .print\\:table {
            display: table !important;
          }
          
          .print\\:bg-white,
          body,
          * {
            background-color: white !important;
            background-image: none !important;
          }
          
          .print\\:p-2 {
            padding: 0.5rem !important;
          }
          
          .print\\:mb-2 {
            margin-bottom: 0.5rem !important;
          }
          
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
          }
          
          .print\\:text-lg {
            font-size: 1.125rem !important;
            font-weight: bold !important;
          }
          
          .print\\:text-base {
            font-size: 1rem !important;
          }
          
          .print\\:text-sm {
            font-size: 0.875rem !important;
          }
          
          .print\\:no-shadow {
            box-shadow: none !important;
            border: 1px solid #e5e5e5 !important;
          }
          
          .print\\:compact-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          
          .print\\:compact-table th,
          .print\\:compact-table td {
            padding: 0.25rem 0.5rem !important;
            border: 1px solid #ddd !important;
            font-size: 0.875rem !important;
          }
          
          .print\\:compact-table th {
            background-color: #f8f9fa !important;
            font-weight: bold !important;
          }
          
          .print\\:essential-only .grid:not(.print\\:keep) {
            display: none !important;
          }
          
          .print\\:summary-box {
            display: flex !important;
            justify-content: space-between !important;
            padding: 1rem !important;
            border: 2px solid #000 !important;
            margin-bottom: 1rem !important;
            background-color: #f8f9fa !important;
          }
          
          * {
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .text-green-600,
          .text-blue-600,
          .text-orange-600 {
            color: black !important;
            font-weight: bold !important;
          }
        }
      `}</style>
    </div>
  );
}