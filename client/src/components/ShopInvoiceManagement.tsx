import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Eye, Search, Filter, Receipt, Calendar, Building, CheckCircle, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import PaymentMethodBadge from '@/components/PaymentMethodBadge';

interface PaidOrder {
  id: number;
  orderNumber: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: string;
  shippingCost: string;
  vatAmount: string;
  surchargeAmount: string;
  vatRate: string;
  currency: string;
  paymentMethod: string;
  paymentDate: string;
  createdAt: string;
  status: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>;
}

interface InvoiceStats {
  totalPaidOrders: number;
  totalInvoiceAmount: number;
  averageOrderValue: number;
  thisMonthInvoices: number;
}

export default function ShopInvoiceManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<PaidOrder | null>(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);

  // Fetch paid orders only (completed payments) - NEW API PATH
  const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/invoices/paid'],
    queryFn: async () => {
      const response = await fetch('/api/invoices/paid', {
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  // Fetch invoice statistics
  const { data: statsResponse } = useQuery({
    queryKey: ['/api/shop/invoices/stats'],
    staleTime: 60000, // Cache for 1 minute
  });

  // Fetch company information for logo
  const { data: companyInfo } = useQuery({
    queryKey: ['/api/admin/company-information'],
    queryFn: () => fetch('/api/admin/company-information', { credentials: 'include' }).then(res => res.json()),
    staleTime: 300000, // Cache for 5 minutes
  });

  const paidOrders: PaidOrder[] = ordersResponse || [];
  const stats: InvoiceStats = statsResponse || {
    totalPaidOrders: 0,
    totalInvoiceAmount: 0,
    averageOrderValue: 0,
    thisMonthInvoices: 0
  };

  // Filter orders based on search and status
  const filteredOrders = paidOrders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${order.customerFirstName} ${order.customerLastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Format currency for display
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US').format(num) + ' دینار عراقی';
  };

  // Format Gregorian date
  const formatGregorianDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  // Get customer display name with fallback
  const getCustomerDisplayName = (order: PaidOrder) => {
    const firstName = order.customerFirstName?.trim();
    const lastName = order.customerLastName?.trim();
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    } else {
      return 'مشتری گرامی';
    }
  };

  // Get customer address display
  const getCustomerAddress = (order: any) => {
    const parts = [];
    if (order.customerAddress) parts.push(order.customerAddress);
    if (order.customerCity) parts.push(order.customerCity);
    if (order.customerProvince) parts.push(order.customerProvince);
    return parts.length > 0 ? parts.join(', ') : '';
  };

  // Print invoice
  const handlePrintInvoice = async (order: PaidOrder) => {
    try {
      toast({
        title: '🖨️ آماده‌سازی چاپ',
        description: 'در حال آماده‌سازی فاکتور برای چاپ...',
      });

      // Generate invoice HTML content with company info
      const invoiceHTML = generateInvoiceHTML(order, companyInfo);
      
      // Open print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('امکان باز کردن پنجره چاپ وجود ندارد');
      }

      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);

      toast({
        title: '✅ آماده چاپ',
        description: `فاکتور سفارش ${order.orderNumber} آماده چاپ شد`,
      });
    } catch (error) {
      console.error('خطا در چاپ فاکتور:', error);
      toast({
        title: '❌ خطا در چاپ',
        description: 'امکان چاپ فاکتور وجود ندارد',
        variant: 'destructive'
      });
    }
  };

  // Download invoice as HTML file
  const handleDownloadInvoice = async (order: PaidOrder) => {
    try {
      toast({
        title: '📄 تولید فایل',
        description: 'در حال تولید فایل فاکتور...',
      });

      // Generate invoice HTML content with company info
      const invoiceHTML = generateInvoiceHTML(order, companyInfo);
      
      // Create blob and download
      const blob = new Blob([invoiceHTML], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${order.orderNumber}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: '✅ فایل دانلود شد',
        description: `فاکتور ${order.orderNumber} دانلود شد`,
      });
    } catch (error) {
      console.error('خطا در دانلود فاکتور:', error);
      toast({
        title: '❌ خطا در دانلود',
        description: 'امکان دانلود فاکتور وجود ندارد',
        variant: 'destructive'
      });
    }
  };

  // Generate professional invoice HTML with company logo
  const generateInvoiceHTML = (order: PaidOrder, companyInfo?: any) => {
    const currentDate = formatGregorianDate(new Date().toISOString());
    const orderDate = formatGregorianDate(order.createdAt);
    const paymentDate = formatGregorianDate(order.paymentDate);
    const customerName = getCustomerDisplayName(order);

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>فاکتور سفارش ${order.orderNumber}</title>
        <style>
          * { 
            box-sizing: border-box; 
          }
          body { 
            font-family: 'Tahoma', 'Arial', sans-serif; 
            margin: 0; 
            padding: 20px; 
            direction: rtl; 
            background: white;
            font-size: 14px;
            line-height: 1.6;
            overflow-x: hidden;
          }
          .invoice-container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white;
            border: 2px solid #000;
            position: relative;
            transform: translateZ(0);
            backface-visibility: hidden;
          }
          .header { 
            background: white;
            color: #1f2937; 
            padding: 20px; 
            text-align: center; 
            position: relative;
            border-bottom: 2px solid #000;
          }
          .company-logo { 
            width: 60px; 
            height: 60px;
            object-fit: contain;
            margin-bottom: 8px;
            border-radius: 4px;
            border: 1px solid #ccc;
            padding: 4px;
            display: block;
            margin-left: auto;
            margin-right: auto;
          }
          .company-name { 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 5px;
            color: #000;
          }
          .invoice-title { 
            font-size: 16px; 
            margin-bottom: 10px;
            padding: 8px 16px;
            border: 1px solid #000;
            border-radius: 4px;
            display: inline-block;
            font-weight: bold;
          }
          .invoice-info { 
            padding: 20px; 
            background: white;
            border-bottom: 1px solid #000;
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin-bottom: 15px;
          }
          .info-grid-3 { 
            display: grid; 
            grid-template-columns: 1fr 1fr 1fr; 
            gap: 12px; 
            margin-bottom: 15px;
          }
          .info-item { 
            background: white;
            padding: 12px;
            border: 1px solid #ccc;
          }
          .info-label { 
            font-weight: bold; 
            color: #374151; 
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
            letter-spacing: 0.5px;
          }
          .info-value { 
            color: #1f2937; 
            font-size: 16px;
            font-weight: 600;
          }
          .items-section { 
            padding: 18px;
          }
          .section-title { 
            font-size: 16px; 
            font-weight: bold; 
            color: #000;
            margin-bottom: 12px;
            border-bottom: 2px solid #000;
            padding-bottom: 6px;
          }
          .items-table th { 
            background: white; 
            color: #000; 
            padding: 15px; 
            text-align: right;
            font-weight: bold;
            font-size: 14px;
            border: 1px solid #000;
          }
          .items-table td { 
            padding: 12px 15px; 
            border: 1px solid #ccc;
            text-align: right;
          }
          .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            background: white;
            border: 2px solid #000;
          }
          .total-section { 
            background: white;
            color: #000;
            padding: 18px;
            border: 2px solid #000;
            margin-top: 10px;
          }
          .totals-table {
            width: 50%;
            margin-right: auto;
            border-collapse: collapse;
            margin-bottom: 12px;
          }
          .totals-table td {
            padding: 6px 12px;
            font-size: 14px;
          }
          .totals-table .label-col {
            text-align: right;
            font-weight: 600;
            color: #374151;
          }
          .totals-table .value-col {
            text-align: left;
            color: #1f2937;
          }
          .totals-table .grand-total td {
            font-size: 18px;
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 10px;
            color: #000;
          }
          .payment-info { 
            font-size: 14px;
            opacity: 0.9;
            text-align: center;
            margin-top: 8px;
          }
          .footer { 
            background: white;
            padding: 15px; 
            text-align: center; 
            font-size: 11px; 
            color: #666;
            border-top: 1px solid #000;
          }
          .print-date { 
            margin-top: 10px;
            font-weight: bold;
            color: #000;
          }
          @media print { 
            body { 
              margin: 0; 
              padding: 0; 
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            .invoice-container { 
              border: none; 
              box-shadow: none;
              max-width: 100%;
            }
            .items-table tr:hover { 
              background-color: transparent; 
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div style="text-align: center; margin-bottom: 10px;">
              ${companyInfo?.data?.logoUrl ? `
                <img src="${companyInfo.data.logoUrl}" alt="لوگوی شرکت" class="company-logo" 
                     onload="console.log('Logo loaded successfully')" 
                     onerror="console.log('Logo failed to load'); this.style.display='none'" />` : 
                `<div style="width: 60px; height: 60px; border: 1px solid #ccc; border-radius: 4px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666;">لوگو</div>`}
            </div>
            <div class="company-name">${companyInfo?.data?.companyNameAr || companyInfo?.data?.companyNameEn || 'شرکت ممتاز شیمی'}</div>
            <div class="invoice-title">فاکتور فروش</div>
          </div>

          <div class="invoice-info">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">شماره فاکتور</div>
                <div class="info-value">${order.orderNumber}</div>
              </div>
              <div class="info-item">
                <div class="info-label">تاریخ صدور</div>
                <div class="info-value">${orderDate}</div>
              </div>
              <div class="info-item">
                <div class="info-label">تاریخ پرداخت</div>
                <div class="info-value">${paymentDate}</div>
              </div>
              <div class="info-item">
                <div class="info-label">روش پرداخت</div>
                <div class="info-value">${getPaymentMethodName(order.paymentMethod)}</div>
              </div>
            </div>

            <div class="info-grid-3">
              <div class="info-item">
                <div class="info-label">نام مشتری</div>
                <div class="info-value">${customerName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">شماره تماس</div>
                <div class="info-value">${order.customerPhone || 'ثبت نشده'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">ایمیل</div>
                <div class="info-value">${order.customerEmail || 'ثبت نشده'}</div>
              </div>
            </div>
            ${getCustomerAddress(order) ? `
            <div class="info-grid">
              <div class="info-item" style="grid-column: 1 / -1;">
                <div class="info-label">آدرس مشتری</div>
                <div class="info-value">${getCustomerAddress(order)}</div>
              </div>
            </div>` : ''}
          </div>

          <div class="items-section">
            <div class="section-title">🛒 جزئیات اقلام</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>نام محصول</th>
                  <th>تعداد</th>
                  <th>قیمت واحد</th>
                  <th>مبلغ کل</th>
                </tr>
              </thead>
              <tbody>
                ${order.items?.map(item => `
                  <tr>
                    <td>${item.productName}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.unitPrice)}</td>
                    <td>${formatCurrency(item.totalPrice)}</td>
                  </tr>
                `).join('') || '<tr><td colspan="4">اطلاعات اقلام در دسترس نیست</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="total-section">
            <table class="totals-table">
              <tbody>
                <tr>
                  <td class="label-col">جمع اقلام:</td>
                  <td class="value-col">${formatCurrency(
                    Math.round(parseFloat(order.totalAmount || '0') - parseFloat(order.shippingCost || '0') - parseFloat(order.vatAmount || '0') - parseFloat(order.surchargeAmount || '0'))
                  )}</td>
                </tr>
                ${parseFloat(order.vatAmount || '0') > 0 ? `
                <tr>
                  <td class="label-col">مالیات بر ارزش افزوده (${order.vatRate || '0'}%):</td>
                  <td class="value-col">${formatCurrency(order.vatAmount)}</td>
                </tr>` : ''}
                ${parseFloat(order.surchargeAmount || '0') > 0 ? `
                <tr>
                  <td class="label-col">عوارض:</td>
                  <td class="value-col">${formatCurrency(order.surchargeAmount)}</td>
                </tr>` : ''}
                ${parseFloat(order.shippingCost || '0') > 0 ? `
                <tr>
                  <td class="label-col">هزینه ارسال:</td>
                  <td class="value-col">${formatCurrency(order.shippingCost)}</td>
                </tr>` : ''}
                <tr class="grand-total">
                  <td class="label-col">💰 مبلغ کل:</td>
                  <td class="value-col">${formatCurrency(order.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
            <div class="payment-info">
              ✅ پرداخت تکمیل شده در تاریخ ${paymentDate}
            </div>
          </div>

          <div class="footer">
            <p>🏢 این فاکتور توسط سیستم فروشگاه آنلاین ممتاز شیمی تولید شده است</p>
            <div class="print-date">تاریخ چاپ: ${currentDate}</div>
            
            <!-- آدرس و اطلاعات تماس شرکت در انتهایی‌ترین قسمت -->
            <div class="company-details" style="margin-top: 15px; padding-top: 10px; border-top: 2px solid #000; text-align: center;">
              <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px; color: #000;">
                📍 آدرس شرکت: ${companyInfo?.data?.companyAddress || companyInfo?.data?.address || companyInfo?.data?.companyAddressAr || companyInfo?.data?.companyAddressEn || 'عراق، اربیل، شهرک صنعتی ممتاز شیمی'}
              </div>
              
              <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; font-size: 11px; color: #333;">
                ${companyInfo?.data?.phoneNumber || companyInfo?.data?.phone ? `<span>📞 تلفن: ${companyInfo.data.phoneNumber || companyInfo.data.phone}</span>` : `<span>📞 تلفن: +964-750-123-4567</span>`}
                ${companyInfo?.data?.email || companyInfo?.data?.companyEmail ? `<span>📧 ایمیل: ${companyInfo.data.email || companyInfo.data.companyEmail}</span>` : `<span>📧 ایمیل: info@momtazchem.com</span>`}
                ${companyInfo?.data?.website || companyInfo?.data?.companyWebsite ? `<span>🌐 وبسایت: ${companyInfo.data.website || companyInfo.data.companyWebsite}</span>` : `<span>🌐 وبسایت: www.momtazchem.com</span>`}
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Get payment method display name
  const getPaymentMethodName = (method: string) => {
    const methods: Record<string, string> = {
      'bank_transfer': 'انتقال بانکی',
      'wallet_full': 'کیف پول کامل',
      'wallet': 'کیف پول دیجیتال',
      'cash_on_delivery': 'پرداخت در محل',
      'credit_card': 'کارت اعتباری'
    };
    return methods[method] || method;
  };

  // Preview invoice in modal
  const handlePreviewInvoice = (order: PaidOrder) => {
    setSelectedOrder(order);
    setShowInvoicePreview(true);
  };

  // Download all invoices as ZIP
  const handleDownloadAllInvoices = async () => {
    try {
      toast({
        title: '📦 تولید فایل‌های گروهی',
        description: 'در حال تولید تمامی فاکتورها...',
      });

      // Create a simple CSV report for now
      const csvContent = [
        'شماره فاکتور,مشتری,مبلغ,روش پرداخت,تاریخ پرداخت',
        ...filteredOrders.map(order => 
          `${order.orderNumber},"${order.customerFirstName} ${order.customerLastName}",${order.totalAmount},${getPaymentMethodName(order.paymentMethod)},${formatGregorianDate(order.paymentDate)}`
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: '✅ گزارش دانلود شد',
        description: `گزارش ${filteredOrders.length} فاکتور دانلود شد`,
      });
    } catch (error) {
      console.error('خطا در دانلود گزارش:', error);
      toast({
        title: '❌ خطا در دانلود گزارش',
        description: 'امکان دانلود گزارش وجود ندارد',
        variant: 'destructive'
      });
    }
  };

  if (ordersLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="mr-3">در حال بارگذاری فاکتورها...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">مدیریت فاکتور فروش</h2>
          <p className="text-sm text-gray-600 mt-1">فاکتورهای سفارشات تسویه شده</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleDownloadAllInvoices}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            disabled={filteredOrders.length === 0}
          >
            <Download className="w-4 h-4" />
            دانلود گزارش CSV ({filteredOrders.length})
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Receipt className="w-8 h-8 text-green-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600">کل فاکتورها</p>
                <p className="text-xl font-bold text-green-600">{stats.totalPaidOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-blue-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600">مبلغ کل</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(stats.totalInvoiceAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-purple-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600">میانگین سفارش</p>
                <p className="text-lg font-bold text-purple-600">{formatCurrency(stats.averageOrderValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-orange-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600">این ماه</p>
                <p className="text-xl font-bold text-orange-600">{stats.thisMonthInvoices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-lg">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="جستجو بر اساس شماره سفارش، نام مشتری یا شماره تماس..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="فیلتر وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه سفارشات</SelectItem>
            <SelectItem value="completed">تکمیل شده</SelectItem>
            <SelectItem value="delivered">تحویل شده</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            فاکتورهای قابل صدور ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-right p-3 font-semibold">شماره سفارش</th>
                  <th className="text-right p-3 font-semibold">مشتری</th>
                  <th className="text-right p-3 font-semibold">مبلغ</th>
                  <th className="text-right p-3 font-semibold">روش پرداخت</th>
                  <th className="text-right p-3 font-semibold">تاریخ پرداخت</th>
                  <th className="text-right p-3 font-semibold">وضعیت</th>
                  <th className="text-right p-3 font-semibold">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium text-blue-600">{order.orderNumber}</td>
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{order.customerFirstName} {order.customerLastName}</div>
                        <div className="text-sm text-gray-500">{order.customerPhone}</div>
                      </div>
                    </td>
                    <td className="p-3 font-bold text-green-600">{formatCurrency(order.totalAmount)}</td>
                    <td className="p-3">
                      <PaymentMethodBadge 
                        paymentMethod={order.paymentMethod}
                        showIcon={true}
                        className="text-xs"
                      />
                    </td>
                    <td className="p-3 text-sm">{formatGregorianDate(order.paymentDate)}</td>
                    <td className="p-3">
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        تسویه شده
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreviewInvoice(order)}
                          className="text-blue-600 hover:text-blue-800"
                          title="پیش‌نمایش فاکتور"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm" 
                          onClick={() => handlePrintInvoice(order)}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          title="چاپ فاکتور"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm" 
                          onClick={() => handleDownloadInvoice(order)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          title="دانلود فاکتور"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredOrders.length === 0 && (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">هیچ فاکتور قابل صدوری یافت نشد</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}