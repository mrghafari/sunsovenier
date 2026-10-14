import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Truck, Plus, Edit, Trash2 } from "lucide-react";

interface VehicleTemplate {
  id: number;
  name: string;
  nameEn: string | null;
  vehicleType: string;
  transportCategory:"standard"|"bulk";
  supportsContract?: boolean;
  supportsBulk?: boolean;
  maxWeightKg: string;
  maxVolumeM3: string | null;
  allowedRoutes: string[];
  basePrice: string;
  pricePerKm: string;
  pricePerKg: string;
  supportsHazardous: boolean;
  supportsFlammable: boolean;
  supportsRefrigerated: boolean;
  supportsFragile: boolean;
  averageSpeedKmh: string;
  fuelConsumptionL100km: string | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}



interface OptimalVehicleRequest {
  orderNumber: string;
  weightKg: number;
  volumeM3?: number;
  routeType: string;
  distanceKm: number;
  isHazardous?: boolean;
  isRefrigerated?: boolean;
  isFragile?: boolean;
  customerId?: number;
}

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

export default function VehicleOptimization() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleTemplate | null>(null);


  // Fetch vehicle templates
  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['/api/logistics/vehicle-templates']
  });



  // Create vehicle template mutation
  const createVehicleMutation = useMutation({
    mutationFn: (data: Partial<VehicleTemplate>) => 
      apiRequest('/api/logistics/vehicle-templates', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logistics/vehicle-templates'] });
      setIsCreateDialogOpen(false);
      toast({ title: "موفقیت", description: "الگوی خودرو ایجاد شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در ایجاد الگوی خودرو", variant: "destructive" });
    }
  });

  // Update vehicle template mutation
  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<VehicleTemplate> & { id: number }) => 
      apiRequest(`/api/logistics/vehicle-templates/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logistics/vehicle-templates'] });
      setEditingVehicle(null);
      toast({ title: "موفقیت", description: "الگوی خودرو بروزرسانی شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در بروزرسانی الگوی خودرو", variant: "destructive" });
    }
  });

  // Delete vehicle template mutation
  const deleteVehicleMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/logistics/vehicle-templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logistics/vehicle-templates'] });
      toast({ title: "موفقیت", description: "الگوی خودرو حذف شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در حذف الگوی خودرو", variant: "destructive" });
    }
  });



  const vehicles: VehicleTemplate[] = (vehiclesData as any)?.data || [];

  const handleCreateVehicle = (formData: FormData) => {
    const vehicleData = {
      name: formData.get('name') as string,
      nameEn: formData.get('nameEn') as string,
      vehicleType: formData.get('vehicleType') as string,
      transportCategory:(formData.get('transportCategory')==="bulk"?"bulk":"standard") as "bulk"|"standard",
      maxWeightKg: formData.get('maxWeightKg') as string,
      maxVolumeM3: formData.get('maxVolumeM3') as string || null,
      allowedRoutes: (formData.get('allowedRoutes') as string).split(',').map(r => r.trim()),
      basePrice: formData.get('basePrice') as string,
      pricePerKm: formData.get('pricePerKm') as string,
      pricePerKg: formData.get('pricePerKg') as string || "0",
      supportsHazardous: formData.get('supportsHazardous') === 'true',
      supportsRefrigerated: formData.get('supportsRefrigerated') === 'true',
      supportsFragile: formData.get('supportsFragile') !== 'false',
      supportsFlammable: formData.get('supportsFlammable') === 'true',
      supportsContract: formData.getAll('supportsContract').includes('true'),
      supportsBulk: formData.getAll('supportsBulk').includes('true'),
      averageSpeedKmh: formData.get('averageSpeedKmh') as string || "50",
      fuelConsumptionL100km: formData.get('fuelConsumptionL100km') as string || null,
      priority: parseInt(formData.get('priority') as string) || 0
    };
    createVehicleMutation.mutate(vehicleData);
  };



  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" />
            سیستم انتخاب بهینه وسیله نقلیه
          </h1>
          <p className="text-muted-foreground">مدیریت الگوهای خودرو و انتخاب بهینه بر اساس الگوریتم هزینه</p>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            مجوز حمل قراردادی مستقل از مناسب‌بودن برای حمل فله‌ای است؛ خودروهای واقعی را واحد لجستیک به الگوها اختصاص می‌دهد.
          </p>
        </div>
      </div>

      <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">الگوهای خودرو</h2>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 ml-2" />
                  افزودن الگوی جدید
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl" dir="rtl">
                <DialogHeader>
                  <DialogTitle>افزودن الگوی خودروی جدید</DialogTitle>
                  <DialogDescription>
                    اطلاعات الگوی خودرو را وارد کنید. مجوز حمل قراردادی مستقل از مناسب‌بودن برای حمل فله‌ای است؛ تخصیص خودروهای واقعی با واحد لجستیک است.
                  </DialogDescription>
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
                      <Select name="vehicleType" required>
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب نوع خودرو" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(VEHICLE_TYPES).map(([key, value]) => (
                            <SelectItem key={key} value={key}>{value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transportCategory">دستهٔ حمل</Label>
                      <select id="transportCategory" name="transportCategory" defaultValue="standard" className="w-full rounded border p-2">
                        <option value="standard">حمل عادی / بسته‌بندی‌شده</option><option value="bulk">حمل فله‌ای</option>
                      </select>
                      <div className="mt-3 space-y-3 rounded-md border p-3">
                        <div className="flex items-start gap-2">
                          <input type="hidden" name="supportsContract" value="false" />
                          <input type="checkbox" name="supportsContract" value="true" id="supportsContract" />
                          <div>
                            <Label htmlFor="supportsContract">مجاز برای حمل قراردادی</Label>
                            <p className="text-xs text-muted-foreground">این مجوز، دستهٔ حمل یا مناسب‌بودن برای حمل فله‌ای را تغییر نمی‌دهد.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <input type="hidden" name="supportsBulk" value="false" />
                          <input type="checkbox" name="supportsBulk" value="true" id="supportsBulk" />
                          <div>
                            <Label htmlFor="supportsBulk">مناسب برای حمل فله‌ای</Label>
                            <p className="text-xs text-muted-foreground">قابلیت مستقل از مجوز حمل قراردادی است.</p>
                          </div>
                        </div>
                      </div>
                      <Label htmlFor="maxWeightKg">حداکثر وزن (کیلوگرم) *</Label>
                      <Input id="maxWeightKg" name="maxWeightKg" type="number" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxVolumeM3">حداکثر حجم (متر مکعب)</Label>
                      <Input id="maxVolumeM3" name="maxVolumeM3" type="number" step="0.01" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="allowedRoutes">مسیرهای مجاز *</Label>
                      <Input id="allowedRoutes" name="allowedRoutes" placeholder="urban,interurban,highway" required />
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
                      <Label htmlFor="pricePerKg">قیمت هر کیلوگرم (دینار)</Label>
                      <Input id="pricePerKg" name="pricePerKg" type="number" defaultValue="0" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="averageSpeedKmh">سرعت متوسط (کیلومتر/ساعت)</Label>
                      <Input id="averageSpeedKmh" name="averageSpeedKmh" type="number" defaultValue="50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fuelConsumptionL100km">مصرف سوخت (لیتر/100کیلومتر)</Label>
                      <Input id="fuelConsumptionL100km" name="fuelConsumptionL100km" type="number" step="0.1" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">اولویت</Label>
                      <Input id="priority" name="priority" type="number" defaultValue="0" />
                    </div>
                    <div className="col-span-2 space-y-4">
                      <div className="flex items-center space-x-2">
                        <input type="hidden" name="supportsHazardous" value="false" />
                        <input type="checkbox" name="supportsHazardous" value="true" id="supportsHazardous" />
                        <Label htmlFor="supportsHazardous">پشتیبانی از مواد خطرناک</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="hidden" name="supportsRefrigerated" value="false" />
                        <input type="checkbox" name="supportsRefrigerated" value="true" id="supportsRefrigerated" />
                        <Label htmlFor="supportsRefrigerated">پشتیبانی از محصولات یخچالی</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="hidden" name="supportsFragile" value="false" />
                        <input type="checkbox" name="supportsFragile" value="true" id="supportsFragile" defaultChecked />
                        <Label htmlFor="supportsFragile">پشتیبانی از اقلام شکستنی</Label>
                      </div>
                      <div className="flex items-center space-x-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <input type="hidden" name="supportsFlammable" value="false" />
                        <input type="checkbox" name="supportsFlammable" value="true" id="supportsFlammable" />
                        <Label htmlFor="supportsFlammable" className="text-orange-800 font-medium">
                          🔥 مجوز حمل مواد آتش‌زا
                        </Label>
                        <span className="text-xs text-orange-600 mr-2">(ضروری برای ایمنی)</span>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>انصراف</Button>
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
                    <TableHead>قابلیت‌ها</TableHead>
                    <TableHead>حداکثر وزن</TableHead>
                    <TableHead>مسیرهای مجاز</TableHead>
                    <TableHead>قیمت پایه</TableHead>
                    <TableHead>مواد آتش‌زا</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehiclesLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center">در حال بارگذاری...</TableCell>
                    </TableRow>
                  ) : vehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center">هیچ الگوی خودرویی یافت نشد</TableCell>
                    </TableRow>
                  ) : (
                    vehicles.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{vehicle.name}</div>
                            {vehicle.nameEn && <div className="text-sm text-muted-foreground">{vehicle.nameEn}</div>}
                          </div>
                        </TableCell>
                        <TableCell>{VEHICLE_TYPES[vehicle.vehicleType as keyof typeof VEHICLE_TYPES]}<Badge className="ms-2" variant="outline">{vehicle.transportCategory==="bulk"?"فله‌ای":"عادی"}</Badge></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={(vehicle.supportsContract ?? (vehicle.transportCategory === "bulk")) ? "default" : "secondary"}>
                              {(vehicle.supportsContract ?? (vehicle.transportCategory === "bulk")) ? "قراردادی: مجاز" : "قراردادی: ندارد"}
                            </Badge>
                            <Badge variant={(vehicle.supportsBulk ?? (vehicle.transportCategory === "bulk")) ? "outline" : "secondary"}>
                              {(vehicle.supportsBulk ?? (vehicle.transportCategory === "bulk")) ? "فله‌ای: مناسب" : "فله‌ای: نامناسب"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{parseFloat(vehicle.maxWeightKg).toLocaleString()} kg</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {vehicle.allowedRoutes.map((route) => (
                              <Badge key={route} variant="secondary" className="text-xs">
                                {ROUTE_TYPES[route as keyof typeof ROUTE_TYPES] || route}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{parseFloat(vehicle.basePrice).toLocaleString()} IQD</TableCell>
                        <TableCell>
                          <Badge variant={vehicle.supportsFlammable ? "destructive" : "secondary"} className="text-xs">
                            {vehicle.supportsFlammable ? "🔥 مجاز" : "❌ غیرمجاز"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={vehicle.isActive ? "default" : "secondary"}>
                            {vehicle.isActive ? "فعال" : "غیرفعال"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setEditingVehicle(vehicle)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => deleteVehicleMutation.mutate(vehicle.id)}
                              disabled={deleteVehicleMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
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
          <Dialog open={!!editingVehicle} onOpenChange={() => setEditingVehicle(null)}>
            <DialogContent className="max-w-2xl" dir="rtl">
              <DialogHeader>
                <DialogTitle>ویرایش الگوی خودرو</DialogTitle>
                <DialogDescription>تغییرات مورد نظر را اعمال کنید</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                const formData = new FormData(e.currentTarget);
                const vehicleData = {
                  id: editingVehicle.id,
                  name: formData.get('name') as string,
                  nameEn: formData.get('nameEn') as string,
                  vehicleType: formData.get('vehicleType') as string,
                  transportCategory:(formData.get('transportCategory')==="bulk"?"bulk":"standard") as "bulk"|"standard",
                  supportsContract: formData.getAll('supportsContract').includes('true'),
                  supportsBulk: formData.getAll('supportsBulk').includes('true'),
                  maxWeightKg: formData.get('maxWeightKg') as string,
                  maxVolumeM3: formData.get('maxVolumeM3') as string || null,
                  allowedRoutes: (formData.get('allowedRoutes') as string).split(',').map(r => r.trim()),
                  basePrice: formData.get('basePrice') as string,
                  pricePerKm: formData.get('pricePerKm') as string,
                  pricePerKg: formData.get('pricePerKg') as string || "0",
                  supportsHazardous: formData.get('supportsHazardous') === 'true',
                  supportsRefrigerated: formData.get('supportsRefrigerated') === 'true',
                  supportsFragile: formData.get('supportsFragile') !== 'false',
                  supportsFlammable: formData.get('supportsFlammable') === 'true',
                  averageSpeedKmh: formData.get('averageSpeedKmh') as string || "50",
                  fuelConsumptionL100km: formData.get('fuelConsumptionL100km') as string || null,
                  isActive: formData.get('isActive') === 'true',
                  priority: parseInt(formData.get('priority') as string) || 0
                };
                updateVehicleMutation.mutate(vehicleData);
              }}>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">نام خودرو *</Label>
                    <Input id="edit-name" name="name" defaultValue={editingVehicle.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-nameEn">نام انگلیسی</Label>
                    <Input id="edit-nameEn" name="nameEn" defaultValue={editingVehicle.nameEn || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-vehicleType">نوع خودرو *</Label>
                    <Select name="vehicleType" defaultValue={editingVehicle.vehicleType}>
                      <SelectTrigger>
                        <SelectValue placeholder="انتخاب کنید" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="motorcycle">موتورسیکلت</SelectItem>
                        <SelectItem value="van">وانت</SelectItem>
                        <SelectItem value="light_truck">کامیون سبک</SelectItem>
                        <SelectItem value="heavy_truck">کامیون سنگین</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-transportCategory">دستهٔ حمل</Label>
                    <select id="edit-transportCategory" name="transportCategory" defaultValue={editingVehicle.transportCategory??"standard"} className="w-full rounded border p-2">
                      <option value="standard">حمل عادی / بسته‌بندی‌شده</option><option value="bulk">حمل فله‌ای</option>
                    </select>
                    <div className="mt-3 space-y-3 rounded-md border p-3">
                      <div className="flex items-start gap-2">
                        <input type="hidden" name="supportsContract" value="false" />
                        <input type="checkbox" name="supportsContract" value="true" id="edit-supportsContract" defaultChecked={editingVehicle.supportsContract ?? (editingVehicle.transportCategory === "bulk")} />
                        <div>
                          <Label htmlFor="edit-supportsContract">مجاز برای حمل قراردادی</Label>
                          <p className="text-xs text-muted-foreground">این مجوز، دستهٔ حمل یا مناسب‌بودن برای حمل فله‌ای را تغییر نمی‌دهد.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <input type="hidden" name="supportsBulk" value="false" />
                        <input type="checkbox" name="supportsBulk" value="true" id="edit-supportsBulk" defaultChecked={editingVehicle.supportsBulk ?? (editingVehicle.transportCategory === "bulk")} />
                        <div>
                          <Label htmlFor="edit-supportsBulk">مناسب برای حمل فله‌ای</Label>
                          <p className="text-xs text-muted-foreground">قابلیت مستقل از مجوز حمل قراردادی است.</p>
                        </div>
                      </div>
                    </div>
                    <Label htmlFor="edit-maxWeightKg">حداکثر وزن (کیلوگرم) *</Label>
                    <Input id="edit-maxWeightKg" name="maxWeightKg" type="number" defaultValue={editingVehicle.maxWeightKg} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-maxVolumeM3">حداکثر حجم (متر مکعب)</Label>
                    <Input id="edit-maxVolumeM3" name="maxVolumeM3" type="number" step="0.01" defaultValue={editingVehicle.maxVolumeM3 || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-allowedRoutes">مسیرهای مجاز *</Label>
                    <Input id="edit-allowedRoutes" name="allowedRoutes" 
                           defaultValue={editingVehicle.allowedRoutes.join(', ')} 
                           placeholder="urban, interurban, highway" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-basePrice">قیمت پایه (دینار عراقی) *</Label>
                    <Input id="edit-basePrice" name="basePrice" type="number" defaultValue={editingVehicle.basePrice} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-pricePerKm">قیمت هر کیلومتر (دینار) *</Label>
                    <Input id="edit-pricePerKm" name="pricePerKm" type="number" step="0.01" defaultValue={editingVehicle.pricePerKm} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-pricePerKg">قیمت هر کیلوگرم (دینار)</Label>
                    <Input id="edit-pricePerKg" name="pricePerKg" type="number" step="0.01" defaultValue={editingVehicle.pricePerKg} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-averageSpeedKmh">سرعت متوسط (کیلومتر/ساعت)</Label>
                    <Input id="edit-averageSpeedKmh" name="averageSpeedKmh" type="number" defaultValue={editingVehicle.averageSpeedKmh} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-fuelConsumptionL100km">مصرف سوخت (لیتر/100کیلومتر)</Label>
                    <Input id="edit-fuelConsumptionL100km" name="fuelConsumptionL100km" type="number" step="0.1" defaultValue={editingVehicle.fuelConsumptionL100km || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-priority">اولویت</Label>
                    <Input id="edit-priority" name="priority" type="number" defaultValue={editingVehicle.priority} />
                  </div>
                  <div className="col-span-2 space-y-4">
                    <div className="flex items-center space-x-2">
                      <input type="hidden" name="isActive" value="false" />
                      <input type="checkbox" name="isActive" value="true" id="edit-isActive" defaultChecked={editingVehicle.isActive} />
                      <Label htmlFor="edit-isActive">فعال</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="hidden" name="supportsHazardous" value="false" />
                      <input type="checkbox" name="supportsHazardous" value="true" id="edit-supportsHazardous" defaultChecked={editingVehicle.supportsHazardous} />
                      <Label htmlFor="edit-supportsHazardous">پشتیبانی از مواد خطرناک</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="hidden" name="supportsRefrigerated" value="false" />
                      <input type="checkbox" name="supportsRefrigerated" value="true" id="edit-supportsRefrigerated" defaultChecked={editingVehicle.supportsRefrigerated} />
                      <Label htmlFor="edit-supportsRefrigerated">پشتیبانی از محصولات یخچالی</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="hidden" name="supportsFragile" value="false" />
                      <input type="checkbox" name="supportsFragile" value="true" id="edit-supportsFragile" defaultChecked={editingVehicle.supportsFragile} />
                      <Label htmlFor="edit-supportsFragile">پشتیبانی از اقلام شکستنی</Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <input type="hidden" name="supportsFlammable" value="false" />
                      <input type="checkbox" name="supportsFlammable" value="true" id="edit-supportsFlammable" defaultChecked={editingVehicle.supportsFlammable} />
                      <Label htmlFor="edit-supportsFlammable" className="text-orange-800 font-medium">
                        🔥 مجوز حمل مواد آتش‌زا
                      </Label>
                      <span className="text-xs text-orange-600 mr-2">(ضروری برای ایمنی)</span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingVehicle(null)}>انصراف</Button>
                  <Button type="submit" disabled={updateVehicleMutation.isPending}>
                    {updateVehicleMutation.isPending ? "در حال بروزرسانی..." : "بروزرسانی الگو"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}