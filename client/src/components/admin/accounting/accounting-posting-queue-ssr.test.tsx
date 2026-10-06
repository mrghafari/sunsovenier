import assert from "node:assert/strict";
import { test } from "node:test";
import React, { type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AccountingPostingQueue, { postingBlockersAreClosedGates } from "./accounting-posting-queue";
import { postingQueueText } from "./accounting-posting-queue-copy";

Object.defineProperty(globalThis, "React", { configurable: true, value: React });
function markup(canManage: boolean, language = "en") {
  const client = new QueryClient();
  const values: Record<string, string> = { "language-manually-selected": "true", language };
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => values[key] ?? null, setItem: (key: string, value: string) => { values[key] = value; },
    removeItem: (key: string) => { delete values[key]; },
  } });
  const content: ReactNode = <QueryClientProvider client={client}><LanguageProvider><AccountingPostingQueue companies={[]} canManage={canManage}/></LanguageProvider></QueryClientProvider>;
  return renderToStaticMarkup(content);
}

test("actual queue component keeps viewer read-only and manager run control closed until server gate says enabled", () => {
  const viewer = markup(false);
  const manager = markup(true);
  assert.match(viewer, /data-testid="accounting-posting-queue"/);
  assert.match(viewer, /data-testid="posting-queue-viewer"/);
  assert.match(viewer, /<button(?=[^>]*data-testid="posting-queue-run")(?=[^>]*disabled)[^>]*>/);
  assert.doesNotMatch(viewer, /data-testid="posting-queue-enqueue"/);
  assert.doesNotMatch(manager, /data-testid="posting-queue-viewer"/);
  assert.match(manager, /<button(?=[^>]*data-testid="posting-queue-run")(?=[^>]*disabled)[^>]*>/);
  assert.match(manager, /Documentary opening, financial activation, and the processing engine are separate controls/);
});

test("actual queue component preserves closed documentary/financial gates and four-language queue copy", () => {
  for (const language of ["en", "fa", "ar", "tr"]) {
    const html = markup(true, language);
    assert.ok(html.includes(postingQueueText(language, "title")));
    assert.ok(html.includes(postingQueueText(language, "disclaimer")));
    assert.ok(html.includes(postingQueueText(language, "closedGateOnly")));
    assert.ok(postingQueueText(language, "terminalReview").length > 40);
  }
  assert.equal(postingBlockersAreClosedGates(["CUTOVER_CLOSED"]), true);
  assert.equal(postingBlockersAreClosedGates(["PERIOD_CLOSED", "FOREIGN_CUTOVER_CLOSED"]), true);
  assert.equal(postingBlockersAreClosedGates([]), false);
  assert.equal(postingBlockersAreClosedGates(["CUTOVER_CLOSED", "OPENING_EVIDENCE_REQUIRED"]), false);
  assert.equal(postingBlockersAreClosedGates(["POSTING_MAPPING_REQUIRED"]), false);
});
