import assert from "node:assert/strict";
import test from "node:test";
import { categoryCardHeading, categoryCardOrder } from "./category-card-headings";
import { BASE_PRODUCTS } from "./catalog";
import { defaultLandingContent, landingContentSchema } from "../../../../shared/landing-content";

const expected = ["Fuel Additives", "Water Treatment", "Paint & Solvents", "Agricultural Fertilizers", "Industrial Chemicals", "Technical Equipment", "Commercial Goods"];
test("seven category cards match the supplied headings and order exactly", () => {
  const cards = BASE_PRODUCTS.filter(card => card.id !== "logistics")
    .sort((a, b) => categoryCardOrder(a.id, 0) - categoryCardOrder(b.id, 0));
  assert.deepEqual(cards.map(card => categoryCardHeading(card.id, "en", card.title)), expected);
  for (const language of ["fa", "ar", "tr"]) {
    const translated = cards.map(card => categoryCardHeading(card.id, language, card.title));
    assert.equal(new Set(translated).size, 7);
    assert.ok(translated.every((title, index) => title !== expected[index]));
  }
  assert.equal(categoryCardHeading("custom-added", "en", "Custom title"), "Custom title");
});

test("both new photo slots and their localized content can be saved in the CMS", () => {
  const content = defaultLandingContent();
  for (const id of ["water-treatment", "commercial-goods"]) {
    content.images[id] = "/api/landing-assets/0123456789abcdef01234567.jpg";
    content.edits.en![id] = { title: "Edited title" };
  }
  assert.equal(landingContentSchema.safeParse(content).success, true);
});
