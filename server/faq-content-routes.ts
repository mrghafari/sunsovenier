import type { Express, RequestHandler } from "express";
import { ZodError } from "zod";
import { faqLanguages, localizedFaqs } from "../shared/faq-content";
import { FaqConflictError, readFaqContent, saveFaqContent } from "./faq-content-store";

export function registerFaqContentRoutes(app: Express, permissions: {
  view: RequestHandler; edit: RequestHandler;
}, store = { read: readFaqContent, save: saveFaqContent }) {
  app.get("/api/faq", async (_req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      const content = await store.read();
      // Never expose unpublished entries on the public endpoint.
      res.json({ success: true, data: Object.fromEntries(
        faqLanguages.map(language => [language, localizedFaqs(content, language)]),
      ) });
    } catch {
      res.status(503).json({ success: false, message: "FAQ content is temporarily unavailable." });
    }
  });
  app.get("/api/content-management/faq", permissions.view, async (_req, res) => {
    res.set("Cache-Control", "no-store");
    try { res.json({ success: true, data: await store.read() }); }
    catch { res.status(503).json({ success: false, message: "Could not read FAQ content." }); }
  });
  app.put("/api/content-management/faq", permissions.edit, async (req, res) => {
    try { res.json({ success: true, data: await store.save(req.body) }); }
    catch (error) {
      const status = error instanceof FaqConflictError ? 409 : error instanceof ZodError ? 400 : 500;
      res.status(status).json({
        success: false,
        message: status === 409 ? "FAQ content was changed by another editor. Reload before saving."
          : status === 400 ? "Enter at least one complete question and answer for each FAQ."
          : "Could not save FAQ content. Existing content has not been overwritten.",
      });
    }
  });
}
