import assert from "node:assert/strict";
import test from "node:test";
import { contractTextLayout } from "./contract-text-layout";

test("document language controls contract alignment independently of UI language", () => {
  for (const site of ["fa", "ar", "en", "tr"]) {
    for (const doc of ["fa", "ar", "en", "tr"]) {
      const rtl = doc === "fa" || doc === "ar";
      const layout = contractTextLayout(doc, "C2612345 / IQD 1000", site);
      assert.equal(layout.dir, rtl ? "rtl" : "ltr");
      assert.equal(layout.style.direction, layout.dir);
      assert.equal(layout.style.textAlign, rtl ? "right" : "left");
    }
  }
});

test("legacy Persian and Arabic remain right-aligned after a Latin contract-number heading", () => {
  for (const text of [
    "C2612345\nاین قرارداد بین فروشنده و خریدار با شرایط پرداخت و تحویل توافق‌شده تنظیم شده است.",
    "C2612345\nتم إبرام هذا العقد بين البائع والمشتري وفق شروط الدفع والتسليم المتفق عليها.",
  ]) {
    assert.equal(contractTextLayout(undefined, text, "en").style.textAlign, "right");
    assert.equal(contractTextLayout("unknown", text, "tr").dir, "rtl");
  }
});

test("legacy English and Turkish remain left-aligned on Persian and Arabic screens", () => {
  for (const text of ["C2612345\nThis sales agreement contains delivery and payment terms.", "C2612345\nSözleşme ödeme ve teslimat koşullarını içerir."]) {
    assert.equal(contractTextLayout(undefined, text, "fa").style.textAlign, "left");
    assert.equal(contractTextLayout(null, text, "ar").dir, "ltr");
  }
});

test("empty text and neutral codes use the screen language when document language is unavailable", () => {
  assert.equal(contractTextLayout(undefined, null, "fa").dir, "rtl");
  assert.equal(contractTextLayout(undefined, "12345", "en").dir, "ltr");
});
