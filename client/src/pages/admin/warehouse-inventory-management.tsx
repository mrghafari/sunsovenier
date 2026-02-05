import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, 
  Mail, 
  MessageSquare, 
  Phone,
  Plus, 
  Trash2, 
  Settings, 
  Bell,
  AlertTriangle,
  CheckCircle,
  Save,
  Edit,
  Search,
  RefreshCw,
  Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface InventoryProduct {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  stockQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  lowStockThreshold: number;
  isActive: boolean;
  vendorId: number | null;
  vendorName: string;
}

interface NotificationRecipient {
  id: number;
  name: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  receiveEmail: boolean;
  receiveSms: boolean;
  receiveWhatsapp: boolean;
  isActive: boolean;
}

interface InventoryNotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  maxNotifications: number;
  recipients: NotificationRecipient[];
}

export default function WarehouseInventoryManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  
  const [settings, setSettings] = useState<InventoryNotificationSettings>({
    emailEnabled: true,
    smsEnabled: false,
    whatsappEnabled: false,
    maxNotifications: 1,
    recipients: []
  });

  const [newRecipient, setNewRecipient] = useState<Omit<NotificationRecipient, 'id'>>({
    name: '',
    email: '',
    phone: '',
    whatsappNumber: '',
    receiveEmail: true,
    receiveSms: false,
    receiveWhatsapp: false,
    isActive: true
  });

  const { data: productsData, isLoading: productsLoading, refetch: refetchProducts } = useQuery<{ products: InventoryProduct[] }>({
    queryKey: ["/api/warehouse/inventory-products"],
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery<{ success: boolean; settings: InventoryNotificationSettings }>({
    queryKey: ["/api/warehouse/inventory-notification-settings"],
  });

  useEffect(() => {
    if (settingsData?.success && settingsData?.settings) {
      setSettings(settingsData.settings);
    }
  }, [settingsData]);

  const products: InventoryProduct[] = productsData?.products || [];

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateProductMutation = useMutation({
    mutationFn: (product: InventoryProduct) => 
      apiRequest(`/api/warehouse/inventory-products/${product.id}`, {
        method: "PATCH",
        body: {
          minStockLevel: product.minStockLevel,
          maxStockLevel: product.maxStockLevel,
          lowStockThreshold: product.lowStockThreshold
        }
      }),
    onSuccess: () => {
      toast({
        title: "ذخیره شد",
        description: "تنظیمات موجودی محصول با موفقیت ذخیره شد",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/inventory-products"] });
      setShowEditDialog(false);
      setEditingProduct(null);
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در ذخیره تنظیمات",
        variant: "destructive",
      });
    }
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (data: InventoryNotificationSettings) => 
      apiRequest("/api/warehouse/inventory-notification-settings", {
        method: "POST",
        body: data
      }),
    onSuccess: () => {
      toast({
        title: "تنظیمات ذخیره شد",
        description: "تنظیمات اطلاع‌رسانی موجودی با موفقیت به‌روزرسانی شد",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/inventory-notification-settings"] });
    },
    onError: () => {
      toast({
        title: "خطا در ذخیره‌سازی",
        description: "خطایی در ذخیره تنظیمات رخ داد",
        variant: "destructive",
      });
    }
  });

  const testNotificationMutation = useMutation({
    mutationFn: (type: 'email' | 'sms' | 'whatsapp') => 
      apiRequest(`/api/warehouse/test-notification/${type}`, { method: "POST" }),
    onSuccess: (_, type) => {
      const typeNames = { email: 'ایمیل', sms: 'پیامک', whatsapp: 'واتساپ' };
      toast({
        title: "تست موفق",
        description: `تست ${typeNames[type]} با موفقیت ارسال شد`,
      });
    },
    onError: () => {
      toast({
        title: "خطا در تست",
        description: "خطایی در ارسال تست رخ داد",
        variant: "destructive",
      });
    }
  });

  const addRecipient = () => {
    if (!newRecipient.name) {
      toast({
        title: "خطا",
        description: "نام الزامی است",
        variant: "destructive",
      });
      return;
    }

    if (!newRecipient.email && !newRecipient.phone && !newRecipient.whatsappNumber) {
      toast({
        title: "خطا",
        description: "حداقل یک روش ارتباطی (ایمیل، تلفن، یا واتساپ) الزامی است",
        variant: "destructive",
      });
      return;
    }

    const recipient: NotificationRecipient = {
      id: Date.now(),
      ...newRecipient
    };

    setSettings(prev => ({
      ...prev,
      recipients: [...prev.recipients, recipient]
    }));

    setNewRecipient({
      name: '',
      email: '',
      phone: '',
      whatsappNumber: '',
      receiveEmail: true,
      receiveSms: false,
      receiveWhatsapp: false,
      isActive: true
    });
    
    setShowAddRecipient(false);
  };

  const removeRecipient = (id: number) => {
    setSettings(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r.id !== id)
    }));
  };

  const updateRecipient = (id: number, updates: Partial<NotificationRecipient>) => {
    setSettings(prev => ({
      ...prev,
      recipients: prev.recipients.map(r => 
        r.id === id ? { ...r, ...updates } : r
      )
    }));
  };

  const getStockStatus = (product: InventoryProduct) => {
    const stock = product.stockQuantity || 0;
    const minLevel = product.minStockLevel || 0;
    
    if (stock <= 0) {
      return { status: 'out', label: 'اتمام موجودی', color: 'bg-red-500' };
    } else if (stock <= minLevel) {
      return { status: 'low', label: 'کم', color: 'bg-yellow-500' };
    }
    return { status: 'ok', label: 'مناسب', color: 'bg-green-500' };
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مدیریت موجودی انبار</h1>
          <p className="text-gray-600 mt-1">مدیریت سطوح موجودی و تنظیمات اطلاع‌رسانی</p>
        </div>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            موجودی کالاها
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            تنظیمات اطلاع‌رسانی
          </TabsTrigger>
          <TabsTrigger value="recipients" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            گیرندگان اعلان
          </TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  لیست موجودی کالاها
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="جستجو نام، کد یا بارکد..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10 w-64"
                    />
                  </div>
                  <Button variant="outline" onClick={() => refetchProducts()}>
                    <RefreshCw className="w-4 h-4 ml-2" />
                    بروزرسانی
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="text-center py-8">در حال بارگذاری...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right whitespace-nowrap">نام محصول</TableHead>
                      <TableHead className="text-right whitespace-nowrap">فروشنده</TableHead>
                      <TableHead className="text-right whitespace-nowrap">کد کالا</TableHead>
                      <TableHead className="text-center whitespace-nowrap">موجودی</TableHead>
                      <TableHead className="text-center whitespace-nowrap">حداقل موجودی</TableHead>
                      <TableHead className="text-center whitespace-nowrap">وضعیت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          محصولی یافت نشد
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => {
                        const stockStatus = getStockStatus(product);
                        return (
                          <TableRow 
                            key={product.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => {
                              setEditingProduct(product);
                              setShowEditDialog(true);
                            }}
                          >
                            <TableCell className="font-medium text-right">{product.name}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={product.vendorId ? "secondary" : "outline"}>
                                {product.vendorName || 'ممتاز کم'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{product.sku || '-'}</TableCell>
                            <TableCell className="text-center font-bold">{product.stockQuantity || 0}</TableCell>
                            <TableCell className="text-center">{product.minStockLevel || 0}</TableCell>
                            <TableCell className="text-center">
                              <Badge className={stockStatus.color}>
                                {stockStatus.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                تنظیمات کانال‌های اطلاع‌رسانی
              </CardTitle>
              <CardDescription>
                انتخاب روش‌های ارسال هشدار موجودی کم به مدیران
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-6 h-6 text-blue-500" />
                    <div>
                      <Label className="text-base font-medium">ایمیل</Label>
                      <p className="text-sm text-gray-500">ارسال هشدار از طریق ایمیل</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.emailEnabled}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, emailEnabled: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-6 h-6 text-green-500" />
                    <div>
                      <Label className="text-base font-medium">پیامک (SMS)</Label>
                      <p className="text-sm text-gray-500">ارسال هشدار از طریق پیامک</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.smsEnabled}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, smsEnabled: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Phone className="w-6 h-6 text-emerald-500" />
                    <div>
                      <Label className="text-base font-medium">واتساپ</Label>
                      <p className="text-sm text-gray-500">ارسال هشدار از طریق واتساپ</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.whatsappEnabled}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, whatsappEnabled: checked }))
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="max-w-md">
                  <Label htmlFor="maxNotifications" className="text-base font-medium">
                    حداکثر تعداد اعلان برای هر محصول
                  </Label>
                  <p className="text-sm text-gray-500 mb-2">
                    تعداد دفعاتی که برای یک محصول با موجودی کم اعلان ارسال شود
                  </p>
                  <Input
                    id="maxNotifications"
                    type="number"
                    min={1}
                    max={10}
                    value={settings.maxNotifications}
                    onChange={(e) => 
                      setSettings(prev => ({ 
                        ...prev, 
                        maxNotifications: parseInt(e.target.value) || 1 
                      }))
                    }
                    className="w-32"
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-4">
                <Button 
                  onClick={() => saveSettingsMutation.mutate(settings)}
                  disabled={saveSettingsMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {saveSettingsMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                      در حال ذخیره...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 ml-2" />
                      ذخیره تنظیمات
                    </>
                  )}
                </Button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">تست ارسال:</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => testNotificationMutation.mutate('email')}
                    disabled={!settings.emailEnabled || testNotificationMutation.isPending}
                  >
                    <Mail className="w-4 h-4 ml-1" />
                    ایمیل
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => testNotificationMutation.mutate('sms')}
                    disabled={!settings.smsEnabled || testNotificationMutation.isPending}
                  >
                    <MessageSquare className="w-4 h-4 ml-1" />
                    پیامک
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => testNotificationMutation.mutate('whatsapp')}
                    disabled={!settings.whatsappEnabled || testNotificationMutation.isPending}
                  >
                    <Phone className="w-4 h-4 ml-1" />
                    واتساپ
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recipients Tab */}
        <TabsContent value="recipients" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    گیرندگان اعلان موجودی
                  </CardTitle>
                  <CardDescription>
                    افرادی که هشدارهای موجودی کم را دریافت می‌کنند
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddRecipient(true)}>
                  <Plus className="w-4 h-4 ml-2" />
                  افزودن گیرنده
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {settings.recipients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Phone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>هیچ گیرنده‌ای تعریف نشده است</p>
                  <p className="text-sm">برای دریافت هشدارها، گیرندگان را اضافه کنید</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">نام</TableHead>
                      <TableHead className="text-right">ایمیل</TableHead>
                      <TableHead className="text-right">تلفن</TableHead>
                      <TableHead className="text-right">واتساپ</TableHead>
                      <TableHead className="text-center">دریافت ایمیل</TableHead>
                      <TableHead className="text-center">دریافت پیامک</TableHead>
                      <TableHead className="text-center">دریافت واتساپ</TableHead>
                      <TableHead className="text-center">وضعیت</TableHead>
                      <TableHead className="text-center">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settings.recipients.map((recipient) => (
                      <TableRow key={recipient.id}>
                        <TableCell className="font-medium">{recipient.name}</TableCell>
                        <TableCell>{recipient.email || '-'}</TableCell>
                        <TableCell dir="ltr">{recipient.phone || '-'}</TableCell>
                        <TableCell dir="ltr">{recipient.whatsappNumber || '-'}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={recipient.receiveEmail}
                            onCheckedChange={(checked) => 
                              updateRecipient(recipient.id, { receiveEmail: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={recipient.receiveSms}
                            onCheckedChange={(checked) => 
                              updateRecipient(recipient.id, { receiveSms: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={recipient.receiveWhatsapp}
                            onCheckedChange={(checked) => 
                              updateRecipient(recipient.id, { receiveWhatsapp: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={recipient.isActive}
                            onCheckedChange={(checked) => 
                              updateRecipient(recipient.id, { isActive: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => removeRecipient(recipient.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {settings.recipients.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button 
                    onClick={() => saveSettingsMutation.mutate(settings)}
                    disabled={saveSettingsMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {saveSettingsMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                        در حال ذخیره...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 ml-2" />
                        ذخیره تغییرات
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Product Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ویرایش تنظیمات موجودی</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">نام محصول</Label>
                <p className="font-medium">{editingProduct.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">کد کالا</Label>
                  <p>{editingProduct.sku || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">موجودی فعلی</Label>
                  <p className="font-bold text-lg">{editingProduct.stockQuantity || 0}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <div>
                  <Label htmlFor="minStock">حداقل موجودی</Label>
                  <Input
                    id="minStock"
                    type="number"
                    min={0}
                    value={editingProduct.minStockLevel || 0}
                    onChange={(e) => setEditingProduct({
                      ...editingProduct,
                      minStockLevel: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="maxStock">حداکثر موجودی</Label>
                  <Input
                    id="maxStock"
                    type="number"
                    min={0}
                    value={editingProduct.maxStockLevel || 0}
                    onChange={(e) => setEditingProduct({
                      ...editingProduct,
                      maxStockLevel: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="threshold">آستانه هشدار (برای اطلاع‌رسانی)</Label>
                  <Input
                    id="threshold"
                    type="number"
                    min={0}
                    value={editingProduct.lowStockThreshold || 0}
                    onChange={(e) => setEditingProduct({
                      ...editingProduct,
                      lowStockThreshold: parseInt(e.target.value) || 0
                    })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    وقتی موجودی به این عدد یا کمتر برسد، هشدار ارسال می‌شود
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  انصراف
                </Button>
                <Button 
                  onClick={() => updateProductMutation.mutate(editingProduct)}
                  disabled={updateProductMutation.isPending}
                >
                  {updateProductMutation.isPending ? 'در حال ذخیره...' : 'ذخیره'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Recipient Dialog */}
      <Dialog open={showAddRecipient} onOpenChange={setShowAddRecipient}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>افزودن گیرنده جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipientName">نام *</Label>
              <Input
                id="recipientName"
                value={newRecipient.name}
                onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                placeholder="نام گیرنده"
              />
            </div>
            <div>
              <Label htmlFor="recipientEmail">ایمیل</Label>
              <Input
                id="recipientEmail"
                type="email"
                value={newRecipient.email}
                onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label htmlFor="recipientPhone">شماره تلفن (برای پیامک)</Label>
              <Input
                id="recipientPhone"
                type="tel"
                value={newRecipient.phone}
                onChange={(e) => setNewRecipient({ ...newRecipient, phone: e.target.value })}
                placeholder="+964xxxxxxxxx"
                dir="ltr"
              />
            </div>
            <div>
              <Label htmlFor="recipientWhatsapp">شماره واتساپ</Label>
              <Input
                id="recipientWhatsapp"
                type="tel"
                value={newRecipient.whatsappNumber}
                onChange={(e) => setNewRecipient({ ...newRecipient, whatsappNumber: e.target.value })}
                placeholder="+964xxxxxxxxx"
                dir="ltr"
              />
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>دریافت ایمیل</Label>
                <Switch
                  checked={newRecipient.receiveEmail}
                  onCheckedChange={(checked) => 
                    setNewRecipient({ ...newRecipient, receiveEmail: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>دریافت پیامک</Label>
                <Switch
                  checked={newRecipient.receiveSms}
                  onCheckedChange={(checked) => 
                    setNewRecipient({ ...newRecipient, receiveSms: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>دریافت واتساپ</Label>
                <Switch
                  checked={newRecipient.receiveWhatsapp}
                  onCheckedChange={(checked) => 
                    setNewRecipient({ ...newRecipient, receiveWhatsapp: checked })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddRecipient(false)}>
                انصراف
              </Button>
              <Button onClick={addRecipient}>
                <Plus className="w-4 h-4 ml-2" />
                افزودن
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
