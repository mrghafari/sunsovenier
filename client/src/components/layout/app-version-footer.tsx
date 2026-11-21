import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { appVersion, releaseNotesPath } from "@/lib/app-version";

const labels = {
  en: { version: "Version", history: "Release history" },
  fa: { version: "نسخه", history: "تاریخچهٔ نسخه‌ها" },
  ar: { version: "الإصدار", history: "سجل الإصدارات" },
  tr: { version: "Sürüm", history: "Sürüm geçmişi" },
};

export function AppVersionFooter({ hasMobileNav }: { hasMobileNav: boolean }) {
  const { language, direction } = useLanguage();
  const copy = labels[language];

  return (
    <footer
      dir={direction}
      className={`border-t border-gray-800 bg-gray-950 text-center text-gray-300 ${hasMobileNav ? "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0" : ""}`}
    >
      <Link
        href={releaseNotesPath}
        data-testid="app-version-link"
        className="inline-flex min-h-11 items-center gap-2 rounded px-4 text-xs hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-sky-300"
      >
        <span>{copy.version} <bdi dir="ltr" className="font-semibold tabular-nums">{appVersion}</bdi></span>
        <span aria-hidden="true">·</span>
        <span className="underline underline-offset-4">{copy.history}</span>
      </Link>
    </footer>
  );
}
