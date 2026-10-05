import assert from "node:assert/strict";
import { test } from "node:test";
import type { ShopContractDraftData } from "@shared/contract-draft";
import { buildContractDraftText } from "@shared/contract-document";

const baseDraft = (language: "fa" | "ar" | "en" | "tr") => ({
  version: 2 as const,
  dealType: "iran" as const,
  language,
  date: "",
  seller: { name: "", registration: "", address: "", representative: "", contact: "" },
  buyer: { country: "", registration: "", address: "", representative: "", contact: "" },
  productDetails: { "1": { grade: "", tolerance: "2", packaging: "" } },
  payment: { method: "advance" as const, days: "" },
  delivery: { location: "", date: "" },
  disputeCity: "",
});

const context = {
  customerName: "Buyer",
  contractNumber: "C-100",
  deliveryTerm: null,
  items: [{ productId: 1, productName: "Resin", maxQuantity: "10", unitPrice: "5" }],
};

test("contract draft prints the aggregate allowance distinctly from product tolerance in every language", () => {
  for (const language of ["fa", "ar", "en", "tr"] as const) {
    const draft = {
      ...baseDraft(language),
      aggregateWeightAllowance: { basis: "percent" as const, value: "7.125" },
    } as ShopContractDraftData;
    const output = buildContractDraftText(draft, context);
    assert.match(output, /7\.125%/);
    assert.match(output, /2%/);
    assert.match(output, new RegExp(language === "en" ? "Aggregate order overweight allowance" : language === "fa" ? "سقف اضافه‌وزن کل سفارش" : language === "ar" ? "حد زيادة وزن الطلب الإجمالي" : "Toplam sipariş fazla ağırlık sınırı"));
  }
});

test("missing allowance stays explicitly unspecified while zero remains an actual zero allowance", () => {
  for (const language of ["fa", "ar", "en", "tr"] as const) {
    const unspecified = buildContractDraftText(baseDraft(language) as ShopContractDraftData, context);
    const zero = buildContractDraftText({
      ...baseDraft(language),
      aggregateWeightAllowance: { basis: "percent" as const, value: "0" },
    } as ShopContractDraftData, context);
    assert.match(unspecified, /Not specified in the contract|در قرارداد مشخص نشده|غير محدد في العقد|Sözleşmede belirtilmemiş/);
    assert.match(zero, /0%/);
  }
});
