import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { IncotermCode } from '@shared/incoterms';
import { contractTheme } from '@/lib/contract-theme';

export type ShopContract = {
  packaging?: import("@shared/contract-packaging").ContractPackaging | null;
  id: number;
  number: string;
  deliveryTerm?: IncotermCode | null;
  shippingMode?: "automatic_vehicle" | "self_transport" | null;
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
    netWeight?: string | number | null;
    weightUnit?: string;
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
    contract: 'Contract purchase',
    remainingQuantity: 'Total remaining quantity',
  },
  fa: {
    title: 'نوع خرید',
    description: 'خرید عادی یا یکی از قراردادهای فعال را انتخاب کنید.',
    normal: 'خرید عادی',
    normalDescription: 'خرید با قیمت‌های معمول و بدون محدودیت قرارداد.',
    contract: 'خرید قراردادی',
    remainingQuantity: 'مجموع مقدار باقی‌مانده',
  },
  ar: {
    title: 'نوع الشراء',
    description: 'اختر شراءً عادياً أو عقداً سارياً.',
    normal: 'شراء عادي',
    normalDescription: 'شراء بالأسعار المعتادة دون قيود العقد.',
    contract: 'شراء بموجب عقد',
    remainingQuantity: 'إجمالي الكمية المتبقية',
  },
  tr: {
    title: 'Satın alma türü',
    description: 'Normal satın almayı veya etkin bir sözleşmeyi seçin.',
    normal: 'Normal satın alma',
    normalDescription: 'Sözleşme sınırı olmadan standart fiyatlarla satın alın.',
    contract: 'Sözleşmeli satın alma',
    remainingQuantity: 'Toplam kalan miktar',
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
  const activeContracts = useMemo(
    () => contracts.filter((contract) => contract.isActive),
    [contracts],
  );
  const hasSelectedActiveContract = activeContracts.some(
    (contract) => Number(contract.id) === Number(selectedContractId),
  );
  const [saleType, setSaleType] = useState<'normal' | 'contract'>(
    selectedContractId !== null && hasSelectedActiveContract ? 'contract' : 'normal',
  );
  const numberLocale = lang === 'fa' || lang === 'ar' ? lang : lang === 'tr' ? 'tr-TR' : 'en-US';
  const formatNumber = (value: number) =>
    new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 2 }).format(value);

  useEffect(() => {
    setSaleType(selectedContractId !== null && hasSelectedActiveContract ? 'contract' : 'normal');
  }, [selectedContractId, hasSelectedActiveContract]);

  const totalRemainingQuantity = (contract: ShopContract) =>
    contract.items.reduce((total, item) => {
      const remaining = Number(item.remainingQuantity);
      return total + (Number.isFinite(remaining) && remaining > 0 ? remaining : 0);
    }, 0);

  return (
    <Card dir={isRtl ? 'rtl' : 'ltr'} className={contractTheme.panel}>
      <CardHeader>
        <CardTitle>{text.title}</CardTitle>
        <CardDescription>{text.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          aria-label={text.title}
          value={saleType}
          onValueChange={(value) => {
            if (value === 'normal') {
              setSaleType('normal');
              onSelect(null);
            } else if (activeContracts.length > 0) {
              // Selecting the sale type alone must not choose a contract.
              setSaleType('contract');
            }
          }}
          disabled={disabled}
          className="space-y-3"
        >
          <label
            htmlFor="contract-option-normal"
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
              saleType === 'normal' ? 'border-primary bg-primary/5' : ''
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <RadioGroupItem id="contract-option-normal" value="normal" className="mt-1" />
            <span className="min-w-0">
              <span className="block font-medium">{text.normal}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{text.normalDescription}</span>
            </span>
          </label>

          {activeContracts.length > 0 && (
            <label
              htmlFor="contract-option-contract"
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
              saleType === 'contract' ? contractTheme.selected : ''
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <RadioGroupItem id="contract-option-contract" value="contract" className="mt-1" />
              <span className="font-medium">{text.contract}</span>
            </label>
          )}
        </RadioGroup>

        {saleType === 'contract' && activeContracts.length > 0 && (
          <RadioGroup
            aria-label={text.contract}
            value={selectedContractId === null ? undefined : String(selectedContractId)}
            onValueChange={(value) => onSelect(Number(value))}
            disabled={disabled}
            className="mt-3 space-y-2 border-s-2 border-teal-800/30 ps-4 dark:border-teal-200/30"
          >
            {activeContracts.map((contract) => {
              const value = String(contract.id);
              const selected = value === String(selectedContractId);
              return (
                <label
                  key={contract.id}
                  htmlFor={`contract-option-${contract.id}`}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                    selected ? contractTheme.selected : ''
                  } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <RadioGroupItem
                    id={`contract-option-${contract.id}`}
                    value={value}
                    aria-label={`${text.contract}: ${contract.number}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{contract.number}</span>
                    <span className="block text-sm text-muted-foreground">
                      {text.remainingQuantity}: {formatNumber(totalRemainingQuantity(contract))}
                    </span>
                  </span>
                </label>
              );
            })}
          </RadioGroup>
        )}
      </CardContent>
    </Card>
  );
}

export default ContractSelector;