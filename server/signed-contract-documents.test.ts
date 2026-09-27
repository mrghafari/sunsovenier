import assert from "node:assert/strict";
import { test } from "node:test";
import {
  attachmentContentDisposition,
  documentMetadata,
  insertDocumentWithContractLock,
  isDocumentForContract,
  uploaderFromSession,
  validateSignedContractPdf,
} from "./signed-contract-documents";

const samplePdf = Buffer.from("%PDF-1.7\nsample pdf body");

test("signed contract PDF validation checks filename, MIME, signature, size, and digest", () => {
  const validated = validateSignedContractPdf({
    originalname: "Executed contract.pdf",
    mimetype: "application/pdf",
    buffer: samplePdf,
    size: samplePdf.length,
  });
  assert.equal(validated.fileName, "Executed contract.pdf");
  assert.equal(validated.size, samplePdf.length);
  assert.match(validated.sha256, /^[0-9a-f]{64}$/);
  assert.throws(() => validateSignedContractPdf({
    originalname: "../contract.pdf", mimetype: "application/pdf", buffer: samplePdf, size: samplePdf.length,
  }), /filename/i);
  assert.throws(() => validateSignedContractPdf({
    originalname: "contract.pdf", mimetype: "text/plain", buffer: samplePdf, size: samplePdf.length,
  }), /MIME/i);
  assert.throws(() => validateSignedContractPdf({
    originalname: "contract.pdf", mimetype: "application/pdf", buffer: Buffer.from("not pdf"), size: 7,
  }), /signature/i);
});

test("document association check prevents cross-contract downloads", () => {
  assert.equal(isDocumentForContract({ contract_id: 42 }, 42), true);
  assert.equal(isDocumentForContract({ contract_id: 43 }, 42), false);
  assert.equal(isDocumentForContract(null, 42), false);
});

test("custom-user uploader UUID is accepted and preserved in returned metadata", () => {
  const customUserId = "b4d9b4c5-a357-4fd9-a5bd-f6fd0a0e61c7";
  assert.deepEqual(uploaderFromSession({ customUserId }), {
    adminId: null,
    customUserId,
  });
  assert.equal(uploaderFromSession({ customUserId: "not-a-uuid" }), null);
  assert.deepEqual(documentMetadata({
    id: 1,
    contract_id: 42,
    file_name: "Executed contract.pdf",
    file_size: 25,
    sha256: "a".repeat(64),
    uploaded_at: "2026-01-01T00:00:00Z",
    uploaded_by_admin_id: null,
    uploaded_by_custom_user_id: customUserId,
  }).uploadedBy, { type: "custom", userId: customUserId });
});

test("signed-document insert locks the parent contract until commit", async () => {
  const calls: string[] = [];
  let released = false;
  const inserted = {
    id: 5,
    contract_id: 42,
    file_name: "Executed contract.pdf",
    file_size: 25,
    sha256: "a".repeat(64),
    uploaded_at: new Date("2026-01-01T00:00:00Z"),
    uploaded_by_admin_id: 9,
    uploaded_by_custom_user_id: null,
  };
  const fakePool = {
    async connect() {
      return {
        async query(sql: string) {
          calls.push(sql);
          if (sql.startsWith("SELECT id FROM shop_contracts")) return { rowCount: 1, rows: [{ id: 42 }] };
          if (sql.startsWith("INSERT INTO signed_contract_documents")) return { rowCount: 1, rows: [inserted] };
          return { rowCount: null, rows: [] };
        },
        release() { released = true; },
      };
    },
  };
  const result = await insertDocumentWithContractLock(fakePool, [
    42, "Executed contract.pdf", 25, "a".repeat(64), "private/shop-contracts/42/id.pdf", 9, null,
  ]);
  assert.equal(result, inserted);
  assert.equal(calls[0], "BEGIN");
  assert.match(calls[1], /shop_contracts WHERE id = \$1 FOR UPDATE/);
  assert.match(calls[2], /^INSERT INTO signed_contract_documents/);
  assert.equal(calls[3], "COMMIT");
  assert.equal(released, true);
});

test("attachment disposition is download-safe and prevents header injection", () => {
  const disposition = attachmentContentDisposition('قرارداد "نهایی".pdf\r\nX-Evil: yes');
  assert.match(disposition, /^attachment; filename="/);
  assert.match(disposition, /filename\*=UTF-8''/);
  assert.equal(/[\r\n]/.test(disposition), false);
  assert.equal(disposition.includes("\r\nX-Evil"), false);
});

test("S3 signed GET URL includes the requested attachment disposition", async () => {
  const { AwsS3Service } = await import("./aws-s3-service");
  const service = new AwsS3Service({
    accessKeyId: "test-access-key",
    secretAccessKey: "test-secret-key",
    region: "us-east-1",
    bucketName: "private-contract-documents",
  } as any);
  const disposition = attachmentContentDisposition("Executed contract.pdf");
  const signed = await service.getSignedUrl(
    "private/shop-contracts/42/document.pdf",
    300,
    { responseContentDisposition: disposition },
  );
  assert.ok(signed);
  assert.equal(new URL(signed).searchParams.get("response-content-disposition"), disposition);
});