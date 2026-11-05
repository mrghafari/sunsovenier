import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

const SHOP_THEME_KEY = "momtazchem-shop-theme";
const ShopThemeContext = createContext<{ isNight: boolean; toggle: () => void } | null>(null);

export function ShopThemeProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isShopRoute = location === "/shop" || location === "/shop-search" || /^\/shop\/product\/[^/]+$/.test(location);
  const [isNight, setIsNight] = useState(() => {
    try {
      return localStorage.getItem(SHOP_THEME_KEY) === "night";
    } catch {
      return false;
    }
  });
  const previousDark = useRef(false);
  const previousNightAttribute = useRef<string | null>(null);

  useEffect(() => {
    if (!isShopRoute) return;
    const root = document.documentElement;
    previousDark.current = root.classList.contains("dark");
    previousNightAttribute.current = root.getAttribute("data-shop-night");
    return () => {
      root.classList.toggle("dark", previousDark.current);
      if (previousNightAttribute.current === null) root.removeAttribute("data-shop-night");
      else root.setAttribute("data-shop-night", previousNightAttribute.current);
    };
  }, [isShopRoute]);

  useEffect(() => {
    if (!isShopRoute) return;
    const root = document.documentElement;
    root.classList.toggle("dark", isNight);
    if (isNight) root.setAttribute("data-shop-night", "true");
    else root.removeAttribute("data-shop-night");
  }, [isShopRoute, isNight]);

  const value = useMemo(() => ({
    isNight,
    toggle: () => {
      setIsNight((current) => {
        const next = !current;
        try {
          localStorage.setItem(SHOP_THEME_KEY, next ? "night" : "day");
        } catch {
          // The current session still switches themes when storage is unavailable.
        }
        return next;
      });
    },
  }), [isNight]);

  return <ShopThemeContext.Provider value={value}>{children}</ShopThemeContext.Provider>;
}

export function ShopThemeToggle({ className = "" }: { className?: string }) {
  const theme = useContext(ShopThemeContext);
  const { language } = useLanguage();
  if (!theme) return null;

  const copyByLanguage = {
    fa: { day: "حالت روز", night: "حالت شب", activate: "فعال‌کردن حالت شب", deactivate: "فعال‌کردن حالت روز" },
    ar: { day: "الوضع النهاري", night: "الوضع الليلي", activate: "تفعيل الوضع الليلي", deactivate: "تفعيل الوضع النهاري" },
    tr: { day: "Gündüz modu", night: "Gece modu", activate: "Gece modunu aç", deactivate: "Gündüz modunu aç" },
    en: { day: "Day mode", night: "Night mode", activate: "Enable night mode", deactivate: "Enable day mode" },
  };
  const copy = copyByLanguage[language as keyof typeof copyByLanguage] ?? copyByLanguage.en;

  return (
    <button
      type="button"
      data-testid="shop-theme-toggle"
      onClick={theme.toggle}
      aria-label={theme.isNight ? copy.deactivate : copy.activate}
      aria-pressed={theme.isNight}
      title={theme.isNight ? copy.deactivate : copy.activate}
      className={`shop-theme-toggle inline-flex min-h-9 items-center justify-center gap-2 rounded-md border px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${className}`}
    >
      {theme.isNight ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
      <span>{theme.isNight ? copy.night : copy.day}</span>
    </button>
  );
}
