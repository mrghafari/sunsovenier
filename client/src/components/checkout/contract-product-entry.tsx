import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ShopContract } from "@/components/checkout/contract-selector";
import { contractAllowsProduct } from "@/components/checkout/cart-mode";

const copy = {
  en: {
    badge: "Only through contract", checkout: "Choose contract & add", action: "Add with contract",
    description: "Choose an eligible contract before adding this product.",
    emptyNormal: "Your ordinary cart is not empty. Empty it before starting a contract purchase.",
    signIn: "Sign in to your customer account to use a contract.", signInButton: "Sign in",
    noContracts: "No active contract has remaining quantity for this product.",
    loadError: "Contracts could not be loaded. Retry before continuing.",
    retry: "Retry", choose: "Select contract", remaining: "Remaining",
    sameContract: "This cart can only continue with its current contract. Empty it before choosing another.",
  },
  fa: {
    badge: "فقط از طریق قرارداد", checkout: "انتخاب قرارداد و افزودن", action: "افزودن با قرارداد",
    description: "قرارداد واجد شرایط را پیش از افزودن کالا انتخاب کنید.",
    emptyNormal: "سبد خرید عادی خالی نیست؛ برای آغاز خرید قراردادی ابتدا سبد را خالی کنید.",
    signIn: "برای خرید قراردادی وارد حساب مشتری شوید.", signInButton: "ورود",
    noContracts: "قرارداد فعالی با سهمیهٔ باقی‌مانده برای این کالا پیدا نشد.",
    loadError: "قراردادها بارگذاری نشدند؛ دوباره تلاش کنید.",
    retry: "تلاش دوباره", choose: "انتخاب قرارداد", remaining: "باقیمانده",
    sameContract: "سبد فعلی فقط با همین قرارداد ادامه می‌یابد. برای قرارداد دیگر ابتدا سبد را خالی کنید.",
  },
  ar: {
    badge: "متاح عبر العقد فقط", checkout: "اختر العقد وأضف المنتج", action: "إضافة بموجب عقد",
    description: "اختر العقد المؤهل قبل إضافة المنتج.",
    emptyNormal: "سلة الشراء العادية غير فارغة؛ أفرغها أولاً لبدء الشراء بموجب عقد.",
    signIn: "سجّل الدخول إلى حساب العميل للشراء بموجب عقد.", signInButton: "تسجيل الدخول",
    noContracts: "لا يوجد عقد نشط بكمية متبقية لهذا المنتج.",
    loadError: "تعذر تحميل العقود؛ حاول مرة أخرى.",
    retry: "إعادة المحاولة", choose: "اختر العقد", remaining: "المتبقي",
    sameContract: "تستمر السلة الحالية بهذا العقد فقط. أفرغها أولاً لاختيار عقد آخر.",
  },
  tr: {
    badge: "Yalnızca sözleşmeyle", checkout: "Sözleşme seç ve ekle", action: "Sözleşmeyle ekle",
    description: "Ürünü eklemeden önce uygun sözleşmeyi seçin.",
    emptyNormal: "Normal sepet boş değil; sözleşmeli alışverişe başlamak için önce boşaltın.",
    signIn: "Sözleşmeli alışveriş için müşteri hesabınızda oturum açın.", signInButton: "Giriş yap",
    noContracts: "Bu ürün için kalan miktarı olan etkin sözleşme bulunamadı.",
    loadError: "Sözleşmeler yüklenemedi; tekrar deneyin.",
    retry: "Tekrar dene", choose: "Sözleşme seçin", remaining: "Kalan",
    sameContract: "Mevcut sepet yalnızca bu sözleşmeyle devam eder. Başka bir sözleşme için önce boşaltın.",
  },
} as const;

export function contractProductCopy(language: string) {
  const key = language.toLowerCase().split("-")[0] as keyof typeof copy;
  return copy[key] || copy.en;
}

interface ContractProductEntryProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productName?: string;
  productId: number | null;
  contracts: ShopContract[];
  customerId: number | null;
  cartItemCount: number;
  currentContractId: number | null;
  selectedContractId: string;
  onSelectContract: (id: string) => void;
  onAdd: () => void;
  isAdding: boolean;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onLogin: () => void;
  language: string;
  direction: string;
}

export default function ContractProductEntry({
  isOpen, onOpenChange, productName, productId, contracts, customerId, cartItemCount,
  currentContractId, selectedContractId, onSelectContract, onAdd, isAdding,
  isLoading, isError, onRetry, onLogin, language, direction,
}: ContractProductEntryProps) {
  const text = contractProductCopy(language);
  const eligibleContracts = contracts.filter(contract =>
    Number(contract.customerId) === customerId &&
    contractAllowsProduct(contract, Number(productId)) &&
    (!currentContractId || cartItemCount === 0 || Number(contract.id) === currentContractId)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir={direction}>
        <DialogHeader>
          <DialogTitle>{productName || text.checkout}</DialogTitle>
          <DialogDescription>{text.description}</DialogDescription>
        </DialogHeader>
        {cartItemCount > 0 && !currentContractId && (
          <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            {text.emptyNormal}
          </p>
        )}
        {!customerId ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{text.signIn}</p>
            <Button onClick={onLogin}>{text.signInButton}</Button>
          </div>
        ) : isLoading ? (
          <div role="status" className="space-y-2">
            <div className="h-10 animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded bg-muted" />
          </div>
        ) : isError ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">{text.loadError}</p>
            <Button variant="outline" onClick={onRetry}>{text.retry}</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {eligibleContracts.length === 0 ? (
              <p className="rounded-md border p-3 text-sm text-muted-foreground">{text.noContracts}</p>
            ) : (
              <Select value={selectedContractId} onValueChange={onSelectContract}>
                <SelectTrigger aria-label={text.choose}>
                  <SelectValue placeholder={text.choose} />
                </SelectTrigger>
                <SelectContent>
                  {eligibleContracts.map(contract => {
                    const item = contract.items.find(candidate => Number(candidate.productId) === Number(productId));
                    return (
                      <SelectItem key={contract.id} value={String(contract.id)}>
                        {contract.number} · {text.remaining}: {item?.remainingQuantity}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
            {currentContractId && cartItemCount > 0 && (
              <p className="text-xs text-muted-foreground">{text.sameContract}</p>
            )}
            <Button
              className="w-full"
              disabled={!selectedContractId || isAdding || eligibleContracts.length === 0 || (cartItemCount > 0 && !currentContractId)}
              onClick={onAdd}
            >
              {text.checkout}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
