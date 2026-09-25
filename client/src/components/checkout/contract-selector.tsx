import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';

export type ShopContract = {
  id: number;
  number: string;
  terms: string;
  isActive: boolean;
  customerId: number;
  customerName: string;
  items: {
    productId: number;
    productName: string;
    maxQuantity: number;
    usedQuantity: number;
    remainingQuantity: number;
    unitPrice: number;
  }[];
};

export interface ContractSelectorProps {
  contracts: ShopContract[];
  selectedContractId: number | null;
  onSelect: (id: number | null) => void;
  language?: string;
  disabled?: boolean;
}

const copy = {
  en: {
    title: 'Purchase type',
    description: 'Choose a normal purchase or an active contract.',
    normal: 'Normal purchase',
    normalDescription: 'Purchase at standard prices without contract limits.',
    contract: 'Contract',
    active: 'Active',
    customer: 'Customer',
    terms: 'Terms',
    products: 'Contract products and limits',
    fixedPrice: 'Fixed price',
    remaining: 'Remaining',
    of: 'of',
    onlyListed: 'Only the products listed in this contract can be ordered using contract pricing.',
    iqd: 'IQD',
  },
  fa: {
    title: 'نوع خرید',
    description: 'خرید عادی یا یکی از قراردادهای فعال را انتخاب کنید.',
    normal: 'خرید عادی',
    normalDescription: 'خرید با قیمت‌های معمول و بدون محدودیت قرارداد.',
    contract: 'قرارداد',
    active: 'فعال',
    customer: 'مشتری',
    terms: 'شرایط',
    products: 'محصولات و محدودیت‌های قرارداد',
    fixedPrice: 'قیمت ثابت',
    remaining: 'باقی‌مانده',
    of: 'از',
    onlyListed: 'با قیمت قراردادی فقط می‌توان محصولات فهرست‌شده در همین قرارداد را سفارش داد.',
    iqd: 'د.ع',
  },
  ar: {
    title: 'نوع الشراء',
    description: 'اختر شراءً عادياً أو عقداً سارياً.',
    normal: 'شراء عادي',
    normalDescription: 'شراء بالأسعار المعتادة دون قيود العقد.',
    contract: 'عقد',
    active: 'ساري',
    customer: 'العميل',
    terms: 'الشروط',
    products: 'منتجات العقد وحدوده',
    fixedPrice: 'السعر الثابت',
    remaining: 'المتبقي',
    of: 'من',
    onlyListed: 'يمكن طلب المنتجات المدرجة في هذا العقد فقط باستخدام أسعار العقد.',
    iqd: 'د.ع',
  },
  tr: {
    title: 'Satın alma türü',
    description: 'Normal satın almayı veya etkin bir sözleşmeyi seçin.',
    normal: 'Normal satın alma',
    normalDescription: 'Sözleşme sınırı olmadan standart fiyatlarla satın alın.',
    contract: 'Sözleşme',
    active: 'Etkin',
    customer: 'Müşteri',
    terms: 'Koşullar',
    products: 'Sözleşme ürünleri ve limitleri',
    fixedPrice: 'Sabit fiyat',
    remaining: 'Kalan',
    of: '/',
    onlyListed: 'Sözleşme fiyatıyla yalnızca bu sözleşmede listelenen ürünler sipariş edilebilir.',
    iqd: 'IQD',
  },
};

export function ContractSelector({
  contracts,
  selectedContractId,
  onSelect,
  language = 'en',
  disabled = false,
}: ContractSelectorProps) {
  const lang = language.toLowerCase().split('-')[0] as keyof typeof copy;
  const text = copy[lang] || copy.en;
  const isRtl = lang === 'fa' || lang === 'ar';
  const activeContracts = contracts.filter((contract) => contract.isActive);
  const selectedValue = selectedContractId === null ? 'normal' : String(selectedContractId);
  const numberLocale = lang === 'fa' || lang === 'ar' ? lang : lang === 'tr' ? 'tr-TR' : 'en-US';
  const formatNumber = (value: number) => new Intl.NumberFormat(numberLocale).format(value);
  const formatPrice = (value: number) =>
    `${new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 2 }).format(value)} ${text.iqd}`;

  return (
    <Card dir={isRtl ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle>{text.title}</CardTitle>
        <CardDescription>{text.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          aria-label={text.title}
          value={selectedValue}
          onValueChange={(value) => onSelect(value === 'normal' ? null : Number(value))}
          disabled={disabled}
          className="space-y-3"
        >
          <label
            htmlFor="contract-option-normal"
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
              selectedValue === 'normal' ? 'border-primary bg-primary/5' : ''
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <RadioGroupItem id="contract-option-normal" value="normal" className="mt-1" />
            <span className="min-w-0">
              <span className="block font-medium">{text.normal}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{text.normalDescription}</span>
            </span>
          </label>

          {activeContracts.map((contract) => {
            const value = String(contract.id);
            const selected = selectedValue === value;

            return (
              <label
                key={contract.id}
                htmlFor={`contract-option-${contract.id}`}
                className={`block cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                  selected ? 'border-primary bg-primary/5' : ''
                } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem id={`contract-option-${contract.id}`} value={value} className="mt-1" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{text.contract} #{contract.number}</span>
                      <Badge variant="secondary">{text.active}</Badge>
                    </span>
                    <span className="mt-2 block text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{text.customer}: </span>
                      {contract.customerName}
                    </span>
                    <span className="mt-1 block whitespace-pre-wrap text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{text.terms}: </span>
                      {contract.terms}
                    </span>
                  </span>
                </div>

                <div className="mt-4 border-t pt-3">
                  <p className="mb-2 text-sm font-medium">{text.products}</p>
                  <ul className="space-y-2">
                    {contract.items.map((item) => (
                      <li
                        key={item.productId}
                        className="flex flex-col gap-1 rounded-md bg-muted/40 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="font-medium">{item.productName}</span>
                        <span className="flex flex-wrap gap-x-3 text-muted-foreground">
                          <span>{text.fixedPrice}: {formatPrice(item.unitPrice)}</span>
                          <span>
                            {text.remaining}: {formatNumber(item.remainingQuantity)} {text.of}{' '}
                            {formatNumber(item.maxQuantity)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">{text.onlyListed}</p>
                </div>
              </label>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

export default ContractSelector;