import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { FileText, Scale } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import ShopContracts from "@/components/admin/shop-contracts";
import SignedContractArchive from "@/components/admin/signed-contract-archive";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const LEGAL_AFFAIRS_MODULE_ID = "legal_affairs";

type LegalAffairsTab = "contracts" | "archive";

function tabFromSearch(search: string): LegalAffairsTab {
  return new URLSearchParams(search).get("tab") === "archive" ? "archive" : "contracts";
}

const translations = {
  en: {
    title: "Legal Affairs & Contracts",
    subtitle: "Manage legal affairs and customer sales contracts.",
    contracts: "Contracts",
    archive: "Signed PDFs",
  },
  ar: {
    title: "الشؤون القانونية والعقود",
    subtitle: "إدارة الشؤون القانونية وعقود مبيعات العملاء.",
    contracts: "العقود",
    archive: "أرشيف ملفات PDF الموقعة",
  },
  tr: {
    title: "Hukuk İşleri ve Sözleşmeler",
    subtitle: "Hukuk işlerini ve müşteri satış sözleşmelerini yönetin.",
    contracts: "Sözleşmeler",
    archive: "İmzalı PDF'ler",
  },
  fa: {
    title: "امور حقوقی و پیمان‌ها",
    subtitle: "امور حقوقی و قراردادهای فروش مشتریان را مدیریت کنید.",
    contracts: "قراردادها",
    archive: "بایگانی PDFهای امضاشده",
  },
} as const;

export default function LegalAffairs() {
  const { language, direction } = useLanguage();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<LegalAffairsTab>(() =>
    typeof window === "undefined" ? "contracts" : tabFromSearch(window.location.search)
  );
  const copy = translations[language];

  useEffect(() => {
    const syncTabFromUrl = () => setActiveTab(tabFromSearch(window.location.search));
    window.addEventListener("popstate", syncTabFromUrl);
    return () => window.removeEventListener("popstate", syncTabFromUrl);
  }, []);

  const changeTab = (value: string) => {
    if (value !== "contracts" && value !== "archive") return;
    const nextTab = value as LegalAffairsTab;
    setActiveTab(nextTab);
    setLocation(`/mrg/legal-affairs?tab=${nextTab}`);
  };

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

        <Tabs value={activeTab} onValueChange={changeTab} dir={direction} className="space-y-6">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="contracts" className="gap-2">
              <FileText className="h-4 w-4" />
              {copy.contracts}
            </TabsTrigger>
            <TabsTrigger value="archive" className="gap-2">
              <FileText className="h-4 w-4" />
              {copy.archive}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="contracts">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <ShopContracts />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="archive">
            <SignedContractArchive />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}