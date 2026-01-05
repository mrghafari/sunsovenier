import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Truck, 
  Package, 
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Mail,
  CreditCard,
  Car
} from 'lucide-react';

interface DeliveryMethod {
  id: number;
  value: string;
  label: string;
  icon: string;
  color: string;
  baseCost: string;
  estimatedDays: number;
  isActive: boolean;
  description: string | null;
}

const DeliveryServicesTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deliveryMethodsData, isLoading, isError, error } = useQuery<DeliveryMethod[]>({
    queryKey: ['/api/logistics/delivery-methods'],
    retry: false,
  });

  const deliveryMethods = Array.isArray(deliveryMethodsData) ? deliveryMethodsData : [];

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ method, isActive }: { method: DeliveryMethod; isActive: boolean }) => {
      const response = await fetch(`/api/logistics/delivery-methods/${method.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          value: method.value,
          label: method.label,
          icon: method.icon,
          color: method.color,
          isActive 
        })
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logistics/delivery-methods'] });
      toast({ title: "موفق", description: "وضعیت سرویس بروزرسانی شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در بروزرسانی وضعیت", variant: "destructive" });
    }
  });

  const getIconComponent = (iconName: string, value: string) => {
    if (value.includes('postal') || value.includes('post')) return <Mail className="h-6 w-6" />;
    if (value.includes('vehicle') || value.includes('smart')) return <Car className="h-6 w-6" />;
    if (value.includes('cod') || value.includes('freight') || value.includes('collect')) return <CreditCard className="h-6 w-6" />;
    if (value.includes('truck')) return <Truck className="h-6 w-6" />;
    return <Package className="h-6 w-6" />;
  };

  const getColorClass = (color: string, isActive: boolean) => {
    if (!isActive) return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
      green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
      orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200',
      purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
      red: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
    };
    return colors[color] || colors.blue;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-12 text-center">
        <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-medium mb-2">خطا در بارگذاری</h3>
        <p className="text-muted-foreground">
          لطفاً مجدداً وارد سیستم شوید
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950 p-6 rounded-xl border-2 border-indigo-200 dark:border-indigo-800" dir="rtl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-indigo-800 dark:text-indigo-200">مدیریت سرویس‌های ارسال</h2>
        <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">
          روش‌های ارسال فعال در صفحه پرداخت نمایش داده می‌شوند
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {deliveryMethods.map((method) => (
          <Card 
            key={method.id} 
            className={`transition-all bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm ${method.isActive ? 'border-green-500 shadow-lg ring-2 ring-green-200 dark:ring-green-800' : 'border-gray-300 opacity-70'}`}
            data-testid={`card-delivery-${method.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${getColorClass(method.color, method.isActive)}`}>
                    {getIconComponent(method.icon, method.value)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{method.label}</h3>
                    {method.estimatedDays > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {method.estimatedDays} روز
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <Switch
                    checked={method.isActive}
                    onCheckedChange={(checked) => toggleActiveMutation.mutate({ method, isActive: checked })}
                    disabled={toggleActiveMutation.isPending}
                    data-testid={`switch-${method.id}`}
                  />
                  {method.isActive ? (
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      <CheckCircle className="h-3 w-3 ml-1" />
                      فعال
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500 text-xs">
                      <XCircle className="h-3 w-3 ml-1" />
                      غیرفعال
                    </Badge>
                  )}
                </div>
              </div>
              
              {method.description && (
                <p className="text-sm text-muted-foreground mt-3 border-t pt-3">
                  {method.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {deliveryMethods.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">هیچ سرویس ارسالی تعریف نشده</h3>
          <p className="text-muted-foreground">
            سرویس‌های ارسال در سیستم موجود نیست
          </p>
        </Card>
      )}
    </div>
  );
};

export default DeliveryServicesTab;
