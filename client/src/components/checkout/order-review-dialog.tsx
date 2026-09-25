import * as React from "react";
import { AlertCircle, Check, MapPin, Package, CreditCard, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type CheckoutLanguage = "en" | "fa" | "ar" | "tr";

export interface OrderReviewAddress {
  id: string | number;
  label: string;
  address: string;
  city: string;
  province?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
}

export interface OrderReviewItem {
  id: string | number;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAddress: (id: string | number) => void;
  onConfirm: () => void;
  onRefresh?: () => void;
  refreshPending?: boolean;
  confirmDisabled?: boolean;
  confirming?: boolean;
  needsRefresh?: boolean;
  addresses: OrderReviewAddress[];
  selectedAddressId?: string | number | null;
  items: OrderReviewItem[];
  shippingMethod: string;
  shippingCost: number;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  language: CheckoutLanguage;
}

const copy = {
  en: {
    title: "Review your order",
    description: "Check your delivery address and order details before placing the order.",
    items: "Items",
    address: "Delivery address",
    chooseAddress: "Choose an address",
    noAddresses: "No delivery addresses are available.",
    shipping: "Shipping",
    payment: "Payment",
    subtotal: "Subtotal",
    tax: "Tax",
    shippingCost: "Shipping cost",
    total: "Total",
    quantity: "Qty",
    each: "each",
    cancel: "Back",
    confirm: "Place order",
    confirming: "Placing order",
    refreshAction: "Update review",
    refreshTitle: "Shipping quote needs refreshing",
    refreshDescription: "The delivery address changed. Wait for shipping to update, then review the new total.",
    selected: "Selected",
    free: "Free",
    notSelected: "Select an address to continue",
  },
  fa: {
    title: "مرور سفارش",
    description: "پیش از ثبت سفارش، آدرس تحویل و جزئیات سفارش را بررسی کنید.",
    items: "اقلام",
    address: "آدرس تحویل",
    chooseAddress: "یک آدرس انتخاب کنید",
    noAddresses: "آدرس تحویلی موجود نیست.",
    shipping: "ارسال",
    payment: "پرداخت",
    subtotal: "جمع جزء",
    tax: "مالیات",
    shippingCost: "هزینه ارسال",
    total: "مبلغ کل",
    quantity: "تعداد",
    each: "هر واحد",
    cancel: "بازگشت",
    confirm: "ثبت سفارش",
    confirming: "در حال ثبت سفارش",
    refreshAction: "به‌روزرسانی خلاصه",
    refreshTitle: "نیاز به تازه‌سازی قیمت ارسال",
    refreshDescription: "آدرس تحویل تغییر کرده است. پس از محاسبه دوباره هزینه ارسال، خلاصه جدید را بررسی کنید.",
    selected: "انتخاب‌شده",
    free: "رایگان",
    notSelected: "برای ادامه یک آدرس انتخاب کنید",
  },
  ar: {
    title: "مراجعة الطلب",
    description: "تحقق من عنوان التسليم وتفاصيل الطلب قبل إتمامه.",
    items: "المنتجات",
    address: "عنوان التسليم",
    chooseAddress: "اختر عنواناً",
    noAddresses: "لا توجد عناوين تسليم متاحة.",
    shipping: "الشحن",
    payment: "الدفع",
    subtotal: "المجموع الفرعي",
    tax: "الضريبة",
    shippingCost: "تكلفة الشحن",
    total: "الإجمالي",
    quantity: "الكمية",
    each: "للوحدة",
    cancel: "رجوع",
    confirm: "تأكيد الطلب",
    confirming: "جارٍ تأكيد الطلب",
    refreshAction: "تحديث المراجعة",
    refreshTitle: "يجب تحديث عرض الشحن",
    refreshDescription: "تغيّر عنوان التسليم. انتظر تحديث تكلفة الشحن ثم راجع المجموع الجديد.",
    selected: "محدد",
    free: "مجاناً",
    notSelected: "اختر عنواناً للمتابعة",
  },
  tr: {
    title: "Siparişi incele",
    description: "Siparişi vermeden önce teslimat adresinizi ve ayrıntıları kontrol edin.",
    items: "Ürünler",
    address: "Teslimat adresi",
    chooseAddress: "Bir adres seçin",
    noAddresses: "Kullanılabilir teslimat adresi yok.",
    shipping: "Kargo",
    payment: "Ödeme",
    subtotal: "Ara toplam",
    tax: "Vergi",
    shippingCost: "Kargo ücreti",
    total: "Toplam",
    quantity: "Adet",
    each: "birim",
    cancel: "Geri",
    confirm: "Siparişi ver",
    confirming: "Sipariş veriliyor",
    refreshAction: "Özeti güncelle",
    refreshTitle: "Kargo teklifi yenilenmeli",
    refreshDescription: "Teslimat adresi değişti. Kargo fiyatı yenilendikten sonra yeni toplamı inceleyin.",
    selected: "Seçili",
    free: "Ücretsiz",
    notSelected: "Devam etmek için bir adres seçin",
  },
} as const;

const rtlLanguages = new Set<CheckoutLanguage>(["fa", "ar"]);

function formatAmount(value: number, language: CheckoutLanguage) {
  return new Intl.NumberFormat(language === "en" ? "en-US" : language, {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function Amount({ value, language }: { value: number; language: CheckoutLanguage }) {
  return <span className="tabular-nums">{formatAmount(value, language)} IQD</span>;
}

export default function OrderReviewDialog({
  open,
  onOpenChange,
  onSelectAddress,
  onConfirm,
  onRefresh,
  refreshPending = false,
  confirmDisabled = false,
  confirming = false,
  needsRefresh = false,
  addresses,
  selectedAddressId,
  items,
  shippingMethod,
  shippingCost,
  subtotal,
  tax,
  total,
  paymentMethod,
  language,
}: OrderReviewDialogProps) {
  const t = copy[language];
  const direction = rtlLanguages.has(language) ? "rtl" : "ltr";
  const hasSelectedAddress = addresses.some((address) => String(address.id) === String(selectedAddressId));
  const disabled = confirmDisabled || confirming || needsRefresh || !hasSelectedAddress;
  const paymentLabels: Record<string, string> = {
    fib_online: language === 'fa' ? 'پرداخت آنلاین' : 'Online payment',
    online_payment: language === 'fa' ? 'پرداخت آنلاین' : 'Online payment',
    wallet: language === 'fa' ? 'کیف پول' : 'Wallet',
    wallet_full: language === 'fa' ? 'کیف پول' : 'Wallet',
    wallet_partial: language === 'fa' ? 'کیف پول و بانک' : 'Wallet and bank',
    wallet_combined: language === 'fa' ? 'کیف پول و بانک' : 'Wallet and bank',
    bank_receipt: language === 'fa' ? 'رسید بانکی' : 'Bank receipt',
    bank_transfer_grace: language === 'fa' ? 'انتقال بانکی با مهلت پرداخت' : 'Bank transfer',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={direction}
        className="max-h-[min(92dvh,820px)] max-w-2xl overflow-hidden border-border/80 bg-background p-0 shadow-xl"
        aria-describedby="order-review-description"
      >
        <div className="flex max-h-[min(92dvh,820px)] flex-col">
          <DialogHeader className="border-b border-border/70 px-5 py-5 text-start sm:px-7">
            <DialogTitle className="flex items-center gap-2.5 text-xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Package className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              {t.title}
            </DialogTitle>
            <DialogDescription id="order-review-description" className="max-w-xl text-start">
              {t.description}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-7">
            {needsRefresh && (
              <div
                role="alert"
                className="flex gap-3 rounded-lg border border-amber-300/80 bg-amber-50 p-3.5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-medium">{t.refreshTitle}</p>
                  <p className="text-sm leading-5 opacity-85">{t.refreshDescription}</p>
                </div>
              </div>
            )}

            <section aria-labelledby="review-items-heading">
              <h2 id="review-items-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Package className="h-4 w-4" aria-hidden="true" />
                {t.items}
              </h2>
              <div className="divide-y rounded-lg border border-border/70">
                {items.length > 0 ? items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t.quantity}: {item.quantity} · <Amount value={item.unitPrice} language={language} /> {t.each}
                      </p>
                    </div>
                    <p className="shrink-0 font-medium">
                      <Amount value={item.unitPrice * item.quantity} language={language} />
                    </p>
                  </div>
                )) : (
                  <p className="px-4 py-5 text-sm text-muted-foreground">{t.noAddresses}</p>
                )}
              </div>
            </section>

            <section aria-labelledby="review-address-heading">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="review-address-heading" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {t.address}
                </h2>
                {!hasSelectedAddress && addresses.length > 0 && (
                  <span className="text-xs font-medium text-destructive">{t.notSelected}</span>
                )}
              </div>
              {addresses.length > 0 ? (
                <div role="radiogroup" aria-label={t.chooseAddress} className="grid gap-2.5">
                  {addresses.map((address) => {
                    const isSelected = String(address.id) === String(selectedAddressId);
                    const addressId = `order-review-address-${String(address.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
                    return (
                      <label
                        key={address.id}
                        htmlFor={addressId}
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-lg border p-3.5 transition-colors",
                          "hover:border-primary/60 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                          isSelected ? "border-primary bg-primary/5" : "border-border/70 bg-card"
                        )}
                      >
                        <input
                          id={addressId}
                          type="radio"
                          name="order-review-address"
                          value={String(address.id)}
                          checked={isSelected}
                          onChange={() => onSelectAddress(address.id)}
                          className="mt-1 h-4 w-4 accent-primary"
                          aria-label={address.label}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2 font-medium">
                            {address.label}
                            {isSelected && <span className="text-xs font-normal text-primary">{t.selected}</span>}
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            {[address.address, address.city, address.province, address.postalCode, address.country].filter(Boolean).join(", ")}
                          </span>
                          {address.phone && <span className="mt-1 block text-xs text-muted-foreground">{address.phone}</span>}
                        </span>
                        {isSelected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">{t.noAddresses}</p>
              )}
            </section>

            <section aria-label={`${t.shipping} and ${t.payment}`} className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Truck className="h-4 w-4" aria-hidden="true" /> {t.shipping}
                </p>
                <p className="font-medium">{shippingMethod || "—"}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <CreditCard className="h-4 w-4" aria-hidden="true" /> {t.payment}
                </p>
                <p className="font-medium">{paymentLabels[paymentMethod] || paymentMethod || "—"}</p>
              </div>
            </section>

            <section aria-label={t.total} className="space-y-2 border-t border-border/70 pt-4 text-sm">
              <div className="flex justify-between gap-4"><span>{t.subtotal}</span><span><Amount value={subtotal} language={language} /></span></div>
              <div className="flex justify-between gap-4"><span>{t.shippingCost}</span><span>{needsRefresh ? "—" : shippingCost === 0 ? t.free : <Amount value={shippingCost} language={language} />}</span></div>
              <div className="flex justify-between gap-4"><span>{t.tax}</span><span><Amount value={tax} language={language} /></span></div>
              <div className="flex justify-between gap-4 border-t border-border/70 pt-3 text-base font-semibold">
                <span>{t.total}</span><span>{needsRefresh ? "—" : <Amount value={total} language={language} />}</span>
              </div>
            </section>
          </div>

          <DialogFooter className="border-t border-border/70 bg-muted/15 px-5 py-4 sm:px-7">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
              {t.cancel}
            </Button>
            <Button type="button" onClick={needsRefresh ? onRefresh : onConfirm}
              disabled={needsRefresh ? (!onRefresh || confirming || refreshPending) : disabled} aria-busy={confirming}>
              {needsRefresh ? t.refreshAction : confirming ? t.confirming : t.confirm}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}