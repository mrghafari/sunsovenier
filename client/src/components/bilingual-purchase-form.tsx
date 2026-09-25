import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { MapPin, Globe, X, ShoppingCart, Plus, Minus, Trash2, Wallet, CreditCard, Upload, Clock, Flame, Move, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { loadCustomerAddresses, saveCustomerAddress, type SavedCustomerAddress } from "@/lib/customer-addresses";
import OrderReviewDialog from "@/components/checkout/order-review-dialog";
import ContractSelector, { type ShopContract } from "@/components/checkout/contract-selector";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatIQDAmount, displayCurrencyAmountWithSymbol } from "@/lib/currency-utils";
import { shippingWeightKg } from "@/lib/shipping-weight";

// Language types
type Language = 'en' | 'ar' | 'fa' | 'tr';

const getShippingCenterKey = (center?: { countryCode?: string; provinceId?: number; cityId?: number } | null) =>
  center ? `${center.countryCode || ''}|${center.provinceId || ''}|${center.cityId || ''}` : '';

const EMPTY_CITIES: any[] = [];

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
    unavailableCartProduct: "This product is no longer in the shop:",
    unavailableCartWarning: "Remove unavailable products from your cart before calculating shipping or placing an order.",
    missingCartWeight: "Shipping weight is not set for an item in your cart. Please ask the shop to set its gross weight.",
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
    
    // Delivery address choices
    deliveryAddressChoices: "Delivery address",
    newAddress: "New address",
    addressTitle: "Address title",
    addressTitlePlaceholder: "e.g. Home, Office, Factory",
    newAddressInstruction: "Add a named address with its complete destination details",
    legacyAddress: "Legacy CRM address",
    destinationRequired: "Choose a country, province, and city for this address",
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
    unavailableCartProduct: "هذا المنتج لم يعد متاحاً في المتجر:",
    unavailableCartWarning: "احذف المنتجات غير المتاحة من السلة قبل حساب الشحن أو إتمام الطلب.",
    missingCartWeight: "وزن الشحن غير محدد لأحد عناصر السلة. اطلب من المتجر تحديد وزنه الإجمالي.",
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
    
    // Delivery address and recipient mobile options
    deliveryAddressChoices: "عنوان التسليم",
    newAddress: "عنوان جديد",
    addressTitle: "اسم العنوان",
    addressTitlePlaceholder: "مثل: المنزل، المكتب، المصنع",
    newAddressInstruction: "أضف عنواناً باسم واضح وتفاصيل وجهة كاملة",
    legacyAddress: "عنوان CRM قديم",
    destinationRequired: "يرجى تحديد الدولة والمحافظة والمدينة لهذا العنوان",
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
  },
  fa: {
    purchaseOrder: "سفارش خرید",
    enterDetails: "اطلاعات خود را وارد کنید",
    customerName: "نام مشتری",
    deliveryPhone: "شماره تلفن تحویل",
    deliveryAddress: "آدرس تحویل",
    province: "استان",
    city: "شهر",
    postalCode: "کد پستی (اختیاری)",
    selectProvince: "استان را انتخاب کنید",
    selectCity: "شهر را انتخاب کنید",
    selectProvinceFirst: "ابتدا استان را انتخاب کنید",
    cityNotRegistered: "شهر ثبت نشده است",
    gpsLocation: "موقعیت مکانی",
    findLocation: "یافتن موقعیت من",
    orderNotes: "یادداشت سفارش",
    submitOrder: "ثبت سفارش",
    cancel: "لغو",
    loading: "در حال بارگذاری...",
    cartManagement: "مدیریت سبد خرید",
    unavailableCartProduct: "این کالا دیگر در فروشگاه موجود نیست:",
    unavailableCartWarning: "پیش از محاسبهٔ ارسال یا ثبت سفارش، کالاهای ناموجود را از سبد حذف کنید.",
    missingCartWeight: "وزن ارسال یکی از کالاهای سبد مشخص نیست. از فروشگاه بخواهید وزن ناخالص آن را ثبت کند.",
    each: "هر عدد",
    subtotal: "جمع جزء:",
    totalAmount: "مبلغ کل",
    removeItem: "حذف کالا",
    decreaseQuantity: "کاهش تعداد",
    increaseQuantity: "افزایش تعداد",
    nameRequired: "نام مشتری الزامی است",
    phoneRequired: "شماره تلفن الزامی است",
    addressRequired: "آدرس کامل تحویل الزامی است",
    cityRequired: "شهر الزامی است",
    namePlaceholder: "مثلاً: احمد علی",
    phonePlaceholder: "شماره تلفن را وارد کنید",
    addressPlaceholder: "آدرس کامل تحویل را وارد کنید",
    cityPlaceholder: "نام شهر را وارد کنید",
    postalCodePlaceholder: "اختیاری",
    notesPlaceholder: "یادداشت‌های اضافی برای سفارش",
    locationFound: "موقعیت با موفقیت پیدا شد",
    locationError: "دریافت موقعیت ممکن نیست. لطفاً دستی وارد کنید.",
    orderSubmitted: "سفارش با موفقیت ثبت شد",
    orderError: "ثبت سفارش ناموفق بود",
    switchLanguage: "العربية",
    language: "زبان",
    paymentMethod: "روش پرداخت",
    walletPayment: "پرداخت از کیف پول",
    traditionalPayment: "پرداخت سنتی",
    walletBalance: "موجودی کیف پول",
    useWalletFull: "پرداخت کامل از کیف پول",
    useWalletPartial: "پرداخت بخشی از کیف پول",
    walletAmount: "مبلغ از کیف پول",
    remainingAmount: "مبلغ باقی‌مانده",
    insufficientWallet: "موجودی کیف پول کافی نیست",
    discountApplied: "تخفیف اعمال شد",
    bankTransferGrace: "انتقال بانکی با مهلت پرداخت",
    bankTransferWithDays: "انتقال بانکی با مهلت {days} روزه",
    deliveryMethod: "روش تحویل",
    selectDeliveryMethod: "روش تحویل را انتخاب کنید",
    shippingCost: "هزینه ارسال",
    freeShipping: "ارسال رایگان",
    deliveryAddressChoices: "نشانی تحویل",
    newAddress: "نشانی جدید",
    addressTitle: "عنوان نشانی",
    addressTitlePlaceholder: "مثلاً: خانه، دفتر، کارخانه",
    newAddressInstruction: "نشانی نام‌گذاری‌شده را همراه با جزئیات کامل مقصد اضافه کنید",
    legacyAddress: "نشانی قدیمی CRM",
    destinationRequired: "کشور، استان و شهر این نشانی را انتخاب کنید",
    recipientMobileNumber: "شماره تلفن همراه گیرنده",
    addRecipientMobile: "افزودن تلفن همراه گیرنده",
    removeRecipientMobile: "حذف تلفن همراه گیرنده",
    recipientMobilePlaceholder: "شماره تلفن همراه گیرنده را وارد کنید...",
    recipientMobileInstruction: "اگر گیرنده شخص دیگری است، شماره تلفن همراه او را وارد کنید",
    crmAddressDisabled: "آدرس پیش‌فرض (غیرفعال)",
    crmPhoneDisabled: "تلفن پیش‌فرض (غیرفعال)",
    defaultDeliveryAddress: "آدرس پیش‌فرض تحویل",
    redirectingToFIB: "در حال انتقال به FIB",
    redirectingToFIBDesc: "در حال انتقال شما به سامانه پرداخت FIB...",
    redirectingToBank: "در حال انتقال به درگاه بانکی",
    redirectingToBankDesc: "در حال انتقال شما به درگاه پرداخت بانکی...",
    orderRegistered: "سفارش ثبت شد",
    orderFullyPaidWallet: "سفارش شما با موفقیت ثبت و به‌طور کامل از کیف پول پرداخت شد. شماره سفارش:",
    walletPaymentSuccess: "✅ پرداخت از کیف پول موفق بود",
    orderFullyPaidAmount: "سفارش شما به مبلغ {amount} به‌طور کامل از کیف پول پرداخت شد",
    onlinePaymentDisabled: "پرداخت آنلاین غیرفعال است",
    bankGatewayUnavailable: "درگاه بانکی در حال حاضر در دسترس نیست. روش پرداخت دیگری انتخاب کنید.",
    redirectingToPaymentGateway: "در حال انتقال به درگاه پرداخت",
    redirectingToPaymentDesc: "در حال انتقال شما به درگاه پرداخت...",
    orderAndReceiptRegistered: "✅ سفارش و رسید بانکی ثبت شد",
    orderReceiptSuccess: "سفارش شما همراه با رسید بانکی با موفقیت ثبت شد",
    pleaseUploadReceipt: "لطفاً رسید انتقال بانکی خود را بارگذاری کنید",
    shipmentWeight: "وزن محموله:",
    kilogram: "کیلوگرم",
    subtotalWithoutShipping: "جمع (بدون هزینه ارسال)",
    smartVehicleSelection: "انتخاب هوشمند خودرو - محاسبه خودکار بهترین گزینه",
    smartVehicleLabel: "انتخاب هوشمند خودرو:",
    smartVehicleDescription: "سامانه بهترین خودرو را بر اساس وزن، مقصد و کمترین هزینه انتخاب می‌کند",
    selectedVehicle: "خودروی انتخاب‌شده:",
    basePrice: "قیمت پایه:",
    distanceCost: "هزینه مسافت:",
    smartShippingCost: "هزینه ارسال هوشمند",
    useWallet: "استفاده از کیف پول (حداکثر",
    amountFromWallet: "مبلغ از کیف پول (حداکثر",
    walletPaymentAmount: "مبلغ پرداخت از کیف پول",
    walletLimit: "سقف کیف پول",
    bankCardPayment: "پرداخت با کارت بانکی",
    selfPickup: "تحویل حضوری - رایگان",
    selfPickupLabel: "تحویل حضوری:",
    free: "رایگان",
    calculating: "در حال محاسبه...",
    waitingForAddress: "در انتظار آدرس مقصد...",
    selfPickupDescription: "کالاها را خودتان از محل شرکت تحویل می‌گیرید - بدون هزینه ارسال",
    vehicles: "خودرو",
    vehicleBreakdown: "جزئیات خودروهای انتخاب‌شده:",
    vehicle: "خودرو",
    totalLoadWeight: "وزن کل بار:",
    totalCost: "هزینه کل:"
  }
};

const taxTranslations = {
  en: {
    vat: "Value Added Tax",
    duties: "Value Added Duty",
  },
  ar: {
    vat: "ضريبة القيمة المضافة",
    duties: "رسوم القيمة المضافة",
  },
  fa: {
    vat: "مالیات بر ارزش افزوده",
    duties: "عوارض بر ارزش افزوده",
  },
  tr: {
    vat: "Katma Değer Vergisi",
    duties: "Katma Değer Vergisi Harcı",
  },
} as const;

// Dynamic form schema based on language
const createPurchaseSchema = (lang: Language) => {
  const copy = translations[lang as keyof typeof translations] || translations.en;

  return z.object({
    customerName: z.string().min(2, copy.nameRequired),
    phone: z.string().min(10, copy.phoneRequired),
    address: z.string().min(10, copy.addressRequired),
    city: z.string().optional(), // Make city optional to prevent validation failures
    country: z.string().default('Iraq'), // Add country field with default
    postalCode: z.string().optional(),
    notes: z.string().optional(),
    gpsLatitude: z.number().optional(),
    gpsLongitude: z.number().optional(),
    deliveryMethod: z.string().optional(), // Add delivery method field
  });
};

interface PurchaseFormProps {
  cart: {[key: number]: number};
  products: any[];
  onOrderComplete: () => void;
  onClose: () => void;
  existingCustomer?: any; // Customer data from parent component
  onUpdateQuantity?: (productId: number, newQuantity: number) => void | Promise<void>;
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
  const queryClient = useQueryClient();
  const { language, direction } = useLanguage();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationData, setLocationData] = useState<{latitude: number, longitude: number} | null>(null);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>({});
  const [pendingQuantityUpdates, setPendingQuantityUpdates] = useState<number[]>([]);
  const pendingQuantityUpdatesRef = useRef(new Set<number>());
  const activatedQuantityInputs = useRef(new Set<number>());
  const [paymentMethod, setPaymentMethod] = useState<'online_payment' | 'fib_online' | 'wallet' | 'wallet_full' | 'wallet_partial' | 'wallet_combined' | 'bank_transfer_grace' | 'bank_receipt'>('fib_online');
  const [paymentSectionTarget, setPaymentSectionTarget] = useState<HTMLDivElement | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewAddressId, setReviewAddressId] = useState('primary');
  const [pendingReview, setPendingReview] = useState<{ data: any; signature: string } | null>(null);
  const [isConfirmingOrder, setIsConfirmingOrder] = useState(false);
  const confirmingOrderRef = useRef(false);
  const orderSubmissionLockRef = useRef(false);

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
        
        if (response.status === 401) {
          return { success: false, message: 'Not authenticated' };
        }

        if (!response.ok) {
          throw new Error(`Customer authentication check failed with HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log('Customer API response:', result);
        return result;
      } catch (error) {
        console.log('Error fetching customer data:', error);
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  const { data: customerContracts = [], isLoading: isLoadingContracts, isFetching: isFetchingContracts, isError: contractsError } = useQuery<ShopContract[]>({
    queryKey: ['/api/shop/contracts/mine'],
    queryFn: async () => {
      const response = await fetch('/api/shop/contracts/mine', { credentials: 'include' });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success || !Array.isArray(result.contracts)) {
        throw new Error(result?.message || `Unable to load contracts (HTTP ${response.status})`);
      }
      return result.contracts;
    },
    enabled: customerData?.success === true,
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const { data: savedCustomerAddresses = [], refetch: refetchSavedCustomerAddresses } = useQuery({
    queryKey: ['structuredCustomerAddresses'],
    queryFn: loadCustomerAddresses,
    enabled: customerData?.success === true,
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

  // Explicit destination geography fields (must be declared before API queries)
  const [selectedSecondaryProvinceId, setSelectedSecondaryProvinceId] = useState<number | null>(null);
  const [secondProvince, setSecondProvince] = useState('');
  const [secondCity, setSecondCity] = useState('');
  const [secondPostalCode, setSecondPostalCode] = useState('');
  const [selectedDeliveryAddressId, setSelectedDeliveryAddressId] = useState('primary');
  const [newAddressTitle, setNewAddressTitle] = useState('');
  const [newAddressPhone, setNewAddressPhone] = useState('');
  const [newAddressCountry, setNewAddressCountry] = useState('');
  const [legacyAddressCountry, setLegacyAddressCountry] = useState('');

  // Load delivery regions from the configured logistics-center country.
  const { data: shippingCenterResponse, refetch: refetchShippingCenter } = useQuery<{ success?: boolean; data?: { countryCode?: string; provinceId?: number; cityId?: number } }>({
    queryKey: ['/api/logistics/shipping-center'],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });
  const shippingCenterCountry = shippingCenterResponse?.data?.countryCode || '';
  const shippingCenterKey = getShippingCenterKey(shippingCenterResponse?.data);
  const shippingCenterKeyRef = useRef(shippingCenterKey);
  const [pricedShippingCenterKey, setPricedShippingCenterKey] = useState('');
  useEffect(() => {
    shippingCenterKeyRef.current = shippingCenterKey;
  }, [shippingCenterKey]);
  const { data: geographyCountriesResponse } = useQuery<{ success?: boolean; data?: any[] }>({
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

  const { data: provinces, isLoading: isLoadingProvinces } = useQuery<{ success?: boolean; data?: any[] }>({
    queryKey: [`/api/geography/regions?country=${shippingCenterCountry}`],
    enabled: !!shippingCenterCountry,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch DB-backed cities in the selected destination region.
  const { data: secondaryCitiesResponse, isLoading: isLoadingSecondaryCities } = useQuery<{ success?: boolean; data?: any[] }>({
    queryKey: [`/api/geography/cities?regionId=${selectedSecondaryProvinceId}`],
    enabled: !!selectedSecondaryProvinceId,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
  const secondaryCities = Array.isArray(secondaryCitiesResponse?.data) ? secondaryCitiesResponse.data : EMPTY_CITIES;

  const geographyName = (place: any) => {
    if (!place) return '';
    if (language === 'fa') return place.namePersian || place.nameFa || place.name_fa || place.name || place.nameEnglish || '';
    if (language === 'ar') return place.nameArabic || place.name_arabic || place.name || place.nameEnglish || '';
    if (language === 'tr') return place.nameTurkish || place.nameTr || place.name_tr || place.name || place.nameEnglish || '';
    return place.nameEnglish || place.nameEn || place.name_en || place.name || place.nameArabic || '';
  };
  const canonicalGeographyName = (place: any) => place?.nameEnglish || place?.nameEn || place?.name_en || place?.name || geographyName(place);

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
      country: shippingCenterCountry || "Iraq",
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
        city: customerCity || "",
        country: customerToUse.country || shippingCenterCountry || "Iraq",
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
  }, [existingCustomer, customerData, crmCustomerData, form, isLoadingCustomer, shippingCenterCountry]);

  useEffect(() => {
    if (shippingCenterCountry && !existingCustomer && !crmCustomerData && !customerData?.customer) {
      const currentCountry = form.getValues('country');
      if (!currentCountry || currentCountry === 'Iraq') {
        form.setValue('country', shippingCenterCountry);
      }
    }
  }, [shippingCenterCountry, existingCustomer, crmCustomerData, customerData?.customer, form]);

  // State for additional recipient fields - CRM conditional logic (must be declared before use)
  const [showRecipientMobile, setShowRecipientMobile] = useState(false);  
  const [secondAddress, setSecondAddress] = useState('');
  const [recipientMobile, setRecipientMobile] = useState('');

  // Get current translations based on site language
  const t = translations[language as keyof typeof translations] || translations.en;
  const taxT = taxTranslations[language as keyof typeof taxTranslations] || taxTranslations.en;
  const isRTL = direction === 'rtl';
  
  // Conditional graying out logic for CRM fields
  const isPrimaryAddressDisabled = selectedDeliveryAddressId !== 'primary';
  const isPrimaryMobileDisabled = showRecipientMobile && recipientMobile.trim().length > 0;
  const isPrimaryPostalCodeDisabled = selectedDeliveryAddressId !== 'primary';
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


  const selectedContract = selectedContractId === null
    ? null
    : customerContracts.find(contract => contract.id === selectedContractId && contract.isActive) || null;
  const getCartUnitPrice = (product: any, quantity: number) => {
    if (selectedContractId !== null) {
      const item = selectedContract?.items.find(contractItem => Number(contractItem.productId) === Number(product.id));
      return item && item.unitPrice != null && String(item.unitPrice).trim() !== '' && Number.isFinite(Number(item.unitPrice))
        ? Number(item.unitPrice)
        : 0;
    }
    return getDiscountedPrice(product, quantity);
  };
  const contractCartErrors = useMemo(() => {
    if (selectedContractId === null) return [];
    if (isLoadingContracts || isFetchingContracts) return [language === 'fa' ? 'در حال بررسی وضعیت قرارداد...' : language === 'ar' ? 'جارٍ التحقق من حالة العقد...' : 'Checking contract status...'];
    if (contractsError) return [language === 'fa' ? 'بارگذاری قرارداد ناموفق بود. دوباره تلاش کنید.' : language === 'ar' ? 'تعذر تحميل العقود. يرجى المحاولة مجدداً.' : 'Could not verify the contract. Please retry.'];
    if (!selectedContract) return [language === 'fa' ? 'این قرارداد دیگر فعال یا در دسترس نیست. قرارداد دیگری انتخاب کنید.' : language === 'ar' ? 'هذا العقد لم يعد نشطاً أو متاحاً. اختر عقداً آخر.' : 'This contract is no longer active or available. Choose another contract.'];
    return Object.entries(cart).flatMap(([productId, quantity]) => {
      const item = selectedContract.items.find(contractItem => Number(contractItem.productId) === Number(productId));
      const product = products.find(candidate => Number(candidate.id) === Number(productId));
      if (!item) return [`${product?.name || `Product #${productId}`} is not included in contract #${selectedContract.number}.`];
      const errors: string[] = [];
      if (item.remainingQuantity == null || !Number.isFinite(Number(item.remainingQuantity)) || Number(item.remainingQuantity) < 0) {
        errors.push(`${product?.name || item.productName}: contract availability is unavailable.`);
      } else if (Number(quantity) > Number(item.remainingQuantity)) {
        errors.push(`${product?.name || item.productName}: quantity ${quantity} exceeds contract remaining quantity ${item.remainingQuantity}.`);
      }
      if (item.unitPrice == null || String(item.unitPrice).trim() === '' || !Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0) {
        errors.push(`${product?.name || item.productName}: contract price is unavailable.`);
      }
      return errors;
    });
  }, [selectedContractId, selectedContract, cart, products, isLoadingContracts, isFetchingContracts, contractsError, language]);
  const hasContractCartError = contractCartErrors.length > 0;


  // Calculate subtotal with discounts - IQD whole numbers only
  const subtotalAmount = Math.round(Object.entries(cart).reduce((sum, [productId, quantity]) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (product) {
      const unitPrice = getCartUnitPrice(product, quantity);
      return sum + (unitPrice * quantity);
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

  // Never infer shipping from configured base prices or threshold fields; quotes price delivery.
  useEffect(() => {
    setShippingCost(0);
  }, [selectedShippingMethod, shippingRatesData]);

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
  const [smartDeliveryPricedKey, setSmartDeliveryPricedKey] = useState('');
  const [standardShippingQuote, setStandardShippingQuote] = useState<{
    methodId: number;
    cost: number;
    key: string;
    centerKey: string;
    cartKey: string;
    createdAt: number;
  } | null>(null);
  const [standardShippingLoading, setStandardShippingLoading] = useState(false);
  const [standardShippingError, setStandardShippingError] = useState('');
  const standardShippingRequestRef = useRef(0);
  const smartShippingRequestRef = useRef(0);
  const [shippingQuote, setShippingQuote] = useState<{
    token: string;
    destination: string;
    centerKey: string;
    cartKey: string;
    createdAt: number;
  } | null>(null);
  const [shippingQuoteRefreshKey, setShippingQuoteRefreshKey] = useState(0);

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
  
  const unavailableCartProductIds = Object.keys(cart).filter(productId =>
    !products.some(product => product.id === Number(productId))
  );
  const missingWeightProductIds = Object.keys(cart).filter(productId => {
    const product = products.find(p => p.id === Number(productId));
    return product && shippingWeightKg(product) === null;
  });

  // Calculate total weight of all products in cart
  const totalWeight = Object.entries(cart).reduce((sum, [productId, quantity]) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (product) {
      const productWeight = shippingWeightKg(product);
      return sum + (productWeight ?? 0) * quantity;
    }
    return sum;
  }, 0);
  const shippingQuoteCart = Object.fromEntries(
    Object.entries(cart).map(([productId, quantity]) => [String(Number(productId)), Number(quantity)])
  );
  const shippingQuoteCartKey = JSON.stringify(
    Object.entries(shippingQuoteCart)
      .map(([productId, quantity]) => [Number(productId), Number(quantity)])
      .sort((a, b) => Number(a[0]) - Number(b[0]))
  );

  // Calculate shipping cost - prioritize smart delivery over regular shipping
  const legacySecondaryAddress = String(crmCustomerData?.secondaryAddress || customerData?.customer?.secondaryAddress || '').trim();
  const selectedSavedAddress = selectedDeliveryAddressId.startsWith('saved:')
    ? savedCustomerAddresses.find(address => String(address.id) === selectedDeliveryAddressId.slice(6))
    : undefined;
  const isNewAddressSelected = selectedDeliveryAddressId === 'new';
  const isLegacyAddressSelected = selectedDeliveryAddressId === 'legacy';
  const isAlternateAddressSelected = isNewAddressSelected || isLegacyAddressSelected || !!selectedSavedAddress;
  const primaryPricingAddress = (crmCustomerData?.address || customerData?.customer?.address || form.watch('address') || '').trim();
  const primaryPricingCity = (crmCustomerData?.cityRegion || crmCustomerData?.city || customerData?.customer?.cityRegion || customerData?.customer?.city || form.watch('city') || '').trim();
  const primaryPricingProvince = crmCustomerData?.province || customerData?.customer?.province || '';
  const activePricingAddress = selectedSavedAddress
    ? selectedSavedAddress.address
    : isLegacyAddressSelected
      ? legacySecondaryAddress
      : isNewAddressSelected
        ? secondAddress.trim()
        : primaryPricingAddress;
  const activePricingCity = selectedSavedAddress
    ? selectedSavedAddress.city || ''
    : isAlternateAddressSelected ? secondCity.trim() : primaryPricingCity;
  const activePricingProvince = selectedSavedAddress
    ? selectedSavedAddress.state || ''
    : isAlternateAddressSelected ? secondProvince.trim() : primaryPricingProvince;
  const activePricingCountry = selectedSavedAddress
    ? selectedSavedAddress.country || ''
    : isNewAddressSelected
      ? newAddressCountry.trim()
      : isLegacyAddressSelected
        ? legacyAddressCountry.trim()
        : (form.watch('country') || crmCustomerData?.country || customerData?.customer?.country || '');
  const activePricingPostalCode = selectedSavedAddress
    ? selectedSavedAddress.postalCode || ''
    : isAlternateAddressSelected ? secondPostalCode.trim() : (form.watch('postalCode') || '');
  const activePricingPhone = selectedSavedAddress
    ? selectedSavedAddress.phone || ''
    : isNewAddressSelected
      ? newAddressPhone.trim()
      : (showRecipientMobile && recipientMobile.trim() ? recipientMobile.trim() : form.watch('phone') || '');
  const activeRecipientName = selectedSavedAddress
    ? selectedSavedAddress.recipientName || ''
    : form.watch('customerName') || '';
  const selectDeliveryAddress = (addressId: string) => {
    if (addressId === 'legacy') {
      setSecondCity('');
      setSecondProvince('');
      setSecondPostalCode('');
      setSelectedSecondaryProvinceId(null);
      setLegacyAddressCountry('');
    }
    setSelectedDeliveryAddressId(addressId);
    setPendingReview(null);
  };
  const hasCompleteDeliveryAddress = !!activePricingAddress && !!activePricingCity &&
    !!activePricingCountry.trim() && (!isAlternateAddressSelected || !!activePricingProvince);
  const currentSmartDeliveryPricedKey = `${activePricingAddress}|${activePricingCity}|${activePricingProvince}|${activePricingCountry}|${totalWeight}|${shippingQuoteCartKey}`;
  const selectedShippingRate = shippingRatesData?.find((rate: any) => rate.id === selectedShippingMethod);
  const activeDeliveryMethodValue = String(selectedShippingRate?.deliveryMethod || selectedShippingRate?.delivery_method || '').toLowerCase();
  const isSmartShippingMethod = activeDeliveryMethodValue === 'smart_vehicle' || activeDeliveryMethodValue.includes('bus');
  const isPickupShippingMethod = ['pickup', 'self_pickup', 'self-pickup'].includes(activeDeliveryMethodValue);
  const standardShippingQuoteKey = JSON.stringify([
    selectedShippingMethod,
    selectedContractId,
    selectedContract,
    subtotalAmount,
    activePricingAddress,
    activePricingCity,
    activePricingProvince,
    activePricingCountry,
    totalWeight,
    shippingQuoteCartKey,
  ]);
  const standardShippingQuoteReady = !!standardShippingQuote &&
    standardShippingQuote.methodId === selectedShippingMethod &&
    standardShippingQuote.key === standardShippingQuoteKey &&
    standardShippingQuote.centerKey === shippingCenterKey &&
    standardShippingQuote.cartKey === shippingQuoteCartKey &&
    Number.isFinite(standardShippingQuote.cost) &&
    Date.now() - standardShippingQuote.createdAt < 4 * 60 * 1000;
  const currentSmartShippingQuoteReady = !!shippingQuote?.token &&
    shippingQuote.destination === `${activePricingCity}|${activePricingProvince}|${totalWeight}` &&
    shippingQuote.centerKey === shippingCenterKey &&
    shippingQuote.cartKey === shippingQuoteCartKey &&
    Date.now() - shippingQuote.createdAt < 4 * 60 * 1000 &&
    smartDeliveryPricedKey === currentSmartDeliveryPricedKey;
  const finalShippingCost = isPickupShippingMethod
    ? 0
    : isSmartShippingMethod
      ? (optimalVehicle && currentSmartShippingQuoteReady
        ? Number(optimalVehicle.totalCost)
        : 0)
      : (standardShippingQuoteReady ? standardShippingQuote!.cost : 0);
  const hasCurrentShippingPrice = isPickupShippingMethod ||
    (hasCompleteDeliveryAddress && (isSmartShippingMethod ? currentSmartShippingQuoteReady : standardShippingQuoteReady));
  const deliveryAddressRequiredMessage = language === 'fa'
    ? 'برای محاسبه هزینه ارسال، آدرس، شهر و کشور تحویل را مشخص کنید.'
    : language === 'ar'
      ? 'يرجى تحديد عنوان التسليم والمدينة والبلد لحساب تكلفة الشحن.'
      : language === 'tr'
        ? 'Kargo ücretini hesaplamak için teslimat adresini, şehri ve ülkeyi seçin.'
        : 'Choose a delivery address, city, and country to calculate shipping.';
  
  // Calculate total amount (subtotal + VAT + duties + final shipping cost - no double counting) - IQD whole numbers
  const totalAmount = hasCurrentShippingPrice
    ? Math.round(subtotalAmount + totalTaxAmount + finalShippingCost)
    : 0;
  
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
  const isWalletPaymentMethod = ['wallet', 'wallet_full', 'wallet_partial', 'wallet_combined'].includes(paymentMethod);
  const supportedNonWalletPaymentMethod = (() => {
    const supported = availablePaymentMethods
      .map((method: any) => method.methodKey)
      .filter((methodKey: string) => ['fib_online', 'online_payment', 'bank_transfer_grace', 'bank_receipt'].includes(methodKey));
    if (supported.includes(paymentMethod)) return paymentMethod;
    return ['fib_online', 'online_payment', 'bank_transfer_grace', 'bank_receipt'].find(methodKey => supported.includes(methodKey)) || null;
  })();
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

  useEffect(() => {
    if (selectedContractId === null || (!isWalletPaymentMethod && walletAmount <= 0)) return;
    setWalletAmount(0);
    setPaymentMethod((supportedNonWalletPaymentMethod || 'fib_online') as typeof paymentMethod);
  }, [selectedContractId, isWalletPaymentMethod, walletAmount, supportedNonWalletPaymentMethod]);

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

  // Calculate smart delivery cost
  const calculateSmartDeliveryCost = async (destinationCity: string, destinationProvince: string, destinationCityId: number | undefined, requestId: number) => {
    if (hasContractCartError) {
      setSmartDeliveryLoading(false);
      setSmartDeliveryError(contractCartErrors[0]);
      setOptimalVehicle(null);
      setShippingQuote(null);
      return;
    }
    if (unavailableCartProductIds.length > 0) {
      setSmartDeliveryLoading(false);
      setSmartDeliveryError(t.unavailableCartWarning);
      setOptimalVehicle(null);
      setShippingQuote(null);
      return;
    }
    if (missingWeightProductIds.length > 0) {
      setSmartDeliveryLoading(false);
      setSmartDeliveryError(t.missingCartWeight);
      setOptimalVehicle(null);
      setShippingQuote(null);
      return;
    }
    if (!destinationCity || totalWeight <= 0) {
      console.log('🚚 [SMART DELIVERY] Skipping calculation - missing city or zero weight');
      return;
    }

    setSmartDeliveryLoading(true);
    setSmartDeliveryError('');
    setSmartDeliveryPricedKey('');
    setPricedShippingCenterKey('');
    setShippingQuote(null);
    
    try {
      const refreshedCenter = await refetchShippingCenter();
      if (requestId !== smartShippingRequestRef.current) return;
      const quoteCenterKey = getShippingCenterKey(refreshedCenter.data?.data);
      if (refreshedCenter.isError || !quoteCenterKey) {
        throw new Error(smartDeliveryUnavailableMessage);
      }
      shippingCenterKeyRef.current = quoteCenterKey;

      console.log('🚚 [SMART DELIVERY] Calculating cost for:', {
        weight: totalWeight,
        city: destinationCity,
        province: destinationProvince,
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
          cart: shippingQuoteCart,
          destinationCity: destinationCity,
          ...(destinationProvince ? { destinationProvince } : {}),
          ...(destinationCityId != null ? { destinationCityId } : {})
        })
      });

      const data = await response.json().catch(() => ({}));
      if (requestId !== smartShippingRequestRef.current) return;
      
      console.log('🚚 [SMART DELIVERY] API response:', data);
      
      if (response.ok && data.success) {
        if (typeof data.shippingQuoteToken !== 'string' || !data.shippingQuoteToken) {
          throw new Error(smartDeliveryUnavailableMessage);
        }
        // Handle new smart vehicle API response format
        if (data.multiVehicleRequired) {
          // Multi-vehicle scenario
          const multiVehicleData = data.solution;
          const totalCost = Number(multiVehicleData?.totalCost);
          if (!Number.isFinite(totalCost) || totalCost < 0) {
            throw new Error(smartDeliveryUnavailableMessage);
          }
          if (shippingCenterKeyRef.current !== quoteCenterKey) {
            throw new Error(smartDeliveryUnavailableMessage);
          }
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
        setSmartDeliveryPricedKey(`${activePricingAddress}|${destinationCity}|${destinationProvince}|${activePricingCountry}|${totalWeight}|${shippingQuoteCartKey}`);
          setPricedShippingCenterKey(quoteCenterKey);
          setShippingQuote(typeof data.shippingQuoteToken === 'string' && data.shippingQuoteToken
            ? {
                token: data.shippingQuoteToken,
                destination: `${destinationCity}|${destinationProvince}|${totalWeight}`,
                centerKey: quoteCenterKey,
                cartKey: shippingQuoteCartKey,
                createdAt: Date.now()
              }
            : null);
          
          console.log('✅ [SMART DELIVERY] Multi-vehicle cost calculated:', {
            vehicles: multiVehicleData.totalVehicles,
            cost: totalCost,
            summary: multiVehicleData.summary
          });
        } else if (data.selectedVehicle) {
          // Single vehicle scenario
          const vehicle = data.selectedVehicle;
          const vehicleCost = Number(vehicle.totalCost);
          if (!Number.isFinite(vehicleCost) || vehicleCost < 0) {
            throw new Error(smartDeliveryUnavailableMessage);
          }
          if (shippingCenterKeyRef.current !== quoteCenterKey) {
            throw new Error(smartDeliveryUnavailableMessage);
          }
          // API returns 'name' not 'vehicleName' - handle both for compatibility
          const vehicleName = vehicle.name || vehicle.vehicleName;
          const vehicleInfo = {
            vehicleName: vehicleName,
            totalCost: vehicleCost,
            basePrice: vehicle.basePrice,
            distanceCost: vehicle.distanceCost
          };
          
          setOptimalVehicle(vehicleInfo);
          setAlternativeVehicles(data.alternatives || []);
          setSmartDeliveryCost(vehicleCost);
          setSmartDeliveryPricedKey(`${activePricingAddress}|${destinationCity}|${destinationProvince}|${activePricingCountry}|${totalWeight}|${shippingQuoteCartKey}`);
          setPricedShippingCenterKey(quoteCenterKey);
          setShippingQuote(typeof data.shippingQuoteToken === 'string' && data.shippingQuoteToken
            ? {
                token: data.shippingQuoteToken,
                destination: `${destinationCity}|${destinationProvince}|${totalWeight}`,
                centerKey: quoteCenterKey,
                cartKey: shippingQuoteCartKey,
                createdAt: Date.now()
              }
            : null);
          
          console.log('✅ [SMART DELIVERY] Single vehicle cost calculated:', {
            vehicle: vehicleName,
            cost: vehicleCost,
            basePrice: vehicle.basePrice,
            distanceCost: vehicle.distanceCost
          });
        } else {
          console.error('❌ [SMART DELIVERY] Invalid response format:', data);
          throw new Error('فرمت پاسخ سیستم انتخاب خودرو نامعتبر است');
        }
      } else {
        throw new Error(data.message || smartDeliveryUnavailableMessage);
      }
    } catch (error) {
      if (requestId !== smartShippingRequestRef.current) return;
      console.error('❌ [SMART DELIVERY] Calculation error:', error);
      setSmartDeliveryError((error as any)?.message || smartDeliveryUnavailableMessage);
      setSmartDeliveryCost(0);
      setOptimalVehicle(null);
      setAlternativeVehicles([]);
      setShippingQuote(null);
    } finally {
      if (requestId === smartShippingRequestRef.current) setSmartDeliveryLoading(false);
    }
  };

  const smartDeliveryUnavailableMessage = language === 'fa'
    ? 'هزینه ارسال برای این مسیر در دسترس نیست. لطفاً روش ارسال دیگری انتخاب کنید.'
    : language === 'ar'
      ? 'تكلفة الشحن لهذا المسار غير متاحة. يرجى اختيار طريقة شحن أخرى.'
      : language === 'tr'
        ? 'Bu rota için teslimat ücreti mevcut değil. Lütfen başka bir teslimat yöntemi seçin.'
        : 'Shipping is unavailable for this route. Please choose another delivery method.';
  const shippingQuoteRefreshMessage = language === 'fa'
    ? 'پیش‌فاکتور ارسال موجود نیست یا منقضی شده است؛ در حال به‌روزرسانی است. لطفاً پس از به‌روزرسانی دوباره سفارش را ثبت کنید.'
    : language === 'ar'
      ? 'عرض الشحن غير متوفر أو منتهي الصلاحية؛ جارٍ تحديثه. يرجى إعادة إرسال الطلب بعد التحديث.'
      : language === 'tr'
        ? 'Kargo teklifi eksik veya süresi dolmuş; yenileniyor. Lütfen yenilendikten sonra siparişi tekrar gönderin.'
        : 'The shipping quote is missing or expired and is being refreshed. Please submit again after it updates.';
  const standardShippingUnavailableMessage = language === 'fa'
    ? 'هزینه ارسال در دسترس نیست. لطفاً دوباره تلاش کنید یا روش ارسال دیگری انتخاب کنید.'
    : language === 'ar'
      ? 'تكلفة الشحن غير متاحة. يرجى إعادة المحاولة أو اختيار طريقة شحن أخرى.'
      : language === 'tr'
        ? 'Kargo ücreti şu anda mevcut değil. Lütfen tekrar deneyin veya başka bir teslimat yöntemi seçin.'
        : 'Shipping cost is unavailable. Please retry or choose another delivery method.';

  useEffect(() => {
    const requestId = ++standardShippingRequestRef.current;
    const quoteController = new AbortController();
    setStandardShippingQuote(null);
    setStandardShippingError('');
    setShippingCost(0);
    if (!selectedShippingMethod || !selectedShippingRate || isPickupShippingMethod || isSmartShippingMethod) {
      setStandardShippingLoading(false);
      return () => {
        if (standardShippingRequestRef.current === requestId) standardShippingRequestRef.current++;
        quoteController.abort();
      };
    }
    if (hasContractCartError) {
      setStandardShippingLoading(false);
      setStandardShippingError(contractCartErrors[0]);
      return () => {
        if (standardShippingRequestRef.current === requestId) standardShippingRequestRef.current++;
        quoteController.abort();
      };
    }
    if (unavailableCartProductIds.length > 0) {
      setStandardShippingLoading(false);
      setStandardShippingError(t.unavailableCartWarning);
      return () => {
        if (standardShippingRequestRef.current === requestId) standardShippingRequestRef.current++;
        quoteController.abort();
      };
    }
    if (missingWeightProductIds.length > 0) {
      setStandardShippingLoading(false);
      setStandardShippingError(t.missingCartWeight);
      return () => {
        if (standardShippingRequestRef.current === requestId) standardShippingRequestRef.current++;
        quoteController.abort();
      };
    }
    if (!hasCompleteDeliveryAddress || !activePricingCity || totalWeight <= 0) {
      setStandardShippingLoading(false);
      setStandardShippingError('');
      return () => {
        if (standardShippingRequestRef.current === requestId) standardShippingRequestRef.current++;
        quoteController.abort();
      };
    }

    setStandardShippingLoading(true);
    const quoteKey = standardShippingQuoteKey;
    const quoteCity = activePricingCity;
    const quoteProvince = activePricingProvince;
    const countryCode = resolveCountryCode(activePricingCountry) || (activePricingCountry.length <= 3 ? activePricingCountry.toUpperCase() : '');
    const quoteMethodId = selectedShippingMethod;
    const requestQuote = async () => {
      try {
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
        if (requestId !== standardShippingRequestRef.current) return;
        const quoteCenterKey = getShippingCenterKey(refreshedCenter.data?.data);
        if (refreshedCenter.isError || !quoteCenterKey) throw new Error(standardShippingUnavailableMessage);
        shippingCenterKeyRef.current = quoteCenterKey;
        const matchingCity = Array.isArray(secondaryCities)
          ? secondaryCities.find((city: any) => [
              city.nameEn, city.name_en, city.nameEnglish, city.nameArabic, city.name_arabic,
              city.namePersian, city.nameFa, city.name_fa, city.nameTurkish, city.nameTr, city.name_tr, city.name
            ].some((name: any) => name && name.toLowerCase() === quoteCity.toLowerCase()))
          : null;
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
              cart: shippingQuoteCart,
              contractId: selectedContractId,
              subtotalAmount,
              ...(matchingCity?.id != null ? { destinationCityId: matchingCity.id } : {}),
              destinationCity: quoteCity,
              ...(quoteProvince ? { destinationProvince: quoteProvince } : {}),
              ...(countryCode ? { destinationCountryCode: countryCode } : {}),
              shippingMethod: quoteMethodId,
              selectorIsDeliveryMethod: false,
            }),
          });
          const contentType = response.headers.get('content-type') || '';
          result = contentType.includes('application/json')
            ? await response.json().catch(() => null)
            : null;
        } finally {
          clearTimeout(quoteTimeout);
        }
        if (requestId !== standardShippingRequestRef.current) return;
        const rawCost = result?.data?.shippingCost;
        const cost = Number(rawCost);
        if (!response.ok || !result?.success ||
          (typeof rawCost !== 'number' && typeof rawCost !== 'string') ||
          String(rawCost).trim() === '' || !Number.isFinite(cost) || cost < 0) {
          throw new Error(standardShippingUnavailableMessage);
        }
        if (requestId !== standardShippingRequestRef.current || shippingCenterKeyRef.current !== quoteCenterKey) return;
        setShippingCost(cost);
        setStandardShippingQuote({
          methodId: quoteMethodId,
          cost,
          key: quoteKey,
          centerKey: quoteCenterKey,
          cartKey: shippingQuoteCartKey,
          createdAt: Date.now(),
        });
      } catch (error) {
        if (requestId !== standardShippingRequestRef.current) return;
        setStandardShippingError(standardShippingUnavailableMessage);
        setStandardShippingQuote(null);
        setShippingCost(0);
      } finally {
        if (requestId === standardShippingRequestRef.current) setStandardShippingLoading(false);
      }
    };
    // Wait until the customer has stopped changing the cart before quoting.
    const debounceTimer = setTimeout(() => void requestQuote(), 2000);
    return () => {
      if (standardShippingRequestRef.current === requestId) standardShippingRequestRef.current++;
      clearTimeout(debounceTimer);
      quoteController.abort();
    };
  }, [
    selectedShippingMethod, selectedShippingRate, isPickupShippingMethod, isSmartShippingMethod,
    activePricingAddress, activePricingCity, activePricingProvince, activePricingCountry, hasCompleteDeliveryAddress, totalWeight, standardShippingQuoteKey,
    shippingQuoteCartKey, shippingQuoteRefreshKey, secondaryCities, shippingCenterKey, refetchShippingCenter,
    standardShippingUnavailableMessage, unavailableCartProductIds.length,
    hasContractCartError, contractCartErrors, selectedContractId, subtotalAmount,
  ]);

  // Watch for changes in destination to recalculate delivery cost
  useEffect(() => {
    const requestId = ++smartShippingRequestRef.current;
    // Determine final destination city and province
    const finalDestinationCity = activePricingCity;
    
    const finalDestinationProvince = activePricingProvince;

    console.log('🚚 [DELIVERY CALCULATION] Final destination determined:', {
      selectedDeliveryAddressId,
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

    const effectiveProvince = finalDestinationProvince || '';

    if (!isSmartShippingMethod) {
      setSmartDeliveryLoading(false);
      setSmartDeliveryCost(0);
      setOptimalVehicle(null);
      setAlternativeVehicles([]);
      setSmartDeliveryError('');
      setSmartDeliveryPricedKey('');
      setPricedShippingCenterKey('');
      setShippingQuote(null);
      return;
    }

    if (unavailableCartProductIds.length > 0) {
      setSmartDeliveryLoading(false);
      setSmartDeliveryCost(0);
      setOptimalVehicle(null);
      setShippingQuote(null);
      setSmartDeliveryPricedKey('');
      setSmartDeliveryError(t.unavailableCartWarning);
      return;
    }

    if (hasContractCartError) {
      setSmartDeliveryLoading(false);
      setSmartDeliveryCost(0);
      setOptimalVehicle(null);
      setShippingQuote(null);
      setSmartDeliveryPricedKey('');
      setSmartDeliveryError(contractCartErrors[0]);
      return;
    }
    
    if (hasCompleteDeliveryAddress && finalDestinationCity && totalWeight > 0) {
      setSmartDeliveryLoading(true);
      setSmartDeliveryCost(0);
      setOptimalVehicle(null);
      setAlternativeVehicles([]);
      setSmartDeliveryError('');
      setSmartDeliveryPricedKey('');
      setPricedShippingCenterKey('');
      setShippingQuote(null);
      const debounceTimer = setTimeout(() => {
        const matchingCity = Array.isArray(secondaryCities)
          ? secondaryCities.find((city: any) => [
              city.nameEn, city.name_en, city.nameEnglish, city.nameArabic, city.name_arabic,
              city.namePersian, city.nameFa, city.name_fa, city.nameTurkish, city.nameTr, city.name_tr, city.name
            ].some((name) => name && name.toLowerCase() === finalDestinationCity.toLowerCase()))
          : null;
        void calculateSmartDeliveryCost(finalDestinationCity, effectiveProvince, matchingCity?.id, requestId);
      }, 2000); // Recalculate only after two seconds without another cart/address change.
      
      return () => {
        smartShippingRequestRef.current++;
        clearTimeout(debounceTimer);
      };
    } else {
      setSmartDeliveryLoading(false);
      setSmartDeliveryCost(0);
      setOptimalVehicle(null);
      setAlternativeVehicles([]);
      setSmartDeliveryError('');
      setSmartDeliveryPricedKey('');
      setPricedShippingCenterKey('');
      setShippingQuote(null);
      setSmartDeliveryLoading(false);
      console.log('🚚 [DELIVERY CALCULATION] Missing required data for calculation:', {
        hasAddress: !!activePricingAddress,
        hasCity: !!finalDestinationCity,
        hasCountry: !!activePricingCountry,
        hasProvince: !!finalDestinationProvince,
        effectiveProvince,
        hasWeight: totalWeight > 0,
        cityValue: finalDestinationCity,
        provinceValue: finalDestinationProvince,
        totalWeight
      });
    }
  }, [selectedShippingMethod, isSmartShippingMethod, hasCompleteDeliveryAddress, activePricingAddress, activePricingCity, activePricingProvince, activePricingCountry, totalWeight, cart, shippingQuoteRefreshKey, secondaryCities, shippingCenterKey, hasContractCartError, contractCartErrors]);



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
          title: language === 'en' ? `✅ Order registered with ${proformaDeadlineDays}-day grace period` : language === 'fa' ? `✅ سفارش با مهلت ${proformaDeadlineDays} روزه ثبت شد` : `✅ تم تسجيل الطلب مع مهلة ${proformaDeadlineDays} يوم`,
          description: language === 'en' ? `Your order is locked. Upload your bank receipt within ${proformaDeadlineDays} days` : language === 'fa' ? `سفارش شما قفل شد. تا ${proformaDeadlineDays} روز آینده رسید بانکی خود را بارگذاری کنید` : `تم قفل طلبك. يرجى تحميل إيصال البنك خلال ${proformaDeadlineDays} أيام`
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
            description: language === 'ar' || language === 'fa'
              ? `${language === 'fa' ? 'مبلغ' : 'مبلغ'} ${formatCurrency(response.walletAmountDeducted || walletBalance)} ${language === 'fa' ? 'از کیف پول کسر شد. مبلغ باقی‌مانده:' : 'من کیف پول کسر شد. المبلغ المتبقي:'} ${formatCurrency(remainingToPayBank)}`
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
            description: language === 'ar' || language === 'fa'
              ? language === 'fa' ? "سفارش ثبت شد. لطفاً مبلغ باقی‌مانده را از طریق انتقال بانکی پرداخت کنید" : "تم تسجيل الطلب. يرجى دفع المبلغ المتبقي عبر التحويل البنكي"
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
          title: t.redirectingToBank,
          description: t.redirectingToBankDesc
        });
        
        // Redirect to bank payment gateway
        setTimeout(() => {
          const redirectAmount = response.totalAmount || response.remainingAmount || totalAmount;
          window.location.href = `/payment?orderId=${response.orderId || response.order?.id}&amount=${redirectAmount}&method=bank`;
        }, 1500);
        return;
      }
      else {
        toast({
          title: t.orderSubmitted,
          description: t.orderSubmitted
        });
        onOrderComplete();
      }
    },
    onError: (error: any) => {
      console.error('❌ [ORDER ERROR] Order submission failed:', error);
      
      // Show specific error message for bank payment failures
      const errorMessage = error.message || t.orderError;
      
      toast({
        title: t.orderError,
        description: errorMessage,
        variant: "destructive"
      });
    },
    onSettled: () => { orderSubmissionLockRef.current = false; },
  });

  const onSubmit = async (data: any) => {
    const isFinalConfirmation = confirmingOrderRef.current;
    confirmingOrderRef.current = false;
    if (submitOrderMutation.isPending || orderSubmissionLockRef.current) return;
    if (isFinalConfirmation) orderSubmissionLockRef.current = true;
    let handedToMutation = false;
    try {
    if (isAlternateAddressSelected && (
      !activePricingCity.trim() ||
      !activePricingProvince.trim() ||
      !activePricingCountry.trim()
    )) {
      toast({ title: t.destinationRequired, variant: "destructive" });
      return;
    }
    if (isNewAddressSelected && (
      !newAddressTitle.trim() ||
      !activePricingAddress.trim() ||
      activePricingAddress.trim().length < 10 ||
      !activePricingCountry.trim() ||
      !activePricingPhone.trim() ||
      activePricingPhone.trim().length < 10
    )) {
      toast({ title: t.addressRequired, description: t.phoneRequired, variant: "destructive" });
      return;
    }
    if (unavailableCartProductIds.length > 0) {
      toast({ title: t.unavailableCartWarning, variant: "destructive" });
      return;
    }
    if (missingWeightProductIds.length > 0) {
      toast({ title: t.missingCartWeight, variant: "destructive" });
      return;
    }
    if (hasContractCartError) {
      toast({ title: contractCartErrors[0], variant: "destructive" });
      return;
    }
    if (selectedContractId !== null && (isWalletPaymentMethod || walletAmount > 0)) {
      setWalletAmount(0);
      setPaymentMethod((supportedNonWalletPaymentMethod || 'fib_online') as typeof paymentMethod);
      toast({
        title: language === 'fa' ? 'پرداخت از کیف پول برای قرارداد مجاز نیست' : language === 'ar' ? 'الدفع من المحفظة غير متاح للعقود' : language === 'tr' ? 'Sözleşmeli alışverişte cüzdanla ödeme kullanılamaz' : 'Wallet payment is not available for contract orders',
        description: language === 'fa' ? 'برای سفارش قراردادی، یک روش پرداخت غیر از کیف پول انتخاب کنید.' : language === 'ar' ? 'يرجى اختيار طريقة دفع غير المحفظة لطلب العقد.' : language === 'tr' ? 'Lütfen sözleşme siparişi için cüzdan dışında bir ödeme yöntemi seçin.' : 'Choose a non-wallet payment method for this contract order.',
        variant: "destructive",
      });
      return;
    }
    if (selectedContractId !== null && !supportedNonWalletPaymentMethod) {
      toast({
        title: language === 'fa' ? 'روش پرداخت غیرکیف پول در دسترس نیست' : language === 'ar' ? 'لا توجد طريقة دفع غير المحفظة متاحة' : language === 'tr' ? 'Cüzdan dışı ödeme yöntemi kullanılamıyor' : 'No non-wallet payment method is available',
        description: language === 'fa' ? 'برای ثبت سفارش قراردادی، فروشگاه باید یک روش پرداخت غیرکیف پول فعال کند.' : language === 'ar' ? 'يجب تفعيل طريقة دفع غير المحفظة من المتجر لإتمام طلب العقد.' : language === 'tr' ? 'Sözleşme siparişini tamamlamak için mağazanın cüzdan dışı bir ödeme yöntemi etkinleştirmesi gerekir.' : 'The shop must enable a non-wallet payment method to place a contract order.',
        variant: "destructive",
      });
      return;
    }
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
          title: language === 'fa' ? "انتخاب روش ارسال الزامی است" : language === 'ar' ? "طريقة الشحن مطلوبة" : "Shipping method is required",
          description: language === 'fa' ? "لطفاً یک روش ارسال انتخاب کنید" : language === 'ar' ? "يرجى اختيار طريقة الشحن" : "Please select a shipping method",
        variant: "destructive"
      });
      return;
    }
    if (!isPickupShippingMethod && !hasCompleteDeliveryAddress) {
      toast({
        title: language === 'fa' ? 'آدرس تحویل کامل نیست' : language === 'ar' ? 'عنوان التسليم غير مكتمل' : 'Delivery address is incomplete',
        description: deliveryAddressRequiredMessage,
        variant: 'destructive',
      });
      return;
    }

    const selectedRateForValidation = shippingRatesData?.find((rate: any) => rate.id === selectedShippingMethod);
    if (!selectedRateForValidation) {
      toast({
        title: language === 'fa' ? "روش ارسال در دسترس نیست" : language === 'ar' ? "طريقة الشحن غير متاحة" : "Shipping method is unavailable",
        description: smartDeliveryUnavailableMessage,
        variant: "destructive"
      });
      return;
    }
    const selectedMethodForValidation = selectedRateForValidation?.deliveryMethod || selectedRateForValidation?.delivery_method;
    const normalizedDeliveryMethod = String(selectedMethodForValidation || '').toLowerCase();
    const isPickupForValidation = ['pickup', 'self_pickup', 'self-pickup'].includes(normalizedDeliveryMethod);
    const isSmartShippingForValidation = normalizedDeliveryMethod === 'smart_vehicle' || normalizedDeliveryMethod.includes('bus');
    const isShippingDependentForValidation = !!selectedRateForValidation && !isPickupForValidation;
    const requiresShippingQuoteToken = isShippingDependentForValidation && isSmartShippingForValidation;
    const refreshedCenter = await refetchShippingCenter();
    const freshCenterData = refreshedCenter.data?.data;
    const freshCenterKey = getShippingCenterKey(freshCenterData);
    if (freshCenterKey) shippingCenterKeyRef.current = freshCenterKey;
    if (isShippingDependentForValidation && (refreshedCenter.isError || !freshCenterKey)) {
      setSmartDeliveryError(smartDeliveryUnavailableMessage);
      setShippingQuote(null);
      toast({
        title: smartDeliveryUnavailableMessage,
        description: smartDeliveryUnavailableMessage,
        variant: "destructive"
      });
      return;
    }

    const freshCenterCountryCode = resolveCountryCode(freshCenterData?.countryCode) || freshCenterData?.countryCode?.toUpperCase() || '';
    const destinationCountryCode = resolveCountryCode(activePricingCountry);
    if (isShippingDependentForValidation && freshCenterCountryCode && destinationCountryCode && freshCenterCountryCode !== destinationCountryCode) {
      setShippingQuote(null);
      toast({
        title: smartDeliveryUnavailableMessage,
        description: smartDeliveryUnavailableMessage,
        variant: "destructive"
      });
      return;
    }

    const shippingQuoteIsCurrent = !!shippingQuote?.token &&
      shippingQuote.destination === `${activePricingCity}|${activePricingProvince}|${totalWeight}` &&
      shippingQuote.centerKey === freshCenterKey &&
      shippingQuote.cartKey === shippingQuoteCartKey &&
      Date.now() - shippingQuote.createdAt < 4 * 60 * 1000;
    if (requiresShippingQuoteToken && !shippingQuoteIsCurrent) {
      setShippingQuote(null);
      setSmartDeliveryPricedKey('');
      setPricedShippingCenterKey('');
      setShippingQuoteRefreshKey((key) => key + 1);
      toast({
        title: shippingQuoteRefreshMessage,
        description: shippingQuoteRefreshMessage,
        variant: "destructive"
      });
      return;
    }

    if (
      isSmartShippingForValidation &&
      (
        smartDeliveryLoading ||
        !!smartDeliveryError ||
        !optimalVehicle ||
        smartDeliveryPricedKey !== currentSmartDeliveryPricedKey ||
        pricedShippingCenterKey !== freshCenterKey
      )
    ) {
      setSmartDeliveryError(smartDeliveryUnavailableMessage);
      toast({
        title: smartDeliveryUnavailableMessage,
        description: smartDeliveryError || smartDeliveryUnavailableMessage,
        variant: "destructive"
      });
      return;
    }

    const submittedStandardQuoteIsCurrent = !!standardShippingQuote &&
      standardShippingQuote.methodId === selectedShippingMethod &&
      standardShippingQuote.key === standardShippingQuoteKey &&
      standardShippingQuote.centerKey === freshCenterKey &&
      standardShippingQuote.cartKey === shippingQuoteCartKey &&
      Number.isFinite(standardShippingQuote.cost) &&
      Date.now() - standardShippingQuote.createdAt < 4 * 60 * 1000;
    if (isShippingDependentForValidation && !isSmartShippingForValidation &&
      (standardShippingLoading || !!standardShippingError || !submittedStandardQuoteIsCurrent)) {
      setStandardShippingError(standardShippingUnavailableMessage);
      setStandardShippingQuote(null);
      setShippingQuoteRefreshKey((key) => key + 1);
      toast({
        title: standardShippingUnavailableMessage,
        description: standardShippingUnavailableMessage,
        variant: "destructive"
      });
      return;
    }

    // Snapshot the selected destination (including the saved recipient) into this order.
    const activeDeliveryInfo = {
      activeAddress: activePricingAddress,
      activeCity: activePricingCity,
      activeProvince: activePricingProvince,
      activeCountry: activePricingCountry,
      activePostalCode: activePricingPostalCode,
      activePhone: activePricingPhone,
      activeRecipientName,
      isUsingSecondAddress: isAlternateAddressSelected,
      isUsingRecipientMobile: isNewAddressSelected || (!!selectedSavedAddress && !!activePricingPhone) ||
        (showRecipientMobile && recipientMobile.trim().length > 0),
    };

    // Get the selected shipping rate to extract deliveryMethod
    const selectedRate = shippingRatesData?.find((rate: any) => rate.id === selectedShippingMethod);
    const selectedDeliveryMethod = selectedRate?.deliveryMethod || selectedRate?.delivery_method || 'unknown';
    
    let orderData = {
      ...data,
      // The API validates these canonical fields from the selected destination.
      address: activeDeliveryInfo.activeAddress,
      city: activeDeliveryInfo.activeCity,
      province: activeDeliveryInfo.activeProvince,
      postalCode: activeDeliveryInfo.activePostalCode,
      phone: activeDeliveryInfo.activePhone,
      recipientName: activeDeliveryInfo.activeRecipientName,
      country: activeDeliveryInfo.activeCountry,
      cart: shippingQuoteCart,
      contractId: selectedContractId,
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
      walletAmountUsed: selectedContractId !== null ? 0 : Math.round(walletAmount), // Use actual wallet amount in integer format
      remainingAmount: Math.round(Math.max(0, totalAmount - (selectedContractId !== null ? 0 : walletAmount))), // Calculate remaining in integer format
      
      // Customer's selected vehicle from smart delivery calculation - CRITICAL for logistics
      vehicleType: optimalVehicle?.vehicleName || optimalVehicle?.name || optimalVehicle?.vehicleType || null,
      
      // CRITICAL FIX: Include calculated weight for order_management storage
      totalWeight: totalWeight,
      ...(requiresShippingQuoteToken ? { shippingQuoteToken: shippingQuote!.token } : {}),
      
      // Enhanced delivery information
      secondDeliveryAddress: isAlternateAddressSelected ? activeDeliveryInfo.activeAddress : null,
      secondDeliveryCity: isAlternateAddressSelected ? activeDeliveryInfo.activeCity : null,
      secondDeliveryProvince: isAlternateAddressSelected ? activeDeliveryInfo.activeProvince : null,
      secondDeliveryPostalCode: isAlternateAddressSelected ? activeDeliveryInfo.activePostalCode : null,
      recipientMobile: activeDeliveryInfo.isUsingRecipientMobile ? activeDeliveryInfo.activePhone : null,
      
      // Active delivery logistics data
      activeDeliveryInfo,
      
      // Add warehouse notes for logistics clarity
      warehouseNotes: `تحویل فعال: ${activeDeliveryInfo.isUsingSecondAddress ? 'نشانی انتخاب‌شده' : 'نشانی اصلی'} | تماس فعال: ${activeDeliveryInfo.isUsingRecipientMobile ? 'موبایل گیرنده' : 'موبایل اصلی'}`
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

    const signature = JSON.stringify({
      cart: orderData.cart, address: orderData.address, city: orderData.city,
      province: orderData.province, country: orderData.country,
      phone: orderData.phone, recipientName: orderData.recipientName, addressChoice: selectedDeliveryAddressId,
      shipping: orderData.selectedShippingMethod,
      shippingCost: orderData.shippingCost, total: orderData.totalAmount,
      payment: orderData.paymentMethod, walletAmount: orderData.walletAmountUsed,
      contractId: orderData.contractId,
      contractItems: selectedContract?.items,
    });
    if (!isFinalConfirmation || !pendingReview || pendingReview.signature !== signature) {
      if (customerData?.success) {
        const refreshed = await refetchSavedCustomerAddresses();
        if (refreshed.isError) {
          toast({ title: language === 'fa' ? 'دریافت آدرس‌های ذخیره‌شده ناموفق بود' : 'Could not load saved addresses', variant: 'destructive' });
          return;
        }
      }
      if (!reviewOpen) {
        setReviewAddressId(selectedDeliveryAddressId);
      }
      setPendingReview({ data: orderData, signature });
      setReviewOpen(true);
      return;
    }

    if (selectedContractId !== null) {
      const contractAsPresented = selectedContract;
      try {
        const response = await fetch('/api/shop/contracts/mine', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success || !Array.isArray(result.contracts)) {
          throw new Error(result?.message || `Contract verification failed (HTTP ${response.status})`);
        }

        const freshContracts = result.contracts as ShopContract[];
        const freshContract = freshContracts.find(contract => contract.id === selectedContractId);
        const normalizeItems = (items: ShopContract['items']) => [...items]
          .sort((a, b) => Number(a.productId) - Number(b.productId))
          .map(item => ({
            productId: Number(item.productId),
            productName: item.productName,
            maxQuantity: Number(item.maxQuantity),
            usedQuantity: Number(item.usedQuantity),
            remainingQuantity: Number(item.remainingQuantity),
            unitPrice: Number(item.unitPrice),
          }));
        const contractChanged = !contractAsPresented ||
          !freshContract ||
          !freshContract.isActive ||
          freshContract.customerId !== contractAsPresented.customerId ||
          freshContract.number !== contractAsPresented.number ||
          freshContract.terms !== contractAsPresented.terms ||
          freshContract.customerName !== contractAsPresented.customerName ||
          JSON.stringify(normalizeItems(freshContract.items)) !== JSON.stringify(normalizeItems(contractAsPresented.items)) ||
          Object.entries(cart).some(([productId, quantity]) => {
            const item = freshContract.items.find(candidate => Number(candidate.productId) === Number(productId));
            return !item ||
              !Number.isFinite(Number(item.remainingQuantity)) ||
              Number(item.remainingQuantity) < Number(quantity) ||
              !Number.isFinite(Number(item.unitPrice)) ||
              Number(item.unitPrice) < 0;
          });

        if (contractChanged) {
          queryClient.setQueryData<ShopContract[]>(['/api/shop/contracts/mine'], freshContracts);
          setReviewOpen(false);
          setPendingReview(null);
          toast({
            title: language === 'fa' ? 'اطلاعات قرارداد به‌روزرسانی شد' : language === 'ar' ? 'تم تحديث بيانات العقد' : language === 'tr' ? 'Sözleşme bilgileri güncellendi' : 'Contract details were updated',
            description: language === 'fa'
              ? 'قیمت یا محدودیت قرارداد تغییر کرده است. مبلغ‌های به‌روزشده را بررسی کنید و دوباره سفارش را تأیید کنید.'
              : language === 'ar'
                ? 'تغير سعر العقد أو حدوده. يرجى مراجعة الإجماليات المحدّثة وتأكيد الطلب مجدداً.'
                : language === 'tr'
                  ? 'Sözleşme fiyatı veya limitleri değişti. Lütfen güncellenen toplamları inceleyip siparişi yeniden onaylayın.'
                  : 'Contract pricing, ownership, or limits changed. Review the refreshed totals and confirm the order again.',
            variant: 'destructive',
          });
          orderSubmissionLockRef.current = false;
          return;
        }
      } catch (error) {
        toast({
          title: language === 'fa' ? 'بررسی قرارداد ناموفق بود' : language === 'ar' ? 'تعذر التحقق من العقد' : language === 'tr' ? 'Sözleşme doğrulanamadı' : 'Could not verify the contract',
          description: language === 'fa'
            ? 'سفارش ثبت نشد زیرا قیمت و موجودی قرارداد قابل بررسی نبود. لطفاً دوباره تلاش کنید.'
            : language === 'ar'
              ? 'لم يتم إرسال الطلب لتعذر التحقق من سعر العقد وتوفره. يرجى المحاولة مجدداً.'
              : language === 'tr'
                ? 'Sözleşme fiyatı ve kullanılabilirliği doğrulanamadığı için sipariş gönderilmedi. Lütfen tekrar deneyin.'
                : 'The order was not submitted because current contract pricing and availability could not be verified. Please retry.',
          variant: 'destructive',
        });
        orderSubmissionLockRef.current = false;
        return;
      }
    }

    setIsConfirmingOrder(true);
    try {
      if (customerData?.success && isNewAddressSelected) {
        const savedAddress = await saveCustomerAddress({
          title: newAddressTitle.trim(),
          address: orderData.address,
          city: orderData.city,
          state: orderData.province,
          country: orderData.country,
          postalCode: orderData.postalCode,
          phone: orderData.phone,
          recipientName: orderData.recipientName || data.customerName || customerData.customer?.firstName || 'Customer',
        });
        queryClient.setQueryData<SavedCustomerAddress[]>(['structuredCustomerAddresses'], current => {
          const addresses = current || [];
          const existingIndex = addresses.findIndex(address => Number(address.id) === Number(savedAddress.id));
          if (existingIndex < 0) return [...addresses, savedAddress];
          return addresses.map((address, index) => index === existingIndex ? savedAddress : address);
        });
        const savedAddressId = `saved:${savedAddress.id}`;
        setSelectedDeliveryAddressId(savedAddressId);
        setReviewAddressId(savedAddressId);
        await refetchSavedCustomerAddresses();
        await queryClient.invalidateQueries({ queryKey: ['/api/customers/addresses'] });
      }
      setReviewOpen(false);
      setPendingReview(null);
      handedToMutation = true;
      submitOrderMutation.mutate(orderData);
    } catch (error: any) {
      orderSubmissionLockRef.current = false;
      toast({ title: language === 'fa' ? 'ذخیره نشانی ناموفق بود' : 'Could not save the address',
        description: error?.message, variant: 'destructive' });
    } finally {
      setIsConfirmingOrder(false);
    }
    } finally {
      if (!handedToMutation) orderSubmissionLockRef.current = false;
    }
  };



  return (
    <div className="fixed inset-0 bg-black/20 z-40 pointer-events-none">
        <Card
         dir={direction}
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
                if (!product) {
                  return (
                    <div key={productId} role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      <span>{t.unavailableCartProduct} #{productId} ({quantity})</span>
                      {onRemoveItem && (
                        <Button type="button" size="sm" variant="outline" onClick={() => onRemoveItem(Number(productId))}>
                          <Trash2 className="w-3 h-3 mr-1" />
                          {t.removeItem}
                        </Button>
                      )}
                    </div>
                  );
                }
                
                const basePrice = Math.round(parseFloat(product.price || '0'));
                const discountedPrice = getCartUnitPrice(product, quantity);
                const usesContractPrice = selectedContractId !== null;
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
                          {!usesContractPrice && discountedPrice < basePrice && (
                            <span className="line-through text-gray-400 mr-2">{formatCurrency(basePrice)}</span>
                          )}
                          {formatCurrency(discountedPrice)} {t.each}
                          {!usesContractPrice && discountedPrice < basePrice && basePrice > 0 && (
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
                           value={quantityDrafts[product.id] ?? quantity}
                           onFocus={() => {
                             if (!activatedQuantityInputs.current.has(product.id)) {
                               activatedQuantityInputs.current.add(product.id);
                               if (quantity === 1) {
                                 setQuantityDrafts(current => ({ ...current, [product.id]: '' }));
                               }
                             }
                           }}
                          onChange={(e) => {
                             const rawQuantity = e.target.value;
                             setQuantityDrafts(current => ({ ...current, [product.id]: rawQuantity }));
                             if (rawQuantity === '') return;
                             const newQuantity = parseInt(rawQuantity, 10);
                             if (!Number.isFinite(newQuantity)) return;
                            const maxQuantity = product.stockQuantity || 999999;
                            const validQuantity = Math.max(1, Math.min(newQuantity, maxQuantity));
                             setQuantityDrafts(current => ({ ...current, [product.id]: validQuantity.toString() }));
                            if (onUpdateQuantity) {
                              onUpdateQuantity(product.id, validQuantity);
                            }
                          }}
                           onBlur={() => {
                             setQuantityDrafts(current => {
                               const next = { ...current };
                               delete next[product.id];
                               return next;
                             });
                           }}
                          className="h-7 w-16 text-center text-sm font-medium px-1 py-0"
                          title={language === 'en' ? 'Change quantity directly' : language === 'fa' ? 'تغییر مستقیم تعداد' : 'تغيير الكمية مباشرة'}
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
                        <span className="text-sm text-muted-foreground">{language === 'en' ? 'Item Total' : language === 'fa' ? 'مجموع کالا' : 'إجمالي العنصر'}</span>
                        <span className="font-medium">{formatCurrency(itemTotal)}</span>
                      </div>
                      {!usesContractPrice && discountedPrice < basePrice && (
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
                  <span>{taxT.vat} ({(vatRate * 100).toFixed(0)}%)</span>
                  <span>{formatCurrency(vatAmount)}</span>
                </div>
              )}
              
              {/* Duties */}
              {vatData?.dutiesEnabled && dutiesAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{taxT.duties} ({(dutiesRate * 100).toFixed(0)}%)</span>
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
                {missingWeightProductIds.length > 0 && (
                  <p className="text-sm text-red-700" role="alert">{t.missingCartWeight}</p>
                )}
                {isLoadingShippingRates ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    {language === 'en' ? 'Loading shipping methods...' : language === 'fa' ? 'در حال بارگذاری روش‌های ارسال...' : 'جارٍ تحميل طرق الشحن...'}
                  </div>
                ) : shippingRatesError ? (
                  <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2 border border-red-200 dark:border-red-800">
                    {language === 'en' ? 'Failed to load shipping methods. Please refresh page.' : language === 'fa' ? 'بارگذاری روش‌های ارسال ناموفق بود. لطفاً صفحه را تازه‌سازی کنید.' : 'فشل تحميل طرق الشحن. يرجى إعادة تحميل الصفحة.'}
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
                          const freightPrice = rate.id === selectedShippingMethod && !hasCompleteDeliveryAddress
                            ? deliveryAddressRequiredMessage
                            : rate.id === selectedShippingMethod && standardShippingQuoteReady
                            ? (standardShippingQuote!.cost === 0 ? t.freeShipping : formatCurrency(standardShippingQuote!.cost))
                            : rate.id === selectedShippingMethod && standardShippingLoading
                              ? t.calculating
                              : standardShippingUnavailableMessage;
                          return (
                            <option key={rate.id} value={rate.id} style={{backgroundColor: '#fed7aa', color: '#c2410c'}}>
                              🚚 {language === 'en' ? 'Freight Collect' : language === 'fa' ? 'کرایه در مقصد' : 'الشحن عند التسليم'} - {freightPrice}
                            </option>
                          );
                        }
                        
                        // Method prices are shown only after the active method has a server quote.
                        const isActiveRate = rate.id === selectedShippingMethod;
                        const ratePrice = isActiveRate && !hasCompleteDeliveryAddress
                          ? deliveryAddressRequiredMessage
                          : isActiveRate && standardShippingQuoteReady
                          ? (standardShippingQuote!.cost === 0 ? t.freeShipping : formatCurrency(standardShippingQuote!.cost))
                          : isActiveRate && standardShippingLoading
                            ? t.calculating
                            : standardShippingUnavailableMessage;
                        
                        return (
                          <option key={rate.id} value={rate.id}>
                            {rate.deliveryMethod || rate.delivery_method || rate.name} - {ratePrice}
                            {rate.estimatedDays && ` (${rate.estimatedDays} ${language === 'en' ? 'days' : language === 'fa' ? 'روز' : 'أيام'})`}
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
                                    {optimalVehicle && currentSmartShippingQuoteReady ? (
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
                                    ) : smartDeliveryError ? (
                                      <span className="font-bold text-red-600">{smartDeliveryUnavailableMessage}</span>
                                    ) : (
                                      <span className="font-bold text-orange-600">{t.waitingForAddress}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-200">
                                  ✓ {t.smartVehicleDescription}
                                  {optimalVehicle && currentSmartShippingQuoteReady && (
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
                                  <span className="text-orange-700 font-medium">🚚 {language === 'en' ? 'Freight Collect' : language === 'fa' ? 'کرایه در مقصد' : 'الشحن عند التسليم'}</span>
                                  <span className="font-bold text-orange-800">{language === 'en' ? 'Pay upon delivery' : language === 'fa' ? 'پرداخت هنگام تحویل' : 'الدفع عند الاستلام'}</span>
                                </div>
                                <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                                  ✓ {language === 'en' ? 'Shipping cost will be paid upon delivery by the customer' : language === 'fa' ? 'هزینه ارسال هنگام تحویل توسط مشتری پرداخت می‌شود' : 'سيتم دفع تكلفة الشحن عند التسليم من قبل العميل'}
                                </div>
                                <div className="text-sm font-medium">
                                  {standardShippingError
                                    ? standardShippingUnavailableMessage
                                    : standardShippingLoading
                                      ? t.calculating
                                      : !hasCompleteDeliveryAddress
                                        ? deliveryAddressRequiredMessage
                                      : standardShippingQuoteReady
                                        ? (standardShippingQuote!.cost === 0 ? t.freeShipping : formatCurrency(standardShippingQuote!.cost))
                                        : standardShippingUnavailableMessage}
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
                                  {standardShippingError
                                    ? standardShippingUnavailableMessage
                                    : standardShippingLoading
                                      ? t.calculating
                                      : !hasCompleteDeliveryAddress
                                        ? deliveryAddressRequiredMessage
                                      : standardShippingQuoteReady
                                        ? (standardShippingQuote!.cost === 0 ? t.freeShipping : formatCurrency(standardShippingQuote!.cost))
                                        : standardShippingUnavailableMessage}
                                </span>
                              </div>
                              {standardShippingError && (
                                <p role="alert" className="text-xs text-red-600 mt-1">{standardShippingUnavailableMessage}</p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 border border-amber-200 dark:border-amber-800">
                    {language === 'en' ? 'No shipping methods available at the moment.' : language === 'fa' ? 'در حال حاضر روش ارسالی در دسترس نیست.' : 'لا توجد طرق شحن متاحة في الوقت الحالي.'}
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
                        return `🚚 ${language === 'en' ? 'Freight Collect' : language === 'fa' ? 'کرایه در مقصد' : 'الشحن عند التسليم'}`;
                      }
                      
                      return selectedRate?.name || t.deliveryMethod;
                    })()}
                  </span>
                  <span>
                    {(() => {
                      const selectedRate = shippingRatesData?.find((rate: any) => rate.id === selectedShippingMethod);
                      
                      // Handle smart vehicle cost
                      if (selectedRate && (selectedRate.deliveryMethod === 'smart_vehicle' || selectedRate.delivery_method === 'smart_vehicle')) {
                        if (!hasCompleteDeliveryAddress) {
                          return <span className="text-gray-500">{deliveryAddressRequiredMessage}</span>;
                        }
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
                      
                      if (isPickupShippingMethod) return t.freeShipping;
                       if (!hasCompleteDeliveryAddress) return <span className="text-gray-500">{deliveryAddressRequiredMessage}</span>;
                       if (standardShippingError) return <span className="text-red-600">{standardShippingUnavailableMessage}</span>;
                       if (!isSmartShippingMethod && standardShippingLoading) return <span>{t.calculating}</span>;
                       if (!isSmartShippingMethod && !standardShippingQuoteReady) return <span className="text-red-600">{standardShippingUnavailableMessage}</span>;
                      return finalShippingCost === 0 ? t.freeShipping : formatCurrency(finalShippingCost);
                    })()}
                  </span>
                </div>
              )}
              
              {/* Final Amount */}
              <div className="flex justify-between font-bold text-lg border-t pt-2 bg-yellow-300 px-2 py-2 rounded-lg">
                <span>{language === 'en' ? 'Final Amount' : language === 'fa' ? 'مبلغ نهایی' : 'المبلغ النهائي'}</span>
                <span className={`text-gray-900 ${!hasCurrentShippingPrice ? 'text-sm' : ''}`}>
                  {hasCurrentShippingPrice
                    ? formatCurrency(totalAmount)
                    : !hasCompleteDeliveryAddress
                      ? deliveryAddressRequiredMessage
                      : smartDeliveryLoading || standardShippingLoading
                        ? t.calculating
                        : isSmartShippingMethod ? smartDeliveryUnavailableMessage : standardShippingUnavailableMessage}
                </span>
              </div>
            </div>
          </div>

          {/* Portal keeps the payment UI in DOM order after the address form. */}
          {customerData?.success && paymentSectionTarget && createPortal(
            hasCurrentShippingPrice ? (
            <div className="space-y-3 border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-blue-900 dark:text-blue-100">{t.paymentMethod}</h3>
              </div>
              
              {selectedContractId !== null && (
                <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="note">
                  {language === 'fa'
                    ? 'برای سفارش قراردادی، پرداخت از کیف پول در دسترس نیست. لطفاً یک روش پرداخت غیر از کیف پول انتخاب کنید.'
                    : language === 'ar'
                      ? 'الدفع من المحفظة غير متاح لطلبات العقود. يرجى اختيار طريقة دفع أخرى غير المحفظة.'
                      : language === 'tr'
                        ? 'Sözleşmeli siparişlerde cüzdanla ödeme kullanılamaz. Lütfen cüzdan dışında bir ödeme yöntemi seçin.'
                        : 'Wallet payment is unavailable for contract orders. Please choose a non-wallet payment method.'}
                </p>
              )}

              {/* Wallet Balance Display */}
              {selectedContractId === null && <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.walletBalance}:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(walletBalance)}</span>
                </div>
              </div>}

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
                          <span className="font-semibold">{language === 'ar' ? method.methodName : language === 'fa' ? method.methodName : method.methodNameEn}</span>
                        </Label>
                      </div>
                    );
                  }
                  return null;
                })}
                
                {/* دوم: پرداخت از کیف پول (تمام یا بخش از آن) */}
                {selectedContractId === null && canUseWallet && isWalletEnabledInSettings && (
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
              {selectedContractId === null && paymentMethod === 'wallet_combined' && (
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
                      placeholder={language === 'en' ? 'Enter wallet amount' : language === 'fa' ? 'مبلغ دلخواه از کیف پول' : 'أدخل المبلغ من المحفظة'}
                      className={isRTL ? 'text-right' : 'text-left'}
                    />
                  </div>
                  
                  {/* Payment Breakdown Table */}
                  {walletAmount > 0 && (
                    <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody>
                          {/* Final Amount Row */}
                          <tr className="border-b">
                            <td className="px-4 py-3 text-right font-medium bg-gray-50">{language === 'en' ? 'Final Amount' : language === 'fa' ? 'مبلغ نهایی' : 'المبلغ النهائي'}</td>
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
              {selectedContractId === null && (paymentMethod === 'wallet' || paymentMethod === 'wallet_full' || paymentMethod === 'wallet_partial' || paymentMethod === 'wallet_combined') && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                       <span>{language === 'en' ? 'Total amount:' : language === 'fa' ? 'مبلغ کل:' : 'المبلغ الإجمالي:'}</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                       <span>{language === 'en' ? 'Paid from wallet:' : language === 'fa' ? 'پرداخت از کیف پول:' : 'الدفع من المحفظة:'}</span>
                      <span>-{formatCurrency(paymentMethod === 'wallet_full' ? totalAmount : walletAmount)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                       <span>{language === 'en' ? 'Remaining amount:' : language === 'fa' ? 'مبلغ باقی‌مانده:' : 'المبلغ المتبقي:'}</span>
                      <span>{formatCurrency(paymentMethod === 'wallet_full' ? 0 : Math.max(0, totalAmount - walletAmount))}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            ) : (
              <div role="status" className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                {!hasCompleteDeliveryAddress
                  ? deliveryAddressRequiredMessage
                  : language === 'fa'
                    ? 'پس از دریافت نرخ معتبر ارسال، روش پرداخت نمایش داده می‌شود.'
                    : language === 'ar'
                      ? 'ستظهر خيارات الدفع بعد استلام سعر شحن صالح.'
                      : language === 'tr'
                        ? 'Geçerli kargo ücreti alındıktan sonra ödeme seçenekleri gösterilir.'
                        : 'Payment options will appear once a valid shipping quote is ready.'}
              </div>
            ),
            paymentSectionTarget,
          )}



          {/* Purchase Form */}
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              {t.enterDetails}
            </p>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {customerData?.success === true && (
                  <div className="space-y-2">
                    <ContractSelector
                      contracts={customerContracts}
                      selectedContractId={selectedContractId}
                      onSelect={setSelectedContractId}
                      language={language}
                      disabled={isLoadingContracts || isFetchingContracts || contractsError}
                    />
                    {(isLoadingContracts || isFetchingContracts) && <p className="text-sm text-muted-foreground" role="status">{t.loading}</p>}
                    {contractsError && (
                      <p className="text-sm text-red-700" role="alert">
                        {language === 'fa' ? 'بارگذاری قراردادها ناموفق بود. لطفاً دوباره تلاش کنید.' : language === 'ar' ? 'تعذر تحميل العقود. يرجى المحاولة مجدداً.' : 'Unable to load contracts. Please retry.'}
                      </p>
                    )}
                    {hasContractCartError && (
                      <div className="space-y-1 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700" role="alert">
                        {contractCartErrors.map((message, index) => <p key={`${index}-${message}`}>{message}</p>)}
                      </div>
                    )}
                  </div>
                )}
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
                          {crmCustomerData?.address || (language === 'en' ? 'Address not registered' : language === 'fa' ? 'آدرس ثبت نشده' : 'العنوان غير مسجل')}
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

                <section className="space-y-3 rounded-lg border bg-muted/20 p-4" aria-label={t.deliveryAddressChoices}>
                  <h3 className="text-sm font-semibold">{t.deliveryAddressChoices}</h3>
                  <div className="grid gap-2">
                    <button type="button" onClick={() => selectDeliveryAddress('primary')}
                      aria-pressed={selectedDeliveryAddressId === 'primary'}
                      className={`rounded-md border bg-background p-3 text-left transition-colors ${selectedDeliveryAddressId === 'primary' ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/60'}`}>
                      <span className="block font-medium">{language === 'fa' ? 'آدرس اصلی' : 'Primary address'}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {[primaryPricingAddress, primaryPricingCity, primaryPricingProvince, form.getValues('country')].filter(Boolean).join(', ')}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">{form.getValues('phone')}</span>
                    </button>
                    {legacySecondaryAddress && (
                      <button type="button" onClick={() => selectDeliveryAddress('legacy')}
                        aria-pressed={selectedDeliveryAddressId === 'legacy'}
                        className={`rounded-md border bg-background p-3 text-left transition-colors ${selectedDeliveryAddressId === 'legacy' ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/60'}`}>
                        <span className="block font-medium">{t.legacyAddress}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">{legacySecondaryAddress}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{crmCustomerData?.phone || customerData?.customer?.phone || ''}</span>
                      </button>
                    )}
                    {savedCustomerAddresses.map(address => {
                      const key = `saved:${address.id}`;
                      return (
                        <button key={key} type="button" onClick={() => selectDeliveryAddress(key)}
                          aria-pressed={selectedDeliveryAddressId === key}
                          className={`rounded-md border bg-background p-3 text-left transition-colors ${selectedDeliveryAddressId === key ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/60'}`}>
                          <span className="block font-medium">{address.title}</span>
                          <span className="mt-1 block text-sm text-muted-foreground">
                            {[address.address, address.city, address.state, address.postalCode, address.country].filter(Boolean).join(', ')}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">{address.phone}</span>
                        </button>
                      );
                    })}
                    <button type="button" onClick={() => selectDeliveryAddress('new')}
                      aria-pressed={isNewAddressSelected}
                      className={`flex w-full items-center gap-2 rounded-md border border-dashed bg-background p-3 text-left font-medium text-primary transition-colors hover:border-primary ${isNewAddressSelected ? 'border-primary ring-1 ring-primary' : ''}`}>
                      <Plus className="h-4 w-4" aria-hidden="true" /> {t.newAddress}
                    </button>
                  </div>

                  {(isNewAddressSelected || isLegacyAddressSelected) && (
                    <div className="space-y-3 border-t pt-3">
                      {isNewAddressSelected && (
                        <>
                          <p className="text-sm text-muted-foreground">{t.newAddressInstruction}</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <Label htmlFor="new-address-title">{t.addressTitle}</Label>
                              <Input id="new-address-title" value={newAddressTitle} onChange={event => setNewAddressTitle(event.target.value)}
                                placeholder={t.addressTitlePlaceholder} />
                            </div>
                            <div>
                              <Label htmlFor="new-address-phone">{t.deliveryPhone}</Label>
                              <Input id="new-address-phone" value={newAddressPhone} onChange={event => setNewAddressPhone(event.target.value)}
                                placeholder={t.phonePlaceholder} />
                            </div>
                          </div>
                          <Textarea value={secondAddress} onChange={event => setSecondAddress(event.target.value)}
                            rows={2} placeholder={t.addressPlaceholder} className={isRTL ? 'text-right' : 'text-left'} />
                          <div>
                            <Label htmlFor="new-address-country">Country</Label>
                            <Input id="new-address-country" value={newAddressCountry} onChange={event => setNewAddressCountry(event.target.value)}
                              placeholder={form.getValues('country') || 'Country'} />
                          </div>
                        </>
                      )}
                      {isLegacyAddressSelected && (
                        <>
                          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                            {t.destinationRequired}: {legacySecondaryAddress}
                          </div>
                          <div>
                            <Label htmlFor="legacy-address-country">Country</Label>
                            <Select value={legacyAddressCountry} onValueChange={setLegacyAddressCountry}>
                              <SelectTrigger id="legacy-address-country">
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                              <SelectContent>
                                {geographyCountries.map((country: any) => {
                                  const countryName = canonicalGeographyName(country);
                                  const countryValue = countryName || country.code || country.countryCode;
                                  return countryValue ? (
                                    <SelectItem key={country.id || country.code || countryValue} value={countryValue}>
                                      {geographyName(country) || countryValue}
                                    </SelectItem>
                                  ) : null;
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <Label>{t.province}</Label>
                          <Select onValueChange={value => {
                            const selectedProvince = (provinces as any)?.data?.find((province: any) =>
                              canonicalGeographyName(province) === value || geographyName(province) === value
                            );
                            const provinceName = selectedProvince ? canonicalGeographyName(selectedProvince) : value;
                            setSecondProvince(provinceName);
                            setSelectedSecondaryProvinceId(selectedProvince?.id || null);
                            setSecondCity('');
                          }} value={secondProvince} disabled={isLoadingProvinces}>
                            <SelectTrigger><SelectValue placeholder={isLoadingProvinces ? t.loading : t.selectProvince} /></SelectTrigger>
                            <SelectContent>
                              {(provinces as any)?.data?.map((province: any) => (
                                <SelectItem key={province.id} value={canonicalGeographyName(province)}>
                                  {geographyName(province)} / {canonicalGeographyName(province)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>{t.city}</Label>
                          <Select onValueChange={value => {
                            const selectedCity = secondaryCities.find((city: any) =>
                              canonicalGeographyName(city) === value || geographyName(city) === value
                            );
                            setSecondCity(selectedCity ? canonicalGeographyName(selectedCity) : value);
                          }} value={secondCity} disabled={!selectedSecondaryProvinceId || isLoadingSecondaryCities}>
                            <SelectTrigger><SelectValue placeholder={!selectedSecondaryProvinceId ? t.selectProvinceFirst : isLoadingSecondaryCities ? t.loading : t.selectCity} /></SelectTrigger>
                            <SelectContent>
                              {secondaryCities.map((city: any) => (
                                <SelectItem key={city.id} value={canonicalGeographyName(city)}>
                                  {geographyName(city)} / {canonicalGeographyName(city)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="delivery-postal-code">{t.postalCode}</Label>
                          <Input id="delivery-postal-code" value={secondPostalCode} onChange={event => setSecondPostalCode(event.target.value)}
                            placeholder={t.postalCodePlaceholder} />
                        </div>
                      </div>
                    </div>
                  )}
                </section>

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

                {customerData?.success && <div ref={setPaymentSectionTarget} />}

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
                    disabled={
                      unavailableCartProductIds.length > 0 ||
                      hasContractCartError ||
                      (selectedContractId !== null && !supportedNonWalletPaymentMethod) ||
                      submitOrderMutation.isPending ||
                      !paymentMethod ||
                      (() => {
                        const selectedRate = shippingRatesData?.find((rate: any) => rate.id === selectedShippingMethod);
                        const method = selectedRate?.deliveryMethod || selectedRate?.delivery_method;
                        return method === 'smart_vehicle' && (
                          smartDeliveryLoading ||
                          !!smartDeliveryError ||
                          !optimalVehicle ||
                          smartDeliveryPricedKey !== currentSmartDeliveryPricedKey
                        );
                      })()
                    }
                    className="flex-1 no-drag"
                  >
                    {submitOrderMutation.isPending ? t.loading : t.submitOrder}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
      <OrderReviewDialog
        open={reviewOpen}
        onOpenChange={(open) => { setReviewOpen(open); if (!open) setPendingReview(null); }}
        addresses={[
          { id: 'primary', label: language === 'fa' ? 'آدرس اصلی' : 'Primary address',
            address: primaryPricingAddress, city: primaryPricingCity, province: primaryPricingProvince,
            country: form.getValues('country') || crmCustomerData?.country || customerData?.customer?.country,
            postalCode: form.getValues('postalCode') || '', phone: form.getValues('phone') || '' },
          ...(legacySecondaryAddress
            ? [{ id: 'legacy', label: t.legacyAddress, address: legacySecondaryAddress, city: secondCity,
                province: secondProvince, postalCode: secondPostalCode,
                country: legacyAddressCountry,
                phone: crmCustomerData?.phone || customerData?.customer?.phone || '' }]
            : []),
          ...(isNewAddressSelected && secondAddress.trim()
            ? [{ id: 'new', label: newAddressTitle.trim() || t.newAddress, address: secondAddress.trim(),
                city: secondCity, province: secondProvince, postalCode: secondPostalCode,
                country: newAddressCountry, phone: newAddressPhone }]
            : []),
          ...savedCustomerAddresses.map(address => ({
            id: `saved:${address.id}`, label: address.title,
            address: address.address, city: address.city, province: address.state || '',
            country: address.country, postalCode: address.postalCode || '', phone: address.phone,
          })),
        ]}
        selectedAddressId={reviewAddressId}
        onSelectAddress={(id) => {
          const key = String(id);
          setReviewAddressId(key);
          selectDeliveryAddress(key);
        }}
        onConfirm={() => {
          confirmingOrderRef.current = true;
          void form.handleSubmit(onSubmit, () => { confirmingOrderRef.current = false; })();
        }}
        onRefresh={() => {
          confirmingOrderRef.current = false;
          void form.handleSubmit(onSubmit)();
        }}
        confirmDisabled={isConfirmingOrder || submitOrderMutation.isPending || !pendingReview}
        confirming={isConfirmingOrder || submitOrderMutation.isPending}
        needsRefresh={!pendingReview || smartDeliveryLoading || standardShippingLoading}
        refreshPending={smartDeliveryLoading || standardShippingLoading}
        items={Object.entries(cart).map(([id, quantity]) => {
          const product = products.find(item => item.id === Number(id));
          return { id, name: product?.name || id, quantity, unitPrice: product ? getCartUnitPrice(product, quantity) : 0 };
        })}
        shippingMethod={selectedShippingRate?.name || selectedShippingRate?.description || selectedShippingRate?.deliveryMethod || ''}
        shippingCost={finalShippingCost}
        subtotal={subtotalAmount}
        tax={totalTaxAmount}
        total={totalAmount}
        paymentMethod={paymentMethod}
        language={language as 'en' | 'fa' | 'ar' | 'tr'}
      />
    </div>
  );
}