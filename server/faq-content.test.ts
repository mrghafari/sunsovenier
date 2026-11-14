import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import type { AddressInfo } from "node:net";
import { defaultFaqContent, faqContentSchema, localizedFaqs } from "../shared/faq-content";
import { FaqConflictError, readFaqContent, saveFaqContent, type FaqDatabase } from "./faq-content-store";
import { registerFaqContentRoutes } from "./faq-content-routes";

function memoryDatabase(): FaqDatabase {
  let raw: string | undefined;
  return {
    async query(text, values = []) {
      if (text.startsWith("SELECT")) return { rows: raw === undefined ? [] : [{ setting_value: raw }] };
      if (text.startsWith("INSERT")) {
        raw ??= values[1] as string;
        return { rows: [] };
      }
      assert.ok(text.startsWith("UPDATE"));
      if (JSON.parse(raw!).revision !== values[2]) return { rows: [] };
      raw = values[0] as string;
      return { rows: [{ setting_value: raw }] };
    },
  };
}

test("defaults retain original two landing questions in all four languages", () => {
  const content = faqContentSchema.parse(defaultFaqContent());
  for (const language of ["fa", "en", "ar", "tr"] as const) {
    assert.equal(localizedFaqs(content, language).length, 2);
  }
});

test("validation rejects empty, incomplete, duplicate and oversized FAQs", () => {
  const content = defaultFaqContent();
  for (const translations of [{}, { fa: { question: "q", answer: " " } }, { ku: { question: "q", answer: "a" } }]) {
    assert.equal(faqContentSchema.safeParse({ ...content, items: [{ ...content.items[0], translations }] }).success, false);
  }
  assert.equal(faqContentSchema.safeParse({ ...content, items: [content.items[0], content.items[0]] }).success, false);
  assert.equal(faqContentSchema.safeParse({ ...content, items: Array(101).fill(content.items[0]) }).success, false);
});

test("localization uses available content; inactive content never appears", () => {
  const content = faqContentSchema.parse({ revision: 0, items: [
    { id: "fa-only", isActive: true, translations: { fa: { question: "پرسش", answer: "پاسخ" } } },
    { id: "draft", isActive: false, translations: { en: { question: "Hidden", answer: "Secret" } } },
  ] });
  assert.deepEqual(localizedFaqs(content, "tr"), [{ id: "fa-only", question: "پرسش", answer: "پاسخ" }]);
});

test("optional details links validate, persist, localize and clear without affecting old FAQs", async () => {
  const content = defaultFaqContent();
  for (const invalid of ["javascript:alert(1)", "data:text/html,test", "//example.com", "/\\example.com", "https://user:pass@example.com", "not a link"]) {
    content.items[0].translations.en!.moreInfoUrl = invalid;
    assert.equal(faqContentSchema.safeParse(content).success, false, invalid);
  }
  const db = memoryDatabase();
  const stored = await readFaqContent(db);
  stored.items[0].translations.en!.moreInfoUrl = "https://example.com/details";
  stored.items[0].translations.fa!.moreInfoUrl = "/shop";
  const saved = await saveFaqContent(stored, db);
  assert.equal(localizedFaqs(await readFaqContent(db), "fa")[0].moreInfoUrl, "/shop");
  assert.equal(localizedFaqs(saved, "en")[0].moreInfoUrl, "https://example.com/details");
  assert.equal(localizedFaqs(saved, "ar")[0].moreInfoUrl, undefined);
  delete saved.items[0].translations.en!.moreInfoUrl;
  await saveFaqContent(saved, db);
  assert.equal(localizedFaqs(await readFaqContent(db), "en")[0].moreInfoUrl, undefined);
});

test("CRUD persists, reorders, deactivates, deletes and detects concurrent edits", async () => {
  const db = memoryDatabase();
  const first = await readFaqContent(db);
  first.items.push({ id: "new", isActive: true, translations: { fa: { question: "سؤال", answer: "جواب" } } });
  const saved = await saveFaqContent(first, db);
  assert.equal(saved.revision, 1);
  assert.equal((await readFaqContent(db)).items.length, 3);
  await assert.rejects(saveFaqContent(first, db), FaqConflictError);
  saved.items.reverse();
  saved.items[0].isActive = false;
  saved.items[0].translations.fa!.answer = "پاسخ ویرایش‌شده";
  await saveFaqContent(saved, db);
  const edited = await readFaqContent(db);
  assert.equal(edited.items[0].id, "new");
  assert.equal(edited.items[0].translations.fa!.answer, "پاسخ ویرایش‌شده");
  assert.equal(localizedFaqs(edited, "fa").length, 2);
  edited.items = [];
  await saveFaqContent(edited, db);
  assert.deepEqual((await readFaqContent(db)).items, []);
});

test("invalid saves do not touch stored data; malformed persisted content fails explicitly", async () => {
  let calls = 0;
  const db: FaqDatabase = { async query() { calls++; return { rows: [] }; } };
  await assert.rejects(saveFaqContent({ revision: 0, items: [{ id: "bad" }] }, db));
  assert.equal(calls, 0);
  await assert.rejects(readFaqContent({ async query() { return { rows: [{ setting_value: "bad-json" }] }; } }));
});

test("public route strips inactive FAQs and admin routes enforce view/edit guards", async () => {
  const app = express();
  app.use(express.json());
  const content = defaultFaqContent();
  content.items[0].isActive = false;
  let saves = 0;
  registerFaqContentRoutes(app, {
    view: (_req, res) => { res.status(401).json({ success: false }); },
    edit: (_req, res) => { res.status(403).json({ success: false }); },
  }, {
    read: async () => content,
    save: async () => { saves++; return content; },
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const response = await fetch(`${url}/api/faq`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json() as any;
    assert.equal(body.data.fa.length, 1);
    assert.equal(JSON.stringify(body).includes("packaging"), false);
    assert.equal((await fetch(`${url}/api/content-management/faq`)).status, 401);
    assert.equal((await fetch(`${url}/api/content-management/faq`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(content) })).status, 403);
    assert.equal(saves, 0);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
