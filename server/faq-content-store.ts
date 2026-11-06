import { pool } from "./db";
import { defaultFaqContent, faqContentSchema, type FaqContent } from "../shared/faq-content";

export const FAQ_SETTING_KEY = "homepage_faq_content_v1";
export type FaqDatabase = { query(text: string, values?: unknown[]): Promise<{ rows: any[] }> };
export class FaqConflictError extends Error {}

export async function readFaqContent(database: FaqDatabase = pool): Promise<FaqContent> {
  const result = await database.query(
    "SELECT setting_value FROM shop_settings WHERE setting_key=$1 LIMIT 1", [FAQ_SETTING_KEY],
  );
  const raw = result.rows[0]?.setting_value;
  if (raw === undefined) return defaultFaqContent();
  return faqContentSchema.parse(typeof raw === "string" ? JSON.parse(raw) : raw);
}

export async function saveFaqContent(input: unknown, database: FaqDatabase = pool): Promise<FaqContent> {
  const content = faqContentSchema.parse(input);
  await database.query(`INSERT INTO shop_settings(setting_key,setting_value,setting_type,display_name,category,is_public)
    VALUES($1,$2,'json','سؤالات متداول صفحه اول','appearance',false) ON CONFLICT(setting_key) DO NOTHING`,
    [FAQ_SETTING_KEY, JSON.stringify(defaultFaqContent())]);
  const next = { ...content, revision: content.revision + 1 };
  const result = await database.query(`UPDATE shop_settings SET setting_value=$1,updated_at=NOW()
    WHERE setting_key=$2 AND (setting_value::jsonb->>'revision')::int=$3 RETURNING setting_value`,
    [JSON.stringify(next), FAQ_SETTING_KEY, content.revision]);
  if (!result.rows.length) throw new FaqConflictError("FAQ content changed. Reload before saving.");
  return next;
}
