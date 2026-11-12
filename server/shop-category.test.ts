import assert from "node:assert/strict";
import test from "node:test";
import { insertShopCategorySchema } from "../shared/shop-schema";
import { isDuplicateCategoryError } from "./shop-category-errors";

test("category content accepts trimmed names, Unicode slugs, optional image and order", () => {
  const value = insertShopCategorySchema.parse({
    name: "  دستهٔ جدید  ", slug: "مواد-شیمیایی", description: null,
    imageUrl: "/uploads/category.jpg", displayOrder: 4, isActive: true,
  });
  assert.equal(value.name, "دستهٔ جدید");
  for (const data of [
    { name: " ", slug: "valid" },
    { name: "Valid", slug: " " },
    { name: "Valid", slug: "bad/slug" },
    { name: "Valid", slug: "valid", displayOrder: -1 },
    { name: "Valid", slug: "valid", imageUrl: "javascript:alert(1)" },
  ]) assert.equal(insertShopCategorySchema.safeParse(data).success, false);
  assert.equal(insertShopCategorySchema.partial().safeParse({ description: "Edited" }).success, true);
});

test("duplicate slug classification handles wrapped errors without leaking data", () => {
  assert.equal(isDuplicateCategoryError(new Error("DB failed", { cause: { code: "23505" } })), true);
  assert.equal(isDuplicateCategoryError({ code: "23503" }), false);
  const cyclic: { cause?: unknown } = {};
  cyclic.cause = cyclic;
  assert.equal(isDuplicateCategoryError(cyclic), false);
});
