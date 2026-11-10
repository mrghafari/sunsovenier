import { PackageCheck } from "lucide-react";
import type { PackagingSpecifications } from "@shared/product-packaging";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PackagingSpecificationsView } from "@/components/products/PackagingSpecificationsEditor";

interface ProductPackingDialogProps {
  productName: string;
  value: PackagingSpecifications | null | undefined;
  language: string;
}

const dialogCopy = {
  en: { title: "Packing details", description: "Container specifications for" },
  fa: { title: "جزئیات بسته‌بندی", description: "مشخصات ظرف برای" },
  ar: { title: "تفاصيل العبوة", description: "مواصفات العبوة للمنتج" },
  tr: { title: "Ambalaj detayları", description: "Ürün ambalaj özellikleri:" },
} as const;

export default function ProductPackingDialog({
  productName,
  value,
  language,
}: ProductPackingDialogProps) {
  const locale = language in dialogCopy ? language as keyof typeof dialogCopy : "en";
  const isRtl = locale === "fa" || locale === "ar";
  const copy = dialogCopy[locale];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="product-packing-trigger"
          aria-label={`Packing specifications for ${productName}`}
          onClick={(event) => event.stopPropagation()}
          className="h-7 shrink-0 gap-1.5 border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-400/70 dark:bg-slate-800 dark:text-blue-100 dark:hover:border-blue-300 dark:hover:bg-slate-700 dark:hover:text-white dark:focus-visible:ring-blue-300"
        >
          <PackageCheck aria-hidden="true" className="h-3.5 w-3.5" />
          <span>Packing</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        data-testid="product-packing-dialog"
        dir={isRtl ? "rtl" : "ltr"}
        className="flex max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden border-slate-200 bg-background p-0 shadow-xl sm:rounded-xl"
      >
        <DialogHeader className="shrink-0 border-b border-border/70 bg-muted/30 px-5 py-4 pr-12 text-start sm:px-6 sm:pr-12">
          <DialogTitle className="flex items-center gap-2 text-base">
            <PackageCheck aria-hidden="true" className="h-4 w-4 text-blue-600" />
            {copy.title}
          </DialogTitle>
          <DialogDescription className="break-words pt-1 text-start">
            {copy.description} <span className="font-medium text-foreground">{productName}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          <PackagingSpecificationsView value={value} language={language} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
