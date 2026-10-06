import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import type { AccountingRow } from "@shared/accounting-api";
import CompanyDeleteControl from "./company-delete-control";

Object.assign(globalThis, { React });

const company: AccountingRow = { id: 73, name: "Kabul Trading", baseCurrency: "AFN", countryCode: "AF" };

function render(language: string) {
  const client = new QueryClient();
  const html = renderToStaticMarkup(<QueryClientProvider client={client}>
    <CompanyDeleteControl company={company} language={language} onDeleted={() => {}} />
  </QueryClientProvider>);
  client.clear();
  return html;
}

test("company deletion control renders as an explicit company-only action in the supported locales", () => {
  const labels = { en: "Delete", fa: "حذف", ar: "حذف", tr: "Sil" };
  for (const [language, label] of Object.entries(labels)) {
    const html = render(language);
    assert.match(html, /data-testid="accounting-company-delete-73"/);
    assert.ok(html.includes(label));
    assert.doesNotMatch(html, /accounting-company-delete-submit/);
  }
});

test("rendering the deletion affordance does not issue a destructive request", () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response("{}", { status: 200 }); }) as typeof fetch;
  try {
    render("en");
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
