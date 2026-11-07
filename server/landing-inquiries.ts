import type { Express, RequestHandler } from "express";
import { z, ZodError } from "zod";
import { pool } from "./db";
import { readLandingContent } from "./landing-content-store";
import { pageLanguages, landingFormFieldKeys } from "../shared/landing-page-settings";
import { effectiveLayoutSections } from "../shared/landing-layout";
import type { LandingContent } from "../shared/landing-content";
import { BASE_PRODUCTS, LOCALIZED_PRODUCTS } from "../client/src/pages/landing/catalog";

export const LANDING_INQUIRY_MARKER = "[LANDING_ESTIMATE]";
export type LandingContactInput = {
  firstName: string; lastName: string; email: string; company: string;
  productInterest: string; message: string;
};
const inputSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(254),
  company: z.string().trim().max(300).default(""),
  productInterest: z.string().trim().max(100).default(""),
  phone: z.string().trim().max(80).default(""),
  address: z.string().trim().max(1000).default(""),
  message: z.string().trim().max(5000).default(""),
  language: z.enum(pageLanguages).default("en"),
  website: z.string().max(0).optional(),
}).strict();

export class LandingFormClosedError extends Error {}
export function prepareLandingInquiry(input: unknown, content: LandingContent): LandingContactInput {
  if (!effectiveLayoutSections(content.page.layout, content.page.sections).quote) throw new LandingFormClosedError("The estimate form is disabled.");
  const data = inputSchema.parse(input);
  for (const key of landingFormFieldKeys) {
    const field = content.page.form.fields[key];
    if (!field.visible) data[key] = "";
    else if (field.required && !data[key]) throw new ZodError([{ code: "custom", path: [key], message: "This field is required." }]);
  }
  let productLabel = "";
  if (data.productInterest) {
    const product = [...BASE_PRODUCTS, ...content.custom].find(item => item.id === data.productInterest);
    if (!product || content.page.cards[product.id]?.isActive === false) {
      throw new ZodError([{ code: "custom", path: ["productInterest"], message: "Select an available product." }]);
    }
    const originalIndex = BASE_PRODUCTS.findIndex(item => item.id === product.id);
    productLabel = content.edits[data.language]?.[product.id]?.title ?? content.edits.en?.[product.id]?.title
      ?? LOCALIZED_PRODUCTS[data.language]?.[originalIndex]?.[0] ?? product.title;
  }
  const [firstName, ...rest] = data.fullName.split(/\s+/);
  return {
    firstName, lastName: rest.join(" "), email: data.email.toLowerCase(),
    company: data.company, productInterest: productLabel || "General estimate",
    message: `${LANDING_INQUIRY_MARKER}\nLanguage: ${data.language}\nProduct: ${productLabel}\nPhone: ${data.phone}\nAddress: ${data.address}\nMessage: ${data.message}`,
  };
}

export type LandingInquiryDependencies = {
  read: typeof readLandingContent;
  create: (contact: LandingContactInput) => Promise<{ id: number }>;
  list: (limit: number, offset: number) => Promise<unknown[]>;
  notify?: (contact: LandingContactInput) => Promise<void>;
};
const defaultDependencies: LandingInquiryDependencies = {
  read: readLandingContent,
  create: async contact => {
    const result = await pool.query(`INSERT INTO contacts(first_name,last_name,email,company,product_interest,message)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
      [contact.firstName,contact.lastName,contact.email,contact.company,contact.productInterest,contact.message]);
    return result.rows[0];
  },
  list: async (limit, offset) => {
    const result = await pool.query(`SELECT id,first_name AS "firstName",last_name AS "lastName",email,company,
      product_interest AS "productInterest",message,created_at AS "createdAt"
      FROM contacts WHERE message LIKE $1 OR message LIKE $2
      ORDER BY created_at DESC,id DESC LIMIT $3 OFFSET $4`,
      [`${LANDING_INQUIRY_MARKER}%`, "Estimate request — %", limit, offset]);
    return result.rows;
  },
};

export function registerLandingInquiryRoutes(app: Express, view: RequestHandler,
  overrides: Partial<LandingInquiryDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };
  const attempts = new Map<string, { count: number; until: number }>();
  app.post("/api/landing-estimate", async (req, res) => {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
    const key = req.ip || "unknown";
    const attempt = attempts.get(key) ?? { count: 0, until: now + 15 * 60_000 };
    if (attempt.count >= 5 || attempts.size >= 10000 && !attempts.has(key)) {
      res.set("Retry-After", "900").status(429).json({ success: false, message: "Too many requests. Please try later." }); return;
    }
    attempt.count++;
    attempts.set(key, attempt);
    try {
      const contact = prepareLandingInquiry(req.body, await dependencies.read());
      const created = await dependencies.create(contact);
      // A saved request remains visible in the dashboard even if email fails.
      if (dependencies.notify) void dependencies.notify(contact).catch(() => {
        console.error("[LANDING INQUIRY] Notification failed; the request is retained in the dashboard.");
      });
      res.status(201).json({ success: true, id: created.id });
    } catch (error) {
      const status = error instanceof LandingFormClosedError ? 403 : error instanceof ZodError ? 400 : 503;
      res.status(status).json({ success: false, message: status === 400 ? "Check the required form fields."
        : status === 403 ? "The estimate form is currently disabled." : "Could not save your request. Please try again." });
    }
  });
  app.get("/api/content-management/landing/inquiries", view, async (req, res) => {
    res.set("Cache-Control", "no-store");
    const parsed = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(20),
      offset: z.coerce.number().int().min(0).max(100000).default(0),
    }).safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ success: false, message: "Invalid pagination." }); return; }
    try {
      const { limit, offset } = parsed.data;
      const rows = await dependencies.list(limit + 1, offset);
      res.json({ success: true, data: { items: rows.slice(0, limit), hasMore: rows.length > limit } });
    } catch { res.status(503).json({ success: false, message: "Could not load estimate requests." }); }
  });
}
