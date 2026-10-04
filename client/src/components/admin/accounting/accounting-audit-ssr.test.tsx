import { strict as assert } from "node:assert";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AccountingAuditReport, AccountingAuditRow } from "@shared/accounting-audit";
import { AccountingAuditResult, accountingAuditCopy } from "./accounting-audit-history";

const row = (extra: Record<string, unknown> = {}): AccountingAuditRow => ({
  id: 82, actorId: 0, actorType: "service-account", action: "loading.capture.corrected",
  entityType: "loading_fact", entityId: "LOAD-881", createdAt: "2025-02-03T18:45:12.000Z",
  hasBefore: true, hasAfter: false, ...extra,
} as AccountingAuditRow);
const report = (rows: AccountingAuditRow[] = [row()]): AccountingAuditReport => ({
  company: { id: 3, name: "Momtazcom Petrochemicals", timezone: "Asia/Tehran" },
  filters: { companyId: 3, from: "2025-02-01", to: "2025-02-28", page: 2, pageSize: 25 },
  rows, pagination: { page: 2, pageSize: 25, totalRows: 51 },
  scope: "selected-company-accounting-only", dateBasis: "company-local-day",
  includesGlobalActions: false, snapshotPayloadsExposed: false,
});
const render = (language: "en" | "fa" | "ar" | "tr", data = report()) =>
  renderToStaticMarkup(<AccountingAuditResult report={data} language={language} words={accountingAuditCopy[language]} page={2} totalPages={3} changePage={() => undefined}/>);

test("audit history real result component renders all locales, technical identifiers, timezone, and metadata flags", () => {
  for (const language of ["en", "fa", "ar", "tr"] as const) {
    const html = render(language);
    assert.match(html, /Momtazcom Petrochemicals/);
    assert.match(html, /Asia\/Tehran/);
    assert.match(html, /service-account/);
    assert.match(html, /#0/);
    assert.match(html, /loading\.capture\.corrected/);
    assert.match(html, /loading_fact/);
    assert.match(html, /LOAD-881/);
    assert.match(html, language === "fa" || language === "ar" ? /dir="rtl"/ : /dir="ltr"/);
    assert.match(html, /2 \/ 3/);
  }
});

test("audit shows flags only and never renders extra snapshot, secret, or contact payloads", () => {
  const secret = "TOP_SECRET_BEFORE_PAYLOAD";
  const email = "private.person@example.invalid";
  const html = render("en", report([row({
    before: { privatePayload: secret },
    after: { token: secret },
    email,
    phone: "+989121234567",
  }) as AccountingAuditRow]));
  assert.match(html, /Before snapshot: <b>Present/);
  assert.match(html, /After snapshot: <b>Absent/);
  assert.doesNotMatch(html, new RegExp(secret));
  assert.doesNotMatch(html, new RegExp(email));
  assert.doesNotMatch(html, /989121234567/);
});

test("company timezone is used for date rendering and raw audit codes are not replaced by invented labels", () => {
  const html = render("en");
  assert.match(html, /Feb 03, 2025/);
  assert.match(html, /18:45:12/);
  assert.match(html, /loading\.capture\.corrected/);
  assert.match(html, /Company-local dates · timezone/);
});