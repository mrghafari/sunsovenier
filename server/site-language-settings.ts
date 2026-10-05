import {pool} from "./db";
import {mergeSiteLanguageSettings,normalizeSiteLanguageSettings} from "@shared/site-language-settings";

type SettingsDatabase={query(text:string,values?:unknown[]):Promise<{rows:{setting_value?:unknown}[]}>};
export async function readSiteLanguageSettings(database:SettingsDatabase=pool){
  const result=await database.query("SELECT setting_value FROM shop_settings WHERE setting_key = 'language_settings' LIMIT 1");
  const raw=result.rows[0]?.setting_value;
  return normalizeSiteLanguageSettings(typeof raw==="string"?JSON.parse(raw):raw);
}
export async function saveSiteLanguageSettings(input:unknown,database:SettingsDatabase=pool){
  const settings=mergeSiteLanguageSettings(await readSiteLanguageSettings(database),input);
  await database.query(`INSERT INTO shop_settings(setting_key,setting_value,setting_type,display_name,category,is_public)
    VALUES('language_settings',$1,'json','تنظیمات زبان‌های سایت','appearance',true)
    ON CONFLICT(setting_key) DO UPDATE SET setting_value=$1,updated_at=NOW()`,[JSON.stringify(settings)]);
  return settings;
}
