import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Language, translations, Translation, getDirection } from '@/lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translation;
  direction: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(() => {
    // Preserve explicit user choices. Otherwise English is used briefly until
    // IP-based detection completes.
    const saved = localStorage.getItem('language') as Language;
    const wasManuallySelected = localStorage.getItem('language-manually-selected') === 'true';
    return wasManuallySelected && saved && (saved === 'en' || saved === 'ar' || saved === 'tr' || saved === 'fa')
      ? saved
      : 'en';
  });

  const chooseLanguage = useCallback((nextLanguage: Language) => {
    localStorage.setItem('language-manually-selected', 'true');
    setLanguage(nextLanguage);
  }, []);

  const direction = getDirection(language);
  const t = translations[language];

  // Save language preference and update document direction
  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    document.documentElement.className = `lang-${language}`;
  }, [language, direction]);

  useEffect(() => {
    if (localStorage.getItem('language-manually-selected') === 'true') return;

    const controller = new AbortController();
    fetch('/api/public/detect-language', { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        const detected = result?.data?.language as Language | undefined;
        if (
          localStorage.getItem('language-manually-selected') !== 'true' &&
          detected &&
          ['en', 'ar', 'tr', 'fa'].includes(detected)
        ) {
          setLanguage(detected);
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          console.warn('[LANGUAGE] IP detection failed; using English');
        }
      });

    return () => controller.abort();
  }, []);

  const value = {
    language,
    setLanguage: chooseLanguage,
    t,
    direction,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}