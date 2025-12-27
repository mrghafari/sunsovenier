import { useState, useEffect, useCallback } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Eye,
  Search,
  Clock,
  Package,
  Truck,
  CheckCircle,
  Calendar,
  MapPin,
  Phone,
  User,
  TrendingUp,
  AlertCircle,
  FileText,
  CreditCard,
  Activity,
  Timer,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Printer
} from 'lucide-react';
import PaymentMethodBadge from '@/components/PaymentMethodBadge';

// Order interface - Rebuilt to match actual backend database structure
interface Order {
  id: number;
  customerOrderId: number;
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  totalAmount: number | string;
  currency: string;
  status: string;
  paymentMethod?: string;
  paymentReceiptUrl?: string;
  trackingNumber?: string;
  deliveryCode?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  financialNotes?: string;
  warehouseNotes?: string;
  logisticsNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// Status history interface
interface StatusHistoryItem {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  changedBy: number | null;
  changedByDepartment: string | null;
  notes: string | null;
  createdAt: string;
}

// Order statistics interface
interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  todaysOrders: number;
}

// Enhanced status display with detailed explanations for failed/deleted orders
const getStatusDisplay = (order: Order) => {
  const status = order.status;
  const paymentReceiptUrl = order.paymentReceiptUrl;
  
  switch (status) {
    case 'pending':
      // Check if payment receipt is uploaded to determine which department
      if (!paymentReceiptUrl) {
        return {
          label: 'در انتظار پرداخت',
          department: 'مشتری',
          color: 'bg-red-100 text-red-800 border-red-200',
          explanation: 'مشتری هنوز فیش پرداخت را آپلود نکرده است'
        };
      } else {
        return {
          label: 'در انتظار بررسی مالی',
          department: 'مالی',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          explanation: 'فیش پرداخت آپلود شده و در انتظار تایید بخش مالی'
        };
      }
    case 'finance_pending':
      return {
        label: 'در انتظار بررسی مالی',
        department: 'مالی',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        explanation: 'فیش پرداخت آپلود شده و در انتظار تایید بخش مالی'
      };
    case 'confirmed':
      return {
        label: 'در انتظار آماده‌سازی',
        department: 'انبار', 
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        explanation: 'پرداخت تایید شده و در انتظار آماده‌سازی توسط انبار'
      };
    case 'warehouse_pending':
      return {
        label: 'در انتظار انبار',
        department: 'انبار',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        explanation: 'پرداخت تایید شده و در انتظار پردازش توسط انبار'
      };
    case 'warehouse_approved':
      return {
        label: 'تایید انبار',
        department: 'لجستیک',
        color: 'bg-green-100 text-green-800 border-green-200',
        explanation: 'سفارش توسط انبار تایید شده و آماده ارسال است'
      };
    case 'warehouse_ready':
      return {
        label: 'در انتظار تحویل',
        department: 'لجستیک',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        explanation: 'سفارش آماده شده و در انتظار ارسال توسط لجستیک'
      };
    case 'delivered':
      return {
        label: 'تحویل شده',
        department: 'تکمیل',
        color: 'bg-green-100 text-green-800 border-green-200',
        explanation: 'سفارش با موفقیت به مشتری تحویل داده شده'
      };
    
    // FAILED & DELETED ORDERS WITH DETAILED EXPLANATIONS
    case 'deleted':
      return {
        label: '❌ حذف شده',
        department: 'مدیریت',
        color: 'bg-red-200 text-red-900 border-red-300',
        explanation: 'سفارش توسط مدیریت حذف شده است (ممکن است به دلیل مشکل در پردازش، درخواست مشتری یا مشکل فنی)',
        isProblematic: true
      };
    case 'cancelled':
      return {
        label: '🚫 لغو شده',
        department: 'لغو',
        color: 'bg-orange-200 text-orange-900 border-orange-300',
        explanation: 'سفارش لغو شده است (ممکن است توسط مشتری، مدیریت یا به دلیل عدم پرداخت)',
        isProblematic: true
      };
    case 'financial_rejected':
      return {
        label: '💳 رد مالی',
        department: 'مالی',
        color: 'bg-red-200 text-red-900 border-red-300',
        explanation: 'فیش پرداخت توسط بخش مالی رد شده است (ممکن است نامعتبر، ناکافی یا قابل تشخیص نباشد)',
        isProblematic: true
      };
    case 'payment_failed':
      return {
        label: '❌ پرداخت ناموفق',
        department: 'پرداخت',
        color: 'bg-red-200 text-red-900 border-red-300',
        explanation: 'پرداخت آنلاین با شکست مواجه شده است (ممکن است به دلیل مشکل بانکی، عدم موجودی یا خطای فنی)',
        isProblematic: true
      };
    case 'expired':
      return {
        label: '⏰ منقضی شده',
        department: 'سیستم',
        color: 'bg-gray-200 text-gray-900 border-gray-300',
        explanation: 'سفارش به دلیل عدم پرداخت در زمان مقرر منقضی شده است',
        isProblematic: true
      };
    case 'warehouse_rejected':
      return {
        label: '📦 رد انبار',
        department: 'انبار',
        color: 'bg-red-200 text-red-900 border-red-300',
        explanation: 'سفارش توسط انبار رد شده است (ممکن است به دلیل عدم موجودی، مشکل در محصول یا خرابی)',
        isProblematic: true
      };
    case 'logistics_failed':
      return {
        label: '🚛 شکست ارسال',
        department: 'لجستیک',
        color: 'bg-red-200 text-red-900 border-red-300',
        explanation: 'ارسال سفارش با مشکل مواجه شده است (ممکن است به دلیل آدرس نامعتبر، عدم دسترسی یا مشکل حمل‌ونقل)',
        isProblematic: true
      };
    
    default:
      return {
        label: status || 'نامشخص',
        department: 'نامعتبر',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        explanation: `وضعیت نامشخص یا جدید: ${status}. نیاز به بررسی توسط مدیریت فنی`,
        isProblematic: true
      };
  }
};

// Comprehensive status labels including failed/problematic orders
const statusLabels: { [key: string]: string } = {
  'pending': 'در انتظار',
  'confirmed': 'تأیید شده', 
  'payment_uploaded': 'فیش بانکی آپلود شده',
  'finance_pending': 'در انتظار بررسی مالی',
  'financial_reviewing': 'در حال بررسی مالی',
  'financial_approved': 'تأیید مالی',
  'financial_rejected': '💳 رد مالی', 
  'warehouse_pending': 'در انتظار انبار',
  'warehouse_processing': 'در حال آماده‌سازی انبار',
  'warehouse_approved': 'تایید انبار',
  'warehouse_ready': 'آماده انبار',
  'warehouse_rejected': '📦 رد انبار',
  'logistics_assigned': 'تحویل لجستیک',
  'logistics_failed': '🚛 شکست ارسال',
  'in_transit': 'در راه',
  'delivered': 'تحویل داده شده',
  'completed': 'تکمیل شده',
  'cancelled': '🚫 لغو شده',
  'deleted': '❌ حذف شده',
  'payment_failed': '❌ پرداخت ناموفق',
  'expired': '⏰ منقضی شده'
};

// Department labels
const departmentLabels: { [key: string]: string } = {
  'financial': 'مالی',
  'warehouse': 'انبار',
  'logistics': 'لجستیک'
};

// Format date function - Exactly same as financial department
const formatDate = (dateString: string) => {
  if (!dateString) return 'نامشخص';  
  try {
    return new Date(dateString).toLocaleDateString('en-US');
  } catch {
    return 'تاریخ نامعتبر';
  }
};

export default function OrderTrackingManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all'); // all, financial, orphaned
  const [sortField, setSortField] = useState<keyof Order | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Manual refresh only - no automatic refresh intervals

  // 📄 INFINITE SCROLL: Fetch orders with pagination (100 orders per page)
  const {
    data: ordersData,
    isLoading,
    isLoadingError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: ['tracking-orders-paginated'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(`/api/orders/tracking/all?limit=100&offset=${pageParam}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        // If authentication fails, redirect to login
        if (response.status === 401) {
          window.location.href = '/admin/login';
          return { orders: [], pagination: null };
        }
        throw new Error('Failed to fetch tracking orders');
      }
      
      const data = await response.json();
      return {
        orders: data.orders as Order[],
        pagination: data.pagination
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination?.hasNextPage ? lastPage.pagination.nextOffset : undefined;
    },
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep cache for 5 minutes
    retry: (failureCount, error) => {
      // Don't retry auth failures
      if (error.message.includes('401')) return false;
      return failureCount < 2;
    }
  });

  // Flatten all pages into a single orders array
  const orders = ordersData?.pages.flatMap(page => page.orders) || [];
  const totalCount = ordersData?.pages[0]?.pagination?.totalCount || 0;

  // 🔄 INFINITE SCROLL: Detect when user scrolls near bottom
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.offsetHeight - 1000 && // Load more when 1000px from bottom
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Fetch order statistics - Manual refresh only
  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['order-management-statistics-updated'],
    queryFn: async () => {
      const response = await fetch('/api/order-management/statistics', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/admin/login';
          return {};
        }
        throw new Error('Failed to fetch order statistics');
      }
      const data = await response.json();
      console.log('📊 [STATS] Statistics loaded:', data);
      return data as OrderStats;
    },
    staleTime: 10000, // Consider data stale after 10 seconds
    gcTime: 60000, // Keep cache for 1 minute
    retry: 2
  });

  // Handle sorting
  const handleSort = (field: keyof Order) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter and sort orders (minimum 3 characters required for search)
  const filteredOrders = orders?.filter(order => {
    // Require minimum 3 characters for search to activate
    const searchActive = searchTerm.length >= 3;
    const searchLower = searchTerm.toLowerCase();
    
    const matchesSearch = !searchActive || 
      order.customerName?.toLowerCase().includes(searchLower) ||
      order.customerEmail?.toLowerCase().includes(searchLower) ||
      order.customerOrderId?.toString().includes(searchTerm) ||
      order.orderNumber?.toLowerCase().includes(searchLower) ||
      order.deliveryCode?.toLowerCase().includes(searchLower) ||
      order.customerPhone?.toLowerCase().includes(searchLower);
    
    // Enhanced status filtering including problematic orders
    let matchesStatus = true;
    if (selectedStatus === 'problematic') {
      // Filter for problematic/failed orders only
      const statusInfo = getStatusDisplay(order);
      matchesStatus = statusInfo.isProblematic === true;
    } else if (selectedStatus !== 'all') {
      matchesStatus = order.status === selectedStatus;
    }
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    // Handle undefined values
    if (aValue === undefined && bValue === undefined) return 0;
    if (aValue === undefined) return 1;
    if (bValue === undefined) return -1;
    
    // Handle different data types
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  }) || [];

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'outline';
      case 'confirmed':
        return 'secondary';
      case 'financial_approved':
        return 'default';
      case 'financial_rejected':
        return 'destructive';
      case 'delivered':
        return 'default';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Format date for display - Show exact checkout submission time in Gregorian
  const formatDateDetailed = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Format amount with currency
  const formatAmount = (amount: number | string | null | undefined, currency: string) => {
    if (amount === null || amount === undefined) return `0 ${currency}`;
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return `0 ${currency}`;
    return `${numericAmount.toLocaleString()} ${currency}`;
  };

  // Print function for order details
  const handlePrintOrder = () => {
    if (!selectedOrder) return;
    
    const statusInfo = getStatusDisplay(selectedOrder);
    
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>جزئیات سفارش ${selectedOrder.orderNumber || `#${selectedOrder.customerOrderId}`}</title>
        <style>
          body { font-family: 'Tahoma', sans-serif; margin: 15px; direction: rtl; font-size: 13px; }
          .header { text-align: center; border-bottom: 1px solid #333; padding-bottom: 12px; margin-bottom: 12px; }
          .company-logo { max-width: 100px; height: auto; margin-bottom: 6px; }
          .company-name { font-size: 18px; font-weight: bold; color: #1a365d; }
          .order-title { font-size: 14px; margin-top: 6px; }
          .section { margin-bottom: 12px; }
          .section-title { font-size: 14px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 6px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
          .info-item { border: 1px solid #ddd; padding: 6px; border-radius: 3px; }
          .info-label { font-weight: bold; color: #666; font-size: 10px; }
          .info-value { margin-top: 3px; font-size: 12px; }
          .notes-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-top: 6px; }
          .notes-item { padding: 6px; border-radius: 3px; text-align: right; border: 1px solid #ddd; background-color: #f8f9fa; }
          .footer { margin-top: 15px; text-align: center; font-size: 10px; color: #666; }
          .status-badge { display: inline-block; padding: 2px 6px; border-radius: 8px; font-size: 10px; font-weight: bold; }
          .payment-method { display: inline-block; padding: 1px 4px; background-color: #e5e7eb; border-radius: 3px; font-size: 10px; }
          @media print { 
            body { 
              margin: 0; 
              padding: 8mm 6mm 8mm 6mm; 
              box-sizing: border-box;
              font-size: 9pt;
              line-height: 1.2;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header { 
              margin-bottom: 6mm; 
              padding-bottom: 4mm;
              page-break-after: avoid;
            }
            .company-logo { max-width: 60px; margin-bottom: 2mm; }
            .company-name { font-size: 14pt; }
            .order-title { font-size: 11pt; margin-top: 2mm; }
            .section { 
              margin-bottom: 4mm; 
              page-break-inside: avoid;
            }
            .section-title { 
              font-size: 11pt; 
              margin-bottom: 2mm; 
              padding-bottom: 1mm;
            }
            .info-grid { 
              grid-template-columns: 1fr 1fr; 
              gap: 2mm;
              margin-bottom: 2mm;
            }
            .info-item { 
              padding: 2mm; 
              border: 0.5pt solid #ddd;
            }
            .info-label { font-size: 8pt; }
            .info-value { font-size: 9pt; margin-top: 1mm; }
            .notes-grid { 
              grid-template-columns: 1fr 1fr 1fr; 
              gap: 2mm;
              margin-top: 2mm;
            }
            .notes-item { 
              padding: 2mm; 
              border: 0.5pt solid #ddd;
              font-size: 8pt;
            }
            .footer { 
              margin-top: 4mm; 
              page-break-inside: avoid;
              font-size: 8pt;
            }
            .status-badge { 
              font-size: 8pt; 
              padding: 1mm 2mm;
            }
            .payment-method { 
              font-size: 8pt; 
              padding: 0.5mm 1mm;
            }
            @page {
              margin: 8mm 6mm 8mm 6mm;
              size: A4;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/uploads/Logo_1753245273579.jpeg" alt="لوگوی شرکت" class="company-logo" />
          <div class="company-name">شرکت ممتاز شیمی</div>
          <div class="order-title">جزئیات سفارش ${selectedOrder.orderNumber || `#${selectedOrder.customerOrderId}`}</div>
          <div style="font-size: 12px; margin-top: 10px;">تاریخ چاپ: ${new Date().toLocaleDateString('en-GB')}</div>
        </div>

        <div class="section">
          <div class="section-title">اطلاعات مشتری</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">نام مشتری</div>
              <div class="info-value">${selectedOrder.customerName || 'نامشخص'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">شماره تماس</div>
              <div class="info-value">${selectedOrder.customerPhone || 'نامشخص'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">ایمیل</div>
              <div class="info-value">${selectedOrder.customerEmail || 'نامشخص'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">مبلغ کل</div>
              <div class="info-value" style="color: #059669; font-weight: bold;">${formatAmount(selectedOrder.totalAmount, selectedOrder.currency)}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">اطلاعات مالی و وضعیت</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">روش پرداخت</div>
              <div class="info-value payment-method">${selectedOrder.paymentMethod || 'نامشخص'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">وضعیت فعلی</div>
              <div class="info-value status-badge" style="background-color: #e5e7eb; color: #374151;">${statusInfo.label}</div>
            </div>
            <div class="info-item">
              <div class="info-label">بخش مسئول</div>
              <div class="info-value">${statusInfo.department}</div>
            </div>
            <div class="info-item">
              <div class="info-label">کد تحویل</div>
              <div class="info-value">${selectedOrder.deliveryCode || 'تخصیص نشده'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">اطلاعات تحویل</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">شماره رهگیری</div>
              <div class="info-value">${selectedOrder.trackingNumber || 'تخصیص نشده'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">تاریخ تحویل تخمینی</div>
              <div class="info-value">${selectedOrder.estimatedDeliveryDate ? formatDate(selectedOrder.estimatedDeliveryDate) : 'تعیین نشده'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">تاریخ تحویل واقعی</div>
              <div class="info-value">${selectedOrder.actualDeliveryDate ? formatDate(selectedOrder.actualDeliveryDate) : 'تحویل نشده'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">نام تحویل‌دهنده</div>
              <div class="info-value">${selectedOrder.deliveryPersonName || 'تخصیص نشده'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">تلفن تحویل‌دهنده</div>
              <div class="info-value">${selectedOrder.deliveryPersonPhone || 'تخصیص نشده'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">یادداشت‌های بخش‌ها</div>
          <div class="notes-grid">
            <div class="notes-item">
              <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px;">📋 یادداشت‌های مالی</div>
              <div style="font-size: 13px; line-height: 1.4;">${selectedOrder.financialNotes || 'یادداشتی وجود ندارد'}</div>
            </div>
            <div class="notes-item">
              <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px;">📦 یادداشت‌های انبار</div>
              <div style="font-size: 13px; line-height: 1.4;">${selectedOrder.warehouseNotes || 'یادداشتی وجود ندارد'}</div>
            </div>
            <div class="notes-item">
              <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px;">🚛 یادداشت‌های لجستیک</div>
              <div style="font-size: 13px; line-height: 1.4;">${selectedOrder.logisticsNotes || 'یادداشتی وجود ندارد'}</div>
            </div>
          </div>
        </div>

        ${statusInfo.isProblematic && statusInfo.explanation ? `
          <div class="section">
            <div class="section-title">⚠️ توضیحات مشکل</div>
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca; color: #7f1d1d;">
              ${statusInfo.explanation}
            </div>
          </div>
        ` : ''}

        <div class="section">
          <div class="section-title">زمان‌های ثبت و بروزرسانی</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">تاریخ ثبت سفارش</div>
              <div class="info-value">${formatDate(selectedOrder.createdAt)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">آخرین بروزرسانی</div>
              <div class="info-value">${formatDate(selectedOrder.updatedAt)}</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>این سند توسط سیستم مدیریت سفارشات ممتاز شیمی تولید شده است</p>
          <p>تاریخ و زمان چاپ: ${new Date().toLocaleString('en-GB', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}</p>
        </div>
      </body>
      </html>
    `;

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load and then print
      const handlePrint = () => {
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      };
      
      if (printWindow.document.readyState === 'complete') {
        handlePrint();
      } else {
        printWindow.onload = handlePrint;
        setTimeout(handlePrint, 1500);
      }
    } else {
      // Fallback: Use blob and object URL
      const blob = new Blob([printContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWindow2 = window.open(url, '_blank');
      if (printWindow2) {
        setTimeout(() => {
          printWindow2.print();
          URL.revokeObjectURL(url);
        }, 1500);
      }
    }
  };

  // Debug information display
  console.log('🔍 [RENDER DEBUG] Component state:', {
    isLoading,
    isLoadingStats,
    ordersData: orders,
    ordersCount: orders?.length || 0,
    hasOrders: !!orders,
  });

  // Show login prompt if authentication error
  if (error && error.message.includes('401')) {
    return (
      <div className="space-y-6 p-6" dir="rtl">
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />
          <h2 className="mt-4 text-xl font-bold text-gray-800">جلسه منقضی شده</h2>
          <p className="mt-2 text-gray-600">برای مشاهده سفارشات، لطفاً دوباره وارد شوید</p>
          <button 
            onClick={() => window.location.href = '/admin/login'}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ورود مجدد
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || isLoadingStats) {
    return (
      <div className="space-y-6 p-6" dir="rtl">
        <div className="text-center py-12">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-current border-t-transparent text-blue-600 rounded-full" role="status" aria-label="loading">
            <span className="sr-only">در حال بارگیری...</span>
          </div>
          <p className="mt-4 text-gray-700 font-medium">بارگیری سفارشات...</p>
          <p className="mt-2 text-sm text-gray-500">در حال دریافت آخرین وضعیت سفارشات</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">

      {/* UPDATED Statistics Cards with Real-time Data */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="relative">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">کل سفارشات</p>
                <p className="text-2xl font-bold text-blue-700">
                  {isLoadingStats ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    totalCount || 0
                  )}
                </p>
              </div>
            </div>
            {!isLoadingStats && (
              <div className="absolute top-2 left-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">در انتظار</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {isLoadingStats ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    stats?.pendingOrders || 0
                  )}
                </p>
              </div>
            </div>
            {!isLoadingStats && (
              <div className="absolute top-2 left-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">تکمیل شده</p>
                <p className="text-2xl font-bold text-green-700">
                  {isLoadingStats ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    stats?.completedOrders || 0
                  )}
                </p>
              </div>
            </div>
            {!isLoadingStats && (
              <div className="absolute top-2 left-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">درآمد کل (30 روز)</p>
                <p className="text-lg font-bold text-green-700">
                  {isLoadingStats ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    `${(stats?.totalRevenue || 0).toLocaleString()} IQD`
                  )}
                </p>
              </div>
            </div>
            {!isLoadingStats && (
              <div className="absolute top-2 left-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">میانگین سفارش</p>
                <p className="text-lg font-bold text-purple-700">
                  {isLoadingStats ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    `${(stats?.averageOrderValue || 0).toLocaleString()} IQD`
                  )}
                </p>
              </div>
            </div>
            {!isLoadingStats && (
              <div className="absolute top-2 left-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">سفارشات امروز</p>
                <p className="text-2xl font-bold text-orange-700">
                  {isLoadingStats ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    stats?.todaysOrders || 0
                  )}
                </p>
              </div>
            </div>
            {!isLoadingStats && (
              <div className="absolute top-2 left-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Real-time Update Indicator */}
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-800 font-medium">
            آمارها - بروزرسانی دستی
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => refetchStats()}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            به‌روزرسانی فوری
          </button>
          {isLoadingStats && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
          )}
        </div>
      </div>


      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="جستجو (حداقل ۳ حرف): شماره سفارش، ایمیل، کد تحویل، تلفن..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
            data-testid="input-order-search"
          />
          {searchTerm.length > 0 && searchTerm.length < 3 && (
            <span className="absolute left-3 top-3 text-xs text-amber-600">
              حداقل ۳ حرف وارد کنید
            </span>
          )}
        </div>
        <select 
          value={selectedStatus} 
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">همه وضعیت‌ها</option>
          <option value="problematic" className="text-red-600 font-medium">🚨 فقط مشکل‌دار و شکست خورده</option>
          <option value="pending">در انتظار</option>
          <option value="confirmed">تأیید شده</option>
          <option value="financial_approved">تأیید مالی</option>
          <option value="delivered">تحویل شده</option>
          <option value="completed">تکمیل شده</option>
          <option value="cancelled">لغو شده</option>
          <option value="deleted">حذف شده</option>
          <option value="financial_rejected">رد مالی</option>
          <option value="payment_failed">پرداخت ناموفق</option>
          <option value="warehouse_rejected">رد انبار</option>
          <option value="expired">منقضی شده</option>
        </select>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            لیست سفارشات ({filteredOrders.length})
          </CardTitle>
          <CardDescription>
            مشاهده و پیگیری تمامی سفارشات موجود در سیستم
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 bg-gray-50 dark:bg-gray-800">
                  <th className="text-right p-4 font-semibold" style={{ width: '140px' }}>
                    <button 
                      onClick={() => handleSort('orderNumber')}
                      className="flex items-center justify-end w-full hover:text-blue-600 transition-colors"
                    >
                      شماره سفارش
                      {sortField === 'orderNumber' && (
                        <span className="mr-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="text-right p-4 font-semibold" style={{ width: '200px' }}>
                    <button 
                      onClick={() => handleSort('customerName')}
                      className="flex items-center justify-end w-full hover:text-blue-600 transition-colors"
                    >
                      مشتری
                      {sortField === 'customerName' && (
                        <span className="mr-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="text-right p-4 font-semibold" style={{ width: '120px' }}>
                    <button 
                      onClick={() => handleSort('totalAmount')}
                      className="flex items-center justify-end w-full hover:text-blue-600 transition-colors"
                    >
                      مبلغ
                      {sortField === 'totalAmount' && (
                        <span className="mr-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="text-right p-4 font-semibold" style={{ width: '200px' }}>
                    <button 
                      onClick={() => handleSort('status')}
                      className="flex items-center justify-end w-full hover:text-blue-600 transition-colors"
                    >
                      وضعیت / توضیحات مشکلات
                      {sortField === 'status' && (
                        <span className="mr-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="text-right p-4 font-semibold" style={{ width: '140px' }}>
                    <button 
                      onClick={() => handleSort('createdAt')}
                      className="flex items-center justify-end w-full hover:text-blue-600 transition-colors"
                    >
                      زمان ثبت سفارش
                      {sortField === 'createdAt' && (
                        <span className="mr-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="text-center p-4 font-semibold" style={{ width: '100px' }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    order.status === 'deleted' ? 'bg-orange-50/50 hover:bg-orange-100/50' : ''
                  }`}>
                    <td className="p-4 text-right" style={{ width: '140px' }}>
                      <div className="font-medium text-blue-600">#{order.orderNumber || order.customerOrderId}</div>
                    </td>
                    <td className="p-4 text-right" style={{ width: '200px' }}>
                      <div className="space-y-1">
                        <div className="font-medium">{order.customerName || 'نامشخص'}</div>
                        <div className="text-xs text-gray-600">{order.customerEmail}</div>
                        <div className="text-xs text-gray-600">{order.customerPhone}</div>
                      </div>
                    </td>
                    <td className="p-4 text-right" style={{ width: '120px' }}>
                      <div className="font-medium text-sm">
                        {formatAmount(order.totalAmount, order.currency || 'IQD')}
                      </div>
                    </td>
                    <td className="p-4 text-right" style={{ width: '200px' }}>
                      {(() => {
                        const statusInfo = getStatusDisplay(order);
                        return (
                          <div className="space-y-1">
                            <div className={`px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                              {statusInfo.label}
                            </div>
                            <div className="text-xs text-gray-600 text-center">
                              {statusInfo.department}
                            </div>
                            {/* Show detailed explanation for failed/problematic orders */}
                            {statusInfo.isProblematic && statusInfo.explanation && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                                <div className="flex items-start gap-1">
                                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span className="leading-tight">{statusInfo.explanation}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-4 text-right" style={{ width: '140px' }}>
                      <div className="text-sm">
                        {order.createdAt ? formatDate(order.createdAt) : 'در حال بارگیری...'}
                      </div>
                    </td>
                    <td className="p-4 text-center" style={{ width: '100px' }}>
                      <Dialog>
                        <DialogTrigger asChild>
                          <button
                            className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="w-4 h-4" />
                            مشاهده
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
                          <DialogHeader>
                            <div className="flex items-center justify-between">
                              <DialogTitle className="flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                جزئیات سفارش {selectedOrder?.orderNumber || `#${selectedOrder?.customerOrderId}`}
                              </DialogTitle>
                              <button
                                onClick={handlePrintOrder}
                                className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                title="چاپ جزئیات سفارش"
                              >
                                <Printer className="w-4 h-4" />
                                چاپ
                              </button>
                            </div>
                          </DialogHeader>
                          
                          {selectedOrder && (
                            <div className="space-y-6">
                              {/* Customer Information */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                      <User className="w-5 h-5" />
                                      اطلاعات مشتری
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    <div><strong>نام:</strong> {selectedOrder.customerName || 'نامشخص'}</div>
                                    <div><strong>ایمیل:</strong> {selectedOrder.customerEmail || 'نامشخص'}</div>
                                    <div><strong>تلفن:</strong> {selectedOrder.customerPhone || 'نامشخص'}</div>
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                      <CreditCard className="w-5 h-5" />
                                      اطلاعات مالی
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    <div><strong>مبلغ کل:</strong> {formatAmount(selectedOrder.totalAmount, selectedOrder.currency)}</div>
                                    <div className="flex items-center gap-2">
                                      <strong>روش پرداخت:</strong>
                                      {selectedOrder.paymentMethod ? (
                                        <PaymentMethodBadge 
                                          paymentMethod={selectedOrder.paymentMethod}
                                          showIcon={true}
                                          className="text-xs"
                                        />
                                      ) : (
                                        <span>نامشخص</span>
                                      )}
                                    </div>
                                    <div><strong>وضعیت فعلی:</strong> 
                                      {(() => {
                                        const statusInfo = getStatusDisplay(selectedOrder);
                                        return (
                                          <div className="space-y-2 mt-2">
                                            <div className="inline-flex items-center gap-2">
                                              <div className={`px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color}`}>
                                                {statusInfo.label}
                                              </div>
                                              <div className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                                                {statusInfo.department}
                                              </div>
                                            </div>
                                            {/* Show detailed explanation for failed/problematic orders in dialog */}
                                            {statusInfo.isProblematic && statusInfo.explanation && (
                                              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <div className="flex items-start gap-2">
                                                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
                                                  <div>
                                                    <div className="text-sm font-medium text-red-800 mb-1">توضیحات مشکل:</div>
                                                    <div className="text-sm text-red-700">{statusInfo.explanation}</div>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>

                              {/* Delivery Information */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <Truck className="w-5 h-5" />
                                    اطلاعات تحویل
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div><strong>کد تحویل:</strong> {selectedOrder.deliveryCode || 'تخصیص نشده'}</div>
                                  <div><strong>شماره رهگیری:</strong> {selectedOrder.trackingNumber || 'تخصیص نشده'}</div>
                                  <div><strong>تاریخ تحویل تخمینی:</strong> {selectedOrder.estimatedDeliveryDate ? formatDate(selectedOrder.estimatedDeliveryDate) : 'تعیین نشده'}</div>
                                  <div><strong>تاریخ تحویل واقعی:</strong> {selectedOrder.actualDeliveryDate ? formatDate(selectedOrder.actualDeliveryDate) : 'تحویل نشده'}</div>
                                  <div><strong>نام تحویل‌دهنده:</strong> {selectedOrder.deliveryPersonName || 'تخصیص نشده'}</div>
                                  <div><strong>تلفن تحویل‌دهنده:</strong> {selectedOrder.deliveryPersonPhone || 'تخصیص نشده'}</div>
                                </CardContent>
                              </Card>

                              {/* Department Notes */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <FileText className="w-4 h-4" />
                                      یادداشت‌های مالی
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <p className="text-sm text-gray-600">
                                      {selectedOrder.financialNotes || 'یادداشتی وجود ندارد'}
                                    </p>
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <Package className="w-4 h-4" />
                                      یادداشت‌های انبار
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <p className="text-sm text-gray-600">
                                      {selectedOrder.warehouseNotes || 'یادداشتی وجود ندارد'}
                                    </p>
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <Truck className="w-4 h-4" />
                                      یادداشت‌های لجستیک
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <p className="text-sm text-gray-600">
                                      {selectedOrder.logisticsNotes || 'یادداشتی وجود ندارد'}
                                    </p>
                                  </CardContent>
                                </Card>
                              </div>

                              {/* Timestamps */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    زمان‌های ثبت و بروزرسانی
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <div className="p-3 bg-green-50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                      <strong className="text-green-800">زمان ثبت سفارش توسط مشتری:</strong>
                                    </div>
                                    <div className="text-green-700 text-sm">
                                      {formatDate(selectedOrder.createdAt)}
                                    </div>
                                    <div className="text-xs text-green-600 mt-1">
                                      (زمان دقیق submit کردن سفارش در صفحه checkout)
                                    </div>
                                  </div>
                                  <div className="p-3 bg-blue-50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Activity className="w-4 h-4 text-blue-600" />
                                      <strong className="text-blue-800">آخرین بروزرسانی وضعیت:</strong>
                                    </div>
                                    <div className="text-blue-700 text-sm">
                                      {formatDate(selectedOrder.updatedAt)}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">سفارشی یافت نشد</h3>
              <p className="text-gray-600">
                {searchTerm || selectedStatus !== 'all' 
                  ? 'هیچ سفارشی با فیلترهای انتخابی یافت نشد'
                  : 'هنوز سفارشی در سیستم ثبت نشده است'}
              </p>
            </div>
          )}

          {/* 📊 PAGINATION STATUS AND LOADING INDICATORS */}
          <div className="mt-6 space-y-4">
            {/* Loading Next Page Indicator */}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-6 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full mr-3" role="status" aria-label="loading"></div>
                <span className="text-blue-800 font-medium">در حال بارگیری سفارشات بیشتر...</span>
              </div>
            )}

            {/* Pagination Status */}
            {orders.length > 0 && (
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">
                      <strong className="text-gray-900">{orders.length}</strong> از <strong className="text-gray-900">{totalCount}</strong> سفارش بارگیری شده
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min((orders.length / totalCount) * 100, 100)}%` }}
                    ></div>
                  </div>
                  
                  <span className="text-xs text-gray-500">
                    {Math.round((orders.length / totalCount) * 100)}%
                  </span>
                </div>

                {/* Manual Load More Button (as backup) */}
                {hasNextPage && !isFetchingNextPage && (
                  <button
                    onClick={() => fetchNextPage()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    بارگیری بیشتر
                  </button>
                )}
              </div>
            )}

            {/* End of List Indicator */}
            {!hasNextPage && orders.length > 0 && !isLoading && (
              <div className="text-center py-6 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <span className="text-green-800 font-medium">
                  همه سفارشات بارگیری شد ({orders.length} سفارش)
                </span>
                <p className="text-sm text-green-600 mt-1">
                  برای مشاهده سفارشات جدید، صفحه را بازخوانی کنید
                </p>
              </div>
            )}

            {/* Auto-scroll Status (only show when actively loading) */}
            {hasNextPage && orders.length > 50 && (
              <div className="text-center py-3">
                <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                  <Activity className="w-3 h-3" />
                  برای بارگیری خودکار سفارشات بیشتر، به پایین صفحه اسکرول کنید
                </p>
              </div>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}