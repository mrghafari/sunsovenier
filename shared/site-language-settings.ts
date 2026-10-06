import {z} from "zod";

export const siteLanguages=["en","ar","tr","fa"] as const;
export type SiteLanguage=typeof siteLanguages[number];
export interface SiteLanguageSettings {
  en:boolean;ar:boolean;tr:boolean;fa:boolean;ku:boolean;
  initialLanguageMode:"ip"|"fixed";
  defaultLanguage:SiteLanguage;
}
export const defaultSiteLanguageSettings:SiteLanguageSettings={
  en:true,ar:true,tr:true,fa:true,ku:true,initialLanguageMode:"ip",defaultLanguage:"en",
};
export function normalizeSiteLanguageSettings(raw:unknown):SiteLanguageSettings {
  const data=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
  const settings={...defaultSiteLanguageSettings};
  for(const code of [...siteLanguages,"ku"] as const)settings[code]=typeof data[code]==="boolean"?data[code] as boolean:true;
  // Legacy Kurdish visibility is retained, but the site currently renders four languages.
  if(!siteLanguages.some(code=>settings[code]))settings.en=true;
  settings.initialLanguageMode=data.initialLanguageMode==="fixed"?"fixed":"ip";
  settings.defaultLanguage=siteLanguages.includes(data.defaultLanguage as SiteLanguage)&&settings[data.defaultLanguage as SiteLanguage]
    ?data.defaultLanguage as SiteLanguage:siteLanguages.find(code=>settings[code])!;
  return settings;
}
export const siteLanguageSettingsUpdateSchema=z.object({
  en:z.boolean(),ar:z.boolean(),tr:z.boolean(),fa:z.boolean(),ku:z.boolean().optional(),
  initialLanguageMode:z.enum(["ip","fixed"]).optional(),
  defaultLanguage:z.enum(siteLanguages).optional(),
}).strict().refine(s=>siteLanguages.some(code=>s[code]),{message:"At least one supported site language must remain enabled"});
export function mergeSiteLanguageSettings(current:unknown,input:unknown):SiteLanguageSettings {
  const update=siteLanguageSettingsUpdateSchema.parse(input);
  const merged={...normalizeSiteLanguageSettings(current),...update};
  if(update.defaultLanguage!==undefined&&!merged[update.defaultLanguage])
    throw new Error("The initial/fallback language must be enabled");
  return normalizeSiteLanguageSettings(merged);
}
export function languageForVisitorCountry(settings:SiteLanguageSettings,countryCode:string|null):SiteLanguage {
  if(settings.initialLanguageMode==="fixed")return settings.defaultLanguage;
  const detected:SiteLanguage=({IR:"fa",IQ:"ar",TR:"tr"} as Record<string,SiteLanguage>)[countryCode?.toUpperCase()??""]??settings.defaultLanguage;
  return settings[detected]?detected:settings.defaultLanguage;
}
