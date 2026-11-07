import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import type { AddressInfo } from "node:net";
import { defaultLandingContent, landingContentSchema } from "../shared/landing-content";
import { safeLandingLink, defaultLandingPageSettings } from "../shared/landing-page-settings";
import { prepareLandingInquiry, LandingFormClosedError, registerLandingInquiryRoutes } from "./landing-inquiries";
import manifest from "../client/src/pages/landing/landing-assets.json";

test("legacy persisted landing settings acquire defaults without losing content", () => {
  const old = { revision: 4, images: {}, edits: { fa: { drum220: { title: "محصول قدیمی" } } }, custom: [] };
  const parsed = landingContentSchema.parse(old);
  assert.equal(parsed.revision, 4);
  assert.equal(parsed.edits.fa.drum220.title, "محصول قدیمی");
  assert.deepEqual(parsed.page, defaultLandingPageSettings());
});
test("managed links reject unsafe protocols, protocol-relative URLs and credentials", () => {
  for (const value of ["javascript:alert(1)", "data:text/html,test", "//attacker.com", "/\\attacker", "https://u:p@attacker.com", "http://example.com", "/x\ny"]) assert.equal(safeLandingLink.safeParse(value).success, false, value);
  for (const value of ["/shop", "#quote", "https://example.com", "tel:+9647500000000", "mailto:info@example.com"]) assert.equal(safeLandingLink.safeParse(value).success, true);
});
test("banners need unique IDs, at least one active banner, registered images, no orphan slots", () => {
  const content = defaultLandingContent();
  content.page.slides.push({ id: "extra", isActive: true, eyebrow: {}, title: { fa: "بنر جدید" }, description: {} });
  assert.equal(landingContentSchema.safeParse(content).success, false);
  content.images["hero-extra"] = manifest.images[1].url;
  assert.equal(landingContentSchema.safeParse(content).success, true);
  content.page.slides = content.page.slides.filter(item => item.id !== "extra");
  assert.equal(landingContentSchema.safeParse(content).success, false);
  delete content.images["hero-extra"];
  content.page.slides.forEach(item => { item.isActive = false; });
  assert.equal(landingContentSchema.safeParse(content).success, false);
});
test("localized texts, footer, optional empty arrays and section toggles persist in schema", () => {
  const content = defaultLandingContent();
  content.page.texts.fa = { heroTitle: "عنوان", copyright: "حقوق", seoTitle: "سئو" };
  content.page.stats.fa = [];
  content.page.process.fa = [];
  content.page.sections.faq = false;
  content.page.footerCompany.reverse();
  content.page.cards.drum220 = { isActive: false, order: 2, specs: { fa: ["مشخصات"] }, pack: ["bag25"] };
  assert.deepEqual(landingContentSchema.parse(content), content);
  content.page.form.fields.phone.visible = false;
  assert.equal(landingContentSchema.safeParse(content).success, false, "Hidden required fields cannot ship");
  content.page.form.fields.phone.required = false;
  assert.equal(landingContentSchema.safeParse(content).success, true);
});
const valid = { fullName: "Example Customer", email: "example@example.com", productInterest: "drum220", phone: "+12345", address: "Example address", language: "fa" };
test("estimate handler validates actual stored form settings and product availability", () => {
  const content = defaultLandingContent();
  const input = prepareLandingInquiry(valid, content);
  assert.equal(input.firstName, "Example");
  assert.match(input.message, /^\[LANDING_ESTIMATE\]/);
  assert.throws(() => prepareLandingInquiry({ ...valid, phone: "" }, content));
  assert.throws(() => prepareLandingInquiry({ ...valid, email: "invalid" }, content));
  assert.throws(() => prepareLandingInquiry({ ...valid, productInterest: "invented" }, content));
  content.page.cards.drum220 = { isActive: false, order: 1, pack: ["drum220"], specs: {} };
  assert.throws(() => prepareLandingInquiry(valid, content));
  content.page.form.fields.productInterest = { visible: false, required: false };
  content.page.form.fields.phone = { visible: false, required: false };
  const hidden = prepareLandingInquiry({ ...valid, productInterest: "invented", phone: "do-not-retain" }, content);
  assert.equal(hidden.productInterest, "General estimate");
  assert.equal(hidden.message.includes("do-not-retain"), false);
  content.page.sections.quote = false;
  assert.throws(() => prepareLandingInquiry(valid, content), LandingFormClosedError);
});
test("inquiry APIs persist before success, protect inbox, paginate and fail explicitly", async () => {
  const app = express(); app.use(express.json());
  let creates = 0;
  registerLandingInquiryRoutes(app, (req, res, next) => {
    if (req.headers["x-probe-permission"] === "view") next(); else res.sendStatus(401);
  }, {
    read: async () => defaultLandingContent(),
    create: async () => { creates++; return { id: 123 }; },
    list: async (limit, offset) => Array.from({ length: limit }, (_, i) => ({ id: offset + i })),
    notify: async () => { throw new Error("Email unavailable"); },
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const post = (input: unknown) => fetch(`${base}/api/landing-estimate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    assert.equal((await post({ ...valid, email: "bad" })).status, 400);
    assert.equal(creates, 0);
    const saved = await post(valid);
    assert.equal(saved.status, 201);
    assert.equal((await saved.json() as any).id, 123);
    assert.equal(creates, 1);
    assert.equal((await fetch(`${base}/api/content-management/landing/inquiries`)).status, 401);
    const result = await fetch(`${base}/api/content-management/landing/inquiries?limit=2&offset=4`, { headers: { "x-probe-permission": "view" } });
    assert.deepEqual((await result.json() as any).data, { items: [{ id: 4 }, { id: 5 }], hasMore: true });
    assert.equal((await fetch(`${base}/api/content-management/landing/inquiries?limit=0`, { headers: { "x-probe-permission": "view" } })).status, 400);
    for (let i = 0; i < 3; i++) await post({});
    assert.equal((await post(valid)).status, 429);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
