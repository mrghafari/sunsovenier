import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Wallet, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PaymentMethodBadgeProps {
  paymentMethod?: string | null;
  className?: string;
  showIcon?: boolean;
}

const paymentMethodCopy = {
  en: {
    unknown: 'Unknown data',
    walletFull: 'Wallet (full)',
    walletPartial: 'Wallet (partial)',
    onlinePayment: 'Online payment',
    bankTransfer: 'Bank transfer',
    bankTransferGrace: 'Bank transfer (grace period)',
    hybrid: 'Combined (wallet + bank)',
    cash: 'Cash',
    credit: 'Credit',
  },
  fa: {
    unknown: 'داده نامعلوم',
    walletFull: 'کیف پول (کامل)',
    walletPartial: 'کیف پول (جزئی)',
    onlinePayment: 'پرداخت آنلاین',
    bankTransfer: 'انتقال بانکی',
    bankTransferGrace: 'انتقال بانکی (دوره مهلت)',
    hybrid: 'ترکیبی (کیف پول + بانک)',
    cash: 'نقدی',
    credit: 'اعتباری',
  },
  ar: {
    unknown: 'بيانات غير معروفة',
    walletFull: 'المحفظة (كامل)',
    walletPartial: 'المحفظة (جزئي)',
    onlinePayment: 'الدفع الإلكتروني',
    bankTransfer: 'تحويل مصرفي',
    bankTransferGrace: 'تحويل مصرفي (فترة سماح)',
    hybrid: 'مدمج (المحفظة + المصرف)',
    cash: 'نقداً',
    credit: 'ائتمان',
  },
  tr: {
    unknown: 'Bilinmeyen veri',
    walletFull: 'Cüzdan (tam)',
    walletPartial: 'Cüzdan (kısmi)',
    onlinePayment: 'Çevrimiçi ödeme',
    bankTransfer: 'Banka havalesi',
    bankTransferGrace: 'Banka havalesi (ek süre)',
    hybrid: 'Birleşik (cüzdan + banka)',
    cash: 'Nakit',
    credit: 'Kredi',
  },
} as const;

const PaymentMethodBadge: React.FC<PaymentMethodBadgeProps> = ({ 
  paymentMethod, 
  className = "",
  showIcon = true 
}) => {
  const { language } = useLanguage();
  const copy = paymentMethodCopy[language];

  const getPaymentMethodInfo = (method?: string | null) => {
    // 🚨 CRITICAL: Never use fallback - always show actual payment method from database
    if (!method || method === null || method === undefined) {
      console.warn('⚠️ [PAYMENT METHOD] Missing payment method data - this should not happen!', { method });
      return {
        label: copy.unknown,
        variant: 'destructive' as const,
        icon: AlertTriangle,
        className: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-300'
      };
    }

    switch (method.trim().toLowerCase()) {
      case 'wallet_full':
      case 'کیف پول (کامل)':
        return {
          label: copy.walletFull,
          variant: 'default' as const,
          icon: Wallet,
          className: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300'
        };
      
      case 'wallet_partial':
      case 'کیف پول (جزئی)':
        return {
          label: copy.walletPartial,
          variant: 'outline' as const,
          icon: Wallet,
          className: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-300'
        };
      
      case 'online_payment':
      case 'fib_online':
      case 'bank_gateway':
      case 'پرداخت آنلاین':
        return {
          label: copy.onlinePayment,
          variant: 'default' as const,
          icon: CreditCard,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300'
        };
      
      case 'bank_transfer':
      case 'انتقال بانکی':
        return {
          label: copy.bankTransfer,
          variant: 'outline' as const,
          icon: DollarSign,
          className: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-300'
        };
      
      case 'bank_transfer_grace':
      case 'انتقال بانکی (دوره مهلت)':
        return {
          label: copy.bankTransferGrace,
          variant: 'secondary' as const,
          icon: Clock,
          className: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-300'
        };
      
      case 'hybrid':
      case 'ترکیبی (کیف پول + بانک)':
        return {
          label: copy.hybrid,
          variant: 'outline' as const,
          icon: DollarSign,
          className: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-300'
        };
      
      case 'cash':
      case 'نقدی':
        return {
          label: copy.cash,
          variant: 'secondary' as const,
          icon: DollarSign,
          className: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
        };
      
      case 'credit':
      case 'اعتباری':
        return {
          label: copy.credit,
          variant: 'outline' as const,
          icon: CreditCard,
          className: 'bg-red-50 text-red-700 hover:bg-red-100 border-red-300'
        };
      
      default:
        return {
          label: method,
          variant: 'secondary' as const,
          icon: AlertTriangle,
          className: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        };
    }
  };

  const paymentInfo = getPaymentMethodInfo(paymentMethod);
  const IconComponent = paymentInfo.icon;

  return (
    <Badge 
      variant={paymentInfo.variant}
      className={`${paymentInfo.className} ${className} flex items-center gap-1 text-xs font-medium`}
    >
      {showIcon && <IconComponent className="w-3 h-3" />}
      {paymentInfo.label}
    </Badge>
  );
};

export default PaymentMethodBadge;