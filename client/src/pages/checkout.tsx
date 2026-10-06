import { useState, useEffect, useCallback, useRef } from "react";
import {requiresBulkContractTransport} from "@shared/bulk-transport";
import BulkVehicleSelector from "@/components/checkout/bulk-vehicle-selector";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, ShoppingCart, CreditCard, Truck, User, MapPin, Weight, Car, Calculator, Flame, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getGuestDeliveryFields } from "@/lib/guest-delivery-fields";
import { useLocation } from "wouter";
import AuthModal from "@/components/checkout/auth-modal";
import OrderReviewDialog from "@/components/checkout/order-review-dialog";
import type { ShopContract } from "@/components/checkout/contract-selector";
import { loadCustomerAddresses, saveCustomerAddress } from "@/lib/customer-addresses";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations, type Translation } from "@/lib/i18n";
import { contractTheme } from "@/lib/contract-theme";

const EMPTY_SHIPPING_OPTIONS: any[] = [];
const EMPTY_PAYMENT_SETTINGS: any[] = [];

// Dynamic checkout form validation schema - required fields only if not logged in
const createCheckoutFormSchema = (isLoggedIn: boolean, t: Translation) => z.object({
  // Customer Information (required if not logged in)
  email: isLoggedIn ? z.string().optional() : z.string().email(t.checkout_page.validEmail),
  firstName: isLoggedIn ? z.string().optional() : z.string().min(2, t.checkout_page.minTwoCharacters),
  lastName: isLoggedIn ? z.string().optional() : z.string().min(2, t.checkout_page.minTwoCharacters),
  phone: isLoggedIn ? z.string().optional() : z.string().min(10, t.checkout_page.validPhone),
  company: z.string().optional(),
  
  // Billing Address (pre-filled if logged in)
  billingAddress1: z.string().min(5, t.checkout_page.addressRequired),
  billingAddress2: z.string().optional(),
  billingCity: z.string().min(2, t.checkout_page.cityRequired),
  billingState: z.string().min(2, t.checkout_page.stateRequired),
  billingPostalCode: z.string().min(3, t.checkout_page.postalRequired),
  billingCountry: z.string().min(2, t.checkout_page.countryRequired),
  
  // Shipping Address
  sameAsShipping: z.boolean().default(true),
  shippingAddress1: z.string().optional(),
  shippingAddress2: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingPostalCode: z.string().optional(),
  shippingCountry: z.string().optional(),
  
  // Recipient Information (can be different from customer)
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  recipientAddress: z.string().optional(),
  
  // Second Address Fields
  secondDeliveryAddress: z.string().optional(),
  secondDeliveryCity: z.string().optional(),
  secondDeliveryProvince: z.string().optional(),
  secondDeliveryPostalCode: z.string().optional(),
  recipientMobile: z.string().optional(),
  
  // Order Details
  shippingMethod: z.string().min(1, t.checkout_page.selectShipping),
  paymentMethod: z.string().min(1, t.checkout_page.selectPayment),
  notes: z.string().optional(),
});

type CheckoutFormData = z.infer<ReturnType<typeof createCheckoutFormSchema>>;

const getShippingCenterKey = (center?: {countryCode?: string; provinceId?: number; cityId?: number} | null) =>
  center ? `${center.countryCode || ''}|${center.provinceId || ''}|${center.cityId || ''}` : '';
const isGenuinePickupMethod = (method: any) => {
  const value = String(method?.value || method?.deliveryMethod || method?.delivery_method || '').toLowerCase();
  return method?.isPickup === true || ['pickup', 'personal_pickup', 'self_pickup', 'self-pickup', 'store_pickup'].includes(value);
};

type ContractShippingMode = 'automatic_vehicle' | 'self_transport';

export function getContractShippingMethodId(
  mode: ContractShippingMode | null | undefined,
  methods: readonly any[],
): string | null {
  if (mode === 'automatic_vehicle') {
    const method = methods.find((item) =>
      String(item?.value || item?.deliveryMethod || item?.delivery_method || '').toLowerCase() === 'smart_vehicle',
    );
    return method?.id == null ? null : String(method.id);
  }
  if (mode === 'self_transport') {
    const pickup = methods.find((item) =>
      String(item?.value || item?.deliveryMethod || item?.delivery_method || '').toLowerCase() === 'self_pickup',
    );
    return pickup?.id == null ? null : String(pickup.id);
  }
  return null;
}

interface CheckoutProps {
  cart: {[key: number]: number};
  products: any[];
  onOrderComplete: () => void;
}

export default function Checkout({ cart, products, onOrderComplete }: CheckoutProps) {
  // Language & Translations
  const { language } = useLanguage();
  const t = translations[language];
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isOrderComplete, setIsOrderComplete] = useState(false);
  const [selectedSecondaryProvinceId, setSelectedSecondaryProvinceId] = useState<number | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [deliveryAddressChoice, setDeliveryAddressChoice] = useState('primary');
  const [newAddressTitle, setNewAddressTitle] = useState('');
  const [newAddressPhone, setNewAddressPhone] = useState('');
  const [newAddressCountry, setNewAddressCountry] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewAddressId, setReviewAddressId] = useState('primary');
  const [secondAddressDraft, setSecondAddressDraft] = useState<{
    address: string; city: string; province: string; postalCode: string;
    title: string; phone: string; country: string;
  } | null>(null);
  const [pendingReview, setPendingReview] = useState<{ signature: string } | null>(null);
  const [isConfirmingOrder, setIsConfirmingOrder] = useState(false);
  const confirmingOrderRef = useRef(false);
  const orderSubmissionLockRef = useRef(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [walletBalance, setWalletBalance] = useState(0);
  const [selectedContractId] = useState<number | null>(null);
  const [selectedContractSnapshot, setSelectedContractSnapshot] = useState<ShopContract | undefined>();
  const shippingMethodBeforeContractPolicyRef = useRef<string | undefined>(undefined);
  const [walletAmountToUse, setWalletAmountToUse] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [secondaryPaymentMethod, setSecondaryPaymentMethod] = useState('');
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [showRecipientFields, setShowRecipientFields] = useState(true); // Default to open for testing
  const [showPurchaseOrder, setShowPurchaseOrder] = useState(true);
  const [showCartManagement, setShowCartManagement] = useState(true);
  const [showSecondAddress, setShowSecondAddress] = useState(false);
  const [showRecipientMobile, setShowRecipientMobile] = useState(false);
  
  // Draggable card states
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Mouse event handlers for drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - cardPosition.x,
      y: e.clientY - cardPosition.y
    });
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      setCardPosition({ x: newX, y: newY });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  // Ref to store selected vehicle for use in onSubmit (avoids stale closure issue)
  const selectedVehicleRef = useRef<any>(null);
  const [calculatedShippingCost, setCalculatedShippingCost] = useState(0);
  const [shippingCalculationPending, setShippingCalculationPending] = useState(false);
  const [shippingRouteUnavailable, setShippingRouteUnavailable] = useState(false);
  const [pricedShippingDestination, setPricedShippingDestination] = useState('');
  const [shippingQuote, setShippingQuote] = useState<{
    token: string;
    destination: string;
    centerKey: string;
    cartKey: string;
    createdAt: number;
  } | null>(null);
  const [shippingQuoteRefreshKey, setShippingQuoteRefreshKey] = useState(0);
  const [standardShippingQuote, setStandardShippingQuote] = useState<{
    methodId: string;
    cost: number;
    key: string;
    centerKey: string;
    cartKey: string;
    createdAt: number;
  } | null>(null);
  const shippingRequestSequenceRef = useRef(0);
  const [totalWeight, setTotalWeight] = useState(0);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Get customer information if logged in
  const { data: customerData, refetch: refetchCustomer } = useQuery<any>({
    queryKey: ["/api/customers/me"],
    retry: false,
  });
  const { data: savedCustomerAddresses = [], refetch: refetchSavedCustomerAddresses } = useQuery({
    queryKey: ['structuredCustomerAddresses'],
    queryFn: loadCustomerAddresses,
    enabled: !!customerData?.success,
  });

  // Get available delivery methods
  const { data: deliveryMethods = EMPTY_SHIPPING_OPTIONS } = useQuery<any[]>({
    queryKey: ['/api/checkout/delivery-methods']
  });

  // Get payment method settings to determine enabled payment methods
  const { data: paymentSettingsResponse } = useQuery<{success: boolean, data: any[]}>({
    queryKey: ['/api/public/payment-methods'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  const paymentSettings = paymentSettingsResponse?.data || EMPTY_PAYMENT_SETTINGS;
  const isWalletPaymentMethod = (method: unknown) => {
    const value = String(method || '').toLowerCase();
    return value === 'wallet' || value.startsWith('wallet_');
  };
  const getSupportedNonWalletPaymentMethod = () => {
    const availableMethod = paymentSettings.find((setting: any) =>
      setting.enabled && !isWalletPaymentMethod(setting.methodKey)
    );
    return availableMethod?.methodKey || (paymentSettings.length === 0 ? 'bank_receipt' : '');
  };
  const contractNonWalletPaymentNote = language === 'fa'
    ? 'برای سفارش قراردادی پرداخت با کیف پول مجاز نیست؛ لطفاً یک روش پرداخت غیرکیف‌پولی انتخاب کنید.'
    : language === 'ar'
      ? 'لا يُسمح بالدفع من المحفظة للطلبات التعاقدية؛ يرجى اختيار طريقة دفع أخرى غير المحفظة.'
      : language === 'tr'
        ? 'Sözleşmeli siparişlerde cüzdanla ödeme kullanılamaz; lütfen cüzdan dışı bir ödeme yöntemi seçin.'
        : 'Wallet payment is not available for contract orders. Please choose a non-wallet payment method.';

  // Keep delivery destinations within the globally configured logistics center country.
  const { data: shippingCenterResponse, refetch: refetchShippingCenter } = useQuery<{success?: boolean, data?: {countryCode?: string; provinceId?: number; cityId?: number}}>({
    queryKey: ['/api/logistics/shipping-center'],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });
  const shippingCenterKey = getShippingCenterKey(shippingCenterResponse?.data);
  const shippingCenterKeyRef = useRef(shippingCenterKey);
  const [pricedShippingCenterKey, setPricedShippingCenterKey] = useState('');
  useEffect(() => {
    shippingCenterKeyRef.current = shippingCenterKey;
  }, [shippingCenterKey]);
  const shippingCenterCountry = shippingCenterResponse?.data?.countryCode || '';
  const { data: geographyCountriesResponse } = useQuery<{success?: boolean, data?: any[]}>({
    queryKey: ['/api/geography/countries'],
    staleTime: 15 * 60 * 1000,
  });
  const geographyCountries = geographyCountriesResponse?.data || [];
  const resolveCountryCode = (country: string | undefined) => {
    if (!country) return '';
    const normalized = country.trim().toLowerCase();
    const record = geographyCountries.find((item: any) =>
      [item.code, item.countryCode, item.name, item.nameEn, item.nameEnglish, item.name_en, item.nameArabic, item.name_arabic, item.namePersian, item.nameFa, item.name_fa, item.nameTurkish, item.nameTr, item.name_tr]
        .some((name: any) => typeof name === 'string' && name.trim().toLowerCase() === normalized)
    );
    return String(record?.code || record?.countryCode || (country.length <= 3 ? country : '')).toUpperCase();
  };
  const shippingCenterCountryCode = resolveCountryCode(shippingCenterCountry) || shippingCenterCountry.toUpperCase();

  const { data: provincesData, isLoading: provincesLoading } = useQuery<{success: boolean, data: any[]}>({
    queryKey: [`/api/geography/regions?country=${shippingCenterCountry}`],
    enabled: !!shippingCenterCountry,
    staleTime: 15 * 60 * 1000, // Consider fresh for 15 minutes
  });

  const { data: citiesData, isLoading: citiesLoading } = useQuery<{success: boolean, data: any[]}>({
    queryKey: [`/api/geography/cities?regionId=${selectedSecondaryProvinceId}`],
    enabled: selectedSecondaryProvinceId !== null,
    staleTime: 10 * 60 * 1000,
  });

  // Extract provinces and cities arrays from API responses with proper type safety
  const provinces = (provincesData?.success && Array.isArray(provincesData.data)) ? provincesData.data : EMPTY_SHIPPING_OPTIONS;
  const secondaryCities = (citiesData?.success && Array.isArray(citiesData.data)) ? citiesData.data : EMPTY_SHIPPING_OPTIONS;
  const geographyName = (place: any) => {
    if (!place) return '';
    if (language === 'fa') return place.namePersian || place.nameFa || place.name_fa || place.name || place.nameEn || place.nameEnglish || '';
    if (language === 'ar') return place.nameArabic || place.name_arabic || place.name || place.nameEn || place.nameEnglish || '';
    if (language === 'tr') return place.nameTurkish || place.nameTr || place.name_tr || place.name || place.nameEn || place.nameEnglish || '';
    return place.nameEn || place.name_en || place.nameEnglish || place.name || place.nameArabic || '';
  };
  const canonicalGeographyName = (place: any) => place?.nameEnglish || place?.nameEn || place?.name_en || place?.name || geographyName(place);

  // Debug logging for dropdown data
  console.log('🔍 [DROPDOWN DEBUG] Provinces data:', {
    raw: provincesData,
    processed: provinces,
    count: provinces.length,
    loading: provincesLoading,
    isArray: Array.isArray(provinces)
  });
  
  console.log('🔍 [DROPDOWN DEBUG] Cities data:', {
    raw: citiesData,
    processed: secondaryCities,
    count: secondaryCities.length,
    loading: citiesLoading,
    selectedProvinceId: selectedSecondaryProvinceId,
    isArray: Array.isArray(secondaryCities)
  });

  // Determine if user is logged in first
  const isUserLoggedIn = (customerData?.success && customerData.customer) || isLoggedIn;
  const {
    data: contracts = [],
    isLoading: contractsLoading,
    isError: contractsError,
    refetch: refetchContracts,
  } = useQuery<ShopContract[]>({
    queryKey: ['/api/shop/contracts/mine'],
    queryFn: async () => {
      const response: any = await apiRequest('/api/shop/contracts/mine', { method: 'GET' });
      if (response?.success === false) {
        throw new Error(response.message || 'Could not load customer contracts');
      }
      const results = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.contracts)
            ? response.contracts
            : response?.data?.contracts;
      if (!Array.isArray(results)) throw new Error('Invalid contracts response');
      return results;
    },
    enabled: selectedContractId !== null && !!isUserLoggedIn,
    retry: false,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
  
  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(createCheckoutFormSchema(!!isUserLoggedIn, t)),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      company: "",
      billingAddress1: "",
      billingAddress2: "",
      billingCity: "",
      billingState: "",
      billingPostalCode: "",
      billingCountry: shippingCenterCountry || "Iraq",
      sameAsShipping: true,
      shippingMethod: "",
      paymentMethod: "",
      notes: "",
      // Secondary address fields
      secondDeliveryAddress: "",
      secondDeliveryCity: "",
      secondDeliveryProvince: "",
      secondDeliveryPostalCode: "",
      recipientMobile: "",
    },
  });

  useEffect(() => {
    if (shippingCenterCountry && !customerData?.customer) {
      const currentCountry = form.getValues('billingCountry');
      if (!currentCountry || currentCountry === 'Iraq' || currentCountry === 'Iran') {
        form.setValue('billingCountry', shippingCenterCountry);
      }
    }
  }, [shippingCenterCountry, customerData?.customer, form]);

  // Get selected delivery method details  
  const selectedMethodId = form.watch('shippingMethod');
  const selectedMethod = deliveryMethods?.find((method: any) => method.id?.toString() === selectedMethodId);

  // Watch for changes in second address and mobile fields to gray out primary fields
  const watchSecondAddress = form.watch('secondDeliveryAddress');
  const watchRecipientMobile = form.watch('recipientMobile');
  
  // Determine if primary fields should be disabled (grayed out)
  const isPrimaryAddressDisabled = !!(watchSecondAddress && watchSecondAddress.trim());
  const isPrimaryMobileDisabled = !!(watchRecipientMobile && watchRecipientMobile.trim());

  // Debug conditional graying out
  console.log('🎯 [CONDITIONAL DEBUG] Watch values:', {
    watchSecondAddress,
    watchRecipientMobile,
    isPrimaryAddressDisabled,
    isPrimaryMobileDisabled
  });

  // Auto-fill form with customer data when available
  useEffect(() => {
    if (customerData?.success && customerData.customer) {
      const customer = customerData.customer;
      setIsLoggedIn(true);
      
      console.log('🔍 [FORM DEBUG] Customer data received:', customer);
      
      // Fill form with customer data from CRM
      form.setValue("email", customer.email || "");
      form.setValue("firstName", customer.firstName || "");
      form.setValue("lastName", customer.lastName || "");
      form.setValue("phone", customer.phone || "");
      form.setValue("company", customer.company || "");
      
      // Auto-fill address data from CRM as default delivery address
      if (customer.address) {
        form.setValue("billingAddress1", customer.address);
        form.setValue("shippingAddress1", customer.address); // Set as default shipping address
        console.log('✅ [FORM DEBUG] Address set:', customer.address);
      }
      
      // Use cityRegion as city if regular city is not available
      const customerCity = customer.city || customer.cityRegion || "";
      if (customerCity) {
        form.setValue("billingCity", customerCity);
        form.setValue("shippingCity", customerCity); // Set as default shipping city
        console.log('✅ [FORM DEBUG] City set:', customerCity);
      }
      
      if (customer.country) {
        form.setValue("billingCountry", customer.country);
        form.setValue("shippingCountry", customer.country); // Set as default shipping country
        console.log('✅ [FORM DEBUG] Country set:', customer.country);
      }
      
      if (customer.postalCode) {
        form.setValue("billingPostalCode", customer.postalCode);
        form.setValue("shippingPostalCode", customer.postalCode); // Set as default shipping postal code
        console.log('✅ [FORM DEBUG] Postal code set:', customer.postalCode);
      }
      
      // Use province/state from CRM as default - prioritize province, then state, then cityRegion, then city
      const defaultState = customer.province || customer.state || customer.cityRegion || customer.city || "";
      if (defaultState) {
        form.setValue("billingState", defaultState);
        form.setValue("shippingState", defaultState); // Set as default shipping state
        console.log('✅ [FORM DEBUG] State set:', defaultState);
      }
      
      // Set destination city for delivery calculation
      if (customerCity) {
        console.log('✅ [FORM DEBUG] Destination city set for delivery:', customerCity);
      }
      
      // Auto-fill recipient information with customer data as default
      if (customer.firstName && customer.lastName) {
        form.setValue("recipientName", `${customer.firstName} ${customer.lastName}`);
        console.log('✅ [FORM DEBUG] Recipient name set:', `${customer.firstName} ${customer.lastName}`);
      }
      if (customer.phone) {
        form.setValue("recipientPhone", customer.phone);
        form.setValue("recipientMobile", customer.phone); // Set as default recipient mobile
        console.log('✅ [FORM DEBUG] Recipient phone set:', customer.phone);
      }
      
      // Legacy CRM secondaryAddress is a combined display string with no
      // separately stored city. Choose a structured saved address instead.
      if (customer.alternatePhone) {
        form.setValue("recipientMobile", customer.alternatePhone);
      }

      // Debug: Log all form values after setting
      setTimeout(() => {
        const currentValues = form.getValues();
        console.log('🔍 [FORM DEBUG] All form values after customer data fill:', currentValues);
      }, 100);
      
    } else {
      setIsLoggedIn(false);
      console.log('❌ [FORM DEBUG] No customer data available or login failed');
    }
  }, [customerData, form, isLoggedIn]);


  // Fetch wallet balance for logged in users
  const fetchWalletBalance = async () => {
    if (!isUserLoggedIn) return;
    
    try {
      const response = await fetch('/api/customers/wallet/balance', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setWalletBalance(result.balance || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };



  // Move this useEffect after beforeWalletTotal calculation

  useEffect(() => {
    if (isUserLoggedIn) {
      fetchWalletBalance();
    }
  }, [isUserLoggedIn]);

  // Set customer info from query data
  useEffect(() => {
    if (customerData && customerData.user) {
      setCustomerInfo(customerData.user);
    }
  }, [customerData]);

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
    const basePrice = parseFloat(product.price || '0');
    const discounts = getEffectiveDiscounts(product);
    if (discounts.length > 0) {
      const sortedDiscounts = discounts
        .filter((d: any) => quantity >= parseInt(d.minQty || d.min_qty || 0))
        .sort((a: any, b: any) => parseInt(b.minQty || b.min_qty || 0) - parseInt(a.minQty || a.min_qty || 0));
      if (sortedDiscounts.length > 0) {
        const discount = sortedDiscounts[0];
        const discountValue = discount.discount || (parseFloat(discount.discountPercent || discount.discount_percent || 0) / 100);
        return basePrice * (1 - discountValue);
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

  const selectedContractFromQuery = selectedContractId === null
    ? undefined
    : contracts.find(contract => Number(contract.id) === Number(selectedContractId));
  const selectedContract = selectedContractFromQuery || (selectedContractId === null ? undefined : selectedContractSnapshot);
  const hasBulkContractProducts=requiresBulkContractTransport(selectedContractId,Object.keys(cart)
    .map(id=>products.find((product:any)=>Number(product.id)===Number(id))).filter(Boolean) as any[]);
  const [bulkVehicleTemplateId,setBulkVehicleTemplateId]=useState("");
  useEffect(()=>setBulkVehicleTemplateId(""),[selectedContractId,hasBulkContractProducts]);
  const selectedContractShippingMode = (selectedContract as (ShopContract & { shippingMode?: ContractShippingMode | null }) | undefined)?.shippingMode ||
    (hasBulkContractProducts?"automatic_vehicle":null);
  const requiredContractShippingMethodId = getContractShippingMethodId(selectedContractShippingMode, deliveryMethods);
  const hasEnforcedContractShippingMode = selectedContractShippingMode === 'automatic_vehicle' || selectedContractShippingMode === 'self_transport';
  const contractShippingMethodNotice = !hasEnforcedContractShippingMode
    ? ''
    : requiredContractShippingMethodId
      ? selectedContractShippingMode === 'automatic_vehicle'
        ? language === 'fa' ? 'طبق قرارداد، خودرو به‌صورت خودکار توسط سیستم انتخاب می‌شود.' : language === 'ar' ? 'وفقاً للعقد، يختار النظام المركبة تلقائياً.' : language === 'tr' ? 'Sözleşmeye göre araç sistem tarafından otomatik seçilir.' : 'Per the contract, the system automatically selects the vehicle.'
        : language === 'fa' ? 'طبق قرارداد، روش تحویل «حمل توسط خودم» است و هزینهٔ حمل خودرو محاسبه نمی‌شود.' : language === 'ar' ? 'وفقاً للعقد، طريقة التسليم هي «النقل الذاتي» ولا تُحسب أجرة مركبة.' : language === 'tr' ? 'Sözleşmeye göre teslimat «Kendi taşımanız»dır; araç ücreti hesaplanmaz.' : 'Per the contract, delivery is “Self transport”; vehicle shipping is not charged.'
      : language === 'fa' ? 'روش حمل تعیین‌شده در قرارداد در حال حاضر در دسترس نیست. برای ادامه با مدیر فروش تماس بگیرید.' : language === 'ar' ? 'طريقة النقل المحددة في العقد غير متاحة حالياً. يرجى التواصل مع مدير المبيعات.' : language === 'tr' ? 'Sözleşmedeki taşıma yöntemi şu anda kullanılamıyor. Lütfen satış yöneticisiyle iletişime geçin.' : 'The shipping method required by this contract is unavailable. Please contact sales.';
  useEffect(() => {
    if (hasEnforcedContractShippingMode) {
      if (deliveryMethods.length === 0) return;
      const currentShippingMethod = form.getValues('shippingMethod');
      if (shippingMethodBeforeContractPolicyRef.current === undefined) {
        shippingMethodBeforeContractPolicyRef.current = currentShippingMethod;
      }
      const nextMethod = requiredContractShippingMethodId || '';
      if (currentShippingMethod !== nextMethod) {
        form.setValue('shippingMethod', nextMethod, { shouldDirty: true, shouldValidate: true });
      }
      return;
    }
    if (shippingMethodBeforeContractPolicyRef.current !== undefined) {
      form.setValue('shippingMethod', shippingMethodBeforeContractPolicyRef.current, { shouldDirty: true, shouldValidate: true });
      shippingMethodBeforeContractPolicyRef.current = undefined;
    }
  }, [deliveryMethods, form, hasEnforcedContractShippingMode, requiredContractShippingMethodId, selectedContractId]);

  useEffect(() => {
    if (selectedContractFromQuery) setSelectedContractSnapshot(selectedContractFromQuery);
    else if (selectedContractId === null) setSelectedContractSnapshot(undefined);
  }, [selectedContractFromQuery, selectedContractId]);
  const getContractValidationError = (
    contractId: number | null,
    availableContracts: ShopContract[],
    isLoading: boolean,
    hasError: boolean,
  ): string | null => {
    if (contractId === null) return null;
    if (isLoading) return 'Verifying the selected contract. Please wait before continuing.';
    if (hasError) return 'The selected contract could not be verified. Please retry before continuing.';
    const contract = availableContracts.find(item => Number(item.id) === Number(contractId));
    if (!contract || !contract.isActive) return 'The selected contract is no longer available or active. Select another purchase type.';
    for (const [productId, quantity] of Object.entries(cart)) {
      const item = contract.items?.find(contractItem => Number(contractItem.productId) === Number(productId));
      if (!item) return `Product ${productId} is not listed in contract #${contract.number}. Remove it or choose a normal purchase.`;
      if (!products.some(product => Number(product.id) === Number(productId))) {
        return `Product ${productId} is unavailable. Refresh the cart before using this contract.`;
      }
      if (!Number.isFinite(Number(item.remainingQuantity)) || Number(item.remainingQuantity) < 0 ||
        Number(quantity) > Number(item.remainingQuantity)) {
        return `${item.productName} exceeds the remaining contract quantity (${item.remainingQuantity}).`;
      }
      if (!Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0) {
        return `The contract price for ${item.productName} is invalid. Please contact support.`;
      }
    }
    return null;
  };
  const contractValidationError = getContractValidationError(
    selectedContractId,
    contracts,
    contractsLoading,
    contractsError,
  );

  // Calculate order totals
  const cartItems = Object.entries(cart).map(([productId, quantity]) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (!product) return null;
    const contractItem = selectedContract?.items?.find(item => Number(item.productId) === Number(product.id));
    const discountedUnitPrice = contractItem
      ? Number(contractItem.unitPrice)
      : getDiscountedPrice(product, quantity);
    const basePrice = parseFloat(product.price || '0');
    const hasDiscount = !contractItem && discountedUnitPrice < basePrice;
    return {
      ...product,
      quantity,
      discountedUnitPrice,
      hasDiscount,
      usesContractPrice: Boolean(contractItem),
      originalUnitPrice: contractItem ? discountedUnitPrice : basePrice,
      totalPrice: discountedUnitPrice * quantity
    };
  }).filter(Boolean);
  const shippingQuoteCartKey = JSON.stringify(
    [selectedContractId,bulkVehicleTemplateId,hasBulkContractProducts,Object.entries(cart)
      .map(([productId, quantity]) => [Number(productId), Number(quantity)])
      .sort((a, b) => Number(a[0]) - Number(b[0]))]
  );

  const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);

  // Check if cart contains flammable materials
  const containsFlammableProducts = cartItems.some(item => item?.isFlammable === true);
  
  // Debug log for flammable materials detection
  useEffect(() => {
    console.log('🔥 [FLAMMABLE CHECK]', {
      containsFlammableProducts,
      cartItems: cartItems.length,
      flammableItems: cartItems.filter(item => item?.isFlammable === true).map(item => ({ name: item.name, isFlammable: item.isFlammable }))
    });
  }, [containsFlammableProducts, cartItems]);

  // Calculate total weight of cart items
  useEffect(() => {
    const weight = cartItems.reduce((sum, item) => {
      const itemWeight = parseFloat(item?.weight || '1'); // Default 1kg if not specified
      return sum + (itemWeight * item.quantity);
    }, 0);
    setTotalWeight(weight);
  }, [cartItems]);
  
  // Calculate shipping cost with smart vehicle selection using backend API
  // Returns { cost, vehicle } object instead of just cost to avoid stale closure issue
  const calculateShippingCost = useCallback(async (weight: number, destination: string, requestSequence: number): Promise<{ cost: number; vehicle: any | null }> => {
    if (!destination || weight === 0) return { cost: 0, vehicle: null };
    const isCurrent = () => requestSequence === shippingRequestSequenceRef.current;
    
    try {
      setPricedShippingCenterKey('');
      setShippingQuote(null);
      const refreshedCenter = await refetchShippingCenter();
      if (!isCurrent()) return { cost: 0, vehicle: null };
      const quoteCenterKey = getShippingCenterKey(refreshedCenter.data?.data);
      if (refreshedCenter.isError || !quoteCenterKey) {
        setShippingRouteUnavailable(true);
        return { cost: 0, vehicle: null };
      }
      shippingCenterKeyRef.current = quoteCenterKey;

      // Look up the destination city to get its provinceId
      const destCity = secondaryCities?.find((city: any) =>
        [city.nameEn, city.name_en, city.nameEnglish, city.nameArabic, city.name_arabic, city.namePersian, city.nameFa, city.name_fa, city.nameTurkish, city.nameTr, city.name_tr, city.name]
          .some((name) => name && name.toLowerCase() === destination.toLowerCase())
      );
      
      const provinceId = destCity?.regionId || destCity?.provinceId || null;
      const destProvince = provinces.find((province: any) => Number(province.id) === Number(provinceId));
      
      console.log('🚚 [CHECKOUT] Using FLAMMABLE-AWARE delivery cost API:', { 
        weight, 
        destination,
        resolvedCity: destCity?.nameEnglish || destCity?.name || destination,
        provinceId,
        containsFlammableProducts,
        cartProducts: cartItems.map(item => ({ id: item.id, name: item.name, isFlammable: item.isFlammable }))
      });
      
      // Use the flammable-aware calculate-delivery-cost API instead of old vehicle selection
      const response = await fetch('/api/calculate-delivery-cost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weight: weight,
          contractId:selectedContractId,
          selectedVehicleTemplateId:hasBulkContractProducts&&bulkVehicleTemplateId?Number(bulkVehicleTemplateId):null,
          destinationCity: destination,
          destinationProvince: destProvince?.nameEnglish || destProvince?.name || destination,
          ...(destCity?.id != null ? { destinationCityId: destCity.id } : {}),
          cart: Object.fromEntries(Object.entries(cart).map(([id, qty]) => [id, qty])),
          useSecondaryAddress: false
        })
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => null);
        if (!isCurrent()) return { cost: 0, vehicle: null };
        console.error('🚚 [CHECKOUT] Delivery cost calculation failed:', response.status, errorResult);
        setShippingRouteUnavailable(true);
        return { cost: 0, vehicle: null };
      }

      const result = await response.json();
      if (!isCurrent()) return { cost: 0, vehicle: null };
      console.log('🚚 [CHECKOUT] API Response:', result);
      
      if (result.success && result.data) {
        // Handle intercity bus response
        if (result.data.transportMethod === 'intercity_bus' && result.data.selectedOption) {
          const busOption = result.data.selectedOption;
          const busCost = Number(busOption.totalCost);
          if (!Number.isFinite(busCost) || busCost < 0) {
            setShippingRouteUnavailable(true);
            return { cost: 0, vehicle: null };
          }
          if (shippingCenterKeyRef.current !== quoteCenterKey) {
            setShippingRouteUnavailable(true);
            return { cost: 0, vehicle: null };
          }
          const vehicleData = {
            name: busOption.transportName,
            type: 'intercity_bus',
            cost: busCost,
            restrictions: busOption.restrictions
          };
          setSelectedVehicle(vehicleData);
          selectedVehicleRef.current = vehicleData;
          
          console.log('🚌 [CHECKOUT] Intercity bus selected:', {
            option: busOption.transportName,
            cost: busOption.totalCost,
            restrictions: busOption.restrictions
          });
          setPricedShippingDestination(`${destination}|${weight}`);
          setPricedShippingCenterKey(quoteCenterKey);
          setShippingQuote(typeof result.data.shippingQuoteToken === 'string' && result.data.shippingQuoteToken
            ? {
                token: result.data.shippingQuoteToken,
                destination: `${destination}|${weight}`,
                centerKey: quoteCenterKey,
                cartKey: shippingQuoteCartKey,
                createdAt: Date.now()
              }
            : null);
          setShippingRouteUnavailable(!(typeof result.data.shippingQuoteToken === 'string' && result.data.shippingQuoteToken));
          
          return { cost: busCost, vehicle: vehicleData };
        }
        
        // Handle optimal vehicle response
        if (result.data.optimalVehicle) {
          const vehicleInfo = result.data.optimalVehicle;
          const vehicleCost = Number(vehicleInfo.totalCost);
          if (!Number.isFinite(vehicleCost) || vehicleCost < 0) {
            setShippingRouteUnavailable(true);
            return { cost: 0, vehicle: null };
          }
          if (shippingCenterKeyRef.current !== quoteCenterKey) {
            setShippingRouteUnavailable(true);
            return { cost: 0, vehicle: null };
          }
          const vehicleData = {
            name: vehicleInfo.vehicleName,
            type: vehicleInfo.vehicleType,
            cost: vehicleCost,
            maxWeight: vehicleInfo.maxWeight,
            estimatedTime: vehicleInfo.estimatedTime
          };
          setSelectedVehicle(vehicleData);
          selectedVehicleRef.current = vehicleData;
          
          console.log('🚚 [CHECKOUT] Heavy vehicle selected for flammable materials:', {
            vehicle: vehicleInfo.vehicleName,
            totalCost: vehicleInfo.totalCost,
            vehicleType: vehicleInfo.vehicleType,
            safetyCompliant: true
          });
          setPricedShippingDestination(`${destination}|${weight}`);
          setPricedShippingCenterKey(quoteCenterKey);
          setShippingQuote(typeof result.data.shippingQuoteToken === 'string' && result.data.shippingQuoteToken
            ? {
                token: result.data.shippingQuoteToken,
                destination: `${destination}|${weight}`,
                centerKey: quoteCenterKey,
                cartKey: shippingQuoteCartKey,
                createdAt: Date.now()
              }
            : null);
          setShippingRouteUnavailable(!(typeof result.data.shippingQuoteToken === 'string' && result.data.shippingQuoteToken));
          
          return { cost: vehicleCost, vehicle: vehicleData };
        }
      }
      
      console.error('🚚 [CHECKOUT] No suitable delivery option found in API response');
      setShippingRouteUnavailable(true);
      setShippingQuote(null);
      return { cost: 0, vehicle: null };
      
    } catch (error) {
      if (!isCurrent()) return { cost: 0, vehicle: null };
      console.error('🚚 [CHECKOUT] Delivery cost calculation error:', error);
      setShippingRouteUnavailable(true);
      setShippingQuote(null);
      return { cost: 0, vehicle: null };
    }
  }, [containsFlammableProducts, cart, shippingQuoteCartKey, secondaryCities, provinces, refetchShippingCenter,selectedContractId,hasBulkContractProducts,bulkVehicleTemplateId]);

  const guestDeliveryFields = getGuestDeliveryFields({
    sameAsShipping: form.watch('sameAsShipping'),
    billingCity: form.watch('billingCity'),
    billingState: form.watch('billingState'),
    billingCountry: form.watch('billingCountry'),
    billingPostalCode: form.watch('billingPostalCode'),
    shippingCity: form.watch('shippingCity'),
    shippingState: form.watch('shippingState'),
    shippingCountry: form.watch('shippingCountry'),
    shippingPostalCode: form.watch('shippingPostalCode'),
  });
  const enteredSecondAddress = form.watch('secondDeliveryAddress')?.trim() || '';
  const usingEnteredDeliveryAddress = !!(isUserLoggedIn &&
    (deliveryAddressChoice === 'new' || deliveryAddressChoice === 'legacy'));
  const activeDeliveryAddress = isUserLoggedIn
    ? (usingEnteredDeliveryAddress
      ? enteredSecondAddress
      : selectedAddress ? selectedAddress.address || '' : customerData?.customer?.address || '')
    : (form.watch('sameAsShipping') ? form.watch('billingAddress1') : form.watch('shippingAddress1')) || '';
  const destinationCity = isUserLoggedIn
    ? (usingEnteredDeliveryAddress
      ? form.watch('secondDeliveryCity') || ''
      : selectedAddress
        ? selectedAddress.city || ''
        : customerData?.customer?.city || customerData?.customer?.cityRegion || form.watch('billingCity') || '')
    : guestDeliveryFields.city;

  const selectedShippingMethodId = form.watch('shippingMethod');
  const currentShippingMethod = (deliveryMethods as any[])?.find((method: any) => method.id.toString() === selectedShippingMethodId);
  const currentMethodValue = String(currentShippingMethod?.value || currentShippingMethod?.deliveryMethod || currentShippingMethod?.delivery_method || '').toLowerCase();
  const isSmartVehicleShipping = currentMethodValue === 'smart_vehicle' || currentMethodValue.includes('bus');
  const destinationProvince = isUserLoggedIn
    ? (usingEnteredDeliveryAddress
      ? form.watch('secondDeliveryProvince') || ''
      : selectedAddress ? selectedAddress.state || '' : customerData?.customer?.province || '')
    : guestDeliveryFields.province;
  const destinationCountry = isUserLoggedIn
    ? (deliveryAddressChoice === 'new' || deliveryAddressChoice === 'legacy'
      ? newAddressCountry || ''
      : selectedAddress ? selectedAddress.country || '' : customerData?.customer?.country || '')
    : guestDeliveryFields.country;
  const deliveryAddressReady = !!activeDeliveryAddress.trim() &&
    !!destinationCity.trim() && !!destinationCountry.trim();
  const deliveryAddressPrompt = language === 'fa'
    ? 'ابتدا آدرس و شهر تحویل را مشخص کنید.'
    : language === 'ar' ? 'حدد عنوان ومدينة التسليم أولاً.'
    : language === 'tr' ? 'Önce teslimat adresini ve şehrini belirtin.'
    : 'Choose a delivery address and city first.';
  const standardQuoteKey = JSON.stringify([
    selectedShippingMethodId,
    selectedContractId,
    activeDeliveryAddress,
    destinationCity,
    destinationProvince,
    destinationCountry,
    totalWeight,
    shippingQuoteCartKey,
  ]);

  // Requote the active delivery method whenever its route, cart, center, or method changes.
  useEffect(() => {
    const method = (deliveryMethods as any[])?.find((item: any) => item.id?.toString() === selectedShippingMethodId);
    const methodValue = String(method?.value || method?.deliveryMethod || method?.delivery_method || '').toLowerCase();
    const isPickup = isGenuinePickupMethod(method);
    const isSmart = methodValue === 'smart_vehicle' || methodValue.includes('bus');
    const requestSequence = ++shippingRequestSequenceRef.current;
    const quoteController = new AbortController();

    setStandardShippingQuote(null);
    setShippingQuote(null);
    setPricedShippingDestination('');
    setPricedShippingCenterKey('');
    setSelectedVehicle(null);
    selectedVehicleRef.current = null;
    setCalculatedShippingCost(0);
    setShippingRouteUnavailable(false);

    if (contractValidationError) {
      setShippingCalculationPending(false);
      setShippingRouteUnavailable(true);
      return () => {
        if (shippingRequestSequenceRef.current === requestSequence) shippingRequestSequenceRef.current++;
        quoteController.abort();
      };
    }

    if (!method || isPickup) {
      setShippingCalculationPending(false);
      return () => {
        if (shippingRequestSequenceRef.current === requestSequence) shippingRequestSequenceRef.current++;
        quoteController.abort();
      };
    }
    if (!deliveryAddressReady || totalWeight <= 0) {
      setShippingCalculationPending(false);
      setShippingRouteUnavailable(false);
      return () => {
        if (shippingRequestSequenceRef.current === requestSequence) shippingRequestSequenceRef.current++;
        quoteController.abort();
      };
    }

    setShippingCalculationPending(true);
    const quoteDestinationCity = destinationCity;
    const quoteProvince = destinationProvince;
    const quoteCountryCode = resolveCountryCode(destinationCountry) || (destinationCountry.length <= 3 ? destinationCountry.toUpperCase() : '');
    const quoteKey = standardQuoteKey;

    const updatePrice = async () => {
      try {
        if (isSmart) {
          const result = await calculateShippingCost(totalWeight, quoteDestinationCity, requestSequence);
          if (requestSequence !== shippingRequestSequenceRef.current) return;
          setCalculatedShippingCost(result.cost);
          if (result.vehicle) {
            setSelectedVehicle(result.vehicle);
            selectedVehicleRef.current = result.vehicle;
          }
          return;
        }

        let centerRefreshTimeout: ReturnType<typeof setTimeout> | undefined;
        let refreshedCenter;
        try {
          refreshedCenter = await Promise.race([
            refetchShippingCenter(),
            new Promise<never>((_, reject) => {
              centerRefreshTimeout = setTimeout(() => reject(new Error('Shipping center refresh timed out')), 12000);
            }),
          ]);
        } finally {
          if (centerRefreshTimeout) clearTimeout(centerRefreshTimeout);
        }
        if (requestSequence !== shippingRequestSequenceRef.current) return;
        const quoteCenterKey = getShippingCenterKey(refreshedCenter.data?.data);
        if (refreshedCenter.isError || !quoteCenterKey) {
          throw new Error('Shipping center is unavailable');
        }
        shippingCenterKeyRef.current = quoteCenterKey;

        const matchingCity = secondaryCities?.find((city: any) =>
          [city.nameEn, city.name_en, city.nameEnglish, city.nameArabic, city.name_arabic, city.namePersian, city.nameFa, city.name_fa, city.nameTurkish, city.nameTr, city.name_tr, city.name]
            .some((name) => name && name.toLowerCase() === quoteDestinationCity.toLowerCase())
        );
        const quoteTimeout = setTimeout(() => quoteController.abort(), 12000);
        let response: Response;
        let result: any;
        try {
          response = await fetch('/api/shipping/quote-standard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            signal: quoteController.signal,
            body: JSON.stringify({
              cart: Object.fromEntries(Object.entries(cart).map(([id, quantity]) => [id, quantity])),
              contractId: selectedContractId,
              ...(matchingCity?.id != null ? { destinationCityId: matchingCity.id } : {}),
              destinationCity: quoteDestinationCity,
              ...(quoteProvince ? { destinationProvince: quoteProvince } : {}),
              ...(quoteCountryCode ? { destinationCountryCode: quoteCountryCode } : {}),
              shippingMethod: selectedShippingMethodId,
              selectorIsDeliveryMethod: true,
            }),
          });
          const contentType = response.headers.get('content-type') || '';
          result = contentType.includes('application/json')
            ? await response.json().catch(() => null)
            : null;
        } finally {
          clearTimeout(quoteTimeout);
        }
        if (requestSequence !== shippingRequestSequenceRef.current) return;
        const rawCost = result?.data?.shippingCost;
        const cost = Number(rawCost);
        if (!response.ok || !result?.success ||
          (typeof rawCost !== 'number' && typeof rawCost !== 'string') ||
          String(rawCost).trim() === '' || !Number.isFinite(cost) || cost < 0) {
          throw new Error('No standard shipping quote for this route');
        }
        if (requestSequence !== shippingRequestSequenceRef.current || shippingCenterKeyRef.current !== quoteCenterKey) return;
        setCalculatedShippingCost(cost);
        setPricedShippingDestination(`${quoteDestinationCity}|${totalWeight}`);
        setPricedShippingCenterKey(quoteCenterKey);
        setStandardShippingQuote({
          methodId: selectedShippingMethodId,
          cost,
          key: quoteKey,
          centerKey: quoteCenterKey,
          cartKey: shippingQuoteCartKey,
          createdAt: Date.now(),
        });
        setShippingRouteUnavailable(false);
      } catch (error) {
        if (requestSequence !== shippingRequestSequenceRef.current) return;
        console.error('[CHECKOUT] Shipping quote failed:', error);
        setShippingRouteUnavailable(true);
        setShippingQuote(null);
        setStandardShippingQuote(null);
      } finally {
        if (requestSequence === shippingRequestSequenceRef.current) setShippingCalculationPending(false);
      }
    };

    // Do not request shipping while the customer is still changing the cart.
    const debounceTimer = setTimeout(() => void updatePrice(), 2000);
    return () => {
      if (shippingRequestSequenceRef.current === requestSequence) shippingRequestSequenceRef.current++;
      clearTimeout(debounceTimer);
      quoteController.abort();
    };
  }, [
    selectedShippingMethodId, deliveryMethods, destinationCity, destinationProvince, destinationCountry,
    activeDeliveryAddress, deliveryAddressReady,
    totalWeight, shippingCenterKey, calculateShippingCost, cart, shippingQuoteCartKey,
    shippingQuoteRefreshKey, refetchShippingCenter, secondaryCities, selectedContractId,
    contractValidationError,
  ]);

  // Prices only come from a fresh server quote; never infer a standard method's price locally.
  let shippingCost = calculatedShippingCost;
  const isCurrentMethodGenuinePickup = isGenuinePickupMethod(currentShippingMethod);
  const isCurrentMethodShippingDependent = !!currentShippingMethod && !isCurrentMethodGenuinePickup;
  const currentVehicleQuoteIsFresh = !!shippingQuote?.token &&
    shippingQuote.destination === `${destinationCity}|${totalWeight}` &&
    shippingQuote.centerKey === shippingCenterKey &&
    shippingQuote.cartKey === shippingQuoteCartKey &&
    Date.now() - shippingQuote.createdAt < 4 * 60 * 1000;
  const standardQuoteReady = !!standardShippingQuote &&
    standardShippingQuote.methodId === selectedShippingMethodId &&
    standardShippingQuote.key === standardQuoteKey &&
    standardShippingQuote.centerKey === shippingCenterKey &&
    standardShippingQuote.cartKey === shippingQuoteCartKey &&
    Number.isFinite(standardShippingQuote.cost) &&
    Date.now() - standardShippingQuote.createdAt < 4 * 60 * 1000;
  const shippingQuoteReady = !shippingCalculationPending &&
    !shippingRouteUnavailable &&
    (isCurrentMethodGenuinePickup || deliveryAddressReady) &&
    (isCurrentMethodGenuinePickup ||
      (isSmartVehicleShipping
        ? !!selectedVehicle && currentVehicleQuoteIsFresh &&
          pricedShippingCenterKey === shippingCenterKey &&
          pricedShippingDestination === `${destinationCity}|${totalWeight}`
        : standardQuoteReady));
  const shippingSelectionUnavailable = !isCurrentMethodGenuinePickup &&
    (!deliveryAddressReady || shippingCalculationPending || shippingRouteUnavailable || !shippingQuoteReady);
  const finalPriceReady = !contractValidationError && !!currentShippingMethod &&
    (isCurrentMethodGenuinePickup || shippingQuoteReady);
  
  if (isCurrentMethodGenuinePickup) {
    shippingCost = 0;
  } else if (isSmartVehicleShipping) {
    if (!shippingQuoteReady) shippingCost = 0;
  } else if (standardQuoteReady) {
    shippingCost = standardShippingQuote!.cost;
  } else {
    shippingCost = 0;
  }

  const shippingRouteUnavailableMessage = language === 'fa'
    ? 'هزینه ارسال برای این مسیر در دسترس نیست. لطفاً دوباره تلاش کنید یا روش ارسال دیگری انتخاب کنید.'
    : language === 'ar'
      ? 'تكلفة الشحن لهذا المسار غير متاحة. يرجى إعادة المحاولة أو اختيار طريقة شحن أخرى.'
      : language === 'tr'
        ? 'Bu rota için teslimat ücreti mevcut değil. Lütfen tekrar deneyin veya başka bir teslimat yöntemi seçin.'
        : 'Shipping is unavailable for this route. Please retry or choose another delivery method.';
  const shippingQuoteRefreshMessage = language === 'fa'
    ? 'پیش‌فاکتور ارسال منقضی یا نامعتبر است؛ هزینه ارسال در حال به‌روزرسانی است. لطفاً دوباره ثبت سفارش را بزنید.'
    : language === 'ar'
      ? 'انتهت صلاحية عرض الشحن أو أنه غير صالح؛ يتم تحديث تكلفة الشحن. يرجى إعادة إرسال الطلب.'
      : language === 'tr'
        ? 'Kargo teklifi geçersiz veya süresi dolmuş; ücret yenileniyor. Lütfen siparişi tekrar gönderin.'
        : 'The shipping quote is missing or expired. The quote is being refreshed; please submit your order again.';
  
  // Fetch tax settings for dynamic VAT calculation
  const { data: taxSettingsResponse } = useQuery({
    queryKey: ['/api/tax-settings'],
    queryFn: () => apiRequest('/api/tax-settings', { method: 'GET' }),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Extract tax settings array from response
  const taxSettings = taxSettingsResponse?.data || [];

  // Calculate VAT and duties from database settings
  // Handle both VAT and vat types for backward compatibility
  const vatSetting = taxSettings?.find((setting: any) => 
    (setting.type === 'VAT' || setting.type === 'vat') && setting.isEnabled
  );
  const dutiesSetting = taxSettings?.find((setting: any) => setting.type === 'duties' && setting.isEnabled);
  
  const vatRate = vatSetting ? parseFloat(vatSetting.rate) / 100 : 0; // Convert percentage to decimal
  const dutiesRate = dutiesSetting ? parseFloat(dutiesSetting.rate) / 100 : 0;
  
  const vatAmount = subtotal * vatRate;
  const dutiesAmount = subtotal * dutiesRate;
  const totalTaxAmount = vatAmount + dutiesAmount;
  
  // Debug logging for tax calculations
  console.log('🧮 Tax Debug:', {
    taxSettings,
    vatSetting,
    dutiesSetting,
    vatRate,
    dutiesRate,
    subtotal,
    vatAmount,
    dutiesAmount,
    totalTaxAmount
  });
  
  // Item subtotal can be shown immediately, but no payable total exists
  // until the selected delivery address has a valid shipping price.
  const beforeWalletTotal = finalPriceReady ? subtotal + shippingCost + totalTaxAmount : 0;
  
  // Auto-enable wallet usage when wallet payment method is selected
  useEffect(() => {
    const paymentMethod = form.watch('paymentMethod');
    if (selectedContractId !== null) {
      setUseWallet(false);
      setWalletAmountToUse(0);
      setSecondaryPaymentMethod('');
      const paymentMethodSupported = paymentSettings.length === 0
        ? ['bank_receipt', 'online_payment'].includes(paymentMethod)
        : paymentSettings.some((setting: any) =>
          setting.enabled && !isWalletPaymentMethod(setting.methodKey) && setting.methodKey === paymentMethod
        );
      if (isWalletPaymentMethod(paymentMethod) || !paymentMethodSupported) {
        form.setValue('paymentMethod', getSupportedNonWalletPaymentMethod());
      }
      return;
    }
    if (paymentMethod === 'wallet_combined') {
      setUseWallet(true);
      // Always suggest full payment amount if wallet has sufficient balance
      const suggestedAmount = Math.min(walletBalance, beforeWalletTotal);
      setWalletAmountToUse(suggestedAmount);
      
      console.log('💰 [WALLET AUTO-SETUP]:', {
        paymentMethod: 'wallet_combined',
        walletBalance,
        beforeWalletTotal,
        suggestedAmount,
        willBeFullPayment: suggestedAmount >= beforeWalletTotal
      });
      
      // Force immediate UI update verification
      setTimeout(() => {
        console.log('⚡ [WALLET VERIFY]:', {
          currentWalletAmountToUse: walletAmountToUse,
          afterSetState: suggestedAmount,
          actualUsage: Math.min(suggestedAmount, Math.min(walletBalance, beforeWalletTotal))
        });
      }, 100);
    } else {
      setUseWallet(false);
      setWalletAmountToUse(0);
    }
  }, [form.watch('paymentMethod'), walletBalance, beforeWalletTotal, selectedContractId, paymentSettings]);
  
  // Calculate wallet usage
  const maxWalletUsage = Math.min(walletBalance, beforeWalletTotal);
  const actualWalletUsage = selectedContractId === null && useWallet
    ? Math.min(walletAmountToUse, maxWalletUsage)
    : 0;
  const totalAmount = beforeWalletTotal - actualWalletUsage;
  
  // Debug wallet calculation
  console.log('🔍 [WALLET CALCULATION DEBUG]:', {
    walletBalance,
    beforeWalletTotal,
    useWallet,
    walletAmountToUse,
    maxWalletUsage,
    actualWalletUsage,
    totalAmount,
    isWalletEnabled: useWallet,
    hasSufficientBalance: walletBalance >= beforeWalletTotal,
    paymentMethodWillBe: actualWalletUsage >= beforeWalletTotal ? 'wallet_full' : 
                         actualWalletUsage > 0 ? 'wallet_partial' : 'other'
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest("/api/shop/orders", { method: "POST", body: orderData });
    },
    onSuccess: (data: any) => {
      // Invalidate wallet balance cache after wallet transaction
      queryClient.invalidateQueries({ queryKey: ['/api/customers/wallet/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/wallet'] });
      fetchWalletBalance();
      
      const orderId = data.order?.id || data.orderId;
      const paymentMethod = data.order?.paymentMethod;
      
      // Invalidate wallet balance cache if wallet payment was used
      if (actualWalletUsage > 0) {
        queryClient.invalidateQueries({ queryKey: ['/api/customers/wallet/balance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/customer/wallet'] });
        
        // Force refresh wallet balance
        fetchWalletBalance();
        
        console.log(`🔄 Wallet balance cache invalidated after ${actualWalletUsage} IQD payment`);
      }
      
      // PRIORITY 1: Check if backend explicitly requires bank payment with specific redirect URL
      if (data.requiresBankPayment && data.redirectUrl) {
        console.log('💳 [PAYMENT REDIRECT] Using backend specified redirect URL:', data.redirectUrl);
        setLocation(data.redirectUrl);
        return;
      }
      
      // PRIORITY 2: Check if payment processing is required based on payment method
      const requiresPayment = ['iraqi_bank', 'credit_card', 'bank_transfer', 'digital_wallet', 'online_payment'].includes(paymentMethod);
      
      if (requiresPayment) {
        // Redirect to payment page for processing
        setLocation(`/payment/${orderId}`);
      } else {
        // For wallet payments and other completed methods, show success with finance notice
        setOrderNumber(orderId);
        setIsOrderComplete(true);
        onOrderComplete();
      }
      
      toast({
        title: "Order Placed Successfully!",
        description: `Your order #${orderId} has been created.`,
      });
    },
    onError: () => {
      toast({
        title: "Order Failed",
        description: "There was an error processing your order. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => { orderSubmissionLockRef.current = false; },
  });

  const onSubmit = async (data: CheckoutFormData) => {
    const isFinalConfirmation = confirmingOrderRef.current;
    confirmingOrderRef.current = false;
    if (createOrderMutation.isPending || orderSubmissionLockRef.current) return;
    if (isFinalConfirmation) orderSubmissionLockRef.current = true;
    let handedToMutation = false;
    try {
    if (selectedContractId !== null && (
      isWalletPaymentMethod(data.paymentMethod) ||
      isWalletPaymentMethod(form.getValues('paymentMethod')) ||
      useWallet ||
      walletAmountToUse > 0 ||
      actualWalletUsage > 0
    )) {
      setUseWallet(false);
      setWalletAmountToUse(0);
      setSecondaryPaymentMethod('');
      form.setValue('paymentMethod', getSupportedNonWalletPaymentMethod());
      setPendingReview(null);
      const walletGuardTitle = language === 'fa'
        ? 'پرداخت کیف پول برای سفارش قراردادی مجاز نیست'
        : language === 'ar'
          ? 'الدفع من المحفظة غير مسموح للطلبات التعاقدية'
          : language === 'tr'
            ? 'Sözleşmeli siparişlerde cüzdanla ödeme kullanılamaz'
            : 'Wallet payment is not allowed for contract orders';
      toast({ title: walletGuardTitle, description: contractNonWalletPaymentNote, variant: 'destructive' });
      return;
    }
    if (selectedContractId !== null) {
      const refreshedContracts = await refetchContracts();
      const verifiedContracts = refreshedContracts.data || [];
      const freshContractError = getContractValidationError(
        selectedContractId,
        verifiedContracts,
        refreshedContracts.isFetching,
        refreshedContracts.isError,
      );
      if (freshContractError) {
        setPendingReview(null);
        toast({ title: 'Contract cannot be used', description: freshContractError, variant: 'destructive' });
        return;
      }
      const freshContract = verifiedContracts.find(contract => Number(contract.id) === Number(selectedContractId));
      const previousContract = selectedContract;
      const previousShippingMode = (previousContract as (ShopContract & { shippingMode?: ContractShippingMode | null }) | undefined)?.shippingMode || null;
      const freshShippingMode = (freshContract as (ShopContract & { shippingMode?: ContractShippingMode | null }) | undefined)?.shippingMode || null;
      if (freshShippingMode !== previousShippingMode) {
        setPendingReview(null);
        toast({
          title: language === 'fa' ? 'روش حمل قرارداد تغییر کرده است' : language === 'ar' ? 'تغيّرت طريقة النقل في العقد' : language === 'tr' ? 'Sözleşmenin taşıma yöntemi değişti' : 'Contract shipping policy changed',
          description: language === 'fa' ? 'قرارداد را دوباره انتخاب کنید تا روش حمل و قیمت‌گذاری تازه اعمال شود.' : language === 'ar' ? 'أعد اختيار العقد لتطبيق طريقة النقل والتسعير الجديدة.' : language === 'tr' ? 'Yeni taşıma yöntemi ve fiyatlandırmayı uygulamak için sözleşmeyi yeniden seçin.' : 'Select the contract again to apply the updated shipping method and pricing.',
          variant: 'destructive',
        });
        return;
      }
      const freshRequiredShippingMethodId = getContractShippingMethodId(freshShippingMode, deliveryMethods);
      if ((freshShippingMode === 'automatic_vehicle' || freshShippingMode === 'self_transport') &&
        (!freshRequiredShippingMethodId || data.shippingMethod !== freshRequiredShippingMethodId)) {
        setPendingReview(null);
        toast({
          title: language === 'fa' ? 'روش حمل قرارداد در دسترس نیست' : language === 'ar' ? 'طريقة النقل المطلوبة غير متاحة' : language === 'tr' ? 'Sözleşmenin taşıma yöntemi kullanılamıyor' : 'Contract shipping method unavailable',
          description: contractShippingMethodNotice,
          variant: 'destructive',
        });
        return;
      }
      const contractPricesChanged = Object.entries(cart).some(([productId]) => {
        const oldPrice = previousContract?.items?.find(item => Number(item.productId) === Number(productId))?.unitPrice;
        const newPrice = freshContract?.items?.find(item => Number(item.productId) === Number(productId))?.unitPrice;
        return Number(oldPrice) !== Number(newPrice);
      });
      if (contractPricesChanged) {
        setPendingReview(null);
        toast({
          title: 'Contract terms changed',
          description: 'The contract price was updated. Review the new order total before submitting.',
          variant: 'destructive',
        });
        return;
      }
    }
    if (data.secondDeliveryAddress?.trim() && !data.secondDeliveryCity?.trim()) {
      toast({ title: language === 'fa' ? 'شهر آدرس را انتخاب کنید' : 'Select a city for the address', variant: 'destructive' });
      return;
    }
    if ((deliveryAddressChoice === 'new' || deliveryAddressChoice === 'legacy') &&
      (!data.secondDeliveryAddress?.trim() || !data.secondDeliveryCity?.trim() ||
        !data.secondDeliveryProvince?.trim() || !newAddressCountry.trim() ||
        (deliveryAddressChoice === 'new' && (!newAddressTitle.trim() || !newAddressPhone.trim())))) {
      toast({
        title: language === 'fa' ? 'اطلاعات جغرافیایی آدرس را کامل کنید' : 'Complete the address geography',
        description: language === 'fa'
          ? 'برای آدرس انتخاب‌شده، استان، شهر و کشور را جداگانه انتخاب کنید.'
          : 'Select the province, city, and country explicitly for this address.',
        variant: 'destructive',
      });
      return;
    }
    // CRITICAL VALIDATION: Ensure delivery address is specified before allowing order
    // Helper to check non-empty string
    const isValidField = (val: string | undefined | null): boolean => {
      return val !== undefined && val !== null && val.trim() !== '';
    };

    const submittedShippingMethod = (deliveryMethods as any[])?.find((method: any) => method.id.toString() === data.shippingMethod);
    const isSubmittedShippingDependent = !!submittedShippingMethod && !isGenuinePickupMethod(submittedShippingMethod);
    const refreshedCenter = await refetchShippingCenter();
    const freshCenterData = refreshedCenter.data?.data;
    const freshCenterKey = getShippingCenterKey(freshCenterData);
    if (freshCenterKey) shippingCenterKeyRef.current = freshCenterKey;

    if (isSubmittedShippingDependent && (refreshedCenter.isError || !freshCenterKey)) {
      setShippingRouteUnavailable(true);
      toast({
        title: shippingRouteUnavailableMessage,
        description: shippingRouteUnavailableMessage,
        variant: "destructive",
      });
      return;
    }

    const freshCenterCountryCode = resolveCountryCode(freshCenterData?.countryCode) || freshCenterData?.countryCode?.toUpperCase() || '';
    const destinationCountry = isUserLoggedIn
      ? (deliveryAddressChoice === 'new' || deliveryAddressChoice === 'legacy'
        ? newAddressCountry
        : selectedAddress?.country || customerData?.customer?.country)
      : getGuestDeliveryFields(data).country;
    const destinationCountryCode = resolveCountryCode(destinationCountry);
    if (isSubmittedShippingDependent && freshCenterCountryCode && destinationCountryCode && freshCenterCountryCode !== destinationCountryCode) {
      setShippingRouteUnavailable(true);
      setCalculatedShippingCost(0);
      setSelectedVehicle(null);
      selectedVehicleRef.current = null;
      setPricedShippingCenterKey('');
      setPricedShippingDestination('');
      setShippingQuote(null);
      setStandardShippingQuote(null);
      setShippingQuoteRefreshKey((key) => key + 1);
      toast({
        title: shippingRouteUnavailableMessage,
        description: shippingRouteUnavailableMessage,
        variant: "destructive",
      });
      return;
    }

    const submittedMethodValue = String(
      submittedShippingMethod?.value ||
      submittedShippingMethod?.deliveryMethod ||
      submittedShippingMethod?.delivery_method ||
      ''
    ).toLowerCase();
    const requiresShippingQuoteToken = isSubmittedShippingDependent &&
      (submittedMethodValue === 'smart_vehicle' || submittedMethodValue.includes('bus'));
    const shippingQuoteIsCurrent = !!shippingQuote?.token &&
      shippingQuote.destination === `${destinationCity}|${totalWeight}` &&
      shippingQuote.centerKey === freshCenterKey &&
      shippingQuote.cartKey === shippingQuoteCartKey &&
      Date.now() - shippingQuote.createdAt < 4 * 60 * 1000;
    if (requiresShippingQuoteToken && !shippingQuoteIsCurrent) {
      setShippingQuote(null);
      setPricedShippingCenterKey('');
      setPricedShippingDestination('');
      setShippingQuoteRefreshKey((key) => key + 1);
      toast({
        title: shippingQuoteRefreshMessage,
        description: shippingQuoteRefreshMessage,
        variant: "destructive",
      });
      return;
    }

    const isSubmittedSmartMethod = submittedMethodValue === 'smart_vehicle' || submittedMethodValue.includes('bus');
    const submittedStandardQuoteIsCurrent = !!standardShippingQuote &&
      standardShippingQuote.methodId === data.shippingMethod &&
      standardShippingQuote.key === standardQuoteKey &&
      standardShippingQuote.centerKey === freshCenterKey &&
      standardShippingQuote.cartKey === shippingQuoteCartKey &&
      Number.isFinite(standardShippingQuote.cost) &&
      Date.now() - standardShippingQuote.createdAt < 4 * 60 * 1000;
    if (isSubmittedShippingDependent && (
      shippingCalculationPending ||
      shippingRouteUnavailable ||
      pricedShippingCenterKey !== freshCenterKey ||
      pricedShippingDestination !== `${destinationCity}|${totalWeight}` ||
      (isSubmittedSmartMethod
        ? !selectedVehicleRef.current || !shippingQuoteIsCurrent
        : !submittedStandardQuoteIsCurrent)
    )) {
      setShippingRouteUnavailable(true);
      setCalculatedShippingCost(0);
      setSelectedVehicle(null);
      selectedVehicleRef.current = null;
      setPricedShippingCenterKey('');
      setPricedShippingDestination('');
      setShippingQuote(null);
      setStandardShippingQuote(null);
      setShippingQuoteRefreshKey((key) => key + 1);
      toast({
        title: shippingRouteUnavailableMessage,
        description: shippingRouteUnavailableMessage,
        variant: "destructive",
      });
      return;
    }
    
    if (isUserLoggedIn && customerData?.customer) {
      const customer = customerData.customer;
      
      // Check CRM default address - all required fields must be non-empty
      const hasDefaultAddress = isValidField(customer.address) && 
                                isValidField(customer.city || customer.cityRegion) &&
                                isValidField(customer.country);
      
      // Check second delivery address - requires address AND city
      const hasSecondAddress = isValidField(data.secondDeliveryAddress) && 
                               isValidField(data.secondDeliveryCity);
      
      // Check selected address from address selector - requires address AND city AND country
      const hasSelectedAddress = selectedAddress && 
                                 isValidField(selectedAddress.address) && 
                                 isValidField(selectedAddress.city) &&
                                 isValidField(selectedAddress.country);
      
      // Must have at least ONE valid address source
      if (!hasDefaultAddress && !hasSecondAddress && !hasSelectedAddress) {
        toast({
          title: "آدرس تحویل الزامی است",
          description: "لطفاً آدرس تحویل را از آدرس‌های ذخیره‌شده انتخاب کنید یا یک آدرس جدید وارد کنید.",
          variant: "destructive",
        });
        console.log('🚫 [CHECKOUT] Order blocked - no valid delivery address', {
          hasDefaultAddress, hasSecondAddress, hasSelectedAddress,
          crmAddress: customer.address, crmCity: customer.city, crmCountry: customer.country
        });
        return;
      }
      
      // Validate phone - must have at least one valid phone source
      const hasPhone = isValidField(customer.phone) || 
                       isValidField(data.recipientMobile) || 
                       (selectedAddress && isValidField(selectedAddress.phone));
      
      if (!hasPhone) {
        toast({
          title: "شماره تلفن الزامی است",
          description: "لطفاً شماره تلفن گیرنده را مشخص کنید",
          variant: "destructive",
        });
        console.log('🚫 [CHECKOUT] Order blocked - no valid phone number');
        return;
      }
    } else if (!isUserLoggedIn) {
      // For guests, validate required fields - must be non-empty
      if (!isValidField(data.billingAddress1) || !isValidField(data.billingCity) || !isValidField(data.billingCountry)) {
        toast({
          title: "آدرس تحویل الزامی است",
          description: "لطفاً آدرس، شهر و کشور را وارد کنید",
          variant: "destructive",
        });
        console.log('🚫 [CHECKOUT] Order blocked - guest address incomplete');
        return;
      }
      if (!isValidField(data.phone)) {
        toast({
          title: "شماره تلفن الزامی است",
          description: "لطفاً شماره تلفن را وارد کنید",
          variant: "destructive",
        });
        console.log('🚫 [CHECKOUT] Order blocked - guest phone missing');
        return;
      }
    }
    
    console.log('✅ [CHECKOUT] Address validation passed, proceeding with order');

    // Determine active delivery address and phone based on user input
    let deliveryAddress = '';
    let deliveryCity = '';
    let deliveryProvince = '';
    let deliveryCountry = '';
    let deliveryPostalCode = '';
    let recipientPhone = '';
    let recipientName = '';
    let activeDeliveryInfo = {
      addressSource: '',
      phoneSource: '',
      isSecondAddress: false,
      isDifferentMobile: false
    };
    
    // For logged in users with CRM data
    if (isUserLoggedIn && customerData?.customer) {
      const customer = customerData.customer;
      
      const secondDeliveryAddress = data.secondDeliveryAddress?.trim();
      const explicitRecipientPhone = (deliveryAddressChoice === 'new' ? newAddressPhone.trim() : '') ||
        data.recipientMobile?.trim() || data.recipientPhone?.trim() || selectedAddress?.phone || '';

      // The recipient snapshot entered at checkout is authoritative for delivery.
      if (secondDeliveryAddress && (deliveryAddressChoice === 'new' || deliveryAddressChoice === 'legacy')) {
        deliveryAddress = secondDeliveryAddress;
        deliveryCity = data.secondDeliveryCity || '';
        deliveryProvince = data.secondDeliveryProvince || customer.province || customer.state || '';
        deliveryCountry = deliveryAddressChoice === 'new' || deliveryAddressChoice === 'legacy'
          ? newAddressCountry
          : selectedAddress?.country || customer.country || '';
        deliveryPostalCode = data.secondDeliveryPostalCode || '';
        activeDeliveryInfo.addressSource = deliveryAddressChoice === 'legacy' ? 'legacy_crm_address' : 'new_address';
        activeDeliveryInfo.isSecondAddress = true;
      } else if (selectedAddress) {
        deliveryAddress = selectedAddress.address || '';
        deliveryCity = selectedAddress.city || '';
        deliveryProvince = selectedAddress.state || '';
        deliveryCountry = selectedAddress.country || '';
        deliveryPostalCode = selectedAddress.postalCode || '';
        activeDeliveryInfo.addressSource = 'selected_address';
        activeDeliveryInfo.isSecondAddress = false;
      } else {
        // Use CRM default address
        deliveryAddress = customer.address || '';
        deliveryCity = customer.city || customer.cityRegion || data.billingCity || '';
        deliveryProvince = customer.province || customer.state || '';
        deliveryCountry = customer.country || '';
        deliveryPostalCode = customer.postalCode || '';
        activeDeliveryInfo.addressSource = 'crm_default';
        activeDeliveryInfo.isSecondAddress = false;
      }
      
      // Prefer the recipient mobile entered for this order over the CRM phone.
      if (explicitRecipientPhone) {
        recipientPhone = explicitRecipientPhone;
        activeDeliveryInfo.phoneSource = 'different_mobile';
        activeDeliveryInfo.isDifferentMobile = true;
      } else {
        // Use customer's default phone from CRM
        recipientPhone = customer.phone || '';
        activeDeliveryInfo.phoneSource = 'crm_default';
        activeDeliveryInfo.isDifferentMobile = false;
      }
      
      // Use customer name as default recipient unless different name specified
      recipientName = selectedAddress?.recipientName || data.recipientName ||
        `${customer.firstName} ${customer.lastName}`;
    } else {
      // For non-logged in users, use form data
      const guestDeliveryFields = getGuestDeliveryFields(data);
      const shippingAddress = data.sameAsShipping ? 
        `${data.billingAddress1}, ${data.billingAddress2 || ''}, ${data.billingCity}, ${data.billingState}, ${data.billingPostalCode}, ${data.billingCountry}`.trim() :
        `${data.shippingAddress1}, ${data.shippingAddress2 || ''}, ${data.shippingCity}, ${data.shippingState}, ${data.shippingPostalCode}, ${data.shippingCountry}`.trim();
      
      deliveryAddress = shippingAddress;
      deliveryCity = guestDeliveryFields.city;
      deliveryProvince = guestDeliveryFields.province;
      deliveryCountry = guestDeliveryFields.country;
      deliveryPostalCode = guestDeliveryFields.postalCode;
      recipientPhone = data.recipientPhone || data.phone || '';
      recipientName = data.recipientName || `${data.firstName} ${data.lastName}`;
      activeDeliveryInfo.addressSource = 'guest_form';
      activeDeliveryInfo.phoneSource = 'guest_form';
    }

    // Prepare customer info
    let customerInfo;
    
      if (isLoggedIn && selectedAddress && !data.secondDeliveryAddress?.trim()) {
      // Use selected address from address selector (legacy functionality)
      customerInfo = {
        email: customerData?.customer?.email || data.email,
        firstName: selectedAddress.firstName,
        lastName: selectedAddress.lastName,
        phone: selectedAddress.phone,
        company: selectedAddress.company || '',
        country: selectedAddress.country,
        city: selectedAddress.city,
        address: `${selectedAddress.address}${selectedAddress.postalCode ? `, ${selectedAddress.postalCode}` : ''}`,
      };
      // Use the selected saved-address phone only when checkout has no recipient phone.
      if (!recipientPhone && selectedAddress.phone) {
        recipientPhone = selectedAddress.phone;
        activeDeliveryInfo.phoneSource = 'selected_address';
      }
    } else if (isUserLoggedIn && customerData?.customer) {
      // Use CRM customer data
      const customer = customerData.customer;
      customerInfo = {
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        company: customer.company || '',
        country: deliveryCountry,
        city: deliveryCity,
        address: deliveryAddress,
      };
    } else {
      // Use form data for non-logged in users
      customerInfo = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        company: data.company || '',
        country: deliveryCountry,
        city: deliveryCity,
        address: deliveryAddress,
      };
    }

    // Console log for debugging active delivery logic
    console.log('📍 Active Delivery Info:', {
      addressSource: activeDeliveryInfo.addressSource,
      phoneSource: activeDeliveryInfo.phoneSource,
      isSecondAddress: activeDeliveryInfo.isSecondAddress,
      isDifferentMobile: activeDeliveryInfo.isDifferentMobile,
      deliveryAddress,
      deliveryCity,
      deliveryProvince,
      recipientPhone
    });

    const orderData = {
      selectedBulkVehicleTemplateId:hasBulkContractProducts&&bulkVehicleTemplateId?Number(bulkVehicleTemplateId):null,
      contractId: selectedContractId,
      customerInfo,
      recipientInfo: {
        recipientName: recipientName,
        recipientPhone: recipientPhone,
        recipientAddress: deliveryAddress,
        deliveryCity: deliveryCity,
        deliveryProvince: deliveryProvince,
        deliveryCountry: deliveryCountry,
        deliveryPostalCode: deliveryPostalCode,
      },
      // Critical: Active delivery details for warehouse and logistics
      activeDeliveryInfo: {
        addressSource: activeDeliveryInfo.addressSource,
        phoneSource: activeDeliveryInfo.phoneSource,
        isSecondAddressUsed: activeDeliveryInfo.isSecondAddress,
        isDifferentPhoneUsed: activeDeliveryInfo.isDifferentMobile,
        activeDeliveryAddress: deliveryAddress,
        activeDeliveryCity: deliveryCity,
        activeDeliveryProvince: deliveryProvince,
        activeDeliveryCountry: deliveryCountry,
        activeDeliveryPostalCode: deliveryPostalCode,
        activeRecipientPhone: recipientPhone,
        activeRecipientName: recipientName,
        // For warehouse and logistics tracking
        warehouseNotes: `${t.checkout_page.warehouseNoteActive} ${activeDeliveryInfo.isSecondAddress ? t.checkout_page.warehouseNoteSecond : t.checkout_page.warehouseNoteCRM} | ${t.checkout_page.warehouseNotePhone} ${activeDeliveryInfo.isDifferentMobile ? t.checkout_page.warehouseNoteDifferentMobile : t.checkout_page.warehouseNoteCRMPhone}`,
      },
      items: cartItems.map(item => ({
        productId: item.id,
        productName: item.name,
        productSku: item.sku || '',
        quantity: item.quantity,
        unitPrice: item.discountedUnitPrice ?? parseFloat(item.price),
      })),
      totalAmount: beforeWalletTotal,
      shippingCost: shippingCost,
      notes: data.notes || '',
      shippingMethod: data.shippingMethod,
      paymentMethod: (() => {
        if (selectedContractId !== null) {
          return isWalletPaymentMethod(data.paymentMethod)
            ? getSupportedNonWalletPaymentMethod()
            : data.paymentMethod;
        }
        // Let backend handle wallet_combined conversion
        if (data.paymentMethod === 'wallet_combined') {
          console.log('📤 [FRONTEND] Sending wallet_combined to backend for smart conversion');
          return 'wallet_combined';
        }
        
        // Standard payment method determination
        if (actualWalletUsage >= beforeWalletTotal) {
          return 'wallet_full';
        } else if (actualWalletUsage > 0) {
          return 'wallet_partial';
        } else {
          return data.paymentMethod;
        }
      })(),
      secondaryPaymentMethod: selectedContractId === null ? secondaryPaymentMethod : '',
      walletAmountUsed: selectedContractId === null ? actualWalletUsage : 0,
      remainingAmount: beforeWalletTotal - actualWalletUsage, // Fix: Send actual remaining amount after wallet deduction
      // Use ref to get current vehicle (avoids stale closure in callbacks)
      // CRITICAL: Send vehicle TYPE (like "van", "motorcycle") NOT vehicle name (like "وانت")
      // This is used for exact filtering in logistics
      vehicleType: selectedVehicleRef.current?.type || selectedVehicle?.type ||
                   selectedVehicleRef.current?.vehicleType || selectedVehicle?.vehicleType || null, // Customer's selected vehicle TYPE for logistics
      // CRITICAL: Send total weight calculated from cart items for logistics vehicle matching
      totalWeight: totalWeight > 0 ? totalWeight : null, // Total weight in kg for optimal vehicle selection
      ...(requiresShippingQuoteToken ? { shippingQuoteToken: shippingQuote!.token } : {}),
    };

    // Debug logging for payment data
    console.log('💰 [FRONTEND PAYMENT DEBUG] Order data being sent:', {
      totalAmount: beforeWalletTotal,
      walletAmountUsed: actualWalletUsage,
      remainingAmount: beforeWalletTotal - actualWalletUsage,
      paymentMethod: orderData.paymentMethod,
      fullPayment: actualWalletUsage >= beforeWalletTotal,
      partialPayment: actualWalletUsage > 0 && actualWalletUsage < beforeWalletTotal,
      // Extended debugging
      walletBalance,
      useWallet,
      walletAmountToUse,
      maxWalletUsage,
      beforeWalletTotal,
      actualWalletUsage,
      isWalletSufficient: walletBalance >= beforeWalletTotal,
      shouldBeFullPayment: useWallet && walletBalance >= beforeWalletTotal,
      // Vehicle debugging (including ref for stale closure fix)
      vehicleType: orderData.vehicleType,
      // Debug all possible property names on vehicle objects
      refName: selectedVehicleRef.current?.name,
      refVehicleName: selectedVehicleRef.current?.vehicleName,
      refType: selectedVehicleRef.current?.type,
      stateName: selectedVehicle?.name,
      stateVehicleName: selectedVehicle?.vehicleName,
      stateType: selectedVehicle?.type,
      selectedVehicleRefFull: selectedVehicleRef.current
    });

    const signature = JSON.stringify({
      items: orderData.items, address: orderData.recipientInfo,
      shippingMethod: orderData.shippingMethod, shippingCost: orderData.shippingCost,
      total: orderData.totalAmount, payment: orderData.paymentMethod,
      walletAmount: orderData.walletAmountUsed, cart: shippingQuoteCartKey,
      contractId: orderData.contractId,
      addressTitle: deliveryAddressChoice === 'new' ? newAddressTitle.trim() : '',
    });
    if (!isFinalConfirmation || !pendingReview || pendingReview.signature !== signature) {
      if (isUserLoggedIn) {
        const refreshed = await refetchSavedCustomerAddresses();
        if (refreshed.isError) {
          toast({ title: language === 'fa' ? 'دریافت آدرس‌های ذخیره‌شده ناموفق بود' : 'Could not load saved addresses', variant: 'destructive' });
          return;
        }
      }
      if (!reviewOpen) {
        setReviewAddressId(deliveryAddressChoice === 'new'
          ? 'new'
          : deliveryAddressChoice === 'legacy'
            ? 'legacy'
            : selectedAddress ? `saved:${selectedAddress.id}` : 'primary');
        setSecondAddressDraft({
          address: data.secondDeliveryAddress || '', city: data.secondDeliveryCity || '',
          province: data.secondDeliveryProvince || '', postalCode: data.secondDeliveryPostalCode || '',
          title: newAddressTitle, phone: deliveryAddressChoice === 'new' ? newAddressPhone : data.recipientMobile || '',
          country: newAddressCountry,
        });
      }
      setPendingReview({ signature });
      setReviewOpen(true);
      return;
    }
    setIsConfirmingOrder(true);
    try {
      if (isUserLoggedIn && deliveryAddressChoice === 'new' && data.secondDeliveryAddress?.trim()) {
        const savedAddress = await saveCustomerAddress({
          title: newAddressTitle.trim(),
          address: data.secondDeliveryAddress.trim(),
          city: data.secondDeliveryCity?.trim() || '',
          state: data.secondDeliveryProvince?.trim(),
          country: newAddressCountry.trim(),
          postalCode: data.secondDeliveryPostalCode?.trim(),
          phone: newAddressPhone.trim(),
          recipientName: recipientName || customerData?.customer?.firstName || 'Customer',
        });
        // Keep the just-confirmed snapshot stable while handing it to the order
        // mutation. The saved row has exactly the same destination, so switching
        // the selection does not change the route or recalculate the quote.
        setSelectedAddress(savedAddress);
        setDeliveryAddressChoice(`saved:${savedAddress.id}`);
        setReviewAddressId(`saved:${savedAddress.id}`);
        form.setValue('recipientMobile', savedAddress.phone || '');
        form.setValue('recipientName', savedAddress.recipientName || recipientName);
        setNewAddressTitle('');
        setNewAddressPhone('');
        setSecondAddressDraft(null);
        queryClient.setQueryData(['structuredCustomerAddresses'], (current: any[] | undefined) => [
          ...(current || []).filter(address => Number(address.id) !== Number(savedAddress.id)),
          savedAddress,
        ]);
        await refetchSavedCustomerAddresses();
        await queryClient.invalidateQueries({ queryKey: ['/api/customers/addresses'] });
      }
      setReviewOpen(false);
      setPendingReview(null);
      handedToMutation = true;
      createOrderMutation.mutate(orderData);
    } catch (error: any) {
      orderSubmissionLockRef.current = false;
      toast({ title: language === 'fa' ? 'ذخیره آدرس ناموفق بود' : 'Could not save the address',
        description: error?.message, variant: 'destructive' });
    } finally {
      setIsConfirmingOrder(false);
    }
    } finally {
      if (!handedToMutation) orderSubmissionLockRef.current = false;
    }
  };

  if (Object.keys(cart).length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">{t.checkout_page.emptyCart}</h2>
            <p className="text-gray-500 mb-6">{t.shop.addToCart}</p>
            <Button onClick={() => setLocation("/shop")} className="w-full">
              {t.checkout_page.backToShop}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isOrderComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.checkout_page.orderPlacedSuccess}</h2>
            <p className="text-gray-600 mb-2">{t.thankYou}</p>
            <p className="text-lg font-semibold text-gray-900 mb-6">
              {t.checkout_page.orderNumber}: #{orderNumber}
            </p>
            <p className="text-sm text-gray-500 mb-8">
              {t.emailSent}
            </p>
            <div className="space-y-3">
              <Button onClick={() => setLocation("/shop")} className="w-full">
                {t.checkout_page.backToShop}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation("/")}
                className="w-full"
              >
                {t.checkout_page.backToShop}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.checkout}</h1>
          <p className="text-gray-600">{t.checkout_page.welcomeTitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            {!isUserLoggedIn ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">{t.checkout_page.welcomeTitle}</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-8 space-y-6">
                  <User className="w-16 h-16 text-gray-300 mx-auto" />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700">{t.login}</h3>
                    <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
                      <Button 
                        onClick={() => {
                          setAuthMode('login');
                          setAuthModalOpen(true);
                        }}
                        variant="default"
                        className="h-12 text-base"
                      >
                        {t.login}
                      </Button>
                      <Button 
                        onClick={() => {
                          setAuthMode('register');
                          setAuthModalOpen(true);
                        }}
                        variant="outline"
                        className="h-12 text-base"
                      >
                        {t.register}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Form {...form} key={`checkout-form-${language}`}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {/* Customer Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        {t.checkout_page.customerInfo}
                        {isUserLoggedIn && (
                          <Badge variant="secondary" className="ml-2">
                            {t.checkout_page.required}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.checkout_page.firstName} {!isUserLoggedIn && "*"}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.checkout_page.lastName} {!isUserLoggedIn && "*"}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.checkout_page.emailAddress} {!isUserLoggedIn && "*"}</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.checkout_page.phoneNumber} {!isUserLoggedIn && "*"}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.checkout_page.company} ({t.optional})</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Address Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      {t.checkout_page.deliveryTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isUserLoggedIn ? (
                      <div className="space-y-6">
                        <div role="radiogroup" aria-label={language === 'fa' ? 'آدرس تحویل' : 'Delivery address'} className="space-y-2">
                          {[
                            {
                              id: 'primary',
                              title: language === 'fa' ? 'آدرس اصلی' : 'Primary address',
                              address: customerData?.customer?.address || '',
                              city: customerData?.customer?.city || customerData?.customer?.cityRegion || '',
                              state: customerData?.customer?.province || customerData?.customer?.state || '',
                              country: customerData?.customer?.country || '',
                              postalCode: customerData?.customer?.postalCode || '',
                              phone: customerData?.customer?.phone || '',
                            },
                            ...savedCustomerAddresses.map((address: any) => ({
                              id: `saved:${address.id}`, title: address.title || (language === 'fa' ? 'آدرس ذخیره‌شده' : 'Saved address'),
                              address: address.address, city: address.city, state: address.state || '',
                              country: address.country, postalCode: address.postalCode || '', phone: address.phone || '',
                            })),
                            ...((customerInfo?.secondaryAddress || customerData?.customer?.secondaryAddress) ? [{
                              id: 'legacy', title: language === 'fa' ? 'آدرس قدیمی CRM' : 'Legacy CRM address',
                              address: customerInfo?.secondaryAddress || customerData?.customer?.secondaryAddress, city: '', state: '',
                              country: '', postalCode: '', phone: customerInfo?.alternatePhone || customerData?.customer?.alternatePhone || customerData?.customer?.phone || '',
                            }] : []),
                          ].map((address: any) => (
                            <label key={address.id} className={`flex cursor-pointer gap-3 rounded-md border p-3 ${deliveryAddressChoice === address.id ? 'border-primary bg-primary/5' : 'border-border'}`}>
                              <input
                                type="radio"
                                name="checkout-delivery-address"
                                checked={deliveryAddressChoice === address.id}
                                onChange={() => {
                                  setDeliveryAddressChoice(address.id);
                                  setSelectedAddress(address.id.startsWith('saved:') ? savedCustomerAddresses.find((item: any) => `saved:${item.id}` === address.id) : null);
                                  if (address.id === 'legacy') {
                                    setNewAddressTitle(address.title);
                                    setNewAddressCountry('');
                                    form.setValue('secondDeliveryAddress', address.address);
                                    form.setValue('secondDeliveryProvince', '');
                                    form.setValue('secondDeliveryCity', '');
                                    form.setValue('secondDeliveryPostalCode', '');
                                    form.setValue('recipientMobile', address.phone);
                                  } else if (address.id.startsWith('saved:')) {
                                    const saved = savedCustomerAddresses.find((item: any) => `saved:${item.id}` === address.id);
                                    form.setValue('secondDeliveryAddress', saved?.address || '');
                                    form.setValue('secondDeliveryProvince', saved?.state || '');
                                    form.setValue('secondDeliveryCity', saved?.city || '');
                                    form.setValue('secondDeliveryPostalCode', saved?.postalCode || '');
                                    setNewAddressCountry(saved?.country || '');
                                    form.setValue('recipientMobile', saved?.phone || '');
                                    const region = provinces.find((item: any) => canonicalGeographyName(item) === saved?.state || geographyName(item) === saved?.state);
                                    setSelectedSecondaryProvinceId(region?.id ?? null);
                                  } else {
                                    setNewAddressCountry('');
                                    form.setValue('secondDeliveryAddress', '');
                                    form.setValue('secondDeliveryProvince', '');
                                    form.setValue('secondDeliveryCity', '');
                                    form.setValue('secondDeliveryPostalCode', '');
                                    form.setValue('recipientMobile', customerData?.customer?.phone || '');
                                  }
                                }}
                                className="mt-1 accent-primary"
                              />
                              <span className="min-w-0">
                                <span className="block font-medium">{address.title}</span>
                                <span className="block text-sm text-muted-foreground">
                                  {[address.address, address.city, address.state, address.postalCode, address.country].filter(Boolean).join(', ')}
                                </span>
                                {address.phone && <span className="block text-xs text-muted-foreground">{address.phone}</span>}
                                {address.id === 'legacy' && <span className="block text-xs text-amber-700">{language === 'fa' ? 'استان، شهر و کشور را جداگانه مشخص کنید.' : 'Select province, city, and country explicitly.'}</span>}
                              </span>
                            </label>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0"
                          onClick={() => {
                            setDeliveryAddressChoice('new');
                            setSelectedAddress(null);
                            setNewAddressTitle('');
                            setNewAddressPhone('');
                            setNewAddressCountry(shippingCenterCountry || customerData?.customer?.country || '');
                            setSelectedSecondaryProvinceId(null);
                            form.setValue('secondDeliveryAddress', '');
                            form.setValue('secondDeliveryProvince', '');
                            form.setValue('secondDeliveryCity', '');
                            form.setValue('secondDeliveryPostalCode', '');
                            form.setValue('recipientMobile', '');
                          }}
                        >
                          + {language === 'fa' ? 'آدرس جدید' : 'New address'}
                        </Button>
                        {(deliveryAddressChoice === 'new' || deliveryAddressChoice === 'legacy') && (
                          <div className="space-y-4 rounded-md border bg-muted/20 p-4">
                            {deliveryAddressChoice === 'new' && (
                              <>
                                <FormItem>
                                  <FormLabel>{language === 'fa' ? 'عنوان آدرس' : 'Address title'} *</FormLabel>
                                  <Input value={newAddressTitle} onChange={(event) => setNewAddressTitle(event.target.value)} required />
                                </FormItem>
                                <FormItem>
                                  <FormLabel>{language === 'fa' ? 'موبایل گیرنده' : 'New mobile'} *</FormLabel>
                                  <Input type="tel" value={newAddressPhone} onChange={(event) => setNewAddressPhone(event.target.value)} required />
                                </FormItem>
                              </>
                            )}
                            <FormField control={form.control} name="secondDeliveryAddress" render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t.checkout_page.fullAddressLabel} *</FormLabel>
                                <FormControl><Textarea {...field} /></FormControl>
                              </FormItem>
                            )} />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <FormItem>
                                <FormLabel>{t.checkout_page.provinceLabel} *</FormLabel>
                                <Select value={form.watch('secondDeliveryProvince') || ''} onValueChange={(value) => {
                                  form.setValue('secondDeliveryProvince', value);
                                  form.setValue('secondDeliveryCity', '');
                                  const region = provinces.find((item: any) => canonicalGeographyName(item) === value);
                                  setSelectedSecondaryProvinceId(region?.id ?? null);
                                }}>
                                  <SelectTrigger><SelectValue placeholder={t.checkout_page.selectProvincePlaceholder} /></SelectTrigger>
                                  <SelectContent>{provinces.map((province: any) => <SelectItem key={province.id} value={canonicalGeographyName(province)}>{geographyName(province)}</SelectItem>)}</SelectContent>
                                </Select>
                              </FormItem>
                              <FormItem>
                                <FormLabel>{t.checkout_page.citySelectLabel} *</FormLabel>
                                <Select value={form.watch('secondDeliveryCity') || ''} onValueChange={(value) => form.setValue('secondDeliveryCity', value)} disabled={!selectedSecondaryProvinceId}>
                                  <SelectTrigger><SelectValue placeholder={t.checkout_page.selectCityPlaceholder} /></SelectTrigger>
                                  <SelectContent>{secondaryCities.map((city: any) => <SelectItem key={city.id} value={canonicalGeographyName(city)}>{geographyName(city)}</SelectItem>)}</SelectContent>
                                </Select>
                              </FormItem>
                              <FormItem>
                                <FormLabel>{language === 'fa' ? 'کشور' : 'Country'} *</FormLabel>
                                <Select value={newAddressCountry} onValueChange={setNewAddressCountry}>
                                  <SelectTrigger><SelectValue placeholder={language === 'fa' ? 'کشور را انتخاب کنید' : 'Select country'} /></SelectTrigger>
                                  <SelectContent>{geographyCountries.map((country: any) => {
                                    const code = String(country.code || country.countryCode || country.nameEn || country.name || '');
                                    return <SelectItem key={code} value={String(country.nameEn || country.nameEnglish || country.name || code)}>{geographyName(country)}</SelectItem>;
                                  })}</SelectContent>
                                </Select>
                              </FormItem>
                              <FormField control={form.control} name="secondDeliveryPostalCode" render={({ field }) => (
                                <FormItem><FormLabel>{t.checkout_page.postalCodeLabel}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                              )} />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="billingAddress1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t.checkout_page.fullAddress} *</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="billingCity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t.checkout_page.cityLabel} *</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="billingPostalCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t.checkout_page.postalCodeLabel}</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recipient Information Section - For all users */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {t.checkout_page.recipientInfoTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <span className="font-medium text-purple-800 dark:text-purple-300">{t.checkout_page.recipientInfoLabel}</span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowRecipientFields(!showRecipientFields)}
                          className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200"
                        >
                          {showRecipientFields ? '−' : '+'}
                        </Button>
                      </div>
                      
                      {showRecipientFields && (
                        <div className="mt-4 space-y-4">
                          <div className="text-sm text-purple-600 dark:text-purple-400 mb-3">
                            {t.checkout_page.recipientInfoNote}
                          </div>
                          
                          <FormField
                            control={form.control}
                            name="recipientName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t.checkout_page.recipientNameLabel}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t.checkout_page.recipientNamePlaceholder} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="recipientPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t.checkout_page.recipientPhoneLabel}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="09123456789" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {!isUserLoggedIn && (
                            <FormField
                              control={form.control}
                              name="recipientAddress"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t.checkout_page.recipientAddressLabel}</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} placeholder={t.checkout_page.recipientAddressPlaceholder} className="min-h-[80px]" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Second Address and Alternative Mobile - Only for logged in users */}
                {false && isUserLoggedIn && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        {t.checkout_page.secondAddressOrMobile}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-sm text-gray-600 mb-4">
                          {t.checkout_page.secondAddressNote}
                        </div>
                        
                        {/* Second Address Section */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">{t.checkout_page.secondAddressOptional}</label>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setShowSecondAddress(!showSecondAddress);
                                // Disable primary CRM address fields when second address is activated
                                if (!showSecondAddress) {
                                  // When activating second address, clear and disable primary fields
                                  form.setValue("billingAddress1", "");
                                  form.setValue("billingCity", "");
                                  form.setValue("billingState", "");
                                  form.setValue("billingPostalCode", "");
                                  form.setValue("billingCountry", "");
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {showSecondAddress ? t.checkout_page.hideButton : t.checkout_page.addSecondAddress}
                            </Button>
                          </div>
                          
                          {showSecondAddress && (
                            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                              <FormField
                                control={form.control}
                                name="secondDeliveryAddress"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t.checkout_page.secondFullAddressLabel}</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} placeholder={t.checkout_page.secondFullAddressPlaceholder} className="min-h-[80px]" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                  control={form.control}
                                  name="secondDeliveryProvince"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t.checkout_page.provinceLabel}</FormLabel>
                                      <Select 
                                        onValueChange={(value) => {
                                          field.onChange(value);
                                          // Find province ID and set it for city filtering
                                          const selectedProvince = provinces.find((p: any) => canonicalGeographyName(p) === value || geographyName(p) === value);
                                          if (selectedProvince) {
                                            setSelectedSecondaryProvinceId(selectedProvince.id);
                                            // Clear city selection when province changes
                                            form.setValue("secondDeliveryCity", "");
                                          }
                                        }} 
                                        value={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder={t.checkout_page.selectProvincePlaceholder} />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {Array.isArray(provinces) && provinces.map((province: any) => (
                                            <SelectItem key={province.id} value={canonicalGeographyName(province)}>
                                              {geographyName(province)} / {canonicalGeographyName(province)}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="secondDeliveryCity"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t.checkout_page.citySelectLabel}</FormLabel>
                                      <Select 
                                        onValueChange={field.onChange} 
                                        value={field.value}
                                        disabled={!selectedSecondaryProvinceId}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder={selectedSecondaryProvinceId ? t.checkout_page.selectCityPlaceholder : t.checkout_page.selectProvinceFirst} />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {Array.isArray(secondaryCities) && secondaryCities.map((city: any) => (
                                            <SelectItem key={city.id} value={canonicalGeographyName(city)}>
                                              {geographyName(city)} / {canonicalGeographyName(city)}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="secondDeliveryPostalCode"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t.checkout_page.postalCodeLabel}</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder={t.checkout_page.postalCodePlaceholder} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Different Mobile Section */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">{t.checkout_page.differentMobileOptional}</label>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setShowRecipientMobile(!showRecipientMobile);
                                // Disable primary CRM phone fields when different mobile is activated
                                if (!showRecipientMobile) {
                                  // When activating different mobile, clear primary phone fields
                                  form.setValue("phone", "");
                                  form.setValue("recipientPhone", "");
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {showRecipientMobile ? t.checkout_page.hideButton : t.checkout_page.addDifferentNumber}
                            </Button>
                          </div>
                          
                          {showRecipientMobile && (
                            <div className="p-4 bg-gray-50 rounded-lg border">
                              <FormField
                                control={form.control}
                                name="recipientMobile"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t.checkout_page.recipientMobileLabel}</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="09123456789" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Delivery Method */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      {t.checkout_page.shippingMethodTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="shippingMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.checkout_page.selectShippingLabel}</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              disabled={hasEnforcedContractShippingMode}
                              onValueChange={(methodId) => {
                                if (!hasEnforcedContractShippingMode || methodId === requiredContractShippingMethodId) {
                                  field.onChange(methodId);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue 
                                  placeholder={
                                    selectedVehicle && destinationCity && totalWeight > 0 && shippingQuoteReady
                                      ? `🚚 ${selectedVehicle.name} - ${shippingCost.toLocaleString()} IQD (${destinationCity})`
                                      : t.checkout_page.selectShippingPlaceholder
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {/* Display all delivery methods including smart_vehicle */}
                                {(deliveryMethods as any[])?.map((method: any) => {
                                  // Handle smart_vehicle specially
                                  if (method.value === 'smart_vehicle') {
                                    if (selectedVehicle && destinationCity && totalWeight > 0 && shippingQuoteReady) {
                                      // Show calculated smart vehicle option
                                      return (
                                        <SelectItem key={method.id} value={method.id.toString()} className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                                          <div className="flex flex-col gap-1 w-full">
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium text-emerald-700 dark:text-emerald-300">
                                                🚚 {selectedVehicle.name} ({t.checkout_page.smartSelectionNote})
                                              </span>
                                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                {shippingCost.toLocaleString()} IQD
                                              </span>
                                            </div>
                                            <div className="text-xs text-emerald-600 dark:text-emerald-400 space-y-1">
                                              <div>📍 {t.checkout_page.destination} {destinationCity} • {t.checkout_page.weight} {totalWeight.toFixed(1)} {t.checkout_page.kg}</div>
                                            </div>
                                          </div>
                                        </SelectItem>
                                      );
                                    } else {
                                      // Show placeholder smart vehicle option
                                      return (
                                        <SelectItem key={method.id} value={method.id.toString()} className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                                          <div className="flex flex-col gap-1 w-full">
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium text-emerald-700 dark:text-emerald-300">
                                                🚚 {method.label}
                                              </span>
                                              <span className="text-emerald-600 dark:text-emerald-400 text-xs">
                                                {shippingRouteUnavailable ? shippingRouteUnavailableMessage : t.checkout_page.autoCalculate}
                                              </span>
                                            </div>
                                            <div className="text-xs text-emerald-600 dark:text-emerald-400">
                                              {!destinationCity ? t.checkout_page.specifyDestinationCity :
                                               totalWeight <= 0 ? t.checkout_page.addProductsToCart :
                                               t.checkout_page.calculatingBestVehicle}
                                            </div>
                                          </div>
                                        </SelectItem>
                                      );
                                    }
                                  }
                                  
                                  if (isGenuinePickupMethod(method)) {
                                    return (
                                      <SelectItem key={method.id} value={method.id.toString()}>
                                        <div className="flex items-center justify-between w-full">
                                          <span>{method.label}</span>
                                          <span className="ml-2 text-sm">{t.checkout_page.freeShipping}</span>
                                        </div>
                                      </SelectItem>
                                    );
                                  }

                                  // Handle freight_collect specially
                                  if (method.value === 'freight_collect') {
                                    const isSelectedFreight = method.id?.toString() === selectedShippingMethodId;
                                    const freightStatus = shippingRouteUnavailable
                                      ? shippingRouteUnavailableMessage
                                      : shippingQuoteReady
                                        ? (shippingCost === 0 ? t.checkout_page.freeShipping : `${shippingCost.toLocaleString()} IQD`)
                                        : isSelectedFreight && shippingCalculationPending
                                          ? t.checkout_page.calculatingBestVehicle
                                          : shippingRouteUnavailableMessage;
                                    return (
                                      <SelectItem key={method.id} value={method.id.toString()} className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                                        <div className="flex flex-col gap-1 w-full">
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium text-orange-700 dark:text-orange-300">
                                              🚚 {t.checkout_page.freightCollect}
                                            </span>
                                            <span className="text-orange-600 dark:text-orange-400 font-bold">
                                              {freightStatus}
                                            </span>
                                          </div>
                                          <div className="text-xs text-orange-600 dark:text-orange-400">
                                            {!shippingQuoteReady || shippingRouteUnavailable
                                              ? freightStatus
                                              : `${t.checkout_page.freightCollectNote} · ${t.checkout_page.freightCollectDescription}`}
                                          </div>
                                        </div>
                                      </SelectItem>
                                    );
                                  }

                                  // Standard methods are priced exclusively by the server quote endpoint.
                                  const methodHasCurrentQuote = method.id?.toString() === selectedShippingMethodId && standardQuoteReady;
                                  const methodPriceText = shippingRouteUnavailable
                                    ? shippingRouteUnavailableMessage
                                    : methodHasCurrentQuote
                                      ? (standardShippingQuote!.cost === 0 ? t.checkout_page.freeShipping : `${standardShippingQuote!.cost.toLocaleString()} IQD`)
                                      : method.id?.toString() === selectedShippingMethodId && shippingCalculationPending
                                        ? t.checkout_page.calculatingBestVehicle
                                        : shippingRouteUnavailableMessage;
                                  
                                  return (
                                    <SelectItem key={method.id} value={method.id.toString()}>
                                      <div className="flex items-center justify-between w-full">
                                        <span>{method.label}</span>
                                        <span className="ml-2 text-sm">
                                          {methodPriceText}
                                          {method.estimatedDays && ` (${method.estimatedDays} ${t.checkout_page.days})`}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          {hasEnforcedContractShippingMode && (
                            <p role={requiredContractShippingMethodId ? 'status' : 'alert'} className={`text-sm ${requiredContractShippingMethodId ? 'text-muted-foreground' : 'text-destructive'}`}>
                              {contractShippingMethodNotice}
                            </p>
                          )}
                          {hasBulkContractProducts&&
                            <BulkVehicleSelector language={language} value={bulkVehicleTemplateId} onChange={setBulkVehicleTemplateId} selfTransport={selectedContractShippingMode==="self_transport"}/>}
                          {isCurrentMethodShippingDependent && (shippingRouteUnavailable || shippingCalculationPending || !shippingQuoteReady) && (
                            <p role="alert" className="text-sm text-destructive">
                              {!deliveryAddressReady
                                ? deliveryAddressPrompt
                                : shippingRouteUnavailable
                                ? shippingRouteUnavailableMessage
                                : shippingCalculationPending
                                  ? t.checkout_page.calculatingBestVehicle
                                  : isSmartVehicleShipping
                                    ? t.checkout_page.calculatingBestVehicle
                                    : shippingRouteUnavailableMessage}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Show delivery details */}
                    {selectedMethod && (
                      <div className={`rounded-lg p-3 border ${
                        selectedMethod.value === 'freight_collect' 
                          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      }`}>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span>{t.checkout_page.shippingCostLabel}</span>
                            <span className="font-medium">
                              {shippingSelectionUnavailable
                                ? (!deliveryAddressReady
                                  ? deliveryAddressPrompt
                                  : shippingRouteUnavailable
                                  ? shippingRouteUnavailableMessage
                                  : shippingCalculationPending
                                    ? t.checkout_page.calculatingBestVehicle
                                    : isSmartVehicleShipping
                                      ? t.checkout_page.calculatingBestVehicle
                                      : shippingRouteUnavailableMessage)
                                : currentMethodValue === 'freight_collect'
                                ? `${shippingCost === 0 ? t.checkout_page.freeShipping : `${shippingCost.toLocaleString()} IQD`} · ${t.checkout_page.freightCollectNote}`
                                : (shippingCost === 0 ? t.checkout_page.freeShipping : `${shippingCost.toLocaleString()} IQD`)
                              }
                            </span>
                          </div>
                          {shippingSelectionUnavailable ? (
                            <p role="alert" className="text-sm text-destructive">{shippingRouteUnavailable
                              ? shippingRouteUnavailableMessage
                              : shippingCalculationPending || isSmartVehicleShipping
                                ? t.checkout_page.calculatingBestVehicle
                                : shippingRouteUnavailableMessage}</p>
                          ) : selectedMethod.value === 'freight_collect' ? (
                            <div className="bg-orange-100 dark:bg-orange-900/30 rounded p-2 border border-orange-300 dark:border-orange-700">
                              <div className="text-xs text-orange-700 dark:text-orange-300 space-y-1">
                                <div className="font-medium">🚚 {t.checkout_page.freightCollectSelected}</div>
                                <div>{t.checkout_page.freightCollectDescription}</div>
                              </div>
                            </div>
                          ) : isSmartVehicleShipping && selectedVehicle ? (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded p-2 border border-emerald-200 dark:border-emerald-800">
                              <div className="text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
                                <div className="font-medium">{t.checkout_page.smartSelectionDetails}</div>
                                <div>{t.checkout_page.selectedVehicleLabel} {selectedVehicle.name}</div>
                                <div>{t.checkout_page.weightCapacity} {selectedVehicle.maxWeight} {t.checkout_page.kg}</div>
                                <div>{t.checkout_page.volumeCapacity} {selectedVehicle.maxVolume} {t.checkout_page.cubicMeter}</div>
                                <div>{t.checkout_page.allowedRoutesLabel} {selectedVehicle.allowedRoutes}</div>
                                {selectedVehicle.hazardousMaterials && <div>{t.checkout_page.hazardousTransport}</div>}
                                {selectedVehicle.refrigeratedTransport && <div>{t.checkout_page.refrigeratedTransport}</div>}
                                {selectedVehicle.fragileItems && <div>{t.checkout_page.fragileHandling}</div>}
                              </div>
                            </div>
                          ) : null}
                          {selectedMethod.description && (
                            <div className="text-xs text-muted-foreground">
                              {selectedMethod.description}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payment is available only after delivery and its price are known. */}
                {!finalPriceReady && (
                  <p role="status" className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                    {contractValidationError
                      ? 'Resolve the selected contract issue before requesting shipping or continuing to payment.'
                      : !currentShippingMethod
                      ? (language === 'fa' ? 'ابتدا روش ارسال را انتخاب کنید.' : 'Choose a delivery method first.')
                      : !deliveryAddressReady && !isCurrentMethodGenuinePickup
                      ? deliveryAddressPrompt
                      : t.checkout_page.calculatingBestVehicle}
                  </p>
                )}
                {finalPriceReady && <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      {t.checkout_page.paymentMethodTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.checkout_page.selectPaymentMethod}</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder={t.checkout_page.selectPaymentPlaceholder} />
                              </SelectTrigger>
                              <SelectContent>
                                {/* Dynamic payment methods based on admin settings */}
                                {paymentSettings
                                  .filter((setting: any) =>
                                    setting.enabled &&
                                    !(selectedContractId !== null && isWalletPaymentMethod(setting.methodKey))
                                  )
                                  .sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0))
                                  .map((setting: any) => {
                                    // Get localized method name
                                    const methodName = language === 'en' 
                                      ? (setting.methodNameEn || setting.methodName)
                                      : (setting.methodNameAr || setting.methodName);
                                    
                                    // Special handling for wallet payment
                                    if (setting.methodKey === 'wallet') {
                                      if (!isUserLoggedIn || walletBalance <= 0) return null;
                                      return (
                                        <SelectItem key={setting.methodKey} value="wallet_combined">
                                          {methodName} - {t.checkout_page.walletBalance} {walletBalance.toLocaleString()} IQD
                                        </SelectItem>
                                      );
                                    }
                                    
                                    // Regular payment methods
                                    return (
                                      <SelectItem key={setting.methodKey} value={setting.methodKey}>
                                        {methodName}
                                      </SelectItem>
                                    );
                                  })}
                                
                                {/* Fallback for when no settings are loaded yet */}
                                {paymentSettings.length === 0 && (
                                  <>
                                    <SelectItem value="bank_receipt">{t.checkout_page.bankReceiptUpload}</SelectItem>
                                    <SelectItem value="online_payment">{t.checkout_page.onlinePaymentMethod}</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Wallet Payment Section */}
                    {selectedContractId === null && isUserLoggedIn && walletBalance > 0 && form.watch('paymentMethod') === 'wallet_combined' && (
                      <div className="p-4 bg-green-50 rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-green-800">{t.checkout_page.walletPaymentTitle}</h4>
                            <p className="text-sm text-green-600">{walletBalance.toLocaleString()} IQD {t.checkout_page.availableFunds}</p>
                          </div>

                        </div>
                        
                        {useWallet && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-green-700">
                              {t.checkout_page.walletAmountToUse}
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={maxWalletUsage}
                              value={walletAmountToUse}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setWalletAmountToUse(Math.min(value, maxWalletUsage));
                              }}
                              className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                              placeholder={`${t.checkout_page.maximum} ${maxWalletUsage.toLocaleString()} IQD`}
                            />
                            <div className="flex justify-between text-xs text-green-600">
                              <span>{t.checkout_page.walletBalance} {walletBalance.toLocaleString()} IQD</span>
                              <span>{t.checkout_page.maximum}: {maxWalletUsage.toLocaleString()} IQD</span>
                            </div>
                            
                            {actualWalletUsage > 0 && (
                              <div className="mt-2 p-2 bg-green-100 rounded text-sm text-green-800">
                                <div className="flex justify-between">
                                  <span>{t.checkout_page.amountFromWallet}</span>
                                  <span className="font-semibold">-{actualWalletUsage.toLocaleString()} IQD</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>{t.checkout_page.remainingAmount}</span>
                                  <span className="font-semibold">{totalAmount.toLocaleString()} IQD</span>
                                </div>
                                {actualWalletUsage >= beforeWalletTotal ? (
                                  <div className="mt-1 text-green-700 font-medium">
                                    {t.checkout_page.orderFullyPaidByWallet}
                                  </div>
                                ) : (
                                  <div className="mt-1 text-blue-700 font-medium">
                                    → {t.checkout_page.remainingAmount} ({totalAmount.toLocaleString()} IQD)
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Secondary Payment Method for Combined Payments */}
                    {selectedContractId === null && form.watch('paymentMethod') === 'wallet_combined' && (
                      <div className="space-y-4">
                        {/* Remaining Amount Card */}
                        {totalAmount > 0 && (
                          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-orange-800">{t.checkout_page.remainingAmount}</h4>
                                <p className="text-sm text-orange-600">
                                  {t.checkout_page.amountFromWallet} ({actualWalletUsage.toLocaleString()} IQD)
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-2xl font-bold text-orange-900">
                                  {totalAmount.toLocaleString()} IQD
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Payment Method Selection */}
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-800 mb-3">{t.checkout_page.selectPaymentMethod}</h4>
                          <Select value={secondaryPaymentMethod} onValueChange={setSecondaryPaymentMethod}>
                            <SelectTrigger>
                              <SelectValue placeholder={t.checkout_page.selectPaymentPlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Dynamic secondary payment methods based on admin settings */}
                              {paymentSettings
                                .filter((setting: any) => setting.enabled && setting.methodKey !== 'wallet')
                                .sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0))
                                .map((setting: any) => (
                                  <SelectItem key={setting.methodKey} value={setting.methodKey}>
                                    {setting.methodName}
                                  </SelectItem>
                                ))}
                              
                              {/* Fallback options if no settings are loaded */}
                              {paymentSettings.length === 0 && (
                                <>
                                  <SelectItem value="bank_receipt">{t.checkout_page.bankReceiptUpload}</SelectItem>
                                  <SelectItem value="online_payment">{t.checkout_page.onlinePaymentMethod}</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.checkout_page.orderNotes} ({t.optional})</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder={t.checkout_page.orderNotesPlaceholder}
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>}

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={createOrderMutation.isPending || shippingSelectionUnavailable}
                  >
                    {createOrderMutation.isPending ? t.checkout_page.processingOrder : t.checkout_page.placeOrder}
                  </Button>
                </form>
              </Form>
            )}
          </div>

          {/* Order Summary - Drop Zone */}
          <div 
            className="lg:col-span-1 space-y-4"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              e.currentTarget.style.backgroundColor = '#f0f9ff';
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.backgroundColor = '';
              // The drag functionality is working - card can be moved around
            }}
          >
            {/* Enhanced Checkout Features Notice */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3 text-center">
              <div className="text-sm font-medium text-blue-800 mb-1">🎉 Enhanced Checkout Features</div>
              <div className="text-xs text-blue-600">
                {t.checkout_page.draggableCardMessage}
              </div>
            </div>
            
            {/* Purchase Order Card - Mouse Draggable */}
            <Card 
              ref={cardRef}
              onMouseDown={handleMouseDown}
              className={`relative border-2 border-dashed border-blue-300 hover:border-blue-500 transition-all duration-300 select-none ${
                isDragging ? 'cursor-grabbing opacity-70 z-50' : 'cursor-grab hover:shadow-lg'
              }`}
              style={{
                position: isDragging ? 'fixed' : 'relative',
                left: isDragging ? cardPosition.x : 'auto',
                top: isDragging ? cardPosition.y : 'auto',
                zIndex: isDragging ? 9999 : 'auto',
                transform: isDragging ? 'none' : 'scale(1)',
              }}
              title={t.checkout_page.dragToMove}
            >
              <CardHeader 
                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors drag-handle"
                onClick={(e) => {
                  // Only toggle if not dragging
                  if (!isDragging) {
                    setShowPurchaseOrder(!showPurchaseOrder);
                  }
                }}
              >
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-600">{t.checkout_page.purchaseOrder}</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {isDragging ? t.checkout_page.dragging : t.checkout_page.draggable}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {showPurchaseOrder ? '−' : '+'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPurchaseOrder(false);
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                      title={t.checkout_page.minimize}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </CardTitle>
              </CardHeader>
              {showPurchaseOrder && (
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      {t.checkout_page.orderContainsItems.replace('{count}', cartItems.length.toString())}
                    </div>
                    
                    {/* CRM Default Address Information - Only for logged in users */}
                    {isUserLoggedIn && customerData?.customer && (
                      <div className={`p-3 rounded-lg border transition-all duration-300 ${
                        (isPrimaryAddressDisabled || isPrimaryMobileDisabled) 
                          ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-60' 
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      }`}>
                        <div className={`text-xs font-medium mb-2 flex items-center gap-2 ${
                          (isPrimaryAddressDisabled || isPrimaryMobileDisabled)
                            ? 'text-gray-600 dark:text-gray-400'
                            : 'text-blue-800 dark:text-blue-300'
                        }`}>
                          <MapPin className="w-3 h-3" />
                          {(isPrimaryAddressDisabled || isPrimaryMobileDisabled) 
                            ? t.checkout_page.defaultAddressInactive 
                            : t.checkout_page.defaultDeliveryAddress}
                        </div>
                        <div className={`space-y-1 text-xs ${
                          (isPrimaryAddressDisabled || isPrimaryMobileDisabled)
                            ? 'text-gray-500 dark:text-gray-500'
                            : 'text-blue-700 dark:text-blue-400'
                        }`}>
                          <div className="flex justify-between">
                            <span>{t.checkout_page.provinceField}</span>
                            <span className="font-medium">{customerData.customer.province || customerData.customer.state || t.checkout_page.unknown}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t.checkout_page.cityField}</span>
                            <span className="font-medium">{customerData.customer.city || t.checkout_page.unknown}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t.checkout_page.fullAddress}</span>
                            <span className="font-medium text-right max-w-[60%]">{customerData.customer.address || t.checkout_page.unknown}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t.checkout_page.postalCode}</span>
                            <span className="font-medium">{customerData.customer.postalCode || t.checkout_page.unknown}</span>
                          </div>
                        </div>
                        <div className={`mt-2 pt-2 border-t transition-colors ${
                          (isPrimaryAddressDisabled || isPrimaryMobileDisabled)
                            ? 'border-gray-300 dark:border-gray-600'
                            : 'border-blue-200 dark:border-blue-700'
                        }`}>
                          <div className={`text-xs italic ${
                            (isPrimaryAddressDisabled || isPrimaryMobileDisabled)
                              ? 'text-gray-500 dark:text-gray-500'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}>
                            {(isPrimaryAddressDisabled || isPrimaryMobileDisabled) 
                              ? t.checkout_page.addressNotUsed
                              : t.checkout_page.defaultAddressNote}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Active Address/Phone Information - Shows when second address or different phone is specified */}
                    {isUserLoggedIn && (isPrimaryAddressDisabled || isPrimaryMobileDisabled) && (
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="text-xs font-medium text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          {t.checkout_page.activeDeliveryInfo}
                        </div>
                        <div className="space-y-1 text-xs text-green-700 dark:text-green-400">
                          {form.watch('secondDeliveryAddress') && (
                            <>
                              <div className="flex justify-between">
                                <span>{t.checkout_page.activeAddress}</span>
                                <span className="font-medium text-right max-w-[60%]">{form.watch('secondDeliveryAddress')}</span>
                              </div>
                              {form.watch('secondDeliveryProvince') && (
                                <div className="flex justify-between">
                                  <span>{t.checkout_page.provinceField}</span>
                                  <span className="font-medium">{form.watch('secondDeliveryProvince')}</span>
                                </div>
                              )}
                              {form.watch('secondDeliveryCity') && (
                                <div className="flex justify-between">
                                  <span>{t.checkout_page.cityField}</span>
                                  <span className="font-medium">{form.watch('secondDeliveryCity')}</span>
                                </div>
                              )}
                              {form.watch('secondDeliveryPostalCode') && (
                                <div className="flex justify-between">
                                  <span>{t.checkout_page.postalCode}</span>
                                  <span className="font-medium">{form.watch('secondDeliveryPostalCode')}</span>
                                </div>
                              )}
                            </>
                          )}
                          {form.watch('recipientMobile') && (
                            <div className="flex justify-between">
                              <span>{t.checkout_page.recipientPhoneNumber}</span>
                              <span className="font-medium">{form.watch('recipientMobile')}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-700">
                          <div className="text-xs text-green-600 dark:text-green-400 italic">
                            {t.checkout_page.infoWillBeUsed}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-2">
                        {t.checkout_page.orderSummaryTitle}
                      </div>
                      <div className="space-y-1 text-xs text-blue-700 dark:text-blue-400">
                        <div className="flex justify-between">
                          <span>{t.checkout_page.itemCount}</span>
                          <span>{cartItems.reduce((sum, item) => sum + item.quantity, 0)} {t.checkout_page.items}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t.checkout_page.approximateWeight}</span>
                          <span className="font-semibold flex items-center gap-1">
                            <Weight className="w-3 h-3" />
                            {totalWeight.toFixed(2)} {t.checkout_page.kg}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t.checkout_page.orderDate}</span>
                          <span>{new Date().toLocaleDateString('fa-IR')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Smart Vehicle Selection Display */}
                    {selectedVehicle && destinationCity && shippingQuoteReady && (
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="text-xs font-medium text-green-800 dark:text-green-300 mb-2 flex items-center gap-1">
                          <Car className="w-3 h-3" />
                          {t.checkout_page.smartVehicleSelectionLabel}
                        </div>
                        <div className="space-y-1 text-xs text-green-700 dark:text-green-400">
                          <div className="flex justify-between">
                            <span>{t.checkout_page.vehicleTypeLabel}</span>
                            <span className="font-semibold">{selectedVehicle.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t.checkout_page.weightCapacityLabel}</span>
                            <span>{parseFloat(selectedVehicle.maxWeightKg || '0').toLocaleString()} {t.checkout_page.kg}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t.checkout_page.destinationLabel}</span>
                            <span className="font-semibold">{destinationCity}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t.checkout_page.shippingCostLabel}</span>
                            <span>{shippingCost.toLocaleString()} {t.checkout_page.iqd}</span>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-700">
                          <div className="text-xs text-green-600 dark:text-green-400 italic flex items-center gap-1">
                            <Calculator className="w-3 h-3" />
                            {t.checkout_page.autoCalculation}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Legacy free-form address editor replaced by the titled address selector above. */}
                    <div className="hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Second Address (Optional)</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowSecondAddress(!showSecondAddress)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 h-6 w-6 p-0"
                        >
                          {showSecondAddress ? '−' : '+'}
                        </Button>
                      </div>
                      
                      {showSecondAddress && (
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Delivery Address
                            </label>
                            <FormField
                              control={form.control}
                              name="secondDeliveryAddress"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Textarea
                                      {...field}
                                      placeholder={t.checkout_page.secondAddressDeliveryPlaceholder}
                                      className="min-h-[60px] text-sm"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Province
                              </label>
                              <FormField
                                control={form.control}
                                name="secondDeliveryProvince"
                                render={({ field }) => (
                                  <FormItem>
                                    <Select 
                                      onValueChange={(value) => {
                                        field.onChange(value);
                                        // Find province ID and set it for city filtering
                                        const selectedProvince = provinces.find((p: any) => canonicalGeographyName(p) === value || geographyName(p) === value);
                                        if (selectedProvince) {
                                          setSelectedSecondaryProvinceId(selectedProvince.id);
                                          // Clear city selection when province changes
                                          form.setValue("secondDeliveryCity", "");
                                        }
                                      }} 
                                      value={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="text-sm">
                                          <SelectValue placeholder="Select Province" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {Array.isArray(provinces) && provinces.map((province: any) => (
                                          <SelectItem key={province.id} value={canonicalGeographyName(province)}>
                                            {geographyName(province)} / {canonicalGeographyName(province)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                City
                              </label>
                              <FormField
                                control={form.control}
                                name="secondDeliveryCity"
                                render={({ field }) => (
                                  <FormItem>
                                    <Select 
                                      onValueChange={field.onChange} 
                                      value={field.value}
                                      disabled={!selectedSecondaryProvinceId}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="text-sm">
                                          <SelectValue placeholder={selectedSecondaryProvinceId ? t.checkout_page.selectCity : t.checkout_page.selectProvinceFirst} />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {Array.isArray(secondaryCities) && secondaryCities.map((city: any) => (
                                          <SelectItem key={city.id} value={canonicalGeographyName(city)}>
                                            {geographyName(city)} / {canonicalGeographyName(city)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t.checkout_page.postalCodeOptional}
                              </label>
                              <FormField
                                control={form.control}
                                name="secondDeliveryPostalCode"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input {...field} placeholder="1968913751" className="text-sm" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Recipient Mobile */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.checkout_page.recipientMobileLabel}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowRecipientMobile(!showRecipientMobile)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 h-6 w-6 p-0"
                        >
                          {showRecipientMobile ? '−' : '+'}
                        </Button>
                      </div>
                      
                      {showRecipientMobile && (
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t.checkout_page.recipientMobileLabel}
                            </label>
                            <FormField
                              control={form.control}
                              name="recipientMobile"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="09123456789"
                                      className="text-sm"
                                      type="tel"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            {t.checkout_page.smsDeliveryConfirmation}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Second Delivery Address Section in Purchase Order */}
                    {isUserLoggedIn && (
                      <div className="hidden space-y-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">{t.checkout_page.secondAddressTitle}</h4>
                        
                        {/* Second Address Option */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.checkout_page.secondAddressOptional}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowSecondAddress(!showSecondAddress)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 h-6 w-6 p-0"
                            >
                              {showSecondAddress ? '−' : '+'}
                            </Button>
                          </div>
                          
                          {showSecondAddress && (
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border space-y-3">
                              <FormField
                                control={form.control}
                                name="secondDeliveryAddress"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm">{t.checkout_page.fullAddressLabel}</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        {...field}
                                        placeholder={t.checkout_page.secondAddressDeliveryPlaceholder}
                                        className="min-h-[60px]"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <div className="grid grid-cols-3 gap-3">
                                <FormField
                                  control={form.control}
                                  name="secondDeliveryProvince"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm">{t.checkout_page.provinceLabel}</FormLabel>
                                      <Select 
                                        onValueChange={(value) => {
                                          field.onChange(value);
                                          // Find province ID and set it for city filtering
                                          const selectedProvince = provinces.find((p: any) => canonicalGeographyName(p) === value || geographyName(p) === value);
                                          if (selectedProvince) {
                                            setSelectedSecondaryProvinceId(selectedProvince.id);
                                            // Clear city selection when province changes
                                            form.setValue("secondDeliveryCity", "");
                                          }
                                        }} 
                                        value={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder={t.checkout_page.selectProvincePlaceholder} />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {Array.isArray(provinces) && provinces.map((province: any) => (
                                            <SelectItem key={province.id} value={canonicalGeographyName(province)}>
                                              {geographyName(province)} / {canonicalGeographyName(province)}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="secondDeliveryCity"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm">{t.checkout_page.citySelectLabel}</FormLabel>
                                      <Select 
                                        onValueChange={field.onChange} 
                                        value={field.value}
                                        disabled={!selectedSecondaryProvinceId}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder={selectedSecondaryProvinceId ? t.checkout_page.selectCityPlaceholder : t.checkout_page.selectProvinceFirst} />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {Array.isArray(secondaryCities) && secondaryCities.map((city: any) => (
                                            <SelectItem key={city.id} value={canonicalGeographyName(city)}>
                                              {geographyName(city)} / {canonicalGeographyName(city)}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="secondDeliveryPostalCode"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm">{t.checkout_page.postalCodeLabel}</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="12345" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Recipient Mobile */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.checkout_page.differentMobileNumberLabel}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowRecipientMobile(!showRecipientMobile)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 h-6 w-6 p-0"
                            >
                              {showRecipientMobile ? '−' : '+'}
                            </Button>
                          </div>
                          
                          {showRecipientMobile && (
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
                              <FormField
                                control={form.control}
                                name="recipientMobile"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm">{t.checkout_page.recipientMobileLabel}</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="09123456789"
                                        type="tel"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <p className="mt-2 text-sm text-gray-500">
                                {t.checkout_page.thisNumberForDelivery}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-4">
                      {t.checkout_page.orderCodeAfterCheckout}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Cart Management Card */}
            <Card>
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setShowCartManagement(!showCartManagement)}
              >
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-purple-600" />
                    <span className="text-purple-600">Cart Management</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">NEW</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {showCartManagement ? '−' : '+'}
                  </span>
                </CardTitle>
              </CardHeader>
              {showCartManagement && (
                <CardContent className="space-y-4">
                  {/* Cart Items */}
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div key={item.id} className={`p-3 rounded-lg ${item.usesContractPrice ? contractTheme.panel : "bg-gray-50 dark:bg-gray-800"}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">{item.name}</h4>
                              {item.usesContractPrice && (
                                <span className={contractTheme.badge}>
                                  {language === 'fa' ? 'قرارداد' : language === 'ar' ? 'عقد' : language === 'tr' ? 'Sözleşme' : 'Contract'} {selectedContract?.number}
                                </span>
                              )}
                              {item.isFlammable && (
                                <div className="flex items-center">
                                  <Flame className="w-4 h-4 text-red-500" />
                                  <span className="text-xs text-red-600 font-medium ml-1">Flammable</span>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {t.checkout_page.productCode} {item.sku || 'N/A'}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                            onClick={() => {
                              // Remove item from cart logic would go here
                              toast({
                                title: t.checkout_page.removeFromCart,
                                description: `${item.name} ${t.checkout_page.removedFromCartMsg}`,
                              });
                            }}
                          >
                            ×
                          </Button>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                // Decrease quantity logic
                              }}
                            >
                              −
                            </Button>
                            <span className="min-w-[20px] text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                // Increase quantity logic
                              }}
                            >
                              +
                            </Button>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">
                              {item.quantity} × {item.usesContractPrice ? (
                                <span className={contractTheme.text}>{Math.round(item.discountedUnitPrice).toLocaleString()}</span>
                              ) : item.hasDiscount ? (
                                <span>
                                  <span className="line-through text-gray-400 mr-1">{item.originalUnitPrice.toLocaleString()}</span>
                                  <span className="text-green-600 font-semibold">{Math.round(item.discountedUnitPrice).toLocaleString()}</span>
                                </span>
                              ) : (
                                <span>{parseFloat(item.price).toLocaleString()}</span>
                              )} IQD
                            </div>
                            <div className={`font-medium ${item.usesContractPrice ? contractTheme.text : ""}`}>
                              {Math.round(item.totalPrice).toLocaleString()} IQD
                            </div>
                            {item.hasDiscount && (
                              <div className="text-[10px] text-green-600 font-medium">
                                {(item.bulk_purchase_enabled || item.bulkPurchaseEnabled) ? '📦' : '🏷️'} {getActualDiscountPercent(item, item.quantity)}% {t.shop?.off || 'OFF'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  


                  {/* CRM Default Address Information in Cart Management */}
                  {isUserLoggedIn && customerData?.customer && (
                    <div className={`p-2 rounded border transition-all duration-300 ${
                      (isPrimaryAddressDisabled || isPrimaryMobileDisabled) 
                        ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-60' 
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}>
                      <div className={`text-xs font-medium mb-1 flex items-center gap-1 ${
                        (isPrimaryAddressDisabled || isPrimaryMobileDisabled)
                          ? 'text-gray-600 dark:text-gray-400'
                          : 'text-blue-800 dark:text-blue-300'
                      }`}>
                        <MapPin className="w-3 h-3" />
                        {(isPrimaryAddressDisabled || isPrimaryMobileDisabled) 
                          ? t.checkout_page.defaultAddressInactive 
                          : t.checkout_page.defaultAddressCRM}
                      </div>
                      <div className={`space-y-1 text-xs ${
                        (isPrimaryAddressDisabled || isPrimaryMobileDisabled)
                          ? 'text-gray-500 dark:text-gray-500'
                          : 'text-blue-700 dark:text-blue-400'
                      }`}>
                        <div className="flex justify-between">
                          <span>{t.checkout_page.provinceField}</span>
                          <span className="font-medium">{customerData.customer.province || customerData.customer.state || t.checkout_page.unknown}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t.checkout_page.cityField}</span>
                          <span className="font-medium">{customerData.customer.city || t.checkout_page.unknown}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t.checkout_page.phoneField}</span>
                          <span className="font-medium">{customerData.customer.phone || t.checkout_page.unknown}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Second Delivery Address Section in Cart Management */}
                  {isUserLoggedIn && (
                    <div className="hidden space-y-3 pt-3 border-t">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.checkout_page.secondAddressTitle}</h4>
                      
                      {/* Second Address Option */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t.checkout_page.secondAddressOptional}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowSecondAddress(!showSecondAddress)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 h-5 w-5 p-0"
                          >
                            {showSecondAddress ? '−' : '+'}
                          </Button>
                        </div>
                        
                        {showSecondAddress && (
                          <div className="bg-white dark:bg-gray-700 p-2 rounded border text-xs space-y-2">
                            <FormField
                              control={form.control}
                              name="secondDeliveryAddress"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">{t.checkout_page.fullAddressLabel}</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      {...field}
                                      placeholder={t.checkout_page.secondAddressDeliveryPlaceholder}
                                      className="min-h-[50px] text-xs"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-3 gap-1">
                              <FormField
                                control={form.control}
                                name="secondDeliveryProvince"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">{t.checkout_page.provinceLabel}</FormLabel>
                                    <Select 
                                      onValueChange={(value) => {
                                        field.onChange(value);
                                        // Find province ID and set it for city filtering
                                        const selectedProvince = provinces.find((p: any) => canonicalGeographyName(p) === value || geographyName(p) === value);
                                        if (selectedProvince) {
                                          setSelectedSecondaryProvinceId(selectedProvince.id);
                                          // Clear city selection when province changes
                                          form.setValue("secondDeliveryCity", "");
                                        }
                                      }} 
                                      value={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="text-xs h-7">
                                          <SelectValue placeholder={t.checkout_page.selectProvincePlaceholder} />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {Array.isArray(provinces) && provinces.map((province: any) => (
                                          <SelectItem key={province.id} value={canonicalGeographyName(province)}>
                                            {geographyName(province)} / {canonicalGeographyName(province)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="secondDeliveryCity"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">{t.checkout_page.citySelectLabel}</FormLabel>
                                    <Select 
                                      onValueChange={field.onChange} 
                                      value={field.value}
                                      disabled={!selectedSecondaryProvinceId}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="text-xs h-7">
                                          <SelectValue placeholder={selectedSecondaryProvinceId ? t.checkout_page.selectCityPlaceholder : t.checkout_page.selectProvinceFirst} />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {Array.isArray(secondaryCities) && secondaryCities.map((city: any) => (
                                          <SelectItem key={city.id} value={canonicalGeographyName(city)}>
                                            {geographyName(city)} / {canonicalGeographyName(city)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="secondDeliveryPostalCode"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">{t.checkout_page.postalCodeLabel}</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="12345" className="text-xs h-7" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Recipient Mobile */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t.checkout_page.differentMobileNumberLabel}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowRecipientMobile(!showRecipientMobile)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 h-5 w-5 p-0"
                          >
                            {showRecipientMobile ? '−' : '+'}
                          </Button>
                        </div>
                        
                        {showRecipientMobile && (
                          <div className="bg-white dark:bg-gray-700 p-2 rounded border">
                            <FormField
                              control={form.control}
                              name="recipientMobile"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">{t.checkout_page.recipientMobileLabel}</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="09123456789"
                                      className="text-xs h-7"
                                      type="tel"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              {t.checkout_page.thisNumberForDelivery}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cart Actions */}
                  <div className="space-y-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setLocation("/shop")}
                    >
                      {t.checkout_page.continueShoppingBtn}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs text-red-600 hover:text-red-700"
                      onClick={() => {
                        // Clear cart logic
                        toast({
                          title: t.checkout_page.cartClearedTitle,
                          description: t.checkout_page.allProductsRemoved,
                        });
                      }}
                    >
                      {t.checkout_page.clearCartBtn}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle>{t.checkout_page.paymentSummaryTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{t.checkout_page.itemsTotal}</span>
                    <span>{subtotal.toLocaleString()} IQD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.checkout_page.shippingCostSummary}</span>
                    <span>
                      {shippingSelectionUnavailable
                        ? (!deliveryAddressReady
                          ? deliveryAddressPrompt
                          : shippingRouteUnavailable
                          ? shippingRouteUnavailableMessage
                          : shippingCalculationPending || isSmartVehicleShipping
                            ? t.checkout_page.calculatingBestVehicle
                            : shippingRouteUnavailableMessage)
                        : (shippingCost === 0 ? t.checkout_page.free : `${shippingCost.toLocaleString()} ${t.checkout_page.iqd}`)}
                    </span>
                  </div>
                  {vatAmount > 0 && (
                    <div className="flex justify-between">
                      <span>{t.checkout_page.valueAddedTax} ({(vatRate * 100).toFixed(0)}%):</span>
                      <span>{vatAmount.toLocaleString()} IQD</span>
                    </div>
                  )}
                  {dutiesAmount > 0 && (
                    <div className="flex justify-between">
                      <span>{t.checkout_page.valueAddedDuty} ({(dutiesRate * 100).toFixed(0)}%):</span>
                      <span>{dutiesAmount.toLocaleString()} IQD</span>
                    </div>
                  )}
                  <Separator />
                  {actualWalletUsage > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>{t.checkout_page.walletUsedSummary}</span>
                      <span>-{actualWalletUsage.toLocaleString()} IQD</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>{t.checkout_page.totalPayable}</span>
                    <span>{finalPriceReady ? `${totalAmount.toLocaleString()} IQD` : '—'}</span>
                  </div>
                </div>

                {finalPriceReady && !shippingSelectionUnavailable && shippingCost === 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-800 dark:text-green-300">
                      {t.checkout_page.freeShippingEligible}
                    </p>
                  </div>
                )}
                
                {finalPriceReady && actualWalletUsage >= beforeWalletTotal && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      {t.checkout_page.fullyPaidByWallet}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={async () => {
          setAuthModalOpen(false);
          // Refetch customer data to update authentication status
          await refetchCustomer();
          setIsLoggedIn(true);
          // Force form to re-validate with new authentication status
          form.trigger();
          // Show success message
          toast({
            title: t.loginSuccessful,
            description: t.welcomeMessage,
          });
        }}
        initialMode={authMode}
      />
      <OrderReviewDialog
        open={reviewOpen}
        onOpenChange={(open) => { setReviewOpen(open); if (!open) setPendingReview(null); }}
        addresses={[
          { id: 'primary', label: language === 'fa' ? 'آدرس اصلی' : 'Primary address',
            address: isUserLoggedIn ? (customerData?.customer?.address || '') : (form.getValues('billingAddress1') || ''),
            city: isUserLoggedIn ? (customerData?.customer?.city || customerData?.customer?.cityRegion || '') : (form.getValues('billingCity') || ''),
            province: isUserLoggedIn ? (customerData?.customer?.province || '') : (form.getValues('billingState') || ''),
            country: isUserLoggedIn ? (customerData?.customer?.country || '') : (form.getValues('billingCountry') || ''),
            postalCode: isUserLoggedIn ? (customerData?.customer?.postalCode || '') : (form.getValues('billingPostalCode') || ''),
            phone: isUserLoggedIn ? (customerData?.customer?.phone || '') : (form.getValues('phone') || '') },
          ...(secondAddressDraft?.address.trim() && secondAddressDraft.city.trim() &&
            (deliveryAddressChoice === 'new' || deliveryAddressChoice === 'legacy')
            ? [{ id: deliveryAddressChoice, label: secondAddressDraft.title || (deliveryAddressChoice === 'legacy'
                  ? (language === 'fa' ? 'آدرس قدیمی CRM' : 'Legacy CRM address')
                  : (language === 'fa' ? 'آدرس جدید' : 'New address')),
                address: secondAddressDraft.address, city: secondAddressDraft.city,
                province: secondAddressDraft.province, postalCode: secondAddressDraft.postalCode,
                country: secondAddressDraft.country, phone: secondAddressDraft.phone }]
            : []),
          ...savedCustomerAddresses.map(address => ({
            id: `saved:${address.id}`, label: address.title || (language === 'fa' ? 'آدرس ذخیره‌شده' : 'Saved address'),
            address: address.address, city: address.city, province: address.state || '',
            country: address.country, postalCode: address.postalCode || '', phone: address.phone || '',
          })),
        ]}
        selectedAddressId={reviewAddressId}
        onSelectAddress={(id) => {
          const key = String(id);
          setReviewAddressId(key);
          setPendingReview(null);
          if (key === 'primary') {
            setDeliveryAddressChoice('primary');
            setSelectedAddress(null);
            setShowSecondAddress(false);
            setNewAddressCountry('');
            form.setValue('secondDeliveryAddress', '');
            form.setValue('secondDeliveryCity', '');
            form.setValue('secondDeliveryProvince', '');
            form.setValue('secondDeliveryPostalCode', '');
            form.setValue('recipientAddress', '');
            form.setValue('recipientMobile', customerData?.customer?.phone || '');
            form.setValue('sameAsShipping', true);
            if (isUserLoggedIn && customerData?.customer) {
              const primary = customerData.customer;
              form.setValue('billingAddress1', primary.address || '');
              form.setValue('billingCity', primary.city || '');
              form.setValue('billingState', primary.province || primary.state || '');
              form.setValue('billingPostalCode', primary.postalCode || '');
              form.setValue('billingCountry', primary.country || '');
            }
          } else {
            const saved = savedCustomerAddresses.find(address => key === `saved:${address.id}`);
            const next = saved
              ? { address: saved.address, city: saved.city, province: saved.state || '', postalCode: saved.postalCode || '' }
              : secondAddressDraft;
            if (next) {
              setDeliveryAddressChoice(key);
              setSelectedAddress(saved || null);
              form.setValue('secondDeliveryAddress', next.address);
              form.setValue('secondDeliveryCity', next.city);
              form.setValue('secondDeliveryProvince', next.province);
              form.setValue('secondDeliveryPostalCode', next.postalCode);
              form.setValue('recipientAddress', '');
              if (saved) {
                setNewAddressCountry(saved.country || '');
                const region = provinces.find((item: any) => canonicalGeographyName(item) === saved.state || geographyName(item) === saved.state);
                setSelectedSecondaryProvinceId(region?.id ?? null);
                form.setValue('recipientMobile', saved.phone || '');
                form.setValue('billingCountry', saved.country);
                form.setValue('billingAddress1', saved.address);
                form.setValue('billingCity', saved.city);
                form.setValue('billingState', saved.state || '');
                form.setValue('billingPostalCode', saved.postalCode || '');
              } else if (secondAddressDraft) {
                setNewAddressCountry(secondAddressDraft.country);
                setNewAddressTitle(secondAddressDraft.title);
                setNewAddressPhone(key === 'new' ? secondAddressDraft.phone : '');
                form.setValue('recipientMobile', key === 'legacy' ? secondAddressDraft.phone : '');
                const region = provinces.find((item: any) => canonicalGeographyName(item) === next.province || geographyName(item) === next.province);
                setSelectedSecondaryProvinceId(region?.id ?? null);
              }
            }
          }
        }}
        onConfirm={() => {
          confirmingOrderRef.current = true;
          void form.handleSubmit(onSubmit, () => { confirmingOrderRef.current = false; })();
        }}
        onRefresh={() => {
          confirmingOrderRef.current = false;
          void form.handleSubmit(onSubmit)();
        }}
        confirmDisabled={isConfirmingOrder || createOrderMutation.isPending || !pendingReview || !!contractValidationError}
        confirming={isConfirmingOrder || createOrderMutation.isPending}
        needsRefresh={!pendingReview || shippingCalculationPending || shippingSelectionUnavailable}
        refreshPending={shippingCalculationPending}
        items={cartItems.map(item => ({
          id: item.id, name: item.name, quantity: item.quantity,
          unitPrice: item.discountedUnitPrice ?? Number(item.price || 0),
        }))}
        shippingMethod={currentShippingMethod?.name || currentShippingMethod?.title || currentMethodValue}
        shippingCost={shippingCost}
        subtotal={subtotal}
        tax={totalTaxAmount}
        total={beforeWalletTotal}
        paymentMethod={form.getValues('paymentMethod') || ''}
        language={language as 'en' | 'fa' | 'ar' | 'tr'}
      />
    </div>
  );
}