import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  Calculator, 
  Scale, 
  MapPin, 
  Truck, 
  DollarSign, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  Settings,
  Package,
  Shield,
  Zap,
  Wallet
} from 'lucide-react';

interface AdvancedShippingRate {
  id: number;
  zone: string;
  serviceType: string;
  weightFrom: string;
  weightTo: string;
  price: string;
  pricePerExtraKg: string;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ShippingFeeConfig {
  id: number;
  feeType: string;
  feeMode: string;
  feeValue: string;
  labelFa: string;
  labelEn: string;
  description: string;
  minValue: string | null;
  maxValue: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const ZONES = [
  { value: 'city', label: 'شهر (بغداد)', icon: '🏙️' },
  { value: 'province', label: 'استان', icon: '📍' },
  { value: 'country', label: 'کشوری', icon: '🗺️' },
  { value: 'international', label: 'بین‌المللی', icon: '🌍' }
];

const SERVICE_TYPES = [
  { value: 'normal', label: 'عادی', icon: '📦', color: 'bg-gray-100 text-gray-700' },
  { value: 'fast', label: 'سریع', icon: '🚀', color: 'bg-blue-100 text-blue-700' },
  { value: 'express', label: 'فوری', icon: '⚡', color: 'bg-orange-100 text-orange-700' }
];

const FEE_TYPES = [
  { value: 'cod', label: 'پرداخت در محل', icon: Wallet },
  { value: 'insurance', label: 'بیمه محموله', icon: Shield },
  { value: 'express_multiplier', label: 'ضریب ارسال فوری', icon: Zap }
];

const FEE_MODES = [
  { value: 'fixed', label: 'مقدار ثابت (IQD)' },
  { value: 'percentage', label: 'درصدی (%)' },
  { value: 'multiplier', label: 'ضریب (x)' }
];

export default function PostalShippingParamsTab() {
  const { toast } = useToast();
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);
  const [isFeeDialogOpen, setIsFeeDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<AdvancedShippingRate | null>(null);
  const [editingFee, setEditingFee] = useState<ShippingFeeConfig | null>(null);

  const [rateForm, setRateForm] = useState({
    zone: 'city',
    serviceType: 'normal',
    weightFrom: '0',
    weightTo: '5',
    price: '',
    pricePerExtraKg: '',
    estimatedDaysMin: 1,
    estimatedDaysMax: 3,
    isActive: true
  });

  const [feeForm, setFeeForm] = useState({
    feeType: 'cod',
    feeMode: 'fixed',
    feeValue: '',
    labelFa: '',
    labelEn: '',
    description: '',
    minValue: '',
    maxValue: '',
    isActive: true
  });

  const [generalSettings, setGeneralSettings] = useState({
    volumetric_divisor: '5000',
    shipping_base_country: 'عراق',
    shipping_base_city: '',
    shipping_base_province: ''
  });

  const countries = [
    { id: 1, name: 'عراق', nameEn: 'Iraq' },
    { id: 2, name: 'ایران', nameEn: 'Iran' }
  ];
  const [settingsChanged, setSettingsChanged] = useState(false);

  const { data: ratesResponse, isLoading: ratesLoading } = useQuery<{ success: boolean; data: AdvancedShippingRate[] }>({
    queryKey: ['/api/admin/shipping-rates']
  });
  const rates = ratesResponse?.data || [];

  const { data: feesResponse, isLoading: feesLoading } = useQuery<{ success: boolean; data: ShippingFeeConfig[] }>({
    queryKey: ['/api/admin/shipping-fees']
  });
  const fees = feesResponse?.data || [];

  interface Province {
    id: number;
    name: string;
    nameArabic: string;
    nameEnglish: string;
  }

  interface City {
    id: number;
    name: string;
    nameArabic: string;
    nameEnglish: string;
    provinceId: number;
  }

  const { data: provincesResponse } = useQuery<{ success: boolean; data: Province[] }>({
    queryKey: ['/api/iraqi-provinces']
  });
  const provinces = provincesResponse?.data || [];

  const { data: citiesResponse } = useQuery<{ success: boolean; data: City[] }>({
    queryKey: ['/api/iraqi-cities']
  });
  const cities = citiesResponse?.data || [];

  const selectedProvinceId = provinces.find(p => p.name === generalSettings.shipping_base_province)?.id;
  const filteredCities = selectedProvinceId 
    ? cities.filter(c => c.provinceId === selectedProvinceId)
    : cities;

  interface ShopSetting {
    setting_key: string;
    setting_value: string;
  }

  const { data: settingsResponse, isSuccess: settingsLoaded } = useQuery<{ success: boolean; data: ShopSetting[] }>({
    queryKey: ['/api/admin/shop-settings/shipping']
  });

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => 
      apiRequest(`/api/admin/shop-settings/${key}`, {
        method: 'PUT',
        body: { setting_value: value }
      })
  });

  const handleSaveSettings = async () => {
    const updates = Object.entries(generalSettings).map(([key, value]) => 
      updateSettingMutation.mutateAsync({ key, value })
    );
    try {
      await Promise.all(updates);
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/shop-settings/shipping'] });
      toast({ title: 'موفقیت', description: 'تنظیمات ذخیره شد' });
      setSettingsChanged(false);
    } catch (error) {
      toast({ title: 'خطا', description: 'خطا در ذخیره برخی تنظیمات', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (settingsLoaded && settingsResponse?.data && !settingsChanged) {
      const serverSettings: Record<string, string> = {
        volumetric_divisor: '5000',
        shipping_base_country: 'عراق',
        shipping_base_city: '',
        shipping_base_province: ''
      };
      settingsResponse.data.forEach((setting: ShopSetting) => {
        if (setting.setting_key in serverSettings) {
          serverSettings[setting.setting_key] = setting.setting_value;
        }
      });
      setGeneralSettings(serverSettings as typeof generalSettings);
    }
  }, [settingsLoaded, settingsResponse, settingsChanged]);

  const updateGeneralSetting = (key: keyof typeof generalSettings, value: string) => {
    setGeneralSettings(prev => ({ ...prev, [key]: value }));
    setSettingsChanged(true);
  };

  const createRateMutation = useMutation({
    mutationFn: (data: typeof rateForm) => apiRequest('/api/admin/shipping-rates', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shipping-rates'] });
      toast({ title: 'موفقیت', description: 'نرخ جدید ذخیره شد' });
      setIsRateDialogOpen(false);
      resetRateForm();
    },
    onError: () => {
      toast({ title: 'خطا', description: 'خطا در ذخیره نرخ', variant: 'destructive' });
    }
  });

  const updateRateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof rateForm }) => 
      apiRequest(`/api/admin/shipping-rates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shipping-rates'] });
      toast({ title: 'موفقیت', description: 'نرخ به‌روزرسانی شد' });
      setIsRateDialogOpen(false);
      resetRateForm();
    },
    onError: () => {
      toast({ title: 'خطا', description: 'خطا در به‌روزرسانی', variant: 'destructive' });
    }
  });

  const deleteRateMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/shipping-rates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shipping-rates'] });
      toast({ title: 'موفقیت', description: 'نرخ حذف شد' });
    }
  });

  const updateFeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof feeForm }) => 
      apiRequest(`/api/admin/shipping-fees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shipping-fees'] });
      toast({ title: 'موفقیت', description: 'تنظیمات هزینه به‌روزرسانی شد' });
      setIsFeeDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'خطا', description: 'خطا در به‌روزرسانی', variant: 'destructive' });
    }
  });

  const resetRateForm = () => {
    setRateForm({
      zone: 'city',
      serviceType: 'normal',
      weightFrom: '0',
      weightTo: '5',
      price: '',
      pricePerExtraKg: '',
      estimatedDaysMin: 1,
      estimatedDaysMax: 3,
      isActive: true
    });
    setEditingRate(null);
  };

  const handleEditRate = (rate: AdvancedShippingRate) => {
    setEditingRate(rate);
    setRateForm({
      zone: rate.zone,
      serviceType: rate.serviceType,
      weightFrom: rate.weightFrom,
      weightTo: rate.weightTo,
      price: rate.price,
      pricePerExtraKg: rate.pricePerExtraKg,
      estimatedDaysMin: rate.estimatedDaysMin,
      estimatedDaysMax: rate.estimatedDaysMax,
      isActive: rate.isActive
    });
    setIsRateDialogOpen(true);
  };

  const handleEditFee = (fee: ShippingFeeConfig) => {
    setEditingFee(fee);
    setFeeForm({
      feeType: fee.feeType,
      feeMode: fee.feeMode,
      feeValue: fee.feeValue,
      labelFa: fee.labelFa,
      labelEn: fee.labelEn,
      description: fee.description,
      minValue: fee.minValue || '',
      maxValue: fee.maxValue || '',
      isActive: fee.isActive
    });
    setIsFeeDialogOpen(true);
  };

  const handleRateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRate) {
      updateRateMutation.mutate({ id: editingRate.id, data: rateForm });
    } else {
      createRateMutation.mutate(rateForm);
    }
  };

  const handleFeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFee) {
      updateFeeMutation.mutate({ id: editingFee.id, data: feeForm });
    }
  };

  const groupedRates = rates.reduce((acc, rate) => {
    if (!acc[rate.zone]) acc[rate.zone] = [];
    acc[rate.zone].push(rate);
    return acc;
  }, {} as Record<string, AdvancedShippingRate[]>);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">پارامترهای محاسبات سرویس پستی</h2>
          <p className="text-muted-foreground">مدیریت تمام فاکتورهای دخیل در محاسبه هزینه ارسال</p>
        </div>
      </div>

      <Tabs defaultValue="rates" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="rates" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            نرخ‌های منطقه‌ای
          </TabsTrigger>
          <TabsTrigger value="fees" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            هزینه‌های جانبی
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            تنظیمات عمومی
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  نرخ‌های حمل بر اساس منطقه و سرویس
                </CardTitle>
                <CardDescription>
                  قیمت‌گذاری بر اساس: منطقه مقصد × نوع سرویس × محدوده وزن
                </CardDescription>
              </div>
              <Dialog open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetRateForm} data-testid="btn-add-rate">
                    <Plus className="h-4 w-4 ml-2" />
                    افزودن نرخ جدید
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingRate ? 'ویرایش نرخ' : 'افزودن نرخ جدید'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleRateSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>منطقه</Label>
                        <Select value={rateForm.zone} onValueChange={(v) => setRateForm({...rateForm, zone: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ZONES.map(z => (
                              <SelectItem key={z.value} value={z.value}>
                                {z.icon} {z.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>نوع سرویس</Label>
                        <Select value={rateForm.serviceType} onValueChange={(v) => setRateForm({...rateForm, serviceType: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SERVICE_TYPES.map(s => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.icon} {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>وزن از (کیلوگرم)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={rateForm.weightFrom}
                          onChange={(e) => setRateForm({...rateForm, weightFrom: e.target.value})}
                          data-testid="input-weight-from"
                        />
                      </div>
                      <div>
                        <Label>وزن تا (کیلوگرم)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={rateForm.weightTo}
                          onChange={(e) => setRateForm({...rateForm, weightTo: e.target.value})}
                          data-testid="input-weight-to"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>قیمت پایه (IQD)</Label>
                        <Input
                          type="number"
                          value={rateForm.price}
                          onChange={(e) => setRateForm({...rateForm, price: e.target.value})}
                          placeholder="مثال: 15000"
                          required
                          data-testid="input-base-price"
                        />
                      </div>
                      <div>
                        <Label>قیمت هر کیلو اضافی (IQD)</Label>
                        <Input
                          type="number"
                          value={rateForm.pricePerExtraKg}
                          onChange={(e) => setRateForm({...rateForm, pricePerExtraKg: e.target.value})}
                          placeholder="مثال: 1000"
                          data-testid="input-price-per-kg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>حداقل روز تحویل</Label>
                        <Input
                          type="number"
                          value={rateForm.estimatedDaysMin}
                          onChange={(e) => setRateForm({...rateForm, estimatedDaysMin: parseInt(e.target.value)})}
                          data-testid="input-days-min"
                        />
                      </div>
                      <div>
                        <Label>حداکثر روز تحویل</Label>
                        <Input
                          type="number"
                          value={rateForm.estimatedDaysMax}
                          onChange={(e) => setRateForm({...rateForm, estimatedDaysMax: parseInt(e.target.value)})}
                          data-testid="input-days-max"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rateForm.isActive}
                        onCheckedChange={(v) => setRateForm({...rateForm, isActive: v})}
                        data-testid="switch-rate-active"
                      />
                      <Label>فعال</Label>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" disabled={createRateMutation.isPending || updateRateMutation.isPending} data-testid="btn-save-rate">
                        {editingRate ? 'ذخیره تغییرات' : 'افزودن'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsRateDialogOpen(false)}>
                        انصراف
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {ratesLoading ? (
                <div className="text-center py-8 text-muted-foreground">در حال بارگذاری...</div>
              ) : (
                <div className="space-y-6">
                  {ZONES.map(zone => {
                    const zoneRates = groupedRates[zone.value] || [];
                    return (
                      <div key={zone.value} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                          <span className="text-2xl">{zone.icon}</span>
                          {zone.label}
                          <Badge variant="secondary">{zoneRates.length} نرخ</Badge>
                        </h3>
                        {zoneRates.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>سرویس</TableHead>
                                <TableHead>محدوده وزن</TableHead>
                                <TableHead>قیمت پایه</TableHead>
                                <TableHead>هر کیلو اضافی</TableHead>
                                <TableHead>زمان تحویل</TableHead>
                                <TableHead>وضعیت</TableHead>
                                <TableHead>عملیات</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {zoneRates.map(rate => {
                                const svc = SERVICE_TYPES.find(s => s.value === rate.serviceType);
                                return (
                                  <TableRow key={rate.id}>
                                    <TableCell>
                                      <Badge className={svc?.color}>
                                        {svc?.icon} {svc?.label}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{rate.weightFrom} - {rate.weightTo} kg</TableCell>
                                    <TableCell className="font-medium">
                                      {parseFloat(rate.price).toLocaleString()} IQD
                                    </TableCell>
                                    <TableCell>
                                      {parseFloat(rate.pricePerExtraKg).toLocaleString()} IQD
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        {rate.estimatedDaysMin}-{rate.estimatedDaysMax} روز
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={rate.isActive ? 'default' : 'secondary'}>
                                        {rate.isActive ? 'فعال' : 'غیرفعال'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button size="sm" variant="ghost" onClick={() => handleEditRate(rate)} data-testid={`btn-edit-rate-${rate.id}`}>
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="ghost" 
                                          onClick={() => deleteRateMutation.mutate(rate.id)}
                                          disabled={deleteRateMutation.isPending}
                                          data-testid={`btn-delete-rate-${rate.id}`}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-muted-foreground text-center py-4">
                            نرخی برای این منطقه تعریف نشده
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                تنظیمات هزینه‌های جانبی
              </CardTitle>
              <CardDescription>
                مدیریت هزینه‌های اضافی مانند پرداخت در محل، بیمه و ضریب ارسال فوری
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feesLoading ? (
                <div className="text-center py-8 text-muted-foreground">در حال بارگذاری...</div>
              ) : (
                <div className="grid gap-4">
                  {fees.map(fee => {
                    const feeType = FEE_TYPES.find(f => f.value === fee.feeType);
                    const FeeIcon = feeType?.icon || DollarSign;
                    return (
                      <div key={fee.id} className="border rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full ${fee.isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                            <FeeIcon className={`h-6 w-6 ${fee.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <h4 className="font-semibold">{fee.labelFa}</h4>
                            <p className="text-sm text-muted-foreground">{fee.description}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline">
                                {fee.feeMode === 'fixed' && `${parseFloat(fee.feeValue).toLocaleString()} IQD`}
                                {fee.feeMode === 'percentage' && `${fee.feeValue}%`}
                                {fee.feeMode === 'multiplier' && `${fee.feeValue}x`}
                              </Badge>
                              {fee.minValue && (
                                <Badge variant="secondary">
                                  حداقل: {parseFloat(fee.minValue).toLocaleString()} IQD
                                </Badge>
                              )}
                              {fee.maxValue && (
                                <Badge variant="secondary">
                                  حداکثر: {parseFloat(fee.maxValue).toLocaleString()} IQD
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={fee.isActive ? 'default' : 'secondary'}>
                            {fee.isActive ? 'فعال' : 'غیرفعال'}
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => handleEditFee(fee)} data-testid={`btn-edit-fee-${fee.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={isFeeDialogOpen} onOpenChange={setIsFeeDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>ویرایش هزینه</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleFeeSubmit} className="space-y-4">
                <div>
                  <Label>عنوان فارسی</Label>
                  <Input
                    value={feeForm.labelFa}
                    onChange={(e) => setFeeForm({...feeForm, labelFa: e.target.value})}
                    data-testid="input-fee-label-fa"
                  />
                </div>
                <div>
                  <Label>عنوان انگلیسی</Label>
                  <Input
                    value={feeForm.labelEn}
                    onChange={(e) => setFeeForm({...feeForm, labelEn: e.target.value})}
                    data-testid="input-fee-label-en"
                  />
                </div>
                <div>
                  <Label>نوع محاسبه</Label>
                  <Select value={feeForm.feeMode} onValueChange={(v) => setFeeForm({...feeForm, feeMode: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FEE_MODES.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>
                    مقدار 
                    {feeForm.feeMode === 'fixed' && ' (IQD)'}
                    {feeForm.feeMode === 'percentage' && ' (%)'}
                    {feeForm.feeMode === 'multiplier' && ' (x)'}
                  </Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={feeForm.feeValue}
                    onChange={(e) => setFeeForm({...feeForm, feeValue: e.target.value})}
                    data-testid="input-fee-value"
                  />
                </div>
                {feeForm.feeMode === 'percentage' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>حداقل (IQD)</Label>
                      <Input
                        type="number"
                        value={feeForm.minValue}
                        onChange={(e) => setFeeForm({...feeForm, minValue: e.target.value})}
                        data-testid="input-fee-min"
                      />
                    </div>
                    <div>
                      <Label>حداکثر (IQD)</Label>
                      <Input
                        type="number"
                        value={feeForm.maxValue}
                        onChange={(e) => setFeeForm({...feeForm, maxValue: e.target.value})}
                        data-testid="input-fee-max"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <Label>توضیحات</Label>
                  <Input
                    value={feeForm.description}
                    onChange={(e) => setFeeForm({...feeForm, description: e.target.value})}
                    data-testid="input-fee-description"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={feeForm.isActive}
                    onCheckedChange={(v) => setFeeForm({...feeForm, isActive: v})}
                    data-testid="switch-fee-active"
                  />
                  <Label>فعال</Label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={updateFeeMutation.isPending} data-testid="btn-save-fee">
                    ذخیره تغییرات
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsFeeDialogOpen(false)}>
                    انصراف
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  تنظیمات عمومی محاسبات
                </CardTitle>
                <CardDescription>
                  پارامترهای پایه برای محاسبه وزن و هزینه
                </CardDescription>
              </div>
              {settingsChanged && (
                <Button onClick={handleSaveSettings} disabled={updateSettingMutation.isPending} data-testid="btn-save-settings">
                  ذخیره تغییرات
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Package className="h-6 w-6 text-primary" />
                    <h4 className="font-semibold">محاسبه وزن حجمی</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    وزن حجمی = (طول × عرض × ارتفاع) ÷ ضریب تقسیم
                  </p>
                  <div className="space-y-2">
                    <Label>ضریب تقسیم (Volumetric Divisor)</Label>
                    <Input
                      type="number"
                      value={generalSettings.volumetric_divisor}
                      onChange={(e) => updateGeneralSetting('volumetric_divisor', e.target.value)}
                      className="max-w-32"
                      data-testid="input-volumetric-divisor"
                    />
                    <p className="text-xs text-muted-foreground">
                      استاندارد صنعت: 5000 (ابعاد به سانتی‌متر)
                    </p>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <MapPin className="h-6 w-6 text-primary" />
                    <h4 className="font-semibold">مبدا ارسال</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    کشور، استان و شهر پایه برای محاسبه منطقه
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>کشور مبدا</Label>
                      <Select
                        value={generalSettings.shipping_base_country}
                        onValueChange={(value) => {
                          updateGeneralSetting('shipping_base_country', value);
                          updateGeneralSetting('shipping_base_province', '');
                          updateGeneralSetting('shipping_base_city', '');
                        }}
                      >
                        <SelectTrigger className="max-w-64" data-testid="select-base-country">
                          <SelectValue placeholder="انتخاب کشور" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.id} value={country.name}>
                              {country.name} ({country.nameEn})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>استان مبدا</Label>
                      <Select
                        value={generalSettings.shipping_base_province}
                        onValueChange={(value) => {
                          updateGeneralSetting('shipping_base_province', value);
                          updateGeneralSetting('shipping_base_city', '');
                        }}
                        disabled={generalSettings.shipping_base_country !== 'عراق'}
                      >
                        <SelectTrigger className="max-w-64" data-testid="select-base-province">
                          <SelectValue placeholder={generalSettings.shipping_base_country === 'عراق' ? 'انتخاب استان' : 'استان‌ها فقط برای عراق'} />
                        </SelectTrigger>
                        <SelectContent>
                          {provinces.map((province) => (
                            <SelectItem key={province.id} value={province.name}>
                              {province.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>شهر مبدا</Label>
                      <Select
                        value={generalSettings.shipping_base_city}
                        onValueChange={(value) => updateGeneralSetting('shipping_base_city', value)}
                        disabled={!generalSettings.shipping_base_province || generalSettings.shipping_base_country !== 'عراق'}
                      >
                        <SelectTrigger className="max-w-64" data-testid="select-base-city">
                          <SelectValue placeholder={generalSettings.shipping_base_country === 'عراق' ? 'انتخاب شهر' : 'شهرها فقط برای عراق'} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredCities.map((city) => (
                            <SelectItem key={city.id} value={city.name}>
                              {city.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Truck className="h-6 w-6 text-primary" />
                  <h4 className="font-semibold">منطق انتخاب وزن قابل شارژ</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  وزن قابل شارژ = MAX(وزن واقعی, وزن حجمی)
                </p>
                <div className="bg-muted p-3 rounded text-sm font-mono">
                  chargeableWeight = Math.max(realWeight, volumetricWeight)
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-3 mb-4">
                  <Calculator className="h-6 w-6 text-blue-600" />
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">فرمول کلی محاسبه</h4>
                </div>
                <div className="text-sm space-y-2 text-blue-800 dark:text-blue-200">
                  <p><strong>هزینه کل = </strong></p>
                  <p className="pr-4">قیمت پایه (بر اساس منطقه + سرویس + محدوده وزن)</p>
                  <p className="pr-4">+ (وزن اضافی × قیمت هر کیلو اضافی)</p>
                  <p className="pr-4">× ضریب ارسال فوری (اگر انتخاب شده)</p>
                  <p className="pr-4">+ هزینه پرداخت در محل (اگر انتخاب شده)</p>
                  <p className="pr-4">+ هزینه بیمه (اگر انتخاب شده)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
