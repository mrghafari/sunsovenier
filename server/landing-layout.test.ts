import assert from "node:assert/strict";
import { test } from "node:test";
import { createLayoutBlock, defaultLandingLayout, effectiveLayoutSections, landingLayoutSchema, moveLayoutBlock } from "../shared/landing-layout";
import { defaultLandingContent, landingContentSchema } from "../shared/landing-content";
import { LandingConflictError, readLandingContent, saveLandingContent, type LandingDatabase } from "./landing-content-store";
import { LandingFormClosedError, prepareLandingInquiry } from "./landing-inquiries";
import assets from "../client/src/pages/landing/landing-assets.json";

test("legacy pages receive the original layout without losing saved texts", () => {
  const legacy: any = defaultLandingContent();
  delete legacy.page.layout;
  legacy.page.texts.fa.heroTitle = "عنوان قدیمی";
  const parsed = landingContentSchema.parse(legacy);
  assert.deepEqual(parsed.page.layout, defaultLandingLayout());
  assert.equal(parsed.page.texts.fa.heroTitle, "عنوان قدیمی");
});
test("block moves use final destination indices and do not mutate the draft", () => {
  const original = defaultLandingLayout();
  original.rows[0].blocks.push(createLayoutBlock("text", "new-text"), createLayoutBlock("button", "new-button"));
  const next = moveLayoutBlock(original, "row-hero", 0, "row-hero", 1);
  assert.deepEqual(next.rows[0].blocks.map(b => b.id), ["new-text", "block-hero", "new-button"]);
  const moved = moveLayoutBlock(next, "row-hero", 1, "row-faq", 1);
  assert.equal(moved.rows.find(r => r.id === "row-faq")!.blocks[1].type, "hero");
  assert.equal(original.rows[0].blocks[0].type, "hero");
  assert.equal(moveLayoutBlock(original, "missing", 0, "row-faq", 0), original);
  assert.ok(landingLayoutSchema.safeParse(moved).success);
});
test("unique sections and IDs, row sizes and required element permutations are enforced", () => {
  const value = defaultLandingLayout();
  value.rows[0].blocks.push(createLayoutBlock("hero", "another-hero"));
  assert.equal(landingLayoutSchema.safeParse(value).success, false);
  value.rows[0].blocks.pop();
  value.rows[1].id = value.rows[0].id;
  assert.equal(landingLayoutSchema.safeParse(value).success, false);
  value.rows[1].id = "other-row";
  value.elements.form = ["fullName", "email"] as any;
  assert.equal(landingLayoutSchema.safeParse(value).success, false);
  value.elements = defaultLandingLayout().elements;
  value.elements.hero = ["copy", "copy"] as any;
  assert.equal(landingLayoutSchema.safeParse(value).success, false);
  value.elements = defaultLandingLayout().elements;
  value.rows[0].columns = 4 as any;
  assert.equal(landingLayoutSchema.safeParse(value).success, false);
});
test("custom blocks are repeatable, bounded and contain no executable configuration", () => {
  const value = defaultLandingLayout();
  value.rows[0].blocks.push(createLayoutBlock("text", "text-1"), createLayoutBlock("text", "text-2"));
  assert.ok(landingLayoutSchema.safeParse(value).success);
  const button = createLayoutBlock("button", "custom-button");
  value.rows[1].blocks.push(button);
  for (const bad of ["javascript:alert(1)", "//evil.example", "https://user:password@example.invalid", "/\\evil"]) {
    button.href = bad;
    assert.equal(landingLayoutSchema.safeParse(value).success, false);
  }
  button.href = "/shop";
  (button as any).html = "<script>bad()</script>";
  assert.equal(landingLayoutSchema.safeParse(value).success, false);
  delete (button as any).html;
  assert.ok(landingLayoutSchema.safeParse(value).success);
  value.rows[0].blocks = Array.from({ length: 13 }, (_, i) => createLayoutBlock("text", `text-${i}`));
  assert.equal(landingLayoutSchema.safeParse(value).success, false);
});
test("layout image blocks require an uploaded image and reject orphan references", () => {
  const content = defaultLandingContent();
  const block = createLayoutBlock("image", "custom-photo");
  content.page.layout.rows[0].blocks.push(block);
  assert.equal(landingContentSchema.safeParse(content).success, false);
  content.images["layout-custom-photo"] = assets.images[3].url;
  assert.ok(landingContentSchema.safeParse(content).success);
  content.page.layout.rows[0].blocks.pop();
  assert.equal(landingContentSchema.safeParse(content).success, false);
  delete content.images["layout-custom-photo"];
  assert.ok(landingContentSchema.safeParse(content).success);
});
test("standalone placement suppresses embedding, including disabled explicit blocks", () => {
  const content = defaultLandingContent();
  const layout = content.page.layout;
  const flags = content.page.sections;
  assert.ok(effectiveLayoutSections(layout, flags).quote);
  layout.rows[0].blocks[0].enabled = false;
  assert.equal(effectiveLayoutSections(layout, flags).quote, false);
  layout.rows[1].blocks.push(createLayoutBlock("quote", "separate-quote"));
  assert.ok(effectiveLayoutSections(layout, flags).quote);
  layout.rows[1].blocks[1].enabled = false;
  layout.rows[0].blocks[0].enabled = true;
  assert.equal(effectiveLayoutSections(layout, flags).quote, false);
  flags.quote = false;
  layout.rows[1].blocks[1].enabled = true;
  assert.equal(effectiveLayoutSections(layout, flags).quote, false);
});
test("form endpoint refuses layouts without a visible form even with a stale form toggle", () => {
  const content = defaultLandingContent();
  content.page.layout.rows = content.page.layout.rows.filter(row => row.id !== "row-hero");
  assert.equal(content.page.sections.quote, true);
  assert.throws(() => prepareLandingInquiry({}, content), LandingFormClosedError);
});
test("row/block composition survives shared save and reload, with revision conflict safety", async () => {
  let stored: string | undefined;
  const db: LandingDatabase = { async query(sql, values = []) {
    if (sql.startsWith("SELECT url")) return { rows: [] };
    if (sql.startsWith("SELECT setting_value")) return { rows: stored ? [{ setting_value: stored }] : [] };
    if (sql.startsWith("INSERT INTO shop_settings")) { stored ??= String(values[1]); return { rows: [] }; }
    if (sql.startsWith("UPDATE shop_settings")) {
      if (JSON.parse(stored!).revision !== values[2]) return { rows: [] };
      stored = String(values[0]); return { rows: [{ setting_value: stored }] };
    }
    throw new Error("Unexpected query");
  } };
  const draft = defaultLandingContent();
  draft.page.layout.rows.reverse();
  draft.page.layout.rows[0].columns = 3;
  draft.page.layout.rows[0].blocks.push({ ...createLayoutBlock("text", "message"), title: { fa: "ترکیب تازه", en: "New layout" } });
  draft.page.layout.elements.about.reverse();
  const saved = await saveLandingContent(draft, db);
  const reloaded = await readLandingContent(db);
  assert.deepEqual(reloaded.page.layout, saved.page.layout);
  assert.equal(reloaded.page.layout.rows[0].columns, 3);
  assert.equal(reloaded.page.layout.rows[0].blocks[1].title.fa, "ترکیب تازه");
  await assert.rejects(saveLandingContent(draft, db), LandingConflictError);
  assert.deepEqual(await readLandingContent(db), saved);
});
