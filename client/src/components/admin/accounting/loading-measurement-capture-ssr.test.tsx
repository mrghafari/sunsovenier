import { strict as assert } from "node:assert";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type { LoadingCaptureContext } from "@shared/accounting-loading-capture";
import LoadingMeasurementCapture, { LoadingCaptureHistory } from "./loading-measurement-capture";
import { loadingCaptureCopy } from "./loading-measurement-capture-copy";

const fixture: LoadingCaptureContext["loadings"] = [{
  factId: 904, reference: "WB-904 / باسکول", eventDate: "2025-03-09", weightTons: "12.375", inventoryCostCount: 2,
  inventoryCosts: [
    { orderItemId: 31, batchReference: "LOT-7", documentReference: "INV-552", weightTons: "7.125", amount: "420.50", currency: "USD" },
    { orderItemId: 31, batchReference: "LOT-8", documentReference: "GRN-991", weightTons: "5.250", amount: "318.25", currency: "USD" },
  ],
}];

function renderHistory(language: "en" | "fa" | "ar" | "tr") {
  return renderToStaticMarkup(<LoadingCaptureHistory language={language} loadings={fixture}/>);
}

test("real capture component SSR renders its safety and capture-only frame with query providers", () => {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => null, setItem: () => undefined } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const html = renderToStaticMarkup(<LanguageProvider><QueryClientProvider client={client}><LoadingMeasurementCapture/></QueryClientProvider></LanguageProvider>);
  assert.match(html, /Weighbridge capture/);
  assert.match(html, /cannot be edited or deleted/i);
  assert.match(html, /Choose a company and native order identifier/);
  assert.match(html, /M2601303/);
  client.clear();
});

test("immutable loading history renders every cost document and attestation in all supported locales", () => {
  for (const language of ["en", "fa", "ar", "tr"] as const) {
    const html = renderHistory(language);
    assert.match(html, /WB-904/);
    assert.match(html, /INV-552/);
    assert.match(html, /GRN-991/);
    assert.match(html, /LOT-7/);
    assert.match(html, /7\.125/);
    assert.match(html, /420\.50/);
    assert.match(html, language === "fa" || language === "ar" ? /dir="rtl"/ : /dir="ltr"/);
    assert.ok(html.includes(loadingCaptureCopy(language, "history")));
  }
  assert.match(renderHistory("en"), /NOT verified FIFO or inventory valuation/);
});