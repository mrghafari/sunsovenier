import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PaymentMethodBadge from '@/components/PaymentMethodBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Package, 
  Users, 
  Truck, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  Send, 
  Plus, 
  Edit, 
  Eye, 
  Phone,
  User,
  Shield,
  AlertTriangle,
  FileText,
  Printer,
  Calculator,
  History,
  Mail,
  Flame,
  Weight,
  Scale,
  ArrowUpDown,
  Bus,
  X,
  Minus,
  CreditCard,
  Wallet,
  DollarSign,
  Clock,
  RefreshCw,
  LogIn,
  Info
} from 'lucide-react';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import PostalServicesTab from '@/components/PostalServicesTab';
import DeliveryServicesTab from '@/components/DeliveryServicesTab';
import PostalShippingParamsTab from '@/components/PostalShippingParamsTab';
import VehicleTemplateEditor from '@/components/admin/VehicleTemplateEditor';
import InternationalGeographyTab from '@/components/InternationalGeographyTab';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Car, Star, TrendingUp, Calendar as CalendarIcon, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

// Types for vehicle history
interface VehicleDeliveryHistory {
  id: number;
  plateNumber: string;
  customerOrderId: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  originAddress: string;
  destinationAddress: string;
  totalWeight: number;
  deliveryCost: number;
  deliveryStatus: string;
  deliveryDateTime: string;
  onTimeDelivery: boolean;
  customerRating?: number;
  customerFeedback?: string;
  itemsDescription?: string;
  deliveryDistance?: number;
  driverName?: string;
}

interface VehicleUsageStats {
  id: number;
  plateNumber: string;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  totalDistance: number;
  totalRevenue: number;
  averageRating: number;
  onTimeDeliveryRate: number;
  firstDeliveryDate?: string;
  lastDeliveryDate?: string;
}

// Vehicle History Section Component
function VehicleHistorySection() {
  const [viewMode, setViewMode] = useState<'overview' | 'details'>('overview');
  const [selectedPlate, setSelectedPlate] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchPlate, setSearchPlate] = useState("");

  // Get vehicle usage statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/logistics/vehicle-stats'],
    queryFn: () => apiRequest('/api/logistics/vehicle-stats', { method: 'GET' }),
  });

  // Get vehicle delivery history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: [
      '/api/logistics/vehicle-history',
      selectedPlate,
      currentPage,
      pageSize,
      dateRange.from?.toISOString(),
      dateRange.to?.toISOString()
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedPlate) params.append('plateNumber', selectedPlate);
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      if (dateRange.from) params.append('startDate', dateRange.from.toISOString());
      if (dateRange.to) params.append('endDate', dateRange.to.toISOString());
      
      return apiRequest(`/api/logistics/vehicle-history?${params.toString()}`, { method: 'GET' });
    },
    enabled: viewMode === 'details' && !!selectedPlate
  });

  // Get vehicle summary for selected plate
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/logistics/vehicle-summary', selectedPlate],
    queryFn: () => apiRequest(`/api/logistics/vehicle-summary/${selectedPlate}`, { method: 'GET' }),
    enabled: viewMode === 'details' && !!selectedPlate,
  });

  const handlePlateSearch = () => {
    if (searchPlate.trim()) {
      setSelectedPlate(searchPlate.trim().toUpperCase());
      setViewMode('details');
    }
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setSelectedPlate("");
    setSearchPlate("");
    setCurrentPage(1);
    setDateRange({});
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'IQD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || statusColors.pending}>
        {status === 'completed' ? 'مکمل' : 
         status === 'failed' ? 'ناموفق' : 
         status === 'cancelled' ? 'لغو شده' : 'در انتظار'}
      </Badge>
    );
  };

  if (viewMode === 'overview') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            تاریخچه تحویلات خودروها
          </CardTitle>
          <CardDescription>
            مشاهده تاریخچه کامل تحویلات هر خودرو از ناوگان شرکت
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Search Section */}
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="search-plate">جستجوی شماره پلاک</Label>
                <Input
                  id="search-plate"
                  placeholder="مثال: ABC123"
                  value={searchPlate}
                  onChange={(e) => setSearchPlate(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handlePlateSearch()}
                />
              </div>
              <Button 
                onClick={handlePlateSearch}
                disabled={!searchPlate.trim()}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                جستجو
              </Button>
            </div>

            {/* Overview Statistics */}
            {statsData?.data?.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">نمای کلی ناوگان</h3>
                  <Badge variant="outline">
                    {statsData.data.length} خودرو
                  </Badge>
                </div>
                
                <ScrollArea className="h-[400px]">
                  <div className="grid gap-4">
                    {statsData.data.map((stat: VehicleUsageStats) => (
                      <Card key={stat.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => {
                              setSelectedPlate(stat.plateNumber);
                              setSearchPlate(stat.plateNumber);
                              setViewMode('details');
                            }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Car className="h-8 w-8 text-blue-500" />
                            <div>
                              <h3 className="font-semibold text-lg">{stat.plateNumber}</h3>
                              <p className="text-sm text-muted-foreground">
                                {stat.totalDeliveries} تحویل | {Math.round(Number(stat.totalDistance) || 0)} km
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">{formatCurrency(Number(stat.totalRevenue) || 0)}</div>
                            <div className="text-sm text-muted-foreground">
                              {Math.round(Number(stat.onTimeDeliveryRate) || 0)}% به موقع
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-semibold text-green-600">
                              {stat.successfulDeliveries}
                            </div>
                            <div className="text-xs text-muted-foreground">موفق</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-red-600">
                              {stat.failedDeliveries}
                            </div>
                            <div className="text-xs text-muted-foreground">ناموفق</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-yellow-600">
                              {stat.averageRating ? Number(stat.averageRating).toFixed(1) : 'N/A'}
                            </div>
                            <div className="text-xs text-muted-foreground">امتیاز</div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {statsLoading ? 'در حال بارگذاری...' : 'هنوز داده‌ای برای نمایش وجود ندارد'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Details View
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToOverview}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              برگشت
            </Button>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                تاریخچه خودرو {selectedPlate}
              </CardTitle>
              <CardDescription>
                جزئیات کامل تحویلات و عملکرد
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {historyLoading || summaryLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            در حال بارگذاری جزئیات...
          </div>
        ) : historyData?.data?.length > 0 ? (
          <div className="space-y-6">
            {/* Summary Stats */}
            {summaryData?.data && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {summaryData.data.stats.totalDeliveries}
                  </div>
                  <div className="text-sm text-muted-foreground">کل تحویلات</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(Number(summaryData.data.stats.onTimeDeliveryRate) || 0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">به موقع</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(Number(summaryData.data.stats.totalRevenue) || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">کل درآمد</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {summaryData.data.stats.averageRating ? Number(summaryData.data.stats.averageRating).toFixed(1) : 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">امتیاز میانگین</div>
                </Card>
              </div>
            )}

            {/* Delivery History Table */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">تاریخچه تحویلات</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">شماره سفارش</TableHead>
                    <TableHead className="text-right">مشتری</TableHead>
                    <TableHead className="text-right">مقصد</TableHead>
                    <TableHead className="text-right">وزن</TableHead>
                    <TableHead className="text-right">هزینه</TableHead>
                    <TableHead className="text-right">وضعیت</TableHead>
                    <TableHead className="text-right">تاریخ تحویل</TableHead>
                    <TableHead className="text-right">امتیاز</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.data.map((delivery: VehicleDeliveryHistory) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">{delivery.orderNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{delivery.customerName}</div>
                          <div className="text-sm text-muted-foreground">{delivery.customerPhone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{delivery.destinationAddress}</div>
                        </div>
                      </TableCell>
                      <TableCell>{Number(delivery.totalWeight) || 0} kg</TableCell>
                      <TableCell>{formatCurrency(Number(delivery.deliveryCost) || 0)}</TableCell>
                      <TableCell>{getStatusBadge(delivery.deliveryStatus)}</TableCell>
                      <TableCell>
                        {delivery.deliveryDateTime ? 
                          format(new Date(delivery.deliveryDateTime), 'yyyy/MM/dd HH:mm') : 
                          'نامشخص'
                        }
                      </TableCell>
                      <TableCell>
                        {delivery.customerRating ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{Number(delivery.customerRating).toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {selectedPlate ? 'تاریخچه‌ای برای این خودرو یافت نشد' : 'برای مشاهده جزئیات، شماره پلاک خودرو را جستجو کنید'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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

// Status display name mapping function
const getStatusDisplayName = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'pending': 'در انتظار',
    'confirmed': 'تایید شده',
    'financial_review': 'بررسی مالی',
    'warehouse_pending': 'در انتظار انبار',
    'warehouse_ready': 'آماده انبار',
    'warehouse_processing': 'در حال پردازش انبار',
    'logistics_pending': 'در انتظار لجستیک',
    'logistics_assigned': 'اختصاص یافته لجستیک',
    'logistics_dispatched': 'ارسال شده',
    'in_transit': 'در حال حمل',
    'delivered': 'تحویل داده شده',
    'cancelled': 'لغو شده',
    'returned': 'برگشت داده شده'
  };
  
  return statusMap[status] || status;
};

interface TransportationCompany {
  id: number;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  website?: string;
  isActive: boolean;
  rating?: number;
  totalDeliveries: number;
}

interface ReadyVehicle {
  id: number;
  vehicleTemplateId: number;
  vehicleType: string; // For display compatibility
  vehicleTemplateName?: string;
  vehicleTemplateNameEn?: string;
  licensePlate: string;
  driverName: string;
  driverMobile: string;
  loadCapacity: number;
  isAvailable: boolean;
  currentLocation?: string;
  notes?: string;
  supportsFlammable?: boolean;
  notAllowedFlammable?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VehicleTemplate {
  id: number;
  name: string;
  nameEn?: string;
  vehicleType: string;
  description?: string;
  maxWeight?: number;
  maxVolume?: number;
  fuelType?: string;
  isActive?: boolean;
}

interface PostalService {
  id: number;
  name: string;
  nameEn?: string;
  contactInfo?: string;
  phone: string;
  email?: string;
  website?: string;
  maxWeightKg: number;
  allowsFlammable: boolean;
  basePrice: number;
  pricePerKg: number;
  estimatedDays: number;
  trackingAvailable: boolean;
  isActive: boolean;
  supportedRegions?: string[];
  specialRequirements?: string;
}

interface LogisticsOrder {
  id: number;
  customerOrderId: number;
  orderNumber?: string;
  currentStatus: string;
  calculatedWeight?: number;
  weightUnit?: string;
  totalWeight?: string;
  totalAmount: string;
  currency: string;
  paymentMethod?: string; // نوع تسویه حساب
  deliveryMethod?: string;
  customerDeliveryMethod?: string; // روش ارسال انتخابی مشتری در چک‌اوت
  customerVehicleType?: string; // نوع وسیله نقلیه انتخابی مشتری
  transportationType?: string;
  vehicleType?: string;
  selectedVehicleName?: string; // Customer's selected vehicle from checkout
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  driverName?: string;
  driverPhone?: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  warehouseProcessedAt?: string;
  createdAt: string;
  updatedAt: string;
  deliveryCode?: string;
  isVerified?: boolean;
  customerAddress?: string;
  
  // Delivery Address information
  shippingAddress?: string;
  billingAddress?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  deliveryNotes?: string;
  
  // GPS Location data for logistics coordination
  gpsLatitude?: number | string | null;
  gpsLongitude?: number | string | null;
  locationAccuracy?: number | string | null;
  hasGpsLocation?: boolean;
  
  // Customer information
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
}

const LogisticsManagement = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [orderButtonStates, setOrderButtonStates] = useState<{[orderId: number]: { 
    isCodeSent: boolean; 
    existingCode: string | null; 
    isGenerating: boolean;
  }}>({});
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState<any>(null);
  const [isLabelDialogOpen, setIsLabelDialogOpen] = useState(false);
  
  // States for delivery code resending
  const [resendingCodes, setResendingCodes] = useState<{[orderId: number]: boolean}>({});
  const [resentCodes, setResentCodes] = useState<{[orderId: number]: boolean}>({});
  
  // States for order details modal
  const [selectedOrder, setSelectedOrder] = useState<LogisticsOrder | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  
  // States for vehicle assignment
  const [isVehicleAssignmentOpen, setIsVehicleAssignmentOpen] = useState(false);
  const [selectedOrderForVehicle, setSelectedOrderForVehicle] = useState<LogisticsOrder | null>(null);
  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState<any>(null);
  const [availableFleetVehicles, setAvailableFleetVehicles] = useState<any[]>([]);
  
  // States for enhanced suitable vehicles display
  const [isSuitableVehiclesOpen, setIsSuitableVehiclesOpen] = useState(false);
  const [suitableVehiclesData, setSuitableVehiclesData] = useState<any>(null);

  // States for postal services
  const [isCreatePostalDialogOpen, setIsCreatePostalDialogOpen] = useState(false);
  const [selectedPostalService, setSelectedPostalService] = useState<PostalService | null>(null);
  
  // States for ready vehicles directory
  const [isCreateReadyVehicleDialogOpen, setIsCreateReadyVehicleDialogOpen] = useState(false);
  const [selectedReadyVehicle, setSelectedReadyVehicle] = useState<ReadyVehicle | null>(null);
  const [isEditReadyVehicleDialogOpen, setIsEditReadyVehicleDialogOpen] = useState(false);
  
  // Order Details Dialog states
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<LogisticsOrder | null>(null);
  const [isOrderDetailsDialogOpen, setIsOrderDetailsDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [customVehicleType, setCustomVehicleType] = useState('');
  const [customEditVehicleType, setCustomEditVehicleType] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showCustomEditInput, setShowCustomEditInput] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState('');
  const [selectedEditVehicleType, setSelectedEditVehicleType] = useState('');

  // Handle showing order details
  const handleShowOrderDetails = (order: LogisticsOrder) => {
    console.log('🔍 [LOGISTICS MGMT] Opening order details for:', order.orderNumber || order.customerOrderId);
    setSelectedOrderForDetails(order);
    setIsOrderDetailsDialogOpen(true);
    setDialogKey(prev => prev + 1); // Force remount
  };

  // Handle closing order details with proper cleanup
  const handleCloseOrderDetails = useCallback(() => {
    console.log('❌ [LOGISTICS MGMT] Closing order details dialog');
    setIsOrderDetailsDialogOpen(false);
    // Use timeout to ensure state is properly cleared and prevent Portal errors
    setTimeout(() => {
      setSelectedOrderForDetails(null);
      setDialogKey(prev => prev + 1);
    }, 150);
  }, []);

  // Add escape key handler
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOrderDetailsDialogOpen) {
        handleCloseOrderDetails();
      }
    };

    if (isOrderDetailsDialogOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOrderDetailsDialogOpen, handleCloseOrderDetails]);
  
  // State for vehicle editing 
  const [editingVehicle, setEditingVehicle] = useState<any>(null);

  // States for two-step delivery confirmation
  const [confirmingDeliveryOrderId, setConfirmingDeliveryOrderId] = useState<number | null>(null);
  const [deliveryConfirmStep, setDeliveryConfirmStep] = useState<1 | 2>(1);
  const [deliveryConfirmDialogOpen, setDeliveryConfirmDialogOpen] = useState(false);

  // Fleet vehicles API integration (previously "ready vehicles")
  const { data: fleetVehiclesData, isLoading: loadingFleetVehicles } = useQuery({
    queryKey: ['/api/logistics/ready-vehicles'],
    enabled: activeTab === 'fleet-vehicles'
  });

  // Vehicle templates API integration
  const { data: vehicleTemplatesData, isLoading: loadingVehicleTemplates } = useQuery({
    queryKey: ['/api/logistics/vehicle-templates'],
    enabled: activeTab === 'vehicle-templates' || activeTab === 'fleet-vehicles'
  });

  const fleetVehicles = (fleetVehiclesData as any)?.data || [];

  // Effect to handle vehicle type selection for editing - uses dynamic vehicle templates
  React.useEffect(() => {
    if (selectedReadyVehicle && vehicleTemplatesData) {
      // Get current vehicle template names from database
      const templateNames = ((vehicleTemplatesData as any)?.data || []).map((template: any) => template.name);
      const matchingTemplate = templateNames.find((name: string) => name === selectedReadyVehicle.vehicleType);
      
      if (matchingTemplate) {
        setSelectedEditVehicleType(matchingTemplate);
      } else {
        // If no template matches, use first template as default
        setSelectedEditVehicleType(templateNames[0] || '');
      }
    }
  }, [selectedReadyVehicle, vehicleTemplatesData]);

  // Create ready vehicle mutation
  const createReadyVehicleMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/logistics/ready-vehicles', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logistics/ready-vehicles'] });
      setIsCreateReadyVehicleDialogOpen(false);
      toast({ title: "موفقیت", description: "خودرو آماده کار با موفقیت ایجاد شد" });
    },
    onError: (error: any) => {
      toast({ 
        title: "خطا", 
        description: error?.response?.data?.message || "خطا در ایجاد خودرو آماده کار", 
        variant: "destructive" 
      });
    }
  });

  // Update ready vehicle mutation
  const updateReadyVehicleMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/logistics/ready-vehicles/${id}`, { method: 'PUT', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logistics/ready-vehicles'] });
      setIsEditReadyVehicleDialogOpen(false);
      setSelectedReadyVehicle(null);
      toast({ title: "موفقیت", description: "خودرو آماده کار با موفقیت بروزرسانی شد" });
    },
    onError: (error: any) => {
      toast({ 
        title: "خطا", 
        description: error?.response?.data?.message || "خطا در بروزرسانی خودرو آماده کار", 
        variant: "destructive" 
      });
    }
  });

  // Delete ready vehicle mutation
  const deleteReadyVehicleMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/logistics/ready-vehicles/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logistics/ready-vehicles'] });
      toast({ title: "موفقیت", description: "خودرو آماده کار با موفقیت حذف شد" });
    },
    onError: (error: any) => {
      toast({ 
        title: "خطا", 
        description: error?.response?.data?.message || "خطا در حذف خودرو آماده کار", 
        variant: "destructive" 
      });
    }
  });

  // Handle create ready vehicle form submission
  const handleCreateReadyVehicle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Determine vehicle type based on selection
    const finalVehicleType = selectedVehicleType === 'سایر' ? customVehicleType : selectedVehicleType;
    
    const vehicleData = {
      vehicleType: finalVehicleType,
      licensePlate: formData.get('licensePlate') as string,
      driverName: formData.get('driverName') as string,
      driverMobile: formData.get('driverMobile') as string,
      loadCapacity: parseFloat(formData.get('loadCapacity') as string),
      currentLocation: formData.get('currentLocation') as string,
      notes: formData.get('notes') as string,
      isAvailable: formData.get('isAvailable') === 'true'
    };

    createReadyVehicleMutation.mutate(vehicleData);
    
    // Reset state
    setSelectedVehicleType('');
    setShowCustomInput(false);
    setCustomVehicleType('');
  };

  // Handle edit ready vehicle form submission
  const handleUpdateReadyVehicle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedReadyVehicle) return;

    const formData = new FormData(e.currentTarget);
    
    const vehicleData = {
      id: selectedReadyVehicle.id,
      vehicleType: selectedEditVehicleType, // Use the selected vehicle template directly
      licensePlate: formData.get('licensePlate') as string,
      driverName: formData.get('driverName') as string,
      driverMobile: formData.get('driverMobile') as string,
      loadCapacity: parseFloat(formData.get('loadCapacity') as string),
      currentLocation: formData.get('currentLocation') as string,
      notes: formData.get('notes') as string,
      isAvailable: formData.get('isAvailable') === 'true'
    };

    updateReadyVehicleMutation.mutate(vehicleData);
  };

  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [shippingWeight, setShippingWeight] = useState<number>(1);
  const [orderValue, setOrderValue] = useState<number>(0);
  const [shippingCalculation, setShippingCalculation] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Enable audio notifications for logistics orders
  const { orderCount } = useOrderNotifications({
    department: 'logistics',
    enabled: true
  });

  // Admin authentication check
  const { data: adminUser, isLoading: loadingUser } = useQuery({
    queryKey: ['/api/admin/me'],
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const user = (adminUser as any)?.user;

  // Company information query for logo
  const { data: companyInfo } = useQuery({
    queryKey: ['/api/company-information'],
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Debug log for company info
  console.log('Company Info:', companyInfo);

  // Get orders that have reached logistics stage (warehouse approved)
  const { data: logisticsOrdersResponse, isLoading: loadingLogisticsOrders, refetch: refetchLogisticsOrders } = useQuery({
    queryKey: ['/api/order-management/logistics'],
    enabled: activeTab === 'orders',
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache at all - always fresh (v5 syntax)
    refetchOnWindowFocus: true, // Refetch when user comes back
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Get delivered orders for delivered tab
  const { data: deliveredOrdersResponse, isLoading: loadingDeliveredOrders, refetch: refetchDeliveredOrders } = useQuery({
    queryKey: ['/api/order-management/delivered'],
    enabled: activeTab === 'delivered',
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache at all - always fresh (v5 syntax)
    refetchOnWindowFocus: true, // Refetch when user comes back
    refetchInterval: 60000, // Auto-refresh every 60 seconds (less frequent for delivered orders)
  });

  // Force refresh function that completely clears cache
  const forceRefreshLogisticsOrders = async () => {
    // Clear all cache first
    await queryClient.invalidateQueries({ queryKey: ['/api/order-management/logistics'] });
    await queryClient.removeQueries({ queryKey: ['/api/order-management/logistics'] });
    // Then refetch
    await refetchLogisticsOrders();
    toast({
      title: "🔄 به‌روزرسانی شد",
      description: "لیست سفارشات لجستیک از سرور بازیابی شد",
    });
  };
  
  const logisticsOrders = (logisticsOrdersResponse as any)?.orders || [];
  
  // Debug: Log first order to check recipient data
  if (logisticsOrders.length > 0) {
    const firstOrder = logisticsOrders[0];
    console.log('🔍 [LOGISTICS MGMT] Frontend query recipient data:', {
      id: firstOrder.id,
      customerOrderId: firstOrder.customerOrderId,
      orderNumber: firstOrder.orderNumber,
      recipientName: firstOrder.recipientName,
      recipientPhone: firstOrder.recipientPhone,
      recipientAddress: firstOrder.recipientAddress,
      shippingAddress: firstOrder.shippingAddress,
      hasShippingAddress: !!firstOrder.shippingAddress,
      allRecipientFields: {
        recipientName: firstOrder.recipientName,
        recipientPhone: firstOrder.recipientPhone,
        recipientAddress: firstOrder.recipientAddress
      }
    });
  }
  
  // Map data to add customer object structure for compatibility
  const mappedLogisticsOrders = logisticsOrders.map((order: any) => ({
    ...order,
    // Use existing customer object if available, otherwise create from individual fields
    customer: order.customer || {
      firstName: order.customerFirstName,
      lastName: order.customerLastName,
      email: order.customerEmail,
      phone: order.customerPhone
    },
    // Ensure customerAddress is available for display
    customerAddress: order.customerAddress || 'آدرس ثبت نشده',
    // Add GPS location availability flag
    hasGpsLocation: !!(order.gpsLatitude && order.gpsLongitude)
  }));

  const { data: companiesResponse, isLoading: loadingCompanies } = useQuery({
    queryKey: ['/api/logistics/companies'],
    enabled: activeTab === 'companies'
  });

  // Iraqi provinces and cities data
  const { data: provincesResponse, isLoading: loadingProvinces } = useQuery({
    queryKey: ['/api/logistics/provinces'],
    enabled: activeTab === 'cities' || activeTab === 'geography'
  });

  // Geography data for new geography tab
  const { data: geographyProvincesResponse, isLoading: loadingGeographyProvinces } = useQuery({
    queryKey: ['/api/logistics/provinces-detailed'],
    enabled: activeTab === 'geography'
  });

  const { data: geographyCitiesResponse, isLoading: loadingGeographyCities } = useQuery({
    queryKey: ['/api/logistics/cities-detailed'],
    enabled: activeTab === 'geography'
  });

  // Vehicle optimization states
  const [isCreateVehicleDialogOpen, setIsCreateVehicleDialogOpen] = useState(false);
  const [optimizationRequest, setOptimizationRequest] = useState<any>({});

  const { data: citiesResponse, isLoading: loadingCities } = useQuery({
    queryKey: ['/api/logistics/cities'],
    enabled: activeTab === 'cities' || activeTab === 'geography'
  });



  // Vehicle templates queries (for optimization)
  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['/api/logistics/vehicle-templates'],
    enabled: activeTab === 'vehicle-templates'
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/logistics/vehicle-selection-history'],
    enabled: activeTab === 'vehicles'
  });

  const companies = (companiesResponse as any)?.data || [];
  const vehicles = (vehiclesData as any)?.data || [];
  const history = (historyData as any)?.data || [];

  // Vehicle optimization mutations
  const createVehicleMutation = useMutation({
    mutationFn: (data: any) => 
      fetch('/api/logistics/vehicle-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logistics/vehicle-templates'] });
      setIsCreateVehicleDialogOpen(false);
      toast({ title: "موفقیت", description: "الگوی خودرو ایجاد شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در ایجاد الگوی خودرو", variant: "destructive" });
    }
  });

  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & any) => 
      fetch(`/api/logistics/vehicle-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logistics/vehicle-templates'] });
      setEditingVehicle(null);
      toast({ title: "موفقیت", description: "الگوی خودرو بروزرسانی شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در بروزرسانی الگوی خودرو", variant: "destructive" });
    }
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id: number) => 
      fetch(`/api/logistics/vehicle-templates/${id}`, {
        method: 'DELETE'
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logistics/vehicle-templates'] });
      toast({ title: "موفقیت", description: "الگوی خودرو حذف شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در حذف الگوی خودرو", variant: "destructive" });
    }
  });

  const optimizeVehicleMutation = useMutation({
    mutationFn: (data: any) => 
      fetch('/api/logistics/select-optimal-vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/logistics/vehicle-selection-history'] });
      toast({ 
        title: "انتخاب بهینه انجام شد", 
        description: `وسیله انتخاب شده: ${result.data.selectedVehicle.vehicleName} - هزینه: ${parseInt(result.data.selectedVehicle.totalCost)} دینار`
      });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در انتخاب وسیله بهینه", variant: "destructive" });
    }
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'warehouse_approved': { color: 'bg-blue-500', text: 'تایید انبار' },
      'logistics_assigned': { color: 'bg-yellow-500', text: 'اختصاص لجستیک' },
      'logistics_processing': { color: 'bg-orange-500', text: 'در حال پردازش' },
      'logistics_dispatched': { color: 'bg-purple-500', text: 'ارسال شده' },
      'logistics_delivered': { color: 'bg-green-500', text: 'تحویل داده شده' },
      'available': { color: 'bg-green-500', text: 'آزاد' },
      'assigned': { color: 'bg-yellow-500', text: 'اختصاص یافته' },
      'in_transit': { color: 'bg-blue-500', text: 'در حال حمل' },
      'maintenance': { color: 'bg-red-500', text: 'تعمیر' },
      'offline': { color: 'bg-gray-500', text: 'آفلاین' },
    };
    const config = (statusMap as any)[status] || { color: 'bg-gray-500', text: status };
    return <Badge className={config.color}>{config.text}</Badge>;
  };



  // Handle enhanced vehicle assignment workflow
  // Smart vehicle recommendation based on template matching
  const getRecommendedVehicles = (order: LogisticsOrder, availableVehicles: any[], suitableTemplates: any[]) => {
    const orderWeight = order.calculatedWeight || order.totalWeight || 0;
    const orderCity = order.shippingAddress?.city || '';
    
    console.log('🤖 [SMART RECOMMENDATION] Analyzing order requirements:', {
      weight: orderWeight,
      city: orderCity,
      availableVehicles: availableVehicles.length,
      suitableTemplates: suitableTemplates.length
    });
    
    // Score vehicles based on multiple factors
    const scoredVehicles = availableVehicles.map(vehicle => {
      let score = 0;
      let reasons = [];
      
      // Find matching template for this vehicle
      const matchingTemplate = suitableTemplates.find(template => template.name === vehicle.vehicleType);
      
      if (matchingTemplate) {
        score += 40; // Base score for template match
        reasons.push('مطابق با الگوی پیشنهادی');
        
        // Weight efficiency scoring
        const weightCapacity = parseFloat(matchingTemplate.maxWeightKg) || parseFloat(vehicle.loadCapacity) || 0;
        if (weightCapacity > 0) {
          const utilizationRate = orderWeight / weightCapacity;
          if (utilizationRate >= 0.7 && utilizationRate <= 0.9) {
            score += 30; // Optimal utilization
            reasons.push('استفاده بهینه از ظرفیت');
          } else if (utilizationRate >= 0.5 && utilizationRate < 0.7) {
            score += 20; // Good utilization
            reasons.push('استفاده مناسب از ظرفیت');
          } else if (utilizationRate < 0.5) {
            score += 10; // Underutilized but safe
            reasons.push('ظرفیت اضافی موجود');
          }
        }
        
        // Route compatibility
        if (matchingTemplate.allowedRoutes?.includes('urban') && orderCity) {
          score += 15;
          reasons.push('مناسب برای حمل شهری');
        }
        
        // Cost efficiency
        const totalCost = parseFloat(matchingTemplate.basePrice) + 
                         (parseFloat(matchingTemplate.pricePerKm) * 10) + // Assume 10km average
                         (parseFloat(matchingTemplate.pricePerKg) * orderWeight);
        
        if (totalCost < 100000) {
          score += 20;
          reasons.push('هزینه اقتصادی');
        } else if (totalCost < 200000) {
          score += 10;
          reasons.push('هزینه متعادل');
        }
      }
      
      // Vehicle availability and status
      if (vehicle.isAvailable !== false && vehicle.status !== 'maintenance') {
        score += 25;
        reasons.push('آماده به خدمت');
      }
      
      // Driver availability
      if (vehicle.driverName && vehicle.driverName !== 'راننده موقت') {
        score += 15;
        reasons.push('راننده تعیین شده');
      }
      
      return {
        ...vehicle,
        recommendationScore: score,
        recommendationReasons: reasons,
        matchingTemplate,
        isRecommended: score >= 70
      };
    });
    
    // Sort by score (highest first)
    return scoredVehicles.sort((a, b) => b.recommendationScore - a.recommendationScore);
  };

  const handleVehicleAssignment = async (order: LogisticsOrder) => {
    try {
      console.log('🚚 [ENHANCED VEHICLE ASSIGNMENT] Starting for order:', order.orderNumber);
      console.log('🚚 [ORDER DETAILS] Weight:', order.calculatedWeight || order.totalWeight, 'kg');
      
      // Reset state first
      setAvailableFleetVehicles([]);
      setSelectedVehicleDetails(null);
      setSuitableVehiclesData(null);
      
      // Set the selected order for vehicle assignment IMMEDIATELY
      setSelectedOrderForVehicle(order);
      
      // Open the vehicle assignment dialog immediately
      setIsVehicleAssignmentOpen(true);
      
      // Get all suitable vehicles identified during checkout
      const suitableVehiclesResponse = await fetch(`/api/orders/${order.customerOrderId}/suitable-vehicles`, {
        credentials: 'include'
      });
      
      if (suitableVehiclesResponse.ok) {
        const suitableVehiclesData = await suitableVehiclesResponse.json();
        if (suitableVehiclesData.success) {
          setSuitableVehiclesData(suitableVehiclesData.data);
          console.log('✅ [SUITABLE VEHICLES] Found vehicles:', suitableVehiclesData.data.suitableVehicles.length);
          setSelectedOrderForVehicle(order);
          setIsSuitableVehiclesOpen(true);
          return;
        }
      }
      
      // Enhanced fallback with smart recommendations
      console.log('⚠️ [FALLBACK] Using enhanced vehicle assignment method');
      
      // Get customer's selected vehicle details from checkout
      const vehicleDetailsResponse = await fetch(`/api/orders/${order.customerOrderId}/vehicle-details`, {
        credentials: 'include'
      });
      
      let checkoutVehicleDetails = null;
      if (vehicleDetailsResponse.ok) {
        checkoutVehicleDetails = await vehicleDetailsResponse.json();
        setSelectedVehicleDetails(checkoutVehicleDetails);
        console.log('✅ [CHECKOUT VEHICLE] Found customer selected vehicle:', checkoutVehicleDetails);
      }
      
      // Get all ready vehicles (آماده به کار)
      const readyVehiclesResponse = await fetch('/api/logistics/ready-vehicles', {
        credentials: 'include'
      });
      
      let readyVehicles = [];
      if (readyVehiclesResponse.ok) {
        const readyVehiclesData = await readyVehiclesResponse.json();
        readyVehicles = readyVehiclesData.vehicles || readyVehiclesData.data || [];
        console.log('🚛 [READY VEHICLES] Found ready vehicles:', readyVehicles.length);
        
        const orderWeight = order.calculatedWeight || order.totalWeight || 0;
        console.log('📦 [ORDER DETAILS] Weight:', orderWeight, 'kg');
        
        let availableVehicles = readyVehicles.filter((vehicle: any) => 
          vehicle.isAvailable && 
          vehicle.loadCapacity >= orderWeight
        );
        
        // 🎯 ENHANCED TEMPLATE MATCHING: Match customer's template selection to available physical vehicles
        if (checkoutVehicleDetails && checkoutVehicleDetails.vehicleType) {
          console.log('🔍 [TEMPLATE MATCHING] Customer selected template:', checkoutVehicleDetails.vehicleType);
          console.log('🔍 [TEMPLATE MATCHING] Available vehicles before template filter:', availableVehicles.length);
          
          // First try exact template match
          const exactTemplateMatches = availableVehicles.filter((vehicle: any) => 
            vehicle.vehicleTemplateName === checkoutVehicleDetails.vehicleType ||
            vehicle.vehicleName === checkoutVehicleDetails.vehicleType ||
            vehicle.vehicleType === checkoutVehicleDetails.vehicleType
          );
          
          // If no exact matches, try partial matches
          const partialTemplateMatches = availableVehicles.filter((vehicle: any) => 
            vehicle.vehicleTemplateName?.includes(checkoutVehicleDetails.vehicleType) ||
            checkoutVehicleDetails.vehicleType.includes(vehicle.vehicleTemplateName || '') ||
            vehicle.vehicleType?.includes(checkoutVehicleDetails.vehicleType) ||
            checkoutVehicleDetails.vehicleType.includes(vehicle.vehicleType || '')
          );
          
          console.log('✅ [TEMPLATE EXACT] Found exact template matches:', exactTemplateMatches.length);
          console.log('🔍 [TEMPLATE PARTIAL] Found partial template matches:', partialTemplateMatches.length);
          
          // 🎯 ENHANCED PRIORITY SYSTEM: Exact template matches get highest priority
          let prioritizedVehicles = [];
          
          if (exactTemplateMatches.length > 0) {
            // Priority 1: Exact template matches
            prioritizedVehicles.push(...exactTemplateMatches.map((v: any) => ({ 
              ...v, 
              templateMatchType: 'exact', 
              priority: 1,
              isCheckoutSuggested: true,
              matchType: 'exact',
              matchReason: `انطباق کامل با الگوی "${checkoutVehicleDetails.vehicleType}" انتخاب شده توسط مشتری`
            })));
            console.log('🎯 [TEMPLATE SUCCESS] Added exact template matches with priority 1');
          }
          
          if (partialTemplateMatches.length > 0) {
            // Priority 2: Partial template matches
            const filteredPartialMatches = partialTemplateMatches.filter((v: any) => 
              !exactTemplateMatches.some((exact: any) => exact.id === v.id)
            );
            prioritizedVehicles.push(...filteredPartialMatches.map((v: any) => ({ 
              ...v, 
              templateMatchType: 'partial', 
              priority: 2,
              isCheckoutSuggested: true,
              matchType: 'partial',
              matchReason: `انطباق نزدیک با الگوی "${checkoutVehicleDetails.vehicleType}" انتخاب شده توسط مشتری`
            })));
            console.log('🔄 [TEMPLATE PARTIAL] Added partial template matches with priority 2');
          }
          
          // Priority 3: Other compatible vehicles (as alternative options)
          const otherCompatibleVehicles = availableVehicles.filter((v: any) => 
            !exactTemplateMatches.some((exact: any) => exact.id === v.id) &&
            !partialTemplateMatches.some((partial: any) => partial.id === v.id)
          );
          
          if (otherCompatibleVehicles.length > 0) {
            prioritizedVehicles.push(...otherCompatibleVehicles.map((v: any) => ({ 
              ...v, 
              templateMatchType: 'alternative', 
              priority: 3,
              isCheckoutSuggested: false,
              matchType: 'alternative',
              matchReason: 'گزینه جایگزین با ظرفیت مناسب'
            })));
            console.log('🔀 [ALTERNATIVES] Added alternative vehicles with priority 3');
          }
          
          // Sort by priority (lower number = higher priority)
          prioritizedVehicles.sort((a: any, b: any) => a.priority - b.priority);
          availableVehicles = prioritizedVehicles;
          
          console.log('🎯 [FINAL PRIORITY] Final vehicle list:', availableVehicles.map((v: any) => ({
            id: v.id,
            licensePlate: v.licensePlate,
            matchType: v.matchType,
            priority: v.priority,
            reason: v.matchReason
          })));
        }
        
        // Apply smart vehicle recommendation algorithm
        if (checkoutVehicleDetails && vehicleTemplatesData) {
          const suitableTemplates = ((vehicleTemplatesData as any)?.data || []).filter((template: any) => 
            template.name === checkoutVehicleDetails.vehicleType ||
            template.name.includes(checkoutVehicleDetails.vehicleType) ||
            checkoutVehicleDetails.vehicleType.includes(template.name)
          );
          
          if (suitableTemplates.length > 0) {
            console.log('🤖 [SMART RECOMMENDATION] Applying recommendation algorithm');
            availableVehicles = getRecommendedVehicles(order, availableVehicles, suitableTemplates);
          }
        }
        
        // If no ready vehicles found, fallback to fleet vehicles from delivery_vehicles table
        if (availableVehicles.length === 0) {
          console.log('⚠️ [FALLBACK] No ready vehicles, fetching from fleet vehicles API...');
          const fleetVehiclesResponse = await fetch('/api/admin/fleet-vehicles?status=available', {
            credentials: 'include'
          });
          
          if (fleetVehiclesResponse.ok) {
            const fleetData = await fleetVehiclesResponse.json();
            const fleetVehicles = fleetData.data || [];
            console.log('🚛 [FLEET VEHICLES] Found fleet vehicles:', fleetVehicles.length);
            
            // Map fleet vehicles to compatible format
            availableVehicles = fleetVehicles.map((v: any) => ({
              id: v.id,
              vehicleType: v.vehicleType,
              vehicleName: `${v.make || ''} ${v.model || ''}`.trim() || v.vehicleType,
              licensePlate: v.plateNumber,
              plateNumber: v.plateNumber,
              driverName: 'راننده موقت',
              driverPhone: '',
              driverMobile: '',
              loadCapacity: v.maxLoadKg || v.maxWeight || 10000,
              maxWeight: v.maxLoadKg || v.maxWeight || 10000,
              isAvailable: v.currentStatus === 'available',
              color: v.color,
              matchType: 'alternative',
              matchReason: 'خودرو از ناوگان شرکت',
              isCheckoutSuggested: false
            }));
          }
        }
        
        setAvailableFleetVehicles(availableVehicles);
        console.log('✅ [VEHICLE ASSIGNMENT] Dialog opened with', availableVehicles.length, 'vehicles available');
        
      } else {
        // If ready-vehicles API failed, try fleet-vehicles as fallback
        console.log('⚠️ [FALLBACK] Ready vehicles API failed, trying fleet vehicles...');
        const fleetVehiclesResponse = await fetch('/api/admin/fleet-vehicles?status=available', {
          credentials: 'include'
        });
        
        if (fleetVehiclesResponse.ok) {
          const fleetData = await fleetVehiclesResponse.json();
          const fleetVehicles = fleetData.data || [];
          console.log('🚛 [FLEET VEHICLES FALLBACK] Found fleet vehicles:', fleetVehicles.length);
          
          const mappedVehicles = fleetVehicles.map((v: any) => ({
            id: v.id,
            vehicleType: v.vehicleType,
            vehicleName: `${v.make || ''} ${v.model || ''}`.trim() || v.vehicleType,
            licensePlate: v.plateNumber,
            plateNumber: v.plateNumber,
            driverName: 'راننده موقت',
            driverPhone: '',
            driverMobile: '',
            loadCapacity: v.maxLoadKg || v.maxWeight || 10000,
            maxWeight: v.maxLoadKg || v.maxWeight || 10000,
            isAvailable: v.currentStatus === 'available',
            color: v.color,
            matchType: 'alternative',
            matchReason: 'خودرو از ناوگان شرکت',
            isCheckoutSuggested: false
          }));
          
          setAvailableFleetVehicles(mappedVehicles);
        } else {
          console.error('❌ [FLEET VEHICLES] Failed to fetch fleet vehicles');
          setAvailableFleetVehicles([]);
        }
      }
    } catch (error) {
      console.error('❌ [VEHICLE ASSIGNMENT ERROR]:', error);
      toast({
        title: "خطا",
        description: "خطا در بارگذاری خودروهای موجود",
        variant: "destructive"
      });
      setAvailableFleetVehicles([]);
    }
  };

  // Assign vehicle to order
  const assignVehicleToOrder = async (vehicleId: number, truckNumber: string, driverName: string, driverPhone: string) => {
    try {
      const response = await fetch(`/api/logistics/assign-vehicle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          orderId: selectedOrderForVehicle?.customerOrderId,
          orderManagementId: selectedOrderForVehicle?.id,
          vehicleId,
          truckNumber,
          driverName,
          driverPhone
        })
      });

      if (response.ok) {
        toast({
          title: "موفقیت",
          description: "خودرو با موفقیت به سفارش اختصاص یافت"
        });
        
        // Refresh the orders list
        queryClient.invalidateQueries({ queryKey: ['/api/order-management/logistics'] });
        setIsVehicleAssignmentOpen(false);
      } else {
        throw new Error('Assignment failed');
      }
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      toast({
        title: "خطا",
        description: "خطا در اختصاص وسیله ارسال محموله",
        variant: "destructive"
      });
    }
  };

  // Handler for selecting vehicles from suitable vehicles list
  const handleTemplateVehicleSelection = async (vehicle: any, isOptimal: boolean = false) => {
    if (!selectedOrderForVehicle) {
      toast({
        title: "خطا",
        description: "سفارش انتخاب شده‌ای برای اختصاص خودرو وجود ندارد",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create a new ready vehicle based on the template selection
      const readyVehicleData = {
        vehicleName: vehicle.name,
        vehicleType: vehicle.vehicleType,
        plateNumber: `TMP-${Date.now()}`, // Temporary plate number
        driverName: 'راننده موقت',
        driverPhone: '09120000000',
        licensePlate: `TMP-${Date.now()}`,
        maxWeight: vehicle.maxWeightKg,
        loadCapacity: vehicle.maxWeightKg,
        status: 'available',
        isCheckoutSuggested: isOptimal,
        totalCost: vehicle.totalCost,
        notes: `خودرو انتخاب شده از قالب ${vehicle.name} - ${isOptimal ? 'انتخاب بهینه سیستم' : 'انتخاب دستی'}`
      };

      // Call the create ready vehicle API
      const response = await fetch('/api/logistics/ready-vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(readyVehicleData)
      });

      if (response.ok) {
        const newVehicle = await response.json();
        
        // Add to available fleet vehicles immediately
        setAvailableFleetVehicles(prev => [
          {
            ...newVehicle,
            isCheckoutSuggested: isOptimal,
            driverMobile: newVehicle.driverPhone
          },
          ...prev
        ]);

        toast({
          title: isOptimal ? "🎯 انتخاب بهینه اضافه شد" : "✅ خودرو اضافه شد",
          description: `خودرو ${vehicle.name} ${isOptimal ? '(انتخاب بهینه سیستم)' : ''} به لیست خودروهای آماده اضافه شد و آماده اختصاص است`,
          variant: "default"
        });

        // Close the suitable vehicles dialog
        setIsSuitableVehiclesOpen(false);
        
        // Refresh ready vehicles list
        queryClient.invalidateQueries({ queryKey: ['/api/logistics/ready-vehicles'] });

      } else {
        throw new Error('Failed to create ready vehicle');
      }
    } catch (error) {
      console.error('Error creating ready vehicle from template:', error);
      toast({
        title: "خطا",
        description: "خطا در ایجاد خودرو آماده از قالب انتخابی",
        variant: "destructive"
      });
    }
  };

  const VEHICLE_TYPES = {
    motorcycle: "موتور",
    bicycle: "دوچرخه",
    scooter: "اسکوتر",
    van: "وانت",
    pickup: "پیکاپ", 
    small_truck: "کامیون کوچک",
    light_truck: "کامیون سبک",
    medium_truck: "کامیون متوسط",
    heavy_truck: "کامیون سنگین",
    articulated_truck: "کامیون کشنده",
    tanker: "تانکر",
    refrigerated_truck: "کامیون یخچالی",
    flatbed_truck: "کامیون بار باز",
    container_truck: "کامیون کانتینری",
    crane_truck: "کامیون جرثقیل",
    dump_truck: "کامیون کمپرسی",
    cargo_van: "ون باری",
    mini_bus: "مینی‌بوس",
    bus: "اتوبوس",
    trailer: "تریلی"
  };

  const ROUTE_TYPES = {
    urban: "شهری",
    interurban: "بین شهری",
    highway: "آزادراه"
  };

  const handleCreateVehicle = (formData: FormData) => {
    const vehicleData = {
      name: formData.get('name') as string,
      nameEn: formData.get('nameEn') as string,
      vehicleType: formData.get('vehicleType') as string,
      maxWeightKg: formData.get('maxWeightKg') as string,
      maxVolumeM3: formData.get('maxVolumeM3') as string || null,
      allowedRoutes: (formData.get('allowedRoutes') as string).split(',').map(r => r.trim()),
      basePrice: formData.get('basePrice') as string,
      pricePerKm: formData.get('pricePerKm') as string,
      pricePerKg: formData.get('pricePerKg') as string || "0",
      supportsHazardous: formData.get('supportsHazardous') === 'true',
      supportsFlammable: formData.get('supportsFlammable') === 'true',
      supportsRefrigerated: formData.get('supportsRefrigerated') === 'true',
      supportsFragile: formData.get('supportsFragile') !== 'false',
      averageSpeedKmh: formData.get('averageSpeedKmh') as string || "50",

      priority: parseInt(formData.get('priority') as string) || 0
    };
    createVehicleMutation.mutate(vehicleData);
  };

  const handleOptimizeVehicle = () => {
    if (!optimizationRequest.orderNumber || !optimizationRequest.weightKg || !optimizationRequest.routeType || !optimizationRequest.distanceKm) {
      toast({ title: "خطا", description: "لطفاً همه فیلدهای اجباری را پر کنید", variant: "destructive" });
      return;
    }
    optimizeVehicleMutation.mutate(optimizationRequest);
  };

  const handleDeleteVehicle = (vehicleId: number) => {
    if (confirm("آیا از حذف این الگوی خودرو مطمئن هستید؟")) {
      deleteVehicleMutation.mutate(vehicleId);
    }
  };

  const handleEditVehicle = (formData: FormData) => {
    if (!editingVehicle) return;
    
    const allowedRoutesString = formData.get('allowedRoutes') as string;
    const allowedRoutesArray = allowedRoutesString ? allowedRoutesString.split(',').map(r => r.trim()) : ['urban'];
    
    const selectedVehicleType = formData.get('vehicleType') as string;
    const finalVehicleType = selectedVehicleType === 'سایر' ? customEditVehicleType : selectedVehicleType;
    
    const data = {
      name: formData.get('name') as string,
      nameEn: formData.get('nameEn') as string,
      vehicleType: finalVehicleType,
      maxWeightKg: parseFloat(formData.get('maxWeightKg') as string),
      maxVolumeM3: parseFloat(formData.get('maxVolumeM3') as string) || 0,
      basePrice: parseFloat(formData.get('basePrice') as string),
      pricePerKm: parseFloat(formData.get('pricePerKm') as string),
      allowedRoutes: allowedRoutesArray,
      averageSpeedKmh: parseFloat(formData.get('averageSpeedKmh') as string) || 50,
      supportsFlammable: formData.get('supportsFlammable') === 'true',
      supportsHazardous: formData.get('supportsHazardous') === 'true',
      isActive: formData.get('isActive') === 'on'
    };

    console.log('🚛 [VEHICLE EDIT] Sending data:', data);
    updateVehicleMutation.mutate({ id: editingVehicle.id, ...data });
  };

  const handleToggleVehicleStatus = (vehicleId: number, newStatus: boolean) => {
    updateVehicleMutation.mutate({ 
      id: vehicleId, 
      isActive: newStatus 
    });
  };

  const VehicleTemplatesTab = () => {
    return (
      <>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Truck className="h-5 w-5" />
                مدیریت قالب‌های خودرو
              </h2>
              <p className="text-muted-foreground text-sm">مدیریت الگوهای خودرو برای سیستم انتخاب بهینه و محاسبه هزینه</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-medium">الگوهای خودرو</h3>
              <Dialog open={isCreateVehicleDialogOpen} onOpenChange={setIsCreateVehicleDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 ml-2" />
                    افزودن الگوی جدید
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>افزودن الگوی خودروی جدید</DialogTitle>
                    <DialogDescription>اطلاعات الگوی خودرو را برای استفاده در انتخاب بهینه وارد کنید</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); handleCreateVehicle(new FormData(e.currentTarget)); }}>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">نام فارسی *</Label>
                        <Input id="name" name="name" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nameEn">نام انگلیسی</Label>
                        <Input id="nameEn" name="nameEn" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vehicleType">نوع خودرو *</Label>
                        <select name="vehicleType" required className="w-full p-2 border rounded">
                          <option value="">انتخاب نوع خودرو</option>
                          {Object.entries(VEHICLE_TYPES).map(([key, value]) => (
                            <option key={key} value={key}>{value}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxWeightKg">حداکثر وزن (کیلوگرم) *</Label>
                        <Input id="maxWeightKg" name="maxWeightKg" type="number" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="basePrice">قیمت پایه (دینار) *</Label>
                        <Input id="basePrice" name="basePrice" type="number" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pricePerKm">قیمت هر کیلومتر (دینار) *</Label>
                        <Input id="pricePerKm" name="pricePerKm" type="number" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="allowedRoutes">مسیرهای مجاز *</Label>
                        <Input id="allowedRoutes" name="allowedRoutes" placeholder="urban,interurban,highway" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="averageSpeedKmh">سرعت متوسط (کیلومتر/ساعت)</Label>
                        <Input id="averageSpeedKmh" name="averageSpeedKmh" type="number" defaultValue="50" />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label className="flex items-center gap-2">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <Shield className="h-4 w-4 text-red-500" />
                          قابلیت حمل مواد خطرناک و آتش زا
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-gray-600">مواد آتش زا</Label>
                            <Select name="supportsFlammable">
                              <SelectTrigger>
                                <SelectValue placeholder="انتخاب کنید" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">مجاز</SelectItem>
                                <SelectItem value="false">غیر مجاز</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-gray-600">مواد خطرناک</Label>
                            <Select name="supportsHazardous">
                              <SelectTrigger>
                                <SelectValue placeholder="انتخاب کنید" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">مجاز</SelectItem>
                                <SelectItem value="false">غیر مجاز</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCreateVehicleDialogOpen(false)}>انصراف</Button>
                      <Button type="submit" disabled={createVehicleMutation.isPending}>
                        {createVehicleMutation.isPending ? "در حال ایجاد..." : "ایجاد الگو"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>نام</TableHead>
                      <TableHead>نوع</TableHead>
                      <TableHead>حداکثر وزن</TableHead>
                      <TableHead>حجم</TableHead>
                      <TableHead>مواد خطرناک و آتش زا</TableHead>
                      <TableHead>قیمت پایه</TableHead>
                      <TableHead>قیمت/کیلومتر</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead>عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehiclesLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">در حال بارگذاری...</TableCell>
                      </TableRow>
                    ) : vehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">هیچ الگوی خودرویی یافت نشد</TableCell>
                      </TableRow>
                    ) : (
                      vehicles.map((vehicle: any) => (
                        <TableRow key={vehicle.id}>
                          <TableCell>{vehicle.name}</TableCell>
                          <TableCell>{(VEHICLE_TYPES as any)[vehicle.vehicleType] || vehicle.vehicleType}</TableCell>
                          <TableCell>{parseInt(vehicle.maxWeightKg)} کیلوگرم</TableCell>
                          <TableCell>{parseInt(vehicle.maxVolumeM3) || 0} متر مکعب</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Badge variant={vehicle.supportsFlammable ? "default" : "secondary"} className="text-xs flex items-center gap-1">
                                <Flame className="h-3 w-3" />
                                {vehicle.supportsFlammable ? "آتش زا" : "ممنوع"}
                              </Badge>
                              <Badge variant={vehicle.supportsHazardous ? "default" : "secondary"} className="text-xs flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                {vehicle.supportsHazardous ? "خطرناک" : "ممنوع"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{parseInt(vehicle.basePrice)} دینار</TableCell>
                          <TableCell>{parseInt(vehicle.pricePerKm)} دینار</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={vehicle.isActive ? "default" : "secondary"}>
                                {vehicle.isActive ? "فعال" : "غیرفعال"}
                              </Badge>
                              <Button
                                size="sm"
                                variant={vehicle.isActive ? "destructive" : "default"}
                                onClick={() => handleToggleVehicleStatus(vehicle.id, !vehicle.isActive)}
                                disabled={updateVehicleMutation.isPending}
                              >
                                {vehicle.isActive ? "غیرفعال" : "فعال"}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setEditingVehicle(vehicle)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                ویرایش
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleDeleteVehicle(vehicle.id)}
                              >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                حذف
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Edit Vehicle Dialog */}
            {editingVehicle && (
              <Dialog open={!!editingVehicle} onOpenChange={(open) => {
                if (!open) {
                  setEditingVehicle(null);
                  setShowCustomEditInput(false);
                  setCustomEditVehicleType('');
                }
              }}>
                <DialogContent className="max-w-2xl" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>ویرایش الگوی خودرو</DialogTitle>
                    <DialogDescription>اطلاعات الگوی خودرو را ویرایش کنید</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); handleEditVehicle(new FormData(e.currentTarget)); }}>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-name">نام فارسی *</Label>
                        <Input 
                          id="edit-name" 
                          name="name" 
                          defaultValue={editingVehicle.name}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-nameEn">نام انگلیسی</Label>
                        <Input 
                          id="edit-nameEn" 
                          name="nameEn" 
                          defaultValue={editingVehicle.nameEn || ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-vehicleType">نوع خودرو *</Label>
                        <select 
                          name="vehicleType" 
                          defaultValue={Object.keys(VEHICLE_TYPES).includes(editingVehicle.vehicleType) ? editingVehicle.vehicleType : 'سایر'}
                          required 
                          className="w-full p-2 border rounded"
                          onChange={(e) => {
                            const value = e.target.value;
                            setShowCustomEditInput(value === 'سایر');
                            if (value !== 'سایر') {
                              setCustomEditVehicleType('');
                            }
                          }}
                        >
                          <option value="">انتخاب نوع خودرو</option>
                          {Object.entries(VEHICLE_TYPES).map(([key, value]) => (
                            <option key={key} value={key}>{value}</option>
                          ))}
                          <option value="سایر">سایر (وارد کردن نوع دلخواه)</option>
                        </select>
                        {showCustomEditInput && (
                          <div className="mt-2">
                            <Input 
                              name="customVehicleType"
                              value={customEditVehicleType}
                              onChange={(e) => setCustomEditVehicleType(e.target.value)}
                              placeholder="نوع خودروی مورد نظر را وارد کنید"
                              required={showCustomEditInput}
                              className="w-full"
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-maxWeightKg">حداکثر وزن (کیلوگرم) *</Label>
                        <input 
                          id="edit-maxWeightKg" 
                          name="maxWeightKg" 
                          type="number" 
                          defaultValue={parseInt(editingVehicle.maxWeightKg).toString()}
                          required 
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-basePrice">قیمت پایه (دینار) *</Label>
                        <input 
                          id="edit-basePrice" 
                          name="basePrice" 
                          type="number" 
                          defaultValue={parseInt(editingVehicle.basePrice).toString()}
                          required 
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-pricePerKm">قیمت هر کیلومتر (دینار) *</Label>
                        <input 
                          id="edit-pricePerKm" 
                          name="pricePerKm" 
                          type="number" 
                          defaultValue={parseInt(editingVehicle.pricePerKm).toString()}
                          required 
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-allowedRoutes">مسیرهای مجاز *</Label>
                        <Input 
                          id="edit-allowedRoutes" 
                          name="allowedRoutes" 
                          defaultValue={editingVehicle.allowedRoutes}
                          placeholder="urban,interurban,highway" 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-averageSpeedKmh">سرعت متوسط (کیلومتر/ساعت)</Label>
                        <input 
                          id="edit-averageSpeedKmh" 
                          name="averageSpeedKmh" 
                          type="number" 
                          defaultValue={(parseInt(editingVehicle.averageSpeedKmh) || 50).toString()}
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-maxVolumeM3">حجم حداکثر (متر مکعب)</Label>
                        <input 
                          id="edit-maxVolumeM3" 
                          name="maxVolumeM3" 
                          type="number" 
                          defaultValue={(parseInt(editingVehicle.maxVolumeM3) || 0).toString()}
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label className="flex items-center gap-2">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <Shield className="h-4 w-4 text-red-500" />
                          قابلیت حمل مواد خطرناک و آتش زا
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-gray-600">مواد آتش زا</Label>
                            <Select name="supportsFlammable" defaultValue={editingVehicle.supportsFlammable?.toString() || "false"}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">مجاز</SelectItem>
                                <SelectItem value="false">غیر مجاز</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-gray-600">مواد خطرناک</Label>
                            <Select name="supportsHazardous" defaultValue={editingVehicle.supportsHazardous?.toString() || "false"}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">مجاز</SelectItem>
                                <SelectItem value="false">غیر مجاز</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 col-span-2">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            id="edit-isActive" 
                            name="isActive" 
                            defaultChecked={editingVehicle.isActive}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="edit-isActive">فعال</Label>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setEditingVehicle(null)}>
                        انصراف
                      </Button>
                      <Button type="submit" disabled={updateVehicleMutation.isPending}>
                        {updateVehicleMutation.isPending ? "در حال بروزرسانی..." : "بروزرسانی"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </>
    );
  };

  // Print order details - deprecated in favor of direct same-tab print
  const handlePrintOrderDetails = () => {
    if (!selectedOrder) return;
    
    const printContent = `
      <html>
        <head>
          <title>جزئیات سفارش ${selectedOrder.orderNumber}</title>
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              direction: rtl; 
              text-align: right; 
              margin: 0;
              padding: 20mm 20mm 15mm 20mm; /* یکسان کردن حاشیه‌ها با print دوم */
              font-size: 14px;
              line-height: 1.4;
              color: #000;
              background: white;
            }
            .header { 
              text-align: center; 
              margin-bottom: 25px; 
              border-bottom: 3px solid #000; 
              padding-bottom: 15px;
              page-break-inside: avoid;
            }
            .header img {
              max-width: 120px;
              max-height: 80px;
              margin-bottom: 15px;
              display: block;
              margin-left: auto;
              margin-right: auto;
            }
            .header h1 { 
              font-size: 22px; 
              margin: 0 0 10px 0; 
              color: #000;
              font-weight: bold;
            }
            .header h2 { 
              font-size: 18px; 
              margin: 5px 0; 
              color: #000;
            }
            .header p {
              font-size: 12px;
              margin: 5px 0;
              color: #555;
            }
            .section { 
              margin-bottom: 20px; 
              padding: 15px; 
              border: 2px solid #000; 
              border-radius: 8px;
              background: #f9f9f9;
              page-break-inside: avoid;
            }
            .section h3 { 
              color: #000; 
              margin: 0 0 15px 0; 
              font-size: 16px;
              font-weight: bold;
              border-bottom: 1px solid #000;
              padding-bottom: 5px;
            }
            .info-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 15px;
              margin: 0;
            }
            .info-item { 
              margin: 0; 
              padding: 12px;
              background: white;
              border: 2px solid #333;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .info-item[style*="grid-column"] {
              grid-column: 1 / -1;
            }
            .info-item.address-item {
              border: 3px solid #e53e3e;
              background: #fef5e7;
              padding: 20px;
            }
            .label { 
              font-weight: bold; 
              color: #000; 
              display: block;
              margin-bottom: 8px;
              font-size: 14px;
              text-transform: uppercase;
            }
            .label.address-label {
              font-size: 16px;
              color: #e53e3e;
              border-bottom: 2px solid #e53e3e;
              padding-bottom: 4px;
            }
            .value { 
              color: #000;
              font-weight: normal;
              display: block;
              word-wrap: break-word;
              margin: 0;
              line-height: 1.5;
            }
            .value.address-value {
              font-size: 20px;
              font-weight: bold;
              color: #000;
              line-height: 1.8;
              padding: 15px;
              background: #fff8f0;
              border: 3px dashed #e53e3e;
              border-radius: 8px;
              text-align: center;
              box-shadow: inset 0 2px 4px rgba(229, 62, 62, 0.1);
            }
            .value.phone-value {
              font-size: 16px;
              font-weight: bold;
              color: #2563eb;
            }
            @media print {
              body { 
                margin: 0; 
                padding: 10mm;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                font-size: 12px;
              }
              .no-print { display: none !important; }
              .section { 
                page-break-inside: avoid; 
                margin-bottom: 15px;
                border: 2px solid #000 !important;
                background: white !important;
                padding: 12px;
              }
              .header { 
                page-break-after: avoid;
                border-bottom: 3px solid #000 !important;
                margin-bottom: 20px;
              }
              .info-item {
                border: 2px solid #000 !important;
                background: white !important;
                padding: 10px;
                margin-bottom: 8px;
                box-shadow: none !important;
              }
              .info-item.address-item {
                border: 3px solid #000 !important;
                background: #f0f0f0 !important;
                padding: 15px;
              }
              .info-grid {
                gap: 10px;
              }
              .label, .value {
                color: #000 !important;
              }
              .label.address-label {
                color: #000 !important;
                border-bottom: 2px solid #000 !important;
              }
              .value.address-value {
                font-size: 18px !important;
                font-weight: bold !important;
                border: 3px solid #000 !important;
                background: #f8f8f8 !important;
                padding: 12px !important;
                text-align: center !important;
                line-height: 1.6 !important;
              }
              .value.phone-value {
                font-size: 14px !important;
                font-weight: bold !important;
              }
              .info-item .value[style*="font-size: 16px"] {
                font-size: 14px !important;
                font-weight: bold !important;
              }
              .section h3 {
                font-size: 14px;
                border-bottom: 1px solid #000 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${(companyInfo as any)?.data?.logoUrl || '/uploads/Logo_1753245273579.jpeg'}" alt="شرکت ممتاز شیمی" style="max-width: 120px; max-height: 80px; margin-bottom: 15px;" onerror="this.style.display='none'">
            <h1>جزئیات سفارش لجستیک</h1>
            <h2>سفارش ${selectedOrder.orderNumber}</h2>
            <p>تاریخ چاپ: ${new Date().toLocaleDateString('en-US')}</p>
          </div>

          <div class="section">
            <h3>🧑‍💼 اطلاعات مشتری</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">نام و نام خانوادگی:</span>
                <span class="value">${(selectedOrder.customer?.firstName || selectedOrder.customerFirstName)} ${(selectedOrder.customer?.lastName || selectedOrder.customerLastName)}</span>
              </div>
              <div class="info-item">
                <span class="label">شماره تماس:</span>
                <span class="value" style="font-size: 20px; font-weight: bold; color: #2563eb;">${selectedOrder.customer?.phone || selectedOrder.customerPhone}</span>
              </div>
              <div class="info-item">
                <span class="label">ایمیل:</span>
                <span class="value">${selectedOrder.customer?.email || selectedOrder.customerEmail || 'ثبت نشده'}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>📍 آدرس تحویل</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">👤 نام گیرنده:</span>
                <span class="value" style="font-size: 16px; font-weight: bold;">${(() => {
                  if (selectedOrder.recipientName) return selectedOrder.recipientName;
                  if (selectedOrder.shippingAddress) {
                    const addr = typeof selectedOrder.shippingAddress === 'string' 
                      ? JSON.parse(selectedOrder.shippingAddress) 
                      : selectedOrder.shippingAddress;
                    return addr?.name || 'ثبت نشده';
                  }
                  return 'ثبت نشده';
                })()}</span>
              </div>
              <div class="info-item">
                <span class="label">📞 تلفن گیرنده:</span>
                <span class="value phone-value">${(() => {
                  if (selectedOrder.recipientPhone) return selectedOrder.recipientPhone;
                  if (selectedOrder.shippingAddress) {
                    const addr = typeof selectedOrder.shippingAddress === 'string' 
                      ? JSON.parse(selectedOrder.shippingAddress) 
                      : selectedOrder.shippingAddress;
                    return addr?.phone || 'ثبت نشده';
                  }
                  return 'ثبت نشده';
                })()}</span>
              </div>
              <div class="info-item address-item" style="grid-column: 1 / -1;">
                <span class="label address-label">🏠 آدرس کامل تحویل</span>
                <span class="value address-value">${(() => {
                  if (selectedOrder.recipientAddress) return selectedOrder.recipientAddress;
                  if (selectedOrder.shippingAddress) {
                    const addr = typeof selectedOrder.shippingAddress === 'string' 
                      ? JSON.parse(selectedOrder.shippingAddress) 
                      : selectedOrder.shippingAddress;
                    return addr?.address || 'ثبت نشده';
                  }
                  return 'ثبت نشده';
                })()}</span>
              </div>
              <div class="info-item">
                <span class="label">شهر:</span>
                <span class="value">${(() => {
                  if (selectedOrder.shippingAddress) {
                    const addr = typeof selectedOrder.shippingAddress === 'string' 
                      ? JSON.parse(selectedOrder.shippingAddress) 
                      : selectedOrder.shippingAddress;
                    return addr?.city || 'ثبت نشده';
                  }
                  return 'ثبت نشده';
                })()}</span>
              </div>
              <div class="info-item">
                <span class="label">کد پستی:</span>
                <span class="value">${(() => {
                  if (selectedOrder.shippingAddress) {
                    const addr = typeof selectedOrder.shippingAddress === 'string' 
                      ? JSON.parse(selectedOrder.shippingAddress) 
                      : selectedOrder.shippingAddress;
                    return addr?.postalCode || 'ثبت نشده';
                  }
                  return 'ثبت نشده';
                })()}</span>
              </div>
            </div>
          </div>

          ${(selectedOrder as any).financialReviewedAt || (selectedOrder as any).financialNotes ? `
          <div class="section">
            <h3>💰 اطلاعات مالی</h3>
            <div class="info-grid">
              ${(selectedOrder as any).financialReviewedAt ? `
              <div class="info-item">
                <span class="label">تاریخ بررسی مالی:</span>
                <span class="value">${new Date((selectedOrder as any).financialReviewedAt).toLocaleDateString('en-GB')}</span>
              </div>` : ''}
              ${(selectedOrder as any).financialNotes ? `
              <div class="info-item" style="grid-column: 1 / -1;">
                <span class="label">یادداشت‌های مالی:</span>
                <span class="value">${(selectedOrder as any).financialNotes}</span>
              </div>` : ''}
            </div>
          </div>` : ''}

          <div class="section">
            <h3>📦 جزئیات سفارش</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">وزن محموله:</span>
                <span class="value">${selectedOrder.calculatedWeight || selectedOrder.totalWeight} کیلوگرم</span>
              </div>
              <div class="info-item">
                <span class="label">روش تحویل:</span>
                <span class="value">${selectedOrder.vehicleType || (selectedOrder as any).selectedVehicleName || 
                  (selectedOrder.deliveryMethod === 'smart_vehicle' ? '🚚 ارسال هوشمند' :
                   selectedOrder.deliveryMethod === 'self_pickup' ? '🏢 تحویل حضوری' :
                   selectedOrder.deliveryMethod === 'freight_collect' ? '💰 پس کرایه' :
                   selectedOrder.deliveryMethod === 'postal' ? '📮 ارسال پستی' :
                   selectedOrder.deliveryMethod === 'courier' ? 'پیک موتوری' :
                   selectedOrder.deliveryMethod || '⚠️ نامشخص')}</span>
              </div>
            </div>
          </div>

          ${selectedOrder.deliveryNotes ? `
          <div class="section">
            <h3>📝 یادداشت‌های تحویل</h3>
            <p>${selectedOrder.deliveryNotes}</p>
          </div>
          ` : ''}
        </body>
      </html>
    `;

    // Create a new window for printing to avoid DOM conflicts
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
    }
  };

  // Print function for order details
  const handlePrintOrder = (orderDetails: any) => {
    if (!orderDetails) return;

    const printContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>Print</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
          margin: 0;
          padding: 20mm 20mm 15mm 20mm; /* حاشیه‌های یکسان */
          direction: rtl; 
          font-size: 14px;
          line-height: 1.6;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #2563eb; 
          padding-bottom: 10px; 
          margin-bottom: 20px; 
        }
        .company-name { 
          font-size: 24px; 
          font-weight: bold; 
          color: #2563eb; 
          margin-bottom: 5px;
        }
        .section { 
          margin-bottom: 15px; 
          border: 1px solid #e5e7eb; 
          border-radius: 8px; 
          padding: 12px;
        }
        .section-title { 
          font-weight: bold; 
          font-size: 16px; 
          color: #374151; 
          margin-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 4px;
        }
        .info-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 10px; 
        }
        .info-item { 
          display: flex; 
          justify-content: space-between; 
          padding: 4px 0;
        }
        .label { 
          font-weight: 600; 
          color: #6b7280; 
        }
        .value { 
          color: #374151; 
        }
        .items-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 10px;
        }
        .items-table th, .items-table td { 
          border: 1px solid #d1d5db; 
          padding: 8px; 
          text-align: right; 
        }
        .items-table th { 
          background-color: #f3f4f6; 
          font-weight: bold; 
        }
        .total-row { 
          background-color: #fef3c7; 
          font-weight: bold; 
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }
        .status-confirmed { background-color: #dcfce7; color: #166534; }
        .status-pending { background-color: #fef3c7; color: #92400e; }
        .status-rejected { background-color: #fecaca; color: #dc2626; }
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { 
            margin: 20mm 20mm 15mm 20mm; /* top right bottom left */
            size: A4;
          }
          title { display: none !important; }
          
          /* Hide browser headers and footers */
          html::before, html::after,
          body::before, body::after {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${(companyInfo as any)?.data?.logoUrl || '/uploads/Logo_1753245273579.jpeg'}" alt="شرکت ممتاز شیمی" style="max-width: 120px; max-height: 80px; margin-bottom: 15px;" onerror="this.style.display='none'">
        <div class="company-name">ممتاز شیمی</div>
        <div>جزئیات سفارش</div>
        <div style="font-size: 12px; color: #6b7280;">تاریخ چاپ: ${new Date().toLocaleDateString('en-GB')}</div>
      </div>

      <div class="section">
        <div class="section-title">اطلاعات سفارش</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">شماره سفارش:</span>
            <span class="value">${orderDetails.orderNumber}</span>
          </div>
          <div class="info-item">
            <span class="label">تاریخ ثبت:</span>
            <span class="value">${orderDetails.createdAt ? new Date(orderDetails.createdAt).toLocaleDateString('en-GB') : 'نامشخص'}</span>
          </div>
          <div class="info-item">
            <span class="label">وضعیت:</span>
            <span class="value status-badge ${orderDetails.status === 'warehouse_approved' ? 'status-confirmed' : 
                                              orderDetails.status === 'pending' ? 'status-pending' : 'status-rejected'}">
              ${orderDetails.status === 'warehouse_approved' ? 'تایید انبار' : 
                orderDetails.status === 'logistics_dispatched' ? 'ارسال شده' : 
                orderDetails.status || 'نامشخص'}
            </span>
          </div>
          <div class="info-item">
            <span class="label">روش پرداخت:</span>
            <span class="value">${(() => {
              const method = orderDetails.paymentMethod;
              console.log('🔍 [PAYMENT DEBUG] Payment method value:', method, 'Type:', typeof method);
              
              if (!method || method === null || method === undefined) {
                console.warn('⚠️ [PAYMENT METHOD] Missing payment method in order details:', orderDetails);
                return 'داده نامعلوم - خطا در سیستم';
              }
              
              switch (method.toLowerCase()) {
                case 'wallet_full': return 'کیف پول کامل';
                case 'wallet_partial': return 'پرداخت ترکیبی';
                case 'bank_transfer': return 'واریز بانکی';
                case 'bank_transfer_grace': return 'واریز بانکی (مهلت‌دار)';
                case 'online_payment': return 'درگاه آنلاین';
                case 'digital_wallet': return 'کیف پول دیجیتال';
                case 'iraqi_bank_gateway': return 'درگاه بانکی عراقی';
                case 'hybrid': return 'ترکیبی';
                case 'cash': return 'نقدی';
                case 'credit': return 'اعتباری';
                default: return method + ' (سایر)';
              }
            })()}</span>
          </div>

          <div class="info-item">
            <span class="label">وزن کل:</span>
            <span class="value">${orderDetails.calculatedWeight || orderDetails.totalWeight || 'محاسبه نشده'} کیلوگرم</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">اطلاعات مشتری</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">نام:</span>
            <span class="value">${orderDetails.customerFirstName || ''} ${orderDetails.customerLastName || ''}</span>
          </div>
          <div class="info-item">
            <span class="label">ایمیل:</span>
            <span class="value">${orderDetails.customerEmail || 'نامشخص'}</span>
          </div>
          <div class="info-item">
            <span class="label">تلفن:</span>
            <span class="value">${orderDetails.customerPhone || 'نامشخص'}</span>
          </div>
        </div>
      </div>

      ${orderDetails.shippingAddress ? `
      <div class="section">
        <div class="section-title">آدرس تحویل</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">نام گیرنده (برای پست):</span>
            <span class="value" style="font-size: 16px; font-weight: bold; color: #000;">${orderDetails.shippingAddress.name || 'نامشخص'}</span>
          </div>
          <div class="info-item">
            <span class="label">تلفن گیرنده:</span>
            <span class="value" style="font-size: 16px; font-weight: bold; color: #000;">${orderDetails.shippingAddress.phone || 'نامشخص'}</span>
          </div>
          <div class="info-item" style="grid-column: 1 / -1;">
            <span class="label">آدرس گیرنده (برای پست):</span>
            <span class="value" style="font-size: 18px; font-weight: bold; color: #000; line-height: 1.4;">${orderDetails.shippingAddress.address || 'نامشخص'}</span>
          </div>
          <div class="info-item">
            <span class="label">شهر:</span>
            <span class="value">${orderDetails.shippingAddress.city || 'نامشخص'}</span>
          </div>
          <div class="info-item">
            <span class="label">کد پستی:</span>
            <span class="value">${orderDetails.shippingAddress.postalCode || 'نامشخص'}</span>
          </div>
        </div>
      </div>` : ''}

      ${orderDetails.financialReviewedAt || orderDetails.financialNotes ? `
      <div class="section">
        <div class="section-title">اطلاعات مالی</div>
        <div class="info-grid">
          ${orderDetails.financialReviewedAt ? `
          <div class="info-item">
            <span class="label">تاریخ بررسی مالی:</span>
            <span class="value">${new Date(orderDetails.financialReviewedAt).toLocaleDateString('en-GB')}</span>
          </div>` : ''}
          ${orderDetails.financialNotes ? `
          <div class="info-item" style="grid-column: 1 / -1;">
            <span class="label">یادداشت‌های مالی:</span>
            <span class="value">${orderDetails.financialNotes}</span>
          </div>` : ''}
        </div>
      </div>` : ''}

      ${orderDetails.deliveryNotes || orderDetails.logisticsNotes ? `
      <div class="section">
        <div class="section-title">یادداشت تحویل</div>
        <div class="value">${orderDetails.deliveryNotes || orderDetails.logisticsNotes}</div>
      </div>` : ''}

      <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280;">
        این سند توسط سیستم مدیریت ممتاز شیمی تولید شده است
      </div>
    </body>
    </html>
    `;

    // Create a new window for printing to avoid DOM conflicts
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
    }
  };

  // Handle delivery completion - open two-step confirmation
  const handleDeliveredStart = (orderManagementId: number) => {
    setConfirmingDeliveryOrderId(orderManagementId);
    setDeliveryConfirmStep(1);
    setDeliveryConfirmDialogOpen(true);
  };

  const handleDeliveryConfirmStep1 = () => {
    setDeliveryConfirmStep(2);
  };

  const handleDeliveryConfirmStep2 = async () => {
    if (!confirmingDeliveryOrderId) return;
    
    console.log('🚚 [DELIVERY] Starting delivery completion for order:', confirmingDeliveryOrderId);
    
    try {
      const response = await fetch('/api/order-management/update-order-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          orderManagementId: confirmingDeliveryOrderId,
          newStatus: 'delivered',
          notes: 'سفارش با موفقیت تحویل داده شد'
        })
      });

      console.log('🚚 [DELIVERY] Response status:', response.status);
      const result = await response.json();
      console.log('🚚 [DELIVERY] API response:', result);
      
      if (result.success) {
        // Refresh both logistics and delivered orders lists
        queryClient.invalidateQueries({ queryKey: ['/api/order-management/logistics'] });
        queryClient.invalidateQueries({ queryKey: ['/api/order-management/delivered'] });
        console.log('🚚 [DELIVERY] Cache invalidated for both tabs');
        toast({
          title: "موفقیت",
          description: "سفارش با موفقیت به عنوان تحویل شده ثبت گردید",
        });
        // Close dialog and reset state
        setDeliveryConfirmDialogOpen(false);
        setConfirmingDeliveryOrderId(null);
        setDeliveryConfirmStep(1);
      } else {
        console.error('🚚 [DELIVERY] API returned error:', result.message);
        throw new Error(result.message || 'خطا در ثبت تحویل');
      }
    } catch (error) {
      console.error('🚚 [DELIVERY] Error marking order as delivered:', error);
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در ثبت تحویل سفارش",
        variant: "destructive"
      });
    }
  };

  const handleDeliveryConfirmCancel = () => {
    setDeliveryConfirmDialogOpen(false);
    setConfirmingDeliveryOrderId(null);
    setDeliveryConfirmStep(1);
  };

  const getConfirmingDeliveryOrder = () => {
    const allOrders = (logisticsOrdersResponse as any)?.orders || [];
    return allOrders.find((order: any) => order.id === confirmingDeliveryOrderId);
  };

  // Send or resend delivery code SMS using template #3
  const handleSendDeliveryCode = async (orderManagementId: number, hasExistingCode: boolean) => {
    setResendingCodes(prev => ({ ...prev, [orderManagementId]: true }));
    
    try {
      const response = await fetch(`/api/order-management/send-delivery-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderManagementId,
          action: hasExistingCode ? 'resend' : 'send'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setResentCodes(prev => ({ ...prev, [orderManagementId]: true }));
        toast({
          title: '✅ کد تحویل ارسال شد',
          description: `کد تحویل ${result.deliveryCode} با استفاده از قالب شماره 3 ارسال شد`,
        });
        
        // Reset success state after 3 seconds
        setTimeout(() => {
          setResentCodes(prev => ({ ...prev, [orderManagementId]: false }));
        }, 3000);
        
        // Refresh orders to show updated delivery code
        queryClient.invalidateQueries({ queryKey: ['/api/order-management/logistics'] });
      } else {
        toast({
          title: '❌ خطا در ارسال کد',
          description: result.message || 'خطا در ارسال پیامک کد تحویل',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Error sending delivery code:', error);
      toast({
        title: '❌ خطا در ارسال',
        description: 'خطا در اتصال به سرور برای ارسال کد تحویل',
        variant: 'destructive',
      });
    } finally {
      setResendingCodes(prev => ({ ...prev, [orderManagementId]: false }));
    }
  };



  const OrdersTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">مدیریت سفارشات لجستیک</h3>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {mappedLogisticsOrders.length} سفارش در لجستیک
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={forceRefreshLogisticsOrders}
              className="flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              <RefreshCw className="w-4 h-4" />
              به‌روزرسانی قوی
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h4 className="text-md font-semibold text-green-800">سفارشات تایید شده انبار (در لجستیک)</h4>
          </div>
          
          {loadingLogisticsOrders ? (
            <div className="text-center py-8">در حال بارگذاری سفارشات لجستیک...</div>
          ) : mappedLogisticsOrders.length === 0 ? (
            <Card className="border-green-200">
              <CardContent className="text-center py-8">
                <Package className="w-12 h-12 mx-auto mb-4 text-green-400" />
                <p className="text-green-600">هیچ سفارش تایید شده‌ای از انبار موجود نیست</p>
              </CardContent>
            </Card>
          ) : (
            mappedLogisticsOrders.map((order: LogisticsOrder) => (
              <Card key={order.id} className="border-r-4 border-r-green-500 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-green-800 text-lg">سفارش {order.orderNumber}</h4>
                    <Badge variant="default" className="bg-green-600 text-white">
                      تایید شده انبار
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
                    {/* Customer Info Block - Clickable */}
                    <div 
                      className="bg-white rounded-lg p-3 border border-green-200 cursor-pointer hover:bg-green-50 hover:border-green-300 transition-all duration-200"
                      onClick={() => handleShowOrderDetails(order)}
                    >
                      <h5 className="font-medium text-green-800 mb-2 flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        اطلاعات گیرنده
                        <span className="text-xs text-green-600 mr-auto">(کلیک کنید)</span>
                      </h5>
                      <div className="space-y-2">
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-xs text-gray-500 mb-1">نام مشتری</p>
                          <p className="text-sm font-medium text-gray-800">
                            {order.customer?.firstName || order.customerFirstName} {order.customer?.lastName || order.customerLastName}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded p-2 flex items-center">
                          <Phone className="w-3 h-3 mr-2 text-gray-500" />
                          <span className="text-sm text-gray-700">{order.customer?.phone || order.customerPhone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Method Block */}
                    <div className="bg-teal-50 rounded-lg p-3 border border-teal-200">
                      <h5 className="font-medium text-teal-800 mb-2 flex items-center">
                        <CreditCard className="w-4 h-4 mr-2" />
                        نوع تسویه حساب
                      </h5>
                      <PaymentMethodBadge 
                        paymentMethod={order.paymentMethod}
                        showIcon={true}
                      />
                    </div>

                    {/* Delivery Method Block - Customer Selected */}
                    <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                      <h5 className="font-medium text-indigo-800 mb-2 flex items-center">
                        <Truck className="w-4 h-4 mr-2" />
                        روش ارسال انتخابی
                      </h5>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-indigo-700">
                          {order.customerVehicleType || order.vehicleType || order.selectedVehicleName || 
                           (order.deliveryMethod === 'courier' ? 'پیک موتوری' :
                           order.deliveryMethod === 'truck' ? 'کامیون' :
                           order.deliveryMethod === 'post' ? 'پست' :
                           order.deliveryMethod === 'postal' ? '📮 ارسال پستی' :
                           order.deliveryMethod === 'personal_pickup' ? 'تحویل حضوری' :
                           order.deliveryMethod === 'self_pickup' ? '🏢 تحویل حضوری' :
                           order.deliveryMethod === 'freight_collect' ? '💰 پس کرایه' :
                           order.deliveryMethod === 'van' ? 'وانت' :
                           order.deliveryMethod === 'smart_vehicle' ? '🚚 ارسال هوشمند' :
                           order.deliveryMethod || '⚠️ نامشخص')}
                        </p>
                        {/* Show selected vehicle type for smart_vehicle - prioritize customerVehicleType */}
                        {order.deliveryMethod === 'smart_vehicle' && (order.customerVehicleType || order.vehicleType) && (
                          <p className="text-xs text-indigo-600 mt-1">
                            🚗 خودرو انتخابی: {order.customerVehicleType || order.vehicleType}
                          </p>
                        )}
                        {order.transportationType && (
                          <p className="text-xs text-indigo-600">
                            نوع: {order.transportationType === 'motorcycle' ? 'موتور' :
                                  order.transportationType === 'car' ? 'خودرو' :
                                  order.transportationType === 'truck' ? 'کامیون' :
                                  order.transportationType === 'van' ? 'وانت' :
                                  order.transportationType}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Total Weight Block */}
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <h5 className="font-medium text-blue-800 mb-2 flex items-center">
                        <Package className="w-4 h-4 mr-2" />
                        وزن محموله
                      </h5>
                      <p className="text-lg font-bold text-blue-700 flex items-center">
                        <Package className="w-4 h-4 mr-1" />
                        {order.calculatedWeight || order.totalWeight ? `${order.calculatedWeight || order.totalWeight} کیلوگرم` : 'محاسبه نشده'}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">مجموع وزن ناخالص کالاها</p>
                    </div>

                    {/* Delivery Code Block */}
                    <div className={`rounded-lg p-3 border ${
                      order.deliveryCode
                        ? 'bg-purple-50 border-purple-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <h5 className={`font-medium mb-2 flex items-center ${
                        order.deliveryCode
                          ? 'text-purple-800' 
                          : 'text-gray-600'
                      }`}>
                        <Shield className="w-4 h-4 mr-2" />
                        کد تحویل
                      </h5>
                      <p className={`text-lg font-bold mb-2 ${
                        order.deliveryCode
                          ? 'text-purple-700' 
                          : 'text-gray-500'
                      }`}>
                        {order.deliveryCode || 'کد ندارد'}
                      </p>
                      <p className={`text-xs mb-2 ${
                        order.deliveryCode
                          ? 'text-purple-600' 
                          : 'text-gray-500'
                      }`}>
                        کد 4 رقمی تحویل
                      </p>

                    </div>

                    {/* Delivery Address Block */}
                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                      <h5 className="font-medium text-orange-800 mb-2 flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        آدرس تحویل
                      </h5>
                      <div className="space-y-1">
                        {(() => {
                          // Check if shipping address is already an object (parsed by API)
                          const shippingData = typeof order.shippingAddress === 'object' && order.shippingAddress !== null
                            ? order.shippingAddress as any
                            : null;
                            
                          if (shippingData) {
                            return (
                              <>
                                {shippingData.name && (
                                  <p className="text-sm font-medium text-orange-800">
                                    {shippingData.name}
                                  </p>
                                )}
                                {shippingData.phone && (
                                  <p className="text-xs text-orange-600 flex items-center">
                                    <Phone className="w-3 h-3 mr-1" />
                                    {shippingData.phone}
                                  </p>
                                )}
                                <p className="text-sm text-orange-700">
                                  {shippingData.address || 'آدرس مشخص نشده'}
                                </p>
                                {(shippingData.city || shippingData.country) && (
                                  <p className="text-xs text-orange-600">
                                    {[shippingData.city, shippingData.country].filter(Boolean).join(' - ')}
                                    {shippingData.postalCode && ` - ${shippingData.postalCode}`}
                                  </p>
                                )}
                              </>
                            );
                          }
                          
                          // Fallback to recipient address or customer address
                          return (
                            <p className="text-sm text-orange-700">
                              {order.recipientAddress || order.customerAddress || 'آدرس ثبت نشده'}
                            </p>
                          );
                        })()}
                      </div>
                      <p className="text-xs text-orange-600 mt-2 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        آدرس دریافت کالا
                      </p>
                    </div>



                    {/* Order Date Block */}
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <h5 className="font-medium text-green-800 mb-2 flex items-center">
                        <Package className="w-4 h-4 mr-2" />
                        تاریخ سفارش
                      </h5>
                      <p className="text-sm font-medium text-green-700">
                        {formatDateSafe(order.createdAt)}
                      </p>
                      <p className="text-xs text-green-600 mt-1">تاریخ ثبت سفارش</p>
                    </div>

                    {/* Delivery Date Block */}
                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                      <h5 className="font-medium text-yellow-800 mb-2 flex items-center">
                        <Truck className="w-4 h-4 mr-2" />
                        تاریخ تحویل
                      </h5>
                      <p className="text-sm font-medium text-yellow-700">
                        {order.actualDeliveryDate ? formatDateSafe(order.actualDeliveryDate) : 'در انتظار تحویل'}
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">تاریخ تحویل سفارش</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap items-center">
                      <Button 
                        size="sm" 
                        onClick={() => handleSendDeliveryCode(order.id, !!order.deliveryCode)}
                        disabled={resendingCodes[order.id]}
                        className={`${
                          resentCodes[order.id] 
                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {resendingCodes[order.id] ? (
                          <>
                            <Send className="w-4 h-4 mr-2 animate-spin" />
                            در حال ارسال...
                          </>
                        ) : resentCodes[order.id] ? (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            کد ارسال شد ✓
                          </>
                        ) : order.deliveryCode ? (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            ارسال مجدد کد
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            ارسال کد به مشتری
                          </>
                        )}
                      </Button>

                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-orange-500 text-orange-700 hover:bg-orange-100"
                        onClick={() => handleVehicleAssignment(order)}
                      >
                        <Truck className="w-4 h-4 mr-2" />
                        اختصاص وسیله ارسال محموله
                      </Button>
                      <Button size="sm" variant="outline" className="border-green-500 text-green-700 hover:bg-green-100">
                        <MapPin className="w-4 h-4 mr-2" />
                        پیگیری مسیر
                      </Button>
                      <Button 
                        size="sm" 
                        className={confirmingDeliveryOrderId === order.id 
                          ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse ring-2 ring-amber-300" 
                          : "bg-green-600 hover:bg-green-700 text-white"}
                        onClick={() => handleDeliveredStart(order.id)}
                        data-testid={`button-delivery-confirm-${order.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {confirmingDeliveryOrderId === order.id ? "در حال تایید..." : "تحویل شد"}
                      </Button>
                      {order.hasGpsLocation && (
                        <div className="border border-gray-300 rounded-lg p-1.5 bg-gray-50 h-fit">
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-blue-500 text-blue-700 hover:bg-blue-100 px-2 py-1 text-xs h-8"
                              onClick={async () => {
                                const lat = parseFloat(order.gpsLatitude?.toString() || '0').toFixed(6);
                                const lng = parseFloat(order.gpsLongitude?.toString() || '0').toFixed(6);
                                const gpsText = `GPS موقعیت: ${lat}, ${lng}`;
                                const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                                const fullText = `${gpsText}\nGoogle Maps: ${mapsUrl}`;
                                
                                try {
                                  await navigator.clipboard.writeText(fullText);
                                  alert('📋 مختصات GPS کپی شد!');
                                } catch (err) {
                                  console.error('Copy failed:', err);
                                  alert('خطا در کپی کردن');
                                }
                              }}
                              title="کپی مختصات GPS"
                            >
                              📋 کپی
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-green-500 text-green-700 hover:bg-green-100 px-2 py-1 text-xs h-8"
                              onClick={async () => {
                                const lat = parseFloat(order.gpsLatitude?.toString() || '0').toFixed(6);
                                const lng = parseFloat(order.gpsLongitude?.toString() || '0').toFixed(6);
                                const gpsText = `GPS موقعیت سفارش ${order.orderNumber}: ${lat}, ${lng}`;
                                const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                                
                                if (navigator.share) {
                                  try {
                                    await navigator.share({
                                      title: `موقعیت GPS سفارش ${order.orderNumber}`,
                                      text: gpsText,
                                      url: mapsUrl
                                    });
                                  } catch (err) {
                                    // If share fails, copy to clipboard as fallback
                                    try {
                                      await navigator.clipboard.writeText(`${gpsText}\n${mapsUrl}`);
                                      alert('📋 مختصات GPS کپی شد!');
                                    } catch (copyErr) {
                                      window.open(mapsUrl, '_blank');
                                    }
                                  }
                                } else {
                                  // Fallback: copy to clipboard
                                  try {
                                    await navigator.clipboard.writeText(`${gpsText}\n${mapsUrl}`);
                                    alert('📋 مختصات GPS کپی شد!');
                                  } catch (err) {
                                    window.open(mapsUrl, '_blank');
                                  }
                                }
                              }}
                              title="اشتراک گذاری موقعیت GPS"
                            >
                              📤 اشتراک
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-red-500 text-red-700 hover:bg-red-100 px-2 py-1 text-xs h-8"
                              onClick={() => {
                                const lat = parseFloat(order.gpsLatitude?.toString() || '0');
                                const lng = parseFloat(order.gpsLongitude?.toString() || '0');
                                const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                                window.open(mapsUrl, '_blank');
                              }}
                              title="باز کردن در Google Maps"
                            >
                              🗺️ نقشه
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  // Delivered Orders Tab Component
  const DeliveredOrdersTab = () => {
    const deliveredOrders = (deliveredOrdersResponse as any)?.orders || [];
    
    // Map data for compatibility
    const mappedDeliveredOrders = deliveredOrders.map((order: any) => ({
      ...order,
      customer: order.customer || {
        firstName: order.customerFirstName,
        lastName: order.customerLastName,
        email: order.customerEmail,
        phone: order.customerPhone
      },
      customerAddress: order.customerAddress || 'آدرس ثبت نشده',
      hasGpsLocation: !!(order.gpsLatitude && order.gpsLongitude)
    }));

    if (loadingDeliveredOrders) {
      return (
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>در حال بارگیری سفارشات تحویل شده...</span>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-green-700 flex items-center">
              <CheckCircle className="w-6 h-6 mr-2" />
              سفارشات تحویل شده
            </h2>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {mappedDeliveredOrders.length} سفارش
            </Badge>
          </div>
          
          <Button 
            onClick={() => refetchDeliveredOrders()}
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            بروزرسانی
          </Button>
        </div>

        {mappedDeliveredOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="w-16 h-16 text-green-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">هیچ سفارش تحویل شده‌ای وجود ندارد</h3>
              <p className="text-gray-500 text-center">
                پس از تحویل سفارشات، آن‌ها در این بخش نمایش داده می‌شوند
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {mappedDeliveredOrders.map((order: any) => (
              <Card key={order.id} className="border-green-200 bg-green-50">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          سفارش {order.orderNumber || `#${order.customerOrderId}`}
                        </h3>
                        <p className="text-sm text-gray-600">
                          مشتری: {order.customer?.firstName} {order.customer?.lastName}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-600 text-white">
                        تحویل شده
                      </Badge>
                      <PaymentMethodBadge paymentMethod={order.paymentMethod} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label className="text-sm text-gray-600">مبلغ کل</Label>
                      <p className="font-medium">
                        {parseInt(order.totalAmount || 0).toLocaleString()} {order.currency || 'IQD'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">تاریخ تحویل</Label>
                      <p className="font-medium">
                        {order.actualDeliveryDate ? formatDateSafe(order.actualDeliveryDate, 'en-GB') : 'نامشخص'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">کد تحویل</Label>
                      <p className="font-medium text-blue-600">
                        {order.deliveryCode || 'ندارد'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">وزن محموله</Label>
                      <p className="font-medium">
                        {order.calculatedWeight || order.totalWeight || 0} کیلوگرم
                      </p>
                    </div>
                  </div>

                  {order.trackingNumber && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">کد رهگیری:</span>
                        <span className="text-blue-700">{order.trackingNumber}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      تحویل‌دهنده: {order.deliveryPersonName || 'نامشخص'} 
                      {order.deliveryPersonPhone && ` - ${order.deliveryPersonPhone}`}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsOrderDetailsOpen(true);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        جزئیات
                      </Button>
                      
                      {order.hasGpsLocation && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const lat = parseFloat(order.gpsLatitude?.toString() || '0');
                            const lng = parseFloat(order.gpsLongitude?.toString() || '0');
                            const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                            window.open(mapsUrl, '_blank');
                          }}
                          className="flex items-center gap-2 text-green-600 border-green-300 hover:bg-green-50"
                        >
                          <MapPin className="w-4 h-4" />
                          موقعیت
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const CompaniesTab = () => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [companyFormData, setCompanyFormData] = useState({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      website: '',
      contractEndDate: '',
      maxWeight: '',
      baseRate: '',
      ratePerKm: ''
    });

    const addCompanyMutation = useMutation({
      mutationFn: async (data: any) => {
        const response = await fetch('/api/logistics/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create company');
        return response.json();
      },
      onSuccess: () => {
        setShowAddForm(false);
        setCompanyFormData({
          name: '',
          contactPerson: '',
          phone: '',
          email: '',
          address: '',
          website: '',
          contractEndDate: '',
          maxWeight: '',
          baseRate: '',
          ratePerKm: ''
        });
        queryClient.invalidateQueries({ queryKey: ['/api/logistics/companies'] });
        toast({ title: "موفق", description: "شرکت حمل و نقل جدید ثبت شد" });
      }
    });

    const handleSubmitCompany = (e: React.FormEvent) => {
      e.preventDefault();
      if (!companyFormData.name || !companyFormData.phone) {
        toast({ 
          title: "خطا", 
          description: "لطفاً نام شرکت و شماره تماس را وارد کنید",
          variant: "destructive"
        });
        return;
      }
      addCompanyMutation.mutate(companyFormData);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">شرکت‌های حمل و نقل</h3>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            شرکت جدید
          </Button>
        </div>

        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>ثبت شرکت حمل و نقل جدید</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitCompany} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">نام شرکت *</Label>
                    <Input
                      id="name"
                      value={companyFormData.name}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="نام شرکت حمل و نقل"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPerson">نام مسئول</Label>
                    <Input
                      id="contactPerson"
                      value={companyFormData.contactPerson}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                      placeholder="نام شخص رابط"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">شماره تماس *</Label>
                    <Input
                      id="phone"
                      value={companyFormData.phone}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="شماره تماس شرکت"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">ایمیل</Label>
                    <Input
                      id="email"
                      type="email"
                      value={companyFormData.email}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="آدرس ایمیل"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">آدرس</Label>
                  <Input
                    id="address"
                    value={companyFormData.address}
                    onChange={(e) => setCompanyFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="آدرس کامل شرکت"
                  />
                </div>

                <div>
                  <Label htmlFor="website">وب‌سایت</Label>
                  <Input
                    id="website"
                    type="url"
                    value={companyFormData.website}
                    onChange={(e) => setCompanyFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://www.example.com"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={addCompanyMutation.isPending}>
                    {addCompanyMutation.isPending ? 'در حال ثبت...' : 'ثبت شرکت'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                    لغو
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {loadingCompanies ? (
            <div className="text-center py-8">در حال بارگذاری...</div>
          ) : companies.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Truck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">هیچ شرکت حمل و نقل ثبت نشده است</p>
              </CardContent>
            </Card>
          ) : (
            companies.map((company: TransportationCompany) => (
              <Card key={company.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{company.name}</h4>
                      <p className="text-sm text-gray-600">{company.contactPerson}</p>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="text-sm">📞 {company.phone}</span>
                        <span className="text-sm">✉️ {company.email}</span>
                        {company.website && (
                          <a 
                            href={company.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            🌐 {company.website}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm">⭐ {company.rating || 0}/5</span>
                        <span className="text-sm">({company.totalDeliveries} تحویل)</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {company.isActive ? (
                        <Badge className="bg-green-500">فعال</Badge>
                      ) : (
                        <Badge className="bg-red-500">غیرفعال</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      ویرایش
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      جزئیات
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  // Calculate shipping cost mutation
  const calculateShippingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/logistics/calculate-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to calculate shipping');
      return response.json();
    },
    onSuccess: (data) => {
      setShippingCalculation(data);
      toast({ title: "محاسبه هزینه حمل با موفقیت انجام شد" });
    },
    onError: (error: any) => {
      toast({ 
        title: "خطا در محاسبه هزینه حمل", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Cities and Provinces Tab
  const CitiesTab = () => {
    const provinces = (provincesResponse as any)?.provinces || [];
    const cities = (citiesResponse as any)?.cities || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Provinces */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                استان‌های عراق ({provinces.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loadingProvinces ? (
                  <div className="text-center py-4">در حال بارگذاری...</div>
                ) : provinces.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">هیچ استانی یافت نشد</p>
                ) : (
                  provinces.map((province: any) => (
                    <div key={province.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{province.name_ar}</span>
                        <span className="text-sm text-gray-600 block">{province.name_en}</span>
                      </div>
                      <Badge variant="outline">{province.cities_count || 0} شهر</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                شهرهای عراق ({cities.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loadingCities ? (
                  <div className="text-center py-4">در حال بارگذاری...</div>
                ) : cities.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">هیچ شهری یافت نشد</p>
                ) : (
                  cities.map((city: any) => (
                    <div key={city.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{city.name_ar}</span>
                        <span className="text-sm text-gray-600 block">{city.name_en}</span>
                      </div>
                      <span className="text-sm text-gray-500">{city.province_name}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shipping Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              محاسبه هزینه حمل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor="city">شهر مقصد</Label>
                <select 
                  id="city"
                  className="w-full p-2 border rounded"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                >
                  <option value="">انتخاب شهر</option>
                  {cities.map((city: any) => (
                    <option key={city.id} value={city.name_ar}>
                      {city.name_ar} ({city.province_name})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="weight">وزن (کیلوگرم)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={shippingWeight}
                  onChange={(e) => setShippingWeight(Number(e.target.value))}
                  min="0.1"
                  step="0.1"
                />
              </div>
              
              <div>
                <Label htmlFor="orderValue">ارزش سفارش (دینار)</Label>
                <Input
                  id="orderValue"
                  type="number"
                  value={orderValue}
                  onChange={(e) => setOrderValue(Number(e.target.value))}
                  min="0"
                />
              </div>
              
              <div className="flex items-end">
                <Button 
                  onClick={() => {
                    if (!selectedCity || !shippingWeight) {
                      toast({ 
                        title: "خطا", 
                        description: "لطفاً شهر و وزن را انتخاب کنید",
                        variant: "destructive" 
                      });
                      return;
                    }
                    calculateShippingMutation.mutate({
                      cityName: selectedCity,
                      weight: shippingWeight,
                      orderValue: orderValue
                    });
                  }}
                  disabled={calculateShippingMutation.isPending}
                  className="w-full"
                >
                  {calculateShippingMutation.isPending ? 'در حال محاسبه...' : 'محاسبه هزینه'}
                </Button>
              </div>
            </div>

            {/* Shipping Calculation Results */}
            {shippingCalculation && (
              <div className="mt-6 space-y-4">
                <h4 className="font-semibold">نتایج محاسبه هزینه حمل برای {shippingCalculation.city}</h4>
                <div className="grid gap-4">
                  {shippingCalculation.calculations.map((calc: any, index: number) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-500">{calc.delivery_method}</Badge>
                              {calc.transportation_type && (
                                <Badge variant="outline">{calc.transportation_type}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{calc.description}</p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <span>هزینه پایه: {Number(calc.base_price).toLocaleString()} دینار</span>
                              <span>هزینه وزن: {calc.weight_cost.toLocaleString()} دینار</span>
                              <span>زمان تحویل: {calc.estimated_days} روز</span>
                              <span>بیمه: {calc.insurance_available ? 'موجود' : 'غیر موجود'}</span>
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="text-lg font-bold text-green-600">
                              {calc.is_free_shipping ? 'ارسال رایگان' : `${calc.final_total.toLocaleString()} دینار`}
                            </div>
                            {calc.insurance_cost > 0 && (
                              <div className="text-sm text-gray-600">
                                بیمه: {calc.insurance_cost.toLocaleString()} دینار
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };



  // New Geography Tab for provinces and cities management with editing capabilities
  const GeographyTab = () => {
    const [editingProvince, setEditingProvince] = useState<any>(null);
    const [editingCity, setEditingCity] = useState<any>(null);
    const [isEditProvinceDialogOpen, setIsEditProvinceDialogOpen] = useState(false);
    const [isEditCityDialogOpen, setIsEditCityDialogOpen] = useState(false);
    const [selectedOriginCity, setSelectedOriginCity] = useState<any>(null);
    const [citySortField, setCitySortField] = useState<string | null>(null);
    const [citySortDirection, setCitySortDirection] = useState<'asc' | 'desc'>('asc');

    const geographyProvinces = (geographyProvincesResponse as any)?.data || [];
    const geographyCities = (geographyCitiesResponse as any)?.data || [];

    // Calculate dynamic distances based on selected origin city
    const calculateDistance = (targetCity: any) => {
      if (!selectedOriginCity) return targetCity.distance_from_erbil_km || 0;
      
      const originDistance = selectedOriginCity.distance_from_erbil_km || 0;
      const targetDistance = targetCity.distance_from_erbil_km || 0;
      
      // Calculate relative distance using Erbil as common reference point
      return Math.abs(targetDistance - originDistance);
    };

    // Handle sorting for cities table
    const handleCitySort = (field: string) => {
      if (citySortField === field) {
        setCitySortDirection(citySortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setCitySortField(field);
        setCitySortDirection('asc');
      }
    };

    // Sort cities based on current sort field and direction
    const sortedCities = [...geographyCities].sort((a: any, b: any) => {
      if (!citySortField) return 0;
      
      let aValue, bValue;
      
      switch (citySortField) {
        case 'id':
          aValue = a.id || 0;
          bValue = b.id || 0;
          break;
        case 'name':
          aValue = a.name_arabic || a.name || '';
          bValue = b.name_arabic || b.name || '';
          break;
        case 'province':
          aValue = a.province_name || '';
          bValue = b.province_name || '';
          break;
        case 'distance':
          aValue = calculateDistance(a);
          bValue = calculateDistance(b);
          break;

        default:
          return 0;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue, 'ar');
        return citySortDirection === 'asc' ? result : -result;
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const result = aValue - bValue;
        return citySortDirection === 'asc' ? result : -result;
      }
      
      return 0;
    });

    // Calculate province distance (average of cities in province)
    const calculateProvinceDistance = (province: any) => {
      if (!selectedOriginCity) return 0;
      
      const provinceCities = geographyCities.filter((city: any) => city.province_id === province.id);
      if (provinceCities.length === 0) return 0;
      
      const totalDistance = provinceCities.reduce((sum: number, city: any) => sum + calculateDistance(city), 0);
      return Math.round(totalDistance / provinceCities.length);
    };

    // Update province mutation
    const updateProvinceMutation = useMutation({
      mutationFn: (data: any) => 
        fetch(`/api/logistics/provinces/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(res => res.json()),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/logistics/provinces-detailed'] });
        setIsEditProvinceDialogOpen(false);
        setEditingProvince(null);
        toast({ title: "موفقیت", description: "استان با موفقیت به‌روزرسانی شد" });
      },
      onError: () => {
        toast({ title: "خطا", description: "خطا در به‌روزرسانی استان", variant: "destructive" });
      }
    });

    // Update city mutation
    const updateCityMutation = useMutation({
      mutationFn: (data: any) => 
        fetch(`/api/logistics/cities/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(res => res.json()),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/logistics/cities-detailed'] });
        setIsEditCityDialogOpen(false);
        setEditingCity(null);
        toast({ title: "موفقیت", description: "شهر با موفقیت به‌روزرسانی شد" });
      },
      onError: () => {
        toast({ title: "خطا", description: "خطا در به‌روزرسانی شهر", variant: "destructive" });
      }
    });

    const handleEditProvince = (formData: FormData) => {
      if (!editingProvince) return;
      
      const data = {
        id: editingProvince.id,
        name_arabic: formData.get('name_arabic') as string,
        name_english: formData.get('name_english') as string,
        capital: formData.get('capital') as string,
        region: formData.get('region') as string,
        is_active: formData.get('is_active') === 'on'
      };

      updateProvinceMutation.mutate(data);
    };

    const handleEditCity = (formData: FormData) => {
      if (!editingCity) return;
      
      const data = {
        id: editingCity.id,
        name_arabic: formData.get('name_arabic') as string,
        name_english: formData.get('name_english') as string,
        distance_from_erbil_km: parseInt(formData.get('distance_from_erbil_km') as string),
        is_active: formData.get('is_active') === 'on',
        has_intercity_bus_line: formData.get('has_intercity_bus_line') === 'on'
      };

      updateCityMutation.mutate(data);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              مدیریت جغرافیای عراق
            </h3>
            <p className="text-sm text-gray-600 mt-1">مدیریت 18 استان و 188 شهر عراق با قابلیت انتخاب مبدا</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-blue-50">
              {geographyProvinces.length} استان
            </Badge>
            <Badge variant="outline" className="bg-green-50">
              {geographyCities.length} شهر
            </Badge>
          </div>
        </div>

        {/* Origin City Selection */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-full">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">انتخاب شهر مبدا برای محاسبه فواصل</h4>
                  <p className="text-sm text-blue-700">
                    {selectedOriginCity 
                      ? `مبدا انتخاب شده: ${selectedOriginCity.name_arabic || selectedOriginCity.name}` 
                      : 'مبدا پیش‌فرض: اربیل (تمام فاصله‌ها از اربیل محاسبه می‌شوند)'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedOriginCity?.id || ''}
                  onChange={(e) => {
                    const cityId = parseInt(e.target.value);
                    const city = geographyCities.find((c: any) => c.id === cityId);
                    setSelectedOriginCity(city || null);
                  }}
                  className="p-2 border rounded-md bg-white text-sm min-w-[200px]"
                >
                  <option value="">اربیل (پیش‌فرض)</option>
                  {geographyCities.map((city: any) => (
                    <option key={city.id} value={city.id}>
                      {city.name_arabic || city.name} - {city.province_name}
                    </option>
                  ))}
                </select>
                {selectedOriginCity && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedOriginCity(null)}
                    className="text-blue-600 border-blue-600 hover:bg-blue-100"
                  >
                    بازنشانی
                  </Button>
                )}
              </div>
            </div>
            {selectedOriginCity && (
              <div className="mt-3 p-3 bg-blue-100 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>نکته:</strong> فاصله‌ها بر اساس تفاوت فاصله شهرها از اربیل محاسبه می‌شوند. 
                  شهر انتخابی به عنوان مبدا (0 کیلومتر) نمایش داده می‌شود.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              شهرهای عراق ({geographyCities.length})
            </CardTitle>
            <CardDescription>
              مدیریت 188 شهر عراق با فاصله‌های قابل تنظیم بر اساس مبدا انتخابی
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingGeographyCities ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg" style={{ position: 'relative' }}>
                  <Table className="relative" style={{ position: 'relative' }}>
                    <TableHeader 
                      className="sticky top-0 bg-white z-50 shadow-sm border-b"
                      style={{ 
                        position: 'sticky', 
                        top: 0, 
                        backgroundColor: 'white', 
                        zIndex: 50,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                      <TableRow className="bg-white" style={{ backgroundColor: 'white', position: 'relative', zIndex: 50 }}>
                        <TableHead className="text-right w-20 bg-white sticky top-0 z-50 border-b" style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 50 }}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleCitySort('id')}
                            className="flex items-center justify-end gap-1 p-0 h-auto font-medium text-right w-full"
                          >
                            ردیف
                            <ArrowUpDown className="h-3 w-3" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right w-48 bg-white sticky top-0 z-50 border-b" style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 50 }}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleCitySort('name')}
                            className="flex items-center justify-end gap-1 p-0 h-auto font-medium text-right w-full"
                          >
                            نام شهر
                            <ArrowUpDown className="h-3 w-3" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right w-32 bg-white sticky top-0 z-50 border-b" style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 50 }}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleCitySort('province')}
                            className="flex items-center justify-end gap-1 p-0 h-auto font-medium text-right w-full"
                          >
                            استان
                            <ArrowUpDown className="h-3 w-3" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right w-64 bg-white sticky top-0 z-50 border-b" style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 50 }}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleCitySort('distance')}
                            className="flex items-center justify-end gap-1 p-0 h-auto font-medium text-right w-full"
                          >
                            فاصله از {selectedOriginCity ? (selectedOriginCity.name_arabic || selectedOriginCity.name) : 'اربیل'} (کیلومتر)
                            <ArrowUpDown className="h-3 w-3" />
                          </Button>
                        </TableHead>

                        <TableHead className="text-right w-32 bg-white sticky top-0 z-50 border-b" style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 50 }}>
                          <div className="flex items-center justify-end gap-1">
                            <Bus className="h-4 w-4 text-blue-600" />
                            <span>خط مسافربری</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-right w-24 bg-white sticky top-0 z-50 border-b" style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 50 }}>وضعیت</TableHead>
                        <TableHead className="text-right w-32 bg-white sticky top-0 z-50 border-b" style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 50 }}>عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedCities.map((city: any) => (
                      <TableRow key={city.id}>
                        <TableCell className="font-medium text-right w-20">{city.id}</TableCell>
                        <TableCell className="text-right w-48">
                          <div className="flex flex-col text-right space-y-1">
                            <span className="font-medium text-base">{city.name_arabic || city.name}</span>
                            {city.name_english && city.name_english !== city.name_arabic && (
                              <span className="text-sm text-gray-500 leading-tight">{city.name_english}</span>
                            )}
                            {city.name_kurdish && city.name_kurdish !== city.name_arabic && city.name_kurdish !== city.name_english && (
                              <span className="text-xs text-gray-400 leading-tight">{city.name_kurdish}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right w-32">{city.province_name}</TableCell>
                        <TableCell className="text-right w-64">
                          <div className="flex justify-end items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={selectedOriginCity?.id === city.id ? 
                                "bg-yellow-100 border-yellow-500 text-yellow-700" : 
                                "bg-green-50 border-green-200 text-green-700"
                              }
                            >
                              {selectedOriginCity?.id === city.id ? 
                                'مبدا (0 کیلومتر)' : 
                                `${calculateDistance(city)} کیلومتر`
                              }
                            </Badge>
                            {!selectedOriginCity && (
                              <button
                                onClick={() => {
                                  setEditingCity(city);
                                  setIsEditCityDialogOpen(true);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
                                title="ویرایش سریع فاصله"
                              >
                                📍
                              </button>
                            )}
                          </div>
                          {!selectedOriginCity && (
                            <div className="text-xs text-gray-500 mt-1 text-right">
                              (از اربیل: {city.distance_from_erbil_km || 0} کیلومتر)
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-right w-32">
                          <div className="flex justify-end">
                            {city.has_intercity_bus_line ? (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                                <Bus className="h-3 w-3 mr-1" />
                                دارد
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300">
                                ندارد
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right w-24">
                          <div className="flex justify-end">
                            <Badge variant={city.is_active ? "default" : "secondary"}>
                              {city.is_active ? "فعال" : "غیرفعال"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right w-32">
                          <div className="flex justify-end">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setEditingCity(city);
                                setIsEditCityDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              ویرایش
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Province Dialog */}
        <Dialog open={isEditProvinceDialogOpen} onOpenChange={setIsEditProvinceDialogOpen}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>ویرایش استان</DialogTitle>
              <DialogDescription>ویرایش اطلاعات استان {editingProvince?.name_arabic}</DialogDescription>
            </DialogHeader>
            {editingProvince && (
              <form onSubmit={(e) => { e.preventDefault(); handleEditProvince(new FormData(e.currentTarget)); }}>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name_arabic">نام عربی *</Label>
                    <Input 
                      id="name_arabic" 
                      name="name_arabic" 
                      defaultValue={editingProvince.name_arabic}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name_english">نام انگلیسی *</Label>
                    <Input 
                      id="name_english" 
                      name="name_english" 
                      defaultValue={editingProvince.name_english}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capital">مرکز استان *</Label>
                    <Input 
                      id="capital" 
                      name="capital" 
                      defaultValue={editingProvince.capital}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">منطقه</Label>
                    <select 
                      name="region" 
                      defaultValue={editingProvince.region}
                      className="w-full p-2 border rounded"
                    >
                      <option value="north">شمال</option>
                      <option value="center">مرکز</option>
                      <option value="south">جنوب</option>
                    </select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="is_active" 
                        name="is_active" 
                        defaultChecked={editingProvince.is_active}
                      />
                      <Label htmlFor="is_active">فعال</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditProvinceDialogOpen(false)}>انصراف</Button>
                  <Button type="submit" disabled={updateProvinceMutation.isPending}>
                    {updateProvinceMutation.isPending ? "در حال به‌روزرسانی..." : "به‌روزرسانی"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit City Dialog */}
        <Dialog open={isEditCityDialogOpen} onOpenChange={setIsEditCityDialogOpen}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                ویرایش شهر
              </DialogTitle>
              <DialogDescription className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-blue-700">🏙️</span>
                  <span>ویرایش اطلاعات شهر <strong>{editingCity?.name_arabic || editingCity?.name}</strong></span>
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  استان: {editingCity?.province_name}
                </div>
              </DialogDescription>
            </DialogHeader>
            {editingCity && (
              <form onSubmit={(e) => { e.preventDefault(); handleEditCity(new FormData(e.currentTarget)); }}>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="city_name_arabic">نام عربی *</Label>
                    <Input 
                      id="city_name_arabic" 
                      name="name_arabic" 
                      defaultValue={editingCity.name_arabic || editingCity.name}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city_name_english">نام انگلیسی</Label>
                    <Input 
                      id="city_name_english" 
                      name="name_english" 
                      defaultValue={editingCity.name_english || editingCity.name}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="distance_from_erbil_km" className="text-blue-700 font-medium">
                      📍 فاصله از اربیل (کیلومتر) *
                    </Label>
                    <div className="relative">
                      <Input 
                        id="distance_from_erbil_km" 
                        name="distance_from_erbil_km" 
                        type="number"
                        min="0"
                        max="1000"
                        step="1"
                        defaultValue={editingCity.distance_from_erbil_km || 0}
                        required 
                        className="pl-20 text-center font-medium text-lg"
                        placeholder="0"
                      />
                      <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                        کیلومتر
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                      💡 این فاصله برای محاسبه هزینه حمل و انتخاب خودرو استفاده می‌شود
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>استان</Label>
                    <p className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                      {editingCity.province_name}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="city_is_active" 
                        name="is_active" 
                        defaultChecked={editingCity.is_active}
                      />
                      <Label htmlFor="city_is_active">فعال</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 bg-blue-50 p-3 rounded-lg border-2 border-blue-200">
                      <input 
                        type="checkbox" 
                        id="city_has_intercity_bus_line" 
                        name="has_intercity_bus_line" 
                        defaultChecked={editingCity.has_intercity_bus_line}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <Bus className="h-4 w-4 text-blue-600" />
                      <Label htmlFor="city_has_intercity_bus_line" className="text-blue-800 font-medium">
                        خط مسافربری بین شهری موجود است
                      </Label>
                    </div>
                    <p className="text-xs text-blue-600 px-3">
                      💡 این گزینه نشان می‌دهد که آیا در این شهر خدمات اتوبوس بین شهری ارائه می‌شود یا خیر
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditCityDialogOpen(false)}>انصراف</Button>
                  <Button type="submit" disabled={updateCityMutation.isPending}>
                    {updateCityMutation.isPending ? "در حال به‌روزرسانی..." : "به‌روزرسانی"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // Fleet Vehicles Tab Component (ناوگان خودروها)
  const FleetVehiclesTab = () => {
    // Use the already defined fleet vehicles data from top level
    const readyVehicles = fleetVehicles;

    // Create ready vehicle mutation
    const createReadyVehicleMutation = useMutation({
      mutationFn: (data: Partial<ReadyVehicle>) => 
        fetch('/api/logistics/ready-vehicles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data)
        }).then(res => res.json()),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/logistics/ready-vehicles'] });
        setIsCreateReadyVehicleDialogOpen(false);
        toast({ title: "موفقیت", description: "خودرو آماده ثبت شد" });
      },
      onError: () => {
        toast({ title: "خطا", description: "خطا در ثبت خودرو آماده", variant: "destructive" });
      }
    });

    // Update ready vehicle mutation
    const updateReadyVehicleMutation = useMutation({
      mutationFn: ({ id, ...data }: { id: number } & Partial<ReadyVehicle>) => 
        fetch(`/api/logistics/ready-vehicles/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data)
        }).then(res => res.json()),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/logistics/ready-vehicles'] });
        setIsEditReadyVehicleDialogOpen(false);
        setSelectedReadyVehicle(null);
        toast({ title: "موفقیت", description: "خودرو آماده بروزرسانی شد" });
      },
      onError: () => {
        toast({ title: "خطا", description: "خطا در بروزرسانی خودرو آماده", variant: "destructive" });
      }
    });

    // Delete ready vehicle mutation
    const deleteReadyVehicleMutation = useMutation({
      mutationFn: (id: number) => 
        fetch(`/api/logistics/ready-vehicles/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        }).then(res => res.json()),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/logistics/ready-vehicles'] });
        toast({ title: "موفقیت", description: "خودرو آماده حذف شد" });
      },
      onError: () => {
        toast({ title: "خطا", description: "خطا در حذف خودرو آماده", variant: "destructive" });
      }
    });

    // Handle form submission for creating ready vehicle
    const handleCreateReadyVehicle = (e: React.FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      
      // Determine vehicle template and type based on selection
      const selectedVehicleType = formData.get('vehicleType') as string;
      const isCustomType = selectedVehicleType === 'سایر';
      const finalVehicleType = isCustomType ? customVehicleType : selectedVehicleType;
      
      // Find the selected vehicle template
      const vehicleTemplates = (vehicleTemplatesData as any)?.data || [];
      const selectedTemplate = vehicleTemplates.find((template: any) => template.name === selectedVehicleType);
      
      const vehicleData = {
        vehicleTemplateId: selectedTemplate?.id || null,
        vehicleType: finalVehicleType,
        licensePlate: formData.get('licensePlate') as string,
        driverName: formData.get('driverName') as string,
        driverMobile: formData.get('driverMobile') as string,
        loadCapacity: parseInt(formData.get('loadCapacity') as string),
        currentLocation: formData.get('currentLocation') as string,
        supportsFlammable: formData.get('supportsFlammable') === 'true',
        notAllowedFlammable: formData.get('notAllowedFlammable') === 'true',
        notes: formData.get('notes') as string,
        isAvailable: formData.get('isAvailable') === 'true'
      };
      
      createReadyVehicleMutation.mutate(vehicleData);
      
      // Reset custom input state
      setShowCustomInput(false);
      setCustomVehicleType('');
    };

    // Handle form submission for updating ready vehicle
    const handleUpdateReadyVehicle = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedReadyVehicle) return;
      
      const formData = new FormData(e.target as HTMLFormElement);
      
      // Determine vehicle template and type based on selection
      const selectedVehicleType = formData.get('vehicleType') as string;
      const isCustomType = selectedVehicleType === 'سایر';
      const finalVehicleType = isCustomType ? customEditVehicleType : selectedVehicleType;
      
      // Find the selected vehicle template
      const vehicleTemplates = (vehicleTemplatesData as any)?.data || [];
      const selectedTemplate = vehicleTemplates.find((template: any) => template.name === selectedVehicleType);
      
      const vehicleData = {
        id: selectedReadyVehicle.id,
        vehicleTemplateId: selectedTemplate?.id || null,
        vehicleType: finalVehicleType,
        licensePlate: formData.get('licensePlate') as string,
        driverName: formData.get('driverName') as string,
        driverMobile: formData.get('driverMobile') as string,
        loadCapacity: parseInt(formData.get('loadCapacity') as string),
        currentLocation: formData.get('currentLocation') as string,
        supportsFlammable: formData.get('supportsFlammable') === 'true',
        notAllowedFlammable: formData.get('notAllowedFlammable') === 'true',
        notes: formData.get('notes') as string,
        isAvailable: formData.get('isAvailable') === 'true'
      };
      
      updateReadyVehicleMutation.mutate(vehicleData);
      
      // Reset custom input state
      setShowCustomEditInput(false);
      setCustomEditVehicleType('');
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-600" />
              ناوگان خودروهای شرکت
            </h3>
            <p className="text-muted-foreground text-sm">مدیریت خودروهای واقعی و آماده شرکت برای اختصاص به سفارشات</p>
          </div>
          <Button 
            onClick={() => setIsCreateReadyVehicleDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            افزودن خودرو به ناوگان
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نوع خودرو</TableHead>
                  <TableHead>پلاک خودرو</TableHead>
                  <TableHead>نام راننده</TableHead>
                  <TableHead>موبایل راننده</TableHead>
                  <TableHead>ظرفیت حمل</TableHead>
                  <TableHead>قابلیت‌های ویژه</TableHead>
                  <TableHead>موقعیت فعلی</TableHead>
                  <TableHead>وضعیت دسترسی</TableHead>
                  <TableHead>عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingFleetVehicles ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">در حال بارگذاری...</TableCell>
                  </TableRow>
                ) : readyVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Truck className="h-12 w-12 text-gray-400" />
                        <p className="text-gray-600">هیچ خودرویی در ناوگان شرکت ثبت نشده</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  readyVehicles.map((vehicle: ReadyVehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell>{vehicle.vehicleType}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {vehicle.licensePlate}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{vehicle.driverName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-blue-600" />
                          <span className="font-mono text-blue-600">{vehicle.driverMobile}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Weight className="h-3 w-3 text-orange-600" />
                          <span className="font-medium text-orange-600">{vehicle.loadCapacity} کیلوگرم</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {vehicle.supportsFlammable && (
                            <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">
                              <Flame className="h-3 w-3 mr-1" />
                              مجاز آتش‌زا
                            </Badge>
                          )}
                          {vehicle.notAllowedFlammable && (
                            <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200">
                              <X className="h-3 w-3 mr-1" />
                              ممنوع آتش‌زا
                            </Badge>
                          )}
                          {!vehicle.supportsFlammable && !vehicle.notAllowedFlammable && (
                            <span className="text-gray-500 text-xs">عادی</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {vehicle.currentLocation || 'نامشخص'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={vehicle.isAvailable ? "default" : "destructive"}>
                          {vehicle.isAvailable ? "آماده" : "مشغول"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setSelectedReadyVehicle(vehicle);
                              setIsEditReadyVehicleDialogOpen(true);
                            }}
                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4 ml-1" />
                            ویرایش
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => deleteReadyVehicleMutation.mutate(vehicle.id)}
                            disabled={deleteReadyVehicleMutation.isPending}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <AlertTriangle className="h-4 w-4 ml-1" />
                            حذف
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Ready Vehicle Dialog */}
        <Dialog open={isCreateReadyVehicleDialogOpen} onOpenChange={setIsCreateReadyVehicleDialogOpen}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-green-600" />
                افزودن خودرو به ناوگان شرکت
              </DialogTitle>
              <DialogDescription>
                اطلاعات خودرو و راننده را برای اضافه کردن به ناوگان خودروهای شرکت وارد کنید
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateReadyVehicle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleType">الگوی خودرو *</Label>
                  <Select 
                    name="vehicleType" 
                    value={selectedVehicleType}
                    onValueChange={(value) => {
                      setSelectedVehicleType(value);
                    }}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="انتخاب الگوی خودرو" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingVehicleTemplates ? (
                        <SelectItem value="loading" disabled>در حال بارگذاری...</SelectItem>
                      ) : (vehicleTemplatesData as any)?.data?.length > 0 ? (
                        (vehicleTemplatesData as any)?.data?.map((template: any) => (
                          <SelectItem key={template.id} value={template.name}>
                            {template.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-data" disabled>هیچ الگوی خودرویی یافت نشد</SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                </div>
                <div className="space-y-2">
                  <Label htmlFor="licensePlate">شماره خودرو *</Label>
                  <Input 
                    id="licensePlate" 
                    name="licensePlate" 
                    required 
                    placeholder="مثال: 12ج345678"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverName">نام راننده *</Label>
                  <Input 
                    id="driverName" 
                    name="driverName" 
                    required 
                    placeholder="نام و نام خانوادگی راننده"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverMobile">موبایل راننده *</Label>
                  <Input 
                    id="driverMobile" 
                    name="driverMobile" 
                    required 
                    placeholder="مثال: 07501234567"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loadCapacity">ظرفیت حمل (کیلوگرم) *</Label>
                  <Input 
                    id="loadCapacity" 
                    name="loadCapacity" 
                    type="number" 
                    required 
                    placeholder="مثال: 1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentLocation">موقعیت فعلی</Label>
                  <Input 
                    id="currentLocation" 
                    name="currentLocation" 
                    placeholder="مثال: اربیل، بغداد"
                  />
                </div>
                
                {/* Special Capabilities Section */}
                <div className="space-y-2 col-span-2">
                  <Label className="text-base font-semibold text-blue-700">قابلیت‌های ویژه حمل مواد</Label>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <input type="hidden" name="supportsFlammable" value="false" />
                      <input 
                        type="checkbox" 
                        id="supportsFlammable" 
                        name="supportsFlammable" 
                        value="true"
                      />
                      <Label htmlFor="supportsFlammable" className="text-green-700">قابلیت حمل مواد آتش‌زا</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="hidden" name="notAllowedFlammable" value="false" />
                      <input 
                        type="checkbox" 
                        id="notAllowedFlammable" 
                        name="notAllowedFlammable" 
                        value="true"
                      />
                      <Label htmlFor="notAllowedFlammable" className="text-red-700">ممنوع حمل مواد آتش‌زا</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="notes">یادداشت‌ها</Label>
                  <Input 
                    id="notes" 
                    name="notes" 
                    placeholder="اطلاعات اضافی در مورد خودرو یا راننده"
                  />
                </div>
                
                {/* Status Section */}
                <div className="space-y-2 col-span-2">
                  <Label className="text-base font-semibold text-green-700">وضعیت دسترسی</Label>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <input type="hidden" name="isAvailable" value="false" />
                      <input 
                        type="checkbox" 
                        id="isAvailable" 
                        name="isAvailable" 
                        value="true" 
                        defaultChecked
                      />
                      <Label htmlFor="isAvailable" className="font-medium">آماده به کار</Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateReadyVehicleDialogOpen(false)}>
                  انصراف
                </Button>
                <Button type="submit" disabled={createReadyVehicleMutation.isPending}>
                  {createReadyVehicleMutation.isPending ? "در حال ثبت..." : "ثبت خودرو"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Ready Vehicle Dialog */}
        <Dialog open={isEditReadyVehicleDialogOpen} onOpenChange={setIsEditReadyVehicleDialogOpen}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                ویرایش خودرو ناوگان
              </DialogTitle>
              <DialogDescription>
                ویرایش اطلاعات خودرو {selectedReadyVehicle?.licensePlate} در ناوگان شرکت
              </DialogDescription>
            </DialogHeader>
            
            {selectedReadyVehicle && (
              <form onSubmit={handleUpdateReadyVehicle} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-vehicleType">الگوی خودرو *</Label>
                    <Select 
                      name="vehicleType" 
                      value={selectedEditVehicleType}
                      onValueChange={(value) => {
                        setSelectedEditVehicleType(value);
                      }}
                      required
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="انتخاب الگوی خودرو" />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingVehicleTemplates ? (
                          <SelectItem value="loading" disabled>در حال بارگذاری...</SelectItem>
                        ) : (vehicleTemplatesData as any)?.data?.length > 0 ? (
                          (vehicleTemplatesData as any)?.data?.map((template: any) => (
                            <SelectItem key={template.id} value={template.name}>
                              {template.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-data" disabled>هیچ الگوی خودرویی یافت نشد</SelectItem>
                        )}
                      </SelectContent>
                    </Select>

                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-licensePlate">شماره خودرو *</Label>
                    <Input 
                      id="edit-licensePlate" 
                      name="licensePlate" 
                      required 
                      defaultValue={selectedReadyVehicle.licensePlate}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-driverName">نام راننده *</Label>
                    <Input 
                      id="edit-driverName" 
                      name="driverName" 
                      required 
                      defaultValue={selectedReadyVehicle.driverName}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-driverMobile">موبایل راننده *</Label>
                    <Input 
                      id="edit-driverMobile" 
                      name="driverMobile" 
                      required 
                      defaultValue={selectedReadyVehicle.driverMobile}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-loadCapacity">ظرفیت حمل (کیلوگرم) *</Label>
                    <Input 
                      id="edit-loadCapacity" 
                      name="loadCapacity" 
                      type="number" 
                      required 
                      defaultValue={selectedReadyVehicle.loadCapacity}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-currentLocation">موقعیت فعلی</Label>
                    <Input 
                      id="edit-currentLocation" 
                      name="currentLocation" 
                      defaultValue={selectedReadyVehicle.currentLocation || ''}
                    />
                  </div>
                  
                  {/* Special Capabilities Section */}
                  <div className="space-y-2 col-span-2">
                    <Label className="text-base font-semibold text-blue-700">قابلیت‌های ویژه حمل مواد</Label>
                    <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <input type="hidden" name="supportsFlammable" value="false" />
                        <input 
                          type="checkbox" 
                          id="edit-supportsFlammable" 
                          name="supportsFlammable" 
                          value="true"
                          defaultChecked={selectedReadyVehicle.supportsFlammable}
                        />
                        <Label htmlFor="edit-supportsFlammable" className="text-green-700">قابلیت حمل مواد آتش‌زا</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="hidden" name="notAllowedFlammable" value="false" />
                        <input 
                          type="checkbox" 
                          id="edit-notAllowedFlammable" 
                          name="notAllowedFlammable" 
                          value="true"
                          defaultChecked={selectedReadyVehicle.notAllowedFlammable}
                        />
                        <Label htmlFor="edit-notAllowedFlammable" className="text-red-700">ممنوع حمل مواد آتش‌زا</Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="edit-notes">یادداشت‌ها</Label>
                    <Input 
                      id="edit-notes" 
                      name="notes" 
                      defaultValue={selectedReadyVehicle.notes || ''}
                    />
                  </div>
                  
                  {/* Status Section */}
                  <div className="space-y-2 col-span-2">
                    <Label className="text-base font-semibold text-green-700">وضعیت دسترسی</Label>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <input type="hidden" name="isAvailable" value="false" />
                        <input 
                          type="checkbox" 
                          id="edit-isAvailable" 
                          name="isAvailable" 
                          value="true" 
                          defaultChecked={selectedReadyVehicle.isAvailable}
                        />
                        <Label htmlFor="edit-isAvailable" className="font-medium">آماده به کار</Label>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditReadyVehicleDialogOpen(false)}>
                    انصراف
                  </Button>
                  <Button type="submit" disabled={updateReadyVehicleMutation.isPending}>
                    {updateReadyVehicleMutation.isPending ? "در حال بروزرسانی..." : "بروزرسانی"}
                  </Button>
                </DialogFooter>
                </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">مدیریت لجستیک</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {mappedLogisticsOrders.length} سفارش فعال
          </Badge>
          {orderCount > 0 && (
            <Badge className="bg-orange-500 animate-pulse">
              {orderCount} سفارش جدید
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="orders">سفارشات</TabsTrigger>
          <TabsTrigger value="delivered">تحویل شده</TabsTrigger>
          <TabsTrigger value="companies">شرکت‌های حمل</TabsTrigger>
          <TabsTrigger value="geography">جغرافیای عراق</TabsTrigger>
          <TabsTrigger value="international">جغرافیای خارج از عراق</TabsTrigger>
          <TabsTrigger value="vehicle-templates">قالب‌های خودرو</TabsTrigger>
          <TabsTrigger value="fleet-vehicles">ناوگان خودروها</TabsTrigger>
          <TabsTrigger value="vehicle-history">تاریخچه خودروها</TabsTrigger>
          <TabsTrigger value="postal">خدمات پست</TabsTrigger>
          <TabsTrigger value="postal-params">محاسبات پست</TabsTrigger>
          <TabsTrigger value="delivery-services">سرویس دلیوری</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <OrdersTab />
        </TabsContent>

        <TabsContent value="delivered">
          <DeliveredOrdersTab />
        </TabsContent>

        <TabsContent value="companies">
          <CompaniesTab />
        </TabsContent>

        <TabsContent value="geography">
          <GeographyTab />
        </TabsContent>





        <TabsContent value="vehicle-templates">
          <VehicleTemplatesTab />
        </TabsContent>

        <TabsContent value="fleet-vehicles">
          <FleetVehiclesTab />
        </TabsContent>

        <TabsContent value="vehicle-history">
          <VehicleHistorySection />
        </TabsContent>

        <TabsContent value="international">
          <InternationalGeographyTab />
        </TabsContent>

        <TabsContent value="postal">
          <PostalServicesTab />
        </TabsContent>

        <TabsContent value="postal-params">
          <PostalShippingParamsTab />
        </TabsContent>

        <TabsContent value="delivery-services">
          <DeliveryServicesTab />
        </TabsContent>
      </Tabs>

      {/* Vehicle Assignment Dialog */}
      <Dialog open={isVehicleAssignmentOpen} onOpenChange={setIsVehicleAssignmentOpen}>
        <DialogContent className="max-w-4xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-6 h-6 text-orange-600" />
              اختصاص وسیله ارسال محموله به سفارش {selectedOrderForVehicle?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              انتخاب خودروی مناسب از ناوگان شرکت بر اساس نوع خودروی انتخابی مشتری
            </DialogDescription>
          </DialogHeader>

          {selectedOrderForVehicle && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  اطلاعات سفارش
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">مشتری</Label>
                    <p className="font-medium">
                      {selectedOrderForVehicle.customer?.firstName} {selectedOrderForVehicle.customer?.lastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">وزن محموله</Label>
                    <p className="font-medium">
                      {selectedOrderForVehicle.calculatedWeight || selectedOrderForVehicle.totalWeight} کیلوگرم
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">مقصد</Label>
                    <p className="font-medium">
                      {(selectedOrderForVehicle.shippingAddress as any)?.city || 'نامشخص'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer's Selected Vehicle Details */}
              {selectedVehicleDetails && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    خودروی انتخابی مشتری از سیستم هوشمند
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">نوع خودرو</Label>
                      <p className="font-medium">{selectedVehicleDetails.vehicleType}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">نام خودرو</Label>
                      <p className="font-medium">{selectedVehicleDetails.vehicleName}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">هزینه محاسبه شده</Label>
                      <p className="font-medium text-green-700">
                        {parseInt(selectedVehicleDetails.totalCost || 0).toLocaleString()} دینار
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">ظرفیت حمل</Label>
                      <p className="font-medium">{selectedVehicleDetails.maxWeight} کیلوگرم</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Available Fleet Vehicles */}
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-orange-800 flex items-center">
                    <Truck className="w-5 h-5 mr-2" />
                    خودروهای آماده از ناوگان شرکت
                  </h3>
                  {(!user || ((adminUser as any)?.success === false && (adminUser as any)?.message?.includes('Access denied'))) && (
                    <Button
                      onClick={() => window.location.href = '/admin/login'}
                      size="sm"
                      variant="outline"
                      className="text-xs border-orange-300 text-orange-700 hover:bg-orange-100"
                    >
                      <LogIn className="w-4 h-4 ml-2" />
                      {!user ? 'ورود برای مشاهده خودروها' : 'ورود مدیریت'}
                    </Button>
                  )}
                </div>
                {selectedVehicleDetails && (
                  <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 text-blue-800 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      خودروها بر اساس انطباق با انتخاب مشتری مرتب شده‌اند - خودروهای سبز رنگ بالاترین اولویت را دارند
                    </div>
                  </div>
                )}
                
                {availableFleetVehicles.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-400" />
                    <p className="text-orange-600 mb-4">
                      {!user 
                        ? "برای مشاهده خودروهای فیزیکی آماده، لطفاً با حساب مدیریت وارد سیستم شوید" 
                        : (adminUser as any)?.success === false && (adminUser as any)?.message?.includes('Access denied')
                        ? "دسترسی محدود: لطفاً با حساب مدیر سیستم وارد شوید تا خودروهای فیزیکی آماده را مشاهده کنید"
                        : "هیچ خودروی مناسبی از این نوع در دسترس نیست"
                      }
                    </p>
                    {(!user || ((adminUser as any)?.success === false && (adminUser as any)?.message?.includes('Access denied'))) ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-sm text-blue-700 space-y-2 text-right">
                          <p className="font-medium">💡 راهنمای ورود مدیریت:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>خروج از حساب مشتری و ورود با حساب مدیریت</li>
                            <li>یا از صفحه اصلی به بخش مدیریت سیستم بروید</li>
                            <li>پس از ورود مدیریت، خودروهای فیزیکی آماده نمایش داده می‌شوند</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>دلایل احتمالی:</p>
                        <ul className="list-disc list-inside text-right">
                          <li>تمام خودروهای این نوع در حال استفاده هستند</li>
                          <li>ظرفیت بارگیری خودروهای آماده کمتر از وزن محموله است</li>
                          <li>نیاز به اضافه کردن خودروی جدید به ناوگان شرکت</li>
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableFleetVehicles.map((vehicle) => (
                      <div 
                        key={vehicle.id} 
                        className={`bg-white rounded-lg p-4 border transition-all duration-300 ${
                          vehicle.isCheckoutSuggested 
                            ? 'border-green-500 bg-green-50 ring-2 ring-green-200 shadow-lg' 
                            : 'border-orange-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className={`font-semibold ${
                            vehicle.isCheckoutSuggested ? 'text-green-800' : 'text-gray-800'
                          }`}>
                            {vehicle.vehicleType || vehicle.vehicleName}
                          </h4>
                          <div className="flex gap-2">
                            {vehicle.isCheckoutSuggested && (
                              <Badge className={`${
                                vehicle.matchType === 'exact' 
                                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 animate-pulse' 
                                  : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                              } text-white`}>
                                {vehicle.matchType === 'exact' ? '🎯 انطباق کامل' : '🔍 انطباق نزدیک'}
                              </Badge>
                            )}
                            <Badge className="bg-green-500 text-white">آماده</Badge>
                          </div>
                        </div>
                        
                        {/* Recommendation Score and Reasons */}
                        {vehicle.recommendationScore && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-blue-800">امتیاز هوشمند</span>
                              <div className="flex items-center gap-2">
                                <div className={`w-12 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  vehicle.recommendationScore >= 80 ? 'bg-green-600 text-white' :
                                  vehicle.recommendationScore >= 60 ? 'bg-yellow-500 text-white' :
                                  'bg-orange-500 text-white'
                                }`}>
                                  {vehicle.recommendationScore}
                                </div>
                                {vehicle.isRecommended && (
                                  <Badge className="bg-green-600 text-white text-xs">
                                    🤖 پیشنهاد سیستم
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {vehicle.recommendationReasons && vehicle.recommendationReasons.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-xs text-blue-700 font-medium">دلایل پیشنهاد:</span>
                                <ul className="text-xs text-blue-600 space-y-1">
                                  {vehicle.recommendationReasons.map((reason: string, idx: number) => (
                                    <li key={idx} className="flex items-center gap-1">
                                      <div className="w-1 h-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                                      {reason}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {vehicle.matchReason && (
                          <div className={`border rounded-lg p-3 mb-4 ${
                            vehicle.matchType === 'exact' 
                              ? 'bg-green-100 border-green-300' 
                              : vehicle.matchType === 'partial'
                              ? 'bg-yellow-50 border-yellow-300'
                              : 'bg-blue-50 border-blue-300'
                          }`}>
                            <div className={`flex items-start gap-2 text-xs ${
                              vehicle.matchType === 'exact' 
                                ? 'text-green-800' 
                                : vehicle.matchType === 'partial'
                                ? 'text-yellow-800'
                                : 'text-blue-800'
                            }`}>
                              {vehicle.matchType === 'exact' ? (
                                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              ) : vehicle.matchType === 'partial' ? (
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              ) : (
                                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              )}
                              <span className="leading-relaxed">{vehicle.matchReason}</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">شماره پلاک:</span>
                            <span className="font-medium">{vehicle.licensePlate || vehicle.plateNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">راننده:</span>
                            <span className="font-medium">{vehicle.driverName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">تلفن راننده:</span>
                            <span className="font-medium">{vehicle.driverMobile || vehicle.driverPhone}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">ظرفیت:</span>
                            <span className="font-medium">{vehicle.loadCapacity || vehicle.maxWeight} کیلوگرم</span>
                          </div>
                        </div>
                        
                        <Button 
                          className={`w-full transition-all duration-300 ${
                            vehicle.matchType === 'exact'
                              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg border-2 border-green-400' 
                              : vehicle.matchType === 'partial'
                              ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 shadow-lg border-2 border-yellow-400'
                              : 'bg-blue-600 hover:bg-blue-700 border-2 border-blue-400'
                          } text-white`}
                          onClick={() => assignVehicleToOrder(
                            vehicle.id, 
                            vehicle.licensePlate || vehicle.plateNumber, 
                            vehicle.driverName, 
                            vehicle.driverMobile || vehicle.driverPhone
                          )}
                        >
                          {vehicle.matchType === 'exact' ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              🎯 اختصاص خودروی کاملاً مطابق
                            </>
                          ) : vehicle.matchType === 'partial' ? (
                            <>
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              🔍 اختصاص خودروی مشابه
                            </>
                          ) : (
                            <>
                              <Info className="w-4 h-4 mr-2" />
                              🚛 اختصاص خودروی جایگزین
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Details Modal */}
      <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <Button
                onClick={handlePrintOrderDetails}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                پرینت
              </Button>
              <div className="text-right flex-1">
                <DialogTitle className="text-right">
                  جزئیات سفارش {selectedOrder?.orderNumber || `#${selectedOrder?.customerOrderId}`}
                </DialogTitle>
                <DialogDescription className="text-right">
                  مشاهده کامل اطلاعات سفارش و آدرس تحویل
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  اطلاعات مشتری
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">نام و نام خانوادگی</Label>
                    <p className="font-medium">
                      {selectedOrder.customer?.firstName || selectedOrder.customerFirstName} {selectedOrder.customer?.lastName || selectedOrder.customerLastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">شماره تماس</Label>
                    <p className="font-medium flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-blue-600" />
                      {selectedOrder.customer?.phone || selectedOrder.customerPhone}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">ایمیل</Label>
                    <p className="font-medium">{selectedOrder.customer?.email || selectedOrder.customerEmail || 'ثبت نشده'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">کد تحویل</Label>
                    <p className="font-bold text-purple-700 text-lg">
                      {selectedOrder.deliveryCode || 'کد ندارد'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    آدرس تحویل
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">گیرنده</Label>
                      <p className="font-medium">{(selectedOrder.shippingAddress as any)?.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">تلفن گیرنده</Label>
                      <p className="font-medium flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-green-600" />
                        {(selectedOrder.shippingAddress as any)?.phone}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-sm text-gray-600">آدرس کامل</Label>
                      <p className="font-medium">{(selectedOrder.shippingAddress as any)?.address}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">شهر</Label>
                      <p className="font-medium">{(selectedOrder.shippingAddress as any)?.city}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">کد پستی</Label>
                      <p className="font-medium">{(selectedOrder.shippingAddress as any)?.postalCode}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Details - Enhanced Format */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-6 border border-orange-200">
                <h3 className="text-xl font-bold text-orange-800 mb-4 flex items-center">
                  <Package className="w-6 h-6 mr-2" />
                  جزئیات کامل سفارش
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Weight Information */}
                  <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center mb-2">
                      <Weight className="w-4 h-4 mr-1 text-blue-600" />
                      اطلاعات وزن
                    </Label>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">وزن محاسبه شده:</span>
                        <span className="font-semibold text-blue-700">{selectedOrder.calculatedWeight || 0} کیلوگرم</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">وزن کل:</span>
                        <span className="font-semibold text-purple-700">{selectedOrder.totalWeight || 0} کیلوگرم</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">واحد وزن:</span>
                        <span className="font-medium">{selectedOrder.weightUnit || 'kg'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Information */}
                  <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center mb-2">
                      <Calculator className="w-4 h-4 mr-1 text-green-600" />
                      اطلاعات مالی
                    </Label>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">مبلغ کل:</span>
                        <span className="font-bold text-green-700">{Math.floor(parseFloat(selectedOrder.totalAmount || '0')).toLocaleString()} {selectedOrder.currency || 'IQD'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">ارز:</span>
                        <span className="font-medium">{selectedOrder.currency || 'دینار عراق'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">شماره سفارش:</span>
                        <span className="font-semibold text-orange-700">{selectedOrder.orderNumber}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">نوع تسویه حساب:</span>
                        <Badge variant="outline" className="text-xs">
                          {selectedOrder.paymentMethod || 'نامشخص'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Information */}
                  <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center mb-2">
                      <Truck className="w-4 h-4 mr-1 text-purple-600" />
                      اطلاعات تحویل
                    </Label>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">روش تحویل:</span>
                        <span className="font-semibold text-purple-700">{selectedOrder.vehicleType || selectedOrder.selectedVehicleName || 
                          (selectedOrder.deliveryMethod === 'smart_vehicle' ? '🚚 ارسال هوشمند' :
                           selectedOrder.deliveryMethod === 'self_pickup' ? '🏢 تحویل حضوری' :
                           selectedOrder.deliveryMethod === 'freight_collect' ? '💰 پس کرایه' :
                           selectedOrder.deliveryMethod === 'postal' ? '📮 ارسال پستی' :
                           selectedOrder.deliveryMethod === 'courier' ? 'پیک موتوری' :
                           selectedOrder.deliveryMethod || '⚠️ نامشخص')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">نوع حمل:</span>
                        <span className="font-medium">{selectedOrder.transportationType || 'استاندارد'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">کد ردیابی:</span>
                        <span className="font-medium text-blue-600">{selectedOrder.trackingNumber || 'نامشخص'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status and Dates Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center mb-2">
                      <History className="w-4 h-4 mr-1 text-indigo-600" />
                      تاریخ‌های مهم
                    </Label>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">تاریخ ایجاد:</span>
                        <span className="font-medium">{formatDateSafe(selectedOrder.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">آخرین بروزرسانی:</span>
                        <span className="font-medium">{formatDateSafe(selectedOrder.updatedAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">تاریخ تحویل تخمینی:</span>
                        <span className="font-medium">{formatDateSafe(selectedOrder.estimatedDeliveryDate) || 'نامشخص'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center mb-2">
                      <AlertCircle className="w-4 h-4 mr-1 text-red-600" />
                      وضعیت و کد تحویل
                    </Label>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">وضعیت فعلی:</span>
                        <Badge variant={selectedOrder.currentStatus === 'logistics_dispatched' ? 'default' : 'secondary'}>
                          {getStatusDisplayName(selectedOrder.currentStatus)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">کد تحویل:</span>
                        <span className="font-bold text-red-600">{selectedOrder.deliveryCode || 'تعیین نشده'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Notes */}
              {selectedOrder.deliveryNotes && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    یادداشت‌های تحویل
                  </h3>
                  <p className="text-gray-700">{selectedOrder.deliveryNotes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ready Vehicle Edit Dialog */}
      <Dialog open={isEditReadyVehicleDialogOpen} onOpenChange={setIsEditReadyVehicleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">
              ویرایش خودرو آماده کار
            </DialogTitle>
            <DialogDescription className="text-right">
              اطلاعات خودرو و راننده را به‌روزرسانی کنید
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateReadyVehicle} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vehicle Type */}
              <div className="space-y-2">
                <Label htmlFor="edit-vehicleType">الگوی خودرو *</Label>
                <Select 
                  name="vehicleType" 
                  value={selectedEditVehicleType}
                  onValueChange={(value) => {
                    setSelectedEditVehicleType(value);
                  }}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="انتخاب الگوی خودرو" />
                  </SelectTrigger>
                  <SelectContent>
                    {(vehicleTemplatesData as any)?.data?.map((template: any) => (
                      <SelectItem key={template.id} value={template.name}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* License Plate */}
              <div className="space-y-2">
                <Label htmlFor="edit-licensePlate">شماره خودرو *</Label>
                <Input 
                  id="edit-licensePlate" 
                  name="licensePlate" 
                  required 
                  defaultValue={selectedReadyVehicle?.licensePlate}
                  placeholder="مثال: 12ج345678"
                  className="font-mono"
                />
              </div>

              {/* Driver Name */}
              <div className="space-y-2">
                <Label htmlFor="edit-driverName">نام راننده *</Label>
                <Input 
                  id="edit-driverName" 
                  name="driverName" 
                  required 
                  defaultValue={selectedReadyVehicle?.driverName}
                  placeholder="نام و نام خانوادگی راننده"
                />
              </div>

              {/* Driver Mobile */}
              <div className="space-y-2">
                <Label htmlFor="edit-driverMobile">موبایل راننده *</Label>
                <Input 
                  id="edit-driverMobile" 
                  name="driverMobile" 
                  required 
                  defaultValue={selectedReadyVehicle?.driverMobile}
                  placeholder="مثال: 07501234567"
                />
              </div>

              {/* Load Capacity */}
              <div className="space-y-2">
                <Label htmlFor="edit-loadCapacity">ظرفیت بار (کیلوگرم) *</Label>
                <Input 
                  id="edit-loadCapacity" 
                  name="loadCapacity" 
                  type="number" 
                  min="1" 
                  required 
                  defaultValue={selectedReadyVehicle?.loadCapacity}
                  placeholder="مثال: 5000"
                />
              </div>

              {/* Current Location */}
              <div className="space-y-2">
                <Label htmlFor="edit-currentLocation">موقعیت فعلی</Label>
                <Input 
                  id="edit-currentLocation" 
                  name="currentLocation" 
                  defaultValue={selectedReadyVehicle?.currentLocation}
                  placeholder="مثال: بغداد - منطقه المنصور"
                />
              </div>
            </div>

            {/* Availability and Safety Settings */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-800 mb-3">تنظیمات دسترسی و ایمنی</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Available Status */}
                <div className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="checkbox"
                    id="edit-isAvailable"
                    name="isAvailable"
                    defaultChecked={selectedReadyVehicle?.isAvailable}
                    value="true"
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                  />
                  <Label htmlFor="edit-isAvailable" className="text-sm font-medium text-gray-700">
                    در دسترس
                  </Label>
                </div>

                {/* Supports Flammable */}
                <div className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="checkbox"
                    id="edit-supportsFlammable"
                    name="supportsFlammable"
                    defaultChecked={selectedReadyVehicle?.supportsFlammable}
                    value="true"
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <Label htmlFor="edit-supportsFlammable" className="text-sm font-medium text-gray-700">
                    مجاز به حمل مواد آتش‌زا
                  </Label>
                </div>

                {/* Not Allowed Flammable */}
                <div className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="checkbox"
                    id="edit-notAllowedFlammable"
                    name="notAllowedFlammable"
                    defaultChecked={selectedReadyVehicle?.notAllowedFlammable}
                    value="true"
                    className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                  />
                  <Label htmlFor="edit-notAllowedFlammable" className="text-sm font-medium text-gray-700">
                    ممنوع حمل مواد آتش‌زا
                  </Label>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="edit-notes">یادداشت‌ها</Label>
              <textarea
                id="edit-notes"
                name="notes"
                rows={3}
                defaultValue={selectedReadyVehicle?.notes}
                placeholder="یادداشت‌های اضافی در مورد خودرو یا راننده..."
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditReadyVehicleDialogOpen(false)}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                disabled={updateReadyVehicleMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updateReadyVehicleMutation.isPending ? "در حال به‌روزرسانی..." : "به‌روزرسانی"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Enhanced Suitable Vehicles Dialog */}
      <Dialog open={isSuitableVehiclesOpen} onOpenChange={setIsSuitableVehiclesOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5 text-blue-600" />
              خودروهای مناسب برای سفارش {selectedOrderForVehicle?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              تمام خودروهای مناسب که در زمان خرید شناسایی شده‌اند
            </DialogDescription>
          </DialogHeader>

          {suitableVehiclesData && (
            <div className="space-y-6">
              {/* Order Summary */}
              <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    خلاصه سفارش
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">مقصد:</span>
                      <span className="font-medium">{suitableVehiclesData.order?.destinationCity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Weight className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">وزن:</span>
                      <span className="font-medium">{suitableVehiclesData.order?.weight} {suitableVehiclesData.order?.weightUnit}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">مسافت:</span>
                      <span className="font-medium">{suitableVehiclesData.order?.distance} کیلومتر</span>
                    </div>
                    {suitableVehiclesData.order?.containsFlammableProducts && (
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-600">حاوی مواد آتش‌زا</span>
                      </div>
                    )}
                  </div>
                  
                  {suitableVehiclesData.order?.flammableProducts?.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="font-medium text-red-800 mb-2">محصولات آتش‌زا:</h4>
                      <div className="flex flex-wrap gap-2">
                        {suitableVehiclesData.order.flammableProducts.map((product: any, index: number) => (
                          <Badge key={index} variant="destructive" className="text-xs">
                            <Flame className="h-3 w-3 mr-1" />
                            {product.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Optimal Vehicle */}
              {suitableVehiclesData.optimalVehicle && (
                <Card className="border-2 border-green-500 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      خودرو بهینه (پیشنهاد اول)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">نام:</span>
                        <p className="font-medium">{suitableVehiclesData.optimalVehicle.name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">نوع:</span>
                        <p className="font-medium">{suitableVehiclesData.optimalVehicle.vehicleType}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">هزینه کل:</span>
                        <p className="font-bold text-green-700">{Math.floor(suitableVehiclesData.optimalVehicle.totalCost).toLocaleString()} IQD</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">ظرفیت:</span>
                        <p className="font-medium">{suitableVehiclesData.optimalVehicle.maxWeightKg} کیلوگرم</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">هزینه مسافت:</span>
                        <p className="font-medium">{Math.floor(suitableVehiclesData.optimalVehicle.distanceCost).toLocaleString()} IQD</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">هزینه وزن:</span>
                        <p className="font-medium">{Math.floor(suitableVehiclesData.optimalVehicle.weightCost).toLocaleString()} IQD</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">بهره‌وری وزن:</span>
                        <p className="font-medium">{suitableVehiclesData.optimalVehicle.weightUtilization}%</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {suitableVehiclesData.optimalVehicle.safetyCompliant ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">{suitableVehiclesData.optimalVehicle.safetyCompliant ? 'مطابق ایمنی' : 'نامطابق ایمنی'}</span>
                      </div>
                    </div>
                    {suitableVehiclesData.optimalVehicle.description && (
                      <div className="mt-3 p-2 bg-white rounded border">
                        <span className="text-sm text-gray-600">توضیحات:</span>
                        <p className="text-sm mt-1">{suitableVehiclesData.optimalVehicle.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Alternative Vehicles */}
              {suitableVehiclesData.alternatives && suitableVehiclesData.alternatives.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ArrowUpDown className="h-5 w-5 text-blue-600" />
                      گزینه‌های جایگزین ({suitableVehiclesData.alternatives.length} گزینه)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {suitableVehiclesData.alternatives.map((vehicle: any, index: number) => (
                        <div key={index} className="p-4 border rounded-lg bg-gray-50">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <span className="text-sm text-gray-600">نام:</span>
                              <p className="font-medium">{vehicle.name}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">نوع:</span>
                              <p className="font-medium">{vehicle.vehicleType}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">هزینه کل:</span>
                              <p className="font-bold text-blue-700">{Math.floor(vehicle.totalCost).toLocaleString()} IQD</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">ظرفیت:</span>
                              <p className="font-medium">{vehicle.maxWeightKg} کیلوگرم</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">بهره‌وری وزن:</span>
                              <p className="font-medium">{vehicle.weightUtilization}%</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {vehicle.safetyCompliant ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <X className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-sm">{vehicle.safetyCompliant ? 'مطابق ایمنی' : 'نامطابق ایمنی'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Available Fleet Vehicles Selection */}
              <Card className="border-2 border-orange-500 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5 text-orange-600" />
                    انتخاب از خودروهای آماده ناوگان شرکت
                  </CardTitle>
                  <CardDescription>
                    خودروهایی که نزدیک به انتخاب مشتری هستند و در حال حاضر آماده به کار می‌باشند
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {availableFleetVehicles && availableFleetVehicles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableFleetVehicles.map((vehicle: any) => (
                        <div 
                          key={vehicle.id} 
                          className={`bg-white rounded-lg p-4 border-2 transition-all duration-300 cursor-pointer hover:shadow-lg relative ${
                            vehicle.templateMatchType === 'exact'
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 shadow-lg' 
                              : vehicle.templateMatchType === 'partial'
                              ? 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-200 shadow-md'
                              : vehicle.isCheckoutSuggested 
                              ? 'border-green-500 bg-green-50 ring-2 ring-green-200 shadow-lg' 
                              : 'border-orange-300 hover:border-orange-500'
                          }`}
                          onClick={() => {
                            // Handle vehicle selection
                            console.log('انتخاب خودرو آماده:', vehicle);
                          }}
                        >
                          {/* Template Match Indicator */}
                          {vehicle.templateMatchType === 'exact' && (
                            <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow-md">
                              تطابق دقیق ✨
                            </div>
                          )}
                          {vehicle.templateMatchType === 'partial' && (
                            <div className="absolute -top-2 -right-2 bg-yellow-600 text-white text-xs px-3 py-1 rounded-full shadow-md">
                              تطابق جزئی 🔄
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mb-3">
                            <h4 className={`font-semibold ${
                              vehicle.templateMatchType === 'exact' ? 'text-blue-800' :
                              vehicle.templateMatchType === 'partial' ? 'text-yellow-800' :
                              vehicle.isCheckoutSuggested ? 'text-green-800' : 'text-gray-800'
                            }`}>
                              {vehicle.vehicleTemplateName || vehicle.vehicleName || vehicle.vehicleType}
                            </h4>
                            <div className="flex gap-2">
                              {vehicle.templateMatchType === 'exact' && (
                                <Badge className="bg-blue-600 text-white">
                                  ✨ انتخاب مشتری
                                </Badge>
                              )}
                              {vehicle.templateMatchType === 'partial' && (
                                <Badge className="bg-yellow-600 text-white">
                                  🔄 مشابه انتخاب مشتری
                                </Badge>
                              )}
                              {vehicle.isCheckoutSuggested && !vehicle.templateMatchType && (
                                <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white animate-pulse">
                                  🎯 پیشنهاد سیستم
                                </Badge>
                              )}
                              <Badge className="bg-green-500 text-white">آماده</Badge>
                            </div>
                          </div>
                          
                          {vehicle.templateMatchType === 'exact' && (
                            <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mb-4">
                              <div className="flex items-center gap-2 text-blue-800 text-sm font-medium">
                                <CheckCircle className="w-4 h-4" />
                                ✨ تطابق کامل با قالب انتخابی مشتری - اولویت اول
                              </div>
                            </div>
                          )}
                          
                          {vehicle.templateMatchType === 'partial' && (
                            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4">
                              <div className="flex items-center gap-2 text-yellow-800 text-sm font-medium">
                                <AlertTriangle className="w-4 h-4" />
                                🔄 تطابق جزئی با قالب انتخابی مشتری - اولویت دوم
                              </div>
                            </div>
                          )}
                          
                          {!vehicle.templateMatchType && vehicle.isCheckoutSuggested && (
                            <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-4">
                              <div className="flex items-center gap-2 text-green-800 text-sm font-medium">
                                <CheckCircle className="w-4 h-4" />
                                این خودرو مطابق انتخاب مشتری در سیستم هوشمند است
                              </div>
                            </div>
                          )}
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">شماره پلاک:</span>
                              <span className="font-medium">{vehicle.licensePlate || vehicle.plateNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">راننده:</span>
                              <span className="font-medium">{vehicle.driverName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">تلفن راننده:</span>
                              <span className="font-medium">{vehicle.driverMobile || vehicle.driverPhone}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">ظرفیت:</span>
                              <span className="font-medium">{vehicle.loadCapacity || vehicle.maxWeight} کیلوگرم</span>
                            </div>
                          </div>
                          
                          <Button 
                            className={`w-full transition-all duration-300 ${
                              vehicle.isCheckoutSuggested 
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg' 
                                : 'bg-orange-600 hover:bg-orange-700'
                            } text-white`}
                            onClick={(e) => {
                              e.stopPropagation();
                              assignVehicleToOrder(
                                vehicle.id, 
                                vehicle.licensePlate || vehicle.plateNumber, 
                                vehicle.driverName, 
                                vehicle.driverMobile || vehicle.driverPhone
                              );
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {vehicle.isCheckoutSuggested ? 'اختصاص خودروی پیشنهادی' : 'اختصاص این خودرو'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-400" />
                      <p className="text-orange-600 mb-2">هیچ خودروی آماده‌ای از ناوگان شرکت در دسترس نیست</p>
                      <p className="text-sm text-gray-500">لطفاً از خودروهای مناسب زیر انتخاب کنید</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* All Suitable Vehicles */}
              {suitableVehiclesData.suitableVehicles && suitableVehiclesData.suitableVehicles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Truck className="h-5 w-5 text-purple-600" />
                      تمام خودروهای مناسب ({suitableVehiclesData.suitableVehicles.length} خودرو)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">ردیف</TableHead>
                            <TableHead className="text-right">نام خودرو</TableHead>
                            <TableHead className="text-right">نوع</TableHead>
                            <TableHead className="text-right">هزینه کل</TableHead>
                            <TableHead className="text-right">ظرفیت</TableHead>
                            <TableHead className="text-right">بهره‌وری</TableHead>
                            <TableHead className="text-right">ایمنی</TableHead>
                            <TableHead className="text-right">انتخاب</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {suitableVehiclesData.suitableVehicles.map((vehicle: any, index: number) => (
                            <TableRow key={index} className={index === 0 ? "bg-green-50" : ""}>
                              <TableCell className="font-medium">
                                {index + 1}
                                {index === 0 && <span className="mr-2 text-green-600 text-xs">(بهینه)</span>}
                              </TableCell>
                              <TableCell className="font-medium">{vehicle.name}</TableCell>
                              <TableCell>{vehicle.vehicleType}</TableCell>
                              <TableCell className="font-bold">
                                {Math.floor(vehicle.totalCost).toLocaleString()} IQD
                              </TableCell>
                              <TableCell>{vehicle.maxWeightKg} کگ</TableCell>
                              <TableCell>{vehicle.weightUtilization}%</TableCell>
                              <TableCell>
                                {vehicle.safetyCompliant ? (
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    مطابق
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="bg-red-100 text-red-800">
                                    <X className="h-3 w-3 mr-1" />
                                    نامطابق
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  size="sm" 
                                  variant={index === 0 ? "default" : "outline"}
                                  className={index === 0 ? "bg-green-600 hover:bg-green-700 text-white" : "hover:bg-blue-50"}
                                  onClick={() => {
                                    console.log('انتخاب خودروی مناسب:', vehicle);
                                    // Handle template vehicle selection - create a ready vehicle entry
                                    handleTemplateVehicleSelection(vehicle, index === 0);
                                  }}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  {index === 0 ? 'انتخاب بهینه' : 'انتخاب این خودرو'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Selected Vehicles Summary */}
              {availableFleetVehicles && availableFleetVehicles.length > 0 && (
                <Card className="border-2 border-blue-500 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                      خودروهای انتخاب شده آماده اختصاص ({availableFleetVehicles.length} خودرو)
                    </CardTitle>
                    <CardDescription>
                      این خودروها از قالب‌های مناسب انتخاب شده و آماده اختصاص به سفارش هستند
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {availableFleetVehicles.slice(0, 6).map((vehicle: any, index: number) => (
                        <div 
                          key={vehicle.id || index} 
                          className={`bg-white rounded-lg p-3 border transition-all duration-300 ${
                            vehicle.isCheckoutSuggested 
                              ? 'border-green-500 bg-green-50 ring-1 ring-green-200' 
                              : 'border-blue-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h5 className={`font-medium text-sm ${
                              vehicle.isCheckoutSuggested ? 'text-green-800' : 'text-gray-800'
                            }`}>
                              {vehicle.vehicleType || vehicle.vehicleName}
                            </h5>
                            {vehicle.isCheckoutSuggested && (
                              <Badge className="bg-green-600 text-white text-xs px-1 py-0">
                                🎯 بهینه
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-xs text-gray-600 mb-3">
                            <div className="flex justify-between">
                              <span>پلاک:</span>
                              <span className="font-medium">{vehicle.licensePlate || vehicle.plateNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>ظرفیت:</span>
                              <span className="font-medium">{vehicle.loadCapacity || vehicle.maxWeight} کگ</span>
                            </div>
                            {vehicle.totalCost && (
                              <div className="flex justify-between">
                                <span>هزینه:</span>
                                <span className="font-medium text-blue-700">{Math.floor(vehicle.totalCost).toLocaleString()} IQD</span>
                              </div>
                            )}
                          </div>
                          
                          <Button 
                            size="sm" 
                            className={`w-full text-xs ${
                              vehicle.isCheckoutSuggested 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-blue-600 hover:bg-blue-700'
                            } text-white`}
                            onClick={() => assignVehicleToOrder(
                              vehicle.id, 
                              vehicle.licensePlate || vehicle.plateNumber, 
                              vehicle.driverName, 
                              vehicle.driverMobile || vehicle.driverPhone
                            )}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            اختصاص فوری
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    {availableFleetVehicles.length > 6 && (
                      <div className="mt-4 text-center">
                        <Badge variant="outline" className="text-blue-600">
                          +{availableFleetVehicles.length - 6} خودروی دیگر در دسترس
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsSuitableVehiclesOpen(false)}
            >
              بستن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog - Conditional rendering to prevent Portal errors */}
      {selectedOrderForDetails && isOrderDetailsDialogOpen && (
        <Dialog 
          key={`order-details-${dialogKey}`}
          open={true} 
          onOpenChange={(open) => {
            if (!open) {
              handleCloseOrderDetails();
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-right">
                جزئیات سفارش #{selectedOrderForDetails.orderNumber || selectedOrderForDetails.customerOrderId}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6" dir="rtl">
              {/* Order Status & Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    اطلاعات سفارش
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">شماره سفارش:</span>
                      <span className="font-medium">{selectedOrderForDetails.orderNumber || selectedOrderForDetails.customerOrderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">وضعیت:</span>
                      <span>{getStatusBadge(selectedOrderForDetails.currentStatus)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">مبلغ کل:</span>
                      <span className="font-medium">{Math.floor(parseFloat(selectedOrderForDetails.totalAmount)).toLocaleString()} {selectedOrderForDetails.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">وزن محموله:</span>
                      <span className="font-medium">{selectedOrderForDetails.calculatedWeight || selectedOrderForDetails.totalWeight || 0} {selectedOrderForDetails.weightUnit || 'کگ'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">روش تحویل:</span>
                      <span className="font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                        {selectedOrderForDetails.deliveryMethod || 'مشخص نشده'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">کد تحویل:</span>
                      <span className="font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                        {selectedOrderForDetails.deliveryCode || 'تولید نشده'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-green-50">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    اطلاعات مشتری
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">نام مشتری:</span>
                      <span className="font-medium">
                        {selectedOrderForDetails.customer 
                          ? `${selectedOrderForDetails.customer.firstName || ''} ${selectedOrderForDetails.customer.lastName || ''}`.trim() 
                          : selectedOrderForDetails.customerFirstName && selectedOrderForDetails.customerLastName 
                            ? `${selectedOrderForDetails.customerFirstName} ${selectedOrderForDetails.customerLastName}` 
                            : 'نامشخص'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">تلفن:</span>
                      <span className="font-medium">{selectedOrderForDetails.customer?.phone || selectedOrderForDetails.customerPhone || 'ثبت نشده'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">ایمیل:</span>
                      <span className="font-medium">{selectedOrderForDetails.customer?.email || selectedOrderForDetails.customerEmail || 'ثبت نشده'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Information */}
              <div className="border rounded-lg p-4 bg-orange-50">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  اطلاعات تحویل
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600 mb-1">آدرس ارسال:</p>
                    <p className="font-medium">
                      {(() => {
                        const shippingData = selectedOrderForDetails.shippingAddress;
                        if (typeof shippingData === 'object' && shippingData !== null) {
                          return [(shippingData as any).address, (shippingData as any).city].filter(Boolean).join(', ') || 'آدرس ثبت نشده';
                        }
                        return shippingData || selectedOrderForDetails.customerAddress || 'آدرس ثبت نشده';
                      })()}
                    </p>
                  </div>
                  {selectedOrderForDetails.recipientName && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">گیرنده:</p>
                      <p className="font-medium">{selectedOrderForDetails.recipientName}</p>
                      {selectedOrderForDetails.recipientPhone && (
                        <p className="text-sm text-gray-500">{selectedOrderForDetails.recipientPhone}</p>
                      )}
                    </div>
                  )}
                  {selectedOrderForDetails.hasGpsLocation && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">موقعیت جغرافیایی:</p>
                      <p className="text-sm text-green-600">✓ موقعیت GPS ثبت شده</p>
                      <p className="text-xs text-gray-500">
                        Lat: {selectedOrderForDetails.gpsLatitude}, Lng: {selectedOrderForDetails.gpsLongitude}
                      </p>
                    </div>
                  )}
                  {selectedOrderForDetails.deliveryNotes && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600 mb-1">توضیحات تحویل:</p>
                      <p className="font-medium">{selectedOrderForDetails.deliveryNotes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tracking Information */}
              {(selectedOrderForDetails.trackingNumber || selectedOrderForDetails.deliveryPersonName || (selectedOrderForDetails as any).vehicleType) && (
                <div className="border rounded-lg p-4 bg-purple-50">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    اطلاعات ردیابی
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedOrderForDetails.trackingNumber && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">کد رهگیری:</p>
                        <p className="font-medium">{selectedOrderForDetails.trackingNumber}</p>
                      </div>
                    )}
                    {selectedOrderForDetails.deliveryPersonName && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">تحویل‌دهنده:</p>
                        <p className="font-medium">{selectedOrderForDetails.deliveryPersonName}</p>
                        {selectedOrderForDetails.deliveryPersonPhone && (
                          <p className="text-sm text-gray-500">{selectedOrderForDetails.deliveryPersonPhone}</p>
                        )}
                      </div>
                    )}
                    {(selectedOrderForDetails as any).vehicleType && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">نوع خودرو:</p>
                        <p className="font-medium">{(selectedOrderForDetails as any).vehicleType}</p>
                        {(selectedOrderForDetails as any).vehiclePlate && (
                          <p className="text-sm text-gray-500">پلاک: {(selectedOrderForDetails as any).vehiclePlate}</p>
                        )}
                      </div>
                    )}
                    {selectedOrderForDetails.estimatedDeliveryDate && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">تاریخ تحویل تقریبی:</p>
                        <p className="font-medium">{new Date(selectedOrderForDetails.estimatedDeliveryDate).toLocaleDateString('fa-IR')}</p>
                      </div>
                    )}
                    {selectedOrderForDetails.actualDeliveryDate && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">تاریخ تحویل واقعی:</p>
                        <p className="font-medium">{new Date(selectedOrderForDetails.actualDeliveryDate).toLocaleDateString('fa-IR')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Financial Information */}
              {(selectedOrderForDetails as any).financialReviewedAt && (
                <div className="border rounded-lg p-4 bg-yellow-50">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    اطلاعات مالی
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">تاریخ بررسی مالی:</p>
                      <p className="font-medium">{new Date((selectedOrderForDetails as any).financialReviewedAt).toLocaleDateString('en-GB')}</p>
                    </div>
                    {(selectedOrderForDetails as any).financialNotes && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">یادداشت‌های مالی:</p>
                        <p className="font-medium">{(selectedOrderForDetails as any).financialNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => handlePrintOrder(selectedOrderForDetails)}
                className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              >
                <Printer className="w-4 h-4" />
                چاپ جزئیات
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCloseOrderDetails}
              >
                بستن
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Two-step Delivery Confirmation Dialog */}
      <AlertDialog open={deliveryConfirmDialogOpen} onOpenChange={setDeliveryConfirmDialogOpen}>
        <AlertDialogContent dir="rtl" className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className={deliveryConfirmStep === 1 ? "text-amber-600" : "text-red-600"}>
              {deliveryConfirmStep === 1 
                ? "تایید تحویل سفارش - مرحله ۱ از ۲" 
                : "تایید نهایی تحویل - مرحله ۲ از ۲"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 text-right">
              {deliveryConfirmStep === 1 ? (
                <div className="space-y-3">
                  <p className="text-base font-medium text-gray-800">
                    آیا مطمئن هستید که می‌خواهید تحویل این سفارش را تایید کنید؟
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm font-bold text-blue-800 mb-2">اطلاعات سفارش:</p>
                    <p className="text-sm text-blue-700">
                      شماره سفارش: <span className="font-bold">{getConfirmingDeliveryOrder()?.orderNumber}</span>
                    </p>
                    <p className="text-sm text-blue-700">
                      مشتری: <span className="font-bold">
                        {getConfirmingDeliveryOrder()?.customer?.firstName} {getConfirmingDeliveryOrder()?.customer?.lastName}
                      </span>
                    </p>
                    <p className="text-sm text-blue-700">
                      کد تحویل: <span className="font-bold">{getConfirmingDeliveryOrder()?.deliveryCode || 'بدون کد'}</span>
                    </p>
                  </div>
                  <p className="text-sm text-amber-600 font-medium">
                    لطفاً اطلاعات را با دقت بررسی کنید و در صورت صحت، ادامه دهید.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-base font-bold text-red-800 mb-2">
                      هشدار: این عملیات غیرقابل بازگشت است!
                    </p>
                    <p className="text-sm text-red-700">
                      پس از تایید نهایی، وضعیت سفارش به "تحویل داده شده" تغییر خواهد کرد.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-bold text-gray-800 mb-2">تایید نهایی برای سفارش:</p>
                    <p className="text-lg font-bold text-gray-900">
                      {getConfirmingDeliveryOrder()?.orderNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      {getConfirmingDeliveryOrder()?.customer?.firstName} {getConfirmingDeliveryOrder()?.customer?.lastName}
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
              onClick={handleDeliveryConfirmCancel}
              className="flex-1"
            >
              انصراف
            </AlertDialogCancel>
            {deliveryConfirmStep === 1 ? (
              <Button 
                onClick={handleDeliveryConfirmStep1}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
                data-testid="button-delivery-step1"
              >
                ادامه به مرحله بعد
              </Button>
            ) : (
              <Button 
                onClick={handleDeliveryConfirmStep2}
                className="flex-1 bg-red-600 hover:bg-red-700"
                data-testid="button-delivery-step2"
              >
                تایید نهایی تحویل
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );


};

export default LogisticsManagement;