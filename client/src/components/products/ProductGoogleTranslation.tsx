import { useMemo, useState } from "react";
import { ExternalLink, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { googleProductTranslationLinks } from "@/lib/google-product-translation";

const copy = {
  en: { title: "Translate with Google", open: "Open in Google Translate", part: "Part", hint: "Uses the current site language and opens a new tab. For safety information, refer to the original documents." },
  fa: { title: "ترجمه با گوگل", open: "باز کردن در مترجم گوگل", part: "بخش", hint: "متن به زبان انتخابی سایت، در تب جدید باز می‌شود. برای اطلاعات ایمنی به مدارک اصلی مراجعه کنید." },
  ar: { title: "الترجمة باستخدام Google", open: "فتح في ترجمة Google", part: "الجزء", hint: "تُستخدم لغة الموقع الحالية وتُفتح علامة تبويب جديدة. لمعلومات السلامة، راجع المستندات الأصلية." },
  tr: { title: "Google ile çevir", open: "Google Çeviri’de aç", part: "Bölüm", hint: "Çeviri, sitenin geçerli dilinde yeni bir sekmede açılır. Güvenlik bilgileri için orijinal belgelere bakın." },
};

export function ProductGoogleTranslation({ text }: { text: string }) {
  const { language, direction } = useLanguage();
  const labels = copy[language];
  const [open, setOpen] = useState(false);
  const links = useMemo(() => open ? googleProductTranslationLinks(text, language) : [], [open, language, text]);

  if (!text) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="min-h-10 gap-2" data-testid="product-translate-google">
          <Languages className="h-4 w-4" aria-hidden="true" />
          {labels.title}
        </Button>
      </DialogTrigger>
      <DialogContent dir={direction} className="w-[calc(100%-2rem)] max-h-[85dvh] overflow-y-auto rounded-xl">
        <DialogHeader className="px-4 sm:text-start">
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.hint}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {links.map((href, index) => (
            <Button key={index} asChild variant={index === 0 ? "default" : "outline"} className="min-h-11 h-auto gap-2 whitespace-normal py-2 text-start">
              <a href={href} target="_blank" rel="noopener noreferrer" data-testid="open-google-product-translation">
                <span>{labels.open}{links.length > 1 ? ` — ${labels.part} ${index + 1}/${links.length}` : ""}</span>
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
