import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { MapPin, Globe, X, ShoppingCart, Plus, Minus, Trash2, Wallet, CreditCard, Upload, Clock, Flame, Move } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatIQDAmount, displayCurrencyAmountWithSymbol } from "@/lib/currency-utils";

// Language types
type Language = 'en' | 'ar';

// Translation system
const translations = {
  en: {
    // Form titles
    purchaseOrder: "Purchase Order",
    enterDetails: "Enter your details",
    customerName: "Customer Name",
    deliveryPhone: "Delivery Phone Number",
    deliveryAddress: "Delivery Address",
    province: "Province",
    city: "City",
    postalCode: "Postal Code (Optional)",
    selectProvince: "Select Province",
    selectCity: "Select City",
    selectProvinceFirst: "Select province first",
    cityNotRegistered: "City not registered",
    gpsLocation: "GPS Location",
    findLocation: "Find My Location",
    orderNotes: "Order Notes",
    submitOrder: "Submit Order",
    cancel: "Cancel",
    loading: "Loading...",
    
    // Cart management
    cartManagement: "Cart Management",
    each: "each",
    subtotal: "Subtotal:",
    totalAmount: "Total Amount",
    removeItem: "Remove item",
    decreaseQuantity: "Decrease quantity",
    increaseQuantity: "Increase quantity",
    
    // Validation messages
    nameRequired: "Customer name is required",
    phoneRequired: "Phone number is required",
    addressRequired: "Complete delivery address is required",
    cityRequired: "City is required",
    
    // Placeholders
    namePlaceholder: "e.g. Ahmad Ali",
    phonePlaceholder: "Enter phone number",
    addressPlaceholder: "Enter complete address for delivery",
    cityPlaceholder: "Enter city name",
    postalCodePlaceholder: "Optional",
    notesPlaceholder: "Additional notes for the order",
    
    // Status messages
    locationFound: "Location found successfully",
    locationError: "Could not get location. Please enter manually.",
    orderSubmitted: "Order submitted successfully",
    orderError: "Failed to submit order",
    
    // Language switcher
    switchLanguage: "العربية",
    language: "Language",
    
    // Payment options
    paymentMethod: "Payment Method",
    walletPayment: "Pay from Wallet",
    traditionalPayment: "Traditional Payment",
    walletBalance: "Wallet Balance",
    useWalletFull: "Pay full amount from wallet",
    useWalletPartial: "Pay partial amount from wallet",
    walletAmount: "Amount from wallet",
    remainingAmount: "Remaining amount",
    insufficientWallet: "Insufficient wallet balance",
    discountApplied: "Discount Applied",
    bankTransferGrace: "Bank Transfer with Grace Period",
    bankTransferWithDays: "Bank Transfer with {days}-day Grace Period",
    
    // Shipping options
    deliveryMethod: "Delivery Method",
    selectDeliveryMethod: "Select delivery method",
    shippingCost: "Shipping Cost",
    freeShipping: "Free Shipping",
    
    // Second address and recipient mobile options
    secondDeliveryAddress: "Second Delivery Address",
    addSecondAddress: "Add Second Address",
    removeSecondAddress: "Remove Second Address",
    secondAddressPlaceholder: "Enter different delivery address...",
    secondAddressInstruction: "If delivery address differs from above, please enter new address",
    recipientMobileNumber: "Recipient Mobile Number",
    addRecipientMobile: "Add Recipient Mobile",
    removeRecipientMobile: "Remove Recipient Mobile",
    recipientMobilePlaceholder: "Enter recipient's mobile number...",
    recipientMobileInstruction: "If recipient is different person, enter their mobile number",
    crmAddressDisabled: "Default Address (Disabled)",
    crmPhoneDisabled: "Default Phone (Disabled)",
    defaultDeliveryAddress: "Default Delivery Address",
    
    // Toast messages for payment redirect
    redirectingToFIB: "Redirecting to FIB",
    redirectingToFIBDesc: "Redirecting you to FIB payment system...",
    redirectingToBank: "Redirecting to Bank Gateway",
    redirectingToBankDesc: "Redirecting you to bank payment gateway...",
    orderRegistered: "Order Registered",
    orderFullyPaidWallet: "Your order has been successfully registered and fully paid from your wallet. Order number:",
    walletPaymentSuccess: "✅ Wallet Payment Successful",
    orderFullyPaidAmount: "Your order for the amount of {amount} has been fully paid from your wallet",
    onlinePaymentDisabled: "Online Payment Disabled",
    bankGatewayUnavailable: "Bank gateway is currently unavailable. Please choose another payment method.",
    redirectingToPaymentGateway: "Redirecting to Payment Gateway",
    redirectingToPaymentDesc: "Redirecting you to payment gateway...",
    orderAndReceiptRegistered: "✅ Order and Bank Receipt Registered",
    orderReceiptSuccess: "Your order with bank receipt has been successfully registered",
    pleaseUploadReceipt: "Please upload your bank transfer receipt",
    
    // Shipping and vehicle selection
    shipmentWeight: "Shipment Weight:",
    kilogram: "kg",
    subtotalWithoutShipping: "Subtotal (Without Shipping)",
    smartVehicleSelection: "Smart Vehicle Selection - Automatic Best Option Calculation",
    smartVehicleLabel: "Smart Vehicle Selection:",
    smartVehicleDescription: "System selects the best vehicle based on weight, destination, and lowest cost",
    selectedVehicle: "Selected Vehicle:",
    basePrice: "Base Price:",
    distanceCost: "Distance Cost:",
    smartShippingCost: "Smart Shipping Cost",
    useWallet: "Use Wallet (Maximum",
    amountFromWallet: "Amount from Wallet (Maximum",
    walletPaymentAmount: "Wallet Payment Amount",
    walletLimit: "Wallet Limit",
    bankCardPayment: "Bank Card Payment",
    selfPickup: "Self Pickup - Free",
    selfPickupLabel: "Self Pickup:",
    free: "Free",
    calculating: "Calculating...",
    waitingForAddress: "Waiting for destination address...",
    selfPickupDescription: "You will pick up the goods yourself from the company location - no shipping costs",
    vehicles: "vehicles",
    vehicleBreakdown: "Breakdown of selected vehicles:",
    vehicle: "Vehicle",
    totalLoadWeight: "Total load weight:",
    totalCost: "Total cost:",

  },
  ar: {
    // Form titles
    purchaseOrder: "طلب شراء",
    enterDetails: "أدخل تفاصيلك",
    customerName: "اسم العميل",
    deliveryPhone: "رقم هاتف التوصيل",
    deliveryAddress: "عنوان التوصيل",
    province: "المحافظة",
    city: "المدينة",
    postalCode: "الرمز البريدي (اختياري)",
    selectProvince: "اختر المحافظة",
    selectCity: "اختر المدينة",
    selectProvinceFirst: "اختر المحافظة أولاً",
    cityNotRegistered: "المدينة غير مسجلة",
    gpsLocation: "الموقع الجغرافي",
    findLocation: "العثور على موقعي",
    orderNotes: "ملاحظات الطلب",
    submitOrder: "إرسال الطلب",
    cancel: "إلغاء",
    loading: "جارٍ التحميل...",
    
    // Validation messages
    nameRequired: "اسم العميل مطلوب",
    phoneRequired: "رقم الهاتف مطلوب",
    addressRequired: "العنوان الكامل للتوصيل مطلوب",
    cityRequired: "المدينة مطلوبة",
    
    // Placeholders
    namePlaceholder: "مثل: أحمد علي",
    phonePlaceholder: "أدخل رقم الهاتف",
    addressPlaceholder: "أدخل العنوان الكامل للتوصيل",
    cityPlaceholder: "أدخل اسم المدينة",
    postalCodePlaceholder: "اختياري",
    notesPlaceholder: "ملاحظات إضافية للطلب",
    
    // Status messages
    locationFound: "تم العثور على الموقع بنجاح",
    locationError: "لا يمكن الحصول على الموقع. يرجى الإدخال يدوياً.",
    orderSubmitted: "تم إرسال الطلب بنجاح",
    orderError: "فشل في إرسال الطلب",
    
    // Language switcher
    switchLanguage: "English",
    language: "اللغة",
    
    // Cart management
    cartManagement: "إدارة السلة",
    each: "للوحدة",
    subtotal: "المجموع الفرعي:",
    totalAmount: "المبلغ الإجمالي",
    removeItem: "حذف العنصر",
    decreaseQuantity: "تقليل الكمية",
    increaseQuantity: "زيادة الكمية",
    
    // Payment options
    paymentMethod: "طريقة الدفع",
    walletPayment: "الدفع من المحفظة",
    traditionalPayment: "الدفع التقليدي",
    walletBalance: "رصيد المحفظة",
    useWalletFull: "دفع المبلغ كاملاً من المحفظة",
    useWalletPartial: "دفع مبلغ جزئي من المحفظة",
    walletAmount: "المبلغ من المحفظة",
    remainingAmount: "المبلغ المتبقي",
    insufficientWallet: "رصيد المحفظة غير كافي",
    discountApplied: "تم تطبيق الخصم",
    bankTransferGrace: "حوالة بنكية مع مهلة",
    bankTransferWithDays: "حوالة بنكية مع مهلة {days} يوم",
    
    // Shipping options
    deliveryMethod: "طريقة التوصيل",
    selectDeliveryMethod: "اختر طريقة التوصيل",
    shippingCost: "تكلفة الشحن",
    freeShipping: "شحن مجاني",
    
    // Second address and recipient mobile options
    secondDeliveryAddress: "عنوان التسليم الثاني",
    addSecondAddress: "إضافة عنوان ثاني",
    removeSecondAddress: "إزالة العنوان الثاني", 
    secondAddressPlaceholder: "عنوان بديل للتسليم (مثل: بغداد، شارع الرشيد)",
    secondAddressInstruction: "إذا كان عنوان استلام البضائع مختلفًا عن العنوان أعلاه، يرجى إدخال العنوان الجديد",
    recipientMobileNumber: "رقم موبايل المستلم",
    addRecipientMobile: "إضافة رقم المستلم",
    removeRecipientMobile: "إزالة رقم المستلم",
    recipientMobilePlaceholder: "رقم موبايل المستلم لتأكيد التسليم (مثل: 0791XXXXXXX)",
    recipientMobileInstruction: "إذا كان مستلم البضائع شخصًا آخر، يرجى إدخال رقم موبايله",
    crmAddressDisabled: "العنوان الافتراضي (معطل)",
    crmPhoneDisabled: "الهاتف الافتراضي (معطل)",
    defaultDeliveryAddress: "عنوان التسليم الافتراضي",
    
    // Toast messages for payment redirect
    redirectingToFIB: "الانتقال إلى FIB",
    redirectingToFIBDesc: "جارٍ نقلك إلى نظام الدفع FIB...",
    redirectingToBank: "الانتقال إلى بوابة البنك",
    redirectingToBankDesc: "جارٍ نقلك إلى بوابة الدفع البنكية...",
    orderRegistered: "تم تسجيل الطلب",
    orderFullyPaidWallet: "تم تسجيل طلبك بنجاح ودفعه بالكامل من محفظتك الرقمية. رقم الطلب:",
    walletPaymentSuccess: "✅ الدفع من المحفظة ناجح",
    orderFullyPaidAmount: "تم دفع طلبك بمبلغ {amount} بالكامل من محفظتك الرقمية",
    onlinePaymentDisabled: "الدفع عبر الإنترنت معطل",
    bankGatewayUnavailable: "بوابة البنك غير متاحة حاليًا. يرجى اختيار طريقة دفع أخرى.",
    redirectingToPaymentGateway: "الانتقال إلى بوابة الدفع",
    redirectingToPaymentDesc: "جارٍ نقلك إلى بوابة الدفع...",
    orderAndReceiptRegistered: "✅ تم تسجيل الطلب والإيصال البنكي",
    orderReceiptSuccess: "تم تسجيل طلبك مع الإيصال البنكي بنجاح",
    pleaseUploadReceipt: "يرجى تحميل إيصال التحويل البنكي",
    
    // Shipping and vehicle selection
    shipmentWeight: "وزن الشحنة:",
    kilogram: "كجم",
    subtotalWithoutShipping: "المجموع (بدون تكلفة الشحن)",
    smartVehicleSelection: "اختيار المركبة الذكي - حساب تلقائي لأفضل خيار",
    smartVehicleLabel: "اختيار المركبة الذكي:",
    smartVehicleDescription: "يختار النظام أفضل مركبة بناءً على الوزن والوجهة وأقل تكلفة",
    selectedVehicle: "المركبة المختارة:",
    basePrice: "السعر الأساسي:",
    distanceCost: "تكلفة المسافة:",
    smartShippingCost: "تكلفة الشحن الذكي",
    useWallet: "استخدام المحفظة (الحد الأقصى",
    amountFromWallet: "المبلغ من المحفظة (الحد الأقصى",
    walletPaymentAmount: "مبلغ الدفع من المحفظة",
    walletLimit: "حد المحفظة",
    bankCardPayment: "الدفع ببطاقة البنك",
    selfPickup: "الاستلام الذاتي - مجاناً",
    selfPickupLabel: "الاستلام الذاتي:",
    free: "مجاناً",
    calculating: "جارٍ الحساب...",
    waitingForAddress: "في انتظار عنوان الوجهة...",
    selfPickupDescription: "ستستلم البضائع بنفسك من موقع الشركة - بدون تكاليف شحن",
    vehicles: "مركبات",
    vehicleBreakdown: "تفصيل المركبات المختارة:",
    vehicle: "مركبة",
    totalLoadWeight: "إجمالي وزن الحمولة:",
    totalCost: "التكلفة الإجمالية:",
  }
};

// Dynamic form schema based on language
const createPurchaseSchema = (lang: Language) => z.object({
  customerName: z.string().min(2, translations[lang].nameRequired),
  phone: z.string().min(10, translations[lang].phoneRequired),
  address: z.string().min(10, translations[lang].addressRequired),
  city: z.string().optional(), // Make city optional to prevent validation failures
  country: z.string().default('Iraq'), // Add country field with default
  postalCode: z.string().optional(),
  notes: z.string().optional(),
  gpsLatitude: z.number().optional(),
  gpsLongitude: z.number().optional(),
  deliveryMethod: z.string().optional(), // Add delivery method field
});

interface PurchaseFormProps {
  cart: {[key: number]: number};
  products: any[];
  onOrderComplete: () => void;
  onClose: () => void;
  existingCustomer?: any; // Customer data from parent component
  onUpdateQuantity?: (productId: number, newQuantity: number) => void;
  onRemoveItem?: (productId: number) => void;
}

// GPS location functionality
const getCurrentLocation = (): Promise<{latitude: number, longitude: number}> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000
      }
    );
  });
};

export default function BilingualPurchaseForm({ cart, products, onOrderComplete, onClose, existingCustomer, onUpdateQuantity, onRemoveItem }: PurchaseFormProps) {
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationData, setLocationData] = useState<{latitude: number, longitude: number} | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'online_payment' | 'fib_online' | 'wallet' | 'wallet_full' | 'wallet_partial' | 'wallet_combined' | 'bank_transfer_grace' | 'bank_receipt'>('fib_online');

  // Fetch available payment methods from admin settings (public endpoint)
  const { data: availablePaymentMethods = [] } = useQuery({
    queryKey: ['/api/public/payment-methods'],
    queryFn: async () => {
      const response = await apiRequest('/api/public/payment-methods');
      return response.data || [];
    },
  });
  const [walletAmount, setWalletAmount] = useState<number>(0);
  const [selectedReceiptFile, setSelectedReceiptFile] = useState<File | null>(null);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<number | null>(null);
  const [shippingCost, setShippingCost] = useState<number>(0);
  
  // Form reference for static positioning and dragging
  const formRef = useRef<HTMLDivElement>(null);
  
  // Draggable states
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!formRef.current) return;
    
    // Allow dragging except on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('input, button, select, textarea, [role="button"], [contenteditable="true"], .no-drag')) {
      return;
    }
    
    setIsDragging(true);
    const rect = formRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !formRef.current) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Prevent dragging outside viewport bounds
    const maxX = window.innerWidth - formRef.current.offsetWidth;
    const maxY = window.innerHeight - formRef.current.offsetHeight;
    
    const boundedX = Math.max(0, Math.min(newX, maxX));
    const boundedY = Math.max(0, Math.min(newY, maxY));
    
    setPosition({ x: boundedX, y: boundedY });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  



  // Fetch current customer data
  const { data: customerData, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['/api/customers/me'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/customers/me', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Customer API response:', result);
          if (result.success) {
            return result;
          }
        }
        
        console.log('Customer not authenticated or API failed');
        return null;
      } catch (error) {
        console.log('Error fetching customer data:', error);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch complete CRM customer data for logged-in customers
  const { data: crmCustomerData } = useQuery({
    queryKey: ['/api/customer/crm-profile'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/customer/crm-profile', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('CRM Customer API response:', result);
          if (result.success) {
            return result.data;
          }
        }
        return null;
      } catch (error) {
        console.log('Error fetching CRM customer data:', error);
        return null;
      }
    },
    enabled: !!(customerData?.success && customerData.customer?.crmId),
    retry: false,
  });

  // Check wallet query conditions with stable memoization
  const walletQueryEnabled = useMemo(() => {
    const isEnabled = !!(existingCustomer || (customerData?.success && customerData.customer));
    console.log('💳 [WALLET QUERY] Enabled check:', { existingCustomer: !!existingCustomer, customerDataSuccess: !!customerData?.success, enabled: isEnabled });
    return isEnabled;
  }, [existingCustomer, customerData?.success]);

  // Fetch wallet data for logged-in customers using default query function
  const { data: walletData, isLoading: isLoadingWallet, error: walletError } = useQuery({
    queryKey: ['/api/customer/wallet'],
    enabled: walletQueryEnabled,
    retry: 1, // Try once on failure
    staleTime: 10000, // 10 seconds cache
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Always refetch on mount for fresh data
  });

  // State for second address province/city selection (must be declared before API queries)
  const [selectedSecondaryProvinceId, setSelectedSecondaryProvinceId] = useState<number | null>(null);
  const [secondProvince, setSecondProvince] = useState('');
  const [secondCity, setSecondCity] = useState('');
  const [secondPostalCode, setSecondPostalCode] = useState('');

  // Fetch Iraqi provinces for second address dropdowns
  const { data: provinces, isLoading: isLoadingProvinces } = useQuery({
    queryKey: ['/api/iraqi-provinces'],
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch cities for selected province in second address
  const { data: secondaryCities, isLoading: isLoadingSecondaryCities } = useQuery({
    queryKey: ['/api/iraqi-cities', selectedSecondaryProvinceId],
    queryFn: async () => {
      if (!selectedSecondaryProvinceId) return [];
      
      const response = await fetch('/api/iraqi-cities');
      if (!response.ok) throw new Error('Failed to fetch cities');
      
      const result = await response.json();
      if (result.success && result.data) {
        // Filter cities by selected province
        return result.data.filter((city: any) => city.provinceId === selectedSecondaryProvinceId);
      }
      return [];
    },
    enabled: !!selectedSecondaryProvinceId,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch shop settings for proforma deadline (public endpoint - no auth required)
  const { data: publicShopSettings } = useQuery<{ success: boolean; data: Record<string, string> }>({
    queryKey: ['/api/public/shop/settings'],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch proforma reminder schedules
  const { data: reminderSchedules } = useQuery({
    queryKey: ['/api/shop/proforma-reminders'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/shop/proforma-reminders', { method: 'GET' });
        return response.data || [];
      } catch (error) {
        console.log('Error fetching reminder schedules:', error);
        return [];
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Get dynamic proforma deadline from public shop settings
  const proformaDeadlineDays = useMemo(() => {
    if (publicShopSettings?.data?.proforma_deadline_days) {
      return parseInt(publicShopSettings.data.proforma_deadline_days) || 3;
    }
    return 3;
  }, [publicShopSettings]);

  // Get reminder schedule info for display
  const reminderInfo = useMemo(() => {
    if (reminderSchedules && Array.isArray(reminderSchedules)) {
      const sortedReminders = reminderSchedules
        .filter(r => r.is_active)
        .sort((a, b) => a.days_before - b.days_before);
      
      if (sortedReminders.length > 0) {
        const reminderTexts = sortedReminders.map(r => {
          let timeText = '';
          if (r.days_before === 0) {
            timeText = `روز پایان مهلت ساعت ${r.reminder_hour}:00`;
          } else {
            timeText = `${r.days_before} روز قبل ساعت ${r.reminder_hour}:00`;
          }
          
          // Add template info if available
          const templates = [];
          if (r.sms_template_id) templates.push(`پیامک ${r.sms_template_id}`);
          if (r.email_template_id) templates.push(`ایمیل ${r.email_template_id}`);
          
          if (templates.length > 0) {
            timeText += ` (${templates.join(', ')})`;
          }
          
          return timeText;
        });
        return reminderTexts.join(' و ');
      }
    }
    return null;
  }, [reminderSchedules]);

  // Fetch VAT settings from public endpoint
  const { data: vatData } = useQuery({
    queryKey: ['/api/tax-settings'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/tax-settings');
        
        if (response.ok) {
          const result = await response.json();
          console.log('💰 [VAT] Tax settings API response:', result);
          if (result.success && result.data) {
            // Convert to the expected format
            const vatSetting = result.data.find((setting: any) => 
              (setting.type === 'VAT' || setting.type === 'vat') && setting.isEnabled
            );
            const dutiesSetting = result.data.find((setting: any) => 
              setting.type === 'duties' && setting.isEnabled
            );
            
            return {
              vatEnabled: vatSetting ? true : false,
              vatRate: vatSetting ? vatSetting.rate : '0',
              dutiesEnabled: dutiesSetting ? true : false,
              dutiesRate: dutiesSetting ? dutiesSetting.rate : '0'
            };
          }
        }
        return {
          vatEnabled: false,
          vatRate: '0',
          dutiesEnabled: false,
          dutiesRate: '0'
        };
      } catch (error) {
        console.log('💰 [VAT] Error fetching tax settings:', error);
        return {
          vatEnabled: false,
          vatRate: '0',
          dutiesEnabled: false,
          dutiesRate: '0'
        };
      }
    },
    retry: false,
  });

  // Check if cart contains flammable materials - CRITICAL SAFETY CHECK
  const containsFlammableProducts = useMemo(() => {
    const flammableItems = Object.entries(cart).some(([productId, quantity]) => {
      if (quantity > 0) {
        const product = products.find(p => p.id === parseInt(productId));
        const isFlammable = product?.isFlammable === true;
        if (isFlammable) {
          console.log('🔥 [BILINGUAL FORM] Flammable product detected:', {
            productId,
            name: product?.name,
            isFlammable: true,
            quantity
          });
        }
        return isFlammable;
      }
      return false;
    });
    
    console.log('🔥 [BILINGUAL FORM] Cart flammable check result:', {
      containsFlammableProducts: flammableItems,
      cartItems: Object.keys(cart).length,
      totalQuantity: Object.values(cart).reduce((sum, qty) => sum + qty, 0)
    });
    
    return flammableItems;
  }, [cart, products]);

  // Fetch active shipping rates with FLAMMABLE MATERIALS FILTERING
  const { data: shippingRatesData, isLoading: isLoadingShippingRates, error: shippingRatesError } = useQuery({
    queryKey: ['/api/shipping-rates'],
    queryFn: async () => {
      console.log('🚚 [BILINGUAL FORM] ===== SHIPPING RATES QUERY STARTED =====');
      try {
        console.log('🚚 [BILINGUAL FORM] Fetching shipping rates with flammable filtering...', {
          containsFlammableProducts,
          cartProducts: Object.entries(cart).map(([id, qty]) => ({
            id,
            quantity: qty,
            name: products.find(p => p.id === parseInt(id))?.name,
            isFlammable: products.find(p => p.id === parseInt(id))?.isFlammable
          }))
        });
        
        const response = await fetch('/api/shipping-rates', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('📦 [BILINGUAL FORM] Raw shipping rates API response:', result);
          
          if (result.success && result.data) {
            let filteredRates = result.data;
            
            // CRITICAL SAFETY FILTER: Remove bus options for flammable materials
            if (containsFlammableProducts) {
              const originalCount = filteredRates.length;
              filteredRates = filteredRates.filter((rate: any) => {
                const deliveryMethod = rate.deliveryMethod || rate.delivery_method || '';
                const isBusMethod = deliveryMethod.includes('bus') || 
                                   deliveryMethod.includes('اتوبوس') || 
                                   rate.name?.includes('اتوبوس') ||
                                   rate.name?.includes('bus');
                
                if (isBusMethod) {
                  console.log('🚫 [SAFETY FILTER] Excluding bus option for flammable materials:', {
                    rateName: rate.name,
                    deliveryMethod: deliveryMethod,
                    rateId: rate.id,
                    reason: 'FLAMMABLE_MATERIALS_SAFETY'
                  });
                  return false; // EXCLUDE BUS FOR FLAMMABLE MATERIALS
                }
                return true; // ALLOW NON-BUS OPTIONS
              });
              
              console.log('🔥 [SAFETY COMPLIANCE] Shipping rates filtered for flammable materials:', {
                originalCount,
                filteredCount: filteredRates.length,
                excludedCount: originalCount - filteredRates.length,
                containsFlammableProducts: true
              });
            }
            
            console.log('✅ [BILINGUAL FORM] Successfully loaded shipping rates:', filteredRates.length, 'methods');
            console.log('🚚 [BILINGUAL FORM] Shipping rates details:', filteredRates);
            return filteredRates;
          }
        }
        console.log('❌ [BILINGUAL FORM] Failed to load shipping rates');
        return [];
      } catch (error) {
        console.log('❌ [BILINGUAL FORM] Error fetching shipping rates:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });



  // Dynamic form based on current language
  const form = useForm({
    resolver: zodResolver(createPurchaseSchema(language as Language)),
    defaultValues: {
      customerName: "",
      phone: "",
      address: "",
      city: "",
      country: "Iraq", // Add country default
      postalCode: "",
      notes: "",
      gpsLatitude: undefined,
      gpsLongitude: undefined,
      deliveryMethod: "", // Add delivery method default
    },
  });

  // Pre-populate form with customer data when available
  useEffect(() => {
    console.log('=== BilingualPurchaseForm Address Debug ===');
    console.log('existingCustomer from parent:', existingCustomer);
    console.log('customerData from API:', customerData);
    console.log('crmCustomerData from API:', crmCustomerData);
    console.log('isLoadingCustomer:', isLoadingCustomer);
    
    // Priority 1: Use CRM customer data (most complete)
    // Priority 2: Use existingCustomer passed from parent (shop page)
    // Priority 3: Use basic customerData from API
    let customerToUse = null;
    if (crmCustomerData) {
      customerToUse = crmCustomerData;
      console.log('Using CRM customer data (most complete)');
    } else if (existingCustomer) {
      customerToUse = existingCustomer;
      console.log('Using existingCustomer from parent');
    } else if (customerData?.success && customerData.customer) {
      customerToUse = customerData.customer;
      console.log('Using basic customerData from API');
    }
    
    if (customerToUse) {
      console.log('Customer object found:', customerToUse);
      console.log('Customer firstName:', customerToUse.firstName);
      console.log('Customer lastName:', customerToUse.lastName);
      console.log('Customer phone:', customerToUse.phone);
      console.log('Customer address:', customerToUse.address);
      console.log('Customer secondaryAddress:', customerToUse.secondaryAddress);
      console.log('Customer city:', customerToUse.city);
      console.log('Customer country:', customerToUse.country);
      console.log('Customer postalCode:', customerToUse.postalCode);
      
      const fullName = `${customerToUse.firstName || ''} ${customerToUse.lastName || ''}`.trim();
      console.log('Full name constructed:', fullName);
      
      // Enhanced address mapping for CRM customers - check multiple address fields
      const customerAddress = customerToUse.address || 
                             customerToUse.secondaryAddress || 
                             customerToUse.primaryAddress ||
                             customerToUse.deliveryAddress ||
                             customerToUse.fullAddress ||
                             customerToUse.streetAddress ||
                             "";
      
      // Enhanced city mapping - check multiple city fields  
      const customerCity = customerToUse.cityRegion || 
                          customerToUse.city || 
                          customerToUse.cityName ||
                          customerToUse.province || 
                          "";
      
      // Enhanced province mapping - for separate province field if needed
      const customerProvince = customerToUse.province || 
                              customerToUse.cityRegion || 
                              customerToUse.city ||
                              "";

      console.log('🏠 [ADDRESS DEBUG] Enhanced address mapping result:', {
        originalCustomer: customerToUse,
        mappedAddress: customerAddress,
        mappedCity: customerCity,
        mappedProvince: customerProvince,
        addressSources: {
          address: customerToUse.address,
          secondaryAddress: customerToUse.secondaryAddress,
          primaryAddress: customerToUse.primaryAddress,
          deliveryAddress: customerToUse.deliveryAddress,
          fullAddress: customerToUse.fullAddress,
          streetAddress: customerToUse.streetAddress
        },
        citySources: {
          cityRegion: customerToUse.cityRegion,
          city: customerToUse.city,
          cityName: customerToUse.cityName,
          province: customerToUse.province
        },
        priorityMapping: {
          selectedCity: customerCity,
          selectedProvince: customerProvince,
          hasCityData: !!customerCity,
          hasProvinceData: !!customerProvince
        }
      });

      const formData = {
        customerName: fullName || customerToUse.name || "",
        phone: customerToUse.phone || "",
        address: customerAddress,
        city: customerCity || "Iraq",
        country: customerToUse.country || "Iraq", 
        postalCode: customerToUse.postalCode || "",
        notes: "",
        gpsLatitude: undefined,
        gpsLongitude: undefined,
        // Add province data for internal use even though form may not have separate field
        province: customerProvince || customerCity || "",
      };
      
      console.log('Form data to reset:', formData);
      form.reset(formData);
      console.log('Form reset completed');
    } else {
      console.log('No customer data available');
    }
    console.log('=== End BilingualPurchaseForm Debug ===');
  }, [existingCustomer, customerData, crmCustomerData, form, isLoadingCustomer]);

  // State for additional recipient fields - CRM conditional logic (must be declared before use)
  const [showSecondAddress, setShowSecondAddress] = useState(false);
  const [showRecipientMobile, setShowRecipientMobile] = useState(false);  
  const [secondAddress, setSecondAddress] = useState('');
  const [recipientMobile, setRecipientMobile] = useState('');

  // Get current translations based on site language
  const t = translations[language as keyof typeof translations] || translations.en;
  const isRTL = direction === 'rtl';
  
  // Conditional graying out logic for CRM fields
  const isPrimaryAddressDisabled = showSecondAddress && secondAddress.trim().length > 0;
  const isPrimaryMobileDisabled = showRecipientMobile && recipientMobile.trim().length > 0;
  const isPrimaryPostalCodeDisabled = secondPostalCode.trim().length > 0; // Separate logic for postal code
  const hasCrmData = !!(crmCustomerData || (customerData?.success && customerData.customer));



  const getEffectiveDiscounts = (product: any) => {
    if (product.bulk_purchase_enabled || product.bulkPurchaseEnabled) {
      let bulkDiscounts = product.bulk_purchase_discounts || product.bulkPurchaseDiscounts;
      if (typeof bulkDiscounts === 'string') {
        try { bulkDiscounts = JSON.parse(bulkDiscounts); } catch { bulkDiscounts = []; }
      }
      return Array.isArray(bulkDiscounts) ? bulkDiscounts : [];
    }
    let discounts = product.quantityDiscounts;
    if (typeof discounts === 'string') {
      try { discounts = JSON.parse(discounts); } catch { discounts = []; }
    }
    return Array.isArray(discounts) ? discounts : [];
  };

  const getDiscountedPrice = (product: any, quantity: number) => {
    const basePrice = Math.round(parseFloat(product.price || '0'));
    const discounts = getEffectiveDiscounts(product);
    
    if (discounts.length > 0) {
      const sortedDiscounts = discounts
        .filter((d: any) => quantity >= parseInt(d.minQty || d.min_qty || 0))
        .sort((a: any, b: any) => parseInt(b.minQty || b.min_qty || 0) - parseInt(a.minQty || a.min_qty || 0));
      
      if (sortedDiscounts.length > 0) {
        const discount = sortedDiscounts[0];
        const discountValue = discount.discount || (parseFloat(discount.discountPercent || discount.discount_percent || 0) / 100);
        const discountedPrice = Math.round(basePrice * (1 - discountValue));
        return discountedPrice;
      }
    }
    
    return basePrice;
  };

  const getActualDiscountPercent = (product: any, quantity: number): number => {
    const discounts = getEffectiveDiscounts(product);
    if (discounts.length === 0) return 0;
    const sorted = discounts
      .filter((d: any) => quantity >= parseInt(d.minQty || d.min_qty || 0))
      .sort((a: any, b: any) => parseInt(b.minQty || b.min_qty || 0) - parseInt(a.minQty || a.min_qty || 0));
    if (sorted.length === 0) return 0;
    const d = sorted[0];
    const val = d.discount || (parseFloat(d.discountPercent || d.discount_percent || 0) / 100);
    return Math.round(val * 100);
  };



  // Calculate subtotal with discounts - IQD whole numbers only
  const subtotalAmount = Math.round(Object.entries(cart).reduce((sum, [productId, quantity]) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (product && product.price) {
      const discountedPrice = getDiscountedPrice(product, quantity);
      return sum + (discountedPrice * quantity);
    }
    return sum;
  }, 0));

  // Auto-select first shipping method when data loads
  useEffect(() => {
    console.log('🚚 [AUTO-SELECT DEBUG] useEffect triggered:', {
      shippingRatesLength: shippingRatesData?.length,
      selectedShippingMethod,
      hasShippingData: !!shippingRatesData
    });
    
    if (shippingRatesData?.length > 0 && !selectedShippingMethod) {
      const firstMethod = shippingRatesData[0];
      console.log('🚚 [AUTO-SELECT] Auto-selecting first shipping method:', firstMethod.id, firstMethod.name);
      setSelectedShippingMethod(firstMethod.id);  
    }
  }, [shippingRatesData, selectedShippingMethod]);

  // Calculate shipping cost based on selected method - Real-time update
  useEffect(() => {
    console.log('🚚 Shipping cost calculation:', { 
      selectedShippingMethod, 
      hasShippingData: !!shippingRatesData, 
      subtotalAmount: subtotalAmount
    });
    
    if (selectedShippingMethod && shippingRatesData && shippingRatesData.length > 0) {
      const selectedRate = shippingRatesData.find((rate: any) => rate.id === selectedShippingMethod);
      console.log('📦 Selected shipping rate:', selectedRate);
      
      if (selectedRate) {
        // Handle special delivery methods with zero cost
        if (selectedRate.deliveryMethod === 'smart_vehicle' || selectedRate.delivery_method === 'smart_vehicle' ||
            selectedRate.deliveryMethod === 'self_pickup' || selectedRate.delivery_method === 'self_pickup' ||
            selectedRate.deliveryMethod === 'freight_collect' || selectedRate.delivery_method === 'freight_collect') {
          console.log('✅ SPECIAL DELIVERY METHOD: Zero cost for', selectedRate.deliveryMethod || selectedRate.delivery_method);
          setShippingCost(0);
          return;
        }
        
        // Parse threshold carefully for regular shipping methods - IQD whole numbers
        const freeShippingThreshold = Math.round(parseFloat(selectedRate.freeShippingThreshold || '0'));
        const basePrice = Math.round(parseFloat(selectedRate.basePrice || '0'));
        
        console.log('💰 Free shipping check:', {
          threshold: freeShippingThreshold,
          orderAmount: subtotalAmount,
          qualifies: subtotalAmount >= freeShippingThreshold && freeShippingThreshold > 0
        });
        
        // Real-time free shipping check
        if (freeShippingThreshold > 0 && subtotalAmount >= freeShippingThreshold) {
          console.log('✅ FREE SHIPPING APPLIED! Threshold:', freeShippingThreshold, 'Order:', subtotalAmount);
          setShippingCost(0);
        } else {
          console.log('💳 Regular shipping cost applied:', basePrice);
          setShippingCost(basePrice);
        }
      } else {
        console.log('⚠️ Selected rate not found, resetting shipping cost');
        setShippingCost(0);
      }
    } else {
      console.log('🔄 No shipping method selected or no data, resetting cost');
      setShippingCost(0);
    }
  }, [selectedShippingMethod, shippingRatesData, subtotalAmount]);

  // Debug shipping rates loading
  useEffect(() => {
    console.log('Shipping rates state:', { 
      isLoadingShippingRates, 
      shippingRatesError, 
      dataLength: shippingRatesData?.length || 0,
      data: shippingRatesData 
    });
  }, [isLoadingShippingRates, shippingRatesError, shippingRatesData]);

  // Calculate VAT and duties amounts (only on product subtotal, not shipping)
  const vatRate = vatData?.vatEnabled ? parseFloat(vatData.vatRate || '0') : 0;
  const dutiesRate = vatData?.dutiesEnabled ? parseFloat(vatData.dutiesRate || '0') : 0;
  
  // Calculate taxes and round to whole numbers for IQD
  const vatAmount = vatData?.vatEnabled ? Math.round(subtotalAmount * vatRate) : 0;
  const dutiesAmount = vatData?.dutiesEnabled ? Math.round(subtotalAmount * dutiesRate) : 0;
  const totalTaxAmount = vatAmount + dutiesAmount;
  
  // Smart delivery cost calculation state
  const [smartDeliveryCost, setSmartDeliveryCost] = useState<number>(0);
  const [smartDeliveryLoading, setSmartDeliveryLoading] = useState<boolean>(false);
  const [smartDeliveryError, setSmartDeliveryError] = useState<string>('');
  const [optimalVehicle, setOptimalVehicle] = useState<any>(null);
  const [alternativeVehicles, setAlternativeVehicles] = useState<any[]>([]);

  // Auto-select smart vehicle when shipping methods load
  useEffect(() => {
    if (shippingRatesData && shippingRatesData.length > 0 && !selectedShippingMethod) {
      const smartVehicleMethod = shippingRatesData.find((rate: any) => 
        rate.deliveryMethod === 'smart_vehicle' || rate.delivery_method === 'smart_vehicle'
      );
      
      if (smartVehicleMethod) {
        console.log('🚚 [AUTO SELECT] Auto-selecting smart vehicle method:', smartVehicleMethod.id);
        setSelectedShippingMethod(smartVehicleMethod.id);
      }
    }
  }, [shippingRatesData, selectedShippingMethod]);

  console.log('💰 [PURCHASE FORM] Tax calculation:', {
    vatData,
    vatRate,
    dutiesRate,
    subtotalAmount,
    vatAmount,
    dutiesAmount,
    totalTaxAmount
  });
  
  // Calculate total weight of all products in cart
  const totalWeight = Object.entries(cart).reduce((sum, [productId, quantity]) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (product) {
      // Get weight from product data (use different weight fields as fallback)
      // grossWeight is the primary weight field from shop products
      const productWeight = parseFloat(product.grossWeight || product.weight || product.weightKg || product.weight_kg || '0');
      // Use minimum 1kg per item if no weight specified (for smart vehicle calculation)
      const effectiveWeight = productWeight > 0 ? productWeight : 1;
      return sum + (effectiveWeight * quantity);
    }
    return sum;
  }, 0);

  // Calculate shipping cost - prioritize smart delivery over regular shipping
  const finalShippingCost = selectedShippingMethod && (shippingRatesData?.find((rate: any) => rate.id === selectedShippingMethod)?.deliveryMethod === 'smart_vehicle' || shippingRatesData?.find((rate: any) => rate.id === selectedShippingMethod)?.delivery_method === 'smart_vehicle')
    ? (optimalVehicle ? optimalVehicle.totalCost : smartDeliveryCost)
    : shippingCost;
  
  // Calculate total amount (subtotal + VAT + duties + final shipping cost - no double counting) - IQD whole numbers
  const totalAmount = Math.round(subtotalAmount + totalTaxAmount + finalShippingCost);
  
  // Debug total calculation
  console.log('💰 [TOTAL CALCULATION] Breakdown:', {
    subtotalAmount,
    totalTaxAmount,
    finalShippingCost,
    regularShippingCost: shippingCost,
    smartDeliveryCost: smartDeliveryCost,
    optimalVehicleCost: optimalVehicle?.totalCost,
    totalAmount,
    'Components': `${subtotalAmount} + ${totalTaxAmount} + ${finalShippingCost} = ${totalAmount}`
  });

  // Calculate wallet payment amounts
  const walletBalance = (walletData as any)?.data?.wallet ? parseFloat((walletData as any).data.wallet.balance) : 
                       (walletData as any)?.wallet ? parseFloat((walletData as any).wallet.balance) : 
                       (walletData as any)?.balance ? parseFloat((walletData as any).balance) : 0;
  // Check if wallet is enabled in admin settings
  const isWalletEnabledInSettings = availablePaymentMethods.some((method: any) => method.methodKey === 'wallet');
  const canUseWallet = walletBalance > 0 && (existingCustomer || (customerData as any)?.success) && isWalletEnabledInSettings;
  const maxWalletAmount = Math.min(walletBalance, totalAmount);
  const remainingAfterWallet = totalAmount - (paymentMethod === 'wallet' ? totalAmount : 0);
  
  // Auto-set wallet amount when wallet_combined is selected (after walletBalance is defined)
  useEffect(() => {
    if (paymentMethod === 'wallet_combined') {
      const maxUsage = Math.min(walletBalance, totalAmount);
      setWalletAmount(maxUsage);
      console.log('🔄 [AUTO WALLET] wallet_combined selected - setting walletAmount:', {
        paymentMethod,
        walletBalance,
        totalAmount,
        maxUsage,
        autoSetValue: maxUsage
      });
    } else if (paymentMethod !== 'wallet') {
      setWalletAmount(0);
    }
  }, [paymentMethod, walletBalance, totalAmount]);

  console.log('💳 [WALLET DEBUG] Complete wallet analysis:', { 
    walletData, 
    walletBalance, 
    canUseWallet, 
    totalAmount,
    existingCustomer: !!existingCustomer,
    customerDataSuccess: !!(customerData as any)?.success,
    walletDataStructure: walletData ? Object.keys(walletData) : 'no data',
    isLoadingWallet,
    walletError: walletError?.message,
    walletQueryEnabled,
    'Raw wallet response': walletData,
    'Wallet success flag': (walletData as any)?.success,
    'Wallet balance path 1': (walletData as any)?.data?.wallet?.balance,
    'Wallet balance path 2': (walletData as any)?.wallet?.balance,
    'Wallet balance path 3': (walletData as any)?.balance
  });



  // Format currency in IQD by default - whole numbers only for IQD
  const formatCurrency = (amount: number, currency = 'IQD') => {
    const formattedAmount = formatIQDAmount(amount);
    if (currency === 'IQD') {
      return `${formattedAmount} IQD`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'IQD' ? 0 : 2
    }).format(formattedAmount);
  };

  // GPS location handler
  const handleGetLocation = async () => {
    setIsGettingLocation(true);
    try {
      const location = await getCurrentLocation();
      setLocationData(location);
      form.setValue('gpsLatitude', location.latitude as any);
      form.setValue('gpsLongitude', location.longitude as any);
      
      toast({
        title: t.locationFound,
        description: `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}`
      });
    } catch (error) {
      toast({
        title: t.locationError,
        variant: "destructive"
      });
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Calculate distance between cities (basic estimation)
  const calculateDistanceBetweenCities = (fromCity: string, toCity: string): number => {
    // Basic distance estimation between major Iraqi cities (km)
    const cityDistances: { [key: string]: { [key: string]: number } } = {
      'اربیل': {
        'بغداد': 350,
        'البصرة': 650,
        'الموصل': 85,
        'كربلا': 467,
        'النجف': 480,
        'السليمانية': 65,
        'دهوك': 75,
        'كركوك': 90,
        'الرمادي': 420,
        'الناصرية': 570
      },
      'بغداد': {
        'اربیل': 350,
        'البصرة': 420,
        'الموصل': 400,
        'كربلا': 100,
        'النجف': 180,
        'السليمانية': 300,
        'دهوك': 450,
        'كركوك': 230,
        'الرمادي': 110,
        'الناصرية': 320
      }
    };

    // Default distance if not found
    const defaultDistance = 200;
    
    return cityDistances[fromCity]?.[toCity] || 
           cityDistances[toCity]?.[fromCity] || 
           defaultDistance;
  };

  // Calculate smart delivery cost
  const calculateSmartDeliveryCost = async (destinationCity: string, destinationProvince: string) => {
    if (!destinationCity || totalWeight <= 0) {
      console.log('🚚 [SMART DELIVERY] Skipping calculation - missing city or zero weight');
      return;
    }

    setSmartDeliveryLoading(true);
    setSmartDeliveryError('');
    
    try {
      // Calculate estimated distance
      const estimatedDistance = calculateDistanceBetweenCities('اربیل', destinationCity);
      
      console.log('🚚 [SMART DELIVERY] Calculating cost for:', {
        weight: totalWeight,
        city: destinationCity,
        province: destinationProvince,
        estimatedDistance,
        cartItems: Object.keys(cart).length
      });

      // Use smart vehicle selection API instead of old delivery cost API
      const response = await fetch('/api/logistics/select-optimal-vehicle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          orderNumber: `CART-${Date.now()}`,
          weightKg: totalWeight,
          routeType: estimatedDistance > 100 ? 'highway' : 'urban', // Choose route type based on distance
          distanceKm: estimatedDistance,
          isHazardous: false, // TODO: Determine based on cart contents if needed
          destinationCity: destinationCity,
          destinationProvince: destinationProvince
        })
      });

      const data = await response.json();
      
      console.log('🚚 [SMART DELIVERY] API response:', data);
      
      if (data.success) {
        // Handle new smart vehicle API response format
        if (data.multiVehicleRequired) {
          // Multi-vehicle scenario
          const multiVehicleData = data.solution;
          const totalCost = multiVehicleData.totalCost;
          const vehicleInfo = {
            vehicleName: `${multiVehicleData.totalVehicles} خودرو`,
            totalCost: totalCost,
            summary: {
              totalVehicles: multiVehicleData.totalVehicles,
              totalWeight: multiVehicleData.totalWeight || totalWeight,
              totalCost: multiVehicleData.totalCost,
              vehicles: multiVehicleData.vehicles.map((vehicle: any, index: number) => ({
                vehicleName: vehicle.name || `خودرو ${index + 1}`,
                loadWeight: vehicle.loadWeight,
                maxWeight: vehicle.maxWeight,
                totalCost: vehicle.totalCost,
                basePrice: vehicle.basePrice,
                pricePerKm: vehicle.pricePerKm,
                efficiency: vehicle.efficiency
              }))
            }
          };
          
          setOptimalVehicle(vehicleInfo);
          setAlternativeVehicles([]);
          setSmartDeliveryCost(totalCost);
          
          console.log('✅ [SMART DELIVERY] Multi-vehicle cost calculated:', {
            vehicles: multiVehicleData.totalVehicles,
            cost: totalCost,
            summary: multiVehicleData.summary
          });
        } else if (data.selectedVehicle) {
          // Single vehicle scenario
          const vehicle = data.selectedVehicle;
          // API returns 'name' not 'vehicleName' - handle both for compatibility
          const vehicleName = vehicle.name || vehicle.vehicleName;
          const vehicleInfo = {
            vehicleName: vehicleName,
            totalCost: vehicle.totalCost,
            basePrice: vehicle.basePrice,
            distanceCost: vehicle.distanceCost
          };
          
          setOptimalVehicle(vehicleInfo);
          setAlternativeVehicles(data.alternatives || []);
          setSmartDeliveryCost(vehicle.totalCost);
          
          console.log('✅ [SMART DELIVERY] Single vehicle cost calculated:', {
            vehicle: vehicleName,
            cost: vehicle.totalCost,
            basePrice: vehicle.basePrice,
            distanceCost: vehicle.distanceCost
          });
        } else {
          console.error('❌ [SMART DELIVERY] Invalid response format:', data);
          throw new Error('فرمت پاسخ سیستم انتخاب خودرو نامعتبر است');
        }
      } else {
        throw new Error(data.message || 'محاسبه هزینه ارسال ناموفق بود');
      }
    } catch (error) {
      console.error('❌ [SMART DELIVERY] Calculation error:', error);
      setSmartDeliveryError((error as any)?.message || 'خطا در محاسبه هزینه ارسال');
      setSmartDeliveryCost(0);
      setOptimalVehicle(null);
      setAlternativeVehicles([]);
    } finally {
      setSmartDeliveryLoading(false);
    }
  };

  // Watch for changes in destination to recalculate delivery cost
  useEffect(() => {
    // Determine final destination city and province
    const finalDestinationCity = showSecondAddress && secondCity.trim() ? 
      secondCity : 
      (crmCustomerData?.cityRegion || crmCustomerData?.city || customerData?.customer?.cityRegion || customerData?.customer?.city || form.watch('city'));
    
    const finalDestinationProvince = showSecondAddress && secondProvince.trim() ? 
      secondProvince : 
      (crmCustomerData?.province || customerData?.customer?.province);

    console.log('🚚 [DELIVERY CALCULATION] Final destination determined:', {
      showSecondAddress,
      secondCity,
      secondProvince,
      crmCityRegion: crmCustomerData?.cityRegion,
      crmCity: crmCustomerData?.city,
      crmProvince: crmCustomerData?.province,
      customerCityRegion: customerData?.customer?.cityRegion,
      customerCity: customerData?.customer?.city,
      customerProvince: customerData?.customer?.province,
      formCity: form.watch('city'),
      finalDestinationCity,
      finalDestinationProvince,
      totalWeight
    });

    // RELAXED CONDITIONS: Only require city and weight > 0
    // Province can default to city name if not available
    const effectiveProvince = finalDestinationProvince || finalDestinationCity || 'Iraq';
    
    if (finalDestinationCity && totalWeight > 0) {
      const debounceTimer = setTimeout(() => {
        calculateSmartDeliveryCost(finalDestinationCity, effectiveProvince);
      }, 1000); // 1 second debounce
      
      return () => clearTimeout(debounceTimer);
    } else {
      console.log('🚚 [DELIVERY CALCULATION] Missing required data for calculation:', {
        hasCity: !!finalDestinationCity,
        hasProvince: !!finalDestinationProvince,
        effectiveProvince,
        hasWeight: totalWeight > 0,
        cityValue: finalDestinationCity,
        provinceValue: finalDestinationProvince,
        totalWeight
      });
    }
  }, [showSecondAddress, secondCity, secondProvince, form.watch('city'), totalWeight, cart, crmCustomerData?.cityRegion, crmCustomerData?.province, customerData?.customer?.cityRegion, customerData?.customer?.province]);



  // Submit order mutation
  const submitOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      console.log('🚀 [ORDER CREATION] Creating order with payment method:', orderData.paymentMethod);
      
      // Handle bank receipt upload separately if file is selected
      if (paymentMethod === 'bank_receipt' && selectedReceiptFile) {
        // First create the order
        const orderResponse = await apiRequest("/api/customers/orders", {
          method: "POST",
          body: orderData
        });
        
        // Then upload the receipt file
        if (orderResponse.orderId) {
          const formData = new FormData();
          formData.append('receipt', selectedReceiptFile);
          formData.append('orderId', orderResponse.orderId.toString());
          formData.append('notes', orderData.notes || '');
          
          try {
            const uploadResponse = await fetch('/api/payment/upload-receipt', {
              method: 'POST',
              body: formData,
              credentials: 'include'
            });
            
            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json();
              console.log('Receipt uploaded successfully:', uploadResult);
            } else {
              console.error('Failed to upload receipt');
            }
          } catch (error) {
            console.error('Error uploading receipt:', error);
          }
        }
        
        return orderResponse;
      } else {
        // Normal order without receipt - add timestamp to bypass cache
        const timestamp = Date.now();
        const endpoint = `/api/customers/orders?t=${timestamp}`;
        
        const response = await apiRequest(endpoint, {
          method: "POST",
          body: orderData
        });
        return response;
      }
    },
    onSuccess: (response: any) => {
      console.log('🎯 [ORDER SUCCESS] Order response received:', response);
      console.log('🎯 [ORDER SUCCESS] Response type:', typeof response);
      console.log('🎯 [ORDER SUCCESS] Response keys:', Object.keys(response || {}));
      
      // RESPECT CUSTOMER'S PAYMENT CHOICE - NO AUTO-SUBSTITUTION
      // Only consider wallet payment if customer explicitly chose wallet methods
      const remainingAmount = parseFloat(response.remainingAmount || 0);
      const customerChoseWallet = paymentMethod === 'wallet';
      const isFullyPaidByWallet = remainingAmount === 0 && customerChoseWallet;
      
      console.log('💳 [PAYMENT DECISION] RESPECTING CUSTOMER CHOICE:', {
        paymentMethod,
        customerChoseWallet,
        remainingAmount,
        isFullyPaidByWallet,
        requiresBankPayment: response.requiresBankPayment,
        paymentStatus: response.paymentStatus,
        walletAmountDeducted: response.walletAmountDeducted,
        'Decision': customerChoseWallet && isFullyPaidByWallet ? 'Complete order (wallet chosen)' : 'Respect customer payment method'
      });
      
      // Only auto-complete if customer EXPLICITLY chose wallet payment AND it's fully paid
      if (isFullyPaidByWallet && customerChoseWallet) {
        console.log('✅ [FULL WALLET PAYMENT] Order fully paid by wallet - completing without bank gateway');
        
        toast({
          title: t.orderRegistered,
          description: `${t.orderFullyPaidWallet} ${response.orderNumber || response.order?.orderNumber || 'N/A'}`,
        });
        
        // Complete the order without bank gateway
        setTimeout(() => {
          onOrderComplete();
          onClose();
        }, 1500);
        return;
      }
      
      // Handle online_payment method - redirect to bank gateway OR show failure message
      else if (paymentMethod === 'online_payment' || paymentMethod === 'fib_online') {
        // Check for both paymentUrl (new) and paymentGatewayUrl (legacy) fields
        const gatewayUrl = response.paymentUrl || response.paymentGatewayUrl;
        
        if (response.requiresBankPayment && gatewayUrl) {
          console.log('🏦 [ONLINE PAYMENT] Redirecting to bank gateway:', gatewayUrl);
          
          toast({
            title: paymentMethod === 'fib_online' ? t.redirectingToFIB : t.redirectingToBank,
            description: paymentMethod === 'fib_online' 
              ? t.redirectingToFIBDesc
              : t.redirectingToBankDesc
          });
          
          // Redirect to payment gateway
          setTimeout(() => {
            window.location.href = gatewayUrl;
          }, 1500);
          return;
        } else if (response.error === 'ONLINE_PAYMENT_UNAVAILABLE') {
          // Bank gateway unavailable - order was not created
          console.log('❌ [ONLINE PAYMENT] Bank gateway unavailable - no order created');
          
          toast({
            title: t.onlinePaymentDisabled,
            description: response.message || t.bankGatewayUnavailable,
            variant: "destructive"
          });
          return;
        }
      }
      // Handle full wallet payments - check both response method and actual amounts
      else if (response.paymentMethod === 'wallet_full' || 
          (walletAmount >= totalAmount && walletAmount > 0) ||
          (response.order?.paymentMethod === 'wallet_full') ||
          (response.order?.paymentStatus === 'paid' && response.order?.walletAmountUsed > 0)) {
        toast({
          title: t.walletPaymentSuccess,
          description: t.orderFullyPaidAmount.replace('{amount}', formatCurrency(totalAmount))
        });
        onOrderComplete();
      }
      // Check if payment gateway redirect is needed (legacy or fallback)
      else if ((response.redirectToPayment || response.requiresBankPayment) && (response.paymentUrl || response.paymentGatewayUrl)) {
        const gatewayUrl = response.paymentUrl || response.paymentGatewayUrl;
        
        toast({
          title: t.redirectingToPaymentGateway,
          description: t.redirectingToPaymentDesc
        });
        
        // Redirect to payment gateway
        setTimeout(() => {
          window.location.href = gatewayUrl;
        }, 1500);
        return;
      } 
      // Check if bank receipt upload is needed
      else if (paymentMethod === 'bank_receipt') {
        if (selectedReceiptFile) {
          toast({
            title: t.orderAndReceiptRegistered,
            description: t.orderReceiptSuccess
          });
        } else {
          toast({
            title: t.orderRegistered,
            description: t.pleaseUploadReceipt
          });
          
          // Redirect to bank receipt upload page only if no file was uploaded
          setTimeout(() => {
            window.location.href = `/bank-receipt-upload/${response.orderId}`;
          }, 1500);
          return; // Don't call onOrderComplete if redirecting
        }
        onOrderComplete();
      }
      // Handle bank transfer with grace period
      else if (paymentMethod === 'bank_transfer_grace') {
        toast({
          title: `✅ سفارش با مهلت ${proformaDeadlineDays} روزه ثبت شد`,
          description: `سفارش شما قفل شد. تا ${proformaDeadlineDays} روز آینده فیش واریزی خود را آپلود کنید`
        });
        onOrderComplete();
      }
      // Handle wallet_partial - wallet deducted, remaining goes to bank gateway  
      else if (response.paymentMethod === 'wallet_partial' || 
               (response.remainingAmount > 0 && response.walletAmountDeducted > 0)) {
        const gatewayUrl = response.paymentUrl || response.paymentGatewayUrl;
        const remainingToPayBank = response.remainingAmount || (totalAmount - walletBalance);
        
        console.log('💳 [WALLET PARTIAL] Wallet deducted, redirecting for remaining:', {
          walletDeducted: response.walletAmountDeducted,
          remainingAmount: remainingToPayBank,
          hasGatewayUrl: !!gatewayUrl
        });
        
        if (gatewayUrl) {
          toast({
            title: t.redirectingToBank || "انتقال به درگاه بانک",
            description: language === 'ar' 
              ? `مبلغ ${formatCurrency(response.walletAmountDeducted || walletBalance)} از کیف پول کسر شد. مبلغ باقیمانده: ${formatCurrency(remainingToPayBank)}`
              : `Wallet deducted: ${formatCurrency(response.walletAmountDeducted || walletBalance)}. Remaining: ${formatCurrency(remainingToPayBank)}`
          });
          
          setTimeout(() => {
            window.location.href = gatewayUrl;
          }, 1500);
          return;
        } else {
          // No gateway URL but partial payment needed - show error
          toast({
            title: t.onlinePaymentDisabled || "درگاه پرداخت در دسترس نیست",
            description: language === 'ar' 
              ? "سفارش ثبت شد. لطفاً مبلغ باقیمانده را از طریق کارت به کارت پرداخت کنید"
              : "Order registered. Please pay the remaining amount via bank transfer",
            variant: "destructive"
          });
          onOrderComplete();
          return;
        }
      }
      // Handle bank transfer - redirect to payment gateway  
      else if (response.paymentMethod === 'bank_transfer' || (paymentMethod !== 'wallet' && paymentMethod !== 'wallet_full' && paymentMethod !== 'wallet_partial' && paymentMethod !== 'wallet_combined' && paymentMethod !== 'online_payment' && paymentMethod !== 'bank_transfer_grace' && paymentMethod !== 'bank_receipt')) {
        toast({
          title: "انتقال به درگاه بانک",
          description: "در حال هدایت شما به درگاه پرداخت بانکی..."
        });
        
        // Redirect to bank payment gateway
        setTimeout(() => {
          const totalAmount = response.totalAmount || response.remainingAmount || (products.reduce((sum, p) => sum + (parseFloat(p.price || '0') * (cart[p.id] || 0)), 0) + shippingCost);
          window.location.href = `/payment?orderId=${response.orderId || response.order?.id}&amount=${totalAmount}&method=bank`;
        }, 1500);
        return;
      }
      else {
        toast({
          title: t.orderSubmitted,
          description: "سفارش شما با موفقیت ثبت شد"
        });
        onOrderComplete();
      }
    },
    onError: (error: any) => {
      console.error('❌ [ORDER ERROR] Order submission failed:', error);
      
      // Show specific error message for bank payment failures
      const errorMessage = error.message || t.orderError;
      
      toast({
        title: 'خطا در ثبت سفارش',
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: any) => {
    console.log('🚀 [SUBMIT DEBUG] onSubmit function called');
    console.log('🚀 [SUBMIT DEBUG] Form data received:', data);
    console.log('🚀 [SUBMIT DEBUG] Selected shipping method:', selectedShippingMethod);
    console.log('🚀 [SUBMIT DEBUG] Payment method:', paymentMethod);
    console.log('🚀 [SUBMIT DEBUG] Form validation state:', form.formState);
    console.log('🚀 [SUBMIT DEBUG] Form errors:', form.formState.errors);
    console.log('🚀 [SUBMIT DEBUG] Mutation pending before submit:', submitOrderMutation.isPending);
    
    // Validate shipping method selection
    if (!selectedShippingMethod) {
      console.log('🚀 [SUBMIT DEBUG] Shipping method validation failed');
      toast({
        title: language === 'ar' ? "روش ارسال اجباری است" : "Shipping method is required",
        description: language === 'ar' ? "لطفاً روش ارسال را انتخاب کنید" : "Please select a shipping method",
        variant: "destructive"
      });
      return;
    }

    // Determine active delivery info based on conditional logic
    const activeDeliveryInfo = {
      // Address determination - use second address if provided, otherwise primary
      activeAddress: (showSecondAddress && secondAddress.trim()) 
        ? secondAddress.trim() 
        : data.address,
      activeCity: (showSecondAddress && secondCity.trim()) 
        ? secondCity.trim() 
        : data.city,
      activeProvince: (showSecondAddress && secondProvince.trim()) 
        ? secondProvince.trim() 
        : (crmCustomerData?.province || ''),
      activePostalCode: secondPostalCode.trim() 
        ? secondPostalCode.trim() 
        : data.postalCode,
      
      // Phone determination - use recipient mobile if provided, otherwise primary
      activePhone: (showRecipientMobile && recipientMobile.trim()) 
        ? recipientMobile.trim() 
        : data.phone,
      
      // Source tracking for logistics
      isUsingSecondAddress: !!(showSecondAddress && secondAddress.trim()),
      isUsingRecipientMobile: !!(showRecipientMobile && recipientMobile.trim()),
    };

    // Get the selected shipping rate to extract deliveryMethod
    const selectedRate = shippingRatesData?.find((rate: any) => rate.id === selectedShippingMethod);
    const selectedDeliveryMethod = selectedRate?.deliveryMethod || selectedRate?.delivery_method || 'unknown';
    
    let orderData = {
      ...data,
      cart,
      totalAmount,
      subtotalAmount,
      shippingCost: finalShippingCost,
      vatAmount: vatAmount,
      dutiesAmount: dutiesAmount,
      selectedShippingMethod,
      // CRITICAL: Include the actual delivery method string for logistics display
      deliveryMethod: selectedDeliveryMethod,
      currency: 'IQD',
      paymentMethod,
      walletAmountUsed: Math.round(walletAmount), // Use actual wallet amount in integer format
      remainingAmount: Math.round(Math.max(0, totalAmount - walletAmount)), // Calculate remaining in integer format
      
      // Customer's selected vehicle from smart delivery calculation - CRITICAL for logistics
      vehicleType: optimalVehicle?.vehicleName || optimalVehicle?.name || optimalVehicle?.vehicleType || null,
      
      // CRITICAL FIX: Include calculated weight for order_management storage
      totalWeight: totalWeight,
      
      // Enhanced delivery information
      secondDeliveryAddress: showSecondAddress ? secondAddress : null,
      secondDeliveryCity: showSecondAddress ? secondCity : null, 
      secondDeliveryProvince: showSecondAddress ? secondProvince : null,
      secondDeliveryPostalCode: showSecondAddress ? secondPostalCode : null,
      recipientMobile: showRecipientMobile ? recipientMobile : null,
      
      // Active delivery logistics data
      activeDeliveryInfo,
      
      // Add warehouse notes for logistics clarity
      warehouseNotes: `تحویل فعال: ${activeDeliveryInfo.isUsingSecondAddress ? 'آدرس دوم' : 'آدرس اول'} | تماس فعال: ${activeDeliveryInfo.isUsingRecipientMobile ? 'موبایل گیرنده' : 'موبایل اصلی'}`
    };

    console.log('🚚 [DELIVERY LOGIC] Active delivery information:', activeDeliveryInfo);
    
    // CRITICAL DEBUG: Verify deliveryMethod and vehicleType are being captured
    console.log('🚗 [VEHICLE DEBUG] Delivery method and vehicle at order submission:', {
      selectedShippingMethod,
      selectedDeliveryMethod,
      selectedRateName: selectedRate?.name || selectedRate?.description,
      optimalVehicle,
      vehicleNameProperty: optimalVehicle?.vehicleName,
      nameProperty: optimalVehicle?.name,
      vehicleTypeProperty: optimalVehicle?.vehicleType,
      finalVehicleType: optimalVehicle?.vehicleName || optimalVehicle?.name || optimalVehicle?.vehicleType || null,
      isOptimalVehicleNull: optimalVehicle === null
    });

    // Handle wallet payment calculations with smart wallet_combined conversion
    let finalPaymentMethod = paymentMethod;
    
    // Convert wallet_combined to appropriate wallet type based on wallet amount vs total
    console.log('🔍 [PAYMENT ANALYSIS] Before conversion:', {
      paymentMethod,
      walletAmount,
      totalAmount,
      walletBalance,
      canUseWallet,
      comparison: `${walletAmount} >= ${totalAmount} = ${walletAmount >= totalAmount}`
    });
    
    if (paymentMethod === 'wallet_combined' || paymentMethod === 'wallet') {
      // CRITICAL FIX: Check walletAmount (user's entered amount), NOT walletBalance (total available)
      // This ensures we respect the user's choice to use only partial wallet funds
      if (walletAmount >= totalAmount && walletAmount > 0) {
        finalPaymentMethod = 'wallet_full';
        console.log('🔄 [PAYMENT CONVERSION] ' + paymentMethod + ' → wallet_full (user entered sufficient amount)');
      } else if (walletAmount > 0 && walletAmount < totalAmount) {
        // User entered a partial wallet amount - MUST go to bank for remaining
        finalPaymentMethod = 'wallet_partial';
        console.log('🔄 [PAYMENT CONVERSION] ' + paymentMethod + ' → wallet_partial (hybrid payment - needs bank gateway for remaining: ' + (totalAmount - walletAmount) + ' IQD)');
      } else {
        // No wallet amount entered - redirect to full bank payment
        finalPaymentMethod = 'fib_online';
        console.log('🔄 [PAYMENT CONVERSION] ' + paymentMethod + ' → fib_online (no wallet amount entered)');
      }
    }

    orderData.paymentMethod = finalPaymentMethod;

    if (finalPaymentMethod === 'wallet_full') {
      orderData.walletAmountUsed = Math.round(totalAmount);
      orderData.remainingAmount = 0;
    } else if (finalPaymentMethod === 'wallet' || finalPaymentMethod === 'wallet_partial') {
      orderData.walletAmountUsed = Math.round(walletAmount);
      orderData.remainingAmount = Math.round(Math.max(0, totalAmount - walletAmount));
    } else if (finalPaymentMethod === 'online_payment') {
      orderData.walletAmountUsed = 0;
      orderData.remainingAmount = Math.round(totalAmount);
    } else if (finalPaymentMethod === 'bank_receipt') {
      orderData.walletAmountUsed = 0;
      orderData.remainingAmount = Math.round(totalAmount);
    } else if (finalPaymentMethod === 'bank_transfer_grace') {
      orderData.walletAmountUsed = 0;
      orderData.remainingAmount = Math.round(totalAmount);
      orderData.paymentGracePeriod = true; // Flag for 3-day grace period
    }

    console.log('🚀 [ORDER SUBMIT] Submitting order with complete data:', {
      endpoint: '/api/customers/orders',
      originalPaymentMethod: paymentMethod,
      finalPaymentMethod: finalPaymentMethod,
      totalAmount,
      walletBalance,
      walletAmountUsed: orderData.walletAmountUsed,
      remainingAmount: orderData.remainingAmount,
      walletAmountInput: walletAmount,
      paymentMethodSelected: paymentMethod,
      finalPaymentMethodSent: finalPaymentMethod,
      shouldUseWallet: finalPaymentMethod === 'wallet',
      paymentConversionApplied: paymentMethod !== finalPaymentMethod,
      // Vehicle debugging - CRITICAL FOR LOGISTICS
      vehicleType: orderData.vehicleType,
      optimalVehicle: optimalVehicle,
      vehicleNameFromOptimal: optimalVehicle?.vehicleName,
      orderData
    });

    submitOrderMutation.mutate(orderData);
  };



  return (
    <div className="fixed inset-0 bg-black/20 z-40 pointer-events-none">
      <Card 
        ref={formRef}
        className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'} absolute cursor-move ${isDragging ? 'select-none' : ''} pointer-events-auto z-50 shadow-2xl`}
        style={{
          left: position.x === 0 && position.y === 0 ? '50%' : `${position.x}px`,
          top: position.x === 0 && position.y === 0 ? '50%' : `${position.y}px`,
          transform: position.x === 0 && position.y === 0 ? 'translate(-50%, -50%)' : 'none',
        }}
        onMouseDown={handleMouseDown}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 cursor-move">
          <div className="flex items-center gap-2 cursor-move">
            <Move className="w-4 h-4 text-muted-foreground" />
            <ShoppingCart className="w-5 h-5" />
            <CardTitle className="text-lg cursor-move">{t.purchaseOrder}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-destructive/10"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Cart Management */}
          <div className="bg-muted p-3 rounded-lg">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              {t.cartManagement}
            </h3>
            <div className="space-y-3">
              {Object.entries(cart).map(([productId, quantity]) => {
                const product = products.find(p => p.id === parseInt(productId));
                if (!product) return null;
                
                const basePrice = Math.round(parseFloat(product.price || '0'));
                const discountedPrice = getDiscountedPrice(product, quantity);
                const itemTotal = Math.round(discountedPrice * quantity);
                
                return (
                  <div key={productId} className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
                    <div className="flex items-start justify-between gap-3">
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {/* Small product image */}
                          <div className="w-8 h-8 rounded border overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700">
                            {product.imageUrl ? (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  img.style.display = 'none';
                                  img.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-xs text-muted-foreground">📦</div>';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">📦</div>
                            )}
                          </div>
                          <h4 className="font-medium text-sm truncate flex items-center gap-1">
                            {product.name}
                            {product.isFlammable && (
                              <Flame className="w-3 h-3 text-orange-500 flex-shrink-0" aria-label="محصول آتش‌زا" />
                            )}
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                        <p className="text-sm font-medium mt-1">
                          {discountedPrice < basePrice && (
                            <span className="line-through text-gray-400 mr-2">{formatCurrency(basePrice)}</span>
                          )}
                          {formatCurrency(discountedPrice)} {t.each}
                          {discountedPrice < basePrice && basePrice > 0 && (
                            <span className="text-[10px] text-green-600 font-semibold ml-1">
                              {(product.bulk_purchase_enabled || product.bulkPurchaseEnabled) ? '📦' : '🏷️'} {getActualDiscountPercent(product, quantity)}%
                            </span>
                          )}
                        </p>
                      </div>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onUpdateQuantity && onUpdateQuantity(product.id, quantity - 1)}
                          className="h-7 w-7 p-0"
                          title={t.decreaseQuantity}
                          disabled={quantity <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        
                        {/* Direct quantity input field */}
                        <Input
                          type="number"
                          min="1"
                          max={product.stockQuantity || 999999}
                          value={quantity}
                          onChange={(e) => {
                            const newQuantity = parseInt(e.target.value) || 1;
                            const maxQuantity = product.stockQuantity || 999999;
                            const validQuantity = Math.max(1, Math.min(newQuantity, maxQuantity));
                            if (onUpdateQuantity) {
                              onUpdateQuantity(product.id, validQuantity);
                            }
                          }}
                          className="h-7 w-16 text-center text-sm font-medium px-1 py-0"
                          title="تغییر مستقیم تعداد"
                        />
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Check stock availability before allowing increase
                            if (!product.inStock || (product.stockQuantity || 0) <= 0) return;
                            if (quantity >= (product.stockQuantity || 0)) return;
                            onUpdateQuantity && onUpdateQuantity(product.id, quantity + 1);
                          }}
                          className="h-7 w-7 p-0"
                          title={t.increaseQuantity}
                          disabled={!product.inStock || (product.stockQuantity || 0) <= 0 || quantity >= (product.stockQuantity || 0)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRemoveItem && onRemoveItem(product.id)}
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title={t.removeItem}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Item Total with discount info */}
                    <div className="mt-2 pt-2 border-t space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Item Total</span>
                        <span className="font-medium">{formatCurrency(itemTotal)}</span>
                      </div>
                      {discountedPrice < basePrice && (
                        <div className="flex justify-between items-center text-xs text-green-600">
                          <span>{t.discountApplied}</span>
                          <span>-{formatCurrency((basePrice - discountedPrice) * quantity)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Cart Summary */}
            <div className="border-t mt-3 pt-3 space-y-2">
              {/* VAT */}
              {vatData?.vatEnabled && vatAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>مالیات بر ارزش افزوده ({(vatRate * 100).toFixed(0)}%)</span>
                  <span>{formatCurrency(vatAmount)}</span>
                </div>
              )}
              
              {/* Duties */}
              {vatData?.dutiesEnabled && dutiesAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>عوارض بر ارزش افزوده ({(dutiesRate * 100).toFixed(0)}%)</span>
                  <span>{formatCurrency(dutiesAmount)}</span>
                </div>
              )}
              
              {/* Total (without shipping) */}
              <div className="flex justify-between font-semibold text-base border-t pt-2">
                <span>{t.subtotalWithoutShipping}</span>
                <span className="text-primary">{formatCurrency(subtotalAmount + totalTaxAmount)}</span>
              </div>
              
              {/* Delivery Method Selection */}
              <div className="space-y-3 border-t pt-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">{t.deliveryMethod} *</label>
                  <div className="text-sm text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md border">
                    ⚖️ {t.shipmentWeight} <span className="font-semibold text-gray-700 dark:text-gray-300">{totalWeight.toFixed(2)} {t.kilogram}</span>
                  </div>
                </div>
                {isLoadingShippingRates ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    {language === 'en' ? 'Loading shipping methods...' : language === 'ar' ? 'جارٍ تحميل طرق الشحن...' : 'جارٍ تحميل طرق الشحن...'}
                  </div>
                ) : shippingRatesError ? (
                  <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2 border border-red-200 dark:border-red-800">
                    {language === 'en' ? 'Failed to load shipping methods. Please refresh page.' : language === 'ar' ? 'فشل تحميل طرق الشحن. يرجى إعادة تحميل الصفحة.' : 'فشل تحميل طرق الشحن. يرجى إعادة تحميل الصفحة.'}
                  </div>
                ) : shippingRatesData && shippingRatesData.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedShippingMethod || ''}
                      onChange={(e) => setSelectedShippingMethod(parseInt(e.target.value) || null)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                      required
                    >
                      <option value="">{t.selectDeliveryMethod}</option>
                      {shippingRatesData.map((rate: any) => {
                        // Handle smart_vehicle option specially
                        if (rate.deliveryMethod === 'smart_vehicle' || rate.delivery_method === 'smart_vehicle') {
                          return (
                            <option key={rate.id} value={rate.id} style={{backgroundColor: '#d1fae5', color: '#047857'}}>
                              🚚 {t.smartVehicleSelection}
                            </option>
                          );
                        }
                        
                        // Handle self_pickup option specially
                        if (rate.deliveryMethod === 'self_pickup' || rate.delivery_method === 'self_pickup') {
                          return (
                            <option key={rate.id} value={rate.id} style={{backgroundColor: '#dbeafe', color: '#1d4ed8'}}>
                              🚶‍♂️ {t.selfPickup}
                            </option>
                          );
                        }
                        
                        // Handle freight_collect option specially
                        if (rate.deliveryMethod === 'freight_collect' || rate.delivery_method === 'freight_collect') {
                          return (
                            <option key={rate.id} value={rate.id} style={{backgroundColor: '#fed7aa', color: '#c2410c'}}>
                              🚚 {language === 'en' ? 'Freight Collect' : 'الشحن عند التسليم'} - {language === 'en' ? 'Pay upon delivery' : 'الدفع عند الاستلام'}
                            </option>
                          );
                        }
                        
                        // Handle standard shipping rates
                        const freeShippingThreshold = parseFloat(rate.freeShippingThreshold || '0');
                        const qualifiesForFreeShipping = freeShippingThreshold > 0 && subtotalAmount >= freeShippingThreshold;
                        
                        return (
                          <option key={rate.id} value={rate.id}>
                            {rate.deliveryMethod || rate.delivery_method || rate.name} - {qualifiesForFreeShipping ? t.freeShipping : formatCurrency(parseFloat(rate.basePrice || rate.base_price || '0'))}
                            {rate.estimatedDays && ` (${rate.estimatedDays} ${language === 'en' ? 'days' : language === 'ar' ? 'أيام' : 'أيام'})`}
                          </option>
                        );
                      })}
                    </select>
                    
                    {/* Show shipping cost details */}
                    {selectedShippingMethod && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                        {(() => {
                          const selectedRate = shippingRatesData.find((rate: any) => rate.id === selectedShippingMethod);
                          
                          // Handle smart_vehicle display
                          if (selectedRate && (selectedRate.deliveryMethod === 'smart_vehicle' || selectedRate.delivery_method === 'smart_vehicle')) {
                            return (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-emerald-700 font-medium">🚚 {t.smartVehicleLabel}</span>
                                  <div className="text-right">
                                    {optimalVehicle ? (
                                      <div>
                                        <div className="font-bold text-emerald-800">
                                          {optimalVehicle.vehicleType === 'multiple' 
                                            ? `${optimalVehicle.totalVehicles} ${t.vehicles}` 
                                            : optimalVehicle.vehicleName}
                                        </div>
                                        <div className="text-xs text-emerald-600">{formatCurrency(optimalVehicle.totalCost)}</div>
                                      </div>
                                    ) : smartDeliveryLoading ? (
                                      <span className="font-bold text-emerald-800">{t.calculating}</span>
                                    ) : (
                                      <span className="font-bold text-orange-600">{t.waitingForAddress}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-200">
                                  ✓ {t.smartVehicleDescription}
                                  {optimalVehicle && (
                                    <div className="mt-1 font-medium">
                                      {optimalVehicle.summary?.vehicles?.length > 1 ? (
                                        <div>
                                          <div className="font-semibold text-emerald-700 mb-2">
                                            🚚 {t.vehicleBreakdown.replace(':', '')} ({optimalVehicle.summary.totalVehicles})
                                          </div>
                                          <div className="text-xs space-y-2 bg-white p-2 rounded border">
                                            {optimalVehicle.summary.vehicles.map((vehicle: any, index: number) => (
                                              <div key={index} className="flex justify-between items-center border-b pb-1">
                                                <div className="flex-1">
                                                  <span className="font-medium text-blue-700">{t.vehicle} {index + 1}:</span>
                                                  <span className="ml-2 text-gray-700">{vehicle.vehicleName}</span>
                                                </div>
                                                <div className="text-right">
                                                  <div className="font-bold text-orange-600">{vehicle.loadWeight} {t.kilogram}</div>
                                                  <div className="text-xs text-gray-500">{formatCurrency(vehicle.totalCost)}</div>
                                                </div>
                                              </div>
                                            ))}
                                            <div className="mt-2 pt-2 border-t flex justify-between font-bold">
                                              <span>{t.totalLoadWeight}</span>
                                              <span className="text-green-700">{optimalVehicle.summary.totalWeight} {t.kilogram}</span>
                                            </div>
                                            <div className="flex justify-between font-bold">
                                              <span>{t.totalCost}</span>
                                              <span className="text-red-600">{formatCurrency(optimalVehicle.summary.totalCost)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div>
                                          <span className="text-blue-700">{t.selectedVehicle} {optimalVehicle.vehicleName}</span>
                                          {optimalVehicle.basePrice && (
                                            <div className="text-xs text-gray-600 mt-1">
                                              {t.basePrice} {formatCurrency(optimalVehicle.basePrice)} | 
                                              {t.distanceCost} {formatCurrency(optimalVehicle.distanceCost || 0)}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          
                          // Handle self_pickup display
                          if (selectedRate && (selectedRate.deliveryMethod === 'self_pickup' || selectedRate.delivery_method === 'self_pickup')) {
                            return (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-blue-700 font-medium">🚶‍♂️ {t.selfPickupLabel}</span>
                                  <span className="font-bold text-blue-800">{t.free}</span>
                                </div>
                                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                                  ✓ {t.selfPickupDescription}
                                </div>
                              </div>
                            );
                          }
                          
                          // Handle freight_collect display
                          if (selectedRate && (selectedRate.deliveryMethod === 'freight_collect' || selectedRate.delivery_method === 'freight_collect')) {
                            return (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-orange-700 font-medium">🚚 {language === 'en' ? 'Freight Collect' : 'الشحن عند التسليم'}</span>
                                  <span className="font-bold text-orange-800">{language === 'en' ? 'Pay upon delivery' : 'الدفع عند الاستلام'}</span>
                                </div>
                                <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                                  ✓ {language === 'en' ? 'Shipping cost will be paid upon delivery by the customer' : 'سيتم دفع تكلفة الشحن عند التسليم من قبل العميل'}
                                </div>
                              </div>
                            );
                          }
                          
                          // Handle standard shipping rates
                          return (
                            <div>
                              <div className="flex justify-between items-center text-sm">
                                <span>{t.shippingCost}:</span>
                                <span className="font-medium">
                                  {shippingCost === 0 ? t.freeShipping : formatCurrency(shippingCost)}
                                </span>
                              </div>
                              {(() => {
                                const freeShippingThreshold = parseFloat(selectedRate?.freeShippingThreshold || '0');
                                if (freeShippingThreshold > 0 && subtotalAmount >= freeShippingThreshold) {
                                  return (
                                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                      ✓ {language === 'en' ? 'Free shipping for orders over' : language === 'ar' ? 'شحن مجاني للطلبات فوق' : 'شحن مجاني للطلبات فوق'} {formatCurrency(freeShippingThreshold)}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 border border-amber-200 dark:border-amber-800">
                    {language === 'en' ? 'No shipping methods available at the moment.' : language === 'ar' ? 'لا توجد طرق شحن متاحة في الوقت الحالي.' : 'لا توجد طرق شحن متاحة في الوقت الحالي.'}
                  </div>
                )}
              </div>
              
              {/* Smart Delivery Cost Display */}
              {selectedShippingMethod && (
                <div className="flex justify-between text-sm">
                  <span>
                    {(() => {
                      const selectedRate = shippingRatesData?.find((rate: any) => rate.id === selectedShippingMethod);
                      
                      // Handle smart vehicle display
                      if (selectedRate && (selectedRate.deliveryMethod === 'smart_vehicle' || selectedRate.delivery_method === 'smart_vehicle')) {
                        return `🚚 ${t.smartShippingCost}`;
                      }
                      
                      // Handle self pickup display  
                      if (selectedRate && (selectedRate.deliveryMethod === 'self_pickup' || selectedRate.delivery_method === 'self_pickup')) {
                        return `🚶‍♂️ ${t.selfPickupLabel.replace(':', '')}`;
                      }
                      
                      // Handle freight_collect display  
                      if (selectedRate && (selectedRate.deliveryMethod === 'freight_collect' || selectedRate.delivery_method === 'freight_collect')) {
                        return `🚚 ${language === 'en' ? 'Freight Collect' : 'الشحن عند التسليم'}`;
                      }
                      
                      return selectedRate?.name || t.deliveryMethod;
                    })()}
                  </span>
                  <span>
                    {(() => {
                      const selectedRate = shippingRatesData?.find((rate: any) => rate.id === selectedShippingMethod);
                      
                      // Handle smart vehicle cost
                      if (selectedRate && (selectedRate.deliveryMethod === 'smart_vehicle' || selectedRate.delivery_method === 'smart_vehicle')) {
                        if (smartDeliveryLoading) {
                          return <span className="text-emerald-600">{t.calculating}</span>;
                        }
                        if (finalShippingCost > 0) {
                          return <span className="text-emerald-600 font-bold">{formatCurrency(finalShippingCost)}</span>;
                        }
                        return <span className="text-gray-500">{t.waitingForAddress}</span>;
                      }
                      
                      // Handle self pickup cost
                      if (selectedRate && (selectedRate.deliveryMethod === 'self_pickup' || selectedRate.delivery_method === 'self_pickup')) {
                        return <span className="text-blue-600 font-bold">{t.free}</span>;
                      }
                      
                      return shippingCost === 0 ? t.freeShipping : formatCurrency(shippingCost);
                    })()}
                  </span>
                </div>
              )}
              
              {/* Final Amount */}
              <div className="flex justify-between font-bold text-lg border-t pt-2 bg-yellow-300 px-2 py-2 rounded-lg">
                <span>Final Amount</span>
                <span className="text-gray-900">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection - moved up below total */}
          {customerData?.success && (
            <div className="space-y-3 border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-blue-900 dark:text-blue-100">{t.paymentMethod}</h3>
              </div>
              
              {/* Wallet Balance Display */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.walletBalance}:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(walletBalance)}</span>
                </div>
              </div>

              {/* Payment Options */}
              <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as any)} className="space-y-3">
                {/* Dynamic payment methods based on admin settings */}
                {availablePaymentMethods.map((method: any) => {
                  if (method.methodKey === 'online_payment') {
                    return (
                      <div key={method.methodKey} className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="online_payment" id="online_payment" />
                        <Label htmlFor="online_payment" className="flex items-center gap-2 cursor-pointer">
                          <CreditCard className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold">{method.methodName}</span>
                        </Label>
                      </div>
                    );
                  }
                  if (method.methodKey === 'fib_online') {
                    return (
                      <div key={method.methodKey} className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="fib_online" id="fib_online" data-testid="radio-fib-online" />
                        <Label htmlFor="fib_online" className="flex items-center gap-2 cursor-pointer">
                          <CreditCard className="w-4 h-4 text-green-600" />
                          <span className="font-semibold">{language === 'ar' ? method.methodName : method.methodNameEn}</span>
                        </Label>
                      </div>
                    );
                  }
                  return null;
                })}
                
                {/* دوم: پرداخت از کیف پول (تمام یا بخش از آن) */}
                {canUseWallet && isWalletEnabledInSettings && (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="wallet_combined" id="wallet_combined" />
                    <Label htmlFor="wallet_combined" className="flex items-center gap-2 cursor-pointer">
                      <Wallet className="w-4 h-4 text-green-600" />
                      <span className="font-semibold">{t.useWallet} {formatIQDAmount(Math.min(walletBalance, totalAmount))} IQD)</span>
                    </Label>
                  </div>
                )}
                
                
                {/* Dynamic other payment methods */}
                {availablePaymentMethods.map((method: any) => {
                  if (method.methodKey === 'bank_transfer_grace') {
                    return (
                      <div key={method.methodKey} className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem 
                          value="bank_transfer_grace" 
                          id="bank_transfer_grace"
                        />
                        <Label htmlFor="bank_transfer_grace" className="flex items-center gap-2 cursor-pointer">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <div className="flex flex-col">
                            <span className="font-semibold">{t.bankTransferWithDays.replace('{days}', proformaDeadlineDays.toString())}</span>
                          </div>
                        </Label>
                      </div>
                    );
                  } else if (method.methodKey === 'bank_receipt') {
                    return (
                      <div key={method.methodKey} className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="bank_receipt" id="bank_receipt" />
                        <Label htmlFor="bank_receipt" className="flex items-center gap-2 cursor-pointer">
                          <Upload className="w-4 h-4 text-orange-600" />
                          {method.methodName}
                        </Label>
                      </div>
                    );
                  }
                  return null;
                })}


              </RadioGroup>

              {/* Partial Payment Amount Input */}
              {paymentMethod === 'wallet_combined' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="walletAmount">{t.amountFromWallet} {formatIQDAmount(Math.min(walletBalance, totalAmount))} IQD)</Label>
                    <Input
                      id="walletAmount"
                      type="number"
                      min="0"
                      max={Math.min(walletBalance, totalAmount)}
                      value={walletAmount || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setWalletAmount(Math.min(value, Math.min(walletBalance, totalAmount)));
                      }}
                      placeholder="مقدار دلخواه از کیف پول"
                      className="text-right"
                    />
                  </div>
                  
                  {/* Payment Breakdown Table */}
                  {walletAmount > 0 && (
                    <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody>
                          {/* Final Amount Row */}
                          <tr className="border-b">
                            <td className="px-4 py-3 text-right font-medium bg-gray-50">Final Amount</td>
                            <td className="px-4 py-3 text-center font-bold">{formatIQDAmount(totalAmount)}</td>
                            <td className="px-4 py-3 bg-gray-50"></td>
                            <td className="px-4 py-3 bg-gray-50"></td>
                          </tr>
                          
                          {/* Wallet Payment Row */}
                          <tr className="border-b">
                            <td className="px-4 py-3 text-right">{t.walletPaymentAmount}</td>
                            <td className="px-4 py-3 text-center font-medium">{formatIQDAmount(walletAmount)}</td>
                            <td className="px-4 py-3 text-right font-medium bg-blue-50">{t.walletLimit}</td>
                            <td className="px-4 py-3 text-center font-medium bg-blue-50 text-blue-700">{formatIQDAmount(walletBalance)}</td>
                          </tr>
                          
                          {/* Bank Payment Row */}
                          <tr>
                            <td className="px-4 py-3 text-right">{t.bankCardPayment}</td>
                            <td className="px-4 py-3 text-center font-medium text-orange-600">{formatIQDAmount(totalAmount - walletAmount)}</td>
                            <td className="px-4 py-3 bg-gray-50"></td>
                            <td className="px-4 py-3 bg-gray-50"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Summary */}
              {(paymentMethod === 'wallet' || paymentMethod === 'wallet_full' || paymentMethod === 'wallet_partial' || paymentMethod === 'wallet_combined') && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>مبلغ کل:</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>پرداخت از والت:</span>
                      <span>-{formatCurrency(paymentMethod === 'wallet_full' ? totalAmount : walletAmount)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>مبلغ باقیمانده:</span>
                      <span>{formatCurrency(paymentMethod === 'wallet_full' ? 0 : Math.max(0, totalAmount - walletAmount))}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}



          {/* Purchase Form */}
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              {t.enterDetails}
            </p>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Customer Name */}
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.customerName}</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder={t.namePlaceholder}
                          className={`${isRTL ? 'text-right' : 'text-left'} bg-gray-100 dark:bg-gray-700`}
                          readOnly={!!(customerData?.success && customerData.customer)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone Number with conditional graying */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className={isPrimaryMobileDisabled ? 'opacity-60' : ''}>
                      <FormLabel className={isPrimaryMobileDisabled ? 'text-gray-500' : ''}>
                        {isPrimaryMobileDisabled ? t.crmPhoneDisabled : t.deliveryPhone}
                        {isPrimaryMobileDisabled && hasCrmData && (
                          <span className="text-orange-500 mr-2">⚠️</span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="tel"
                          placeholder={t.phonePlaceholder}
                          className={`${isRTL ? 'text-right' : 'text-left'} ${
                            isPrimaryMobileDisabled 
                              ? 'bg-gray-100 text-gray-500 border-gray-300' 
                              : 'bg-gray-100 dark:bg-gray-700'
                          }`}
                          readOnly={!!(customerData?.success && customerData.customer) || isPrimaryMobileDisabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Primary Address Card from CRM */}
                {hasCrmData ? (
                  <div className={`space-y-3 p-4 rounded-lg border ${
                    isPrimaryAddressDisabled 
                      ? 'bg-gray-100 border-gray-300 opacity-60' 
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <h4 className={`font-medium ${
                        isPrimaryAddressDisabled ? 'text-gray-500' : 'text-green-800'
                      }`}>
                        📍 {isPrimaryAddressDisabled ? t.crmAddressDisabled : t.defaultDeliveryAddress}
                        {isPrimaryAddressDisabled && (
                          <span className="text-orange-500 mr-2">⚠️</span>
                        )}
                      </h4>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="bg-white rounded p-3 border border-green-100">
                        <p className={`text-sm font-medium ${
                          isPrimaryAddressDisabled ? 'text-gray-600' : 'text-green-800'
                        }`}>
                          {crmCustomerData?.firstName} {crmCustomerData?.lastName}
                        </p>
                        <p className={`text-sm ${
                          isPrimaryAddressDisabled ? 'text-gray-500' : 'text-green-700'
                        }`}>
                          {crmCustomerData?.address || 'آدرس ثبت نشده'}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <p className={`text-xs ${
                            isPrimaryAddressDisabled ? 'text-gray-500' : 'text-green-600'
                          }`}>
                            📞 {crmCustomerData?.phone}
                          </p>
                          <p className={`text-xs ${
                            isPrimaryAddressDisabled ? 'text-gray-500' : 'text-green-600'
                          }`}>
                            🏙️ {crmCustomerData?.cityRegion || crmCustomerData?.city || crmCustomerData?.province || t.cityNotRegistered}
                          </p>
                          {crmCustomerData?.province && crmCustomerData?.province !== crmCustomerData?.cityRegion && (
                            <p className={`text-xs ${
                              isPrimaryAddressDisabled ? 'text-gray-500' : 'text-green-600'
                            }`}>
                              🏛️ {t.province}: {crmCustomerData.province}
                            </p>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  /* Fallback for non-CRM users */
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.deliveryAddress}</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={3}
                            placeholder={t.addressPlaceholder}
                            className={isRTL ? 'text-right' : 'text-left'}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Second Address Option - Only show for CRM customers */}
                {hasCrmData && (
                  <div className="space-y-3 p-4 bg-blue-50 rounded-lg border">

                    
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t.secondDeliveryAddress}
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSecondAddress(!showSecondAddress)}
                        className="text-blue-600 border-blue-200 hover:bg-blue-100"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {showSecondAddress ? t.removeSecondAddress : t.addSecondAddress}
                      </Button>
                    </div>
                    {showSecondAddress && (
                      <div className="space-y-3">
                        <FormItem>
                          <FormControl>
                            <Textarea 
                              value={secondAddress}
                              onChange={(e) => setSecondAddress(e.target.value)}
                              rows={2}
                              placeholder={t.secondAddressPlaceholder}
                              className={`${isRTL ? 'text-right' : 'text-left'} bg-white`}
                            />
                          </FormControl>
                        </FormItem>
                        
                        {/* Province and City Dropdowns for Second Address */}
                        <div className="grid grid-cols-3 gap-3">
                          {/* Province Dropdown */}
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                              {t.province}
                            </label>
                            <Select 
                              onValueChange={(value) => {
                                // Find the selected province object to get Arabic name
                                const selectedProvince = (provinces as any)?.data?.find((p: any) => 
                                  p.nameEnglish === value || p.name === value
                                );
                                
                                if (selectedProvince) {
                                  // Use Arabic name for delivery calculations
                                  const arabicProvinceName = selectedProvince.nameArabic || selectedProvince.name || value;
                                  setSecondProvince(arabicProvinceName); // Store Arabic name for API calls
                                  setSelectedSecondaryProvinceId(selectedProvince.id);
                                  // Clear city selection when province changes
                                  setSecondCity("");
                                  
                                  console.log('🏛️ [BILINGUAL] Province selected:', {
                                    displayValue: value,
                                    arabicName: arabicProvinceName,
                                    provinceId: selectedProvince.id
                                  });
                                }
                              }} 
                              value={
                                // Find the province with matching Arabic name to show English value
                                (provinces as any)?.data?.find((province: any) => 
                                  (province.nameArabic || province.name) === secondProvince
                                )?.nameEnglish || secondProvince
                              }
                              disabled={isLoadingProvinces}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={
                                  isLoadingProvinces 
                                    ? t.loading
                                    : t.selectProvince
                                } />
                              </SelectTrigger>
                              <SelectContent>
                                {(provinces as any)?.data && Array.isArray((provinces as any).data) && (provinces as any).data.map((province: any) => (
                                  <SelectItem key={province.id} value={province.nameEnglish || province.name}>
                                    {province.nameEnglish} / {province.nameArabic || province.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* City Dropdown */}
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                              {t.city}
                            </label>
                            <Select 
                              onValueChange={(value) => {
                                // Find the selected city object to get Arabic name
                                const selectedCity = secondaryCities?.find((city: any) => 
                                  (city.nameEnglish || city.name) === value
                                );
                                
                                // Use Arabic name for delivery calculations, but display value for UI
                                const arabicCityName = selectedCity?.nameArabic || selectedCity?.name || value;
                                setSecondCity(arabicCityName); // Store Arabic name for API calls
                                
                                console.log('🏙️ [BILINGUAL] City selected:', {
                                  displayValue: value,
                                  arabicName: arabicCityName,
                                  selectedCity: selectedCity
                                });
                              }} 
                              value={
                                // Find the city with matching Arabic name to show English value
                                secondaryCities?.find((city: any) => 
                                  (city.nameArabic || city.name) === secondCity
                                )?.nameEnglish || secondCity
                              }
                              disabled={!selectedSecondaryProvinceId || isLoadingSecondaryCities}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={
                                  !selectedSecondaryProvinceId 
                                    ? t.selectProvinceFirst
                                    : isLoadingSecondaryCities
                                    ? t.loading
                                    : t.selectCity
                                } />
                              </SelectTrigger>
                              <SelectContent>
                                {secondaryCities && Array.isArray(secondaryCities) && secondaryCities.map((city: any) => (
                                  <SelectItem key={city.id} value={city.nameEnglish || city.name}>
                                    {city.nameEnglish} / {city.nameArabic || city.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Postal Code */}
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                              {t.postalCode}
                            </label>
                            <Input 
                              value={secondPostalCode}
                              onChange={(e) => setSecondPostalCode(e.target.value)}
                              placeholder="12345"
                              className={`${isRTL ? 'text-right' : 'text-left'} bg-white`}
                            />
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )}

                {/* Recipient Mobile Number - Only show for CRM customers */}
                {hasCrmData && (
                  <div className="space-y-3 p-4 bg-purple-50 rounded-lg border">

                    
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t.recipientMobileNumber}
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRecipientMobile(!showRecipientMobile)}
                        className="text-purple-600 border-purple-200 hover:bg-purple-100"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {showRecipientMobile ? t.removeRecipientMobile : t.addRecipientMobile}
                      </Button>
                    </div>
                    {showRecipientMobile && (
                      <div className="space-y-3">
                        <FormItem>
                          <FormControl>
                            <Input 
                              value={recipientMobile}
                              onChange={(e) => setRecipientMobile(e.target.value)}
                              type="tel"
                              placeholder={t.recipientMobilePlaceholder}
                              className={`${isRTL ? 'text-right' : 'text-left'} bg-white`}
                            />
                          </FormControl>
                        </FormItem>
                      </div>
                    )}
                  </div>
                )}



                {/* GPS Location */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">{t.gpsLocation}</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGetLocation}
                      disabled={isGettingLocation}
                      className="flex items-center gap-1"
                    >
                      <MapPin className="w-4 h-4" />
                      {isGettingLocation ? t.loading : t.findLocation}
                    </Button>
                  </div>
                  {locationData && (
                    <Badge variant="secondary" className="text-xs">
                      Lat: {locationData.latitude.toFixed(6)}, Lng: {locationData.longitude.toFixed(6)}
                    </Badge>
                  )}
                </div>









                {/* Order Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.orderNotes}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={3}
                          placeholder={t.notesPlaceholder}
                          className={isRTL ? 'text-right' : 'text-left'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Buttons */}
                <div className="flex gap-2 pt-4 no-drag">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 no-drag"
                  >
                    {t.cancel}
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitOrderMutation.isPending || !paymentMethod}
                    className="flex-1 no-drag"
                    onClick={(e) => {
                      console.log('🔘 [BUTTON DEBUG] Submit button clicked - drag protection active');
                      console.log('🔘 [BUTTON DEBUG] Mutation pending:', submitOrderMutation.isPending);
                      console.log('🔘 [BUTTON DEBUG] Form valid:', form.formState.isValid);
                      console.log('🔘 [BUTTON DEBUG] Form errors:', form.formState.errors);
                      console.log('🔘 [BUTTON DEBUG] Selected shipping method:', selectedShippingMethod);
                      console.log('🔘 [BUTTON DEBUG] Payment method:', paymentMethod);
                      
                      // Force form submission if all conditions met
                      if (!submitOrderMutation.isPending && selectedShippingMethod && paymentMethod) {
                        console.log('🔘 [BUTTON DEBUG] Forcing form submission via handleSubmit');
                        form.handleSubmit(onSubmit)();
                      }
                    }}
                  >
                    {submitOrderMutation.isPending ? t.loading : t.submitOrder}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}