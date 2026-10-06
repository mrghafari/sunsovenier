import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { walletRefundCommandSchema, walletRefundQuoteSchema, type WalletRefundHistory, type WalletRefundPlan } from "@shared/accounting-wallet-refunds";
import { getWalletRefundHistory, postWalletRefund, previewWalletRefund, walletRefundHistoryEndpoint, walletRefundPreviewEndpoint, walletRefundsEndpoint } from "./accounting-wallet-refunds-api";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

const quote = { companyId: 12, walletId: 44, amount: "75.500", entryDate: "2025-05-15", channel: "BANK" as const };
const plan: WalletRefundPlan = {
  input: quote, planHash: "a".repeat(64), financialGateOpen: true, postingAllowed: true, blockers: [],
  valuation: {
    available: true, blockingReason: null, currency: "USD", baseCurrency: "IQD", amount: "75.500",
    walletId: 44, customerId: 93, walletNativeBefore: "125.500", walletBaseBefore: "163150.000",
    availableNative: "125.500", fundingNativeBefore: "1000.000", fundingBaseBefore: "1300000.000",
    liabilityBase: "97500.000", fundingBase: "97500.000", fxGain: "0", fxLoss: "0",
    lines: [{ accountId: 5, currency: "USD", debit: "75.500", credit: "0", baseDebit: "97500.000", baseCredit: "0", exchangeRate: "1300", partyType: "customer", partyId: 93, costCenterId: null, description: "Documented wallet payout" }],
  },
};

test("quote and command schemas preserve exact decimals and require full documented payout acknowledgement", () => {
  assert.equal(walletRefundQuoteSchema.safeParse(quote).success, true);
  assert.equal(walletRefundQuoteSchema.safeParse({ ...quote, amount: 75.5 }).success, false);
  assert.equal(walletRefundQuoteSchema.safeParse({ ...quote, channel: "CHEQUE" }).success, false);
  assert.equal(walletRefundQuoteSchema.safeParse({ ...quote, extra: true }).success, false);
  const command = { ...quote, sourceId: "wallet-refund-stable-44", expectedPlanHash: "b".repeat(64), payoutReference: "bank-۱۲۳", evidenceReference: "BANK-VOUCHER-557", reason: "Customer payout already documented", payoutDocumentConfirmed: true as const };
  assert.equal(walletRefundCommandSchema.safeParse(command).success, true);
  assert.equal(walletRefundCommandSchema.parse(command).payoutReference, "BANK-123");
  assert.equal(walletRefundCommandSchema.parse({ ...command, payoutReference: "cash-٤٢" }).payoutReference, "CASH-42");
  assert.equal(walletRefundCommandSchema.safeParse({ ...command, payoutDocumentConfirmed: false }).success, false);
  const withoutPayoutReference = Object.fromEntries(Object.entries(command).filter(([key]) => key !== "payoutReference"));
  assert.equal(walletRefundCommandSchema.safeParse(withoutPayoutReference).success, false);
  assert.equal(walletRefundCommandSchema.safeParse({ ...command, payoutReference: "   " }).success, false);
  assert.equal(walletRefundCommandSchema.safeParse({ ...command, reason: "no" }).success, false);
  assert.equal(walletRefundCommandSchema.safeParse({ ...command, expectedPlanHash: "stale" }).success, false);
  const linked = { ...quote, goodsReturnId: 65, receiptId: 22 };
  assert.equal(walletRefundQuoteSchema.safeParse(linked).success, true);
  assert.equal(walletRefundQuoteSchema.safeParse({ ...quote, goodsReturnId: 65 }).success, true);
  assert.equal(walletRefundQuoteSchema.safeParse({ ...quote, receiptId: 22 }).success, true);
  assert.throws(() => previewWalletRefund({ ...quote, goodsReturnId: 65 }), /RETURN_CREDIT_LINK_REQUIRED/);
  assert.throws(() => previewWalletRefund({ ...quote, receiptId: 22 }), /RETURN_CREDIT_LINK_REQUIRED/);
  assert.equal(walletRefundQuoteSchema.safeParse({ ...linked, goodsReturnId: 0 }).success, false);
  assert.deepEqual(walletRefundCommandSchema.parse({ ...command, goodsReturnId: 65, receiptId: 22 }).goodsReturnId, 65);
});

test("preview sends validated exact quote with session credentials and no-store, consuming direct plan", async () => {
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  globalThis.fetch = (async (url, init) => {
    requestedUrl = String(url);
    requestedInit = init;
    return new Response(JSON.stringify(plan), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  assert.deepEqual(await previewWalletRefund(quote), plan);
  assert.equal(requestedUrl, walletRefundPreviewEndpoint);
  assert.equal(requestedInit?.method, "POST");
  assert.equal(requestedInit?.credentials, "include");
  assert.equal(requestedInit?.cache, "no-store");
  assert.deepEqual(JSON.parse(String(requestedInit?.body)), quote);
});

test("linked return attribution is transmitted intact in preview and payout command", async () => {
  const linked = { ...quote, goodsReturnId: 65, receiptId: 22 };
  let sent: unknown;
  globalThis.fetch = (async (_url, init) => {
    sent = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ ...plan, input: linked }), { status: 200 });
  }) as typeof fetch;
  assert.deepEqual((await previewWalletRefund(linked)).input, linked);
  assert.deepEqual(sent, linked);
  const command = { ...linked, sourceId: "stable-linked-source", expectedPlanHash: "a".repeat(64), payoutReference: "BANK-12345",
    evidenceReference: "BANK-DOC-123", reason: "Linked payout after return credit", payoutDocumentConfirmed: true as const };
  globalThis.fetch = (async (_url, init) => {
    sent = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ id: 1, journalId: 2, movementId: 3, duplicate: false }), { status: 201 });
  }) as typeof fetch;
  await postWalletRefund(command);
  assert.equal((sent as typeof command).goodsReturnId, 65);
  assert.equal((sent as typeof command).receiptId, 22);
});

test("post sends one strict confirmed command without retry and returns the direct receipt", async () => {
  const command = { ...quote, sourceId: "stable-payout-source-44", expectedPlanHash: "c".repeat(64), payoutReference: "cash-۸۰۱", evidenceReference: "CASH-VOUCHER-801", reason: "Already paid out in cash", payoutDocumentConfirmed: true as const };
  let calls = 0;
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  globalThis.fetch = (async (url, init) => {
    calls += 1;
    requestedUrl = String(url);
    requestedInit = init;
    return new Response(JSON.stringify({ id: 31, journalId: 207, movementId: 119, duplicate: false, payoutReference: "CASH-801" }), { status: 201, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  const receipt = await postWalletRefund(command);
  assert.deepEqual(receipt, { id: 31, journalId: 207, movementId: 119, duplicate: false, payoutReference: "CASH-801" });
  assert.equal(calls, 1);
  assert.equal(requestedUrl, walletRefundsEndpoint);
  assert.equal(requestedInit?.method, "POST");
  assert.equal(requestedInit?.credentials, "include");
  assert.equal(requestedInit?.cache, "no-store");
  assert.deepEqual(JSON.parse(String(requestedInit?.body)), { ...command, payoutReference: "CASH-801" });
});

const history: WalletRefundHistory = {
  rows: [{
    id: 31, walletId: 44, entryDate: "2025-05-15", channel: "BANK", currency: "USD", baseCurrency: "IQD",
    amount: "75.500", payoutReference: "BANK-123", evidenceReference: "BANK-VOUCHER-557", reason: "Customer payout already documented",
    sourceId: "wallet-refund-stable-44", liabilityBase: "97500.000", fundingBase: "97500.000", fxGain: "0.000", fxLoss: "0.000",
    journalId: 207, movementId: 119,
  }],
  pagination: { page: 2, pageSize: 20, totalRows: 21 },
};

test("history uses guarded company/wallet/page scope, credentials, no-store and the shared snapshot", async () => {
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  let gotSignal: AbortSignal | null | undefined;
  globalThis.fetch = (async (url, init) => {
    requestedUrl = String(url);
    requestedInit = init;
    gotSignal = init?.signal;
    return new Response(JSON.stringify(history), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  const controller = new AbortController();
  assert.deepEqual(await getWalletRefundHistory({ companyId: 12, walletId: 44, page: 2, pageSize: 20 }, controller.signal), history);
  assert.equal(requestedUrl, `${walletRefundHistoryEndpoint}?companyId=12&page=2&pageSize=20&walletId=44`);
  assert.equal(requestedInit?.method, "GET");
  assert.equal(requestedInit?.credentials, "include");
  assert.equal(requestedInit?.cache, "no-store");
  assert.equal(gotSignal, controller.signal);
});

test("history rejects invalid local pagination and out-of-scope server pages or wallets", async () => {
  assert.throws(() => getWalletRefundHistory({ companyId: 0 }), /Invalid wallet payout history company/);
  assert.throws(() => getWalletRefundHistory({ companyId: 12, page: 1.5 }), /Invalid wallet payout history page/);
  assert.throws(() => getWalletRefundHistory({ companyId: 12, pageSize: 101 }), /Invalid wallet payout history page size/);
  globalThis.fetch = (async () => new Response(JSON.stringify({ ...history, pagination: { ...history.pagination, page: 1 } }), { status: 200 })) as typeof fetch;
  await assert.rejects(getWalletRefundHistory({ companyId: 12, walletId: 44, page: 2 }), /outside the requested page scope/);
  globalThis.fetch = (async () => new Response(JSON.stringify({ ...history, rows: history.rows.map(row => ({ ...row, walletId: 45 })) }), { status: 200 })) as typeof fetch;
  await assert.rejects(getWalletRefundHistory({ companyId: 12, walletId: 44, page: 2 }), /invalid or out-of-scope row/);
});

test("history defaults to a company-wide first page when the optional wallet filter is omitted", async () => {
  let requestedUrl = "";
  globalThis.fetch = (async url => {
    requestedUrl = String(url);
    return new Response(JSON.stringify({ rows: [], pagination: { page: 1, pageSize: 20, totalRows: 0 } }), { status: 200 });
  }) as typeof fetch;
  const result = await getWalletRefundHistory({ companyId: 12 });
  assert.deepEqual(result, { rows: [], pagination: { page: 1, pageSize: 20, totalRows: 0 } });
  assert.equal(requestedUrl, `${walletRefundHistoryEndpoint}?companyId=12&page=1&pageSize=20`);
});

test("preview preserves errors and accepts an abort signal", async () => {
  let gotSignal: AbortSignal | null | undefined;
  globalThis.fetch = (async (_url, init) => {
    gotSignal = init?.signal;
    return new Response(JSON.stringify({ message: "Opening evidence missing", code: "FUNDING_OPENING_REQUIRED" }), { status: 409 });
  }) as typeof fetch;
  const controller = new AbortController();
  await assert.rejects(previewWalletRefund(quote, controller.signal), /Opening evidence missing/);
  assert.equal(gotSignal, controller.signal);
});
