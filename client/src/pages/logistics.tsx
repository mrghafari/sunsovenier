import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import type { LandingContent } from "@shared/landing-content";
import assets from "./landing/landing-assets.json";
import "./logistics.css";

type Language = "en" | "fa" | "ar" | "tr";
type LandingAsset = { url: string; width?: number; height?: number };

const fallbackImage = (assets as { images: LandingAsset[] }).images[8]?.url ?? "";

const copy: Record<Language, { title: string; status: string; retry: string; error: string }> = {
  en: {
    title: "Logistics",
    status: "Under construction",
    retry: "Try again",
    error: "This page could not be loaded.",
  },
  fa: {
    title: "لجستیک",
    status: "در حال ساخت",
    retry: "تلاش دوباره",
    error: "بارگذاری این صفحه ممکن نشد.",
  },
  ar: {
    title: "الخدمات اللوجستية",
    status: "قيد الإنشاء",
    retry: "حاول مرة أخرى",
    error: "تعذر تحميل هذه الصفحة.",
  },
  tr: {
    title: "Lojistik",
    status: "Yapım aşamasında",
    retry: "Yeniden dene",
    error: "Bu sayfa yüklenemedi.",
  },
};

export default function Logistics() {
  const { language, direction } = useLanguage();
  const locale: Language = language in copy ? (language as Language) : "en";
  const text = copy[locale];

  const { data: landingContent, isError, isFetching, refetch } = useQuery<LandingContent>({
    queryKey: ["/api/landing-content"],
    queryFn: async () => {
      const response = await fetch("/api/landing-content", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Unable to load published landing content.");
      const result = await response.json();
      if (!result.success || !result.data) throw new Error("Unable to load published landing content.");
      return result.data as LandingContent;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const image = landingContent?.images?.logistics || fallbackImage;

  return (
    <div className="logistics-page" dir={direction} lang={locale}>
      <section className="logistics-scene" aria-labelledby="logistics-title">
        <div
          className="logistics-scene__photo"
          role="img"
          aria-label={text.title}
          style={{ backgroundImage: image ? `url("${image}")` : undefined }}
        />
        <div className="logistics-scene__veil" aria-hidden="true" />
        <div className="logistics-scene__content">
          <div className="logistics-plaque">
            <span className="logistics-plaque__rule" aria-hidden="true" />
            <h1 id="logistics-title" className="logistics-plaque__title">{text.title}</h1>
            <p className="logistics-plaque__status" aria-live="polite">{text.status}</p>
            {isError && (
              <div className="logistics-plaque__error" role="alert">
                <span>{text.error}</span>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  disabled={isFetching}
                  className="logistics-plaque__retry"
                >
                  {text.retry}
                </button>
              </div>
            )}
          </div>
        </div>
        <span className="logistics-scene__edge" aria-hidden="true" />
      </section>
    </div>
  );
}
