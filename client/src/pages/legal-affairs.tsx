import { Scale } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import ShopContracts from "@/components/admin/shop-contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const LEGAL_AFFAIRS_MODULE_ID = "legal_affairs";

const translations = {
  en: {
    title: "Legal Affairs & Contracts",
    subtitle: "Manage legal affairs and customer sales contracts.",
  },
  ar: {
    title: "الشؤون القانونية والعقود",
    subtitle: "إدارة الشؤون القانونية وعقود مبيعات العملاء.",
  },
  tr: {
    title: "Hukuk İşleri ve Sözleşmeler",
    subtitle: "Hukuk işlerini ve müşteri satış sözleşmelerini yönetin.",
  },
  fa: {
    title: "امور حقوقی و پیمان‌ها",
    subtitle: "امور حقوقی و قراردادهای فروش مشتریان را مدیریت کنید.",
  },
} as const;

export default function LegalAffairs() {
  const { language, direction } = useLanguage();
  const copy = translations[language];

  return (
    <main id={LEGAL_AFFAIRS_MODULE_ID} data-module-id={LEGAL_AFFAIRS_MODULE_ID} dir={direction} className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl sm:text-3xl">
              <Scale className="h-7 w-7 text-primary" />
              {copy.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <ShopContracts />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}