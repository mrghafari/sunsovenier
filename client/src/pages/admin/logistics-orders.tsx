import { useState, useEffect, useCallback } from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Truck, 
  CheckCircle, 
  MapPin,
  Phone,
  RefreshCw,
  FileText,
  Clock,
  Send,
  Package,
  User
} from "lucide-react";
import GlobalRefreshControl from "@/components/GlobalRefreshControl";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { getOrderStatusLabel, resolveOrderStatus } from "@shared/order-status";
import { formatDeliveryAppointment, getDestinationTimeZone } from "@shared/delivery-timezone";

interface Order {
  id: number;
  customerOrderId: number;
  orderNumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  destinationCountry?: unknown;
  destinationCity?: string | null;
  orderTotal: number;
  currentStatus: string;
  logisticsNotes?: string;
  warehouseNotes?: string;
  deliveryCode?: string;
  logisticsProcessedAt?: string;
  warehouseProcessedAt: string;
  trackingNumber?: string;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  estimatedDeliveryDate?: string;
  estimatedDeliveryAt?: string | null;
  estimatedDeliveryTimeZone?: string | null;
  orderDate: string;
  orderItems: Array<{
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export default function LogisticsOrders() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [logisticsNotes, setLogisticsNotes] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [deliveryPersonName, setDeliveryPersonName] = useState("");
  const [deliveryPersonPhone, setDeliveryPersonPhone] = useState("");
  const [estimatedDeliveryLocal, setEstimatedDeliveryLocal] = useState("");
  const [deliveryTimeZone, setDeliveryTimeZone] = useState("");
  const [appointmentTouched, setAppointmentTouched] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Get warehouse-approved orders for logistics processing
  const {
    data: ordersData,
    isLoading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['/api/order-management/logistics', 'infinite'],
    queryFn: ({ pageParam = 0 }) => fetch(`/api/order-management/logistics?offset=${pageParam}`, {
      credentials: 'include',
      cache: 'no-cache'
    }).then(res => {
      if (!res.ok) throw new Error("خطا در دریافت سفارشات لجستیک");
      return res.json();
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextOffset : undefined,
  });
  
  const orders = ordersData?.pages.flatMap(page => page.orders || []) || [];
  const selectedDestinationTimeZone = selectedOrder
    ? getDestinationTimeZone(selectedOrder.destinationCountry)
    : null;
  const selectedDestinationCountry = selectedOrder?.destinationCountry == null
    ? ""
    : String(selectedOrder.destinationCountry);
  const legacyDeliveryDate = selectedOrder?.estimatedDeliveryDate && !selectedOrder.estimatedDeliveryAt
    ? selectedOrder.estimatedDeliveryDate.slice(0, 10)
    : null;
  let appointmentPreview = "";
  if (selectedOrder?.estimatedDeliveryAt && selectedOrder.estimatedDeliveryTimeZone) {
    try {
      appointmentPreview = formatDeliveryAppointment(
        selectedOrder.estimatedDeliveryAt,
        selectedOrder.estimatedDeliveryTimeZone,
        "fa",
      );
    } catch {
      appointmentPreview = "";
    }
  }

  const handleScroll = useCallback(() => {
    if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 700 &&
      hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);
  
  // Debug: Log the first order to check orderNumber field
  if (orders.length > 0) {
    console.log('🔍 [LOGISTICS] First order:', {
      id: orders[0].id,
      customerOrderId: orders[0].customerOrderId,
      orderNumber: orders[0].orderNumber,
      fullOrder: orders[0]
    });
  }

  // Auto-refresh controlled by global settings
  useEffect(() => {
    if (orders && orders.length >= 0) { // Start auto-refresh after successful data load
      const checkRefreshSettings = () => {
        const globalSettings = localStorage.getItem('global-refresh-settings');
        if (globalSettings) {
          const settings = JSON.parse(globalSettings);
          const logisticsSettings = settings.departments.logistics;
          
          if (logisticsSettings.autoRefresh) {
            const refreshInterval = settings.syncEnabled 
              ? settings.globalInterval 
              : logisticsSettings.interval;
            
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
          if (settings.departments.logistics.autoRefresh) {
            refetch();
          }
        }
      }, intervalMs);

      return () => clearInterval(interval);
    }
  }, [orders, refetch]);

  const dispatchMutation = useMutation({
    mutationFn: async (data: {
      orderId: number;
      notes: string;
      trackingNumber: string;
      deliveryPersonName: string;
      deliveryPersonPhone: string;
      estimatedDeliveryLocal: string;
      deliveryTimeZone: string;
    }) => {
      return apiRequest(`/api/logistics/orders/${data.orderId}/dispatch`, {
        method: 'POST',
        body: data
      });
    },
    onSuccess: (response) => {
      toast({
        title: "سفارش ارسال شد",
        description: `کد تحویل ${response.deliveryCode} برای مشتری ارسال شد`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/order-management/logistics', 'infinite'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "خطا در ارسال",
        description: error.message || "امکان ارسال سفارش وجود ندارد",
        variant: "destructive"
      });
    }
  });

  const getStatusBadge = (status: string) => {
    const resolved = resolveOrderStatus({ workflowStatus: status });
    return (
      <Badge variant="outline" className={resolved.badgeClass}>
        {getOrderStatusLabel(resolved, 'fa')}
      </Badge>
    );
  };

  const resetForm = () => {
    setSelectedOrder(null);
    setLogisticsNotes("");
    setTrackingNumber("");
    setDeliveryPersonName("");
    setDeliveryPersonPhone("");
    setEstimatedDeliveryLocal("");
    setDeliveryTimeZone("");
    setAppointmentTouched(false);
  };

  const localDateTimeValue = (date: Date, timeZone: string) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
    return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
  };

  const tomorrowAtDestination = (timeZone: string) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
    const tomorrow = new Date(Date.UTC(
      Number(part("year")),
      Number(part("month")) - 1,
      Number(part("day")) + 1,
    ));
    return `${tomorrow.toISOString().slice(0, 10)}T09:00`;
  };

  const handleOrderDispatch = (order: Order) => {
    setSelectedOrder(order);
    setLogisticsNotes(order.logisticsNotes || "");
    setTrackingNumber(order.trackingNumber || "");
    setDeliveryPersonName(order.deliveryPersonName || "");
    setDeliveryPersonPhone(order.deliveryPersonPhone || "");
    
    const destinationZone = getDestinationTimeZone(order.destinationCountry);
    const savedZone = order.estimatedDeliveryTimeZone || "";
    const appointmentZone = destinationZone && savedZone !== destinationZone
      ? destinationZone
      : savedZone || destinationZone || "";
    setDeliveryTimeZone(appointmentZone);
    setAppointmentTouched(false);
    if (order.estimatedDeliveryAt && appointmentZone) {
      try {
        setEstimatedDeliveryLocal(localDateTimeValue(new Date(order.estimatedDeliveryAt), appointmentZone));
      } catch {
        setEstimatedDeliveryLocal("");
      }
    } else if (order.estimatedDeliveryDate && !order.estimatedDeliveryAt) {
      // Keep legacy date-only appointments date-only; dispatch requires a deliberate time selection.
      setEstimatedDeliveryLocal("");
    } else if (destinationZone) {
      try {
        setEstimatedDeliveryLocal(tomorrowAtDestination(destinationZone));
      } catch {
        setEstimatedDeliveryLocal("");
      }
    } else {
      setEstimatedDeliveryLocal("");
    }
    
    setIsDialogOpen(true);
  };

  const handleDispatch = () => {
    if (!selectedOrder) return;
    
    let validTimeZone = false;
    if (deliveryTimeZone) {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: deliveryTimeZone });
        validTimeZone = true;
      } catch {
        validTimeZone = false;
      }
    }
    if (!trackingNumber || !deliveryPersonName || !deliveryPersonPhone || !estimatedDeliveryLocal || !validTimeZone || !appointmentTouched) {
      toast({
        title: "اطلاعات ناقص",
        description: "زمان تحویل را آگاهانه انتخاب و منطقه زمانی معتبر مقصد را همراه با تمام فیلدهای ضروری وارد کنید",
        variant: "destructive"
      });
      return;
    }

    dispatchMutation.mutate({
      orderId: selectedOrder.customerOrderId,
      notes: logisticsNotes,
      trackingNumber,
      deliveryPersonName,
      deliveryPersonPhone,
      estimatedDeliveryLocal,
      deliveryTimeZone
    });
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
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">واحد لجستیک - ارسال سفارشات</h1>
          <p className="text-gray-600 mt-2">مدیریت ارسال و تحویل سفارشات به مشتریان</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {orders.length} سفارش در انتظار
        </Badge>
      </div>

      {/* Refresh Control */}
      <div className="mb-6">
        <GlobalRefreshControl 
          pageName="logistics"
          onRefresh={() => refetch()}
          isLoading={isLoading}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">آماده ارسال</p>
                <p className="text-2xl font-bold text-blue-600">{orders.filter((o: any) => o.currentStatus === 'warehouse_approved').length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">در حال ارسال</p>
                <p className="text-2xl font-bold text-purple-600">{orders.filter((o: any) => o.currentStatus === 'logistics_dispatched').length}</p>
              </div>
              <Truck className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ارزش کل</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(orders.reduce((sum: number, order: any) => sum + order.orderTotal, 0), 'IQD')}
                </p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">فوری</p>
                <p className="text-2xl font-bold text-red-600">
                  {orders.filter((order: any) => 
                    new Date(order.warehouseProcessedAt) < new Date(Date.now() - 12 * 60 * 60 * 1000)
                  ).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            سفارشات آماده ارسال
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">همه سفارشات ارسال شده</h3>
              <p className="text-gray-500">در حال حاضر سفارش جدیدی برای ارسال وجود ندارد</p>
            </div>
          ) : (
            <div className="space-y-4">
      {orders.map((order: Order) => (
                <div key={order.id} className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-medium text-lg">{order.orderNumber ? `سفارش ${order.orderNumber}` : `سفارش #${order.customerOrderId}`}</h3>
                        <p className="text-sm text-gray-600">{order.customerName}</p>
                        {order.deliveryCode && (
                          <p className="text-sm text-purple-600 font-medium">کد تحویل: {order.deliveryCode}</p>
                        )}
                      </div>
                      {getStatusBadge(order.currentStatus)}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-lg text-green-600">
                        {formatCurrency(order.orderTotal, 'IQD')}
                      </p>
                      <p className="text-sm text-gray-500">
                        آماده: {new Date(order.warehouseProcessedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        آدرس تحویل
                      </p>
                      <p className="font-medium">{order.customerAddress}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        تلفن مشتری
                      </p>
                      <p className="font-medium">{order.customerPhone}</p>
                    </div>
                  </div>

                  {/* Warehouse Notes */}
                  {order.warehouseNotes && (
                    <div className="bg-green-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-green-800">
                        <strong>یادداشت انبار:</strong> {order.warehouseNotes}
                      </p>
                    </div>
                  )}

                  {/* Tracking Info */}
                  {order.trackingNumber && (
                    <div className="bg-purple-50 rounded-lg p-3 mb-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>کد رهگیری:</strong> {order.trackingNumber}
                        </div>
                        <div>
                          <strong>تحویل‌دهنده:</strong> {order.deliveryPersonName}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Items Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium mb-2">آیتم‌های ارسالی:</h4>
                    <div className="space-y-1">
                      {order.orderItems.slice(0, 2).map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.productName} × {item.quantity}</span>
                          <span>{formatCurrency(item.totalPrice, 'IQD')}</span>
                        </div>
                      ))}
                      {order.orderItems.length > 2 && (
                        <p className="text-sm text-gray-500">
                          و {order.orderItems.length - 2} آیتم دیگر...
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      <Clock className="h-4 w-4 inline mr-1" />
                      از آماده‌سازی: {Math.floor((new Date().getTime() - new Date(order.warehouseProcessedAt).getTime()) / (1000 * 60 * 60))} ساعت گذشته
                    </div>
                    <Button
                      onClick={() => handleOrderDispatch(order)}
                      disabled={!['warehouse_approved', 'logistics_assigned', 'logistics_processing'].includes(order.currentStatus)}
                    >
                      {order.currentStatus === 'logistics_dispatched' ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          ارسال شده
                        </>
                      ) : ['warehouse_approved', 'logistics_assigned', 'logistics_processing'].includes(order.currentStatus) ? (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          ارسال سفارش
                        </>
                      ) : (
                        <>غیرقابل ارسال</>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
              {isFetchingNextPage && (
                <div className="flex items-center justify-center gap-2 py-5 text-sm text-gray-500">
                  <RefreshCw className="h-4 w-4 animate-spin" /> در حال بارگذاری سفارشات بیشتر...
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispatch Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>ارسال سفارش #{selectedOrder?.customerOrderId}</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium mb-3">اطلاعات ارسال</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">مشتری:</span>
                    <span className="font-medium mr-2">{selectedOrder.customerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">تلفن:</span>
                    <span className="font-medium mr-2">{selectedOrder.customerPhone}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">مقصد سفارش:</span>
                    <span className="font-medium mr-2">
                      {selectedOrder.destinationCity || "شهر نامشخص"}
                      {selectedDestinationCountry ? `، ${selectedDestinationCountry}` : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">کد رهگیری *</label>
                  <Input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="TR123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">زمان مراجعه برای تحویل در مقصد *</label>
                  <Input
                    type="datetime-local"
                    required
                    value={estimatedDeliveryLocal}
                    onChange={(e) => {
                      setEstimatedDeliveryLocal(e.target.value);
                      setAppointmentTouched(true);
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-600">
                    زمان پیشنهادی را بررسی کرده و برای ثبت موعد جدید، زمان را آگاهانه انتخاب کنید.
                  </p>
                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    <p>
                      مقصد: {selectedOrder.destinationCity || "شهر نامشخص"}
                      {selectedDestinationCountry ? `، ${selectedDestinationCountry}` : ""}
                    </p>
                    {selectedDestinationTimeZone ? (
                      <p>منطقه زمانی مقصد: {selectedDestinationTimeZone}</p>
                    ) : (
                      <div className="space-y-1">
                        <label htmlFor="delivery-time-zone" className="block font-medium">
                          کشور مقصد قابل‌شناسایی نیست؛ منطقه زمانی IANA مقصد را وارد کنید *
                        </label>
                        <Input
                          id="delivery-time-zone"
                          value={deliveryTimeZone}
                          onChange={(e) => {
                            setDeliveryTimeZone(e.target.value);
                            setAppointmentTouched(false);
                          }}
                          placeholder="مثال: Europe/Paris"
                          dir="ltr"
                          required
                        />
                        {!deliveryTimeZone && (
                          <p className="text-amber-700">تا زمان واردکردن منطقه زمانی معتبر، ارسال سفارش ممکن نیست.</p>
                        )}
                      </div>
                    )}
                    {legacyDeliveryDate && (
                      <p className="text-amber-700">
                        موعد قدیمی فقط تاریخ دارد: {legacyDeliveryDate}. زمان برای آن ثبت نشده؛ برای ارسال، زمان جدید را آگاهانه انتخاب کنید.
                      </p>
                    )}
                    {appointmentPreview && (
                      <p>موعد ثبت‌شده ({selectedOrder.estimatedDeliveryTimeZone}): {appointmentPreview}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">نام تحویل‌دهنده *</label>
                  <Input
                    value={deliveryPersonName}
                    onChange={(e) => setDeliveryPersonName(e.target.value)}
                    placeholder="احمد محمدی"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">تلفن تحویل‌دهنده *</label>
                  <Input
                    value={deliveryPersonPhone}
                    onChange={(e) => setDeliveryPersonPhone(e.target.value)}
                    placeholder="07901234567"
                  />
                </div>
              </div>

              {/* Logistics Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">یادداشت لجستیک</label>
                <Textarea
                  value={logisticsNotes}
                  onChange={(e) => setLogisticsNotes(e.target.value)}
                  placeholder="توضیحات مربوط به ارسال، زمان‌بندی یا نکات ویژه..."
                  rows={3}
                />
              </div>

              {/* Action Button */}
              <Button 
                onClick={handleDispatch}
                disabled={
                  dispatchMutation.isPending ||
                  !estimatedDeliveryLocal ||
                  !appointmentTouched ||
                  !deliveryTimeZone
                }
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                ارسال سفارش و تولید کد تحویل
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}