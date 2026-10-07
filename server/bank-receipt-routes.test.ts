import { test } from "node:test";
import assert from "node:assert/strict";
import express, { type RequestHandler } from "express";
import { PgDialect } from "drizzle-orm/pg-core";
import { customerOrders } from "@shared/customer-schema";
import { paymentReceipts } from "@shared/order-management-schema";
import { registerBankReceiptRoutes } from "./bank-receipt-routes";
import { issueBankReceiptTicket } from "./bank-receipt-ticket";
import { db } from "./db";

test("isolated bank receipt API: upload, privacy, atomic registration and retry", async (t) => {
  const secret = "isolated-test-secret";
  let order: any = { id: 7, customerId: 123, orderNumber: "M-TEST", paymentMethod: "bank_receipt", status: "pending", paymentStatus: "pending" };
  let receipts: any[] = [];
  let failManagementUpdate = false;
  let failStorage = false;
  let failValidation = false;
  let uploadedFolder = "";
  let storedKey = "";
  const pdf = Buffer.from("%PDF-1.4\nfake test receipt");
  let downloadCount = 0;
  let failDownload = false;
  let missingDownload = false;
  let orderWasLocked = false;
  const dialect = new PgDialect();
  const database: any = {
    select() {
      return { from(table: any) {
        return { where(condition: any) {
          const params = dialect.sqlToQuery(condition).params;
          const rows = table === customerOrders
            ? (params[0] === order.customerId && params.slice(1).some((p) => p === order.id || p === order.orderNumber) ? [order] : [])
            : table === paymentReceipts ? receipts.filter((r) => r.customerOrderId === params[0] && r.receiptUrl === params[1]) : [];
          const value: any = Promise.resolve(rows);
          value.for = (mode: string) => { orderWasLocked = mode === "update"; return value; };
          value.limit = () => value;
          return value;
        } };
      } };
    },
    insert() {
      return { values(data: any) { return { returning: async () => {
        const receipt = { ...data, id: receipts.length + 1 };
        receipts.push(receipt);
        return [receipt];
      } }; } };
    },
    update(table: any) {
      return { set(data: any) { return { where: async () => {
        if (table === customerOrders) Object.assign(order, data);
        else if (failManagementUpdate) throw new Error("simulated management write failure");
      } }; } };
    },
    async transaction(callback: any) {
      const before = structuredClone({ order, receipts });
      try { return await callback(database); }
      catch (error) { order = before.order; receipts = before.receipts; throw error; }
    },
  };
  const auth: RequestHandler = (req, res, next) => {
    // This identity fixture exists only on this isolated test server.
    const customerId = Number(req.headers["x-test-customer"]);
    if (!customerId) return void res.status(401).json({ success: false });
    req.session = { customerId } as any;
    next();
  };
  const staff: RequestHandler = (req, res, next) => {
    if (req.headers["x-test-staff"] === "authorized") return next();
    res.status(401).json({ success: false });
  };
  const app = express();
  app.use(express.json());
  // Downloads also need the test identity; the main app uses its real session middleware.
  app.use((req, _res, next) => {
    req.session = { customerId: Number(req.headers["x-test-customer"]) } as any;
    next();
  });
  registerBankReceiptRoutes(app, auth, staff, {
    database,
    signingSecret: secret,
    validateFile: async () => ({ isValid: !failValidation, errors: failValidation ? ["security-rejected"] : [] }),
    storage: {
      uploadPrivateFile: async (_buffer, _name, _type, folder) => {
        uploadedFolder = folder || "";
        return failStorage ? { success: false } : { success: true, key: `${folder}/123456789-0123456789abcdef.pdf` };
      },
      getFile: async (key) => {
        storedKey = key;
        downloadCount++;
        if (failDownload) throw new Error("Synthetic storage failure");
        if (missingDownload) return null;
        if (key.endsWith(".png")) return Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6zcAAAAAASUVORK5CYII=", "base64",
        );
        return pdf;
      },
    },
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const request = (url: string, init: RequestInit = {}, customerId = 123) =>
    fetch(base + url, { ...init, headers: { "x-test-customer": String(customerId), ...init.headers } });
  const upload = (bytes: string | Uint8Array = "%PDF-1.4\nfake test receipt") => {
    const body = new FormData();
    body.append("file", new Blob([bytes], { type: "application/pdf" }), "bank.pdf");
    return request("/api/payment/receipt-file", { method: "POST", body });
  };
  const evidence = { customerId: 123, receiptUrl: "/files/bank-receipts/123/123456789-0123456789abcdef.pdf",
    originalFileName: "bank.pdf", fileSize: 30, mimeType: "application/pdf" };
  const submit = (overrides: object = {}, customerId = 123) => request("/api/payment/upload-receipt", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      orderId: "M-TEST", receiptUrl: evidence.receiptUrl, uploadToken: issueBankReceiptTicket(evidence, secret), ...overrides,
    }),
  }, customerId);

  await t.test("guests cannot upload", async () => {
    assert.equal((await request("/api/payment/receipt-file", { method: "POST" }, 0)).status, 401);
  });
  await t.test("real file signature, not declared MIME, controls accepted formats", async () => {
    assert.equal((await upload("not-a-pdf")).status, 415);
    const response = await upload();
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.fileSize, 26);
    assert.equal(result.mimeType, "application/pdf");
    assert.equal(result.receiptUrl, evidence.receiptUrl);
    assert.ok(result.uploadToken);
    assert.equal(uploadedFolder, "receipts/customer-123");
  });
  await t.test("size, security and storage failures return explicit errors", async () => {
    assert.equal((await upload(new Uint8Array(5 * 1024 * 1024 + 1))).status, 413);
    failValidation = true;
    assert.equal((await upload()).status, 422);
    failValidation = false;
    failStorage = true;
    assert.equal((await upload()).status, 503);
    failStorage = false;
  });
  await t.test("customer download is private and other customers cannot access it", async () => {
    const url = evidence.receiptUrl;
    const readsBefore = downloadCount;
    assert.equal((await request(url, {}, 124)).status, 401);
    assert.equal((await request(url, {}, 0)).status, 401);
    assert.equal(downloadCount, readsBefore);
    const response = await request(url, { redirect: "error", credentials: "include" });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.headers.get("content-type"), "application/pdf");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.match(response.headers.get("content-disposition") || "", /^inline;/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
    assert.equal(storedKey, "receipts/customer-123/123456789-0123456789abcdef.pdf");
  });
  await t.test("authenticated HEAD verifies the receipt without a cross-origin redirect", async () => {
    const response = await request(evidence.receiptUrl, { method: "HEAD", redirect: "error", credentials: "include" });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "application/pdf");
    assert.equal(response.headers.get("Content-Length"), String(pdf.length));
    assert.equal((await response.arrayBuffer()).byteLength, 0);
    assert.equal(response.headers.get("Location"), null);
  });
  await t.test("authorized staff can inspect private receipts on the app origin", async () => {
    const response = await fetch(base + evidence.receiptUrl, {
      redirect: "error", headers: { "x-test-staff": "authorized" },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
  });
  await t.test("image receipts preserve their detected media type", async () => {
    const response = await request(evidence.receiptUrl.replace(/\.pdf$/, ".png"), { redirect: "error" });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "image/png");
  });
  await t.test("invalid keys and file paths never reach private storage", async () => {
    const readsBefore = downloadCount;
    assert.equal((await request("/files/bank-receipts/123/not-a-receipt.pdf")).status, 404);
    assert.equal(downloadCount, readsBefore);
  });
  await t.test("missing files and storage failures report unavailability without leaking a URL", async () => {
    missingDownload = true;
    assert.equal((await request(evidence.receiptUrl)).status, 503);
    missingDownload = false;
    failDownload = true;
    const response = await request(evidence.receiptUrl);
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /storage.example|Synthetic storage failure|X-Amz/i);
    failDownload = false;
  });
  await t.test("unverified, foreign-owner and wrong-order submissions cannot change orders", async () => {
    assert.equal((await submit({ uploadToken: "" })).status, 400);
    assert.equal((await submit({}, 124)).status, 400);
    assert.equal((await submit({ orderId: "OTHER-ORDER" })).status, 404);
    assert.equal(order.paymentStatus, "pending");
    assert.equal(receipts.length, 0);
  });
  await t.test("receipt and order mutations roll back together if workflow update fails", async () => {
    failManagementUpdate = true;
    assert.equal((await submit()).status, 500);
    assert.equal(order.paymentStatus, "pending");
    assert.equal(order.receiptPath, undefined);
    assert.equal(receipts.length, 0);
    failManagementUpdate = false;
  });
  await t.test("numeric order IDs work, preserve actual metadata and never mark payment paid", async () => {
    assert.equal((await submit({ orderId: 7 })).status, 200);
    assert.equal(orderWasLocked, true);
    assert.equal(order.paymentStatus, "receipt_uploaded");
    assert.equal(order.status, "pending");
    assert.equal(order.receiptPath, evidence.receiptUrl);
    assert.equal(receipts[0].fileSize, evidence.fileSize);
    assert.equal(receipts[0].mimeType, evidence.mimeType);
  });
  await t.test("repeated submission is idempotent", async () => {
    assert.equal((await submit()).status, 200);
    assert.equal(receipts.length, 1);
  });
  await t.test("closed orders cannot be moved back into financial review", async () => {
    order.paymentStatus = "paid";
    assert.equal((await submit()).status, 409);
    order.paymentStatus = "pending";
    order.status = "cancelled";
    assert.equal((await submit()).status, 409);
  });
});
