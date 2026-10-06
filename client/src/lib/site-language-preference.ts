import {siteLanguages,type SiteLanguage} from "@shared/site-language-settings";

export function readManualSiteLanguage(storage:Pick<Storage,"getItem">):SiteLanguage|null {
  try{
    const saved=storage.getItem("language");
    return storage.getItem("language-manually-selected")==="true"&&siteLanguages.includes(saved as SiteLanguage)
      ?saved as SiteLanguage:null;
  }catch{return null;}
}
export async function resolveInitialSiteLanguage(manual:SiteLanguage|null,detect:()=>Promise<unknown>):Promise<SiteLanguage>{
  if(manual)return manual;
  const detected=await detect();
  if(!siteLanguages.includes(detected as SiteLanguage))throw new Error("Invalid initial site language response");
  return detected as SiteLanguage;
}
