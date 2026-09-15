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
  Info,
  ChevronDown,
  ChevronUp
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
import { useLanguage } from '@/contexts/LanguageContext';
import { logisticsLocale, logisticsT, type LogisticsLanguage } from './logistics-translations';

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
  const { language: contextLanguage, direction } = useLanguage();
  const language = (['en', 'fa', 'ar', 'tr'].includes(contextLanguage) ? contextLanguage : 'en') as LogisticsLanguage;
  const vehicleT = (key: string) => logisticsT(language, key);
  const vehicleLocale = logisticsLocale(language);
  const [viewMode, setViewMode] = useState<'overview' | 'details'>('overview');
  const [selectedPlate, setSelectedPlate] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<'plate' | 'driver' | 'phone' | 'order'>('plate');

  // Get vehicle usage statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/logistics/vehicle-stats'],
    queryFn: () => apiRequest('/api/logistics/vehicle-stats', { method: 'GET' }),
  });

  // Get all vehicle delivery history with search
  const { data: allHistoryData, isLoading: allHistoryLoading, refetch: refetchHistory } = useQuery({
    queryKey: [
      '/api/logistics/vehicle-history',
      searchQuery,
      searchType,
      currentPage,
      pageSize,
      dateRange.from?.toISOString(),
      dateRange.to?.toISOString()
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery && searchQuery.length >= 3) {
        params.append('search', searchQuery);
        params.append('searchType', searchType);
      }
      if (selectedPlate) params.append('plateNumber', selectedPlate);
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      if (dateRange.from) params.append('startDate', dateRange.from.toISOString());
      if (dateRange.to) params.append('endDate', dateRange.to.toISOString());
      
      return apiRequest(`/api/logistics/vehicle-history?${params.toString()}`, { method: 'GET' });
    },
  });

  // Get vehicle delivery history for specific plate
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

  const handleSearch = () => {
    if (searchQuery.trim() && searchQuery.length >= 3) {
      setCurrentPage(1);
      refetchHistory();
    }
  };

  const handlePlateClick = (plate: string) => {
    setSelectedPlate(plate);
    setViewMode('details');
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setSelectedPlate("");
    setSearchQuery("");
    setCurrentPage(1);
    setDateRange({});
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(vehicleLocale, {
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
         {status === 'completed' ? vehicleT('completed') :
          status === 'failed' ? vehicleT('error') :
          status === 'cancelled' ? vehicleT('cancelled') : vehicleT('pending')}
      </Badge>
    );
  };

  if (viewMode === 'overview') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {vehicleT('vehicleHistory')}
          </CardTitle>
          <CardDescription>
            {vehicleT('vehicleHistoryDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Search Section */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                <Search className="w-4 h-4" />
                {vehicleT('historySearch')}
              </h4>
              <div className="flex gap-3 items-end flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="search-query">{vehicleT('searchTerm')}</Label>
                  <Input
                    id="search-query"
                    placeholder={vehicleT('historyPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div className="w-[150px]">
                  <Label>{vehicleT('searchType')}</Label>
                  <Select value={searchType} onValueChange={(v) => setSearchType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plate">{vehicleT('searchPlate')}</SelectItem>
                      <SelectItem value="driver">{vehicleT('searchDriver')}</SelectItem>
                      <SelectItem value="phone">{vehicleT('searchPhone')}</SelectItem>
                      <SelectItem value="order">{vehicleT('searchOrder')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[140px]">
                  <Label>{vehicleT('fromDate')}</Label>
                  <Input
                    type="date"
                    value={dateRange.from?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value ? new Date(e.target.value) : undefined }))}
                  />
                </div>
                <div className="w-[140px]">
                  <Label>{vehicleT('toDate')}</Label>
                  <Input
                    type="date"
                    value={dateRange.to?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value ? new Date(e.target.value) : undefined }))}
                  />
                </div>
                <Button 
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || searchQuery.length < 3}
                  className="flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  {vehicleT('search')}
                </Button>
              </div>
              {searchQuery && searchQuery.length < 3 && (
                <p className="text-xs text-orange-600 mt-2">{vehicleT('minThree')}</p>
              )}
            </div>

            {/* Search Results */}
            {allHistoryData?.data && allHistoryData.data.length > 0 && searchQuery.length >= 3 && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4 className="font-medium text-green-800 mb-3">
                    {vehicleT('searchResults')} ({allHistoryData.data.length})
                </h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {allHistoryData.data.map((item: any) => (
                    <div 
                      key={item.id}
                      className="bg-white rounded-lg p-3 border flex justify-between items-center cursor-pointer hover:bg-green-50"
                      onClick={() => handlePlateClick(item.plateNumber)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-100 px-2 py-1 rounded text-sm font-bold text-blue-800">
                          {item.plateNumber}
                        </div>
                        <div>
                          <span className="text-sm font-medium">{item.driverName || vehicleT('unknownDriver')}</span>
                          <span className="text-xs text-gray-500 mr-2">| {vehicleT('orderLabel')}: {item.orderNumber}</span>
                        </div>
                      </div>
                      <div className="text-left text-xs text-gray-500">
                        {item.deliveryDateTime ? new Intl.DateTimeFormat(vehicleLocale).format(new Date(item.deliveryDateTime)) : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overview Statistics */}
            {statsData?.data?.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{vehicleT('overview')}</h3>
                  <Badge variant="outline">
                    {statsData.data.length} {vehicleT('vehicles')}
                  </Badge>
                </div>
                
                <ScrollArea className="h-[400px]">
                  <div className="grid gap-4">
                    {statsData.data.map((stat: VehicleUsageStats) => (
                      <Card key={stat.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handlePlateClick(stat.plateNumber)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Car className="h-8 w-8 text-blue-500" />
                            <div>
                              <h3 className="font-semibold text-lg">{stat.plateNumber}</h3>
                              <p className="text-sm text-muted-foreground">
                                {stat.totalDeliveries} {vehicleT('deliveries')} | {Math.round(Number(stat.totalDistance) || 0)} {vehicleT('unitKm')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">{formatCurrency(Number(stat.totalRevenue) || 0)}</div>
                            <div className="text-sm text-muted-foreground">
                              {Math.round(Number(stat.onTimeDeliveryRate) || 0)}% {vehicleT('onTime')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-semibold text-green-600">
                              {stat.successfulDeliveries}
                            </div>
                              <div className="text-xs text-muted-foreground">{vehicleT('successful')}</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-red-600">
                              {stat.failedDeliveries}
                            </div>
                              <div className="text-xs text-muted-foreground">{vehicleT('failed')}</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-yellow-600">
                              {stat.averageRating ? Number(stat.averageRating).toFixed(1) : 'N/A'}
                            </div>
                              <div className="text-xs text-muted-foreground">{vehicleT('rating')}</div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {statsLoading ? vehicleT('loading') : vehicleT('empty')}
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
              {vehicleT('back')}
            </Button>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                {vehicleT('vehicleDetails')} {selectedPlate}
              </CardTitle>
              <CardDescription>
                {vehicleT('performanceDetails')}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {historyLoading || summaryLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            {vehicleT('loadingDetails')}
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
                    <div className="text-sm text-muted-foreground">{vehicleT('totalDeliveries')}</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(Number(summaryData.data.stats.onTimeDeliveryRate) || 0)}%
                  </div>
                    <div className="text-sm text-muted-foreground">{vehicleT('onTime')}</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(Number(summaryData.data.stats.totalRevenue) || 0)}
                  </div>
                    <div className="text-sm text-muted-foreground">{vehicleT('revenue')}</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {summaryData.data.stats.averageRating ? Number(summaryData.data.stats.averageRating).toFixed(1) : 'N/A'}
                  </div>
                    <div className="text-sm text-muted-foreground">{vehicleT('averageRating')}</div>
                </Card>
              </div>
            )}

            {/* Delivery History Table */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{vehicleT('deliveryHistory')}</h3>
              <div className="overflow-x-auto"><Table className="min-w-[900px] border border-slate-200">
                <TableHeader className="sticky top-0 bg-slate-700">
                  <TableRow>
                    <TableHead className="border-e border-slate-600 text-start text-slate-50">{vehicleT('searchOrder')}</TableHead>
                    <TableHead className="border-e border-slate-600 text-start text-slate-50">{vehicleT('customer')}</TableHead>
                    <TableHead className="border-e border-slate-600 text-start text-slate-50">{vehicleT('destination')}</TableHead>
                    <TableHead className="border-e border-slate-600 text-start text-slate-50">{vehicleT('weight')}</TableHead>
                    <TableHead className="border-e border-slate-600 text-start text-slate-50">{vehicleT('cost')}</TableHead>
                    <TableHead className="border-e border-slate-600 text-start text-slate-50">{vehicleT('status')}</TableHead>
                    <TableHead className="border-e border-slate-600 text-start text-slate-50">{vehicleT('deliveryDate')}</TableHead>
                    <TableHead className="text-start text-slate-50">{vehicleT('rating')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.data.map((delivery: VehicleDeliveryHistory) => (
                    <TableRow key={delivery.id} className="border-slate-200 odd:bg-slate-50 even:bg-white hover:bg-amber-50">
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
                          new Intl.DateTimeFormat(vehicleLocale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(delivery.deliveryDateTime)) :
                          vehicleT('unknown')
                        }
                      </TableCell>
                      <TableCell>
                        {delivery.customerRating ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{Number(delivery.customerRating).toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{vehicleT('noRating')}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {selectedPlate ? vehicleT('noResults') : vehicleT('searchDelivered')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Safe date formatting function to prevent Invalid Date errors
const formatDateSafe = (dateString: string | null | undefined, locale = 'en-US', options = {}, language: LogisticsLanguage = 'en'): string => {
  if (!dateString) return logisticsT(language, 'unknownDate');
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return logisticsT(language, 'invalidDate');
    
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    });
  } catch (error) {
    return logisticsT(language, 'dateError');
  }
};

// Status display name mapping function
const getStatusDisplayName = (status: string, language: LogisticsLanguage = 'en'): string => {
  const statusMap: Record<string, string> = {
    pending: 'pending', confirmed: 'confirmed', financial_review: 'pending',
    warehouse_pending: 'pending', warehouse_ready: 'confirmed', warehouse_processing: 'pending',
    logistics_pending: 'pending', logistics_assigned: 'confirmed', logistics_dispatched: 'inTransit',
    in_transit: 'inTransit', delivered: 'completed', cancelled: 'cancelled', returned: 'returned',
  };
  return logisticsT(language, statusMap[status] || '') || status;
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
  shippingAddress?: string | { city?: string; name?: string; phone?: string; address?: string; postalCode?: string };
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
  const { language: contextLanguage, direction } = useLanguage();
  const language = (['en', 'fa', 'ar', 'tr'].includes(contextLanguage) ? contextLanguage : 'en') as LogisticsLanguage;
  const t = (key: string) => logisticsT(language, key);
  const temporaryDriverValue = 'راننده موقت';
  const displayDriverName = (name?: string) => name === temporaryDriverValue ? t('temporaryDriver') : name;
  const locale = logisticsLocale(language);
  const formatLogisticsDate = (value?: string, withTime = false) => {
    if (!value) return t('unknown');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t('unknown');
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(date);
  };
  const formatLogisticsCurrency = (value: string | number) => new Intl.NumberFormat(locale, {
    style: 'currency', currency: 'IQD', maximumFractionDigits: 0,
  }).format(Number(value) || 0);
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
  const [expandedVehicleIds, setExpandedVehicleIds] = useState<Set<number>>(new Set());
  const [expandedOrderVehicleId, setExpandedOrderVehicleId] = useState<number | null>(null);
  const [expandedOrderAddressId, setExpandedOrderAddressId] = useState<number | null>(null);
  
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

  // State for updating delivery method
  const [updatingDeliveryMethod, setUpdatingDeliveryMethod] = useState<{[orderId: number]: boolean}>({});

  // Function to update delivery method for an order
  const updateDeliveryMethod = async (orderManagementId: number, customerOrderId: number, deliveryMethod: string) => {
    setUpdatingDeliveryMethod(prev => ({ ...prev, [orderManagementId]: true }));
    try {
      const response = await apiRequest(`/api/order-management/${orderManagementId}/delivery-method`, {
        method: 'PATCH',
        body: { deliveryMethod, customerOrderId }
      });
      
      if (response.success) {
        toast({
          title: t('success'),
          description: t('deliveryMethodChanged').replace('{method}',
            deliveryMethod === 'postal' ? t('postalMethod') :
            deliveryMethod === 'smart_vehicle' ? t('smartVehicleMethod') :
            deliveryMethod === 'self_pickup' ? t('selfPickupMethod') :
            deliveryMethod === 'freight_collect' ? t('freightCollectMethod') : deliveryMethod),
        });
        // Refresh orders to show updated delivery method
        queryClient.invalidateQueries({ queryKey: ['/api/order-management/logistics'] });
      } else {
        toast({
          title: t('error'),
          description: response.message || t('deliveryMethodError'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Error updating delivery method:', error);
      toast({
        title: t('error'),
        description: t('serverConnectionError'),
        variant: 'destructive',
      });
    } finally {
      setUpdatingDeliveryMethod(prev => ({ ...prev, [orderManagementId]: false }));
    }
  };

  // Fleet vehicles API integration (previously "ready vehicles")
  const { data: fleetVehiclesData, isLoading: loadingFleetVehicles } = useQuery({
    queryKey: ['/api/logistics/ready-vehicles'],
    enabled: activeTab === 'orders' || activeTab === 'delivered' || activeTab === 'fleet-vehicles'
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
      toast({ title: t('success'), description: t('readyVehicleCreatedFull') });
    },
    onError: (error: any) => {
      toast({ 
        title: t('error'),
        description: error?.response?.data?.message || t('readyVehicleError'),
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
      toast({ title: t('success'), description: t('readyVehicleUpdatedFull') });
    },
    onError: (error: any) => {
      toast({ 
        title: t('error'),
        description: error?.response?.data?.message || t('readyVehicleError'),
        variant: "destructive" 
      });
    }
  });

  // Delete ready vehicle mutation
  const deleteReadyVehicleMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/logistics/ready-vehicles/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logistics/ready-vehicles'] });
      toast({ title: t('success'), description: t('readyVehicleDeletedFull') });
    },
    onError: (error: any) => {
      toast({ 
        title: t('error'),
        description: error?.response?.data?.message || t('operationFailed'),
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
      title: `🔄 ${t('update')}`,
      description: t('refreshDescription'),
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
    customerAddress: order.customerAddress || t('noAddressRegistered'),
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
    enabled: activeTab === 'cities' || activeTab === 'geography' || activeTab === 'international'
  });

  // Geography data for new geography tab (also enabled for international tab)
  const { data: geographyProvincesResponse, isLoading: loadingGeographyProvinces } = useQuery({
    queryKey: ['/api/logistics/provinces-detailed'],
    enabled: activeTab === 'geography' || activeTab === 'international'
  });

  const { data: geographyCitiesResponse, isLoading: loadingGeographyCities } = useQuery({
    queryKey: ['/api/logistics/cities-detailed'],
    enabled: activeTab === 'geography' || activeTab === 'international'
  });

  // Vehicle optimization states
  const [isCreateVehicleDialogOpen, setIsCreateVehicleDialogOpen] = useState(false);
  const [optimizationRequest, setOptimizationRequest] = useState<any>({});

  const { data: citiesResponse, isLoading: loadingCities } = useQuery({
    queryKey: ['/api/logistics/cities'],
    enabled: activeTab === 'cities' || activeTab === 'geography' || activeTab === 'international'
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
      toast({ title: t('success'), description: t('templateCreated') });
    },
    onError: () => {
      toast({ title: t('error'), description: t('templateCreateError'), variant: "destructive" });
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
      toast({ title: t('success'), description: t('templateUpdated') });
    },
    onError: () => {
      toast({ title: t('error'), description: t('templateUpdateError'), variant: "destructive" });
    }
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id: number) => 
      fetch(`/api/logistics/vehicle-templates/${id}`, {
        method: 'DELETE'
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logistics/vehicle-templates'] });
      toast({ title: t('success'), description: t('templateDeleted') });
    },
    onError: () => {
      toast({ title: t('error'), description: t('templateDeleteError'), variant: "destructive" });
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
        title: t('optimizeSuccess'),
        description: t('selectedVehicle').replace('{vehicle}', String(result.data.selectedVehicle.vehicleName)).replace('{cost}', `${parseInt(result.data.selectedVehicle.totalCost)} ${t('currencyIqd')}`)
      });
    },
    onError: () => {
      toast({ title: t('error'), description: t('optimizeError'), variant: "destructive" });
    }
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'warehouse_approved': { color: 'bg-blue-500', text: t('warehouseApprovedStatus') },
      'logistics_assigned': { color: 'bg-yellow-500', text: t('logisticsAssignedStatus') },
      'logistics_processing': { color: 'bg-orange-500', text: t('processingStatus') },
      'logistics_dispatched': { color: 'bg-purple-500', text: t('dispatchedStatus') },
      'logistics_delivered': { color: 'bg-green-500', text: t('deliveredStatus') },
      'available': { color: 'bg-green-500', text: t('freeStatus') },
      'assigned': { color: 'bg-yellow-500', text: t('assignedStatus') },
      'in_transit': { color: 'bg-blue-500', text: t('inTransit') },
      'maintenance': { color: 'bg-red-500', text: t('maintenanceStatus') },
      'offline': { color: 'bg-gray-500', text: t('offlineStatus') },
    };
    const config = (statusMap as any)[status] || { color: 'bg-gray-500', text: status };
    return <Badge className={config.color}>{config.text}</Badge>;
  };



  // Handle enhanced vehicle assignment workflow
  // Smart vehicle recommendation based on template matching
  const getRecommendedVehicles = (order: LogisticsOrder, availableVehicles: any[], suitableTemplates: any[]) => {
    const orderWeight = Number(order.calculatedWeight ?? order.totalWeight ?? 0) || 0;
    const shippingAddress = order.shippingAddress;
    let orderCity = '';
    if (typeof shippingAddress === 'string') {
      try {
        orderCity = JSON.parse(shippingAddress)?.city || '';
      } catch {
        orderCity = '';
      }
    } else if (shippingAddress && typeof shippingAddress === 'object') {
      orderCity = (shippingAddress as { city?: string }).city || '';
    }
    
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
        reasons.push(t('recommendationTemplateMatch'));
        
        // Weight efficiency scoring
        const weightCapacity = Number(matchingTemplate.maxWeightKg) || Number(vehicle.loadCapacity) || 0;
        if (weightCapacity > 0) {
          const utilizationRate = orderWeight / weightCapacity;
          if (utilizationRate >= 0.7 && utilizationRate <= 0.9) {
            score += 30; // Optimal utilization
            reasons.push(t('recommendationOptimalCapacity'));
          } else if (utilizationRate >= 0.5 && utilizationRate < 0.7) {
            score += 20; // Good utilization
            reasons.push(t('recommendationGoodCapacity'));
          } else if (utilizationRate < 0.5) {
            score += 10; // Underutilized but safe
            reasons.push(t('recommendationExtraCapacity'));
          }
        }
        
        // Route compatibility
        if (matchingTemplate.allowedRoutes?.includes('urban') && orderCity) {
          score += 15;
          reasons.push(t('recommendationUrbanTransport'));
        }
        
        // Cost efficiency
        const totalCost = Number(matchingTemplate.basePrice) +
                         (Number(matchingTemplate.pricePerKm) * 10) + // Assume 10km average
                         (Number(matchingTemplate.pricePerKg) * orderWeight);
        
        if (totalCost < 100000) {
          score += 20;
          reasons.push(t('recommendationEconomicalCost'));
        } else if (totalCost < 200000) {
          score += 10;
          reasons.push(t('recommendationModerateCost'));
        }
      }
      
      // Vehicle availability and status
      if (vehicle.isAvailable !== false && vehicle.status !== 'maintenance') {
        score += 25;
        reasons.push(t('recommendationReady'));
      }
      
      // Driver availability
      if (vehicle.driverName && vehicle.driverName !== temporaryDriverValue) {
        score += 15;
        reasons.push(t('recommendationAssignedDriver'));
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
      
      // NOTE: Do NOT open modal here - wait for API response to determine which modal to open
      
      // Get all suitable vehicles identified during checkout
      const suitableVehiclesResponse = await fetch(`/api/orders/${order.customerOrderId}/suitable-vehicles`, {
        credentials: 'include'
      });
      
      if (suitableVehiclesResponse.ok) {
        const suitableVehiclesData = await suitableVehiclesResponse.json();
        if (suitableVehiclesData.success) {
          setSuitableVehiclesData(suitableVehiclesData.data);
          console.log('✅ [SUITABLE VEHICLES] Found vehicles:', suitableVehiclesData.data.suitableVehicles.length);
          
          // Set ready fleet vehicles from API response (filtered by customer's template)
          if (suitableVehiclesData.data.readyFleetVehicles && suitableVehiclesData.data.readyFleetVehicles.length > 0) {
            // Map ready fleet vehicles to match expected format with template match indicators
            const mappedFleetVehicles = suitableVehiclesData.data.readyFleetVehicles.map((rv: any) => ({
              ...rv,
              vehicleName: rv.templateName,
              vehicleTemplateName: rv.templateName,
              vehicleType: rv.templateVehicleType,
              templateMatchType: rv.isTemplateMatch ? 'exact' : null,
              isCheckoutSuggested: false
            }));
            setAvailableFleetVehicles(mappedFleetVehicles);
            console.log(`✅ [READY FLEET] Set ${mappedFleetVehicles.length} filtered fleet vehicles (customer template: ${suitableVehiclesData.data.order?.customerVehicleType})`);
          }
          
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
              matchReason: t('exactTemplateMatch').replace('{vehicle}', checkoutVehicleDetails.vehicleType)
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
              matchReason: t('partialTemplateMatch').replace('{vehicle}', checkoutVehicleDetails.vehicleType)
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
              matchReason: t('alternativeCapacity')
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
              driverName: temporaryDriverValue,
              driverPhone: '',
              driverMobile: '',
              loadCapacity: v.maxLoadKg || v.maxWeight || 10000,
              maxWeight: v.maxLoadKg || v.maxWeight || 10000,
              isAvailable: v.currentStatus === 'available',
              color: v.color,
              matchType: 'alternative',
              matchReason: t('companyFleetVehicle'),
              isCheckoutSuggested: false
            }));
          }
        }
        
        setAvailableFleetVehicles(availableVehicles);
        console.log('✅ [VEHICLE ASSIGNMENT] Dialog opened with', availableVehicles.length, 'vehicles available');
        
        // Open the vehicle assignment dialog after loading vehicles
        setIsVehicleAssignmentOpen(true);
        
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
            driverName: temporaryDriverValue,
            driverPhone: '',
            driverMobile: '',
            loadCapacity: v.maxLoadKg || v.maxWeight || 10000,
            maxWeight: v.maxLoadKg || v.maxWeight || 10000,
            isAvailable: v.currentStatus === 'available',
            color: v.color,
            matchType: 'alternative',
              matchReason: t('companyFleetVehicle'),
            isCheckoutSuggested: false
          }));
          
          setAvailableFleetVehicles(mappedVehicles);
        } else {
          console.error('❌ [FLEET VEHICLES] Failed to fetch fleet vehicles');
          setAvailableFleetVehicles([]);
        }
        
        // Open the vehicle assignment dialog after loading vehicles
        setIsVehicleAssignmentOpen(true);
      }
    } catch (error) {
      console.error('❌ [VEHICLE ASSIGNMENT ERROR]:', error);
      toast({
        title: t('error'),
        description: t('vehiclesLoadError'),
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
          title: t('success'),
          description: t('vehicleAssigned')
        });
        
        // Refresh the orders list
        queryClient.invalidateQueries({ queryKey: ['/api/order-management/logistics'] });
        setIsVehicleAssignmentOpen(false);
      } else if (response.status === 409) {
        // Vehicle is already assigned to another undelivered order
        const errorData = await response.json();
        toast({
          title: t('vehicleUnavailable'),
          description: errorData.message || t('vehicleAlreadyAssigned'),
          variant: "destructive"
        });
      } else {
        throw new Error('Assignment failed');
      }
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      toast({
        title: t('error'),
        description: t('vehicleAssignmentError'),
        variant: "destructive"
      });
    }
  };

  // Handler for selecting vehicles from suitable vehicles list
  const handleTemplateVehicleSelection = async (vehicle: any, isOptimal: boolean = false) => {
    if (!selectedOrderForVehicle) {
      toast({
        title: t('error'),
        description: t('noOrderSelected'),
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
        driverName: temporaryDriverValue,
        driverPhone: '09120000000',
        licensePlate: `TMP-${Date.now()}`,
        maxWeight: vehicle.maxWeightKg,
        loadCapacity: vehicle.maxWeightKg,
        status: 'available',
        isCheckoutSuggested: isOptimal,
        totalCost: vehicle.totalCost,
        notes: `${t('readyVehicleFromTemplate')}: ${vehicle.name} - ${isOptimal ? t('optimalSelectionSystem') : t('manualSelection')}`
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
          title: isOptimal ? `🎯 ${t('optimalVehicleAdded')}` : `✅ ${t('vehicleAdded')}`,
          description: `${vehicle.name}: ${t('readyVehicleFromTemplate')}`,
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
        title: t('error'),
        description: t('readyVehicleCreateError'),
        variant: "destructive"
      });
    }
  };

  const VEHICLE_TYPES = {
    motorcycle: t('vehicleTypeMotorcycle'),
    bicycle: t('vehicleTypeBicycle'),
    scooter: t('vehicleTypeScooter'),
    van: t('vehicleTypeVan'),
    pickup: t('vehicleTypePickup'),
    small_truck: t('vehicleTypeSmallTruck'),
    light_truck: t('vehicleTypeLightTruck'),
    medium_truck: t('vehicleTypeMediumTruck'),
    heavy_truck: t('vehicleTypeHeavyTruck'),
    articulated_truck: t('vehicleTypeArticulatedTruck'),
    tanker: t('vehicleTypeTanker'),
    refrigerated_truck: t('vehicleTypeRefrigeratedTruck'),
    flatbed_truck: t('vehicleTypeFlatbedTruck'),
    container_truck: t('vehicleTypeContainerTruck'),
    crane_truck: t('vehicleTypeCraneTruck'),
    dump_truck: t('vehicleTypeDumpTruck'),
    cargo_van: t('vehicleTypeCargoVan'),
    mini_bus: t('vehicleTypeMiniBus'),
    bus: t('vehicleTypeBus'),
    trailer: t('vehicleTypeTrailer')
  };

  const ROUTE_TYPES = {
    urban: t('routeUrban'),
    interurban: t('routeInterurban'),
    highway: t('routeHighway')
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
      toast({ title: t('error'), description: t('requiredFields'), variant: "destructive" });
      return;
    }
    optimizeVehicleMutation.mutate(optimizationRequest);
  };

  const handleDeleteVehicle = (vehicleId: number) => {
    if (confirm(t('deleteTemplateQuestion'))) {
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
                {t('templateManagement')}
              </h2>
              <p className="text-muted-foreground text-sm">{t('templateManagementDescription')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-medium">{t('vehicleTemplates')}</h3>
              <Dialog open={isCreateVehicleDialogOpen} onOpenChange={setIsCreateVehicleDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 ml-2" />
                    {t('addTemplate')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl" dir={direction}>
                  <DialogHeader>
                    <DialogTitle>{t('addTemplateTitle')}</DialogTitle>
                    <DialogDescription>{t('templateDescription')}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); handleCreateVehicle(new FormData(e.currentTarget)); }}>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t('persianName')}</Label>
                        <Input id="name" name="name" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nameEn">{t('englishName')}</Label>
                        <Input id="nameEn" name="nameEn" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vehicleType">{t('vehicleType')}</Label>
                        <select name="vehicleType" required className="w-full p-2 border rounded">
                          <option value="">{t('selectVehicleType')}</option>
                          {Object.entries(VEHICLE_TYPES).map(([key, value]) => (
                            <option key={key} value={key}>{value}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxWeightKg">{t('maxWeight')}</Label>
                        <Input id="maxWeightKg" name="maxWeightKg" type="number" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="basePrice">{t('basePrice')}</Label>
                        <Input id="basePrice" name="basePrice" type="number" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pricePerKm">{t('pricePerKm')}</Label>
                        <Input id="pricePerKm" name="pricePerKm" type="number" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="allowedRoutes">{t('allowedRoutes')}</Label>
                        <Input id="allowedRoutes" name="allowedRoutes" placeholder="urban,interurban,highway" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="averageSpeedKmh">{t('averageSpeed')}</Label>
                        <Input id="averageSpeedKmh" name="averageSpeedKmh" type="number" defaultValue="50" />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label className="flex items-center gap-2">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <Shield className="h-4 w-4 text-red-500" />
                          {t('hazardousCapability')}
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-gray-600">{t('flammable')}</Label>
                            <Select name="supportsFlammable">
                              <SelectTrigger>
                                <SelectValue placeholder={t('select')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">{t('permitted')}</SelectItem>
                                <SelectItem value="false">{t('notPermitted')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-gray-600">{t('hazardous')}</Label>
                            <Select name="supportsHazardous">
                              <SelectTrigger>
                                <SelectValue placeholder={t('select')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">{t('permitted')}</SelectItem>
                                <SelectItem value="false">{t('notPermitted')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCreateVehicleDialogOpen(false)}>{t('cancel')}</Button>
                      <Button type="submit" disabled={createVehicleMutation.isPending}>
                        {createVehicleMutation.isPending ? t('creatingTemplate') : t('createTemplate')}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto"><Table className="min-w-[980px] border border-slate-200">
                  <TableHeader className="sticky top-0 bg-slate-700">
                    <TableRow>
                      <TableHead className="border-e border-slate-600 text-start text-slate-50">{t('name')}</TableHead>
                      <TableHead className="border-e border-slate-600 text-start text-slate-50">{t('type')}</TableHead>
                      <TableHead className="border-e border-slate-600 text-start text-slate-50">{t('maxWeight')}</TableHead>
                      <TableHead className="border-e border-slate-600 text-start text-slate-50">{t('volume')}</TableHead>
                      <TableHead className="border-e border-slate-600 text-start text-slate-50">{t('dangerousAndFlammable')}</TableHead>
                      <TableHead className="border-e border-slate-600 text-start text-slate-50">{t('basePrice')}</TableHead>
                      <TableHead className="border-e border-slate-600 text-start text-slate-50">{t('pricePerKm')}</TableHead>
                      <TableHead className="border-e border-slate-600 text-start text-slate-50">{t('status')}</TableHead>
                      <TableHead className="text-start text-slate-50">{t('operations')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehiclesLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-8 text-center">{t('loading')}</TableCell>
                      </TableRow>
                    ) : vehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-8 text-center">{t('noData')}</TableCell>
                      </TableRow>
                    ) : (
                      vehicles.map((vehicle: any) => (
                        <TableRow key={vehicle.id} className="border-slate-200 odd:bg-slate-50 even:bg-white hover:bg-amber-50">
                          <TableCell>{vehicle.name}</TableCell>
                          <TableCell>{(VEHICLE_TYPES as any)[vehicle.vehicleType] || vehicle.vehicleType}</TableCell>
                          <TableCell>{parseInt(vehicle.maxWeightKg)} {t('unitKg')}</TableCell>
                          <TableCell>{parseInt(vehicle.maxVolumeM3) || 0} m³</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Badge variant={vehicle.supportsFlammable ? "default" : "secondary"} className="text-xs flex items-center gap-1">
                                <Flame className="h-3 w-3" />
                                {vehicle.supportsFlammable ? t('flammable') : t('notPermitted')}
                              </Badge>
                              <Badge variant={vehicle.supportsHazardous ? "default" : "secondary"} className="text-xs flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                {vehicle.supportsHazardous ? t('hazardous') : t('notPermitted')}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{parseInt(vehicle.basePrice)} {t('currencyIqd')}</TableCell>
                          <TableCell>{parseInt(vehicle.pricePerKm)} {t('currencyIqd')}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={vehicle.isActive ? "default" : "secondary"}>
                                {vehicle.isActive ? t('active') : t('inactive')}
                              </Badge>
                              <Button
                                size="sm"
                                variant={vehicle.isActive ? "destructive" : "default"}
                                onClick={() => handleToggleVehicleStatus(vehicle.id, !vehicle.isActive)}
                                disabled={updateVehicleMutation.isPending}
                              >
                                {vehicle.isActive ? t('inactive') : t('active')}
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
                                {t('edit')}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleDeleteVehicle(vehicle.id)}
                              >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                {t('delete')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table></div>
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
                <DialogContent className="max-w-2xl" dir={direction}>
                  <DialogHeader>
                    <DialogTitle>{t('editTemplate')}</DialogTitle>
                    <DialogDescription>{t('editTemplateDescription')}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); handleEditVehicle(new FormData(e.currentTarget)); }}>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-name">{t('persianName')}</Label>
                        <Input 
                          id="edit-name" 
                          name="name" 
                          defaultValue={editingVehicle.name}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-nameEn">{t('englishName')}</Label>
                        <Input 
                          id="edit-nameEn" 
                          name="nameEn" 
                          defaultValue={editingVehicle.nameEn || ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-vehicleType">{t('vehicleType')}</Label>
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
                          <option value="">{t('selectVehicleType')}</option>
                          {Object.entries(VEHICLE_TYPES).map(([key, value]) => (
                            <option key={key} value={key}>{value}</option>
                          ))}
                          <option value="سایر">{t('other')} ({t('enterVehicleType')})</option>
                        </select>
                        {showCustomEditInput && (
                          <div className="mt-2">
                            <Input 
                              name="customVehicleType"
                              value={customEditVehicleType}
                              onChange={(e) => setCustomEditVehicleType(e.target.value)}
                              placeholder={t('enterVehicleType')}
                              required={showCustomEditInput}
                              className="w-full"
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-maxWeightKg">{t('maxWeight')}</Label>
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
                        <Label htmlFor="edit-basePrice">{t('basePrice')}</Label>
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
                        <Label htmlFor="edit-pricePerKm">{t('pricePerKm')}</Label>
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
                        <Label htmlFor="edit-allowedRoutes">{t('allowedRoutes')}</Label>
                        <Input 
                          id="edit-allowedRoutes" 
                          name="allowedRoutes" 
                          defaultValue={editingVehicle.allowedRoutes}
                          placeholder="urban,interurban,highway" 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-averageSpeedKmh">{t('averageSpeed')}</Label>
                        <input 
                          id="edit-averageSpeedKmh" 
                          name="averageSpeedKmh" 
                          type="number" 
                          defaultValue={(parseInt(editingVehicle.averageSpeedKmh) || 50).toString()}
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-maxVolumeM3">{t('maxVolume')}</Label>
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
                          {t('hazardousCapability')}
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-gray-600">{t('flammable')}</Label>
                            <Select name="supportsFlammable" defaultValue={editingVehicle.supportsFlammable?.toString() || "false"}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">{t('permitted')}</SelectItem>
                                <SelectItem value="false">{t('notPermitted')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-gray-600">{t('hazardous')}</Label>
                            <Select name="supportsHazardous" defaultValue={editingVehicle.supportsHazardous?.toString() || "false"}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">{t('permitted')}</SelectItem>
                                <SelectItem value="false">{t('notPermitted')}</SelectItem>
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
                          <Label htmlFor="edit-isActive">{t('activeLabel')}</Label>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setEditingVehicle(null)}>
                        {t('cancel')}
                      </Button>
                      <Button type="submit" disabled={updateVehicleMutation.isPending}>
                        {updateVehicleMutation.isPending ? t('updating') : t('update')}
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
      <html dir="${direction}" lang="${language}">
        <head>
          <title>${t('details')} ${selectedOrder.orderNumber}</title>
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              direction: ${direction};
              text-align: start;
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
            <img src="${(companyInfo as any)?.data?.logoUrl || '/uploads/Logo_1753245273579.jpeg'}" alt="${t('companyName')}" style="max-width: 120px; max-height: 80px; margin-bottom: 15px;" onerror="this.style.display='none'">
            <h1>${t('logisticsOrderDetails')}</h1>
            <h2>${t('orderLabel')} ${selectedOrder.orderNumber}</h2>
            <p>${t('date')}: ${new Intl.DateTimeFormat(locale).format(new Date())}</p>
          </div>

          <div class="section">
            <h3>${t('customer')}</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">${t('fullName')}:</span>
                <span class="value">${(selectedOrder.customer?.firstName || selectedOrder.customerFirstName)} ${(selectedOrder.customer?.lastName || selectedOrder.customerLastName)}</span>
              </div>
              <div class="info-item">
                <span class="label">${t('phone')}:</span>
                <span class="value" style="font-size: 20px; font-weight: bold; color: #2563eb;">${selectedOrder.customer?.phone || selectedOrder.customerPhone}</span>
              </div>
              <div class="info-item">
                <span class="label">${t('email')}:</span>
                <span class="value">${selectedOrder.customer?.email || selectedOrder.customerEmail || t('emailNotSet')}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>${t('deliveryAddress')}</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">👤 ${t('recipientName')}:</span>
                <span class="value" style="font-size: 16px; font-weight: bold;">${(() => {
                  if (selectedOrder.recipientName) return selectedOrder.recipientName;
                  if (selectedOrder.shippingAddress) {
                    const addr = typeof selectedOrder.shippingAddress === 'string' 
                      ? JSON.parse(selectedOrder.shippingAddress) 
                      : selectedOrder.shippingAddress;
                    return addr?.name || t('emailNotSet');
                  }
                  return t('emailNotSet');
                })()}</span>
              </div>
              <div class="info-item">
                <span class="label">📞 ${t('recipientPhone')}:</span>
                <span class="value phone-value">${(() => {
                  if (selectedOrder.recipientPhone) return selectedOrder.recipientPhone;
                  if (selectedOrder.shippingAddress) {
                    const addr = typeof selectedOrder.shippingAddress === 'string' 
                      ? JSON.parse(selectedOrder.shippingAddress) 
                      : selectedOrder.shippingAddress;
                    return addr?.phone || t('emailNotSet');
                  }
                  return t('emailNotSet');
                })()}</span>
              </div>
              <div class="info-item address-item" style="grid-column: 1 / -1;">
                <span class="label address-label">🏠 ${t('fullDeliveryAddress')}</span>
                <span class="value address-value">${(() => {
                  if (selectedOrder.recipientAddress) return selectedOrder.recipientAddress;
                  if (selectedOrder.shippingAddress) {
                    const addr = typeof selectedOrder.shippingAddress === 'string' 
                      ? JSON.parse(selectedOrder.shippingAddress) 
                      : selectedOrder.shippingAddress;
                    return addr?.address || t('emailNotSet');
                  }
                  return t('emailNotSet');
                })()}</span>
              </div>
              <div class="info-item">
                <span class="label">${t('city')}:</span>
                <span class="value">${(() => {
                  if (selectedOrder.shippingAddress) {
                    const addr = typeof selectedOrder.shippingAddress === 'string' 
                      ? JSON.parse(selectedOrder.shippingAddress) 
                      : selectedOrder.shippingAddress;
                    return addr?.city || t('emailNotSet');
                  }
                  return t('emailNotSet');
                })()}</span>
              </div>
              <div class="info-item">
                <span class="label">${t('postalCode')}:</span>
                <span class="value">${(() => {
                  if (selectedOrder.shippingAddress) {
                    const addr = typeof selectedOrder.shippingAddress === 'string' 
                      ? JSON.parse(selectedOrder.shippingAddress) 
                      : selectedOrder.shippingAddress;
                    return addr?.postalCode || t('emailNotSet');
                  }
                  return t('emailNotSet');
                })()}</span>
              </div>
            </div>
          </div>

          ${(selectedOrder as any).financialReviewedAt || (selectedOrder as any).financialNotes ? `
          <div class="section">
            <h3>${t('financialInfo')}</h3>
            <div class="info-grid">
              ${(selectedOrder as any).financialReviewedAt ? `
              <div class="info-item">
                <span class="label">${t('financialReviewDate')}:</span>
                <span class="value">${new Date((selectedOrder as any).financialReviewedAt).toLocaleDateString('en-GB')}</span>
              </div>` : ''}
              ${(selectedOrder as any).financialNotes ? `
              <div class="info-item" style="grid-column: 1 / -1;">
                <span class="label">${t('financialNotes')}:</span>
                <span class="value">${(selectedOrder as any).financialNotes}</span>
              </div>` : ''}
            </div>
          </div>` : ''}

          <div class="section">
            <h3>${t('details')}</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">${t('cargoWeight')}:</span>
                <span class="value">${selectedOrder.calculatedWeight || selectedOrder.totalWeight} ${t('unitKg')}</span>
              </div>
              <div class="info-item">
                <span class="label">${t('deliveryMethodLabel')}:</span>
                <span class="value">${selectedOrder.vehicleType || (selectedOrder as any).selectedVehicleName || 
                  (selectedOrder.deliveryMethod === 'smart_vehicle' ? `🚚 ${t('smartDelivery')}` :
                   selectedOrder.deliveryMethod === 'self_pickup' ? `🏢 ${t('customerPickup')}` :
                   selectedOrder.deliveryMethod === 'freight_collect' ? `💰 ${t('freightCollect')}` :
                   selectedOrder.deliveryMethod === 'postal' ? `📮 ${t('postalDelivery')}` :
                   selectedOrder.deliveryMethod === 'courier' ? t('courierMethod') :
                   selectedOrder.deliveryMethod || `⚠️ ${t('unknownValue')}`)}</span>
              </div>
            </div>
          </div>

          ${selectedOrder.deliveryNotes ? `
          <div class="section">
            <h3>${t('deliveryNotes')}</h3>
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
    <html dir="${direction}" lang="${language}">
    <head>
      <meta charset="utf-8">
      <title>${t('details')}</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
          margin: 0;
          padding: 20mm 20mm 15mm 20mm; /* حاشیه‌های یکسان */
          direction: ${direction};
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
        <img src="${(companyInfo as any)?.data?.logoUrl || '/uploads/Logo_1753245273579.jpeg'}" alt="${t('companyName')}" style="max-width: 120px; max-height: 80px; margin-bottom: 15px;" onerror="this.style.display='none'">
        <div class="company-name">${t('companyName')}</div>
        <div>${t('orderLabel')} ${t('details')}</div>
          <div style="font-size: 12px; color: #6b7280;">${t('date')}: ${new Intl.DateTimeFormat(locale).format(new Date())}</div>
      </div>

      <div class="section">
        <div class="section-title">${t('orderInformation')}</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">${t('orderNumberLabelPrint')}:</span>
            <span class="value">${orderDetails.orderNumber}</span>
          </div>
          <div class="info-item">
            <span class="label">${t('registrationDate')}:</span>
            <span class="value">${orderDetails.createdAt ? new Intl.DateTimeFormat(locale).format(new Date(orderDetails.createdAt)) : t('unknown')}</span>
          </div>
          <div class="info-item">
            <span class="label">${t('currentStatusPrint')}:</span>
            <span class="value status-badge ${orderDetails.status === 'warehouse_approved' ? 'status-confirmed' : 
                                              orderDetails.status === 'pending' ? 'status-pending' : 'status-rejected'}">
              ${orderDetails.status === 'warehouse_approved' ? t('warehouseConfirmed') :
                orderDetails.status === 'logistics_dispatched' ? t('dispatched') :
                orderDetails.status || t('unknownValue')}
            </span>
          </div>
          <div class="info-item">
            <span class="label">${t('paymentMethod')}:</span>
            <span class="value">${(() => {
              const method = orderDetails.paymentMethod;
              console.log('🔍 [PAYMENT DEBUG] Payment method value:', method, 'Type:', typeof method);
              
              if (!method || method === null || method === undefined) {
                console.warn('⚠️ [PAYMENT METHOD] Missing payment method in order details:', orderDetails);
                return t('unknownValue');
              }
              
              switch (method.toLowerCase()) {
                case 'wallet_full': return t('paymentWalletFull');
                case 'wallet_partial': return t('paymentMixed');
                case 'bank_transfer': return t('paymentBankTransfer');
                case 'bank_transfer_grace': return t('paymentBankTransferGrace');
                case 'online_payment': return t('paymentOnline');
                case 'digital_wallet': return t('paymentDigitalWallet');
                case 'iraqi_bank_gateway': return t('paymentIraqiGateway');
                case 'hybrid': return t('paymentHybrid');
                case 'cash': return t('paymentCash');
                case 'credit': return t('paymentCredit');
                default: return `${method} (${t('other')})`;
              }
            })()}</span>
          </div>

          <div class="info-item">
            <span class="label">${t('weight')}:</span>
            <span class="value">${orderDetails.calculatedWeight || orderDetails.totalWeight || t('notCalculated')} ${t('unitKg')}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">${t('customerInformation')}</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">${t('nameLabel')}:</span>
            <span class="value">${orderDetails.customerFirstName || ''} ${orderDetails.customerLastName || ''}</span>
          </div>
          <div class="info-item">
            <span class="label">${t('email')}:</span>
            <span class="value">${orderDetails.customerEmail || t('unknownValue')}</span>
          </div>
          <div class="info-item">
            <span class="label">${t('phone')}:</span>
            <span class="value">${orderDetails.customerPhone || t('unknownValue')}</span>
          </div>
        </div>
      </div>

      ${orderDetails.shippingAddress ? `
      <div class="section">
        <div class="section-title">${t('deliveryAddressLabel')}</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">${t('recipientPostalName')}:</span>
            <span class="value" style="font-size: 16px; font-weight: bold; color: #000;">${orderDetails.shippingAddress.name || t('unknownValue')}</span>
          </div>
          <div class="info-item">
            <span class="label">${t('recipientPhone')}:</span>
            <span class="value" style="font-size: 16px; font-weight: bold; color: #000;">${orderDetails.shippingAddress.phone || t('unknownValue')}</span>
          </div>
          <div class="info-item" style="grid-column: 1 / -1;">
            <span class="label">${t('recipientPostalAddress')}:</span>
            <span class="value" style="font-size: 18px; font-weight: bold; color: #000; line-height: 1.4;">${orderDetails.shippingAddress.address || t('unknownValue')}</span>
          </div>
          <div class="info-item">
            <span class="label">${t('city')}:</span>
            <span class="value">${orderDetails.shippingAddress.city || t('unknownValue')}</span>
          </div>
          <div class="info-item">
            <span class="label">${t('postalCode')}:</span>
            <span class="value">${orderDetails.shippingAddress.postalCode || t('unknownValue')}</span>
          </div>
        </div>
      </div>` : ''}

      ${orderDetails.financialReviewedAt || orderDetails.financialNotes ? `
      <div class="section">
        <div class="section-title">${t('financialInfo')}</div>
        <div class="info-grid">
          ${orderDetails.financialReviewedAt ? `
          <div class="info-item">
            <span class="label">${t('financialReviewDate')}:</span>
            <span class="value">${new Date(orderDetails.financialReviewedAt).toLocaleDateString('en-GB')}</span>
          </div>` : ''}
          ${orderDetails.financialNotes ? `
          <div class="info-item" style="grid-column: 1 / -1;">
            <span class="label">${t('financialNotes')}:</span>
            <span class="value">${orderDetails.financialNotes}</span>
          </div>` : ''}
        </div>
      </div>` : ''}

      ${orderDetails.deliveryNotes || orderDetails.logisticsNotes ? `
      <div class="section">
        <div class="section-title">${t('deliveryNotes')}</div>
        <div class="value">${orderDetails.deliveryNotes || orderDetails.logisticsNotes}</div>
      </div>` : ''}

      <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280;">
        ${t('generatedBySystem')}
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
          notes: t('deliveryCompleted')
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
          title: t('success'),
          description: t('deliveryCompleted'),
        });
        // Close dialog and reset state
        setDeliveryConfirmDialogOpen(false);
        setConfirmingDeliveryOrderId(null);
        setDeliveryConfirmStep(1);
      } else {
        console.error('🚚 [DELIVERY] API returned error:', result.message);
        throw new Error(result.message || t('deliveryUpdateError'));
      }
    } catch (error) {
      console.error('🚚 [DELIVERY] Error marking order as delivered:', error);
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('deliveryUpdateError'),
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

  // Send or resend delivery code using configured notification channels (Email/SMS/WhatsApp)
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
          title: t('deliveryCodeSent'),
          description: t('deliveryCodeSentDescription').replace('{code}', String(result.deliveryCode || '')),
        });
        
        // Reset success state after 3 seconds
        setTimeout(() => {
          setResentCodes(prev => ({ ...prev, [orderManagementId]: false }));
        }, 3000);
        
        // Refresh orders to show updated delivery code
        queryClient.invalidateQueries({ queryKey: ['/api/order-management/logistics'] });
      } else {
        toast({
          title: t('error'),
          description: result.message || t('deliveryCodeError'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Error sending delivery code:', error);
      toast({
        title: t('error'),
        description: t('serverConnectionError'),
        variant: 'destructive',
      });
    } finally {
      setResendingCodes(prev => ({ ...prev, [orderManagementId]: false }));
    }
  };

  const NotificationSettingsTab = () => {
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [smsEnabled, setSmsEnabled] = useState(false);
    const [whatsappEnabled, setWhatsappEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
      const fetchSettings = async () => {
        try {
          const response = await fetch('/api/admin/shop-settings/logistics_notifications');
          if (response.ok) {
            const result = await response.json();
            const settings = result.data || [];
            settings.forEach((setting: any) => {
              if (setting.settingKey === 'logistics_notification_email') {
                setEmailEnabled(setting.settingValue === 'true');
              } else if (setting.settingKey === 'logistics_notification_sms') {
                setSmsEnabled(setting.settingValue === 'true');
              } else if (setting.settingKey === 'logistics_notification_whatsapp') {
                setWhatsappEnabled(setting.settingValue === 'true');
              }
            });
          }
        } catch (error) {
          console.error('Error fetching notification settings:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSettings();
    }, []);

    const saveSettings = async () => {
      setIsSaving(true);
      try {
        const updates = [
          { key: 'logistics_notification_email', value: emailEnabled.toString() },
          { key: 'logistics_notification_sms', value: smsEnabled.toString() },
          { key: 'logistics_notification_whatsapp', value: whatsappEnabled.toString() }
        ];

        for (const update of updates) {
          await fetch(`/api/admin/shop-settings/${update.key}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setting_value: update.value })
          });
        }

        toast({
          title: t('settingsSaved'),
          description: t('settingsSavedDescription'),
        });
      } catch (error) {
        console.error('Error saving notification settings:', error);
        toast({
          title: t('error'),
          description: t('settingsSaveError'),
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    };

    if (isLoading) {
      return (
        <Card>
          <CardContent className="flex justify-center items-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6" dir={direction}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {t('customerNotifications')}
            </CardTitle>
            <CardDescription>
              {t('notificationDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">{t('email')}</h4>
                    <p className="text-sm text-gray-500">{t('sendByEmail')}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Phone className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">{t('sms')}</h4>
                    <p className="text-sm text-gray-500">{t('sendBySms')}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={smsEnabled}
                    onChange={(e) => setSmsEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Send className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">{t('whatsapp')}</h4>
                    <p className="text-sm text-gray-500">{t('sendByWhatsapp')}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={whatsappEnabled}
                    onChange={(e) => setWhatsappEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={saveSettings} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t('saveSettings')}
                  </>
                )}
              </Button>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">{t('attention')}</h4>
                  <p className="text-sm text-amber-700">
                    {t('notificationWarning')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const OrdersTab = () => {
    const customerName = (order: LogisticsOrder) =>
      [order.customerFirstName || order.customer?.firstName, order.customerLastName || order.customer?.lastName].filter(Boolean).join(' ') || t('unknown');
    const checkoutAddress = (order: LogisticsOrder) => {
      let selectedAddress: any = order.shippingAddress;
      if (typeof selectedAddress === 'string') {
        try {
          selectedAddress = JSON.parse(selectedAddress);
        } catch {
          selectedAddress = { address: selectedAddress };
        }
      }
      const city = selectedAddress?.city || selectedAddress?.cityName || selectedAddress?.province || t('unknown');
      const addressParts = [
        selectedAddress?.address || selectedAddress?.fullAddress || order.recipientAddress || order.customerAddress,
        selectedAddress?.district || selectedAddress?.area,
        selectedAddress?.city || selectedAddress?.cityName,
        selectedAddress?.province,
        selectedAddress?.country,
        selectedAddress?.postalCode,
      ].filter((value, index, values) => value && values.indexOf(value) === index);
      return {
        city,
        fullAddress: addressParts.join(' · ') || t('noAddress'),
      };
    };
    const weight = (order: LogisticsOrder) => `${Number(order.calculatedWeight ?? order.totalWeight ?? 0) || 0} ${order.weightUnit || 'kg'}`;
    const assignedVehicle = (order: LogisticsOrder) => {
      const normalizedPlate = order.vehiclePlate?.trim().toLocaleLowerCase();
      return normalizedPlate
        ? (fleetVehicles as ReadyVehicle[]).find((vehicle) => vehicle.licensePlate?.trim().toLocaleLowerCase() === normalizedPlate)
        : undefined;
    };
    const gpsActions = (order: LogisticsOrder) => order.hasGpsLocation ? (
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={async () => {
          const lat = parseFloat(String(order.gpsLatitude || '0')).toFixed(6);
          const lng = parseFloat(String(order.gpsLongitude || '0')).toFixed(6);
          try { await navigator.clipboard.writeText(`${lat}, ${lng}`); } catch { /* clipboard is optional */ }
        }}>{t('location')}</Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => window.open(`https://www.google.com/maps?q=${order.gpsLatitude},${order.gpsLongitude}`, '_blank')}>{t('route')}</Button>
      </div>
    ) : null;
    return (
      <div className="space-y-4" dir={direction}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{t('logisticsOrders')}</h3>
            <p className="text-sm text-slate-500">{t('warehouseApproved')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">{mappedLogisticsOrders.length} {t('activeOrders')}</Badge>
            <Button variant="outline" size="sm" onClick={forceRefreshLogisticsOrders} className="gap-2 border-slate-300">
              <RefreshCw className="h-4 w-4" />{t('refresh')}
            </Button>
          </div>
        </div>
        {loadingLogisticsOrders ? (
          <Card><CardContent className="py-12 text-center text-slate-500">{t('loading')}</CardContent></Card>
        ) : mappedLogisticsOrders.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-slate-500"><Package className="mx-auto mb-3 h-10 w-10 text-slate-300" /><p>{t('empty')}</p></CardContent></Card>
        ) : (
          <Card className="overflow-hidden border-slate-300 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[1480px] text-xs">
                  <TableHeader className="sticky top-0 z-10 bg-slate-700">
                    <TableRow className="border-slate-700 hover:bg-slate-700">
                      {[t('row'), t('order'), t('customer'), t('destination'), t('amount'), t('weight'), t('methodVehicle'), t('status'), t('date'), t('codeTracking'), t('actions')].map((label) => <TableHead key={label} className="h-9 border-e border-slate-600 px-3 text-start font-semibold text-slate-50">{label}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappedLogisticsOrders.map((order: LogisticsOrder, index: number) => {
                      const notes = [ (order as any).customerNotes || (order as any).notes, (order as any).financialNotes, (order as any).warehouseNotes ].filter(Boolean).join(' · ');
                      const vehicle = assignedVehicle(order);
                      const isVehicleExpanded = expandedOrderVehicleId === order.id;
                      const isAddressExpanded = expandedOrderAddressId === order.id;
                      const hasAssignedVehicle = Boolean(order.vehiclePlate);
                      const deliveryAddress = checkoutAddress(order);
                      return <React.Fragment key={order.id}>
                      <TableRow className="border-slate-200 odd:bg-slate-50 even:bg-white hover:bg-amber-50">
                        <TableCell className="border-e border-slate-200 px-3 py-2 font-mono text-slate-500">{index + 1}</TableCell>
                        <TableCell className="border-e border-slate-200 px-3 py-2 font-semibold text-slate-900">{order.orderNumber || `#${order.customerOrderId}`}<div className="text-[11px] font-normal text-slate-500">{formatLogisticsDate(order.createdAt)}</div></TableCell>
                        <TableCell className="max-w-[190px] border-e border-slate-200 px-3 py-2"><button className="text-start font-medium text-slate-800 underline-offset-2 hover:underline" onClick={() => handleShowOrderDetails(order)}>{customerName(order)}</button><div className="text-slate-500">{order.customerPhone || order.customer?.phone || t('unknown')}</div></TableCell>
                        <TableCell className="max-w-[220px] whitespace-normal border-e border-slate-200 px-3 py-2">
                          <button
                            type="button"
                            aria-expanded={isAddressExpanded}
                            onClick={() => setExpandedOrderAddressId(isAddressExpanded ? null : order.id)}
                            className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-start font-semibold text-violet-800 transition-colors hover:border-violet-400 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                            title={t('clickAddressDetails')}
                          >
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="break-words">{deliveryAddress.city}</span>
                            {isAddressExpanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
                          </button>
                        </TableCell>
                        <TableCell className="border-e border-slate-200 px-3 py-2 whitespace-nowrap"><span className="font-semibold">{formatLogisticsCurrency(order.totalAmount)}</span><div className="text-slate-500">{order.paymentMethod || t('paymentUnknown')}</div></TableCell>
                        <TableCell className="border-e border-slate-200 px-3 py-2 font-mono whitespace-nowrap">{weight(order)}</TableCell>
                        <TableCell className="max-w-[180px] whitespace-normal border-e border-slate-200 px-3 py-2">
                          <div className="mb-1 text-slate-600">{order.customerDeliveryMethod || order.deliveryMethod || t('unknown')}</div>
                          {hasAssignedVehicle ? (
                            <button
                              type="button"
                              aria-expanded={isVehicleExpanded}
                              onClick={() => setExpandedOrderVehicleId(isVehicleExpanded ? null : order.id)}
                              className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-blue-300 bg-blue-100 px-2 py-1 font-mono font-semibold text-blue-800 shadow-sm transition-colors hover:border-blue-400 hover:bg-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                              title={t('clickVehicleDetails')}
                            >
                              <Truck className="h-3.5 w-3.5 shrink-0" />
                              <span className="break-all">{order.vehiclePlate}</span>
                              {isVehicleExpanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
                            </button>
                          ) : (
                            <div className="text-slate-500">{order.selectedVehicleName || t('noVehicle')}</div>
                          )}
                        </TableCell>
                        <TableCell className="border-e border-slate-200 px-3 py-2"><Badge className="whitespace-normal bg-emerald-100 text-emerald-800">{getStatusDisplayName(order.currentStatus, language)}</Badge>{notes && <div className="mt-1 max-w-[150px] whitespace-normal text-[11px] text-amber-700">{notes}</div>}</TableCell>
                        <TableCell className="border-e border-slate-200 px-3 py-2 whitespace-nowrap">{formatLogisticsDate(order.updatedAt || order.createdAt, true)}</TableCell>
                        <TableCell className="border-e border-slate-200 px-3 py-2 font-mono">{order.deliveryCode || order.trackingNumber || t('noCode')}</TableCell>
                        <TableCell className="px-3 py-2"><div className="flex max-w-[270px] flex-wrap gap-1">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleShowOrderDetails(order)}><Eye className="me-1 h-3.5 w-3.5" />{t('details')}</Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleVehicleAssignment(order)}><Truck className="me-1 h-3.5 w-3.5" />{t('assign')}</Button>
                          <Button size="sm" className="h-7 bg-blue-600 px-2 text-xs hover:bg-blue-700" onClick={() => handleSendDeliveryCode(order.id, !!order.deliveryCode)} disabled={resendingCodes[order.id]}><Send className="me-1 h-3.5 w-3.5" />{order.deliveryCode ? t('resendCode') : t('sendCode')}</Button>
                          <Button size="sm" className="h-7 bg-emerald-600 px-2 text-xs hover:bg-emerald-700" onClick={() => handleDeliveredStart(order.id)}><CheckCircle className="me-1 h-3.5 w-3.5" />{t('markDelivered')}</Button>
                          {gpsActions(order)}
                        </div></TableCell>
                      </TableRow>
                      {isAddressExpanded && (
                        <TableRow className="border-b-2 border-violet-200 bg-violet-50/70 hover:bg-violet-50">
                          <TableCell colSpan={11} className="p-0">
                            <div className="border-s-4 border-violet-500 px-4 py-4">
                              <div className="flex items-start gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white">
                                  <MapPin className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                  <div className="mb-1 text-xs font-medium text-violet-700">{t('checkoutDeliveryAddress')}</div>
                                  <div className="break-words text-sm font-semibold leading-6 text-slate-900">{deliveryAddress.fullAddress}</div>
                                  {(order.recipientName || order.recipientPhone) && (
                                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
                                      {order.recipientName && <span><strong>{t('recipientName')}:</strong> {order.recipientName}</span>}
                                      {order.recipientPhone && <span><strong>{t('phone')}:</strong> <span className="font-mono">{order.recipientPhone}</span></span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {isVehicleExpanded && (
                        <TableRow className="border-b-2 border-blue-200 bg-blue-50/70 hover:bg-blue-50">
                          <TableCell colSpan={11} className="p-0">
                            <div className="border-s-4 border-blue-500 px-4 py-4">
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white"><Truck className="h-5 w-5" /></span>
                                  <div>
                                    <div className="font-semibold text-slate-900">{t('assignedVehicleDetails')}</div>
                                    <div className="font-mono text-sm font-bold text-blue-700">{order.vehiclePlate}</div>
                                  </div>
                                </div>
                                <Badge className={vehicle?.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                                  {vehicle?.isAvailable ? t('availableStatus') : t('assignedStatus')}
                                </Badge>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                {[
                                  [t('vehicleType').replace(' *', ''), vehicle?.vehicleTemplateName || vehicle?.vehicleType || order.vehicleType || order.selectedVehicleName || t('unknown')],
                                  [t('driver'), displayDriverName(vehicle?.driverName || order.driverName) || t('unknownDriver')],
                                  [t('phone'), vehicle?.driverMobile || order.driverPhone || t('unknown')],
                                  [t('capacity'), vehicle ? `${vehicle.loadCapacity} ${t('unitKg')}` : t('unknown')],
                                  [t('location'), vehicle?.currentLocation || t('noLocation')],
                                  [t('flammable'), vehicle?.supportsFlammable ? t('flammableAllowed') : vehicle?.notAllowedFlammable ? t('flammableForbidden') : t('normal')],
                                  [t('lastUpdated'), formatLogisticsDate(vehicle?.updatedAt || order.updatedAt, true)],
                                  [t('notes'), vehicle?.notes || t('noNotes')],
                                ].map(([label, value]) => (
                                  <div key={label} className="rounded-lg border border-blue-100 bg-white px-3 py-2 shadow-sm">
                                    <div className="mb-0.5 text-[11px] font-medium text-slate-500">{label}</div>
                                    <div className="break-words text-sm font-semibold text-slate-800">{value}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      </React.Fragment>;
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const LegacyOrdersTab = () => {
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
            mappedLogisticsOrders.map((order: LogisticsOrder) => {
              const hasCustomerNotes = !!(order as any).customerNotes || !!(order as any).notes;
              const hasFinancialNotes = !!(order as any).financialNotes;
              const hasWarehouseNotes = !!(order as any).warehouseNotes;
              const hasAnyNotes = hasCustomerNotes || hasFinancialNotes || hasWarehouseNotes;
              
              return (
              <Card key={order.id} className={`border-r-4 ${hasAnyNotes ? 'border-r-amber-500 bg-amber-50' : 'border-r-green-500 bg-green-50'}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-green-800 text-lg">سفارش {order.orderNumber}</h4>
                      <span className="text-sm text-gray-500">| {formatDateSafe(order.createdAt)}</span>
                      {hasAnyNotes && (
                        <div className="flex items-center gap-1 bg-amber-200 text-amber-800 px-2 py-1 rounded-full text-xs font-medium animate-pulse">
                          <FileText className="w-3 h-3" />
                          دارای یادداشت
                          {hasCustomerNotes && <span className="bg-amber-300 px-1 rounded">مشتری</span>}
                          {hasFinancialNotes && <span className="bg-blue-300 px-1 rounded">مالی</span>}
                          {hasWarehouseNotes && <span className="bg-green-300 px-1 rounded">انبار</span>}
                        </div>
                      )}
                    </div>
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
                          {/* For smart_vehicle, show the specific vehicle type selected by customer */}
                          {(order.customerDeliveryMethod === 'smart_vehicle' || order.deliveryMethod === 'smart_vehicle') && (order.customerVehicleType || order.vehicleType)
                            ? `🚚 ${order.customerVehicleType || order.vehicleType}` 
                            : (order.customerDeliveryMethod || order.deliveryMethod) === 'courier' ? 'پیک موتوری' :
                           (order.customerDeliveryMethod || order.deliveryMethod) === 'truck' ? 'کامیون' :
                           (order.customerDeliveryMethod || order.deliveryMethod) === 'post' ? 'پست' :
                           (order.customerDeliveryMethod || order.deliveryMethod) === 'postal' ? '📮 ارسال پستی' :
                           (order.customerDeliveryMethod || order.deliveryMethod) === 'personal_pickup' ? 'تحویل حضوری' :
                           (order.customerDeliveryMethod || order.deliveryMethod) === 'self_pickup' ? '🏢 تحویل حضوری' :
                           (order.customerDeliveryMethod || order.deliveryMethod) === 'freight_collect' ? '💰 پس کرایه' :
                           (order.customerDeliveryMethod || order.deliveryMethod) === 'van' ? 'وانت' :
                           (order.customerDeliveryMethod || order.deliveryMethod) === 'smart_vehicle' ? '🚚 ارسال هوشمند' :
                           order.customerDeliveryMethod || order.deliveryMethod || '⚠️ نامشخص'}
                        </p>
                        {/* Show "Smart Vehicle Selection" label when vehicle type is displayed */}
                        {(order.customerDeliveryMethod === 'smart_vehicle' || order.deliveryMethod === 'smart_vehicle') && (order.customerVehicleType || order.vehicleType) && (
                          <p className="text-xs text-indigo-600 mt-1">
                            ارسال هوشمند - نوع خودرو انتخابی مشتری
                          </p>
                        )}
                        {/* When smart_vehicle but no vehicle type saved - show weight-based recommendation */}
                        {(order.customerDeliveryMethod === 'smart_vehicle' || order.deliveryMethod === 'smart_vehicle') && !(order.customerVehicleType || order.vehicleType) && (
                          <p className="text-xs text-orange-600 mt-1">
                            ⚠️ نوع خودرو ثبت نشده - بر اساس وزن {order.calculatedWeight || order.totalWeight || 0} کگ انتخاب کنید
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



                  </div>

                  {/* Delivery Type Display - Shows customer's selected method */}
                  <div className="flex items-center gap-2 mb-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
                    <span className="text-sm font-medium text-gray-700 ml-2">نوع ارسال انتخابی مشتری:</span>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const customerMethod = order.customerDeliveryMethod || order.deliveryMethod;
                        return (
                          <>
                            <Button
                              size="sm"
                              variant={customerMethod === 'postal' ? 'default' : 'outline'}
                              className={customerMethod === 'postal' 
                                ? 'bg-blue-600 text-white cursor-default' 
                                : 'border-gray-300 text-gray-400 cursor-not-allowed opacity-50'}
                              disabled={customerMethod !== 'postal'}
                            >
                              📮 پستی
                            </Button>
                            <Button
                              size="sm"
                              variant={customerMethod === 'smart_vehicle' ? 'default' : 'outline'}
                              className={customerMethod === 'smart_vehicle' 
                                ? 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer' 
                                : 'border-gray-300 text-gray-400 cursor-not-allowed opacity-50'}
                              disabled={customerMethod !== 'smart_vehicle'}
                              onClick={() => customerMethod === 'smart_vehicle' && handleVehicleAssignment(order)}
                            >
                              🚚 حمل با خودرو {customerMethod === 'smart_vehicle' && '(اختصاص وسیله)'}
                            </Button>
                            <Button
                              size="sm"
                              variant={customerMethod === 'self_pickup' ? 'default' : 'outline'}
                              className={customerMethod === 'self_pickup' 
                                ? 'bg-green-600 text-white cursor-default' 
                                : 'border-gray-300 text-gray-400 cursor-not-allowed opacity-50'}
                              disabled={customerMethod !== 'self_pickup'}
                            >
                              🏢 حمل توسط مشتری
                            </Button>
                            <Button
                              size="sm"
                              variant={customerMethod === 'freight_collect' ? 'default' : 'outline'}
                              className={customerMethod === 'freight_collect' 
                                ? 'bg-purple-600 text-white cursor-default' 
                                : 'border-gray-300 text-gray-400 cursor-not-allowed opacity-50'}
                              disabled={customerMethod !== 'freight_collect'}
                            >
                              💰 پس کرایه
                            </Button>
                            {/* Show vehicle type if smart_vehicle selected */}
                            {customerMethod === 'smart_vehicle' && order.customerVehicleType && (
                              <span className="text-sm text-orange-700 bg-orange-100 px-2 py-1 rounded-md font-medium">
                                🚛 {order.customerVehicleType}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    
                    {/* Assigned Vehicle Info - Show when vehicle is assigned */}
                    {(order.vehiclePlate || order.driverName) && (
                      <div className="flex items-center gap-3 bg-green-100 border border-green-300 rounded-lg px-3 py-2 mr-4">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-green-800">خودرو اختصاص یافته:</span>
                        <div className="flex items-center gap-3 text-xs">
                          {order.vehiclePlate && (
                            <span className="bg-white border border-green-400 px-2 py-0.5 rounded font-medium">
                              🚛 پلاک: {order.vehiclePlate}
                            </span>
                          )}
                          {order.driverName && (
                            <span className="text-green-700">
                              👤 راننده: {order.driverName}
                            </span>
                          )}
                          {order.driverPhone && (
                            <span className="text-green-700">
                              📞 {order.driverPhone}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
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
            );})
          )}
        </div>
      </div>
    );
  };

  // Delivered Orders Tab Component
  const DeliveredOrdersTab = () => {
    const deliveredOrders = (deliveredOrdersResponse as any)?.orders || [];
    const [deliveredSearchQuery, setDeliveredSearchQuery] = useState('');
    const [deliveredSortBy, setDeliveredSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'order_number'>('date_desc');
    const [expandedDeliveredVehicleId, setExpandedDeliveredVehicleId] = useState<number | null>(null);
    const orders = deliveredOrders.map((order: any) => ({ ...order, hasGpsLocation: !!(order.gpsLatitude && order.gpsLongitude) }));
    const assignedDeliveredVehicle = (order: any) => {
      const normalizedPlate = order.vehiclePlate?.trim().toLocaleLowerCase();
      return normalizedPlate
        ? (fleetVehicles as ReadyVehicle[]).find((vehicle) => vehicle.licensePlate?.trim().toLocaleLowerCase() === normalizedPlate)
        : undefined;
    };
    const filtered = orders.filter((order: any) => {
      if (deliveredSearchQuery.length < 3) return true;
      const query = deliveredSearchQuery.toLowerCase();
      return [order.orderNumber, order.customerEmail, order.customerPhone, order.deliveryCode, order.trackingNumber].some((value) => String(value || '').toLowerCase().includes(query));
    }).sort((a: any, b: any) => {
      if (deliveredSortBy === 'order_number') return String(a.orderNumber || '').localeCompare(String(b.orderNumber || ''));
      if (deliveredSortBy === 'amount_desc') return Number(b.totalAmount || 0) - Number(a.totalAmount || 0);
      if (deliveredSortBy === 'amount_asc') return Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
      const delta = new Date(b.actualDeliveryDate || b.createdAt).getTime() - new Date(a.actualDeliveryDate || a.createdAt).getTime();
      return deliveredSortBy === 'date_asc' ? -delta : delta;
    });
    return (
      <div className="space-y-4" dir={direction}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-lg font-semibold text-slate-900">{t('delivered')}</h3><p className="text-sm text-slate-500">{filtered.length} {t('activeOrders')}</p></div>
          <Button variant="outline" size="sm" onClick={() => refetchDeliveredOrders()} className="gap-2 border-slate-300"><RefreshCw className="h-4 w-4" />{t('refresh')}</Button>
        </div>
        <div className="flex flex-wrap gap-2 rounded-md border border-slate-300 bg-slate-50 p-3">
          <div className="relative min-w-[260px] flex-1"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={deliveredSearchQuery} onChange={(event) => setDeliveredSearchQuery(event.target.value)} placeholder={t('searchDelivered')} className="h-8 border-slate-300 ps-9" /></div>
          <Select value={deliveredSortBy} onValueChange={(value: any) => setDeliveredSortBy(value)}><SelectTrigger className="h-8 w-[190px] border-slate-300"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="date_desc">{t('sortDate')}</SelectItem><SelectItem value="date_asc">{t('sortOldest')}</SelectItem><SelectItem value="amount_desc">{t('sortAmount')}</SelectItem><SelectItem value="order_number">{t('order')}</SelectItem></SelectContent></Select>
        </div>
        {loadingDeliveredOrders ? <Card><CardContent className="py-12 text-center text-slate-500">{t('loading')}</CardContent></Card> : filtered.length === 0 ? <Card><CardContent className="py-12 text-center text-slate-500"><Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />{t('noResults')}</CardContent></Card> : (
          <Card className="overflow-hidden border-slate-300 shadow-sm"><CardContent className="p-0"><div className="overflow-x-auto"><Table className="min-w-[1380px] text-xs">
            <TableHeader className="bg-slate-700"><TableRow className="border-slate-700 hover:bg-slate-700">{[t('row'), t('order'), t('customer'), t('destination'), t('amount'), t('weight'), t('methodVehicle'), t('status'), t('date'), t('codeTracking'), t('actions')].map((label) => <TableHead key={label} className={`h-9 border-e border-slate-600 px-3 text-start font-semibold text-slate-50 ${label === t('codeTracking') ? 'w-[105px] max-w-[105px]' : ''}`}>{label}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{filtered.map((order: any, index: number) => {
              const vehicle = assignedDeliveredVehicle(order);
              const isVehicleExpanded = expandedDeliveredVehicleId === order.id;
              return <React.Fragment key={order.id}><TableRow className="border-slate-200 odd:bg-slate-50 even:bg-white hover:bg-emerald-50">
              <TableCell className="border-e border-slate-200 px-3 py-2 font-mono text-slate-500">{index + 1}</TableCell>
              <TableCell className="border-e border-slate-200 px-3 py-2 font-semibold">{order.orderNumber || `#${order.customerOrderId}`}<div className="font-normal text-slate-500">{order.actualDeliveryDate ? formatLogisticsDate(order.actualDeliveryDate, true) : formatLogisticsDate(order.createdAt, true)}</div></TableCell>
              <TableCell className="border-e border-slate-200 px-3 py-2"><div className="font-medium">{[order.customerFirstName, order.customerLastName].filter(Boolean).join(' ') || order.customer?.firstName || t('unknown')}</div><div className="text-slate-500">{order.customerPhone || order.customer?.phone || t('unknown')}</div></TableCell>
              <TableCell className="max-w-[220px] whitespace-normal border-e border-slate-200 px-3 py-2 text-slate-600">{order.recipientAddress || order.customerAddress || t('noAddress')}</TableCell>
              <TableCell className="border-e border-slate-200 px-3 py-2 whitespace-nowrap"><span className="font-semibold">{formatLogisticsCurrency(order.totalAmount)}</span><div className="text-slate-500">{order.paymentMethod || t('paymentUnknown')}</div></TableCell>
              <TableCell className="border-e border-slate-200 px-3 py-2 font-mono whitespace-nowrap">{Number(order.calculatedWeight ?? order.totalWeight ?? 0) || 0} {order.weightUnit || 'kg'}</TableCell>
              <TableCell className="max-w-[180px] whitespace-normal border-e border-slate-200 px-3 py-2">
                <div className="mb-1 text-slate-600">{order.customerDeliveryMethod || order.deliveryMethod || t('unknown')}</div>
                {order.vehiclePlate ? (
                  <button
                    type="button"
                    aria-expanded={isVehicleExpanded}
                    onClick={() => setExpandedDeliveredVehicleId(isVehicleExpanded ? null : order.id)}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-blue-300 bg-blue-100 px-2 py-1 font-mono font-semibold text-blue-800 shadow-sm transition-colors hover:border-blue-400 hover:bg-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    title={t('clickVehicleDetails')}
                  >
                    <Truck className="h-3.5 w-3.5 shrink-0" />
                    <span className="break-all">{order.vehiclePlate}</span>
                    {isVehicleExpanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                ) : <div className="text-slate-500">{order.selectedVehicleName || t('noVehicle')}</div>}
              </TableCell>
              <TableCell className="border-e border-slate-200 px-3 py-2"><Badge className="bg-emerald-100 text-emerald-800">{getStatusDisplayName(order.currentStatus || 'delivered', language)}</Badge></TableCell>
              <TableCell className="border-e border-slate-200 px-3 py-2 whitespace-nowrap">{formatLogisticsDate(order.actualDeliveryDate || order.createdAt, true)}</TableCell>
              <TableCell className="w-[105px] max-w-[105px] break-all border-e border-slate-200 px-2 py-2 font-mono text-[11px] leading-4">{order.deliveryCode || order.trackingNumber || t('noCode')}</TableCell>
              <TableCell className="px-3 py-2"><div className="flex flex-wrap gap-1"><Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setSelectedOrder(order); setIsOrderDetailsOpen(true); }}><Eye className="me-1 h-3.5 w-3.5" />{t('details')}</Button>{order.hasGpsLocation && <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => window.open(`https://www.google.com/maps?q=${order.gpsLatitude},${order.gpsLongitude}`, '_blank')}><MapPin className="me-1 h-3.5 w-3.5" />{t('location')}</Button>}</div></TableCell>
            </TableRow>
            {isVehicleExpanded && (
              <TableRow className="border-b-2 border-blue-200 bg-blue-50/70 hover:bg-blue-50">
                <TableCell colSpan={11} className="p-0">
                  <div className="border-s-4 border-blue-500 px-4 py-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white"><Truck className="h-5 w-5" /></span>
                        <div>
                          <div className="font-semibold text-slate-900">{t('assignedVehicleDetails')}</div>
                          <div className="font-mono text-sm font-bold text-blue-700">{order.vehiclePlate}</div>
                        </div>
                      </div>
                      <Badge className="bg-slate-100 text-slate-700">{t('deliveryCompleted')}</Badge>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        [t('vehicleType').replace(' *', ''), vehicle?.vehicleTemplateName || vehicle?.vehicleType || order.vehicleType || order.selectedVehicleName || t('unknown')],
                        [t('driver'), displayDriverName(vehicle?.driverName || order.driverName) || t('unknownDriver')],
                        [t('phone'), vehicle?.driverMobile || order.driverPhone || t('unknown')],
                        [t('capacity'), vehicle ? `${vehicle.loadCapacity} ${t('unitKg')}` : t('unknown')],
                        [t('location'), vehicle?.currentLocation || t('noLocation')],
                        [t('flammable'), vehicle?.supportsFlammable ? t('flammableAllowed') : vehicle?.notAllowedFlammable ? t('flammableForbidden') : t('normal')],
                        [t('lastUpdated'), formatLogisticsDate(vehicle?.updatedAt || order.updatedAt || order.actualDeliveryDate, true)],
                        [t('notes'), vehicle?.notes || t('noNotes')],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-blue-100 bg-white px-3 py-2 shadow-sm">
                          <div className="mb-0.5 text-[11px] font-medium text-slate-500">{label}</div>
                          <div className="break-words text-sm font-semibold text-slate-800">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
            </React.Fragment>})}</TableBody>
          </Table></div></CardContent></Card>
        )}
      </div>
    );
  };

  const LegacyDeliveredOrdersTab = () => {
    const deliveredOrders = (deliveredOrdersResponse as any)?.orders || [];
    const [deliveredSearchQuery, setDeliveredSearchQuery] = useState('');
    const [deliveredSortBy, setDeliveredSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'order_number'>('date_desc');
    
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

    // Filter orders based on search query (minimum 3 characters)
    const filteredOrders = mappedDeliveredOrders.filter((order: any) => {
      if (deliveredSearchQuery.length < 3) return true;
      const query = deliveredSearchQuery.toLowerCase();
      const email = (order.customer?.email || order.customerEmail || '').toLowerCase();
      const phone = (order.customer?.phone || order.customerPhone || '').toLowerCase();
      const orderNumber = (order.orderNumber || '').toLowerCase();
      return email.includes(query) || phone.includes(query) || orderNumber.includes(query);
    });

    // Sort filtered orders
    const sortedOrders = [...filteredOrders].sort((a: any, b: any) => {
      switch (deliveredSortBy) {
        case 'date_desc':
          return new Date(b.actualDeliveryDate || b.createdAt).getTime() - new Date(a.actualDeliveryDate || a.createdAt).getTime();
        case 'date_asc':
          return new Date(a.actualDeliveryDate || a.createdAt).getTime() - new Date(b.actualDeliveryDate || b.createdAt).getTime();
        case 'amount_desc':
          return parseFloat(b.totalAmount || 0) - parseFloat(a.totalAmount || 0);
        case 'amount_asc':
          return parseFloat(a.totalAmount || 0) - parseFloat(b.totalAmount || 0);
        case 'order_number':
          return (a.orderNumber || '').localeCompare(b.orderNumber || '');
        default:
          return 0;
      }
    });

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
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-green-700 flex items-center">
                <CheckCircle className="w-6 h-6 mr-2" />
                سفارشات تحویل شده
              </h2>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {sortedOrders.length} سفارش
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

          {/* Search and Sort Controls */}
          <div className="flex flex-wrap gap-3 items-center bg-gray-50 p-3 rounded-lg border">
            {/* Search Input */}
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="جستجو با ایمیل، شماره تلفن یا شماره سفارش (حداقل ۳ حرف)..."
                  value={deliveredSearchQuery}
                  onChange={(e) => setDeliveredSearchQuery(e.target.value)}
                  className="pr-10 text-right"
                  data-testid="input-delivered-search"
                />
                {deliveredSearchQuery.length > 0 && deliveredSearchQuery.length < 3 && (
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-amber-600">
                    حداقل ۳ حرف
                  </span>
                )}
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">مرتب‌سازی:</span>
              <Select value={deliveredSortBy} onValueChange={(v: any) => setDeliveredSortBy(v)}>
                <SelectTrigger className="w-[180px]" data-testid="select-delivered-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">جدیدترین تحویل</SelectItem>
                  <SelectItem value="date_asc">قدیمی‌ترین تحویل</SelectItem>
                  <SelectItem value="amount_desc">بیشترین مبلغ</SelectItem>
                  <SelectItem value="amount_asc">کمترین مبلغ</SelectItem>
                  <SelectItem value="order_number">شماره سفارش</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {sortedOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="w-16 h-16 text-green-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {deliveredSearchQuery.length >= 3 ? 'نتیجه‌ای یافت نشد' : 'هیچ سفارش تحویل شده‌ای وجود ندارد'}
              </h3>
              <p className="text-gray-500 text-center">
                {deliveredSearchQuery.length >= 3 
                  ? 'سفارشی با این مشخصات پیدا نشد. لطفاً عبارت جستجو را تغییر دهید.'
                  : 'پس از تحویل سفارشات، آن‌ها در این بخش نمایش داده می‌شوند'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sortedOrders.map((order: any) => (
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

                  {/* Vehicle/Delivery Method Details */}
                  <div className="bg-white rounded-lg p-4 mb-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Truck className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-gray-800">اطلاعات تحویل</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">روش تحویل</Label>
                        <p className="font-medium text-sm">
                          {order.deliveryMethod === 'smart_vehicle' ? 'خودرو هوشمند' :
                           order.deliveryMethod === 'courier' ? 'پیک' :
                           order.deliveryMethod === 'postal' ? 'پست' :
                           order.deliveryMethod === 'pickup' ? 'تحویل حضوری' :
                           order.deliveryMethod || 'نامشخص'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">نوع خودرو (انتخاب مشتری)</Label>
                        <p className="font-medium text-sm text-blue-600">
                          {order.customerVehicleType || 'انتخاب نشده'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">پلاک خودرو</Label>
                        <p className="font-medium text-sm">
                          {order.vehiclePlate || 'تخصیص نشده'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">راننده</Label>
                        <p className="font-medium text-sm">
                          {order.driverName || 'نامشخص'}
                          {order.driverPhone && <span className="text-gray-500 text-xs mr-1">({order.driverPhone})</span>}
                        </p>
                      </div>
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
                      تحویل‌دهنده: {order.deliveryPersonName || order.driverName || 'نامشخص'} 
                      {(order.deliveryPersonPhone || order.driverPhone) && ` - ${order.deliveryPersonPhone || order.driverPhone}`}
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
        toast({ title: t('success'), description: t('companyCreated') });
      }
    });

    const handleSubmitCompany = (e: React.FormEvent) => {
      e.preventDefault();
      if (!companyFormData.name || !companyFormData.phone) {
        toast({ 
          title: t('error'),
          description: t('companyRequired'),
          variant: "destructive"
        });
        return;
      }
      addCompanyMutation.mutate(companyFormData);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{t('transportCompanies')}</h3>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('newCompany')}
          </Button>
        </div>

        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>{t('registerCompany')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitCompany} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">{t('company')} *</Label>
                    <Input
                      id="name"
                      value={companyFormData.name}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t('companyNamePlaceholder')}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPerson">{t('contactPerson')}</Label>
                    <Input
                      id="contactPerson"
                      value={companyFormData.contactPerson}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                      placeholder={t('contactPlaceholder')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">{t('phone')} *</Label>
                    <Input
                      id="phone"
                      value={companyFormData.phone}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder={t('phonePlaceholder')}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">{t('email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={companyFormData.email}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder={t('emailPlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">{t('address')}</Label>
                  <Input
                    id="address"
                    value={companyFormData.address}
                    onChange={(e) => setCompanyFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder={t('companyAddressPlaceholder')}
                  />
                </div>

                <div>
                  <Label htmlFor="website">{t('website')}</Label>
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
                    {addCompanyMutation.isPending ? t('registering') : t('registered')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                    {t('cancel')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {loadingCompanies ? (
            <div className="text-center py-8">{t('loading')}</div>
          ) : companies.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Truck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">{t('noCompanies')}</p>
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
                        <span className="text-sm">({company.totalDeliveries} {t('deliveries')})</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {company.isActive ? (
                        <Badge className="bg-green-500">{t('active')}</Badge>
                      ) : (
                        <Badge className="bg-red-500">{t('inactive')}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      {t('editAction')}
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      {t('detailsAction')}
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
      toast({ title: t('shippingCalculated') });
    },
    onError: (error: any) => {
      toast({ 
        title: t('error'),
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
                {t('provincesOfIraq')} ({provinces.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loadingProvinces ? (
                  <div className="text-center py-4">{t('loading')}</div>
                ) : provinces.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">{t('noProvinces')}</p>
                ) : (
                  provinces.map((province: any) => (
                    <div key={province.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{province.name_ar}</span>
                        <span className="text-sm text-gray-600 block">{province.name_en}</span>
                      </div>
                      <Badge variant="outline">{province.cities_count || 0} {t('city')}</Badge>
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
                {t('citiesOfIraq')} ({cities.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loadingCities ? (
                  <div className="text-center py-4">{t('loading')}</div>
                ) : cities.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">{t('noCities')}</p>
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
              {t('calculateShipping')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor="city">{t('destinationCity')}</Label>
                <select 
                  id="city"
                  className="w-full p-2 border rounded"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                >
                  <option value="">{t('selectCity')}</option>
                  {cities.map((city: any) => (
                    <option key={city.id} value={city.name_ar}>
                      {city.name_ar} ({city.province_name})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="weight">{t('weight')} ({t('unitKg')})</Label>
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
                <Label htmlFor="orderValue">{t('orderValue')}</Label>
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
                        title: t('error'),
                        description: t('selectCityWeight'),
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
                  {calculateShippingMutation.isPending ? t('calculating') : t('calculate')}
                </Button>
              </div>
            </div>

            {/* Shipping Calculation Results */}
            {shippingCalculation && (
              <div className="mt-6 space-y-4">
                <h4 className="font-semibold">{t('calculateShipping')} — {shippingCalculation.city}</h4>
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
                              <span>{t('basePrice')}: {Number(calc.base_price).toLocaleString()} {t('currencyIqd')}</span>
                              <span>{t('weight')}: {calc.weight_cost.toLocaleString()} {t('currencyIqd')}</span>
                              <span>{t('deliveryDate')}: {calc.estimated_days} {t('days')}</span>
                              <span>{t('insurance')}: {calc.insurance_available ? t('available') : t('unavailable')}</span>
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="text-lg font-bold text-green-600">
                              {calc.is_free_shipping ? t('freeShipping') : `${calc.final_total.toLocaleString()} ${t('currencyIqd')}`}
                            </div>
                            {calc.insurance_cost > 0 && (
                              <div className="text-sm text-gray-600">
                                {t('insurance')}: {calc.insurance_cost.toLocaleString()} {t('currencyIqd')}
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
        toast({ title: t('success'), description: t('updated') });
      },
      onError: () => {
        toast({ title: t('error'), description: t('operationFailed'), variant: "destructive" });
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
        toast({ title: t('success'), description: t('updated') });
      },
      onError: () => {
        toast({ title: t('error'), description: t('operationFailed'), variant: "destructive" });
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
              {t('geographyManagement')}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{t('geography')}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-blue-50">
              {geographyProvinces.length} {t('province')}
            </Badge>
            <Badge variant="outline" className="bg-green-50">
              {geographyCities.length} {t('city')}
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
                  <h4 className="font-semibold text-blue-900">{t('originCity')}</h4>
                  <p className="text-sm text-blue-700">
                    {selectedOriginCity 
                      ? `${t('originCity')}: ${selectedOriginCity.name_arabic || selectedOriginCity.name}`
                      : `${t('originCity')}: Erbil`
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
                  <option value="">Erbil ({t('unknown')})</option>
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
                    {t('reset')}
                  </Button>
                )}
              </div>
            </div>
            {selectedOriginCity && (
              <div className="mt-3 p-3 bg-blue-100 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>{t('notes')}:</strong> {t('distanceHelp')}.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t('citiesOfIraq')} ({geographyCities.length})
            </CardTitle>
            <CardDescription>
              {t('geography')}
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
                            {t('rowNumber')}
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
                            {t('cityName')}
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
                            {t('province')}
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
                            {t('distanceFromOrigin').replace('{city}', selectedOriginCity ? (selectedOriginCity.name_arabic || selectedOriginCity.name) : 'Erbil')}
                            <ArrowUpDown className="h-3 w-3" />
                          </Button>
                        </TableHead>

                        <TableHead className="text-right w-32 bg-white sticky top-0 z-50 border-b" style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 50 }}>
                          <div className="flex items-center justify-end gap-1">
                            <Bus className="h-4 w-4 text-blue-600" />
                            <span>{t('passengerLine')}</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-start w-24 bg-white sticky top-0 z-50 border-b">{t('status')}</TableHead>
                        <TableHead className="text-start w-32 bg-white sticky top-0 z-50 border-b">{t('operations')}</TableHead>
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
                                t('originZero') :
                                `${calculateDistance(city)} ${t('unitKm')}`
                              }
                            </Badge>
                            {!selectedOriginCity && (
                              <button
                                onClick={() => {
                                  setEditingCity(city);
                                  setIsEditCityDialogOpen(true);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
                                title={t('quickDistanceEdit')}
                              >
                                📍
                              </button>
                            )}
                          </div>
                          {!selectedOriginCity && (
                            <div className="text-xs text-gray-500 mt-1 text-right">
                              ({t('origin')}: {city.distance_from_erbil_km || 0} {t('unitKm')})
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-right w-32">
                          <div className="flex justify-end">
                            {city.has_intercity_bus_line ? (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                                <Bus className="h-3 w-3 mr-1" />
                                {t('available')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300">
                                {t('unavailable')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right w-24">
                          <div className="flex justify-end">
                            <Badge variant={city.is_active ? "default" : "secondary"}>
                              {city.is_active ? t('enabledStatus') : t('disabledStatus')}
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
                              {t('editAction')}
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
          <DialogContent className="max-w-2xl" dir={direction}>
            <DialogHeader>
              <DialogTitle>{t('editProvince')}</DialogTitle>
              <DialogDescription>{t('editProvince')} {editingProvince?.name_arabic}</DialogDescription>
            </DialogHeader>
            {editingProvince && (
              <form onSubmit={(e) => { e.preventDefault(); handleEditProvince(new FormData(e.currentTarget)); }}>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name_arabic">{t('provinceArabicName')}</Label>
                    <Input 
                      id="name_arabic" 
                      name="name_arabic" 
                      defaultValue={editingProvince.name_arabic}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name_english">{t('provinceEnglishName')}</Label>
                    <Input 
                      id="name_english" 
                      name="name_english" 
                      defaultValue={editingProvince.name_english}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capital">{t('capital')}</Label>
                    <Input 
                      id="capital" 
                      name="capital" 
                      defaultValue={editingProvince.capital}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">{t('region')}</Label>
                    <select 
                      name="region" 
                      defaultValue={editingProvince.region}
                      className="w-full p-2 border rounded"
                    >
                      <option value="north">{t('north')}</option>
                      <option value="center">{t('center')}</option>
                      <option value="south">{t('south')}</option>
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
                      <Label htmlFor="is_active">{t('active')}</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditProvinceDialogOpen(false)}>{t('cancel')}</Button>
                  <Button type="submit" disabled={updateProvinceMutation.isPending}>
                    {updateProvinceMutation.isPending ? t('updating') : t('update')}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit City Dialog */}
        <Dialog open={isEditCityDialogOpen} onOpenChange={setIsEditCityDialogOpen}>
          <DialogContent className="max-w-2xl" dir={direction}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                  {t('editCity')}
              </DialogTitle>
              <DialogDescription className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-blue-700">🏙️</span>
                  <span>{t('editCity')} <strong>{editingCity?.name_arabic || editingCity?.name}</strong></span>
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {t('province')}: {editingCity?.province_name}
                </div>
              </DialogDescription>
            </DialogHeader>
            {editingCity && (
              <form onSubmit={(e) => { e.preventDefault(); handleEditCity(new FormData(e.currentTarget)); }}>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="city_name_arabic">{t('cityArabicName')}</Label>
                    <Input 
                      id="city_name_arabic" 
                      name="name_arabic" 
                      defaultValue={editingCity.name_arabic || editingCity.name}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city_name_english">{t('cityEnglishName')}</Label>
                    <Input 
                      id="city_name_english" 
                      name="name_english" 
                      defaultValue={editingCity.name_english || editingCity.name}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="distance_from_erbil_km" className="text-blue-700 font-medium">
                      {t('originDistance')}
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
                        {t('unitKm')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                      {t('distanceHelp')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('province')}</Label>
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
                      <Label htmlFor="city_is_active">{t('active')}</Label>
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
                        {t('busService')}
                      </Label>
                    </div>
                    <p className="text-xs text-blue-600 px-3">
                      {t('busHelp')}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditCityDialogOpen(false)}>{t('cancel')}</Button>
                  <Button type="submit" disabled={updateCityMutation.isPending}>
                    {updateCityMutation.isPending ? t('updating') : t('update')}
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
        toast({ title: t('success'), description: t('readyVehicleCreated') });
      },
      onError: () => {
        toast({ title: t('error'), description: t('readyVehicleError'), variant: "destructive" });
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
        toast({ title: t('success'), description: t('readyVehicleUpdated') });
      },
      onError: () => {
        toast({ title: t('error'), description: t('readyVehicleError'), variant: "destructive" });
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
        toast({ title: t('success'), description: t('readyVehicleDeleted') });
      },
      onError: () => {
        toast({ title: t('error'), description: t('operationFailed'), variant: "destructive" });
      }
    });

    // Handle form submission for creating ready vehicle
    const handleCreateReadyVehicle = (e: React.FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      
      // Determine vehicle template and type based on selection
      const selectedVehicleType = formData.get('vehicleType') as string;
        const isCustomType = selectedVehicleType === 'سایر'; // stored enum compatibility
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
        const isCustomType = selectedVehicleType === 'سایر'; // stored enum compatibility
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
              {t('fleetManagement')}
            </h3>
            <p className="text-muted-foreground text-sm">{t('fleetDescription')}</p>
          </div>
          <Button 
            onClick={() => setIsCreateReadyVehicleDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('addFleetVehicle')}
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto"><Table className="min-w-[1100px] border border-slate-200">
              <TableHeader className="sticky top-0 bg-slate-700">
                <TableRow>
                  <TableHead className="text-start">{t('vehicleType')}</TableHead>
                  <TableHead className="text-start">{t('plate')}</TableHead>
                  <TableHead className="text-start">{t('driver')}</TableHead>
                  <TableHead className="text-start">{t('phone')}</TableHead>
                  <TableHead className="text-start">{t('capacity')}</TableHead>
                  <TableHead className="text-start">{t('description')}</TableHead>
                  <TableHead className="text-start">{t('location')}</TableHead>
                  <TableHead className="text-start">{t('status')}</TableHead>
                  <TableHead className="text-start">{t('operations')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingFleetVehicles ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">{t('loading')}</TableCell>
                  </TableRow>
                ) : readyVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Truck className="h-12 w-12 text-gray-400" />
                        <p className="text-gray-600">{t('noFleetVehicles')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  readyVehicles.map((vehicle: ReadyVehicle) => (
                        <TableRow key={vehicle.id} className="border-slate-200 odd:bg-slate-50 even:bg-white hover:bg-amber-50">
                      <TableCell>{vehicle.vehicleType}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {vehicle.licensePlate}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{displayDriverName(vehicle.driverName)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-blue-600" />
                          <span className="font-mono text-blue-600">{vehicle.driverMobile}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Weight className="h-3 w-3 text-orange-600" />
                          <span className="font-medium text-orange-600">{vehicle.loadCapacity} {t('unitKg')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {vehicle.supportsFlammable && (
                            <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">
                              <Flame className="h-3 w-3 mr-1" />
                              {t('flammableAllowed')}
                            </Badge>
                          )}
                          {vehicle.notAllowedFlammable && (
                            <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200">
                              <X className="h-3 w-3 mr-1" />
                              {t('flammableForbidden')}
                            </Badge>
                          )}
                          {!vehicle.supportsFlammable && !vehicle.notAllowedFlammable && (
                            <span className="text-gray-500 text-xs">{t('normal')}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {vehicle.currentLocation || t('noLocation')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={vehicle.isAvailable ? "default" : "destructive"}>
                          {vehicle.isAvailable ? t('activeReady') : t('busy')}
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
                            {t('editAction')}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => deleteReadyVehicleMutation.mutate(vehicle.id)}
                            disabled={deleteReadyVehicleMutation.isPending}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <AlertTriangle className="h-4 w-4 ml-1" />
                            {t('delete')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table></div>
          </CardContent>
        </Card>

        {/* Create Ready Vehicle Dialog */}
        <Dialog open={isCreateReadyVehicleDialogOpen} onOpenChange={setIsCreateReadyVehicleDialogOpen}>
          <DialogContent className="max-w-2xl" dir={direction}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-green-600" />
                {t('addFleetVehicle')}
              </DialogTitle>
              <DialogDescription>
                {t('fleetDescription')}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateReadyVehicle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="vehicleType">{t('template')} *</Label>
                  <Select 
                    name="vehicleType" 
                    value={selectedVehicleType}
                    onValueChange={(value) => {
                      setSelectedVehicleType(value);
                    }}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('selectVehicleType')} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingVehicleTemplates ? (
                        <SelectItem value="loading" disabled>{t('loading')}</SelectItem>
                      ) : (vehicleTemplatesData as any)?.data?.length > 0 ? (
                        (vehicleTemplatesData as any)?.data?.map((template: any) => (
                          <SelectItem key={template.id} value={template.name}>
                            {template.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-data" disabled>{t('noData')}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                </div>
                <div className="space-y-2">
                  <Label htmlFor="licensePlate">{t('plate')} *</Label>
                  <Input 
                    id="licensePlate" 
                    name="licensePlate" 
                    required 
                    placeholder={t('plateExample')}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverName">{t('driver')} *</Label>
                  <Input 
                    id="driverName" 
                    name="driverName" 
                    required 
                    placeholder={t('driverNamePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverMobile">{t('phone')} *</Label>
                  <Input 
                    id="driverMobile" 
                    name="driverMobile" 
                    required 
                    placeholder={t('mobileExample')}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loadCapacity">{t('capacity')} ({t('unitKg')}) *</Label>
                  <Input 
                    id="loadCapacity" 
                    name="loadCapacity" 
                    type="number" 
                    required 
                    placeholder={t('capacityExample')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentLocation">{t('location')}</Label>
                  <Input 
                    id="currentLocation" 
                    name="currentLocation" 
                    placeholder={t('locationExample')}
                  />
                </div>
                
                {/* Special Capabilities Section */}
                <div className="space-y-2 col-span-2">
                  <Label className="text-base font-semibold text-blue-700">{t('specialCapabilities')}</Label>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <input type="hidden" name="supportsFlammable" value="false" />
                      <input 
                        type="checkbox" 
                        id="supportsFlammable" 
                        name="supportsFlammable" 
                        value="true"
                      />
                      <Label htmlFor="supportsFlammable" className="text-green-700">{t('flammableAllowed')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="hidden" name="notAllowedFlammable" value="false" />
                      <input 
                        type="checkbox" 
                        id="notAllowedFlammable" 
                        name="notAllowedFlammable" 
                        value="true"
                      />
                      <Label htmlFor="notAllowedFlammable" className="text-red-700">{t('flammableForbidden')}</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="notes">{t('notes')}</Label>
                  <Input 
                    id="notes" 
                    name="notes" 
                    placeholder={t('notesPlaceholder')}
                  />
                </div>
                
                {/* Status Section */}
                <div className="space-y-2 col-span-2">
                  <Label className="text-base font-semibold text-green-700">{t('accessStatus')}</Label>
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
                      <Label htmlFor="isAvailable" className="font-medium">{t('availableStatus')}</Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateReadyVehicleDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={createReadyVehicleMutation.isPending}>
                  {createReadyVehicleMutation.isPending ? t('saving') : t('create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Ready Vehicle Dialog */}
        <Dialog open={isEditReadyVehicleDialogOpen} onOpenChange={setIsEditReadyVehicleDialogOpen}>
          <DialogContent className="max-w-2xl" dir={direction}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                {t('edit')}
              </DialogTitle>
              <DialogDescription>
                {t('editFleetDescription').replace('{plate}', selectedReadyVehicle?.licensePlate || '')}
              </DialogDescription>
            </DialogHeader>
            
            {selectedReadyVehicle && (
              <form onSubmit={handleUpdateReadyVehicle} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-vehicleType">{t('template')} *</Label>
                    <Select 
                      name="vehicleType" 
                      value={selectedEditVehicleType}
                      onValueChange={(value) => {
                        setSelectedEditVehicleType(value);
                      }}
                      required
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('selectVehicleType')} />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingVehicleTemplates ? (
                          <SelectItem value="loading" disabled>{t('loading')}</SelectItem>
                        ) : (vehicleTemplatesData as any)?.data?.length > 0 ? (
                          (vehicleTemplatesData as any)?.data?.map((template: any) => (
                            <SelectItem key={template.id} value={template.name}>
                              {template.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-data" disabled>{t('noData')}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>

                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-licensePlate">{t('plate')} *</Label>
                    <Input 
                      id="edit-licensePlate" 
                      name="licensePlate" 
                      required 
                      defaultValue={selectedReadyVehicle.licensePlate}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-driverName">{t('driver')} *</Label>
                    <Input 
                      id="edit-driverName" 
                      name="driverName" 
                      required 
                      defaultValue={selectedReadyVehicle.driverName}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-driverMobile">{t('phone')} *</Label>
                    <Input 
                      id="edit-driverMobile" 
                      name="driverMobile" 
                      required 
                      defaultValue={selectedReadyVehicle.driverMobile}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-loadCapacity">{t('capacity')} ({t('unitKg')}) *</Label>
                    <Input 
                      id="edit-loadCapacity" 
                      name="loadCapacity" 
                      type="number" 
                      required 
                      defaultValue={selectedReadyVehicle.loadCapacity}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-currentLocation">{t('location')}</Label>
                    <Input 
                      id="edit-currentLocation" 
                      name="currentLocation" 
                      defaultValue={selectedReadyVehicle.currentLocation || ''}
                    />
                  </div>
                  
                  {/* Special Capabilities Section */}
                  <div className="space-y-2 col-span-2">
                  <Label className="text-base font-semibold text-blue-700">{t('specialCapabilities')}</Label>
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
                        <Label htmlFor="edit-supportsFlammable" className="text-green-700">{t('flammableAllowed')}</Label>
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
                        <Label htmlFor="edit-notAllowedFlammable" className="text-red-700">{t('flammableForbidden')}</Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="edit-notes">{t('notes')}</Label>
                    <Input 
                      id="edit-notes" 
                      name="notes" 
                      defaultValue={selectedReadyVehicle.notes || ''}
                    />
                  </div>
                  
                  {/* Status Section */}
                  <div className="space-y-2 col-span-2">
                    <Label className="text-base font-semibold text-green-700">{t('accessStatus')}</Label>
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
                        <Label htmlFor="edit-isAvailable" className="font-medium">{t('availableStatus')}</Label>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditReadyVehicleDialogOpen(false)}>
                    {t('cancel')}
                  </Button>
                  <Button type="submit" disabled={updateReadyVehicleMutation.isPending}>
                    {updateReadyVehicleMutation.isPending ? t('updating') : t('update')}
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
    <div className="container mx-auto min-h-[100dvh] p-4 md:p-6" dir={direction}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {mappedLogisticsOrders.length} {t('activeOrders')}
          </Badge>
          {orderCount > 0 && (
            <Badge className="bg-orange-500 animate-pulse">
              {orderCount} {t('newOrders')}
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 border border-slate-200 bg-slate-100 p-1">
          <TabsTrigger value="orders">{t('orders')}</TabsTrigger>
          <TabsTrigger value="delivered">{t('delivered')}</TabsTrigger>
          <TabsTrigger value="companies">{t('tabTransportCompanies')}</TabsTrigger>
          <TabsTrigger value="international">{t('tabGeography')}</TabsTrigger>
          <TabsTrigger value="vehicle-templates">{t('tabVehicleTemplates')}</TabsTrigger>
          <TabsTrigger value="fleet-vehicles">{t('tabFleet')}</TabsTrigger>
          <TabsTrigger value="vehicle-history">{t('tabVehicleHistory')}</TabsTrigger>
          <TabsTrigger value="postal">{t('tabPostalServices')}</TabsTrigger>
          <TabsTrigger value="postal-params">{t('tabPostalRates')}</TabsTrigger>
          <TabsTrigger 
            value="delivery-services" 
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white hover:from-indigo-600 hover:to-purple-600"
          >
            {t('tabDeliveryServices')}
          </TabsTrigger>
          <TabsTrigger value="settings">{t('tabSettings')}</TabsTrigger>
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
          <InternationalGeographyTab iraqContent={<GeographyTab />} />
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

        <TabsContent value="settings">
          <NotificationSettingsTab />
        </TabsContent>
      </Tabs>

      {/* Vehicle Assignment Dialog */}
      <Dialog open={isVehicleAssignmentOpen} onOpenChange={setIsVehicleAssignmentOpen}>
        <DialogContent className="max-w-4xl" dir={direction}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-6 h-6 text-orange-600" />
              {t('assignmentTitle').replace('{order}', selectedOrderForVehicle?.orderNumber || '')}
            </DialogTitle>
            <DialogDescription>
              {t('assignmentDescription')}
            </DialogDescription>
          </DialogHeader>

          {selectedOrderForVehicle && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  {t('orderInformation')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">{t('customer')}</Label>
                    <p className="font-medium">
                      {selectedOrderForVehicle.customer?.firstName} {selectedOrderForVehicle.customer?.lastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">{t('cargoWeight')}</Label>
                    <p className="font-medium">
                      {selectedOrderForVehicle.calculatedWeight || selectedOrderForVehicle.totalWeight} {t('unitKg')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">{t('customerDestination')}</Label>
                    <p className="font-medium">
                      {(selectedOrderForVehicle.shippingAddress as any)?.city || t('unknown')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer's Selected Vehicle Details */}
              {selectedVehicleDetails && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {t('customerSelectedVehicle')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">{t('vehicleType')}</Label>
                      <p className="font-medium">{selectedVehicleDetails.vehicleType}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">{t('vehicle')}</Label>
                      <p className="font-medium">{selectedVehicleDetails.vehicleName}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">{t('calculatedCost')}</Label>
                      <p className="font-medium text-green-700">
                        {parseInt(selectedVehicleDetails.totalCost || 0).toLocaleString()} {t('currencyIqd')}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">{t('capacity')}</Label>
                      <p className="font-medium">{selectedVehicleDetails.maxWeight} {t('unitKg')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Available Fleet Vehicles */}
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-orange-800 flex items-center">
                    <Truck className="w-5 h-5 mr-2" />
                    {t('readyFleet')}
                  </h3>
                  {(!user || ((adminUser as any)?.success === false && (adminUser as any)?.message?.includes('Access denied'))) && (
                    <Button
                      onClick={() => window.location.href = '/admin/login'}
                      size="sm"
                      variant="outline"
                      className="text-xs border-orange-300 text-orange-700 hover:bg-orange-100"
                    >
                      <LogIn className="w-4 h-4 ml-2" />
                      {!user ? t('loginToViewVehicles') : t('adminLogin')}
                    </Button>
                  )}
                </div>
                {selectedVehicleDetails && (
                  <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 text-blue-800 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      {t('vehiclePriority')}
                    </div>
                  </div>
                )}
                
                {availableFleetVehicles.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-400" />
                    <p className="text-orange-600 mb-4">
                      {!user 
                        ? t('loginVehiclesMessage')
                        : (adminUser as any)?.success === false && (adminUser as any)?.message?.includes('Access denied')
                        ? t('restrictedVehiclesMessage')
                        : t('noReadyVehicleForType')
                      }
                    </p>
                    {(!user || ((adminUser as any)?.success === false && (adminUser as any)?.message?.includes('Access denied'))) ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-sm text-blue-700 space-y-2 text-right">
                          <p className="font-medium">💡 {t('adminGuide')}</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>{t('signOutCustomer')}</li>
                            <li>{t('openAdminArea')}</li>
                            <li>{t('vehiclesAfterLogin')}</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>{t('possibleReasons')}</p>
                        <ul className="list-disc list-inside text-right">
                          <li>{t('allVehiclesInUse')}</li>
                          <li>{t('capacityBelowCargo')}</li>
                          <li>{t('addVehicleToFleetReason')}</li>
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableFleetVehicles.map((vehicle) => {
                      const customerVehicleType = selectedOrderForVehicle?.customerVehicleType || selectedOrderForVehicle?.vehicleType;
                      const isCustomerSelected = customerVehicleType && (
                        vehicle.vehicleType === customerVehicleType ||
                        vehicle.vehicleName === customerVehicleType ||
                        (vehicle.vehicleType && customerVehicleType.includes(vehicle.vehicleType)) ||
                        (vehicle.vehicleName && customerVehicleType.includes(vehicle.vehicleName))
                      );
                      const showDetails = expandedVehicleIds.has(vehicle.id);
                      const toggleDetails = () => {
                        setExpandedVehicleIds(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(vehicle.id)) {
                            newSet.delete(vehicle.id);
                          } else {
                            newSet.add(vehicle.id);
                          }
                          return newSet;
                        });
                      };
                      
                      return (
                      <div 
                        key={vehicle.id} 
                        className={`bg-white rounded-lg p-3 border transition-all duration-300 ${
                          isCustomerSelected
                            ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-yellow-100 ring-2 ring-amber-300 shadow-lg'
                            : vehicle.isCheckoutSuggested 
                            ? 'border-green-500 bg-green-50 ring-1 ring-green-200 shadow-md' 
                            : 'border-orange-200'
                        }`}
                      >
                        {/* Single Row Layout */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          {/* Vehicle Type & Badges */}
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <h4 className={`font-bold text-sm ${
                              isCustomerSelected ? 'text-amber-800' : vehicle.isCheckoutSuggested ? 'text-green-800' : 'text-gray-800'
                            }`}>
                              {vehicle.vehicleType || vehicle.vehicleName}
                            </h4>
                            {isCustomerSelected && (
                              <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white animate-pulse text-xs px-2 py-0.5">
                                ⭐ {t('selectedByCustomer')}
                              </Badge>
                            )}
                            <Badge className="bg-green-500 text-white text-xs px-2 py-0.5">{t('ready')}</Badge>
                          </div>

                          {/* Key Info in Row */}
                          <div className="flex items-center gap-4 text-xs flex-wrap">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">{t('plate')}:</span>
                              <span className="font-medium">{vehicle.licensePlate || vehicle.plateNumber}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">{t('driver')}:</span>
                              <span className="font-medium">{displayDriverName(vehicle.driverName)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">{t('phone')}:</span>
                              <span className="font-medium">{vehicle.driverMobile || vehicle.driverPhone}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">{t('capacity')}:</span>
                              <span className="font-medium">{vehicle.loadCapacity || vehicle.maxWeight} kg</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            {(vehicle.recommendationScore || vehicle.matchReason) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8"
                                onClick={toggleDetails}
                              >
                                <Info className="w-3 h-3 ml-1" />
                                {showDetails ? t('collapse') : t('details')}
                              </Button>
                            )}
                            <Button 
                              size="sm"
                              className={`h-8 transition-all duration-300 ${
                                isCustomerSelected
                                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600'
                                  : vehicle.matchType === 'exact'
                                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                                  : 'bg-blue-600 hover:bg-blue-700'
                              } text-white text-xs`}
                              onClick={() => assignVehicleToOrder(
                                vehicle.id, 
                                vehicle.licensePlate || vehicle.plateNumber, 
                                vehicle.driverName, 
                                vehicle.driverMobile || vehicle.driverPhone
                              )}
                            >
                              <Truck className="w-3 h-3 ml-1" />
                              {t('vehicleAssignment')}
                            </Button>
                          </div>
                        </div>

                        {/* Expandable Details Section */}
                        {showDetails && (
                          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                            {vehicle.recommendationScore && (
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-gray-600">{t('smartScore')}:</span>
                                <div className={`px-2 py-1 rounded-full font-bold ${
                                  vehicle.recommendationScore >= 80 ? 'bg-green-600 text-white' :
                                  vehicle.recommendationScore >= 60 ? 'bg-yellow-500 text-white' :
                                  'bg-orange-500 text-white'
                                }`}>
                                  {vehicle.recommendationScore}
                                </div>
                                {vehicle.isRecommended && (
                                  <Badge className="bg-green-600 text-white text-xs">🤖 {t('smartRecommendation')}</Badge>
                                )}
                              </div>
                            )}
                            {vehicle.recommendationReasons && vehicle.recommendationReasons.length > 0 && (
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">{t('reasons')}: </span>
                                {vehicle.recommendationReasons.join(' | ')}
                              </div>
                            )}
                            {vehicle.matchReason && (
                              <div className={`text-xs ${
                                vehicle.matchType === 'exact' ? 'text-green-700' : 
                                vehicle.matchType === 'partial' ? 'text-yellow-700' : 'text-blue-700'
                              }`}>
                                {vehicle.matchReason}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })}
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
                {t('print')}
              </Button>
              <div className="text-right flex-1">
                <DialogTitle className="text-right">
                  {t('orderDetailsTitle').replace('{order}', selectedOrder?.orderNumber || `#${selectedOrder?.customerOrderId}`)}
                </DialogTitle>
                <DialogDescription className="text-right">
                  {t('orderDetailsDescription')}
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
                  {t('customerInformation')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">{t('fullName')}</Label>
                    <p className="font-medium">
                      {selectedOrder.customer?.firstName || selectedOrder.customerFirstName} {selectedOrder.customer?.lastName || selectedOrder.customerLastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">{t('contactNumber')}</Label>
                    <p className="font-medium flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-blue-600" />
                      {selectedOrder.customer?.phone || selectedOrder.customerPhone}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">{t('email')}</Label>
                    <p className="font-medium">{selectedOrder.customer?.email || selectedOrder.customerEmail || t('notRegistered')}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">{t('deliveryCode')}</Label>
                    <p className="font-bold text-purple-700 text-lg">
                      {selectedOrder.deliveryCode || t('noDeliveryCode')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    {t('deliveryAddress')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">{t('recipient')}</Label>
                      <p className="font-medium">{(selectedOrder.shippingAddress as any)?.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">{t('recipientPhone')}</Label>
                      <p className="font-medium flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-green-600" />
                        {(selectedOrder.shippingAddress as any)?.phone}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                       <Label className="text-sm text-gray-600">{t('fullAddress')}</Label>
                      <p className="font-medium">{(selectedOrder.shippingAddress as any)?.address}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">{t('city')}</Label>
                      <p className="font-medium">{(selectedOrder.shippingAddress as any)?.city}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">{t('postalCode')}</Label>
                      <p className="font-medium">{(selectedOrder.shippingAddress as any)?.postalCode}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Details - Enhanced Format */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-6 border border-orange-200">
                <h3 className="text-xl font-bold text-orange-800 mb-4 flex items-center">
                  <Package className="w-6 h-6 mr-2" />
                  {t('orderDetails')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Weight Information */}
                  <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center mb-2">
                      <Weight className="w-4 h-4 mr-1 text-blue-600" />
                      {t('weightInformation')}
                    </Label>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('calculatedWeight')}:</span>
                        <span className="font-semibold text-blue-700">{selectedOrder.calculatedWeight || 0} {t('unitKg')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('totalWeight')}:</span>
                        <span className="font-semibold text-purple-700">{selectedOrder.totalWeight || 0} {t('unitKg')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('weightUnit')}:</span>
                        <span className="font-medium">{selectedOrder.weightUnit || t('unitKg')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Information */}
                  <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center mb-2">
                      <Calculator className="w-4 h-4 mr-1 text-green-600" />
                      {t('financialInformation')}
                    </Label>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('totalAmount')}:</span>
                        <span className="font-bold text-green-700">{Math.floor(parseFloat(selectedOrder.totalAmount || '0')).toLocaleString()} {selectedOrder.currency || t('currencyIqd')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('currency')}:</span>
                        <span className="font-medium">{selectedOrder.currency || t('iraqiDinar')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('orderNumberLabel')}:</span>
                        <span className="font-semibold text-orange-700">{selectedOrder.orderNumber}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{t('paymentMethod')}:</span>
                        <Badge variant="outline" className="text-xs">
                          {selectedOrder.paymentMethod || t('unknown')}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Information */}
                  <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center mb-2">
                      <Truck className="w-4 h-4 mr-1 text-purple-600" />
                      {t('deliveryInformation')}
                    </Label>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('method')}:</span>
                        <span className="font-semibold text-purple-700">{selectedOrder.vehicleType || selectedOrder.selectedVehicleName || 
                          (selectedOrder.deliveryMethod === 'smart_vehicle' ? `🚚 ${t('smartVehicleMethod')}` :
                           selectedOrder.deliveryMethod === 'self_pickup' ? `🏢 ${t('selfPickupMethod')}` :
                           selectedOrder.deliveryMethod === 'freight_collect' ? `💰 ${t('freightCollectMethod')}` :
                           selectedOrder.deliveryMethod === 'postal' ? `📮 ${t('postalMethod')}` :
                           selectedOrder.deliveryMethod === 'courier' ? t('courierMethod') :
                           selectedOrder.deliveryMethod || `⚠️ ${t('unknown')}`)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('transportationType')}:</span>
                        <span className="font-medium">{selectedOrder.transportationType || t('standard')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('trackingCode')}:</span>
                        <span className="font-medium text-blue-600">{selectedOrder.trackingNumber || t('unknown')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status and Dates Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center mb-2">
                      <History className="w-4 h-4 mr-1 text-indigo-600" />
                      {t('importantDates')}
                    </Label>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('createdDate')}:</span>
                        <span className="font-medium">{formatLogisticsDate(selectedOrder.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('lastUpdated')}:</span>
                        <span className="font-medium">{formatLogisticsDate(selectedOrder.updatedAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('approximateDelivery')}:</span>
                        <span className="font-medium">{formatLogisticsDate(selectedOrder.estimatedDeliveryDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center mb-2">
                      <AlertCircle className="w-4 h-4 mr-1 text-red-600" />
                      {t('deliveryStatusCode')}
                    </Label>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{t('currentStatus')}:</span>
                        <Badge variant={selectedOrder.currentStatus === 'logistics_dispatched' ? 'default' : 'secondary'}>
                          {getStatusDisplayName(selectedOrder.currentStatus, language)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('deliveryCode')}:</span>
                        <span className="font-bold text-red-600">{selectedOrder.deliveryCode || t('unset')}</span>
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
                     {t('deliveryNotes')}
                  </h3>
                  <p className="text-gray-700">{selectedOrder.deliveryNotes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Suitable Vehicles Dialog */}
      <Dialog open={isSuitableVehiclesOpen} onOpenChange={setIsSuitableVehiclesOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir={direction}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5 text-blue-600" />
              {t('suitableVehiclesTitle').replace('{order}', selectedOrderForVehicle?.orderNumber || '')}
            </DialogTitle>
            <DialogDescription>
              {t('suitableVehiclesDescription')}
            </DialogDescription>
          </DialogHeader>

          {suitableVehiclesData && (
            <div className="space-y-6">
              {/* Order Summary */}
              <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    {t('orderSummary')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{t('destinationLabel')}:</span>
                      <span className="font-medium">{suitableVehiclesData.order?.destinationCity}</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Weight className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{t('weightLabel')}:</span>
                        <span className="font-bold text-blue-700">{suitableVehiclesData.order?.weight?.toLocaleString()} {suitableVehiclesData.order?.weightUnit || t('unitKg')}</span>
                      </div>
                      {suitableVehiclesData.order?.weightSource && (
                        <span className="text-xs text-gray-400 mt-1">
                          ({suitableVehiclesData.order.weightSource === 'order_management_calculated' ? t('warehouseCalculation') :
                            suitableVehiclesData.order.weightSource === 'order_management_total' ? t('recordedWeight') : t('automaticCalculation')})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{t('distanceLabel')}:</span>
                      <span className="font-medium">{suitableVehiclesData.order?.distance} {t('unitKm')}</span>
                    </div>
                    {suitableVehiclesData.order?.customerVehicleType && (
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-purple-500" />
                        <span className="text-sm text-gray-600">{t('customerSelectedVehicle')}:</span>
                        <Badge className="bg-purple-100 text-purple-800">{suitableVehiclesData.order.customerVehicleType}</Badge>
                      </div>
                    )}
                    {suitableVehiclesData.order?.containsFlammableProducts && (
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-600">{t('containsFlammable')}</span>
                      </div>
                    )}
                  </div>
                  
                  {suitableVehiclesData.order?.flammableProducts?.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="font-medium text-red-800 mb-2">{t('flammableProducts')}:</h4>
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
                      {t('optimalVehicle')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">{t('vehicleName')}:</span>
                        <p className="font-medium">{suitableVehiclesData.optimalVehicle.name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">{t('type')}:</span>
                        <p className="font-medium">{suitableVehiclesData.optimalVehicle.vehicleType}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">{t('totalCost')}:</span>
                        <p className="font-bold text-green-700">{Math.floor(suitableVehiclesData.optimalVehicle.totalCost).toLocaleString()} {t('currencyIqd')}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">{t('capacity')}:</span>
                        <p className="font-medium">{suitableVehiclesData.optimalVehicle.maxWeightKg} {t('unitKg')}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">{t('distanceCost')}:</span>
                        <p className="font-medium">{Math.floor(suitableVehiclesData.optimalVehicle.distanceCost).toLocaleString()} {t('currencyIqd')}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">{t('weightCost')}:</span>
                        <p className="font-medium">{Math.floor(suitableVehiclesData.optimalVehicle.weightCost).toLocaleString()} {t('currencyIqd')}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">{t('weightEfficiency')}:</span>
                        <p className="font-medium">{suitableVehiclesData.optimalVehicle.weightUtilization}%</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {suitableVehiclesData.optimalVehicle.safetyCompliant ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">{suitableVehiclesData.optimalVehicle.safetyCompliant ? t('safetyCompliant') : t('safetyNotCompliant')}</span>
                      </div>
                    </div>
                    {suitableVehiclesData.optimalVehicle.description && (
                      <div className="mt-3 p-2 bg-white rounded border">
                        <span className="text-sm text-gray-600">{t('description')}:</span>
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
                      {t('alternativeVehicles')} ({suitableVehiclesData.alternatives.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {suitableVehiclesData.alternatives.map((vehicle: any, index: number) => (
                        <div key={index} className="p-4 border rounded-lg bg-gray-50">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <span className="text-sm text-gray-600">{t('vehicleName')}:</span>
                              <p className="font-medium">{vehicle.name}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">{t('type')}:</span>
                              <p className="font-medium">{vehicle.vehicleType}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">{t('totalCost')}:</span>
                              <p className="font-bold text-blue-700">{Math.floor(vehicle.totalCost).toLocaleString()} {t('currencyIqd')}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">{t('capacity')}:</span>
                              <p className="font-medium">{vehicle.maxWeightKg} {t('unitKg')}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">{t('weightEfficiency')}:</span>
                              <p className="font-medium">{vehicle.weightUtilization}%</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {vehicle.safetyCompliant ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <X className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-sm">{vehicle.safetyCompliant ? t('safetyCompliant') : t('safetyNotCompliant')}</span>
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
                    {t('fleetSelection')}
                  </CardTitle>
                  <CardDescription>
                    {t('fleetSelectionDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {availableFleetVehicles && availableFleetVehicles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableFleetVehicles.map((vehicle: any) => {
                        const isCustomerSelected = vehicle.templateMatchType === 'exact' || 
                          (suitableVehiclesData.order?.customerVehicleType && 
                           (vehicle.vehicleTemplateName || vehicle.vehicleName || vehicle.vehicleType || '')
                             .toLowerCase().includes(suitableVehiclesData.order.customerVehicleType.toLowerCase()));
                        
                        return (
                        <div 
                          key={vehicle.id} 
                          className={`rounded-lg p-4 border-2 transition-all duration-300 cursor-pointer hover:shadow-lg relative ${
                            isCustomerSelected
                              ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-yellow-100 ring-4 ring-amber-300 shadow-xl scale-[1.02]' 
                              : vehicle.templateMatchType === 'partial'
                              ? 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-200 shadow-md'
                              : vehicle.isCheckoutSuggested 
                              ? 'border-green-500 bg-green-50 ring-2 ring-green-200 shadow-lg' 
                              : 'border-gray-300 bg-white hover:border-orange-500'
                          }`}
                          onClick={() => {
                            // Handle vehicle selection
                            console.log('Ready vehicle selected:', vehicle);
                          }}
                        >
                          {/* Customer Selected Vehicle Indicator */}
                          {isCustomerSelected && (
                            <div className="absolute -top-3 -right-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm px-4 py-1.5 rounded-full shadow-lg font-bold animate-pulse">
                              ⭐ {t('selectedByCustomer')}
                            </div>
                          )}
                          {vehicle.templateMatchType === 'partial' && !isCustomerSelected && (
                            <div className="absolute -top-2 -right-2 bg-yellow-600 text-white text-xs px-3 py-1 rounded-full shadow-md">
                              {t('partialMatch')} 🔄
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mb-3">
                            <h4 className={`font-semibold text-lg ${
                              isCustomerSelected ? 'text-amber-800' :
                              vehicle.templateMatchType === 'partial' ? 'text-yellow-800' :
                              vehicle.isCheckoutSuggested ? 'text-green-800' : 'text-gray-800'
                            }`}>
                              {vehicle.vehicleTemplateName || vehicle.vehicleName || vehicle.vehicleType}
                            </h4>
                            <div className="flex gap-2">
                              {isCustomerSelected && (
                                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm px-3 py-1">
                                   ⭐ {t('selectedByCustomer')}
                                </Badge>
                              )}
                              {vehicle.templateMatchType === 'partial' && !isCustomerSelected && (
                                <Badge className="bg-yellow-600 text-white">
                                   🔄 {t('similarCustomerSelection')}
                                </Badge>
                              )}
                              {vehicle.isCheckoutSuggested && !isCustomerSelected && !vehicle.templateMatchType && (
                                <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white animate-pulse">
                                   🎯 {t('systemSuggestion')}
                                </Badge>
                              )}
                               <Badge className="bg-green-500 text-white">{t('ready')}</Badge>
                            </div>
                          </div>
                          
                          {isCustomerSelected && (
                            <div className="bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-400 rounded-lg p-3 mb-4">
                              <div className="flex items-center gap-2 text-amber-800 text-sm font-bold">
                                <Star className="w-5 h-5 text-amber-600 fill-amber-400" />
                                 ⭐ {t('customerVehiclePriority')}
                              </div>
                            </div>
                          )}
                          
                          {vehicle.templateMatchType === 'partial' && !isCustomerSelected && (
                            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4">
                              <div className="flex items-center gap-2 text-yellow-800 text-sm font-medium">
                                <AlertTriangle className="w-4 h-4" />
                                 🔄 {t('partialCustomerMatch')}
                              </div>
                            </div>
                          )}
                          
                          {!vehicle.templateMatchType && !isCustomerSelected && vehicle.isCheckoutSuggested && (
                            <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-4">
                              <div className="flex items-center gap-2 text-green-800 text-sm font-medium">
                                <CheckCircle className="w-4 h-4" />
                                 {t('matchedCustomerSelection')}
                              </div>
                            </div>
                          )}
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between">
                               <span className="text-sm text-gray-600">{t('plateNumber')}:</span>
                              <span className="font-medium">{vehicle.licensePlate || vehicle.plateNumber}</span>
                            </div>
                            <div className="flex justify-between">
                               <span className="text-sm text-gray-600">{t('driver')}:</span>
                              <span className="font-medium">{displayDriverName(vehicle.driverName)}</span>
                            </div>
                            <div className="flex justify-between">
                               <span className="text-sm text-gray-600">{t('driverPhone')}:</span>
                              <span className="font-medium">{vehicle.driverMobile || vehicle.driverPhone}</span>
                            </div>
                            <div className="flex justify-between">
                               <span className="text-sm text-gray-600">{t('capacity')}:</span>
                               <span className="font-medium">{vehicle.loadCapacity || vehicle.maxWeight} {t('unitKg')}</span>
                            </div>
                          </div>
                          
                          <Button 
                            className={`w-full transition-all duration-300 ${
                              isCustomerSelected 
                                ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg' 
                                : vehicle.isCheckoutSuggested 
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
                            {isCustomerSelected ? `⭐ ${t('customerVehicleAssignment')}` : vehicle.isCheckoutSuggested ? t('recommendedVehicle') : t('assignThisVehicle')}
                          </Button>
                        </div>
                      );})}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-400" />
                      <p className="text-orange-600 mb-2">{t('noFleetAvailable')}</p>
                      <p className="text-sm text-gray-500">{t('chooseSuitableBelow')}</p>
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
                      {t('allSuitableVehicles')} ({suitableVehiclesData.suitableVehicles.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">{t('rowNumber')}</TableHead>
                            <TableHead className="text-right">{t('vehicleName')}</TableHead>
                            <TableHead className="text-right">{t('type')}</TableHead>
                            <TableHead className="text-right">{t('totalCost')}</TableHead>
                            <TableHead className="text-right">{t('capacity')}</TableHead>
                            <TableHead className="text-right">{t('weightEfficiency')}</TableHead>
                            <TableHead className="text-right">{t('safetyCompliant')}</TableHead>
                            <TableHead className="text-right">{t('select')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {suitableVehiclesData.suitableVehicles.map((vehicle: any, index: number) => (
                            <TableRow key={index} className={index === 0 ? "bg-green-50" : ""}>
                              <TableCell className="font-medium">
                                {index + 1}
                                {index === 0 && <span className="mr-2 text-green-600 text-xs">({t('optimalChoice')})</span>}
                              </TableCell>
                              <TableCell className="font-medium">{vehicle.name}</TableCell>
                              <TableCell>{vehicle.vehicleType}</TableCell>
                              <TableCell className="font-bold">
                                {Math.floor(vehicle.totalCost).toLocaleString()} {t('currencyIqd')}
                              </TableCell>
                              <TableCell>{vehicle.maxWeightKg} {t('unitKg')}</TableCell>
                              <TableCell>{vehicle.weightUtilization}%</TableCell>
                              <TableCell>
                                {vehicle.safetyCompliant ? (
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {t('safetyCompliant')}
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="bg-red-100 text-red-800">
                                    <X className="h-3 w-3 mr-1" />
                                    {t('safetyNotCompliant')}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  size="sm" 
                                  variant={index === 0 ? "default" : "outline"}
                                  className={index === 0 ? "bg-green-600 hover:bg-green-700 text-white" : "hover:bg-blue-50"}
                                  onClick={() => {
                                    console.log('Suitable vehicle selected:', vehicle);
                                    // Handle template vehicle selection - create a ready vehicle entry
                                    handleTemplateVehicleSelection(vehicle, index === 0);
                                  }}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  {index === 0 ? t('optimalChoice') : t('assignThisVehicle')}
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
                      {t('selectedVehiclesReady')} ({availableFleetVehicles.length})
                    </CardTitle>
                    <CardDescription>
                      {t('selectedVehiclesDescription')}
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
                                🎯 {t('optimalChoice')}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-xs text-gray-600 mb-3">
                            <div className="flex justify-between">
                              <span>{t('plate')}:</span>
                              <span className="font-medium">{vehicle.licensePlate || vehicle.plateNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{t('capacity')}:</span>
                              <span className="font-medium">{vehicle.loadCapacity || vehicle.maxWeight} {t('unitKg')}</span>
                            </div>
                            {vehicle.totalCost && (
                              <div className="flex justify-between">
                                <span>{t('cost')}:</span>
                                <span className="font-medium text-blue-700">{Math.floor(vehicle.totalCost).toLocaleString()} {t('currencyIqd')}</span>
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
                            {t('immediateAssignment')}
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    {availableFleetVehicles.length > 6 && (
                      <div className="mt-4 text-center">
                        <Badge variant="outline" className="text-blue-600">
                          +{availableFleetVehicles.length - 6} {t('moreVehiclesAvailable')}
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
              {t('close')}
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
                {t('orderDetailsTitle').replace('{order}', `#${selectedOrderForDetails.orderNumber || selectedOrderForDetails.customerOrderId}`)}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6" dir={direction}>
              {/* Order Status & Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    {t('orderInformation')}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('orderNumberLabel')}:</span>
                      <span className="font-medium">{selectedOrderForDetails.orderNumber || selectedOrderForDetails.customerOrderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('status')}:</span>
                      <span>{getStatusBadge(selectedOrderForDetails.currentStatus)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('totalAmount')}:</span>
                      <span className="font-medium">{Math.floor(parseFloat(selectedOrderForDetails.totalAmount)).toLocaleString()} {selectedOrderForDetails.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('cargoWeight')}:</span>
                      <span className="font-medium">{selectedOrderForDetails.calculatedWeight || selectedOrderForDetails.totalWeight || 0} {selectedOrderForDetails.weightUnit || t('unitKg')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('method')}:</span>
                      <span className="font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                        {selectedOrderForDetails.deliveryMethod === 'postal' ? t('postalMethod') :
                         selectedOrderForDetails.deliveryMethod === 'smart_vehicle' ? t('smartVehicleMethod') :
                         selectedOrderForDetails.deliveryMethod === 'self_pickup' ? t('selfPickupMethod') :
                         selectedOrderForDetails.deliveryMethod === 'freight_collect' ? t('freightCollectMethod') :
                         selectedOrderForDetails.deliveryMethod || t('notSpecified')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('deliveryCode')}:</span>
                      <span className="font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                        {selectedOrderForDetails.deliveryCode || t('notGenerated')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-green-50">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {t('customerInformation')}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('customerLabel')}:</span>
                      <span className="font-medium">
                        {selectedOrderForDetails.customer 
                          ? `${selectedOrderForDetails.customer.firstName || ''} ${selectedOrderForDetails.customer.lastName || ''}`.trim() 
                          : selectedOrderForDetails.customerFirstName && selectedOrderForDetails.customerLastName 
                            ? `${selectedOrderForDetails.customerFirstName} ${selectedOrderForDetails.customerLastName}` 
                            : t('unknown')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('phone')}:</span>
                      <span className="font-medium">{selectedOrderForDetails.customer?.phone || selectedOrderForDetails.customerPhone || t('notRegistered')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('email')}:</span>
                      <span className="font-medium">{selectedOrderForDetails.customer?.email || selectedOrderForDetails.customerEmail || t('notRegistered')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Information */}
              <div className="border rounded-lg p-4 bg-orange-50">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {t('deliveryInformation')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600 mb-1">{t('shippingAddress')}:</p>
                    <p className="font-medium">
                      {(() => {
                        const shippingData = selectedOrderForDetails.shippingAddress;
                        if (typeof shippingData === 'object' && shippingData !== null) {
                          return [(shippingData as any).address, (shippingData as any).city].filter(Boolean).join(', ') || t('noAddressRegistered');
                        }
                        return shippingData || selectedOrderForDetails.customerAddress || t('noAddressRegistered');
                      })()}
                    </p>
                  </div>
                  {selectedOrderForDetails.recipientName && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{t('recipient')}:</p>
                      <p className="font-medium">{selectedOrderForDetails.recipientName}</p>
                      {selectedOrderForDetails.recipientPhone && (
                        <p className="text-sm text-gray-500">{selectedOrderForDetails.recipientPhone}</p>
                      )}
                    </div>
                  )}
                  {selectedOrderForDetails.hasGpsLocation && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{t('gpsLocation')}:</p>
                      <p className="text-sm text-green-600">✓ {t('locationRecorded')}</p>
                      <p className="text-xs text-gray-500">
                        {t('latitude')}: {selectedOrderForDetails.gpsLatitude}, {t('longitude')}: {selectedOrderForDetails.gpsLongitude}
                      </p>
                    </div>
                  )}
                  {selectedOrderForDetails.deliveryNotes && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600 mb-1">{t('deliveryDescription')}:</p>
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
                    {t('trackingInformation')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedOrderForDetails.trackingNumber && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">{t('trackingCode')}:</p>
                        <p className="font-medium">{selectedOrderForDetails.trackingNumber}</p>
                      </div>
                    )}
                    {selectedOrderForDetails.deliveryPersonName && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">{t('deliveryPerson')}:</p>
                        <p className="font-medium">{selectedOrderForDetails.deliveryPersonName}</p>
                        {selectedOrderForDetails.deliveryPersonPhone && (
                          <p className="text-sm text-gray-500">{selectedOrderForDetails.deliveryPersonPhone}</p>
                        )}
                      </div>
                    )}
                    {(selectedOrderForDetails as any).vehicleType && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">{t('vehicleTypeLabel')}:</p>
                        <p className="font-medium">{(selectedOrderForDetails as any).vehicleType}</p>
                        {(selectedOrderForDetails as any).vehiclePlate && (
                          <p className="text-sm text-gray-500">{t('plateLabel')}: {(selectedOrderForDetails as any).vehiclePlate}</p>
                        )}
                      </div>
                    )}
                    {selectedOrderForDetails.estimatedDeliveryDate && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">{t('approximateDelivery')}:</p>
                        <p className="font-medium">{formatLogisticsDate(selectedOrderForDetails.estimatedDeliveryDate)}</p>
                      </div>
                    )}
                    {selectedOrderForDetails.actualDeliveryDate && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">{t('actualDelivery')}:</p>
                        <p className="font-medium">{formatLogisticsDate(selectedOrderForDetails.actualDeliveryDate)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* سیستم یادداشت‌های سلسله‌مراتبی - لجستیک تمام یادداشت‌های قبلی را می‌بیند */}
              {((selectedOrderForDetails as any).customerNotes || (selectedOrderForDetails as any).notes || 
                (selectedOrderForDetails as any).financialNotes || (selectedOrderForDetails as any).warehouseNotes) && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {t('orderNotes')}
                  </h3>
                  <div className="space-y-3">
                    {/* یادداشت مشتری */}
                    {((selectedOrderForDetails as any).customerNotes || (selectedOrderForDetails as any).notes) && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded text-xs font-medium">{t('customerLabel')}</span>
                          <span className="text-xs text-amber-600">{t('checkoutNote')}</span>
                        </div>
                        <p className="text-amber-900">{(selectedOrderForDetails as any).customerNotes || (selectedOrderForDetails as any).notes}</p>
                      </div>
                    )}
                    
                    {/* یادداشت بخش مالی */}
                    {(selectedOrderForDetails as any).financialNotes && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">{t('financialNote')}</span>
                          <span className="text-xs text-blue-600">{t('paymentApprovalNote')}</span>
                        </div>
                        <p className="text-blue-900">{(selectedOrderForDetails as any).financialNotes}</p>
                      </div>
                    )}
                    
                    {/* یادداشت انبار */}
                    {(selectedOrderForDetails as any).warehouseNotes && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded text-xs font-medium">{t('warehouseNote')}</span>
                          <span className="text-xs text-green-600">{t('warehouseProcessingNote')}</span>
                        </div>
                        <p className="text-green-900">{(selectedOrderForDetails as any).warehouseNotes}</p>
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
                    {t('financialInformation')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{t('reviewedDate')}:</p>
                      <p className="font-medium">{new Date((selectedOrderForDetails as any).financialReviewedAt).toLocaleDateString(locale)}</p>
                    </div>
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
                {t('printDetails')}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCloseOrderDetails}
              >
                {t('close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Two-step Delivery Confirmation Dialog */}
      <AlertDialog open={deliveryConfirmDialogOpen} onOpenChange={setDeliveryConfirmDialogOpen}>
        <AlertDialogContent dir={direction} className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className={deliveryConfirmStep === 1 ? "text-amber-600" : "text-red-600"}>
              {deliveryConfirmStep === 1 
                ? t('confirmDeliveryStepOne')
                : t('confirmDeliveryStepTwo')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 text-right">
              {deliveryConfirmStep === 1 ? (
                <div className="space-y-3">
                  <p className="text-base font-medium text-gray-800">
                    {t('confirmDeliveryQuestion')}
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm font-bold text-blue-800 mb-2">{t('orderInformation')}:</p>
                    <p className="text-sm text-blue-700">
                      {t('orderNumberLabel')}: <span className="font-bold">{getConfirmingDeliveryOrder()?.orderNumber}</span>
                    </p>
                    <p className="text-sm text-blue-700">
                      {t('customerLabel')}: <span className="font-bold">
                        {getConfirmingDeliveryOrder()?.customer?.firstName} {getConfirmingDeliveryOrder()?.customer?.lastName}
                      </span>
                    </p>
                    <p className="text-sm text-blue-700">
                      {t('deliveryCode')}: <span className="font-bold">{getConfirmingDeliveryOrder()?.deliveryCode || t('noDeliveryCode')}</span>
                    </p>
                  </div>
                  <p className="text-sm text-amber-600 font-medium">
                    {t('reviewCarefully')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-base font-bold text-red-800 mb-2">
                      {t('irreversibleWarning')}
                    </p>
                    <p className="text-sm text-red-700">
                      {t('finalDeliveryStatusWarning')}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-bold text-gray-800 mb-2">{t('finalConfirmation')}:</p>
                    <p className="text-lg font-bold text-gray-900">
                      {getConfirmingDeliveryOrder()?.orderNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      {getConfirmingDeliveryOrder()?.customer?.firstName} {getConfirmingDeliveryOrder()?.customer?.lastName}
                    </p>
                  </div>
                  <p className="text-sm text-red-600 font-bold">
                    {t('areYouAbsolutelySure')}
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
              {t('cancel')}
            </AlertDialogCancel>
            {deliveryConfirmStep === 1 ? (
              <Button 
                onClick={handleDeliveryConfirmStep1}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
                data-testid="button-delivery-step1"
              >
                {t('continueNext')}
              </Button>
            ) : (
              <Button 
                onClick={handleDeliveryConfirmStep2}
                className="flex-1 bg-red-600 hover:bg-red-700"
                data-testid="button-delivery-step2"
              >
                {t('finalDeliveryConfirm')}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );


};

export default LogisticsManagement;