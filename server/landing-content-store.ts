import {pool} from "./db";
import {defaultLandingContent,landingContentSchema,type LandingContent} from "../shared/landing-content";
import manifest from "../client/src/pages/landing/landing-assets.json";

export const LANDING_SETTING_KEY="landing_page_content_v1";
export type LandingDatabase={query(text:string,values?:unknown[]):Promise<{rows:any[]}>};
export class LandingConflictError extends Error {}

export async function readLandingContent(database:LandingDatabase=pool):Promise<LandingContent>{
  const result=await database.query("SELECT setting_value FROM shop_settings WHERE setting_key=$1 LIMIT 1",[LANDING_SETTING_KEY]);
  const raw=result.rows[0]?.setting_value;
  if(raw===undefined)return defaultLandingContent();
  return landingContentSchema.parse(typeof raw==="string"?JSON.parse(raw):raw);
}

export async function saveLandingContent(input:unknown,database:LandingDatabase=pool):Promise<LandingContent>{
  const content=landingContentSchema.parse(input);
  const staticImages=new Set(manifest.images.map(image=>image.url));
  const uploaded=[...new Set(Object.values(content.images).filter(url=>!staticImages.has(url)))];
  if(uploaded.length){
    const known=await database.query(
      "SELECT url FROM image_assets WHERE section='landing_page' AND is_active=true AND url=ANY($1::text[])",[uploaded],
    );
    const urls=new Set(known.rows.map(row=>row.url));
    if(uploaded.some(url=>!urls.has(url)))throw new Error("One or more images have not been uploaded.");
  }
  await database.query(`INSERT INTO shop_settings(setting_key,setting_value,setting_type,display_name,category,is_public)
    VALUES($1,$2,'json','محتوای صفحه اول','appearance',false) ON CONFLICT(setting_key) DO NOTHING`,
    [LANDING_SETTING_KEY,JSON.stringify(defaultLandingContent())]);
  const next={...content,revision:content.revision+1};
  const result=await database.query(`UPDATE shop_settings SET setting_value=$1,updated_at=NOW()
    WHERE setting_key=$2 AND (setting_value::jsonb->>'revision')::int=$3 RETURNING setting_value`,
    [JSON.stringify(next),LANDING_SETTING_KEY,content.revision]);
  if(!result.rows.length)throw new LandingConflictError("The landing page changed. Reload before saving.");
  return next;
}
