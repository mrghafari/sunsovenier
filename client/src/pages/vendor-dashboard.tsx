import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Store, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign, 
  Eye,
  Edit,
  LogOut,
  Plus,
  Wallet,
  Percent,
  Calculator
} from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import JsBarcode from "jsbarcode";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// Barcode component with image rendering
function BarcodeImage({ value, align = 'center' }: { value: string; align?: 'left' | 'right' | 'center' }) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: false,
          margin: 6,
          background: "#ffffff"
        });
      } catch (e) {
        console.error("Barcode error:", e);
      }
    }
  }, [value]);

  if (!value) return <span className="text-muted-foreground">-</span>;

  const alignClass = align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center';

  return (
    <div className={`flex flex-col ${alignClass} py-2`}>
      <svg ref={svgRef} />
      <span className="text-sm font-mono text-gray-700 mt-2 font-bold">{value}</span>
    </div>
  );
}
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function VendorDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch vendor profile
  const { data: vendorData, isLoading: isLoadingVendor } = useQuery({
    queryKey: ["/api/vendors/auth/me"],
    queryFn: async () => {
      const response = await fetch("/api/vendors/auth/me");
      if (!response.ok) {
        if (response.status === 401) {
          setLocation("/vendor/login");
          throw new Error("احراز هویت نشده");
        }
        throw new Error("خطا در دریافت اطلاعات");
      }
      return response.json();
    },
  });

  // Fetch vendor products
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["/api/vendors/products"],
    enabled: !!vendorData?.user,
    queryFn: async () => {
      const response = await fetch("/api/vendors/products");
      if (!response.ok) throw new Error("خطا در دریافت محصولات");
      return response.json();
    },
  });

  // Fetch vendor orders
  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["/api/vendors/orders"],
    enabled: !!vendorData?.user,
    queryFn: async () => {
      const response = await fetch("/api/vendors/orders");
      if (!response.ok) throw new Error("خطا در دریافت سفارشات");
      return response.json();
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ["/api/vendors/statistics"],
    enabled: !!vendorData?.user,
    queryFn: async () => {
      const response = await fetch("/api/vendors/statistics");
      if (!response.ok) throw new Error("خطا در دریافت آمار");
      return response.json();
    },
  });

  // Fetch sales details with commission breakdown
  const { data: salesDetailsData, isLoading: isLoadingSalesDetails } = useQuery({
    queryKey: ["/api/vendors/sales-details"],
    enabled: !!vendorData?.user,
    queryFn: async () => {
      const response = await fetch("/api/vendors/sales-details");
      if (!response.ok) throw new Error("خطا در دریافت جزئیات فروش");
      return response.json();
    },
  });

  const handleLogout = async () => {
    try {
      await apiRequest("/api/vendors/auth/logout", { method: "POST" });
      toast({
        title: "✅ خروج موفق",
        description: "با موفقیت از حساب خود خارج شدید",
      });
      setLocation("/vendor/login");
    } catch (error) {
      toast({
        title: "❌ خطا",
        description: "خطا در خروج از حساب",
        variant: "destructive",
      });
    }
  };

  if (isLoadingVendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (!vendorData?.user) {
    return null;
  }

  const vendor = vendorData.user;
  const products = Array.isArray(productsData?.products) 
    ? productsData.products 
    : Array.isArray(productsData?.data) 
      ? productsData.data 
      : [];
  const orders = Array.isArray(ordersData?.orders)
    ? ordersData.orders
    : Array.isArray(ordersData?.data)
      ? ordersData.data
      : [];
  const stats = statsData?.stats || statsData?.data || {
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    recognizedRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
  };

  // Filter products by search term (minimum 3 characters)
  const filteredSalesProducts = useMemo(() => {
    const allProducts = salesDetailsData?.data?.products || [];
    if (searchTerm.length < 3) return allProducts;
    
    const term = searchTerm.toLowerCase();
    return allProducts.filter((product: any) => 
      product.productName?.toLowerCase().includes(term) ||
      product.barcode?.toLowerCase().includes(term)
    );
  }, [salesDetailsData?.data?.products, searchTerm]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {vendor.logoUrl ? (
                <img
                  src={`/api/s3/serve/vendor-logos/${vendor.logoUrl}`}
                  alt={vendor.vendorName}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Store className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold">{vendor.vendorName}</h1>
                <p className="text-sm text-muted-foreground">{vendor.contactEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={vendor.isActive ? "default" : "secondary"}>
                {vendor.isActive ? "فعال" : "غیرفعال"}
              </Badge>
              <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">محصولات</CardTitle>
              <Package className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeProducts} محصول فعال
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">سفارشات</CardTitle>
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                کل سفارشات
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">درآمد شناسایی شده</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.recognizedRevenue?.toLocaleString()} IQD
              </div>
              <p className="text-xs text-muted-foreground">
                بعد از خروج از انبار
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">رشد</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+12%</div>
              <p className="text-xs text-muted-foreground">
                نسبت به ماه قبل
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="products">محصولات</TabsTrigger>
            <TabsTrigger value="orders">سفارشات</TabsTrigger>
            <TabsTrigger value="accounting">حسابداری</TabsTrigger>
            <TabsTrigger value="profile">پروفایل</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>محصولات من</CardTitle>
                    <CardDescription>
                      مدیریت و ویرایش محصولات فروشگاه
                    </CardDescription>
                  </div>
                  <Link href="/vendor/products">
                    <Button data-testid="button-add-product">
                      <Plus className="w-4 h-4 mr-2" />
                      مدیریت محصولات
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingProducts ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">هنوز محصولی اضافه نکرده‌اید</p>
                    <Link href="/vendor/products/new">
                      <Button className="mt-4" variant="outline">
                        افزودن اولین محصول
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.map((product: any) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {product.imageUrl && (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div>
                            <h3 className="font-medium">{product.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {product.price?.toLocaleString()} IQD
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={product.isActive ? "default" : "secondary"}>
                            {product.isActive ? "فعال" : "غیرفعال"}
                          </Badge>
                          <Link href="/vendor/products">
                            <Button size="sm" variant="outline" data-testid={`button-manage-products-${product.id}`}>
                              <Edit className="w-4 h-4 mr-1" />
                              مدیریت محصولات
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="space-y-6">
              {/* Order Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">کل سفارشات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalOrders || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">سفارشات در حال پردازش</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{stats.pendingOrders || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">سفارشات تکمیل شده</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.completedOrders || 0}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Orders List */}
              <Card>
                <CardHeader>
                  <CardTitle>سفارشات اخیر</CardTitle>
                  <CardDescription>
                    لیست سفارشاتی که شامل محصولات شما هستند
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingOrders ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">هنوز سفارشی ثبت نشده است</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order: any) => {
                        // Calculate vendor's portion of this order
                        const vendorTotal = order.items?.reduce((sum: number, item: any) => 
                          sum + parseFloat(item.totalPrice || 0), 0) || 0;
                        
                        return (
                          <div
                            key={order.id}
                            className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            data-testid={`order-${order.id}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium">سفارش #{order.orderNumber}</h3>
                                <Badge variant={
                                  order.status === 'delivered' || order.status === 'completed' ? 'default' :
                                  order.status === 'cancelled' ? 'destructive' :
                                  'secondary'
                                }>
                                  {order.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                تاریخ: {new Date(order.createdAt).toLocaleDateString('fa-IR')}
                              </p>
                              <div className="text-sm text-muted-foreground">
                                <span className="font-medium">{order.items?.length || 0}</span> محصول از شما در این سفارش
                              </div>
                            </div>
                            <div className="text-right mt-3 md:mt-0">
                              <p className="text-lg font-bold text-purple-600" data-testid={`order-total-${order.id}`}>
                                {vendorTotal.toLocaleString()} IQD
                              </p>
                              <p className="text-xs text-muted-foreground">سهم شما از سفارش</p>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Total Summary */}
                      <div className="border-t pt-4 mt-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-base font-medium text-muted-foreground">کل درآمد سفارشات:</span>
                          <span className="text-xl font-bold" data-testid="total-revenue">
                            {stats.totalRevenue?.toLocaleString()} IQD
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-lg font-semibold">درآمد شناسایی شده:</span>
                            <span className="text-xs text-muted-foreground">(بعد از خروج از انبار)</span>
                          </div>
                          <span className="text-2xl font-bold text-green-600" data-testid="recognized-revenue">
                            {stats.recognizedRevenue?.toLocaleString()} IQD
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Accounting Tab */}
          <TabsContent value="accounting">
            <div className="space-y-6">
              {/* Compact Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 p-3">
                  <div className="text-xs text-green-700 dark:text-green-400 mb-1">کل فروش</div>
                  <div className="text-lg font-bold text-green-600" data-testid="total-sales-amount">
                    {salesDetailsData?.data?.summary?.totalSales?.toLocaleString() || 0} <span className="text-xs">IQD</span>
                  </div>
                </Card>

                <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 p-3">
                  <div className="text-xs text-orange-700 dark:text-orange-400 mb-1 flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    کمیسیون ({salesDetailsData?.data?.summary?.commissionRate || 10}%)
                  </div>
                  <div className="text-lg font-bold text-orange-600" data-testid="total-commission">
                    {salesDetailsData?.data?.summary?.totalCommission?.toLocaleString() || 0} <span className="text-xs">IQD</span>
                  </div>
                </Card>

                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 p-3">
                  <div className="text-xs text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1">
                    <Calculator className="w-3 h-3" />
                    خالص دریافتی
                  </div>
                  <div className="text-lg font-bold text-blue-600" data-testid="net-amount">
                    {salesDetailsData?.data?.summary?.totalBalance?.toLocaleString() || 0} <span className="text-xs">IQD</span>
                  </div>
                </Card>

                <Card className="border-purple-200 bg-purple-50 dark:bg-purple-900/20 p-3">
                  <div className="text-xs text-purple-700 dark:text-purple-400 mb-1 flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    طلب شما
                  </div>
                  <div className="text-lg font-bold text-purple-600" data-testid="balance-owed">
                    {salesDetailsData?.data?.summary?.totalBalance?.toLocaleString() || 0} <span className="text-xs">IQD</span>
                  </div>
                </Card>
              </div>

              {/* Product Sales Details */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        ریز فروش محصولات
                      </CardTitle>
                      <CardDescription>
                        لیست محصولات فروخته شده با جزئیات کمیسیون و خالص دریافتی
                      </CardDescription>
                    </div>
                    <div className="relative w-full md:w-64">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="جستجو (حداقل ۳ حرف)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-10"
                        data-testid="input-search-products"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingSalesDetails ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    </div>
                  ) : !salesDetailsData?.data?.products?.length ? (
                    <div className="text-center py-12">
                      <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">هنوز فروشی ثبت نشده است</p>
                    </div>
                  ) : filteredSalesProducts.length === 0 ? (
                    <div className="text-center py-12">
                      <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">محصولی با این عبارت یافت نشد</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                          <tr>
                            <th className="text-right p-2 text-xs font-medium">نام محصول</th>
                            <th className="text-center p-2 text-xs font-medium">بارکد</th>
                            <th className="text-center p-2 text-xs font-medium">تعداد</th>
                            <th className="text-center p-2 text-xs font-medium">سفارش</th>
                            <th className="text-left p-2 text-xs font-medium">فروش (IQD)</th>
                            <th className="text-left p-2 text-xs font-medium">کمیسیون</th>
                            <th className="text-left p-2 text-xs font-medium">خالص</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSalesProducts.map((product: any, index: number) => (
                            <tr 
                              key={product.productId || index} 
                              className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                              data-testid={`product-sale-row-${product.productId}`}
                            >
                              <td className="p-2 font-bold text-base">{product.productName}</td>
                              <td className="p-2">
                                <BarcodeImage value={product.barcode || ''} align="center" />
                              </td>
                              <td className="p-2 text-center">
                                <Badge variant="secondary" className="text-xs">{product.totalQuantity}</Badge>
                              </td>
                              <td className="p-2 text-center text-sm">{product.orderCount}</td>
                              <td className="p-2 text-left text-sm font-medium text-green-600">
                                {product.totalSales?.toLocaleString()}
                              </td>
                              <td className="p-2 text-left text-sm text-orange-600">
                                -{product.commissionAmount?.toLocaleString()}
                              </td>
                              <td className="p-2 text-left text-sm font-bold text-blue-600">
                                {product.netAmount?.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold text-sm">
                          <tr>
                            <td colSpan={4} className="p-2 text-right">جمع کل:</td>
                            <td className="p-2 text-left text-green-600">
                              {salesDetailsData.data.summary.totalSales?.toLocaleString()}
                            </td>
                            <td className="p-2 text-left text-orange-600">
                              -{salesDetailsData.data.summary.totalCommission?.toLocaleString()}
                            </td>
                            <td className="p-2 text-left text-blue-600">
                              {salesDetailsData.data.summary.totalBalance?.toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>اطلاعات فروشگاه</CardTitle>
                    <CardDescription>
                      مشاهده و ویرایش اطلاعات فروشگاه
                    </CardDescription>
                  </div>
                  <Link href="/vendor/profile/edit">
                    <Button variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      ویرایش
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-1">نام شرکت</h3>
                    <p className="text-muted-foreground">{vendor.vendorName}</p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">ایمیل</h3>
                    <p className="text-muted-foreground">{vendor.contactEmail}</p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">تلفن</h3>
                    <p className="text-muted-foreground">{vendor.contactPhone}</p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">شهر</h3>
                    <p className="text-muted-foreground">
                      {vendor.city}, {vendor.country}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <h3 className="font-medium mb-1">آدرس</h3>
                    <p className="text-muted-foreground">{vendor.address}</p>
                  </div>
                  {vendor.description && (
                    <div className="md:col-span-2">
                      <h3 className="font-medium mb-1">درباره فروشگاه</h3>
                      <p className="text-muted-foreground">{vendor.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
