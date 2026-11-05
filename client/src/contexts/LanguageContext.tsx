import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Language, translations, Translation, getDirection } from '@/lib/i18n';
import {readManualSiteLanguage,resolveInitialSiteLanguage} from "@/lib/site-language-preference";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  setAutomaticLanguage: (language: Language) => void;
  t: Translation;
  direction: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [manualLanguage]=useState(()=>readManualSiteLanguage(localStorage));
  const [language, setLanguage] = useState<Language>(manualLanguage??"en");
  const [ready,setReady]=useState(Boolean(manualLanguage));

  const chooseLanguage = useCallback((nextLanguage: Language) => {
    localStorage.setItem('language-manually-selected', 'true');
    localStorage.setItem('language',nextLanguage);
    setLanguage(nextLanguage);
  }, []);
  const setAutomaticLanguage=useCallback((nextLanguage:Language)=>{
    localStorage.removeItem("language-manually-selected");
    setLanguage(nextLanguage);
  },[]);

  const direction = getDirection(language);
  const t = translations[language];

  // Save language preference and update document direction
  useEffect(() => {
    if(!ready)return;
    localStorage.setItem('language', language);
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    const root = document.documentElement;
    Array.from(root.classList).filter((name) => name.startsWith('lang-')).forEach((name) => root.classList.remove(name));
    root.classList.add(`lang-${language}`);
  }, [language, direction,ready]);

  useEffect(() => {
    if (manualLanguage) return;

    const controller = new AbortController();
    let mounted=true;
    const timeout=setTimeout(()=>controller.abort(),6000);
    resolveInitialSiteLanguage(null,async()=>{
      const response=await fetch('/api/public/detect-language',{signal:controller.signal,cache:"no-store"});
      if(!response.ok)throw new Error("Initial language settings unavailable");
      const result=await response.json();
      if(!result.success)throw new Error("Initial language settings unavailable");
      return result?.data?.language;
    }).then(detected=>{
      if(mounted&&!readManualSiteLanguage(localStorage))setLanguage(detected);
    })
      .catch((error) => {
        if(mounted)console.warn('[LANGUAGE] Initial language unavailable; using English',error);
      }).finally(()=>{
        clearTimeout(timeout);
        if(mounted)setReady(true);
      });

    return () => {mounted=false;clearTimeout(timeout);controller.abort();};
  }, [manualLanguage]);

  const value = {
    language,
    setLanguage: chooseLanguage,
    setAutomaticLanguage,
    t,
    direction,
  };

  return (
    <LanguageContext.Provider value={value}>
      {ready?children:<div className="flex min-h-screen items-center justify-center">
        <span role="status" aria-label="Loading site language" className="h-7 w-7 animate-spin rounded-full border-2 border-current border-t-transparent"/>
      </div>}
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