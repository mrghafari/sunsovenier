import { Scale, Settings } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import ShopContracts from "@/components/admin/shop-contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SignatureManagement from "@/components/admin/signature-management";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const LEGAL_AFFAIRS_MODULE_ID = "legal_affairs";

const translations = {
  en: {
    title: "Legal Affairs & Contracts",
    subtitle: "Manage legal affairs and customer sales contracts.",
    settings: "Settings",
    signingSettings: "Signing settings",
  },
  ar: {
    title: "الشؤون القانونية والعقود",
    subtitle: "إدارة الشؤون القانونية وعقود مبيعات العملاء.",
    settings: "الإعدادات",
    signingSettings: "إعدادات التوقيع",
  },
  tr: {
    title: "Hukuk İşleri ve Sözleşmeler",
    subtitle: "Hukuk işlerini ve müşteri satış sözleşmelerini yönetin.",
    settings: "Ayarlar",
    signingSettings: "İmza ayarları",
  },
  fa: {
    title: "امور حقوقی و پیمان‌ها",
    subtitle: "امور حقوقی و قراردادهای فروش مشتریان را مدیریت کنید.",
    settings: "تنظیمات",
    signingSettings: "تنظیمات امضا",
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-3 text-2xl sm:text-3xl">
                <Scale className="h-7 w-7 text-primary" />
                {copy.title}
              </CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="legal-signing-settings-button">
                    <Settings className="me-2 h-4 w-4" />{copy.settings}
                  </Button>
                </DialogTrigger>
                <DialogContent dir={direction} aria-describedby={undefined} className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
                  <DialogHeader className="sr-only"><DialogTitle>{copy.signingSettings}</DialogTitle></DialogHeader>
                  <SignatureManagement view="settings" />
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <ShopContracts />
          </CardContent>
        </Card>

        <SignatureManagement view="register" />
      </div>
    </main>
  );
}