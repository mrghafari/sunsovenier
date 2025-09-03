import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  DollarSign, 
  CheckCircle, 
  CheckCircle2,
  XCircle, 
  Eye, 
  Clock,
  RefreshCw,
  FileText,
  CreditCard,
  Barcode,
  Plus,
  Search,
  Filter,
  Download,
  TrendingUp,
  Users,
  ShoppingCart,
  AlertTriangle,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Receipt,
  ChevronRight,
  ExternalLink,
  Wallet,
  Building,
  Timer,
  Bell,
  Settings,
  MessageSquare,
  Save,
  Edit,
  Trash2,
  AlertCircle,
  Activity,
  BarChart3,
  X,
  User,
  Package,
  ImageIcon,
  Wrench,
  Upload,
  HelpCircle,
  Printer
} from "lucide-react";
import InternalBarcodeCard from "@/components/InternalBarcodeCard";
import GlobalRefreshControl from "@/components/GlobalRefreshControl";

import { useToast } from "@/hooks/use-toast";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import { formatCurrency } from "@/lib/utils";
import PaymentMethodBadge from "@/components/PaymentMethodBadge";

// Safe date formatting function to prevent Invalid Date errors
const formatDateSafe = (dateString: string | null | undefined, locale = 'en-US', options = {}): string => {
  if (!dateString) return 'تاریخ نامشخص';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'تاریخ نامعتبر';
    
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    });
  } catch (error) {
    return 'خطا در تاریخ';
  }
};

interface OrderManagement {
  id: number;
  customerOrderId: number;
  orderNumber?: string; // شماره سفارش M[YY][NNNNN]
  currentStatus: string;
  totalAmount: string;
  currency: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentReceiptUrl?: string;
  financialNotes?: string;
  financialReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string; // اضافه شده: نام کامل مشتری
  customer?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  receipt?: {
    url: string;
    fileName: string;
    mimeType: string;
  };
  receiptUrl?: string;
  receiptFileName?: string;
  receiptMimeType?: string;
  financialReviewerId?: number;
  deliveryCode?: string;
  shippingAddress?: any;
  billingAddress?: any;
}

// Helper function to get customer info with fallback
const getCustomerInfo = (order: OrderManagement) => {
  // Try to use the customerName field first (from API)
  if (order.customerName && order.customerName.trim()) {
    const nameParts = order.customerName.trim().split(' ');
    return {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: order.customerEmail || '',
      phone: order.customerPhone || ''
    };
  }
  
  // Fallback to customer object
  if (order.customer) {
    return {
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      email: order.customer.email,
      phone: order.customer.phone
    };
  }
  
  // Final fallback to individual fields
  return {
    firstName: order.customerFirstName || '',
    lastName: order.customerLastName || '',
    email: order.customerEmail || '',
    phone: order.customerPhone || ''
  };
};

function FinanceOrders() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<OrderManagement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [receiptAmount, setReceiptAmount] = useState("");
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("pending");
  const [orderDetailsModalOpen, setOrderDetailsModalOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [orderDocuments, setOrderDocuments] = useState<any[]>([]);

  // Check admin authentication - MOVED to top to avoid conditional hooks
  const { data: adminUser, isLoading: isCheckingAuth, error: authError } = useQuery({
    queryKey: ['/api/admin/me'],
    queryFn: () => fetch('/api/admin/me', { credentials: 'include' }).then(res => res.json()),
    retry: false,
    staleTime: 0,
  });

  // Enable audio notifications - ALWAYS call hooks unconditionally
  const { orderCount } = useOrderNotifications({
    department: 'financial',
    enabled: Boolean(adminUser?.success) // Convert to boolean to avoid undefined
  });

  // Get orders for financial review - MOVED to top - Using global refresh control
  const { data: ordersResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/financial/orders'],
    queryFn: async () => {
      const res = await fetch('/api/financial/orders', { credentials: 'include' });
      const data = await res.json();
      return data;
    },
    enabled: Boolean(adminUser?.success), // Only run if authenticated
    staleTime: 0,
  });

  // Fetch approved orders that have been transferred to warehouse - MOVED to top
  const { data: approvedOrdersResponse, isLoading: isLoadingApproved, refetch: refetchApproved } = useQuery({
    queryKey: ['/api/financial/approved-orders'],
    queryFn: async () => {
      const res = await fetch('/api/financial/approved-orders', { credentials: 'include' });
      const data = await res.json();
      console.log('🔍 [APPROVED ORDERS] Raw response:', data);
      return data;
    },
    enabled: Boolean(adminUser?.success), // Only run if authenticated
    staleTime: 0,
    refetchOnWindowFocus: false, // Disable aggressive refetching
    refetchInterval: false, // Disable automatic refetch
  });

  // Fetch company information for logo - MOVED to top to avoid conditional hooks
  const { data: companyInfo } = useQuery({
    queryKey: ['/api/admin/company-information'],
    enabled: true
  });

  // Send reminder mutation - MOVED to top to avoid conditional hooks
  const sendReminderMutation = useMutation({
    mutationFn: async ({ orderId, type }: { orderId: number; type: string }) => {
      return apiRequest(`/api/orphan-orders/${orderId}/send-reminder`, {
        method: 'POST',
        body: { type }
      });
    },
    onSuccess: () => {
      toast({
        title: "موفق",
        description: "یادآور با موفقیت ارسال شد",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orphan-orders/active'] });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در ارسال یادآور",
        variant: "destructive",
      });
    }
  });

  // Early return for loading state - AFTER all hooks are called
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>بررسی احراز هویت...</p>
        </div>
      </div>
    );
  }

  // Early return for unauthenticated state
  if (!adminUser || !adminUser.success) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              دسترسی محدود
            </CardTitle>
            <CardDescription className="text-center">
              برای دسترسی به بخش مالی، ابتدا وارد حساب مدیریت شوید
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="text-sm text-gray-600">
              شما با حساب مشتری وارد شده‌اید. لطفاً از حساب مدیریت استفاده کنید.
            </p>
            <Button 
              onClick={() => window.location.href = '/admin-login'} 
              className="w-full"
            >
              ورود به حساب مدیریت
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Force refresh function that completely clears all finance cache
  const forceRefreshFinanceOrders = async () => {
    // Clear all finance cache first
    await queryClient.invalidateQueries({ queryKey: ['/api/financial/orders'] });
    await queryClient.removeQueries({ queryKey: ['/api/financial/orders'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/financial/approved-orders'] });
    await queryClient.removeQueries({ queryKey: ['/api/financial/approved-orders'] });
    // Then refetch both
    await refetch();
    await refetchApproved();
    toast({
      title: "🔄 به‌روزرسانی شد",
      description: "تمام اطلاعات مالی از سرور بازیابی شد",
    });
  };





  const allOrders: OrderManagement[] = ordersResponse?.orders || [];
  // Handle both array and object response formats
  const transferredOrders: OrderManagement[] = Array.isArray(approvedOrdersResponse) 
    ? approvedOrdersResponse 
    : (approvedOrdersResponse?.orders || []);
    

  
  // Filter and search functionality
  const filteredOrders = allOrders.filter(order => {
    const searchMatch = !searchTerm || 
      order.customer?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerOrderId?.toString().includes(searchTerm);
    
    const statusMatch = statusFilter === "all" || order.currentStatus === statusFilter;
    
    return searchMatch && statusMatch;
  });

  // Filter transferred orders and sort by creation date (oldest first)
  const filteredTransferredOrders = transferredOrders.filter(order => {
    const searchMatch = !searchTerm || 
      order.customer?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerOrderId?.toString().includes(searchTerm);
    
    return searchMatch;
  }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Separate orders by status for tabs and sort by creation date (oldest first)
  const pendingOrders = filteredOrders.filter(order => 
    ['pending', 'pending_payment', 'payment_uploaded', 'financial_reviewing'].includes(order.currentStatus)
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  const rejectedOrders = filteredOrders.filter(order => 
    order.currentStatus === 'financial_rejected'
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Separate wallet orders for special display (already sorted by pendingOrders)
  const walletOrders = pendingOrders.filter(order => 
    order.paymentMethod === 'wallet_full' || order.paymentMethod === 'wallet_partial'
  );
  
  const bankOrders = pendingOrders.filter(order => 
    order.paymentMethod !== 'wallet_full' && order.paymentMethod !== 'wallet_partial'
  );

  // Statistics - Only calculate total for approved/transferred orders
  const totalAmount = transferredOrders.reduce((sum, order) => 
    sum + parseFloat(order.totalAmount || '0'), 0
  );
  
  const totalTransferred = filteredTransferredOrders.reduce((sum, order) => 
    sum + parseFloat(order.totalAmount || '0'), 0
  );

  // Fetch order details function for admin users
  const fetchOrderDetails = async (orderNumber: string) => {
    try {
      // For admin users, we need to find the order by orderNumber first, then get details by ID
      const findOrderResponse = await fetch(`/api/admin/orders/find-by-number/${orderNumber}`, {
        credentials: 'include'
      });
      
      if (!findOrderResponse.ok) {
        throw new Error('Failed to find order');
      }
      
      const findOrderData = await findOrderResponse.json();
      if (!findOrderData.success || !findOrderData.order) {
        throw new Error('Order not found');
      }
      
      // Now get the order details using the customer order ID
      const detailsResponse = await fetch(`/api/admin/orders/${findOrderData.order.id}/details`, {
        credentials: 'include'
      });
      
      if (!detailsResponse.ok) {
        throw new Error('Failed to fetch order details');
      }
      
      const detailsData = await detailsResponse.json();
      if (detailsData.success) {
        console.log('📋 [ORDER DETAILS] Order fetched:', detailsData.order.orderNumber);
        console.log('📋 [ORDER DETAILS] Items count:', detailsData.order.items?.length || 0);
        console.log('📋 [ORDER DETAILS] Items data:', detailsData.order.items);
        setOrderDetails(detailsData.order);
        setOrderDocuments(detailsData.documents || []);
        setOrderDetailsModalOpen(true);
      } else {
        throw new Error(detailsData.message || 'Failed to get order details');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast({
        variant: "destructive", 
        title: "خطا",
        description: "امکان دریافت جزئیات سفارش وجود ندارد"
      });
    }
  };

  // Auto-refresh controlled by global settings
  useEffect(() => {
    if (ordersResponse?.orders && ordersResponse.orders.length >= 0) { // Start auto-refresh after successful data load
      const checkRefreshSettings = () => {
        const globalSettings = localStorage.getItem('global-refresh-settings');
        if (globalSettings) {
          const settings = JSON.parse(globalSettings);
          const financeSettings = settings.departments.finance;
          
          if (financeSettings.autoRefresh) {
            const refreshInterval = settings.syncEnabled 
              ? settings.globalInterval 
              : financeSettings.interval;
            
            return refreshInterval * 1000; // Convert seconds to milliseconds
          }
        }
        return 600000; // Default 10 minutes if no settings found
      };

      const intervalMs = checkRefreshSettings();
      const interval = setInterval(() => {
        // Check if refresh is still enabled before executing
        const currentSettings = localStorage.getItem('global-refresh-settings');
        if (currentSettings) {
          const settings = JSON.parse(currentSettings);
          if (settings.departments.finance.autoRefresh) {
            refetch();
            refetchApproved();
          }
        }
      }, intervalMs);

      return () => clearInterval(interval);
    }
  }, [ordersResponse, refetch, refetchApproved]);


  // Mutations for approve/reject
  const approveMutation = useMutation({
    mutationFn: async ({ orderId, notes, receiptAmount }: { orderId: number; notes: string; receiptAmount?: string }) => {
      console.log(`🔄 [FINANCE] Sending approve request for order ${orderId} with receipt amount: ${receiptAmount}`);
      return apiRequest(`/api/finance/orders/${orderId}/approve`, {
        method: 'POST',
        body: { notes, receiptAmount }
      });
    },
    onSuccess: (response) => {
      console.log(`✅ [FINANCE] Order approved successfully:`, response);
      toast({
        title: "✅ سفارش تایید شد",
        description: "پرداخت تایید شد و سفارش به واحد انبار منتقل شد"
      });
      // Invalidate all finance-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/financial/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial/approved-orders'] });
      
      // Force refresh the data immediately
      refetch();
      refetchApproved();
      
      // Close modals and reset state
      setDialogOpen(false);
      setOrderDetailsModalOpen(false);
      setSelectedOrder(null);
      setOrderDetails(null);
      setReviewNotes("");
    },
    onError: (error: any) => {
      console.error(`❌ [FINANCE] Approve error:`, error);
      toast({
        title: "خطا در تایید",
        description: error.message || "امکان تایید سفارش وجود ندارد",
        variant: "destructive"
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: number; notes: string }) => {
      console.log(`🔄 [FINANCE] Sending reject request for order ${orderId}`);
      return apiRequest(`/api/finance/orders/${orderId}/reject`, {
        method: 'POST',
        body: { notes }
      });
    },
    onSuccess: (response) => {
      console.log(`❌ [FINANCE] Order rejected successfully:`, response);
      toast({
        title: "❌ سفارش رد شد",
        description: "پرداخت رد شد و به قسمت سفارشات رد شده منتقل شد"
      });
      // Invalidate all finance-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/financial/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial/approved-orders'] });
      
      // Force refresh the data immediately
      refetch();
      refetchApproved();
      
      // Close modals and reset state
      setDialogOpen(false);
      setOrderDetailsModalOpen(false);
      setSelectedOrder(null);
      setOrderDetails(null);
      setReviewNotes("");
    },
    onError: (error: any) => {
      console.error(`❌ [FINANCE] Reject error:`, error);
      toast({
        title: "خطا در رد سفارش",
        description: error.message || "امکان رد سفارش وجود ندارد",
        variant: "destructive"
      });
    }
  });

  // Payment workflow automation - fix incomplete payments
  const paymentAutomationMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/fix-incomplete-payments', {
        method: 'POST'
      });
    },
    onSuccess: (response) => {
      toast({
        title: "تصحیح خودکار workflow انجام شد",
        description: `${response.ordersFixed?.length || 0} سفارش تصحیح شد: ${response.ordersFixed?.join(', ') || 'هیچ موردی'}`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/financial/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial/approved-orders'] });
      refetch();
      refetchApproved();
    },
    onError: (error: any) => {
      toast({
        title: "خطا در تصحیح workflow",
        description: error.message || "امکان تصحیح workflow وجود ندارد",
        variant: "destructive"
      });
    }
  });

  // Process pending bank gateway payments
  const processPendingBankPayments = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/orders/process-pending-bank-payments', {
        method: 'POST'
      });
    },
    onSuccess: (response) => {
      toast({
        title: "پردازش درگاه انجام شد",
        description: `${response.data?.processed} سفارش از ${response.data?.totalFound} سفارش پردازش شد`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/financial/orders'] });
    },
    onError: (error: any) => {
      toast({
        title: "خطا در پردازش درگاه",
        description: error.message || "امکان پردازش سفارشات وجود ندارد",
        variant: "destructive"
      });
    }
  });

  // Save financial notes without approval/rejection
  const saveNotesMutation = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: number; notes: string }) => {
      console.log(`📝 [FINANCE] Saving notes for order ${orderId}`);
      return apiRequest(`/api/finance/orders/${orderId}/notes`, {
        method: 'POST',
        body: { notes }
      });
    },
    onSuccess: (response) => {
      console.log(`✅ [FINANCE] Notes saved successfully:`, response);
      toast({
        title: "✅ یادداشت ذخیره شد",
        description: "یادداشت مالی با موفقیت ذخیره شد"
      });
      // Refresh the orders list to show updated notes
      refetch();
      refetchApproved();
    },
    onError: (error: any) => {
      console.error(`❌ [FINANCE] Save notes error:`, error);
      toast({
        title: "خطا در ذخیره یادداشت",
        description: error.message || "امکان ذخیره یادداشت وجود ندارد",
        variant: "destructive"
      });
    }
  });

  // Generate tracking codes for order
  const generateTrackingCodes = useMutation({
    mutationFn: async (orderId: number) => {
      return apiRequest(`/api/tracking/generate/${orderId}`, {
        method: 'POST'
      });
    },
    onSuccess: (response) => {
      toast({
        title: "کدهای ردیابی ایجاد شدند",
        description: `${response.trackingCodes?.length || 0} کد ردیابی برای کالاها ایجاد شد`
      });
      // loadTrackingCodes(selectedOrderForTracking?.customerOrderId);
    },
    onError: (error: any) => {
      toast({
        title: "خطا در ایجاد کدهای ردیابی",
        description: error.message || "امکان ایجاد کدهای ردیابی وجود ندارد",
        variant: "destructive"
      });
    }
  });

  // Load tracking codes for order
  const loadTrackingCodes = async (orderId?: number) => {
    if (!orderId) return;
    
    try {
      const response = await apiRequest(`/api/tracking/order/${orderId}`, { method: 'GET' });
      // setTrackingCodes(response.trackingCodes || []);
    } catch (error) {
      console.error("Error loading tracking codes:", error);
    }
  };

  // Handle tracking modal open
  const handleTrackingModal = (order: OrderManagement) => {
    // setSelectedOrderForTracking(order);
    // setShowTrackingModal(true);
    // loadTrackingCodes(order.customerOrderId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'payment_uploaded':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">در انتظار بررسی مالی</Badge>;
      case 'financial_reviewing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">در حال بررسی</Badge>;
      case 'financial_approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700">تأیید شده</Badge>;
      case 'auto_approved':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700">تأیید درگاه بانکی</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleOrderReview = (order: OrderManagement) => {
    setSelectedOrder(order);
    setReviewNotes(order.financialNotes || "");
    setDialogOpen(true);
  };



  const handleApprove = () => {
    if (!selectedOrder) return;
    approveMutation.mutate({ 
      orderId: selectedOrder.customerOrderId, 
      notes: reviewNotes,
      receiptAmount: receiptAmount 
    });
  };

  const handleReject = () => {
    if (!selectedOrder) return;
    rejectMutation.mutate({ 
      orderId: selectedOrder.customerOrderId, 
      notes: reviewNotes 
    });
  };

  const openImageModal = async (imageUrl: string) => {
    console.log('🖼️ [IMAGE MODAL] Opening image modal with URL:', imageUrl);
    
    // Verify image exists before opening modal
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      if (!response.ok) {
        console.error('❌ [IMAGE MODAL] Image not accessible:', imageUrl, 'Status:', response.status);
        // Try to open in new tab instead
        window.open(imageUrl, '_blank');
        return;
      }
      console.log('✅ [IMAGE MODAL] Image verified accessible:', imageUrl);
    } catch (error) {
      console.error('❌ [IMAGE MODAL] Failed to verify image:', error);
      // Still try to open modal, let the image component handle the error
    }
    
    setSelectedImageUrl(imageUrl);
    setImageModalOpen(true);
  };

  // Helper function for safe date formatting
  const formatDateSafe = (dateString: string | undefined, locale: string = 'en-US') => {
    if (!dateString) return 'نامشخص';
    try {
      return new Date(dateString).toLocaleDateString(locale);
    } catch {
      return 'نامشخص';
    }
  };

  // Company info hook moved to top - was causing conditional hook error

  // Print function for order details - Enhanced to match screen display
  const handlePrintOrder = async () => {
    if (!orderDetails) return;

    // Send print content to server for PDF generation
    const itemsTotal = orderDetails.items?.reduce((sum: number, item: any) => {
      const itemTotal = parseFloat(item.price || 0) * parseInt(item.quantity || 0);
      return sum + (isNaN(itemTotal) ? 0 : itemTotal);
    }, 0) || 0;

    const printContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>جزئیات سفارش ${orderDetails.orderNumber}</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
          margin: 20px; 
          direction: rtl; 
          font-size: 14px;
          line-height: 1.6;
          background: white;
        }
        .header { 
          text-align: center; 
          border-bottom: 3px solid #2563eb; 
          padding-bottom: 15px; 
          margin-bottom: 25px; 
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-radius: 10px;
          padding: 20px;
        }
        .company-name { 
          font-size: 28px; 
          font-weight: bold; 
          color: #2563eb; 
          margin-bottom: 8px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
        .order-title {
          font-size: 20px;
          color: #1f2937;
          margin-bottom: 5px;
          font-weight: 600;
        }
        .card { 
          margin-bottom: 20px; 
          border: 1px solid #e5e7eb; 
          border-radius: 12px; 
          padding: 20px;
          background: white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .card-header { 
          font-weight: bold; 
          font-size: 18px; 
          color: #1f2937; 
          margin-bottom: 15px;
          border-bottom: 2px solid #f3f4f6;
          padding-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .card-header::before {
          content: "●";
          color: #2563eb;
          font-size: 12px;
        }
        .info-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
          gap: 15px; 
        }
        .info-item { 
          display: flex; 
          flex-direction: column;
          padding: 10px;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #2563eb;
        }
        .label { 
          font-weight: 600; 
          color: #6b7280; 
          font-size: 12px;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .value { 
          color: #1f2937; 
          font-weight: 500;
          font-size: 14px;
        }
        .address-section {
          background: #f0f9ff;
          padding: 15px;
          border-radius: 10px;
          margin-top: 10px;
          border: 1px solid #bfdbfe;
        }
        .items-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 15px;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .items-table th { 
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
          color: white;
          font-weight: bold; 
          padding: 12px 8px;
          text-align: center;
          font-size: 13px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }
        .items-table td { 
          border: 1px solid #e5e7eb; 
          padding: 10px 8px; 
          text-align: center;
          font-size: 13px;
        }
        .items-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }
        .items-table tbody tr:hover {
          background: #e0f2fe;
        }
        .total-section { 
          background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); 
          padding: 15px;
          border-radius: 10px;
          margin-top: 15px;
          border: 2px solid #f59e0b;
        }
        .total-row { 
          font-weight: bold;
          font-size: 16px;
          color: #92400e;
        }
        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          display: inline-block;
        }
        .status-confirmed { 
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); 
          color: #166534; 
          border: 1px solid #16a34a;
        }
        .status-pending { 
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
          color: #92400e; 
          border: 1px solid #f59e0b;
        }
        .status-rejected { 
          background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%); 
          color: #dc2626; 
          border: 1px solid #ef4444;
        }
        @media print {
          @page { 
            margin: 1.5cm; 
            size: A4;
          }
          body { 
            margin: 0 auto; 
            padding: 0;
            font-size: 12px;
            width: 100%;
            max-width: 210mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
          }
          .print-container {
            width: 100%;
            max-width: 180mm;
            margin: 0 auto;
            padding: 0;
          }
          .card {
            page-break-inside: avoid;
            box-shadow: none;
            border: 1px solid #ccc;
          }
          .items-table th {
            background: #f3f4f6 !important;
            color: #1f2937 !important;
            -webkit-print-color-adjust: exact;
          }
          .status-badge,
          .total-section,
          .header {
            -webkit-print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-container">
        <div class="header">
        <img src="/attached_assets/Logo_1753245273579.jpeg" alt="شرکت ممتاز شیمی" style="max-width: 120px; max-height: 80px; margin-bottom: 15px;" onerror="this.style.display='none'">
        <div class="company-name">شرکت ممتاز شیمی</div>
        <div class="order-title">جزئیات سفارش ${orderDetails.orderNumber}</div>
        <div style="font-size: 12px; color: #6b7280;">تاریخ چاپ: ${new Date().toLocaleDateString('en-US')}</div>
      </div>

      <!-- Customer Information Card -->
      <div class="card">
        <div class="card-header">اطلاعات مشتری و آدرس تحویل</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">نام مشتری</span>
            <span class="value">${orderDetails.customer?.firstName || ''} ${orderDetails.customer?.lastName || ''}</span>
          </div>
          <div class="info-item">
            <span class="label">ایمیل</span>
            <span class="value">${orderDetails.customer?.email || 'نامشخص'}</span>
          </div>
          <div class="info-item">
            <span class="label">تلفن</span>
            <span class="value">${orderDetails.customer?.phone || 'نامشخص'}</span>
          </div>
          <div class="info-item">
            <span class="label">وضعیت سفارش</span>
            <span class="value">
              <span class="status-badge ${orderDetails.currentStatus === 'warehouse_pending' ? 'status-pending' : 
                                          orderDetails.currentStatus === 'delivered' ? 'status-confirmed' : 'status-pending'}">
                ${orderDetails.currentStatus === 'warehouse_pending' ? 'در انتظار انبار' : 
                  orderDetails.currentStatus === 'delivered' ? 'تحویل شده' : 
                  orderDetails.currentStatus || 'نامشخص'}
              </span>
            </span>
          </div>
        </div>
        ${orderDetails.customer?.address ? `
        <div class="address-section">
          <div class="label" style="margin-bottom: 8px;">آدرس کامل تحویل</div>
          <div class="value" style="font-size: 15px; line-height: 1.4;">
            <strong>${orderDetails.customer.address}</strong><br>
            <span style="color: #6b7280;">${orderDetails.customer.city || ''} - ${orderDetails.customer.province || ''}</span>
          </div>
        </div>` : ''}
        <div style="margin-top: 15px;">
          <div class="info-item">
            <span class="label">تاریخ سفارش</span>
            <span class="value">${formatDateSafe(orderDetails.createdAt, 'en-US')}</span>
          </div>
        </div>
      </div>

      <!-- Order Items Card -->
      <div class="card">
        <div class="card-header">اقلام سفارش (${orderDetails.items?.length || 0} قلم)</div>
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 8%;">#</th>
              <th style="width: 45%;">نام محصول</th>
              <th style="width: 12%;">تعداد</th>
              <th style="width: 18%;">قیمت واحد (${orderDetails.currency || 'IQD'})</th>
              <th style="width: 17%;">قیمت کل (${orderDetails.currency || 'IQD'})</th>
            </tr>
          </thead>
          <tbody>
            ${orderDetails.items?.map((item: any, index: number) => {
              const unitPrice = parseFloat(item.price || 0);
              const quantity = parseInt(item.quantity || 0);
              const totalPrice = unitPrice * quantity;
              return `
              <tr>
                <td style="font-weight: bold; color: #2563eb;">${index + 1}</td>
                <td style="text-align: right; font-weight: 500;">${item.productName || 'نام محصول نامشخص'}</td>
                <td><strong>${quantity}</strong></td>
                <td>${unitPrice.toLocaleString('en-US')}</td>
                <td style="font-weight: bold; color: #059669;">${totalPrice.toLocaleString('en-US')}</td>
              </tr>`;
            }).join('') || '<tr><td colspan="5">هیچ آیتمی یافت نشد</td></tr>'}
          </tbody>
        </table>

        <div class="total-section">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 16px; font-weight: bold;">مبلغ کل سفارش:</span>
            <span style="font-size: 18px; font-weight: bold; color: #dc2626;">
              ${itemsTotal.toLocaleString('en-US')} ${orderDetails.currency || 'IQD'}
            </span>
          </div>
          <div style="margin-top: 8px; font-size: 14px; color: #92400e;">
            <strong>روش پرداخت:</strong> ${(() => {
              switch (orderDetails.paymentMethod) {
                case 'wallet_full': return 'کیف پول کامل';
                case 'bank_transfer': return 'واریز بانکی';
                case 'bank_transfer_grace': return 'واریز بانکی (مهلت‌دار)';
                case 'online_payment': return 'درگاه آنلاین';
                case 'cash': return 'نقدی';
                case 'credit': return 'اعتباری';
                default: return orderDetails.paymentMethod || 'نامشخص';
              }
            })()}
          </div>
        </div>
      </div>

      ${orderDetails.deliveryNotes ? `
      <div class="card">
        <div class="card-header">یادداشت تحویل</div>
        <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
          <div class="value" style="line-height: 1.6; font-size: 14px;">${orderDetails.deliveryNotes}</div>
        </div>
      </div>` : ''}

      <div style="margin-top: 40px; text-align: center; padding: 15px; border-top: 2px solid #e5e7eb;">
        <div style="font-size: 12px; color: #6b7280; line-height: 1.4;">
          <strong>این سند توسط سیستم مدیریت ممتاز شیمی تولید شده است</strong><br>
          تاریخ چاپ: ${new Date().toLocaleString('en-US')} | شماره سفارش: ${orderDetails.orderNumber}
        </div>
      </div>
      </div>
    </body>
    </html>
    `;

    // Send to server for PDF generation and download
    try {
      const response = await fetch('/api/financial/print-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          htmlContent: printContent,
          filename: `order-${orderDetails.orderNumber}.pdf`
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `order-${orderDetails.orderNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast({
        title: "خطا در تولید PDF",
        description: "نتوانستیم فایل PDF را تولید کنیم. لطفاً مجدداً تلاش کنید.",
        variant: "destructive",
      });
    }
  };

  // Handle accept order from order details modal
  const handleAcceptOrder = () => {
    if (!orderDetails) return;
    
    // Find the corresponding order from allOrders using orderDetails.id (customer order ID)
    const correspondingOrder = allOrders.find(order => order.customerOrderId === orderDetails.id);
    
    if (!correspondingOrder) {
      console.error('🚫 [FINANCE] Could not find corresponding order for customer order ID:', orderDetails.id);
      return;
    }
    
    console.log('🔄 [FINANCE] Accepting order from modal - Management ID:', correspondingOrder.id, 'Customer Order ID:', correspondingOrder.customerOrderId);
    approveMutation.mutate({ 
      orderId: correspondingOrder.customerOrderId, // USE CUSTOMER ORDER ID FOR API
      notes: `سفارش تأیید شد از طریق مودال جزئیات - ${new Date().toLocaleDateString('en-US')}`,
      receiptAmount: receiptAmount 
    });
    // Don't close modal here - let the mutation success handler close it
  };

  // Handle reject order from order details modal  
  const handleRejectOrder = () => {
    if (!orderDetails) return;
    
    // Find the corresponding order from allOrders using orderDetails.id (customer order ID)
    const correspondingOrder = allOrders.find(order => order.customerOrderId === orderDetails.id);
    
    if (!correspondingOrder) {
      console.error('🚫 [FINANCE] Could not find corresponding order for customer order ID:', orderDetails.id);
      return;
    }
    
    console.log('🔄 [FINANCE] Rejecting order from modal - Management ID:', correspondingOrder.id, 'Customer Order ID:', correspondingOrder.customerOrderId);
    rejectMutation.mutate({ 
      orderId: correspondingOrder.customerOrderId, // USE CUSTOMER ORDER ID FOR API
      notes: `سفارش رد شد از طریق مودال جزئیات - ${new Date().toLocaleDateString('en-US')}` 
    });
    // Don't close modal here - let the mutation success handler close it
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">در حال بارگذاری...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" dir="rtl">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">
                  واحد مالی
                </h1>
                <p className="text-gray-600 mt-1">مدیریت پرداخت‌ها</p>
              </div>
            </div>
            
            {/* Refresh Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={forceRefreshFinanceOrders}
              className="flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              <RefreshCw className="w-4 h-4" />
              به‌روزرسانی قوی
            </Button>

          </div>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">کیف پول (نیاز به تایید)</p>
                  <p className="text-3xl font-bold text-white">{walletOrders.length}</p>
                </div>
                <Timer className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">درگاه بانکی</p>
                  <p className="text-3xl font-bold text-white">{bankOrders.length}</p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm font-medium">مجموع مبالغ</p>
                  <p className="text-2xl font-bold text-white">
                    {totalAmount.toLocaleString()} IQD
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-indigo-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="جستجو بر اساس نام مشتری، ایمیل یا شماره سفارش..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-10 px-3 border rounded-md bg-white"
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="pending_payment">در انتظار پرداخت</option>
                  <option value="payment_uploaded">فیش آپلود شده</option>
                  <option value="financial_reviewing">در حال بررسی</option>
                  <option value="financial_approved">تایید شده</option>
                  <option value="financial_rejected">رد شده</option>
                  <option value="warehouse_pending">منتقل شده به انبار</option>
                  <option value="warehouse_processing">در حال پردازش انبار</option>
                  <option value="warehouse_approved">تایید شده از انبار</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-white shadow-sm border rounded-lg p-1">
            <TabsTrigger value="pending" className="flex items-center space-x-2 space-x-reverse data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Clock className="h-4 w-4" />
              <span>در انتظار بررسی ({pendingOrders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="transferred" className="flex items-center space-x-2 space-x-reverse data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <ChevronRight className="h-4 w-4" />
              <span>ارجاع شده به انبار ({filteredTransferredOrders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center space-x-2 space-x-reverse data-[state=active]:bg-red-500 data-[state=active]:text-white">
              <XCircle className="h-4 w-4" />
              <span>رد شده ({rejectedOrders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="orphaned" className="flex items-center space-x-2 space-x-reverse data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <AlertTriangle className="h-4 w-4" />
              <span>سفارشات یتیم (0)</span>
            </TabsTrigger>
            <TabsTrigger value="temporary" className="flex items-center space-x-2 space-x-reverse data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Timer className="h-4 w-4" />
              <span>سفارشات موقت (0)</span>
            </TabsTrigger>
            <TabsTrigger value="workflow" className="flex items-center space-x-2 space-x-reverse data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              <Settings className="h-4 w-4" />
              <span>مانیتورینگ</span>
            </TabsTrigger>

          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingOrders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">همه سفارشات بررسی شده</h3>
                  <p className="text-gray-500">در حال حاضر سفارش جدیدی برای بررسی وجود ندارد</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Wallet Orders Section - Auto-approval enabled */}
                {walletOrders.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <h3 className="font-medium text-blue-800">سفارشات کیف پول - نیاز به تایید دستی</h3>
                      <span className="text-sm text-blue-600">(بررسی توسط بخش مالی)</span>
                    </div>
                    {walletOrders.map((order) => (
                      <div key={order.id} className="relative">
                        <div className="absolute -right-2 top-4 w-1 h-16 bg-blue-500 rounded-full"></div>
                        <OrderCard 
                          order={order} 
                          onOrderSelect={() => {
                            setSelectedOrder(order);
                            setDialogOpen(true);
                          }} 
                          fetchOrderDetails={fetchOrderDetails} 
                        />
                        <div className="mt-2 mr-4 p-3 bg-blue-50 border-r-4 border-blue-500 rounded">
                          <div className="flex items-center gap-2 text-sm text-blue-700">
                            <CheckCircle className="h-4 w-4" />
                            <span className="font-medium">
                              <PaymentMethodBadge paymentMethod={order.paymentMethod} />
                              - نیاز به تایید دستی مالی
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bank Orders Section - Manual approval required */}
                {bankOrders.length > 0 && (
                  <div className="space-y-4">
                    {walletOrders.length > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h3 className="font-medium text-blue-800">سفارشات درگاه بانکی - بررسی دستی</h3>
                      </div>
                    )}
                    {bankOrders.map((order) => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        onOrderSelect={() => {
                          setSelectedOrder(order);
                          setDialogOpen(true);
                        }} 
                        fetchOrderDetails={fetchOrderDetails} 
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transferred" className="space-y-4">
            {filteredTransferredOrders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <ChevronRight className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">سفارشی به انبار ارجاع نشده</h3>
                  <p className="text-gray-500">در حال حاضر سفارش تایید شده‌ای که به انبار ارجاع شده باشد وجود ندارد</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredTransferredOrders.map((order) => (
                  <TransferredOrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedOrders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">هیچ سفارش رد شده‌ای وجود ندارد</h3>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {rejectedOrders.map((order) => (
                  <OrderCard key={order.id} order={order} readOnly fetchOrderDetails={fetchOrderDetails} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Orphaned Orders Tab */}
          <TabsContent value="orphaned" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  سفارشات یتیم (0)
                </CardTitle>
                <CardDescription>
                  سفارشاتی که نیاز به توجه ویژه دارند: یتیم، پرداخت ناتمام، یا معلق
                </CardDescription>
              </CardHeader>
              <CardContent>
                {false ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                  </div>
                ) : true ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">همه سفارشات سالم هستند</h3>
                    <p className="text-gray-500">هیچ سفارش یتیمی یافت نشد</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="border-red-200 bg-red-50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <div>
                              <p className="text-sm text-muted-foreground">یتیم</p>
                              <p className="text-xl font-bold text-red-600">
                                0
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-amber-200 bg-amber-50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-amber-600" />
                            <div>
                              <p className="text-sm text-muted-foreground">پرداخت ناتمام</p>
                              <p className="text-xl font-bold text-amber-600">
                                0
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="text-sm text-muted-foreground">حواله آپلود شده</p>
                              <p className="text-xl font-bold text-blue-600">
                                0
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-purple-200 bg-purple-50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-purple-600" />
                            <div>
                              <p className="text-sm text-muted-foreground">مشکوک</p>
                              <p className="text-xl font-bold text-purple-600">
                                0
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Orders List by Category */}
                    <div className="space-y-4">
                      {/* Incomplete Bank Payment Orders */}
                      {false && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-amber-600" />
                            سفارشات پرداخت ناتمام در درگاه بانکی (0)
                          </h3>
                          <div className="space-y-3">
                            {[].map((order: any) => (
                              <Card key={order.id} className="border-amber-200 bg-amber-50">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                        <Clock className="h-5 w-5 text-amber-600" />
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-gray-900">{order.orderNumber}</h4>
                                        <p className="text-sm text-gray-600">{order.customerName || 'نامشخص'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                        {order.orphanType}
                                      </Badge>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => {}}
                                        disabled={true}
                                      >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        حذف سفارش ناتمام
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <Label className="text-gray-600">مبلغ:</Label>
                                      <p className="font-medium">{Math.floor(parseFloat(order.totalAmount)).toLocaleString()} {order.currency}</p>
                                    </div>
                                    <div>
                                      <Label className="text-gray-600">روش پرداخت:</Label>
                                      <p className="font-medium">{order.paymentMethod}</p>
                                    </div>
                                    <div>
                                      <Label className="text-gray-600">وضعیت:</Label>
                                      <p className="font-medium text-amber-600">{order.status}/{order.paymentStatus}</p>
                                    </div>
                                    <div>
                                      <Label className="text-gray-600">تاریخ ایجاد:</Label>
                                      <p className="font-medium">{new Date(order.createdAt).toLocaleDateString('en-US')}</p>
                                    </div>
                                  </div>

                                  <div className="mt-3 p-3 bg-white rounded border border-amber-200">
                                    <p className="text-sm text-amber-800">
                                      💡 این سفارش در درگاه بانکی تکمیل نشده و به عنوان سفارش ناتمام محسوب می‌شود.
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Other Categories */}
                      {[].map((order: any) => (
                        <Card key={order.id} className="border-red-200 bg-red-50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                  <AlertTriangle className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-900">{order.orderNumber}</h4>
                                  <p className="text-sm text-gray-600">{order.customerName || 'نامشخص'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                                  {order.orphanType}
                                </Badge>
                                <Button
                                  size="sm"
                                  onClick={() => {}}
                                  disabled={true}
                                  className="bg-red-500 hover:bg-red-600 text-white"
                                >
                                  <Wrench className="h-4 w-4 mr-1" />
                                  تعمیر
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <Label className="text-gray-600">مبلغ:</Label>
                                <p className="font-medium">{Math.floor(parseFloat(order.totalAmount)).toLocaleString()} {order.currency}</p>
                              </div>
                              <div>
                                <Label className="text-gray-600">روش پرداخت:</Label>
                                <p className="font-medium">{order.paymentMethod}</p>
                              </div>
                              <div>
                                <Label className="text-gray-600">وضعیت:</Label>
                                <p className="font-medium">{order.status}</p>
                              </div>
                            </div>

                            {order.shippingAddress && (
                              <div className="mt-3 p-3 bg-white rounded border">
                                <Label className="text-gray-600 text-xs">آدرس تحویل:</Label>
                                <p className="text-sm mt-1">{JSON.parse(order.shippingAddress).address}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Temporary Orders Tab */}
          <TabsContent value="temporary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-purple-500" />
                  سفارشات موقت (0)
                </CardTitle>
                <CardDescription>
                  سفارشات آزمایشی و در حال تست که نیاز به بررسی خاص دارند
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Timer className="h-8 w-8 text-purple-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">بدون سفارش موقت</h3>
                  <p className="text-gray-500">در حال حاضر سفارش موقتی برای بررسی وجود ندارد</p>
                  <div className="mt-4 p-4 bg-purple-50 rounded-lg text-sm text-purple-700">
                    <p className="font-medium mb-2">سفارشات موقت شامل:</p>
                    <ul className="text-right space-y-1">
                      <li>• سفارشات آزمایشی تیم فنی</li>
                      <li>• سفارشات تست پرداخت</li>
                      <li>• سفارشات نمونه برای بررسی</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orphan Orders Tab */}
          <TabsContent value="orphan" className="space-y-6">
            <div className="space-y-6">
              {/* Statistics Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    مدیریت سفارشات موقت (Grace Period Orders)
                  </CardTitle>
                  <CardDescription>
                    سفارشات با مهلت 3 روزه پرداخت و سیستم اطلاع‌رسانی خودکار
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="border-amber-200 bg-amber-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Timer className="h-5 w-5 text-amber-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">فعال</p>
                            <p className="text-xl font-bold text-amber-600">0</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">منقضی شده</p>
                            <p className="text-xl font-bold text-red-600">0</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Bell className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">اطلاع‌رسانی امروز</p>
                            <p className="text-xl font-bold text-blue-600">0</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">پرداخت شده</p>
                            <p className="text-xl font-bold text-green-600">0</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Notification Management Tabs */}
                  <Tabs defaultValue="active-orders" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="active-orders">سفارشات فعال</TabsTrigger>
                      <TabsTrigger value="notifications">تنظیمات اطلاع‌رسانی</TabsTrigger>
                      <TabsTrigger value="templates">قالب‌های پیام</TabsTrigger>
                      <TabsTrigger value="schedule">برنامه‌ریزی ارسال</TabsTrigger>
                    </TabsList>

                    {/* Active Grace Period Orders */}
                    <TabsContent value="active-orders" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            سفارشات در مهلت 3 روزه
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {false ? (
                              [].map((order: any) => (
                                <Card key={order.id} className="border-l-4 border-l-amber-500">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <span className="font-medium">سفارش #{order.orderNumber}</span>
                                        <Badge className="bg-amber-100 text-amber-800">مهلت فعال</Badge>
                                        <span className="text-sm text-muted-foreground">
                                          {order.totalAmount} {order.currency}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-red-600 font-medium">
                                          باقی‌مانده: {Math.floor(order.hoursRemaining / 24)} روز {order.hoursRemaining % 24} ساعت
                                        </span>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => sendReminderMutation.mutate({
                                            orderId: order.id,
                                            type: 'sms'
                                          })}
                                          disabled={sendReminderMutation.isPending}
                                        >
                                          <Bell className="h-4 w-4 mr-1" />
                                          ارسال یادآور
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                      <div className="flex items-center gap-2 text-gray-600">
                                        <span className="font-medium">نام مشتری:</span>
                                        <span>{order.customerName || order.customer?.firstName} {order.customer?.lastName}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-gray-600">
                                        <Phone className="h-4 w-4" />
                                        <span>{order.customerPhone || order.customer?.phone}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-gray-600">
                                        <Mail className="h-4 w-4" />
                                        <span>{order.customerEmail || order.customer?.email}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-red-600">
                                        <Calendar className="h-4 w-4" />
                                        <span>انقضا: {new Date(order.gracePeriodExpires).toLocaleDateString('en-US')}</span>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                هیچ سفارش فعالی در مهلت 3 روزه یافت نشد
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Notification Settings */}
                    <TabsContent value="notifications" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>تنظیمات اطلاع‌رسانی</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600">مدیریت تنظیمات اطلاع‌رسانی</p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Message Templates */}
                    <TabsContent value="templates" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>قالب‌های پیام</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600">مدیریت قالب‌های پیام</p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Schedule */}
                    <TabsContent value="schedule" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>برنامه‌ریزی یادآورها</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600">برنامه‌ریزی و زمان‌بندی ارسال یادآورها</p>
                        </CardContent>
                      </Card>
                    </TabsContent>


                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orphaned Orders Tab */}
          <TabsContent value="orphaned" className="space-y-6">
            <div className="space-y-6">
              {/* Header */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    مدیریت سفارشات یتیم
                  </CardTitle>
                  <CardDescription>
                    سفارشاتی که در جدول customer_orders موجود هستند اما در جدول order_management ثبت نشده‌اند
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="border-orange-200 bg-orange-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-orange-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">در انتظار بررسی</p>
                            <p className="text-xl font-bold text-orange-600">
                              0
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">ارجاع شده به انبار</p>
                            <p className="text-xl font-bold text-blue-600">
                              0
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">رد شده</p>
                            <p className="text-xl font-bold text-red-600">
                              0
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-amber-200 bg-amber-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Timer className="h-5 w-5 text-amber-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">سفارشات موقت</p>
                            <p className="text-xl font-bold text-amber-600">
                              0
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Orphaned Orders List */}
                  <div className="space-y-4">
                    {false ? (
                      <div className="text-center py-8">
                        <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">در حال بارگذاری سفارشات یتیم...</p>
                      </div>
                    ) : false ? (
                      [].map((order: any) => (
                        <Card key={order.id} className="border-r-4 border-r-purple-500">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="font-medium">سفارش #{order.order_number}</span>
                                <Badge className="bg-purple-100 text-purple-800">یتیم</Badge>
                                <span className="text-sm text-muted-foreground">
                                  {formatCurrency(parseFloat(order.total_amount || '0'), 'IQD')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={
                                  order.current_status === 'pending' || order.current_status === 'confirmed' ? 'bg-orange-50 text-orange-700' :
                                  order.current_status === 'warehouse_ready' || order.current_status === 'warehouse_pending' ? 'bg-blue-50 text-blue-700' :
                                  order.current_status === 'rejected' || order.current_status === 'cancelled' ? 'bg-red-50 text-red-700' :
                                  'bg-amber-50 text-amber-700'
                                }>
                                  {order.current_status === 'pending' ? 'در انتظار' :
                                   order.current_status === 'confirmed' ? 'تایید شده' :
                                   order.current_status === 'warehouse_ready' ? 'آماده انبار' :
                                   order.current_status === 'warehouse_pending' ? 'در انتظار انبار' :
                                   order.current_status === 'rejected' ? 'رد شده' :
                                   order.current_status === 'cancelled' ? 'لغو شده' :
                                   order.current_status === 'draft' ? 'پیش‌نویس' :
                                   order.current_status === 'temporary' ? 'موقت' :
                                   order.current_status}
                                </Badge>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {}}
                                  disabled={true}
                                >
                                  <Settings className="h-4 w-4 mr-1" />
                                  تعمیر سفارش
                                </Button>
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                              <div className="flex items-center gap-2 text-gray-600">
                                <span className="font-medium">نام مشتری:</span>
                                <span>{order.customer_name || 'نامشخص'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="h-4 w-4" />
                                <span>{order.customer_phone || 'تلفن نامشخص'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="h-4 w-4" />
                                <span>{order.customer_email || 'ایمیل نامشخص'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <span className="font-medium">روش پرداخت:</span>
                                <span>{order.payment_source_label || order.payment_method}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="h-4 w-4" />
                                <span>تاریخ: {formatDateSafe(order.created_at, 'en-US')}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <span className="font-medium">وضعیت پرداخت:</span>
                                <span>{order.payment_status === 'paid' ? 'پرداخت شده' : 
                                       order.payment_status === 'pending' ? 'در انتظار' : 
                                       order.payment_status || 'نامشخص'}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Card>
                        <CardContent className="p-12 text-center">
                          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">سفارش یتیمی یافت نشد</h3>
                          <p className="text-gray-500">همه سفارشات دارای رکورد مدیریت معتبر هستند</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Workflow Monitoring Tab */}
          <TabsContent value="workflow" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-indigo-500" />
                  مانیتورینگ سیستم
                </CardTitle>
                <CardDescription>
                  نظارت بر عملکرد سیستم و پردازش خودکار سفارشات
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Auto-Approval Status */}
                  <Card className="border-green-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        تایید دستی
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">سفارشات کیف پول:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium text-blue-700">تایید دستی</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">حواله بانکی:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium text-blue-700">تایید دستی</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        تمام سفارشات نیاز به تایید دستی مالی دارند
                      </div>
                    </CardContent>
                  </Card>

                  {/* System Health */}
                  <Card className="border-blue-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Activity className="h-4 w-4 text-blue-500" />
                        وضعیت سیستم
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">پایگاه داده:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-700">متصل</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">API endpoints:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-700">آماده</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        آپتایم: {(Date.now() / 1000 / 60).toFixed(0)} دقیقه
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activities */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BarChart3 className="h-4 w-4" />
                      فعالیت‌های اخیر سیستم
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">سرویس تایید دستی فعال</p>
                          <p className="text-xs text-gray-500">همه سفارشات نیاز به تایید دستی دارند</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">فعال</Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">مانیتورینگ سفارشات یتیم</p>
                          <p className="text-xs text-gray-500">هر 30 ثانیه بررسی می‌شود</p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">فعال</Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">سینک اتوماتیک جداول</p>
                          <p className="text-xs text-gray-500">به صورت real-time</p>
                        </div>
                        <Badge className="bg-purple-100 text-purple-800">فعال</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
        
        {/* Review Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>بررسی پرداخت سفارش {selectedOrder?.orderNumber}</DialogTitle>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">نام مشتری</Label>
                    <p className="font-medium">{getCustomerInfo(selectedOrder).firstName} {getCustomerInfo(selectedOrder).lastName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">ایمیل</Label>
                    <p className="font-medium">{getCustomerInfo(selectedOrder).email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">تلفن</Label>
                    <p className="font-medium">{getCustomerInfo(selectedOrder).phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">مبلغ کل</Label>
                    <p className="font-medium text-green-600">{parseFloat(selectedOrder.totalAmount).toLocaleString()} {selectedOrder.currency}</p>
                  </div>
                </div>

                {selectedOrder.receiptUrl && (
                  <div className="border rounded-lg p-4">
                    <Label className="text-sm font-medium text-gray-600 mb-2 block">فیش بانکی</Label>
                    <div className="flex items-center gap-4">
                      <img 
                        src={selectedOrder.receiptUrl} 
                        alt="Bank Receipt" 
                        className="w-32 h-32 object-cover rounded border cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => openImageModal(selectedOrder.receiptUrl!)}
                      />
                      <div className="flex-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openImageModal(selectedOrder.receiptUrl!)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          مشاهده بزرگ
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="receiptAmount" className="text-sm font-medium">مبلغ فیش واقعی (دینار عراقی)</Label>
                  <Input
                    id="receiptAmount"
                    type="number"
                    value={receiptAmount}
                    onChange={(e) => setReceiptAmount(e.target.value)}
                    placeholder="مبلغ دقیق روی فیش بانکی را وارد کنید"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 مبلغ دقیق روی فیش بانکی را وارد کنید - اختلاف مبلغ از کیف پول مشتری تسویه می‌شود
                  </p>
                </div>

                <div>
                  <Label htmlFor="reviewNotes" className="text-sm font-medium">یادداشت بررسی</Label>
                  <Textarea
                    id="reviewNotes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="یادداشت خود را برای این بررسی وارد کنید..."
                    className="mt-1"
                    rows={3}
                  />
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => saveNotesMutation.mutate({ 
                        orderId: selectedOrder.customerOrderId, 
                        notes: reviewNotes 
                      })}
                      disabled={saveNotesMutation.isPending || !reviewNotes.trim()}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {saveNotesMutation.isPending ? 'در حال ذخیره...' : 'ذخیره یادداشت'}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between gap-4 pt-4">
                  {selectedOrder.currentStatus === 'auto_approved' ? (
                    <div className="flex items-center justify-center p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-emerald-600 mr-2" />
                      <span className="text-emerald-700 font-medium">
                        این سفارش از طریق درگاه بانکی تأیید شده است
                      </span>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={rejectMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        {rejectMutation.isPending ? 'در حال رد...' : 'رد پرداخت'}
                      </Button>
                      <Button
                        onClick={handleApprove}
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {approveMutation.isPending ? 'در حال تایید...' : 'تایید پرداخت'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Order Details Modal */}
        <Dialog open={orderDetailsModalOpen} onOpenChange={setOrderDetailsModalOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh]" dir="rtl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  جزئیات کامل سفارش {orderDetails?.orderNumber}
                </DialogTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintOrder}
                  className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                >
                  <Printer className="h-4 w-4" />
                  چاپ جزئیات
                </Button>
              </div>
            </DialogHeader>
            
            <ScrollArea className="max-h-[75vh] pr-4">
              {orderDetails && (
                <div className="space-y-6">
                {/* Customer Information - Extended Layout */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      اطلاعات مشتری و آدرس تحویل
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">نام مشتری</Label>
                        <p className="font-medium">{orderDetails.customer?.firstName} {orderDetails.customer?.lastName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">ایمیل</Label>
                        <p className="font-medium">{orderDetails.customer?.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">تلفن</Label>
                        <p className="font-medium">{orderDetails.customer?.phone}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">وضعیت سفارش</Label>
                        <Badge className="mt-1">{orderDetails.currentStatus}</Badge>
                      </div>
                      
                      {/* Extended Address Section */}
                      <div className="md:col-span-3">
                        <Label className="text-sm font-medium text-gray-600">آدرس کامل تحویل</Label>
                        <div className="bg-gray-50 p-3 rounded-lg mt-1">
                          <p className="font-medium text-gray-900">
                            {orderDetails.customer?.address}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {orderDetails.customer?.city} - {orderDetails.customer?.province}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-600">تاریخ سفارش</Label>
                        <p className="font-medium text-sm">
                          {formatDateSafe(orderDetails.createdAt, 'en-US')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Order Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      اقلام سفارش ({orderDetails.items?.length || 0} قلم)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      {orderDetails.items && orderDetails.items.length > 0 ? (
                        <table className="w-full border-collapse border border-gray-300 bg-white">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm w-12">#</th>
                              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-sm">نام محصول</th>
                              <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm w-20">تعداد</th>
                              <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm w-28">قیمت واحد</th>
                              <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm w-32">قیمت کل</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orderDetails.items.map((item: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-blue-600">
                                  {index + 1}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">
                                  {item.productName}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-center text-sm font-bold text-blue-600">
                                  {Math.floor(parseFloat(item.quantity || 0))}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-center text-sm text-gray-700">
                                  {Math.floor(parseFloat(item.unitPrice || 0)).toLocaleString()} {orderDetails.currency}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-center text-sm font-bold text-green-600">
                                  {Math.floor(parseFloat(item.totalPrice || 0)).toLocaleString()} {orderDetails.currency}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-center py-8 bg-red-50 rounded-lg border border-red-200">
                          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="h-8 w-8 text-red-500" />
                          </div>
                          <p className="text-red-700 font-medium">⚠️ سفارش معیوب: بدون آیتم اما دارای مبلغ</p>
                          <p className="text-sm text-red-600 mt-1">این سفارش دارای مبلغ {Math.floor(parseFloat(orderDetails.totalAmount || 0)).toLocaleString()} {orderDetails.currency} است اما هیچ آیتمی ندارد</p>
                          <p className="text-xs text-red-500 mt-2">احتمالاً در فرآیند ثبت سفارش مشکلی پیش آمده است</p>
                          {Math.floor(parseFloat(orderDetails.totalAmount || 0)) > 0 && (
                            <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-600">
                              <strong>توصیه:</strong> این سفارش نیاز به بررسی دقیق دارد. سفارش نباید بدون آیتم مبلغ داشته باشد.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Information - Compact */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CreditCard className="h-4 w-4" />
                      اطلاعات پرداخت
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Cost Breakdown - Compact */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-medium text-gray-900 mb-3 text-sm">تفکیک هزینه‌ها</h4>
                        <div className="space-y-2">
                          {/* Items Subtotal */}
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">مجموع اقلام:</span>
                            <span className="font-medium">
                              {(() => {
                                const itemsTotal = orderDetails.items?.reduce((sum: number, item: any) => 
                                  sum + parseFloat(item.totalPrice || 0), 0) || 0;
                                return Math.floor(itemsTotal).toLocaleString();
                              })()} {orderDetails.currency}
                            </span>
                          </div>
                          
                          {/* Shipping Cost - Always show */}
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-blue-600">هزینه حمل:</span>
                            <span className="font-medium text-blue-600">
                              {Math.floor(parseFloat(orderDetails.shippingCost || orderDetails.shipping_cost || 0)).toLocaleString()} {orderDetails.currency}
                            </span>
                          </div>
                          
                          {/* VAT - Only show if non-zero */}
                          {(parseFloat(orderDetails.vatAmount || orderDetails.vat_amount || 0) > 0) && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-green-600">مالیات:</span>
                              <span className="font-medium text-green-600">
                                {Math.floor(parseFloat(orderDetails.vatAmount || orderDetails.vat_amount || 0)).toLocaleString()} {orderDetails.currency}
                              </span>
                            </div>
                          )}
                          
                          {/* Total with separator */}
                          <div className="border-t pt-2">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-gray-900">مجموع کل:</span>
                              <span className="font-bold text-green-600">
                                {Math.floor(parseFloat(orderDetails.totalAmount)).toLocaleString()} {orderDetails.currency}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payment Source Details - Compact */}
                      {(orderDetails.walletAmountUsed > 0 || orderDetails.paymentMethod === 'wallet_partial' || orderDetails.paymentMethod === 'wallet_full') && (
                        <div className="bg-blue-50 rounded-lg p-3">
                          <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2 text-sm">
                            <CreditCard className="h-3 w-3" />
                            منابع تامین وجه
                          </h4>
                          <div className="space-y-2">
                            {orderDetails.walletAmountUsed > 0 && (
                              <div className="flex justify-between items-center p-2 bg-green-100 rounded border border-green-200">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-xs font-medium text-green-800">کیف پول</span>
                                </div>
                                <span className="font-bold text-green-700 text-sm">
                                  {Math.floor(parseFloat(orderDetails.walletAmountUsed || 0)).toLocaleString()} {orderDetails.currency}
                                </span>
                              </div>
                            )}
                            {orderDetails.paymentMethod === 'wallet_partial' && orderDetails.walletAmountUsed === 0 && (
                              <div className="flex justify-between items-center p-3 bg-orange-100 rounded-lg border border-orange-200">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-orange-800">کیف پول (سفارش ناقص)</span>
                                </div>
                                <span className="font-bold text-orange-700">
                                  پرداخت ناتمام - کیف پول کسر نشده
                                </span>
                              </div>
                            )}
                            {orderDetails.paymentMethod === 'wallet_partial' && orderDetails.walletAmountUsed > 0 && (
                              <div className="flex justify-between items-center p-3 bg-blue-100 rounded-lg border border-blue-200">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-blue-800">درگاه بانکی</span>
                                </div>
                                <span className="font-bold text-blue-700">
                                  {Math.floor(parseFloat(orderDetails.totalAmount || 0) - parseFloat(orderDetails.walletAmountUsed || 0)).toLocaleString()} {orderDetails.currency}
                                </span>
                              </div>
                            )}
                            {orderDetails.paymentMethod === 'bank_transfer' && !orderDetails.walletAmountUsed && (
                              <div className="flex justify-between items-center p-3 bg-purple-100 rounded-lg border border-purple-200">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-purple-800">درگاه بانکی (کامل)</span>
                                </div>
                                <span className="font-bold text-purple-700">
                                  {Math.floor(parseFloat(orderDetails.totalAmount || 0)).toLocaleString()} {orderDetails.currency}
                                </span>
                              </div>
                            )}
                            {orderDetails.paymentMethod === 'wallet_full' && (
                              <div className="flex justify-between items-center p-3 bg-emerald-100 rounded-lg border border-emerald-200">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-emerald-800">کیف پول (کامل)</span>
                                </div>
                                <span className="font-bold text-emerald-700">
                                  {Math.floor(parseFloat(orderDetails.totalAmount || 0)).toLocaleString()} {orderDetails.currency}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Order Status & Dates - Compact */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-medium text-gray-600">آخرین بروزرسانی</Label>
                          <p className="font-medium text-sm">
                            {formatDateSafe(orderDetails.updatedAt, 'en-US')}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-600">روش پرداخت</Label>
                          <p className="font-medium text-sm">
                            {orderDetails.paymentMethod || 'نامشخص'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Documents */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      مدارک ارسالی مشتری
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      // Collect all available documents
                      const allDocuments = [];
                      
                      // Use orderDocuments state that gets populated from fetchOrderDetails
                      if (orderDocuments && Array.isArray(orderDocuments) && orderDocuments.length > 0) {
                        allDocuments.push(...orderDocuments);
                      }
                      
                      // Fallback: Add documents from orderDetails.documents array if exists
                      if (orderDetails.documents && Array.isArray(orderDetails.documents) && orderDetails.documents.length > 0) {
                        allDocuments.push(...orderDetails.documents);
                      }
                      
                      // Fallback: Add bank receipt from selectedOrder if no documents found
                      if (allDocuments.length === 0 && selectedOrder?.receiptUrl) {
                        allDocuments.push({
                          id: 'bank_receipt',
                          type: 'payment_receipt',
                          description: 'فیش واریز بانکی',
                          receiptUrl: selectedOrder.receiptUrl,
                          fileName: 'فیش بانکی',
                          uploadedAt: orderDetails.updatedAt || orderDetails.createdAt
                        });
                      }
                      
                      return allDocuments.length > 0 ? (
                        <div className="space-y-3">
                          {allDocuments.map((doc: any, index: number) => (
                            <div key={doc.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {doc.description || doc.fileName || 'مدرک ارسالی'}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {formatDateSafe(doc.uploadedAt, 'en-US')} 
                                    {doc.fileName && ` • ${doc.fileName}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {doc.type === 'payment_receipt' ? 'فیش بانکی' : doc.type}
                                </Badge>
                                {doc.receiptUrl && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      // Check if it's a PDF file
                                      const isPDF = doc.receiptUrl.toLowerCase().includes('.pdf') || 
                                                   doc.fileName?.toLowerCase().includes('.pdf') ||
                                                   doc.receiptUrl.toLowerCase().includes('pdf');
                                      
                                      if (isPDF) {
                                        // Open PDF in new tab
                                        window.open(doc.receiptUrl, '_blank');
                                      } else {
                                        // Open image in modal with zoom
                                        openImageModal(doc.receiptUrl);
                                      }
                                    }}
                                    className="h-8 px-3"
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    مشاهده
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>هیچ مدرک اضافی ارسال نشده است</p>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      عملیات تأیید سفارش
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {orderDetails.currentStatus === 'auto_approved' ? (
                        <div className="col-span-2 flex items-center justify-center p-6 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <CheckCircle className="h-8 w-8 text-emerald-600 mr-3" />
                          <div className="text-center">
                            <p className="text-lg font-bold text-emerald-700">تأیید درگاه بانکی</p>
                            <p className="text-sm text-emerald-600 mt-1">این سفارش تأیید شده و به انبار ارسال گردیده</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <Label htmlFor="modalReceiptAmount" className="text-sm font-medium">مبلغ فیش واقعی (دینار عراقی)</Label>
                            <Input
                              id="modalReceiptAmount"
                              type="number"
                              value={receiptAmount}
                              onChange={(e) => setReceiptAmount(e.target.value)}
                              placeholder="مبلغ دقیق روی فیش بانکی را وارد کنید"
                              className="mt-1"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              💡 مبلغ دقیق روی فیش بانکی را وارد کنید - اختلاف مبلغ از کیف پول مشتری تسویه می‌شود
                            </p>
                          </div>

                          <div className="flex gap-4 justify-center">
                            <Button 
                              onClick={handleAcceptOrder}
                              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                              disabled={orderDetails.currentStatus === 'financial_approved' || orderDetails.currentStatus === 'warehouse_pending'}
                            >
                              <CheckCircle2 className="h-5 w-5 mr-2" />
                              قبول سفارش
                            </Button>
                            <Button 
                              onClick={handleRejectOrder}
                              variant="destructive"
                              className="px-8 py-3 text-lg"
                              disabled={orderDetails.currentStatus === 'financial_rejected'}
                            >
                              <XCircle className="h-5 w-5 mr-2" />
                              رد سفارش
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800 text-center">
                        پس از تأیید، سفارش به بخش انبارداری ارسال می‌شود
                      </p>
                    </div>
                  </CardContent>
                </Card>
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Enhanced Image Modal with Zoom */}
        <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh]">
            <DialogHeader>
              <DialogTitle className="text-right">مشاهده فیش بانکی</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[80vh]">
              {selectedImageUrl ? (
                <div className="relative bg-gray-100 rounded-lg p-4" style={{ minHeight: '500px' }}>
                  <div className="flex justify-center items-center min-h-[400px]">
                    <img 
                      src={selectedImageUrl} 
                      alt="Bank Receipt" 
                      className="max-w-full h-auto cursor-zoom-in hover:scale-105 transition-transform duration-200 rounded-lg shadow-lg border border-gray-300"
                      style={{
                        maxWidth: '90%',
                        height: 'auto',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                      onClick={(e) => {
                        const img = e.target as HTMLImageElement;
                        const container = img.parentElement!.parentElement!;
                        
                        if (img.style.transform.includes('scale(2)')) {
                          img.style.transform = 'scale(1)';
                          img.style.cursor = 'zoom-in';
                          container.style.overflow = 'auto';
                        } else {
                          img.style.transform = 'scale(2)';
                          img.style.cursor = 'zoom-out';
                          container.style.overflow = 'scroll';
                        }
                      }}
                      onLoad={(e) => {
                        console.log('✅ [IMAGE MODAL] Image loaded successfully:', selectedImageUrl);
                        const img = e.target as HTMLImageElement;
                        console.log('🖼️ [IMAGE MODAL] Image dimensions:', img.naturalWidth, 'x', img.naturalHeight);
                      }}
                      onError={(e) => {
                        console.error('❌ [IMAGE MODAL] Image failed to load:', selectedImageUrl);
                        console.error('❌ [IMAGE MODAL] Error event:', e);
                        
                        const img = e.target as HTMLImageElement;
                        
                        // Try to reload the image with cache busting
                        const originalSrc = img.src;
                        const cacheBustingSrc = originalSrc + (originalSrc.includes('?') ? '&' : '?') + 't=' + Date.now();
                        
                        // First attempt with cache busting
                        img.src = cacheBustingSrc;
                        
                        // If still fails, show error message
                        setTimeout(() => {
                          if (img.complete && img.naturalHeight === 0) {
                            img.style.display = 'none';
                            
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'text-center text-red-500 p-8';
                            errorDiv.innerHTML = `
                              <div class="text-lg mb-2">❌ خطا در بارگذاری تصویر</div>
                              <div class="text-sm text-gray-600 mb-2">URL: ${selectedImageUrl}</div>
                              <div class="text-xs text-gray-500 mb-4">Cache Busting URL: ${cacheBustingSrc}</div>
                              <button onclick="window.open('${selectedImageUrl}', '_blank')" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                                تلاش مجدد در تب جدید
                              </button>
                            `;
                            if (img.parentElement) {
                              img.parentElement.replaceChild(errorDiv, img);
                            }
                          }
                        }, 2000);
                      }}
                    />
                  </div>
                
                {/* Zoom indicator */}
                <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm">
                  کلیک برای زوم
                </div>
                
                {/* External link button */}
                <div className="absolute bottom-4 left-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      console.log('🔗 [IMAGE MODAL] Opening in new tab:', selectedImageUrl);
                      window.open(selectedImageUrl, '_blank');
                    }}
                    className="bg-white bg-opacity-95 hover:bg-opacity-100 shadow-lg"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    باز کردن در تب جدید
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center min-h-[400px] text-gray-500 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-lg mb-2">⚠️ هیچ تصویری انتخاب نشده</div>
                  <div className="text-sm">لطفاً دوباره تلاش کنید</div>
                </div>
              </div>
            )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// OrderCard Component
interface OrderCardProps {
  order: OrderManagement;
  onOrderSelect?: () => void;
  readOnly?: boolean;
  fetchOrderDetails?: (orderNumber: string) => void;
}

function OrderCard({ order, onOrderSelect, readOnly = false, fetchOrderDetails }: OrderCardProps) {
  const customerInfo = getCustomerInfo(order);
  
  // Check if this is a wallet-paid order that has been transferred to warehouse
  const isWalletTransferred = ['warehouse_pending', 'warehouse_processing', 'warehouse_approved'].includes(order.currentStatus);
  
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending_payment':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'payment_uploaded':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'financial_reviewing':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'financial_approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'financial_rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warehouse_pending':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'warehouse_processing':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'warehouse_approved':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'pending':
        return 'در انتظار';
      case 'pending_payment':
        return 'در انتظار پرداخت';
      case 'payment_uploaded':
        return 'فیش پرداخت آپلود شده';
      case 'financial_reviewing':
        return 'در حال بررسی مالی';
      case 'financial_approved':
        return 'تایید شده';
      case 'financial_rejected':
        return 'رد شده';
      case 'warehouse_pending':
        return 'منتقل شده به انبار';
      case 'warehouse_processing':
        return 'در حال پردازش انبار';
      case 'warehouse_approved':
        return 'تایید شده از انبار';
      default:
        return status;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-md">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">سفارش {order.orderNumber || 'در حال بارگذاری...'}</h3>
              <p className="text-xs text-gray-600 font-medium">
                {customerInfo.firstName && customerInfo.lastName 
                  ? `${customerInfo.firstName} ${customerInfo.lastName}` 
                  : order.customerName || 'نام مشتری نامشخص'}
              </p>
              <p className="text-xs text-gray-500">ID: {order.customerOrderId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 space-x-reverse">
            <Badge className={`border text-xs px-2 py-1 font-medium ${getStatusBadgeColor(order.currentStatus)}`}>
              {getStatusDisplayName(order.currentStatus)}
            </Badge>
            <div className="text-left">
              <p className="font-bold text-lg text-green-600">
                {parseFloat(order.totalAmount).toLocaleString()} {order.currency}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Compact Customer Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="flex items-center space-x-2 space-x-reverse bg-gray-50 rounded-md p-2">
            <Mail className="h-3 w-3 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">ایمیل</p>
              <p className="text-xs font-medium text-gray-700 truncate">{customerInfo.email || order.customerEmail || 'نامشخص'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse bg-gray-50 rounded-md p-2">
            <Phone className="h-3 w-3 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">تلفن</p>
              <p className="text-xs font-medium text-gray-700">{customerInfo.phone || order.customerPhone || 'نامشخص'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse bg-gray-50 rounded-md p-2">
            <Calendar className="h-3 w-3 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">بروزرسانی</p>
              <p className="text-xs font-medium text-gray-700">
                {new Date(order.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse bg-gray-50 rounded-md p-2">
            <div className="w-full">
              <p className="text-xs text-gray-500 mb-1">روش پرداخت</p>
              <PaymentMethodBadge 
                paymentMethod={order.paymentMethod}
                showIcon={true}
                className="text-xs"
              />
            </div>
          </div>
        </div>

        {/* Order Details Section - Compact Payment, Extended Address */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Payment Information - Compact (1 column) */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
            <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-1 text-sm">
              <DollarSign className="h-4 w-4 text-blue-600" />
              پرداخت
            </h4>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">مبلغ:</span>
                <span className="font-bold text-gray-800">{parseFloat(order.totalAmount).toLocaleString()} {order.currency}</span>
              </div>
              {order.deliveryCode && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">کد تحویل:</span>
                  <span className="font-medium text-gray-700">{order.deliveryCode}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">پرداخت:</span>
                <PaymentMethodBadge paymentMethod={order.paymentMethod} />
              </div>
            </div>
          </div>

          {/* Shipping Information - Extended (2 columns) */}
          {order.shippingAddress ? (
            <div className="lg:col-span-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" />
                آدرس کامل تحویل محصولات
              </h4>
              <div className="text-sm text-gray-700">
                {(() => {
                  try {
                    const address = typeof order.shippingAddress === 'string' 
                      ? JSON.parse(order.shippingAddress) 
                      : order.shippingAddress;
                    return (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="bg-white p-3 rounded-lg border border-green-100">
                            <p className="font-medium text-gray-900 text-base leading-relaxed">
                              {address.address || address.street || 'آدرس نامشخص'}
                            </p>
                          </div>
                          {address.notes && (
                            <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                              <p className="text-xs text-yellow-800">یادداشت: {address.notes}</p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          {address.city && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              <span className="text-gray-600 text-xs">شهر:</span>
                              <span className="font-medium">{address.city}</span>
                            </div>
                          )}
                          {address.province && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              <span className="text-gray-600 text-xs">استان:</span>
                              <span className="font-medium">{address.province}</span>
                            </div>
                          )}
                          {address.postalCode && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                              <span className="text-gray-600 text-xs">کد پستی:</span>
                              <span className="font-medium">{address.postalCode}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  } catch {
                    return <p className="text-gray-600">آدرس نامعتبر</p>;
                  }
                })()}
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-600 mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                آدرس تحویل
              </h4>
              <p className="text-sm text-gray-500">آدرس تحویل تعیین نشده است</p>
            </div>
          )}
        </div>

        {/* Special Status Indicators */}
        {order.receiptUrl && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Receipt className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">فیش بانکی ارسال شده</span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                  نیاز به بررسی
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(order.receiptUrl, '_blank')}
                className="flex items-center gap-2 text-xs"
              >
                <ExternalLink className="h-3 w-3" />
                مشاهده فیش
              </Button>
            </div>
          </div>
        )}

        {isWalletTransferred && (
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="flex items-center space-x-1 space-x-reverse">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-emerald-900">پرداخت با کیف پول - منتقل شده به انبار</span>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs">
                💳 قابل مشاهده در مالی
              </Badge>
            </div>
            <p className="text-xs text-emerald-700 mt-2">
              این سفارش با کیف پول پرداخت شده - برای نظارت مالی در این بخش قابل مشاهده است
            </p>
          </div>
        )}

        {order.financialNotes && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 mb-1">یادداشت مالی:</p>
                <p className="text-sm text-amber-700">{order.financialNotes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!readOnly && (
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="flex gap-3">
              {fetchOrderDetails && order.orderNumber && (
                <Button 
                  onClick={() => fetchOrderDetails(order.orderNumber || '')}
                  size="sm"
                  variant="outline"
                  className="flex items-center space-x-2 space-x-reverse hover:bg-blue-50 hover:border-blue-300"
                >
                  <FileText className="h-4 w-4" />
                  <span>مشاهده جزئیات کامل</span>
                </Button>
              )}
              {onOrderSelect && (
                <Button 
                  onClick={onOrderSelect}
                  size="sm"
                  className="flex items-center space-x-2 space-x-reverse bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>بررسی سفارش</span>
                </Button>
              )}
            </div>
            <div className="text-xs text-gray-500">
              آخرین بروزرسانی: {new Date(order.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// TransferredOrderCard Component for approved orders sent to warehouse
interface TransferredOrderCardProps {
  order: OrderManagement;
}

function TransferredOrderCard({ order }: TransferredOrderCardProps) {
  const customerInfo = getCustomerInfo(order);
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'warehouse_pending':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'warehouse_notified':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'warehouse_processing':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'warehouse_approved':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'warehouse_pending':
        return 'در انتظار بررسی انبار';
      case 'warehouse_notified':
        return 'اطلاع رسانی انبار';
      case 'warehouse_processing':
        return 'در حال پردازش انبار';
      case 'warehouse_approved':
        return 'تایید نهایی انبار';
      default:
        return status;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChevronRight className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">سفارش {order.orderNumber || 'در حال بارگذاری...'}</h3>
              <p className="text-sm text-gray-600">{customerInfo.firstName} {customerInfo.lastName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 space-x-reverse">
            <Badge className={`border ${getStatusBadgeColor(order.currentStatus)}`}>
              {getStatusDisplayName(order.currentStatus)}
            </Badge>
            <div className="text-left">
              <p className="font-bold text-lg text-green-600">
                {parseFloat(order.totalAmount).toLocaleString()} {order.currency}
              </p>
              <p className="text-xs text-gray-500">
                تایید مالی: {order.financialReviewedAt && new Date(order.financialReviewedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Mail className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{order.customer?.email}</span>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <Phone className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{order.customer?.phone}</span>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              بروزرسانی: {new Date(order.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            {(() => {
              const paymentMethod = order.paymentMethod;
              if (paymentMethod === 'wallet_full') {
                return (
                  <>
                    <Wallet className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">کیف پول (کامل)</span>
                  </>
                );
              } else if (paymentMethod === 'wallet_partial') {
                return (
                  <>
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-purple-700 font-medium">ترکیبی</span>
                  </>
                );
              } else if (paymentMethod === 'bank_transfer_grace') {
                return (
                  <>
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-orange-700 font-medium">مهلت‌دار</span>
                  </>
                );
              } else if (paymentMethod === 'bank_gateway') {
                return (
                  <>
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-700 font-medium">درگاه بانکی</span>
                  </>
                );
              } else {
                return (
                  <>
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{paymentMethod || 'نامشخص'}</span>
                  </>
                );
              }
            })()}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">تایید شده توسط بخش مالی</span>
            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
              ارجاع شده به انبار
            </Badge>
          </div>
        </div>

        {order.financialNotes && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-gray-700 mb-1">یادداشت مالی:</p>
            <p className="text-sm text-gray-600">{order.financialNotes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FinanceOrders;
