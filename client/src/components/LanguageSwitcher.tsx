import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language, getLanguageName } from '@/lib/i18n';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import {normalizeSiteLanguageSettings} from "@shared/site-language-settings";

const ALL_LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'fa', label: 'فارسی' },
];

export function LanguageSwitcher() {
  const { language, setLanguage,setAutomaticLanguage } = useLanguage();

  const { data: langSettingsData } = useQuery({
    queryKey: ['/api/public/language-settings'],
    staleTime: 5 * 60 * 1000,
  });

  const enabledMap=normalizeSiteLanguageSettings((langSettingsData as any)?.data);

  const availableLanguages = ALL_LANGUAGES.filter(l => enabledMap[l.code] !== false);

  // If current language got disabled, fall back to first enabled language
  useEffect(() => {
    if (enabledMap[language] === false && availableLanguages.length > 0) {
      setAutomaticLanguage(enabledMap.defaultLanguage);
    }
  }, [enabledMap, language, availableLanguages, setAutomaticLanguage]);

  if (availableLanguages.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          {getLanguageName(language)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableLanguages.map(({ code, label }) => (
          <DropdownMenuItem key={code} onClick={() => setLanguage(code)}>
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
