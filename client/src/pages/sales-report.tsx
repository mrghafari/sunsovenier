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
import { format } from "date-fns";

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

export default function SalesReport() {
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
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode
    }).format(amount);
  };

  const formatQuantity = (quantity: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(quantity);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">در حال تولید گزارش فروش...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 print:bg-white print:p-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 print:mb-4">
          <div className="flex items-center justify-between mb-6 print:mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 print:text-2xl">گزارش فروش</h1>
              <p className="text-gray-600 print:text-sm">
                تحلیل جامع فروش از {formatDate(startDate)} تا {formatDate(endDate)}
              </p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button onClick={handlePrint} variant="outline">
                <Printer className="w-4 h-4 ml-2" />
                چاپ گزارش
              </Button>
            </div>
          </div>

          <Card className="print:hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <Label htmlFor="start-date">از:</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="end-date">تا:</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <Button onClick={handleGenerateReport}>
                  <FileText className="w-4 h-4 ml-2" />
                  تولید گزارش
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
                      <p className="text-sm font-medium text-gray-600">فروش مستقیم شرکت</p>
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
                      <p className="text-sm font-medium text-gray-600">تعداد سفارشات</p>
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
                      <p className="text-sm font-medium text-gray-600">درآمد کمیسیون وندورها</p>
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
                      <p className="text-sm font-medium text-green-700">کل درآمد</p>
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
                  <CardTitle>توزیع فروش محصولات شرکت</CardTitle>
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
                  <CardTitle>روند فروش روزانه شرکت</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 print:h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.dailyBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => format(new Date(value), 'MM/dd')}
                        />
                        <YAxis tickFormatter={(value) => `${value}`} />
                        <Tooltip 
                          labelFormatter={(value) => format(new Date(value as string), 'MMM dd, yyyy')}
                          formatter={(value) => [formatCurrency(value as number), 'فروش']}
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
                  <strong>فروش مستقیم شرکت:</strong> {formatCurrency(reportData.totalSales)}
                </div>
                <div>
                  <strong>درآمد کمیسیون:</strong> {formatCurrency(reportData.vendorCommission?.totalCommissionRevenue || 0)}
                </div>
                <div>
                  <strong>کل درآمد:</strong> {formatCurrency(reportData.grandTotalRevenue || reportData.totalSales)}
                </div>
                <div>
                  <strong>تعداد سفارشات:</strong> {reportData.totalOrders}
                </div>
                <div>
                  <strong>دوره:</strong> {formatDate(startDate)} تا {formatDate(endDate)}
                </div>
              </div>
            </div>

            <Card className="print:no-shadow mb-8">
              <CardHeader className="print:p-2">
                <CardTitle className="print:text-lg print:mb-2 flex items-center gap-2">
                  <Store className="w-5 h-5 text-blue-600 print:hidden" />
                  جزئیات فروش محصولات شرکت
                </CardTitle>
              </CardHeader>
              <CardContent className="print:p-2">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse print:compact-table">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right p-3 font-semibold text-gray-900 print:text-sm">نام محصول</th>
                        <th className="text-left p-3 font-semibold text-gray-900 print:text-sm">تعداد فروش</th>
                        <th className="text-left p-3 font-semibold text-gray-900 print:text-sm">مبلغ کل</th>
                        <th className="text-left p-3 font-semibold text-gray-900 print:text-sm">سفارشات</th>
                        <th className="text-left p-3 font-semibold text-gray-900 print:text-sm">میانگین/سفارش</th>
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
                        <td className="p-3 font-bold text-gray-900 print:text-sm">جمع کل</td>
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
                    درآمد حاصل از کمیسیون وندورها
                  </CardTitle>
                </CardHeader>
                <CardContent className="print:p-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:hidden">
                    <div className="bg-amber-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-amber-700">کل فروش وندورها</p>
                      <p className="text-xl font-bold text-amber-900">{formatCurrency(reportData.vendorCommission.totalVendorSales)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-green-700">درآمد کمیسیون</p>
                      <p className="text-xl font-bold text-green-800">{formatCurrency(reportData.vendorCommission.totalCommissionRevenue)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-blue-700">تعداد وندورها</p>
                      <p className="text-xl font-bold text-blue-900">{reportData.vendorCommission.vendorCount}</p>
                    </div>
                  </div>

                  {reportData.vendorCommission.details.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse print:compact-table">
                        <thead>
                          <tr className="border-b bg-amber-50">
                            <th className="text-right p-3 font-semibold text-gray-900 print:text-sm">نام وندور</th>
                            <th className="text-left p-3 font-semibold text-gray-900 print:text-sm">کل فروش وندور</th>
                            <th className="text-left p-3 font-semibold text-gray-900 print:text-sm">نرخ کمیسیون</th>
                            <th className="text-left p-3 font-semibold text-gray-900 print:text-sm">کمیسیون دریافتی</th>
                            <th className="text-left p-3 font-semibold text-gray-900 print:text-sm">پرداخت شده</th>
                            <th className="text-left p-3 font-semibold text-gray-900 print:text-sm">مانده بدهی</th>
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
                            <td className="p-3 font-bold text-gray-900 print:text-sm">جمع کل</td>
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
                      <p>اطلاعات کمیسیون وندور یافت نشد</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="print:no-shadow mb-8 border-2 border-green-300 bg-green-50">
              <CardContent className="p-6 print:p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-green-700 mb-1">فروش مستقیم شرکت</p>
                    <p className="text-xl font-bold text-green-800">{formatCurrency(reportData.totalSales)}</p>
                  </div>
                  <div className="text-2xl text-green-600">+</div>
                  <div>
                    <p className="text-sm text-green-700 mb-1">درآمد کمیسیون وندورها</p>
                    <p className="text-xl font-bold text-green-800">{formatCurrency(reportData.vendorCommission?.totalCommissionRevenue || 0)}</p>
                  </div>
                  <div className="text-2xl text-green-600">=</div>
                  <div className="bg-green-100 rounded-lg p-4">
                    <p className="text-sm text-green-700 mb-1">کل درآمد شرکت</p>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(reportData.grandTotalRevenue || reportData.totalSales)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="print:block hidden mt-8 pt-4 border-t text-center text-sm text-gray-500">
              <p>گزارش تولید شده در {format(new Date(), 'MMMM dd, yyyy at HH:mm')}</p>
              <p>Momtazchem Sales Analytics - Confidential</p>
            </div>
          </>
        )}

        {!reportData && !isLoading && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">داده‌ای موجود نیست</h3>
              <p className="text-gray-500 mb-6">
                بازه زمانی را انتخاب کرده و روی "تولید گزارش" کلیک کنید.
              </p>
              <Button onClick={handleGenerateReport}>
                تولید گزارش
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