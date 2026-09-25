import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { IncotermCode } from '@shared/incoterms';

export type ShopContract = {
  id: number;
  number: string;
  deliveryTerm?: IncotermCode | null;
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
    deliveryTerm: 'Delivery term',
    selection: 'Select',
    contractNumber: 'Contract',
    product: 'Product',
    unitPrice: 'Agreed unit price',
    quantity: 'Remaining / maximum',
    noContracts: 'No active contracts are available.',
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
    deliveryTerm: 'شرط تحویل',
    selection: 'انتخاب',
    contractNumber: 'قرارداد',
    product: 'محصول',
    unitPrice: 'قیمت واحد توافقی',
    quantity: 'باقی‌مانده / حداکثر',
    noContracts: 'هیچ قرارداد فعالی در دسترس نیست.',
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
    deliveryTerm: 'شرط التسليم',
    selection: 'اختيار',
    contractNumber: 'العقد',
    product: 'المنتج',
    unitPrice: 'سعر الوحدة المتفق عليه',
    quantity: 'المتبقي / الحد الأقصى',
    noContracts: 'لا توجد عقود سارية متاحة.',
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
    deliveryTerm: 'Teslim şekli',
    selection: 'Seç',
    contractNumber: 'Sözleşme',
    product: 'Ürün',
    unitPrice: 'Anlaşılan birim fiyat',
    quantity: 'Kalan / maksimum',
    noContracts: 'Etkin sözleşme bulunmuyor.',
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

          <div className="overflow-hidden rounded-lg border">
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow className="bg-muted/35 hover:bg-muted/35">
                    <TableHead className="w-16 text-center">{text.selection}</TableHead>
                    <TableHead>{text.contractNumber}</TableHead>
                    <TableHead>{text.customer}</TableHead>
                    <TableHead>{text.deliveryTerm}</TableHead>
                    <TableHead>{text.terms}</TableHead>
                    <TableHead>{text.products}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeContracts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        {text.noContracts}
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeContracts.map((contract) => {
                      const value = String(contract.id);
                      const selected = selectedValue === value;

                      return (
                        <TableRow
                          key={contract.id}
                          data-state={selected ? 'selected' : undefined}
                          className={`cursor-pointer align-top ${selected ? 'bg-primary/5' : ''} ${
                            disabled ? 'cursor-not-allowed opacity-60' : ''
                          }`}
                          onClick={() => {
                            if (!disabled) onSelect(contract.id);
                          }}
                        >
                          <TableCell className="text-center">
                            <RadioGroupItem
                              id={`contract-option-${contract.id}`}
                              value={value}
                              aria-label={`${text.contract} ${contract.number}`}
                              disabled={disabled}
                            />
                          </TableCell>
                          <TableCell>
                            <label
                              htmlFor={`contract-option-${contract.id}`}
                              className="cursor-pointer font-semibold whitespace-nowrap"
                            >
                              {contract.number}
                            </label>
                            <Badge variant="secondary" className="mt-2 block w-fit text-[11px]">
                              {text.active}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[190px] whitespace-normal">
                            {contract.customerName}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium">
                            {contract.deliveryTerm || '—'}
                          </TableCell>
                          <TableCell className="max-w-[230px] whitespace-pre-wrap text-muted-foreground">
                            {contract.terms || '—'}
                          </TableCell>
                          <TableCell className="max-w-[230px] whitespace-normal text-muted-foreground">
                            {contract.items.length} {text.products.toLowerCase()}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {selectedContractId !== null && (() => {
            const selectedContract = activeContracts.find((contract) => contract.id === selectedContractId);
            if (!selectedContract) return null;

            return (
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{text.products}</p>
                  <p className="text-xs text-muted-foreground">{text.onlyListed}</p>
                </div>
                <div className="overflow-x-auto rounded-md border bg-background">
                  <Table className="min-w-[560px]">
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead>{text.product}</TableHead>
                        <TableHead>{text.unitPrice}</TableHead>
                        <TableHead>{text.quantity}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedContract.items.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatPrice(item.unitPrice)}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatNumber(item.remainingQuantity)} {text.of} {formatNumber(item.maxQuantity)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })()}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

export default ContractSelector;