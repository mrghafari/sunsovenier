import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Store, Package, DollarSign, TrendingUp, ArrowUpRight, ArrowDownLeft, 
  Plus, Eye, FileText, Clock, CheckCircle, XCircle, Wallet,
  Calendar, CreditCard, Building2, RefreshCw
} from "lucide-react";
import { format } from "date-fns";

type VendorBalance = {
  id: number;
  vendorId: number;
  vendorName: string;
  currentBalance: string;
  totalSales: string;
  totalCommission: string;
  totalPaid: string;
  commissionRate: string;
  isActive: boolean;
  isApproved: boolean;
  lastTransactionAt: string | null;
  productCount: number;
};

type VendorProduct = {
  id: number;
  vendorId: number;
  productName: string;
  sku: string;
  price: string;
  quantity: number;
  status: boolean;
  totalSold: number;
  totalRevenue: string;
  commissionOverride: string | null;
};

type VendorTransaction = {
  id: number;
  vendorId: number;
  vendorName: string;
  transactionType: string;
  amount: string;
  currency: string;
  saleAmount: string | null;
  commissionAmount: string | null;
  netAmount: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  balanceBefore: string | null;
  balanceAfter: string | null;
  status: string;
  description: string | null;
  notes: string | null;
  createdAt: string;
};

export default function VendorAccountingTab() {
  const { toast } = useToast();
  const [selectedVendor, setSelectedVendor] = useState<VendorBalance | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showTransactionsDialog, setShowTransactionsDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [showCommissionDialog, setShowCommissionDialog] = useState(false);
  const [newCommissionRate, setNewCommissionRate] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<VendorProduct | null>(null);
  const [showProductCommissionDialog, setShowProductCommissionDialog] = useState(false);
  const [productCommissionOverride, setProductCommissionOverride] = useState("");

  const { data: vendorBalances, isLoading: loadingBalances, refetch: refetchBalances } = useQuery<{ vendors: VendorBalance[] }>({
    queryKey: ["/api/admin/vendor-accounting/balances"],
  });

  const { data: vendorProducts, isLoading: loadingProducts } = useQuery<{ products: VendorProduct[] }>({
    queryKey: ["/api/admin/vendor-accounting/products", selectedVendor?.vendorId],
    enabled: !!selectedVendor,
  });

  const { data: vendorTransactions, isLoading: loadingTransactions } = useQuery<{ transactions: VendorTransaction[] }>({
    queryKey: ["/api/admin/vendor-accounting/transactions", selectedVendor?.vendorId],
    enabled: !!selectedVendor,
  });

  const { data: allTransactions, isLoading: loadingAllTransactions } = useQuery<{ transactions: VendorTransaction[] }>({
    queryKey: ["/api/admin/vendor-accounting/transactions"],
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: { vendorId: number; amount: number; method: string; reference: string; notes: string }) => {
      return await apiRequest(`/api/admin/vendor-accounting/payment`, {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendor-accounting/balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendor-accounting/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendor-accounting/transactions", selectedVendor?.vendorId] });
      toast({
        title: "موفق!",
        description: "پرداخت با موفقیت ثبت شد",
      });
      setShowPaymentDialog(false);
      resetPaymentForm();
    },
    onError: () => {
      toast({
        title: "خطا!",
        description: "خطا در ثبت پرداخت",
        variant: "destructive",
      });
    },
  });

  const resetPaymentForm = () => {
    setPaymentAmount("");
    setPaymentMethod("bank_transfer");
    setPaymentReference("");
    setPaymentNotes("");
  };

  const commissionMutation = useMutation({
    mutationFn: async (data: { vendorId: number; commissionRate: number }) => {
      return await apiRequest(`/api/admin/vendor-accounting/commission/${data.vendorId}`, {
        method: "PATCH",
        body: { commissionRate: data.commissionRate },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendor-accounting/balances"] });
      toast({
        title: "موفق!",
        description: "درصد کمیسیون با موفقیت بروزرسانی شد",
      });
      setShowCommissionDialog(false);
      setNewCommissionRate("");
    },
    onError: () => {
      toast({
        title: "خطا!",
        description: "خطا در بروزرسانی درصد کمیسیون",
        variant: "destructive",
      });
    },
  });

  const productCommissionMutation = useMutation({
    mutationFn: async (data: { productId: number; commissionOverride: number | null }) => {
      return await apiRequest(`/api/admin/vendor-accounting/product-commission/${data.productId}`, {
        method: "PATCH",
        body: { commissionOverride: data.commissionOverride },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendor-accounting/products", selectedVendor?.vendorId] });
      toast({
        title: "موفق!",
        description: "درصد کمیسیون محصول با موفقیت بروزرسانی شد",
      });
      setShowProductCommissionDialog(false);
      setSelectedProduct(null);
      setProductCommissionOverride("");
    },
    onError: () => {
      toast({
        title: "خطا!",
        description: "خطا در بروزرسانی درصد کمیسیون محصول",
        variant: "destructive",
      });
    },
  });

  const handleUpdateCommission = () => {
    if (!selectedVendor || !newCommissionRate) return;
    commissionMutation.mutate({
      vendorId: selectedVendor.vendorId,
      commissionRate: parseFloat(newCommissionRate),
    });
  };

  const handleUpdateProductCommission = () => {
    if (!selectedProduct) return;
    const override = productCommissionOverride.trim() === "" ? null : parseFloat(productCommissionOverride);
    productCommissionMutation.mutate({
      productId: selectedProduct.id,
      commissionOverride: override,
    });
  };

  const handleRecordPayment = () => {
    if (!selectedVendor || !paymentAmount) return;
    
    paymentMutation.mutate({
      vendorId: selectedVendor.vendorId,
      amount: parseFloat(paymentAmount),
      method: paymentMethod,
      reference: paymentReference,
      notes: paymentNotes,
    });
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US').format(num) + ' IQD';
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, { label: string; color: string; icon: any }> = {
      sale: { label: "فروش", color: "bg-green-500", icon: TrendingUp },
      commission: { label: "کمیسیون", color: "bg-orange-500", icon: Building2 },
      payment: { label: "پرداخت", color: "bg-blue-500", icon: ArrowUpRight },
      refund: { label: "برگشت", color: "bg-red-500", icon: ArrowDownLeft },
      adjustment: { label: "تعدیل", color: "bg-purple-500", icon: RefreshCw },
    };
    return labels[type] || { label: type, color: "bg-gray-500", icon: FileText };
  };

  const totalOwed = vendorBalances?.vendors.reduce((sum, v) => sum + parseFloat(v.currentBalance || "0"), 0) || 0;
  const totalVendorSales = vendorBalances?.vendors.reduce((sum, v) => sum + parseFloat(v.totalSales || "0"), 0) || 0;
  const totalCommission = vendorBalances?.vendors.reduce((sum, v) => sum + parseFloat(v.totalCommission || "0"), 0) || 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">مدیریت مالی و حساب‌وکتاب فروشندگان</p>
        <Button onClick={() => refetchBalances()} variant="outline" data-testid="btn-refresh">
          <RefreshCw className="h-4 w-4 ml-2" />
          بروزرسانی
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-vendors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تعداد وندورها</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendorBalances?.vendors.length || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-sales">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">کل فروش وندورها</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalVendorSales)}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-commission">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">کمیسیون دریافتی</CardTitle>
            <Building2 className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalCommission)}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-owed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">بدهی به وندورها</CardTitle>
            <Wallet className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOwed)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vendors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vendors" data-testid="tab-vendors">
            <Store className="h-4 w-4 ml-2" />
            وندورها
          </TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-transactions">
            <FileText className="h-4 w-4 ml-2" />
            تراکنش‌ها
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>لیست وندورها و موجودی</CardTitle>
              <CardDescription>مشاهده حساب مالی هر وندور و محصولات آنها</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingBalances ? (
                <div className="text-center py-8">در حال بارگذاری...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>نام وندور</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead>درصد کمیسیون</TableHead>
                      <TableHead>محصولات</TableHead>
                      <TableHead>کل فروش</TableHead>
                      <TableHead>کمیسیون دریافتی</TableHead>
                      <TableHead>پرداخت شده</TableHead>
                      <TableHead>مانده بدهی</TableHead>
                      <TableHead>عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorBalances?.vendors.map((vendor) => (
                      <TableRow key={vendor.vendorId} data-testid={`row-vendor-${vendor.vendorId}`}>
                        <TableCell className="font-medium">{vendor.vendorName}</TableCell>
                        <TableCell>
                          <Badge variant={vendor.isActive ? "default" : "secondary"}>
                            {vendor.isActive ? "فعال" : "غیرفعال"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 cursor-pointer hover:bg-purple-100"
                              onClick={() => {
                                setSelectedVendor(vendor);
                                setNewCommissionRate(vendor.commissionRate || "10.00");
                                setShowCommissionDialog(true);
                              }}
                              data-testid={`btn-edit-commission-${vendor.vendorId}`}
                            >
                              {vendor.commissionRate || "10.00"}% ✏️
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{vendor.productCount} محصول</Badge>
                        </TableCell>
                        <TableCell className="text-green-600">{formatCurrency(vendor.totalSales)}</TableCell>
                        <TableCell className="text-orange-600">{formatCurrency(vendor.totalCommission)}</TableCell>
                        <TableCell className="text-blue-600">{formatCurrency(vendor.totalPaid)}</TableCell>
                        <TableCell className={parseFloat(vendor.currentBalance) > 0 ? "text-red-600 font-bold" : ""}>
                          {formatCurrency(vendor.currentBalance)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedVendor(vendor);
                                setShowDetailsDialog(true);
                              }}
                              data-testid={`btn-details-${vendor.vendorId}`}
                            >
                              <Package className="h-4 w-4 ml-1" />
                              محصولات
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedVendor(vendor);
                                setShowTransactionsDialog(true);
                              }}
                              data-testid={`btn-transactions-${vendor.vendorId}`}
                            >
                              <FileText className="h-4 w-4 ml-1" />
                              تراکنش‌ها
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedVendor(vendor);
                                setShowPaymentDialog(true);
                              }}
                              disabled={parseFloat(vendor.currentBalance) <= 0}
                              data-testid={`btn-pay-${vendor.vendorId}`}
                            >
                              <DollarSign className="h-4 w-4 ml-1" />
                              پرداخت
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!vendorBalances?.vendors || vendorBalances.vendors.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          هیچ وندوری یافت نشد
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تاریخچه تراکنش‌ها</CardTitle>
              <CardDescription>همه تراکنش‌های مالی با وندورها</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAllTransactions ? (
                <div className="text-center py-8">در حال بارگذاری...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>تاریخ</TableHead>
                      <TableHead>وندور</TableHead>
                      <TableHead>نوع</TableHead>
                      <TableHead>مبلغ</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead>توضیحات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allTransactions?.transactions.map((tx) => {
                      const typeInfo = getTransactionTypeLabel(tx.transactionType);
                      const Icon = typeInfo.icon;
                      return (
                        <TableRow key={tx.id} data-testid={`row-tx-${tx.id}`}>
                          <TableCell>{format(new Date(tx.createdAt), "yyyy/MM/dd HH:mm")}</TableCell>
                          <TableCell>{tx.vendorName}</TableCell>
                          <TableCell>
                            <Badge className={typeInfo.color}>
                              <Icon className="h-3 w-3 ml-1" />
                              {typeInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className={tx.transactionType === 'payment' ? 'text-blue-600' : 'text-green-600'}>
                            {formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                              {tx.status === 'completed' ? 'تکمیل' : tx.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{tx.description || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                    {(!allTransactions?.transactions || allTransactions.transactions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          هیچ تراکنشی یافت نشد
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>ثبت پرداخت به {selectedVendor?.vendorName}</DialogTitle>
            <DialogDescription>
              مانده بدهی: {selectedVendor && formatCurrency(selectedVendor.currentBalance)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>مبلغ پرداخت (IQD)</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="مبلغ را وارد کنید"
                data-testid="input-payment-amount"
              />
            </div>
            <div>
              <Label>روش پرداخت</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">انتقال بانکی</SelectItem>
                  <SelectItem value="cash">نقدی</SelectItem>
                  <SelectItem value="cheque">چک</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>شماره مرجع / فیش</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="شماره پیگیری"
                data-testid="input-payment-reference"
              />
            </div>
            <div>
              <Label>توضیحات</Label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="توضیحات اختیاری"
                data-testid="input-payment-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              انصراف
            </Button>
            <Button 
              onClick={handleRecordPayment} 
              disabled={!paymentAmount || paymentMutation.isPending}
              data-testid="btn-confirm-payment"
            >
              {paymentMutation.isPending ? "در حال ثبت..." : "ثبت پرداخت"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>محصولات {selectedVendor?.vendorName}</DialogTitle>
            <DialogDescription>لیست محصولات این وندور و آمار فروش</DialogDescription>
          </DialogHeader>
          {loadingProducts ? (
            <div className="text-center py-8">در حال بارگذاری...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام محصول</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>قیمت</TableHead>
                  <TableHead>کمیسیون</TableHead>
                  <TableHead>موجودی</TableHead>
                  <TableHead>تعداد فروخته شده</TableHead>
                  <TableHead>درآمد کل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorProducts?.products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.productName}</TableCell>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>{formatCurrency(product.price)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {product.commissionOverride ? (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 cursor-pointer hover:bg-orange-100"
                            onClick={() => {
                              setSelectedProduct(product);
                              setProductCommissionOverride(product.commissionOverride || "");
                              setShowProductCommissionDialog(true);
                            }}
                            data-testid={`btn-edit-product-commission-${product.id}`}
                          >
                            {product.commissionOverride}% (سفارشی) ✏️
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              setSelectedProduct(product);
                              setProductCommissionOverride(product.commissionOverride || "");
                              setShowProductCommissionDialog(true);
                            }}
                            data-testid={`btn-edit-product-commission-${product.id}`}
                          >
                            پیش‌فرض ({selectedVendor?.commissionRate || "10.00"}%) ✏️
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{product.quantity}</TableCell>
                    <TableCell>{product.totalSold}</TableCell>
                    <TableCell className="text-green-600">{formatCurrency(product.totalRevenue)}</TableCell>
                  </TableRow>
                ))}
                {(!vendorProducts?.products || vendorProducts.products.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      هیچ محصولی یافت نشد
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showTransactionsDialog} onOpenChange={setShowTransactionsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>تراکنش‌های {selectedVendor?.vendorName}</DialogTitle>
            <DialogDescription>تاریخچه مالی این وندور</DialogDescription>
          </DialogHeader>
          {loadingTransactions ? (
            <div className="text-center py-8">در حال بارگذاری...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>نوع</TableHead>
                  <TableHead>مبلغ</TableHead>
                  <TableHead>مانده قبل</TableHead>
                  <TableHead>مانده بعد</TableHead>
                  <TableHead>توضیحات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorTransactions?.transactions.map((tx) => {
                  const typeInfo = getTransactionTypeLabel(tx.transactionType);
                  const Icon = typeInfo.icon;
                  return (
                    <TableRow key={tx.id}>
                      <TableCell>{format(new Date(tx.createdAt), "yyyy/MM/dd HH:mm")}</TableCell>
                      <TableCell>
                        <Badge className={typeInfo.color}>
                          <Icon className="h-3 w-3 ml-1" />
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className={tx.transactionType === 'payment' ? 'text-blue-600' : 'text-green-600'}>
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell>{tx.balanceBefore ? formatCurrency(tx.balanceBefore) : "-"}</TableCell>
                      <TableCell>{tx.balanceAfter ? formatCurrency(tx.balanceAfter) : "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{tx.description || "-"}</TableCell>
                    </TableRow>
                  );
                })}
                {(!vendorTransactions?.transactions || vendorTransactions.transactions.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      هیچ تراکنشی یافت نشد
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCommissionDialog} onOpenChange={setShowCommissionDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تنظیم درصد کمیسیون وندور</DialogTitle>
            <DialogDescription>
              درصد کمیسیون برای {selectedVendor?.vendorName} را تعیین کنید. این درصد روی همه محصولات این وندور اعمال می‌شود مگر محصولاتی که کمیسیون سفارشی دارند.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="commission-rate">درصد کمیسیون (0-100)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="commission-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={newCommissionRate}
                  onChange={(e) => setNewCommissionRate(e.target.value)}
                  placeholder="مثال: 15"
                  data-testid="input-commission-rate"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCommissionDialog(false)}>
              انصراف
            </Button>
            <Button 
              onClick={handleUpdateCommission}
              disabled={!newCommissionRate || commissionMutation.isPending}
              data-testid="btn-confirm-commission"
            >
              {commissionMutation.isPending ? "در حال ذخیره..." : "ذخیره"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showProductCommissionDialog} onOpenChange={setShowProductCommissionDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تنظیم کمیسیون سفارشی محصول</DialogTitle>
            <DialogDescription>
              برای محصول «{selectedProduct?.productName}» کمیسیون سفارشی تعیین کنید. اگر خالی بگذارید، از درصد پیش‌فرض وندور استفاده می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product-commission">درصد کمیسیون سفارشی (0-100)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="product-commission"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={productCommissionOverride}
                  onChange={(e) => setProductCommissionOverride(e.target.value)}
                  placeholder="خالی = استفاده از پیش‌فرض"
                  data-testid="input-product-commission"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                درصد پیش‌فرض وندور: {selectedVendor?.commissionRate || "10.00"}%
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductCommissionDialog(false)}>
              انصراف
            </Button>
            <Button 
              onClick={handleUpdateProductCommission}
              disabled={productCommissionMutation.isPending}
              data-testid="btn-confirm-product-commission"
            >
              {productCommissionMutation.isPending ? "در حال ذخیره..." : "ذخیره"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
