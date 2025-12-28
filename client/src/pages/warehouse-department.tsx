import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Package, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader, 
  RefreshCw, 
  Search,
  FileText,
  Truck,
  User,
  Calendar,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function WarehouseDepartment() {
  const [searchTerm, setSearchTerm] = useState("");
  const [processingNotes, setProcessingNotes] = useState("");
  const { toast } = useToast();

  const [confirmingOrderId, setConfirmingOrderId] = useState<number | null>(null);
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Get refresh interval from global settings
  const getRefreshInterval = () => {
    const globalSettings = localStorage.getItem('global-refresh-settings');
    if (globalSettings) {
      const settings = JSON.parse(globalSettings);
      const warehouseSettings = settings.departments.warehouse;
      
      if (warehouseSettings?.autoRefresh) {
        const refreshInterval = settings.syncEnabled 
          ? settings.globalInterval 
          : warehouseSettings.interval;
        return refreshInterval * 1000; // Convert seconds to milliseconds
      }
    }
    return 600000; // Default 10 minutes if no settings found
  };

  // Fetch orders approved by financial department
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/order-management/warehouse'],
    refetchInterval: getRefreshInterval(),
    retry: false
  });

  // Extract orders from response
  const orders = response?.orders || response || [];
  
  // Add some debug logging to check the data structure
  console.log('Warehouse response:', response);
  console.log('Warehouse orders:', orders);
  console.log('Warehouse error:', error);
  console.log('Warehouse isLoading:', isLoading);

  // Filter orders based on search
  const filteredOrders = Array.isArray(orders) ? orders.filter((order: any) =>
    order.customer?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerOrderId?.toString().includes(searchTerm) ||
    order.id?.toString().includes(searchTerm)
  ) : [];

  // Process order mutation
  const processOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      return apiRequest(`/api/order-management/warehouse/${orderId}/process`, {
        method: "PATCH",
        body: {
          status: "warehouse_approved",
          notes: processingNotes
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ سفارش به لجستیک ارسال شد",
        description: "کد تحویل 4 رقمی از طریق پیامک، واتساپ و ایمیل برای مشتری ارسال می‌شود",
        duration: 3000
      });
      setConfirmingOrderId(null);
      setConfirmStep(1);
      setConfirmDialogOpen(false);
      setProcessingNotes("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/order-management/logistics'] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ خطا در پردازش",
        description: error.message || "خطا در پردازش سفارش",
        variant: "destructive",
        duration: 3000
      });
    }
  });

  const handleConfirmStart = (orderId: number) => {
    setConfirmingOrderId(orderId);
    setConfirmStep(1);
    setProcessingNotes("");
    setConfirmDialogOpen(true);
  };

  const handleConfirmStep1 = () => {
    setConfirmStep(2);
  };

  const handleConfirmStep2 = () => {
    if (confirmingOrderId) {
      processOrderMutation.mutate(confirmingOrderId);
    }
  };

  const handleConfirmCancel = () => {
    setConfirmDialogOpen(false);
    setConfirmingOrderId(null);
    setConfirmStep(1);
    setProcessingNotes("");
  };

  const getConfirmingOrder = () => {
    return filteredOrders.find((order: any) => order.id === confirmingOrderId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount);
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">واحد انبار</h1>
          <p className="text-gray-600 mt-1">
            مدیریت سفارشات تایید شده توسط واحد مالی
          </p>
        </div>
        <Button 
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          بروزرسانی
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">سفارشات در انتظار</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredOrders.length}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">پردازش شده امروز</p>
                <p className="text-2xl font-bold text-green-600">
                  {orders.filter((order: any) => 
                    order.status === 'warehouse_approved' && 
                    new Date(order.updatedAt).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ارزش کل</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(
                    filteredOrders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0)
                  )} دینار
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">میانگین زمان پردازش</p>
                <p className="text-2xl font-bold text-orange-600">2.5 ساعت</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Label htmlFor="search">جستجوی سفارشات</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="جستجو بر اساس شماره سفارش، نام مشتری یا محصول..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                {filteredOrders.length} سفارش
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            سفارشات تایید شده مالی
          </CardTitle>
          <CardDescription>
            سفارشاتی که توسط واحد مالی تایید شده و در انتظار پردازش انبار هستند
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error || response === null ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">نیاز به احراز هویت</h3>
              <p className="text-gray-600 text-center max-w-md">
                برای دسترسی به واحد انبار، لطفاً وارد حساب ادمین شوید. 
                کاربر: admin@momtazchem.com
              </p>
              <div className="flex gap-3">
                <Button 
                  onClick={() => window.location.href = '/admin/login'}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  ورود به حساب ادمین
                </Button>
                <Button 
                  onClick={() => refetch()}
                  variant="outline"
                  className="border-gray-300"
                >
                  تلاش مجدد
                </Button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-gray-500" />
              <span className="ml-2 text-gray-500">در حال بارگیری سفارشات...</span>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order: any) => (
                <div key={order.id} className="border rounded-lg p-6 space-y-4">
                  {/* Order Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">سفارش {order.orderNumber}</h3>
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          در انتظار پردازش
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {order.customer?.firstName} {order.customer?.lastName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(order.createdAt)}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {formatCurrency(order.totalAmount)} {order.currency}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-3">محصولات سفارش:</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span>جزئیات سفارش #{order.customerOrderId}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-600">مجموع: {formatCurrency(order.totalAmount)} {order.currency}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p><span className="font-medium">تلفن:</span> {order.phone}</p>
                      <p><span className="font-medium">شهر:</span> {order.city}</p>
                    </div>
                    <div className="space-y-1">
                      <p><span className="font-medium">آدرس:</span> {order.address}</p>
                      <p><span className="font-medium">روش پرداخت:</span> {order.paymentMethod}</p>
                    </div>
                  </div>

                  {/* Processing Button */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleConfirmStart(order.id)}
                      className={confirmingOrderId === order.id 
                        ? "bg-amber-500 hover:bg-amber-600 animate-pulse ring-2 ring-amber-300" 
                        : "bg-green-600 hover:bg-green-700"}
                      disabled={processOrderMutation.isPending}
                      data-testid={`button-process-order-${order.id}`}
                    >
                      <Truck className="w-4 h-4 ml-2" />
                      {confirmingOrderId === order.id ? "در حال تایید..." : "تایید و ارسال به لجستیک"}
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileText className="w-4 h-4 ml-2" />
                      جزئیات
                    </Button>
                  </div>

                  {/* Financial Notes */}
                  {order.notes && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm">
                        <span className="font-medium">یادداشت واحد مالی:</span> {order.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">سفارشی برای پردازش وجود ندارد</p>
              <p className="text-sm">
                سفارشات تایید شده توسط واحد مالی اینجا نمایش داده می‌شوند
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent dir="rtl" className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className={confirmStep === 1 ? "text-amber-600" : "text-red-600"}>
              {confirmStep === 1 
                ? "تایید پردازش سفارش - مرحله ۱ از ۲" 
                : "تایید نهایی ارسال به لجستیک - مرحله ۲ از ۲"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 text-right">
              {confirmStep === 1 ? (
                <div className="space-y-3">
                  <p className="text-base font-medium text-gray-800">
                    آیا مطمئن هستید که می‌خواهید این سفارش را پردازش کرده و به لجستیک ارسال کنید؟
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm font-bold text-blue-800 mb-2">اطلاعات سفارش:</p>
                    <p className="text-sm text-blue-700">
                      شماره سفارش: <span className="font-bold">#{getConfirmingOrder()?.customerOrderId}</span>
                    </p>
                    <p className="text-sm text-blue-700">
                      مشتری: <span className="font-bold">
                        {getConfirmingOrder()?.customer?.firstName} {getConfirmingOrder()?.customer?.lastName}
                      </span>
                    </p>
                    <p className="text-sm text-blue-700">
                      مبلغ: <span className="font-bold">{formatCurrency(getConfirmingOrder()?.totalAmount || 0)} {getConfirmingOrder()?.currency}</span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-notes">یادداشت پردازش (اختیاری)</Label>
                    <Textarea
                      id="confirm-notes"
                      placeholder="یادداشت درباره پردازش، بسته‌بندی یا نکات ویژه..."
                      value={processingNotes}
                      onChange={(e) => setProcessingNotes(e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-base font-bold text-red-800 mb-2">
                      هشدار: سفارش به واحد لجستیک ارسال می‌شود!
                    </p>
                    <p className="text-sm text-red-700">
                      پس از تایید نهایی، سفارش از انبار خارج شده و به واحد لجستیک منتقل می‌شود.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-bold text-gray-800 mb-2">تایید نهایی برای سفارش:</p>
                    <p className="text-lg font-bold text-gray-900">
                      #{getConfirmingOrder()?.customerOrderId}
                    </p>
                    <p className="text-sm text-gray-600">
                      {getConfirmingOrder()?.customer?.firstName} {getConfirmingOrder()?.customer?.lastName}
                    </p>
                  </div>
                  <p className="text-sm text-red-600 font-bold">
                    آیا کاملاً مطمئن هستید؟
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 flex-row-reverse">
            <AlertDialogCancel 
              onClick={handleConfirmCancel}
              className="flex-1"
            >
              انصراف
            </AlertDialogCancel>
            {confirmStep === 1 ? (
              <Button 
                onClick={handleConfirmStep1}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
                data-testid="button-confirm-step1"
              >
                ادامه به مرحله بعد
              </Button>
            ) : (
              <Button 
                onClick={handleConfirmStep2}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={processOrderMutation.isPending}
                data-testid="button-confirm-step2"
              >
                {processOrderMutation.isPending ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin ml-2" />
                    در حال پردازش...
                  </>
                ) : (
                  "تایید نهایی و ارسال به لجستیک"
                )}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}