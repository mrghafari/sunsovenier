import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const contractTextCopy = {
  fa: { title: "متن قرارداد", description: "متن ذخیره‌شدهٔ توافق و شرایط فعلی قرارداد؛ فقط برای مشاهده.", empty: "برای این قرارداد متنی ثبت نشده است.", close: "بستن" },
  en: { title: "Contract text", description: "The saved agreement and current contract terms, for viewing only.", empty: "No text has been recorded for this contract.", close: "Close" },
  ar: { title: "نص العقد", description: "نص الاتفاق المحفوظ وشروط العقد الحالية، للعرض فقط.", empty: "لم يتم تسجيل نص لهذا العقد.", close: "إغلاق" },
  tr: { title: "Sözleşme metni", description: "Kaydedilmiş anlaşma ve güncel sözleşme koşulları; yalnızca görüntüleme.", empty: "Bu sözleşme için metin kaydedilmemiş.", close: "Kapat" },
} as const;

type TextContract = {
  number: string;
  terms: string | null;
  draftData?: { language?: string } | null;
};

export default function ContractTextDialog({ contract, onClose }: {
  contract: TextContract | null;
  onClose: () => void;
}) {
  const { language, direction } = useLanguage();
  const copy = contractTextCopy[language];
  const textLanguage = contract?.draftData?.language;
  const textDirection = textLanguage === "fa" || textLanguage === "ar" ? "rtl"
    : textLanguage === "en" || textLanguage === "tr" ? "ltr" : "auto";
  return (
    <Dialog open={contract !== null} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent dir={direction} className="flex max-h-[90dvh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{copy.title} — <bdi>{contract?.number}</bdi></DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <div data-testid="contract-text-content" dir={textDirection}
          className="min-h-0 overflow-y-auto rounded-md border bg-muted/30 p-4 text-start text-sm leading-7 whitespace-pre-wrap break-words">
          {contract?.terms?.trim() ? contract.terms : <p dir={direction} className="text-muted-foreground">{copy.empty}</p>}
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>{copy.close}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
