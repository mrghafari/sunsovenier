import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { geographicAnalyticsLocalization } from "@/lib/geographic-analytics-localization";
import { getOrderStatusLabel, resolveOrderStatus } from "../../../../shared/order-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { MapPin, Package, TrendingUp, Users, DollarSign, ShoppingCart, Calendar, Download, Filter, ArrowUpDown, ArrowUp, ArrowDown, Navigation, Target, Clock, CheckCircle, AlertTriangle, Maximize2, Minimize2 } from "lucide-react";

interface GeographicData {
  region: string;
  country: string;
  city: string;
  totalOrders: number;
  totalRevenue: number;
  customerCount: number;
  avgOrderValue: number;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

interface ProductAnalytics {
  name: string;
  category: string;
  totalSales: number;
  revenue: number;
  regions: Array<{
    region: string;
    city: string;
    quantity: number;
    revenue: number;
  }>;
}

interface TimeSeriesData {
  date: string;
  orders: number;
  revenue: number;
  regions: { [key: string]: number };
}

interface RegionOrder {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
  customerId: number;
  customerName: string;
  phone: string;
  email: string;
}

interface GpsDeliveryData {
  id: number;
  deliveryVerificationId: number;
  customerOrderId: number;
  latitude: string;
  longitude: string;
  accuracy: string;
  deliveryPersonName: string;
  deliveryPersonPhone: string;
  addressMatched: boolean;
  customerAddress: string;
  detectedAddress: string;
  distanceFromCustomer: string;
  country: string;
  city: string;
  region: string;
  verificationTime: string;
  deliveryNotes: string;
}

interface GpsDeliveryStats {
  totalDeliveries: number;
  successfulDeliveries: number;
  averageAccuracy: number;
  coverageCountries: number;
  coverageCities: number;
  uniqueDeliveryPersons: number;
  analytics: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function GeographicAnalytics() {
  const { language, direction } = useLanguage();
  const t = geographicAnalyticsLocalization[language];
  const locale = language === "fa" ? "fa-IR" : language === "ar" ? "ar-IQ" : language === "tr" ? "tr-TR" : "en-US";
  const number = (value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, options).format(value);
  const currency = (value: number, currencyCode = "USD") => new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode, minimumFractionDigits: 2 }).format(value);
  const date = (value: string | Date) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const percentage = (value: number) => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(value);
  const paymentLabel = (value?: string | null) => {
    if (!value) return "—";
    const labels: Record<string, string> = {
      bank_transfer: t.bankTransfer, online: t.onlinePayment, online_payment: t.onlinePayment, cash: t.cashPayment,
    };
    return labels[value] || value;
  };
  const [dateRange, setDateRange] = useState("1y");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showAllGpsDeliveries, setShowAllGpsDeliveries] = useState(false);
  const [gpsSortField, setGpsSortField] = useState<string>('');
  const [gpsSortDirection, setGpsSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isMapMaximized, setIsMapMaximized] = useState(false);
  const [selectedRegionDetails, setSelectedRegionDetails] = useState<GeographicData | null>(null);

  // Sorting function
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // GPS Sorting function
  const handleGpsSort = (field: string) => {
    if (gpsSortField === field) {
      setGpsSortDirection(gpsSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setGpsSortField(field);
      setGpsSortDirection('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  // Get GPS sort icon
  const getGpsSortIcon = (field: string) => {
    if (gpsSortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return gpsSortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  // Fetch geographic sales data
  const { data: geoResult, isLoading: geoLoading } = useQuery<{data: GeographicData[], summary?: {totalUniqueCustomers: number}}>({
    queryKey: ['/api/analytics/geographic', dateRange, selectedRegion],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/geographic?period=${dateRange}&region=${selectedRegion}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch geographic data');
      const result = await response.json();
      return result || { data: [], summary: { totalUniqueCustomers: 0 } };
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 60000
  });

  const geoData = geoResult?.data || [];
  const totalUniqueCustomers = geoResult?.summary?.totalUniqueCustomers || 0;

  const { data: regionOrders = [], isLoading: regionOrdersLoading } = useQuery<RegionOrder[]>({
    queryKey: [
      '/api/analytics/geographic/orders',
      dateRange,
      selectedRegionDetails?.country,
      selectedRegionDetails?.city
    ],
    queryFn: async () => {
      if (!selectedRegionDetails) return [];
      const params = new URLSearchParams({
        period: dateRange,
        country: selectedRegionDetails.country,
        city: selectedRegionDetails.city
      });
      const response = await fetch(`/api/analytics/geographic/orders?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch region orders');
      const result = await response.json();
      return result.data || [];
    },
    enabled: Boolean(selectedRegionDetails),
    staleTime: 0
  });

  // Fetch product analytics
  const { data: productData, isLoading: productLoading } = useQuery<ProductAnalytics[]>({
    queryKey: ['/api/analytics/products', dateRange, selectedProduct],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/products?period=${dateRange}&product=${selectedProduct}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch product data');
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true
  });

  // Fetch time series data
  const { data: timeData, isLoading: timeLoading } = useQuery<TimeSeriesData[]>({
    queryKey: ['/api/analytics/timeseries', dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/timeseries?period=${dateRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch time series data');
      const result = await response.json();
      return result.data || [];
    }
  });

  // Fetch GPS delivery confirmations data  
  const { data: gpsDeliveries, isLoading: gpsLoading } = useQuery<GpsDeliveryData[]>({
    queryKey: ['/api/gps-delivery/confirmations'],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days instead of 30
      const endDate = new Date();
      
      const response = await fetch(`/api/gps-delivery/confirmations?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=100`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch GPS delivery confirmations');
      const result = await response.json();
      return result.data || [];
    }
  });

  // Fetch GPS delivery performance stats
  const { data: gpsStats, isLoading: gpsStatsLoading } = useQuery<GpsDeliveryStats>({
    queryKey: ['/api/gps-delivery/performance'],
    queryFn: async () => {
      const response = await fetch('/api/gps-delivery/performance?period=30', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch GPS stats');
      const result = await response.json();
      return result.data || { totalDeliveries: 0, successfulDeliveries: 0, averageAccuracy: 0, coverageCountries: 0, coverageCities: 0, uniqueDeliveryPersons: 0, analytics: [] };
    }
  });

  // Fetch GPS analytics data
  const gpsAnalytics = useQuery({
    queryKey: ['/api/gps-delivery/analytics', 'Iraq'],
    queryFn: async () => {
      const response = await fetch('/api/gps-delivery/analytics?country=Iraq', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch GPS analytics');
      const result = await response.json();
      console.log('🔍 [GPS-ANALYTICS] Data received:', result);
      return result && result.data ? result.data : [];
    }
  });

  // Fetch GPS heatmap data  
  const gpsHeatmap = useQuery({
    queryKey: ['/api/gps-delivery/heatmap', 'Iraq'],
    queryFn: async () => {
      const response = await fetch('/api/gps-delivery/heatmap?country=Iraq', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch GPS heatmap');
      const result = await response.json();
      console.log('[GPS-HEATMAP] Data received:', result);
      return result && result.data ? result.data : [];
    }
  });

  // Fetch product trends data
  const { data: productTrendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['/api/analytics/product-trends', dateRange, selectedProduct],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/product-trends?period=${dateRange}&product=${selectedProduct}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch product trends');
      const result = await response.json();
      return result.data || [];
    }
  });

  // Calculate summary statistics
  const summaryStats = geoData ? {
    totalRevenue: geoData.reduce((sum, region) => sum + region.totalRevenue, 0),
    totalOrders: geoData.reduce((sum, region) => sum + region.totalOrders, 0),
    totalCustomers: totalUniqueCustomers, // Use actual unique customers count from backend
    regionsCount: geoData.length,
    avgOrderValue: geoData.reduce((sum, region) => sum + region.totalRevenue, 0) / geoData.reduce((sum, region) => sum + region.totalOrders, 0) || 0
  } : null;

  // Prepare chart data
  const regionChartData = geoData?.map(region => ({
    name: `${region.city}, ${region.country}`,
    revenue: region.totalRevenue,
    orders: region.totalOrders,
    customers: region.customerCount
  })) || [];

  const productChartData = productData?.map(product => ({
    name: product.name,
    sales: product.totalSales,
    revenue: product.revenue
  })) || [];

  const topRegions = geoData?.sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10) || [];
  const topProducts = productData?.sort((a, b) => b.revenue - a.revenue).slice(0, 10) || [];

  // Create flattened and sorted product-region data for table
  const getSortedProductRegionData = () => {
    if (!productData) return [];
    
    const flatData: any[] = [];
    productData.forEach(product => {
      if (product.regions && product.regions.length > 0) {
        product.regions.forEach(region => {
          flatData.push({
            productName: product.name,
            category: product.category,
            region: region.region,
            city: region.city,
            quantity: region.quantity,
            revenue: region.revenue
          });
        });
      } else {
        flatData.push({
          productName: product.name,
          category: product.category,
          region: null,
          city: null,
          quantity: 0,
          revenue: 0
        });
      }
    });

    // Apply sorting
    if (sortField) {
      flatData.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        // Handle null/undefined values
        if (aVal === null || aVal === undefined) aVal = '';
        if (bVal === null || bVal === undefined) bVal = '';
        
        // Convert to string for text comparisons
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }
    
    return flatData;
  };

  const sortedProductRegionData = getSortedProductRegionData();

  // Sort GPS delivery data
  const getSortedGpsData = () => {
    if (!gpsDeliveries) return [];
    
    let sortedData = [...gpsDeliveries];
    
    if (gpsSortField) {
      sortedData.sort((a, b) => {
        let aVal = a[gpsSortField as keyof GpsDeliveryData];
        let bVal = b[gpsSortField as keyof GpsDeliveryData];
        
        // Handle special fields
        if (gpsSortField === 'customerOrderId' || gpsSortField === 'accuracy') {
          aVal = parseFloat(String(aVal));
          bVal = parseFloat(String(bVal));
        }
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return gpsSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return gpsSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
          return gpsSortDirection === 'asc' ? (aVal ? 1 : 0) - (bVal ? 1 : 0) : (bVal ? 1 : 0) - (aVal ? 1 : 0);
        }
        
        return 0;
      });
    }
    
    return sortedData;
  };

  const sortedGpsData = getSortedGpsData();

  const handleExport = () => {
    const escapeCsv = (value: unknown) => {
      const text = value === null || value === undefined ? '' : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows: unknown[][] = [
      [t.title],
      [t.period, dateRange],
      [t.generatedAt, date(new Date())],
      [],
      [t.summary],
      [t.totalRevenue, summaryStats?.totalRevenue || 0],
      [t.totalOrders, summaryStats?.totalOrders || 0],
      [t.customers, summaryStats?.totalCustomers || 0],
      [t.regions, summaryStats?.regionsCount || 0],
      [t.avgOrderValue, summaryStats?.avgOrderValue || 0],
      [],
      [t.regionalAnalysis],
      [t.country, t.city, t.orders, t.customers, t.revenue, t.avgOrderValue],
      ...geoData.map((region) => [
        region.country,
        region.city,
        region.totalOrders,
        region.customerCount,
        region.totalRevenue,
        region.avgOrderValue
      ]),
      [],
      [t.salesByRegion],
      [t.productName, t.category, t.country, t.city, t.unitsSold, t.revenue],
      ...sortedProductRegionData.map((row) => [
        row.productName,
        row.category,
        row.region || '',
        row.city || '',
        row.quantity || 0,
        row.revenue || 0
      ])
    ];

    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `geographic-analytics-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (geoLoading || productLoading || timeLoading || trendsLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir={direction} lang={language} className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-gray-600">{t.subtitle}</p>
        </div>
        <div className="flex gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t.last7Days}</SelectItem>
              <SelectItem value="30d">{t.last30Days}</SelectItem>
              <SelectItem value="90d">{t.last3Months}</SelectItem>
               <SelectItem value="1y">{t.lastYear}</SelectItem>
               <SelectItem value="all">{t.all}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!geoData.length && !sortedProductRegionData.length}
          >
              <Download className="w-4 h-4 me-2" />
            {t.export}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.totalRevenue}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currency(summaryStats.totalRevenue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.totalOrders}</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.customers}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalCustomers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.regions}</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.regionsCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.avgOrderValue}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currency(summaryStats.avgOrderValue)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="regions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="regions">{t.regionalAnalysis}</TabsTrigger>
          <TabsTrigger value="products">{t.productPerformance}</TabsTrigger>
          <TabsTrigger value="product-regions">{t.productsByRegion}</TabsTrigger>
          <TabsTrigger value="trends">{t.trends}</TabsTrigger>
          <TabsTrigger value="gps-tracking">{t.gpsTracking}</TabsTrigger>
        </TabsList>

        {/* Regional Analysis */}
        <TabsContent value="regions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Region Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{t.revenueByRegion}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={regionChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [currency(Number(value)), t.revenue]} />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Orders by Region Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{t.ordersByRegion}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={regionChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Regions Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t.topRegions}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topRegions.map((region, index) => (
                  <button
                    type="button"
                    key={`${region.country}-${region.city}`}
                    onClick={() => setSelectedRegionDetails(region)}
                    className="flex w-full items-center justify-between p-4 border rounded-lg text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">#{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{region.city}, {region.country}</p>
                        <p className="text-sm text-gray-600">{number(region.customerCount)} {t.customers}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{currency(region.totalRevenue)}</p>
                      <p className="text-sm text-gray-600">{number(region.totalOrders)} {t.orders}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Dialog
            open={Boolean(selectedRegionDetails)}
            onOpenChange={(open) => {
              if (!open) setSelectedRegionDetails(null);
            }}
          >
            <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {t.ordersIn} {selectedRegionDetails?.city}, {selectedRegionDetails?.country}
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-auto">
                {regionOrdersLoading ? (
                  <div className="py-12 text-center text-muted-foreground">{t.loadingOrders}</div>
                ) : regionOrders.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">{t.noOrders}</div>
                ) : (
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b">
                        <th className="p-3 text-start">{t.order}</th>
                        <th className="p-3 text-start">{t.customer}</th>
                        <th className="p-3 text-start">{t.contact}</th>
                        <th className="p-3 text-start">{t.status}</th>
                        <th className="p-3 text-start">{t.payment}</th>
                        <th className="p-3 text-end">{t.amount}</th>
                        <th className="p-3 text-start">{t.date}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regionOrders.map((order) => (
                        <tr key={order.id} className="border-b hover:bg-muted/40">
                          <td className="p-3 font-medium">{order.orderNumber}</td>
                          <td className="p-3">
                            <div>{order.customerName}</div>
                            <div className="text-xs text-muted-foreground">{t.id}: {number(order.customerId)}</div>
                          </td>
                          <td className="p-3">
                            <div>{order.phone || '—'}</div>
                            <div className="text-xs text-muted-foreground">{order.email || '—'}</div>
                          </td>
                          <td className="p-3"><Badge variant="outline">{order.status ? getOrderStatusLabel(resolveOrderStatus({ orderStatus: order.status }), language) : '—'}</Badge></td>
                          <td className="p-3">{paymentLabel(order.paymentMethod)}</td>
                          <td className="p-3 text-end font-medium">{currency(order.totalAmount)}</td>
                          <td className="p-3">
                            {order.createdAt ? date(order.createdAt) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Product Performance */}
        <TabsContent value="products" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Sales Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{t.productSales}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sales" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Product Revenue Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{t.revenueDistribution}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={productChartData.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {productChartData.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [currency(Number(value)), t.revenue]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Product Sales Trends Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>{t.salesTrends}</CardTitle>
              <p className="text-sm text-gray-600">{t.selectedPeriodHint}</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={timeData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'orders' ? `${number(Number(value))} ${t.orders}` : currency(Number(value)),
                      name === 'orders' ? t.orders : t.revenue
                    ]}
                  />
                  <Line type="monotone" dataKey="orders" stroke="#8884d8" strokeWidth={2} name="orders" />
                  <Line type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={2} name="revenue" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Product Sales by Region - Complete Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>{t.salesByRegion} — {t.completeBreakdown}</CardTitle>
              <p className="text-sm text-gray-600">{t.detailedAnalysis}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {productData && productData.length > 0 ? (
                  productData.slice(0, 10).map((product: any, index: number) => (
                    <div key={product.name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{product.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <Badge variant="outline">{product.category || t.chemicalProduct}</Badge>
                            <span>{t.unitsSold}: {number(product.totalSales || 0)}</span>
                            <span>{t.totalRevenue}: {number(product.revenue || 0, { minimumFractionDigits: 2 })} IQD</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Regional Breakdown */}
                      {product.regions && product.regions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          {product.regions.map((region: any, regionIndex: number) => (
                            <div key={regionIndex} className="bg-gray-50 p-3 rounded-lg">
                              <h4 className="font-medium text-sm">{region.region} - {region.city}</h4>
                              <div className="flex justify-between text-sm text-gray-600 mt-1">
                                <span>{t.quantity}: {number(region.quantity)} {t.unitsSold}</span>
                                <span>{t.revenue}: {number(region.revenue, { minimumFractionDigits: 2 })} IQD</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-600 mb-4">
                          {t.noRegionalData}
                        </div>
                      )}
                      
                      {/* Product Performance Chart */}
                      {productTrendsData && productTrendsData.filter((trend: any) => trend.productName === product.name).length > 0 && (
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={productTrendsData.filter((trend: any) => trend.productName === product.name)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip 
                              formatter={(value: any, name: string) => [
                                name === 'quantity' ? `${number(Number(value))} ${t.unitsSold}` : `${number(Number(value), { minimumFractionDigits: 2 })} IQD`,
                                name === 'quantity' ? t.dailySales : t.dailyRevenue
                              ]}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="quantity" 
                              stroke={COLORS[index % COLORS.length]} 
                              strokeWidth={2} 
                              name="quantity"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="revenue" 
                              stroke={COLORS[(index + 1) % COLORS.length]} 
                              strokeWidth={2} 
                              strokeDasharray="5 5"
                              name="revenue"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {t.noProductTrends}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Product Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{t.summary}</CardTitle>
              <p className="text-sm text-gray-600">{t.overallProductComparison}</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={productChartData.slice(0, 10)}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 80,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'sales' ? `${value} units` : `$${value.toFixed(2)}`,
                      name === 'sales' ? 'Units Sold' : 'Revenue'
                    ]}
                  />
                  <Bar dataKey="sales" fill="#0088FE" name="sales" />
                  <Bar dataKey="revenue" fill="#00C49F" name="revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Products with Regional Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>{t.productsByRegion} — {t.completeBreakdown}</CardTitle>
              <p className="text-sm text-gray-600">{t.productsSoldByRegion}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {topProducts.map((product, index) => (
                  <div key={product.name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary">#{index + 1}</Badge>
                        <div>
                          <p className="font-medium text-lg">{product.name}</p>
                          <p className="text-sm text-gray-600">{product.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">${product.revenue.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">{product.totalSales} units total</p>
                      </div>
                    </div>
                    
                    {/* Regional breakdown for this product */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4 className="font-medium mb-3 text-sm">{t.salesByRegion}:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {product.regions && product.regions.length > 0 ? (
                          product.regions.map((region: any) => (
                            <div key={region.region} className="bg-white rounded p-3 border">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{region.region}</span>
                                <MapPin className="h-4 w-4 text-gray-400" />
                              </div>
                              <div className="mt-2">
                                <p className="text-sm text-green-600 font-medium">${(region.revenue || 0).toFixed(2)}</p>
                                <p className="text-xs text-gray-500">{region.quantity || 0} units</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full text-center text-gray-500 text-sm">
                            No regional data available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products by Region - Detailed Table */}
        <TabsContent value="product-regions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.salesByRegion} — {t.completeBreakdown}</CardTitle>
              <p className="text-sm text-gray-600">{t.detailedRevenueView}</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">
                        <button 
                          className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                          onClick={() => handleSort('productName')}
                        >
                          Product Name
                          {getSortIcon('productName')}
                        </button>
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left">
                        <button 
                          className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                          onClick={() => handleSort('category')}
                        >
                          Category
                          {getSortIcon('category')}
                        </button>
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left">
                        <button 
                          className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                          onClick={() => handleSort('region')}
                        >
                          Country
                          {getSortIcon('region')}
                        </button>
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left">
                        <button 
                          className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                          onClick={() => handleSort('city')}
                        >
                          City
                          {getSortIcon('city')}
                        </button>
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-right">
                        <button 
                          className="flex items-center gap-2 hover:text-blue-600 transition-colors ml-auto"
                          onClick={() => handleSort('quantity')}
                        >
                          Units Sold
                          {getSortIcon('quantity')}
                        </button>
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-right">
                        <button 
                          className="flex items-center gap-2 hover:text-blue-600 transition-colors ml-auto"
                          onClick={() => handleSort('revenue')}
                        >
                          Revenue
                          {getSortIcon('revenue')}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProductRegionData.map((row, index) => (
                      <tr key={`${row.productName}-${row.region}-${index}`} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">
                          {row.productName}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-gray-600">
                          {row.category}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {row.region ? (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              {row.region}
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">{t.noRegionalData}</span>
                          )}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {row.city || (row.region ? 'Various Cities' : '-')}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {row.quantity || 0}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right font-medium text-green-600">
                          ${(row.revenue || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.salesTrends}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#8884d8" name={t.orders} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#82ca9d" name={t.revenue} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GPS Delivery Tracking */}
        <TabsContent value="gps-tracking" className="space-y-6">
          {gpsLoading || gpsStatsLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-600">{t.loading}</p>
            </div>
          ) : (
            <>
              {/* GPS Summary Cards */}
              {gpsStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t.totalOrders}</CardTitle>
                      <Navigation className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{gpsStats.totalDeliveries}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t.successful}</CardTitle>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{gpsStats.successfulDeliveries}</div>
                      <p className="text-xs text-gray-600">
                        {gpsStats.totalDeliveries > 0
                          ? `${percentage(gpsStats.successfulDeliveries / gpsStats.totalDeliveries)} ${t.match}`
                          : t.noData}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t.accuracy}</CardTitle>
                      <Target className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">{number(gpsStats.averageAccuracy || 0, { maximumFractionDigits: 1 })}m</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t.countries}</CardTitle>
                      <MapPin className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">{gpsStats.coverageCountries}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t.cities}</CardTitle>
                      <MapPin className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-indigo-600">{gpsStats.coverageCities}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t.deliveryStaff}</CardTitle>
                      <Users className="h-4 w-4 text-teal-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-teal-600">{gpsStats.uniqueDeliveryPersons}</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* GPS Deliveries Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-blue-600" />
                    {t.recentGps}
                  </CardTitle>
                  <p className="text-sm text-gray-600">{t.latestGps}</p>
                </CardHeader>
                <CardContent>
                  {gpsDeliveries && gpsDeliveries.length > 0 ? (
                    <div className="space-y-4">
                      {/* Stats Summary */}
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">
                          {t.showMore}: {number(Math.min(20, gpsDeliveries.length))} / {number(gpsDeliveries.length)}
                        </div>
                        {gpsDeliveries.length > 20 && (
                          <button
                            onClick={() => {
                              const expandedTable = document.getElementById('expanded-gps-table');
                              const toggleButton = document.getElementById('toggle-gps-button');
                              if (expandedTable && toggleButton) {
                                const isHidden = expandedTable.style.display === 'none' || !expandedTable.style.display;
                                expandedTable.style.display = isHidden ? 'block' : 'none';
                                toggleButton.textContent = isHidden ? t.hideMore : `${t.showMore} ${number(gpsDeliveries.length - 20)}`;
                              }
                            }}
                            id="toggle-gps-button"
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                          >
                            {t.showMore} {number(gpsDeliveries.length - 20)}
                          </button>
                        )}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-100">
                              <th 
                                className="border border-gray-300 px-3 py-2 text-left text-sm font-medium cursor-pointer hover:bg-gray-200 transition-colors"
                                onClick={() => handleGpsSort('customerOrderId')}
                              >
                                <div className="flex items-center gap-2">
                                  {t.orderId}
                                  {getGpsSortIcon('customerOrderId')}
                                </div>
                              </th>
                              <th 
                                className="border border-gray-300 px-3 py-2 text-left text-sm font-medium cursor-pointer hover:bg-gray-200 transition-colors"
                                onClick={() => handleGpsSort('deliveryPersonName')}
                              >
                                <div className="flex items-center gap-2">
                                  {t.deliveryPerson}
                                  {getGpsSortIcon('deliveryPersonName')}
                                </div>
                              </th>
                              <th 
                                className="border border-gray-300 px-3 py-2 text-left text-sm font-medium cursor-pointer hover:bg-gray-200 transition-colors"
                                onClick={() => handleGpsSort('city')}
                              >
                                <div className="flex items-center gap-2">
                                  {t.location}
                                  {getGpsSortIcon('city')}
                                </div>
                              </th>
                              <th className="border border-gray-300 px-3 py-2 text-start text-sm font-medium">{t.gpsCoordinates}</th>
                              <th 
                                className="border border-gray-300 px-3 py-2 text-left text-sm font-medium cursor-pointer hover:bg-gray-200 transition-colors"
                                onClick={() => handleGpsSort('accuracy')}
                              >
                                <div className="flex items-center gap-2">
                                  {t.accuracy}
                                  {getGpsSortIcon('accuracy')}
                                </div>
                              </th>
                              <th 
                                className="border border-gray-300 px-3 py-2 text-left text-sm font-medium cursor-pointer hover:bg-gray-200 transition-colors"
                                onClick={() => handleGpsSort('addressMatched')}
                              >
                                <div className="flex items-center gap-2">
                                  {t.addressMatch}
                                  {getGpsSortIcon('addressMatched')}
                                </div>
                              </th>
                              <th 
                                className="border border-gray-300 px-3 py-2 text-left text-sm font-medium cursor-pointer hover:bg-gray-200 transition-colors"
                                onClick={() => handleGpsSort('verificationTime')}
                              >
                                <div className="flex items-center gap-2">
                                  {t.verificationTime}
                                  {getGpsSortIcon('verificationTime')}
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Display GPS data with sorting and collapsible view */}
                            {sortedGpsData.slice(0, showAllGpsDeliveries ? sortedGpsData.length : 20).map((delivery, index) => (
                              <tr key={delivery.id || index} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-3 py-2 font-medium">
                                  #{delivery.customerOrderId}
                                </td>
                                <td className="border border-gray-300 px-3 py-2">
                                  <div>
                                    <p className="font-medium">{delivery.deliveryPersonName}</p>
                                    <p className="text-xs text-gray-600">{delivery.deliveryPersonPhone}</p>
                                  </div>
                                </td>
                                <td className="border border-gray-300 px-3 py-2">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-gray-400" />
                                    <span>{delivery.city}, {delivery.country}</span>
                                  </div>
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-xs">
                                  <div 
                                    className="cursor-pointer hover:bg-blue-50 p-1 rounded border-dashed border hover:border-blue-300 transition-colors"
                                    onClick={() => {
                                      const googleMapsUrl = `https://www.google.com/maps?q=${parseFloat(delivery.latitude)},${parseFloat(delivery.longitude)}&z=15`;
                                      window.open(googleMapsUrl, '_blank');
                                    }}
                                    title={t.mapAll}
                                  >
                                    <p className="text-blue-600 hover:text-blue-800">Lat: {parseFloat(delivery.latitude).toFixed(6)}</p>
                                    <p className="text-blue-600 hover:text-blue-800">Lng: {parseFloat(delivery.longitude).toFixed(6)}</p>
                                    <div className="text-xs text-gray-500 mt-1">{t.mapAll}</div>
                                  </div>
                                </td>
                                <td className="border border-gray-300 px-3 py-2">
                                  <Badge variant={parseFloat(delivery.accuracy) <= 10 ? "default" : "secondary"}>
                                    ±{delivery.accuracy}m
                                  </Badge>
                                </td>
                                <td className="border border-gray-300 px-3 py-2">
                                  {delivery.addressMatched ? (
                                    <Badge variant="default" className="bg-green-100 text-green-800">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Match
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      No Match
                                    </Badge>
                                  )}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-xs">
                                  {date(delivery.verificationTime)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Show more/less button for GPS table */}
                      {sortedGpsData.length > 20 && (
                        <div className="mt-4 text-center">
                          <Button
                            variant="outline"
                            onClick={() => setShowAllGpsDeliveries(!showAllGpsDeliveries)}
                            className="text-sm"
                          >
                            {showAllGpsDeliveries 
                              ? `${t.showLess} (${t.rowsFirst})`
                              : `${t.showMore} ${number(sortedGpsData.length - 20)}`
                            }
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Navigation className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">{t.noGpsData}</p>
                      <p className="text-sm">{t.gpsWillAppear}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* GPS Analytics Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* GPS Delivery Performance Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t.gpsPerformance}</CardTitle>
                    <p className="text-sm text-gray-600">{t.successByRegion}</p>
                  </CardHeader>
                  <CardContent>
                    {gpsAnalytics.data && gpsAnalytics.data.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={gpsAnalytics.data.slice(0, 8).map((item: any) => ({
                          city: item.city,
                          totalDeliveries: item.totalDeliveries,
                          successfulDeliveries: item.successfulDeliveries,
                          deliverySuccessRate: item.totalDeliveries > 0 ? 
                            ((item.successfulDeliveries / item.totalDeliveries) * 100).toFixed(1) : 0,
                          averageAccuracy: parseFloat(item.averageAccuracy || '0')
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="city" 
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis />
                          <Tooltip 
                            formatter={(value: any, name: string) => [
                              name === 'deliverySuccessRate' ? `${value}%` : value,
                              name === 'deliverySuccessRate' ? t.successRate :
                              name === 'totalDeliveries' ? t.totalDeliveries :
                              name === 'averageAccuracy' ? `${t.averageAccuracy} (m)` : name
                            ]}
                          />
                          <Bar dataKey="totalDeliveries" fill="#3b82f6" name={t.totalDeliveries} />
                          <Bar dataKey="deliverySuccessRate" fill="#10b981" name={`${t.successRate} (%)`} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium">{t.noGpsAnalytics}</p>
                          <p className="text-sm">{t.generateAnalytics}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* GPS Accuracy Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t.accuracyDistribution}</CardTitle>
                    <p className="text-sm text-gray-600">{t.accuracyByCity}</p>
                  </CardHeader>
                  <CardContent>
                    {gpsAnalytics.data && gpsAnalytics.data.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={gpsAnalytics.data.slice(0, 10).map((item: any) => ({
                          city: item.city,
                          averageAccuracy: parseFloat(item.averageAccuracy || '0')
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="city" 
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis label={{ value: t.accuracyMeters, angle: -90, position: 'insideLeft' }} />
                          <Tooltip 
                            formatter={(value: any) => [`${number(Number(value), { maximumFractionDigits: 1 })}m`, t.averageAccuracy]}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="averageAccuracy" 
                            stroke="#f59e0b" 
                            strokeWidth={3}
                            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Navigation className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium">{t.noAccuracy}</p>
                          <p className="text-sm">{t.accuracyWillAppear}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* GPS Heatmap Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle>{t.heatmap}</CardTitle>
                  <p className="text-sm text-gray-600">{t.heatmapSubtitle}</p>
                </CardHeader>
                <CardContent>
                  {gpsHeatmap.data && Array.isArray(gpsHeatmap.data) && gpsHeatmap.data.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{gpsHeatmap.data.length}</div>
                          <div className="text-sm text-blue-700">{t.gpsPoints}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {gpsHeatmap.data.filter((point: any) => point.weight >= 1).length}
                          </div>
                          <div className="text-sm text-green-700">{t.highAccuracy}</div>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">
                            {gpsHeatmap.data.filter((point: any) => point.weight < 1).length}
                          </div>
                          <div className="text-sm text-yellow-700">{t.needsReview}</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {new Set(gpsHeatmap.data.map((point: any) => `${point.lat.toFixed(1)},${point.lng.toFixed(1)}`)).size}
                          </div>
                            <div className="text-sm text-purple-700">{t.uniqueAreas}</div>
                        </div>
                      </div>
                      
                      {/* Delivery Distribution Map */}
                      <div className="bg-white border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-800 flex items-center">
                            <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                            {t.distributionMap}
                          </h4>
                          <Dialog open={isMapMaximized} onOpenChange={setIsMapMaximized}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="flex items-center gap-2">
                                <Maximize2 className="h-4 w-4" />
                                {t.zoomIn}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-7xl max-h-[95vh] w-full h-full">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <MapPin className="h-5 w-5 text-blue-600" />
                                  {t.fullscreenMap}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="flex-1 overflow-hidden">
                                {/* Maximized Map Content */}
                                <div className="h-full">
                                  {/* Summary Statistics */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                                      <div className="text-xl font-bold text-blue-600">{gpsHeatmap.data.length}</div>
                              <div className="text-xs text-blue-700">{t.gpsPoints}</div>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded-lg text-center">
                                      <div className="text-xl font-bold text-green-600">
                                        {gpsHeatmap.data.filter((p: any) => p.weight >= 1).length}
                                      </div>
                              <div className="text-xs text-green-700">{t.successful}</div>
                                    </div>
                                    <div className="bg-yellow-50 p-3 rounded-lg text-center">
                                      <div className="text-xl font-bold text-yellow-600">
                                        {gpsHeatmap.data.filter((p: any) => p.weight < 1).length}
                                      </div>
                              <div className="text-xs text-yellow-700">{t.needsReview}</div>
                                    </div>
                                    <div className="bg-purple-50 p-3 rounded-lg text-center">
                                      <div className="text-xl font-bold text-purple-600">
                                        {new Set(gpsHeatmap.data.map((point: any) => `${Math.floor(point.lat)},${Math.floor(point.lng)}`)).size}
                                      </div>
                              <div className="text-xs text-purple-700">{t.uniqueAreas}</div>
                                    </div>
                                  </div>
                                  
                                  {/* Maximized Interactive Geographic Heat Map */}
                                  <div className="bg-white rounded-lg border overflow-hidden h-[calc(100vh-300px)]">
                                    <div className="relative w-full h-full">
                                      {/* Zoom Controls */}
                                      <div className="absolute top-3 left-3 z-10 flex flex-col space-y-2">
                                        <button
                                          onClick={() => {
                                            const svg = document.getElementById('heat-map-svg-maximized');
                                            if (svg) {
                                              const currentViewBox = svg.getAttribute('viewBox')?.split(' ') || ['0', '0', '1000', '700'];
                                              const newWidth = Math.max(50, parseFloat(currentViewBox[2]) * 0.75);
                                              const newHeight = Math.max(35, parseFloat(currentViewBox[3]) * 0.75);
                                              const newX = parseFloat(currentViewBox[0]) + (parseFloat(currentViewBox[2]) - newWidth) / 2;
                                              const newY = parseFloat(currentViewBox[1]) + (parseFloat(currentViewBox[3]) - newHeight) / 2;
                                              svg.setAttribute('viewBox', `${newX} ${newY} ${newWidth} ${newHeight}`);
                                            }
                                          }}
                                          className="w-8 h-8 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center text-gray-700 shadow-sm"
                                          title={t.zoomIn}
                                        >
                                          <span className="text-lg font-bold">+</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            const svg = document.getElementById('heat-map-svg-maximized');
                                            if (svg) {
                                              const currentViewBox = svg.getAttribute('viewBox')?.split(' ') || ['0', '0', '1000', '700'];
                                              const newWidth = Math.min(10000, parseFloat(currentViewBox[2]) * 1.33);
                                              const newHeight = Math.min(7000, parseFloat(currentViewBox[3]) * 1.33);
                                              const newX = parseFloat(currentViewBox[0]) - (newWidth - parseFloat(currentViewBox[2])) / 2;
                                              const newY = parseFloat(currentViewBox[1]) - (newHeight - parseFloat(currentViewBox[3])) / 2;
                                              svg.setAttribute('viewBox', `${Math.max(-500, newX)} ${Math.max(-350, newY)} ${newWidth} ${newHeight}`);
                                            }
                                          }}
                                          className="w-8 h-8 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center text-gray-700 shadow-sm"
                                          title={t.zoomOut}
                                        >
                                          <span className="text-lg font-bold">-</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            const svg = document.getElementById('heat-map-svg-maximized');
                                            if (svg) {
                                              svg.setAttribute('viewBox', '0 0 1000 700');
                                            }
                                          }}
                                          className="w-8 h-8 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center text-gray-700 shadow-sm"
                                          title={t.resetMap}
                                        >
                                          <span className="text-xs">{t.resetMap}</span>
                                        </button>
                                      </div>
                                      
                                      {/* Google Maps background with GPS points overlay */}
                                      <div className="relative w-full h-full rounded-lg overflow-hidden">
                                        <iframe
                                          src="https://www.google.com/maps/embed/v1/view?key=AIzaSyDummyKeyPlaceholder&center=33.3128,44.3661&zoom=6&maptype=roadmap"
                                          width="100%"
                                          height="100%"
                                          style={{ border: 0 }}
                                          allowFullScreen
                                          loading="lazy"
                                          referrerPolicy="no-referrer-when-downgrade"
                                          className="w-full h-full"
                                        ></iframe>
                                      </div>
                                      
                                      <svg 
                                        id="heat-map-svg-maximized"
                                        viewBox="0 0 1000 700" 
                                        className="w-full h-full bg-transparent absolute inset-0 cursor-grab active:cursor-grabbing pointer-events-none"
                                        onMouseDown={(e) => {
                                          const svg = e.currentTarget;
                                          const startPoint = { x: e.clientX, y: e.clientY };
                                          const viewBox = svg.getAttribute('viewBox')?.split(' ') || ['0', '0', '1000', '700'];
                                          const startViewBox = {
                                            x: parseFloat(viewBox[0]),
                                            y: parseFloat(viewBox[1]),
                                            width: parseFloat(viewBox[2]),
                                            height: parseFloat(viewBox[3])
                                          };
                                          
                                          const handleMouseMove = (e: MouseEvent) => {
                                            const dx = (startPoint.x - e.clientX) * (startViewBox.width / svg.clientWidth);
                                            const dy = (startPoint.y - e.clientY) * (startViewBox.height / svg.clientHeight);
                                            svg.setAttribute('viewBox', `${startViewBox.x + dx} ${startViewBox.y + dy} ${startViewBox.width} ${startViewBox.height}`);
                                          };
                                          
                                          const handleMouseUp = () => {
                                            document.removeEventListener('mousemove', handleMouseMove);
                                            document.removeEventListener('mouseup', handleMouseUp);
                                          };
                                          
                                          document.addEventListener('mousemove', handleMouseMove);
                                          document.addEventListener('mouseup', handleMouseUp);
                                        }}
                                        onWheel={(e) => {
                                          e.preventDefault();
                                          const svg = e.currentTarget;
                                          const viewBox = svg.getAttribute('viewBox')?.split(' ') || ['0', '0', '1000', '700'];
                                          const currentWidth = parseFloat(viewBox[2]);
                                          const currentHeight = parseFloat(viewBox[3]);
                                          const currentX = parseFloat(viewBox[0]);
                                          const currentY = parseFloat(viewBox[1]);
                                          
                                          const zoomFactor = e.deltaY > 0 ? 1.15 : 0.85;
                                          const newWidth = Math.max(50, Math.min(10000, currentWidth * zoomFactor));
                                          const newHeight = Math.max(35, Math.min(7000, currentHeight * zoomFactor));
                                          
                                          // Center zoom around mouse position
                                          const rect = svg.getBoundingClientRect();
                                          const mouseX = ((e.clientX - rect.left) / rect.width) * currentWidth + currentX;
                                          const mouseY = ((e.clientY - rect.top) / rect.height) * currentHeight + currentY;
                                          
                                          const newX = mouseX - (mouseX - currentX) * (newWidth / currentWidth);
                                          const newY = mouseY - (mouseY - currentY) * (newHeight / currentHeight);
                                          
                                          svg.setAttribute('viewBox', `${newX} ${newY} ${newWidth} ${newHeight}`);
                                        }}
                                      >
                                        {/* Background Map */}
                                        <defs>
                                          <pattern id="gridPatternMaximized" width="50" height="50" patternUnits="userSpaceOnUse">
                                            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="0.5" opacity="0.5"/>
                                          </pattern>
                                          
                                          {/* Gradient for heat intensity */}
                                          <radialGradient id="heatGradientHighMaximized" cx="50%" cy="50%" r="50%">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8"/>
                                            <stop offset="50%" stopColor="#10b981" stopOpacity="0.4"/>
                                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.1"/>
                                          </radialGradient>
                                          
                                          <radialGradient id="heatGradientMediumMaximized" cx="50%" cy="50%" r="50%">
                                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7"/>
                                            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.3"/>
                                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1"/>
                                          </radialGradient>
                                        </defs>
                                        
                                        {/* Plot GPS Heat Points */}
                                        {(() => {
                                          // Group points by proximity to create heat intensity
                                          const clusters = new Map();
                                          
                                          gpsHeatmap.data.forEach((point: any, index: number) => {
                                            // Map GPS coordinates to SVG coordinates
                                            const minLat = 25, maxLat = 42;
                                            const minLng = 26, maxLng = 64;
                                            
                                            const x = ((point.lng - minLng) / (maxLng - minLng)) * 700 + 150;
                                            const y = ((maxLat - point.lat) / (maxLat - minLat)) * 500 + 100;
                                            
                                            const mapX = Math.max(150, Math.min(850, x));
                                            const mapY = Math.max(100, Math.min(600, y));
                                            
                                            // Group nearby points (within 30px radius)
                                            const clusterKey = `${Math.floor(mapX / 30)}-${Math.floor(mapY / 30)}`;
                                            if (!clusters.has(clusterKey)) {
                                              clusters.set(clusterKey, { x: mapX, y: mapY, points: [], avgWeight: 0 });
                                            }
                                            clusters.get(clusterKey).points.push(point);
                                          });
                                          
                                          // Calculate average weight for each cluster
                                          clusters.forEach((cluster) => {
                                            cluster.avgWeight = cluster.points.reduce((sum: number, p: any) => sum + p.weight, 0) / cluster.points.length;
                                            cluster.intensity = cluster.points.length;
                                          });
                                          
                                          return Array.from(clusters.values()).map((cluster, index) => (
                                            <g key={`cluster-maximized-${index}`}>
                                              {/* Heat bubble based on cluster intensity */}
                                              <circle 
                                                cx={cluster.x} 
                                                cy={cluster.y} 
                                                r={Math.min(50, 10 + cluster.intensity * 3)}
                                                fill={cluster.avgWeight >= 1 ? "url(#heatGradientHighMaximized)" : "url(#heatGradientMediumMaximized)"}
                                                opacity="0.6"
                                              />
                                              
                                              {/* Center point marker */}
                                              <circle 
                                                cx={cluster.x} 
                                                cy={cluster.y} 
                                                r={Math.min(8, 3 + cluster.intensity)}
                                                fill={cluster.avgWeight >= 1 ? "#10b981" : "#f59e0b"}
                                                stroke="white"
                                                strokeWidth="2"
                                                className="hover:opacity-100 cursor-pointer pointer-events-auto"
                                                onClick={() => {
                                                  const avgLat = cluster.points.reduce((sum: number, p: any) => sum + p.lat, 0) / cluster.points.length;
                                                  const avgLng = cluster.points.reduce((sum: number, p: any) => sum + p.lng, 0) / cluster.points.length;
                                                  const googleMapsUrl = `https://www.google.com/maps?q=${avgLat},${avgLng}&z=15`;
                                                  window.open(googleMapsUrl, '_blank');
                                                }}
                                              >
                                                <title>
                                                  {t.deliveryArea}
                                                  {t.pointCount}: {number(cluster.intensity)}
                                                  {t.averageAccuracyShort}: {number(cluster.avgWeight, { maximumFractionDigits: 1 })}
                                                  {t.clickMap}
                                                </title>
                                              </circle>
                                              
                                              {/* Pulse animation for high-intensity clusters */}
                                              {cluster.intensity > 3 && (
                                                <circle 
                                                  cx={cluster.x} 
                                                  cy={cluster.y} 
                                                  r={10 + cluster.intensity * 2}
                                                  fill="none"
                                                  stroke={cluster.avgWeight >= 1 ? "#10b981" : "#f59e0b"}
                                                  strokeWidth="1"
                                                  opacity="0.7"
                                                  className="animate-ping"
                                                />
                                              )}
                                            </g>
                                          ));
                                        })()}
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        
                        {/* Summary Statistics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div className="bg-blue-50 p-3 rounded-lg text-center">
                            <div className="text-xl font-bold text-blue-600">{gpsHeatmap.data.length}</div>
                              <div className="text-xs text-blue-700">{t.gpsPoints}</div>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg text-center">
                            <div className="text-xl font-bold text-green-600">
                              {gpsHeatmap.data.filter((p: any) => p.weight >= 1).length}
                            </div>
                              <div className="text-xs text-green-700">{t.successful}</div>
                          </div>
                          <div className="bg-yellow-50 p-3 rounded-lg text-center">
                            <div className="text-xl font-bold text-yellow-600">
                              {gpsHeatmap.data.filter((p: any) => p.weight < 1).length}
                            </div>
                              <div className="text-xs text-yellow-700">{t.needsReview}</div>
                          </div>
                          <div className="bg-purple-50 p-3 rounded-lg text-center">
                            <div className="text-xl font-bold text-purple-600">
                              {new Set(gpsHeatmap.data.map((point: any) => `${Math.floor(point.lat)},${Math.floor(point.lng)}`)).size}
                            </div>
                              <div className="text-xs text-purple-700">{t.uniqueAreas}</div>
                          </div>
                        </div>
                        
                        {/* Interactive Geographic Heat Map */}
                        <div className="bg-white rounded-lg border overflow-hidden">
                          <div className="relative w-full">
                            {/* Zoom Controls */}
                            <div className="absolute top-3 left-3 z-10 flex flex-col space-y-2">
                              <button
                                onClick={() => {
                                  const svg = document.getElementById('heat-map-svg');
                                  if (svg) {
                                    const currentViewBox = svg.getAttribute('viewBox')?.split(' ') || ['0', '0', '1000', '700'];
                                    const newWidth = Math.max(50, parseFloat(currentViewBox[2]) * 0.75);
                                    const newHeight = Math.max(35, parseFloat(currentViewBox[3]) * 0.75);
                                    const newX = parseFloat(currentViewBox[0]) + (parseFloat(currentViewBox[2]) - newWidth) / 2;
                                    const newY = parseFloat(currentViewBox[1]) + (parseFloat(currentViewBox[3]) - newHeight) / 2;
                                    svg.setAttribute('viewBox', `${newX} ${newY} ${newWidth} ${newHeight}`);
                                  }
                                }}
                                className="w-8 h-8 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center text-gray-700 shadow-sm"
                                title={t.zoomIn}
                              >
                                <span className="text-lg font-bold">+</span>
                              </button>
                              <button
                                onClick={() => {
                                  const svg = document.getElementById('heat-map-svg');
                                  if (svg) {
                                    const currentViewBox = svg.getAttribute('viewBox')?.split(' ') || ['0', '0', '1000', '700'];
                                    const newWidth = Math.min(10000, parseFloat(currentViewBox[2]) * 1.33);
                                    const newHeight = Math.min(7000, parseFloat(currentViewBox[3]) * 1.33);
                                    const newX = parseFloat(currentViewBox[0]) - (newWidth - parseFloat(currentViewBox[2])) / 2;
                                    const newY = parseFloat(currentViewBox[1]) - (newHeight - parseFloat(currentViewBox[3])) / 2;
                                    svg.setAttribute('viewBox', `${Math.max(-500, newX)} ${Math.max(-350, newY)} ${newWidth} ${newHeight}`);
                                  }
                                }}
                                className="w-8 h-8 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center text-gray-700 shadow-sm"
                                title={t.zoomOut}
                              >
                                <span className="text-lg font-bold">-</span>
                              </button>
                              <button
                                onClick={() => {
                                  const svg = document.getElementById('heat-map-svg');
                                  if (svg) {
                                    svg.setAttribute('viewBox', '0 0 1000 700');
                                  }
                                }}
                                className="w-8 h-8 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center text-gray-700 shadow-sm"
                                title={t.resetMap}
                              >
                                <span className="text-xs">{t.resetMap}</span>
                              </button>
                            </div>
                            
                            {/* Google Maps background with GPS points overlay */}
                            <div className="relative w-full h-96 rounded-lg overflow-hidden">
                              <iframe
                                src="https://www.google.com/maps/embed/v1/view?key=AIzaSyDummyKeyPlaceholder&center=33.3128,44.3661&zoom=6&maptype=roadmap"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                className="w-full h-full"
                              ></iframe>
                            </div>
                            
                            <svg 
                              id="heat-map-svg"
                              viewBox="0 0 1000 700" 
                              className="w-full h-96 bg-transparent absolute inset-0 cursor-grab active:cursor-grabbing pointer-events-none"
                              onMouseDown={(e) => {
                                const svg = e.currentTarget;
                                const startPoint = { x: e.clientX, y: e.clientY };
                                const viewBox = svg.getAttribute('viewBox')?.split(' ') || ['0', '0', '1000', '700'];
                                const startViewBox = {
                                  x: parseFloat(viewBox[0]),
                                  y: parseFloat(viewBox[1]),
                                  width: parseFloat(viewBox[2]),
                                  height: parseFloat(viewBox[3])
                                };
                                
                                const handleMouseMove = (e: MouseEvent) => {
                                  const dx = (startPoint.x - e.clientX) * (startViewBox.width / svg.clientWidth);
                                  const dy = (startPoint.y - e.clientY) * (startViewBox.height / svg.clientHeight);
                                  svg.setAttribute('viewBox', `${startViewBox.x + dx} ${startViewBox.y + dy} ${startViewBox.width} ${startViewBox.height}`);
                                };
                                
                                const handleMouseUp = () => {
                                  document.removeEventListener('mousemove', handleMouseMove);
                                  document.removeEventListener('mouseup', handleMouseUp);
                                };
                                
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                              }}
                              onWheel={(e) => {
                                e.preventDefault();
                                const svg = e.currentTarget;
                                const viewBox = svg.getAttribute('viewBox')?.split(' ') || ['0', '0', '1000', '700'];
                                const currentWidth = parseFloat(viewBox[2]);
                                const currentHeight = parseFloat(viewBox[3]);
                                const currentX = parseFloat(viewBox[0]);
                                const currentY = parseFloat(viewBox[1]);
                                
                                const zoomFactor = e.deltaY > 0 ? 1.15 : 0.85;
                                const newWidth = Math.max(50, Math.min(10000, currentWidth * zoomFactor));
                                const newHeight = Math.max(35, Math.min(7000, currentHeight * zoomFactor));
                                
                                // Center zoom around mouse position
                                const rect = svg.getBoundingClientRect();
                                const mouseX = ((e.clientX - rect.left) / rect.width) * currentWidth + currentX;
                                const mouseY = ((e.clientY - rect.top) / rect.height) * currentHeight + currentY;
                                
                                const newX = mouseX - (mouseX - currentX) * (newWidth / currentWidth);
                                const newY = mouseY - (mouseY - currentY) * (newHeight / currentHeight);
                                
                                svg.setAttribute('viewBox', `${newX} ${newY} ${newWidth} ${newHeight}`);
                              }}
                            >
                              {/* Background Map */}
                              <defs>
                                <pattern id="gridPattern" width="50" height="50" patternUnits="userSpaceOnUse">
                                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="0.5" opacity="0.5"/>
                                </pattern>
                                
                                {/* Gradient for heat intensity */}
                                <radialGradient id="heatGradientHigh" cx="50%" cy="50%" r="50%">
                                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.8"/>
                                  <stop offset="50%" stopColor="#10b981" stopOpacity="0.4"/>
                                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.1"/>
                                </radialGradient>
                                
                                <radialGradient id="heatGradientMedium" cx="50%" cy="50%" r="50%">
                                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7"/>
                                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.3"/>
                                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1"/>
                                </radialGradient>
                              </defs>
                              
                              {/* Clean overlay for GPS points - Google Maps provides the background */}
                              
                              {/* Plot GPS Heat Points */}
                              {(() => {
                                // Group points by proximity to create heat intensity
                                const clusters = new Map();
                                
                                gpsHeatmap.data.forEach((point: any, index: number) => {
                                  // Map GPS coordinates to SVG coordinates
                                  // Iraq region: lat 29-37, lng 38-48
                                  // Iran region: lat 25-40, lng 44-64
                                  // Turkey region: lat 36-42, lng 26-45
                                  const minLat = 25, maxLat = 42;
                                  const minLng = 26, maxLng = 64;
                                  
                                  const x = ((point.lng - minLng) / (maxLng - minLng)) * 700 + 150;
                                  const y = ((maxLat - point.lat) / (maxLat - minLat)) * 500 + 100;
                                  
                                  const mapX = Math.max(150, Math.min(850, x));
                                  const mapY = Math.max(100, Math.min(600, y));
                                  
                                  // Group nearby points (within 30px radius)
                                  const clusterKey = `${Math.floor(mapX / 30)}-${Math.floor(mapY / 30)}`;
                                  if (!clusters.has(clusterKey)) {
                                    clusters.set(clusterKey, { x: mapX, y: mapY, points: [], avgWeight: 0 });
                                  }
                                  clusters.get(clusterKey).points.push(point);
                                });
                                
                                // Calculate average weight for each cluster
                                clusters.forEach((cluster) => {
                                  cluster.avgWeight = cluster.points.reduce((sum: number, p: any) => sum + p.weight, 0) / cluster.points.length;
                                  cluster.intensity = cluster.points.length;
                                });
                                
                                return Array.from(clusters.values()).map((cluster, index) => (
                                  <g key={`cluster-${index}`}>
                                    {/* Heat bubble based on cluster intensity */}
                                    <circle 
                                      cx={cluster.x} 
                                      cy={cluster.y} 
                                      r={Math.min(50, 10 + cluster.intensity * 3)}
                                      fill={cluster.avgWeight >= 1 ? "url(#heatGradientHigh)" : "url(#heatGradientMedium)"}
                                      opacity="0.6"
                                    />
                                    
                                    {/* Center point marker */}
                                    <circle 
                                      cx={cluster.x} 
                                      cy={cluster.y} 
                                      r={Math.min(8, 3 + cluster.intensity)}
                                      fill={cluster.avgWeight >= 1 ? "#10b981" : "#f59e0b"}
                                      stroke="white"
                                      strokeWidth="2"
                                      className="hover:opacity-100 cursor-pointer pointer-events-auto"
                                      onClick={() => {
                                        // Calculate average coordinates for the cluster
                                        const avgLat = cluster.points.reduce((sum: number, p: any) => sum + p.lat, 0) / cluster.points.length;
                                        const avgLng = cluster.points.reduce((sum: number, p: any) => sum + p.lng, 0) / cluster.points.length;
                                        
                                        // Open Google Maps with the cluster center coordinates
                                        const googleMapsUrl = `https://www.google.com/maps?q=${avgLat},${avgLng}&z=15`;
                                        window.open(googleMapsUrl, '_blank');
                                      }}
                                    >
                                      <title>
                                        {t.deliveryArea}
                                        {t.pointCount}: {number(cluster.intensity)}
                                        {t.averageAccuracyShort}: {number(cluster.avgWeight, { maximumFractionDigits: 1 })}
                                        {t.clickMap}
                                      </title>
                                    </circle>
                                    
                                    {/* Pulse animation for high-intensity clusters */}
                                    {cluster.intensity > 3 && (
                                      <circle 
                                        cx={cluster.x} 
                                        cy={cluster.y} 
                                        r={10 + cluster.intensity * 2}
                                        fill="none"
                                        stroke={cluster.avgWeight >= 1 ? "#10b981" : "#f59e0b"}
                                        strokeWidth="2"
                                        opacity="0.4"
                                      >
                                        <animate attributeName="r" values={`${10 + cluster.intensity * 2};${20 + cluster.intensity * 3};${10 + cluster.intensity * 2}`} dur="3s" repeatCount="indefinite" />
                                        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite" />
                                      </circle>
                                    )}
                                    
                                    {/* Cluster size indicator */}
                                    {cluster.intensity > 1 && (
                                      <text 
                                        x={cluster.x} 
                                        y={cluster.y + 2} 
                                        textAnchor="middle" 
                                        className="text-xs font-bold fill-white"
                                        style={{ fontSize: '10px' }}
                                      >
                                        {cluster.intensity}
                                      </text>
                                    )}
                                  </g>
                                ));
                              })()}
                              
                              {/* Individual scattered points for low-density areas */}
                              {gpsHeatmap.data.slice(0, 20).map((point: any, index: number) => {
                                const minLat = 25, maxLat = 42;
                                const minLng = 26, maxLng = 64;
                                
                                const x = ((point.lng - minLng) / (maxLng - minLng)) * 700 + 150;
                                const y = ((maxLat - point.lat) / (maxLat - minLat)) * 500 + 100;
                                
                                const mapX = Math.max(150, Math.min(850, x));
                                const mapY = Math.max(100, Math.min(600, y));
                                
                                return (
                                  <circle 
                                    key={`scatter-${index}`}
                                    cx={mapX + (Math.random() - 0.5) * 20} 
                                    cy={mapY + (Math.random() - 0.5) * 20} 
                                    r="3"
                                    fill={point.weight >= 1 ? "#10b981" : "#f59e0b"}
                                    opacity="0.7"
                                    className="hover:opacity-100 cursor-pointer pointer-events-auto"
                                    onClick={() => {
                                      // Open Google Maps with exact coordinates
                                      const googleMapsUrl = `https://www.google.com/maps?q=${point.lat},${point.lng}&z=15`;
                                      window.open(googleMapsUrl, '_blank');
                                    }}
                                  >
                                    <title>
                                      {t.location}: {point.lat.toFixed(4)}, {point.lng.toFixed(4)} — {t.mapAll}
                                      {t.date}: {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(point.timestamp))}
                                    </title>
                                  </circle>
                                );
                              })}
                            </svg>
                          </div>
                          
                          {/* Map Legend and Controls */}
                          <div className="p-4 bg-gray-50 border-t">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div className="flex items-center space-x-6">
                                <h5 className="font-semibold text-gray-800">{t.mapGuide}:</h5>
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center">
                                    <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                                    <span className="text-sm">{t.successful}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <div className="w-4 h-4 rounded-full bg-yellow-500 mr-2"></div>
                                    <span className="text-sm">{t.needsReview}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <div className="w-6 h-6 rounded-full bg-green-200 border-2 border-green-500 mr-2"></div>
                                    <span className="text-sm">{t.denseAreas}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="text-xs text-gray-600 flex-1">
                                  {t.mapGuide}: {t.zoomIn} / {t.zoomOut} | {t.resetMap}
                                  <br />
                                  {t.gpsPoints}: {t.denseAreas} | {t.mapAll}
                                </div>
                                <button
                                  onClick={() => {
                                    // Create Google Maps URL with all GPS points
                                    const allCoords = gpsHeatmap.data.map((point: any) => `${point.lat},${point.lng}`).join('|');
                                    const firstPoint = gpsHeatmap.data[0];
                                    const googleMapsUrl = `https://www.google.com/maps/dir/${allCoords}/@${firstPoint.lat},${firstPoint.lng},10z`;
                                    window.open(googleMapsUrl, '_blank');
                                  }}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors flex-shrink-0"
                                >
                                  {t.mapAll}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 text-xs text-gray-600 text-center">
                          <p>{t.gpsPoints}: {number(gpsHeatmap.data.length)} — {t.highAccuracy}: {t.successful}; {t.needsReview}: {t.needsReview}</p>
                        </div>
                      </div>
                      
                      {/* Detailed GPS Coordinates List */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-3">{t.gpsDetails}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                          {gpsHeatmap.data.map((point: any, index: number) => (
                            <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full mr-2 ${
                                  point.weight >= 1 ? 'bg-green-500' : 'bg-yellow-500'
                                }`}></div>
                                <div className="text-sm">
                                  <div className="font-medium">{point.lat.toFixed(4)}, {point.lng.toFixed(4)}</div>
                                  <div className="text-gray-500 text-xs">
                                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(point.timestamp))}
                                  </div>
                                </div>
                              </div>
                              <Badge variant={point.weight >= 1 ? "default" : "secondary"} className="text-xs">
                                {point.weight >= 1 ? t.highAccuracy : t.needsReview}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-4">
                        <p><strong>{t.note}:</strong> {t.latestGps}. {t.highAccuracy}: {t.match}; {t.needsReview}: {t.noMatch}.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">{t.noHeatmap}</p>
                        <p className="text-sm">{t.heatmapWillAppear}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}