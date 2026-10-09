import type { Express, Request, RequestHandler, Response } from "express";
import { z } from "zod";
import { pool } from "./db";
import { emailService } from "./email-service";
import { getAwsS3Service } from "./aws-s3-service";
import { ensureContractSigningSchema } from "./contract-signing-schema";
import { customerDocuments, signingCustomer, createSigningChallenge, completeSigning } from "./contract-signing-service";
import { SigningError, completionInput, signatureMetadata } from "./contract-signing-domain";
import { contractTemplateNames } from "./contract-signing-email";
import { deliverSignedCopy, signedPdf, startSignedContractEmailWorker } from "./contract-signing-delivery";
import { attachmentContentDisposition } from "./signed-contract-documents";

function customerId(req: Request) {
  const session = req.session as any;
  const id = Number(session?.crmCustomerId ?? session?.customerId);
  if (!Number.isSafeInteger(id) || id <= 0) throw new SigningError("CUSTOMER_AUTH_REQUIRED", 401);
  return id;
}
const sameOrigin: RequestHandler = (req, res, next) => {
  const origin = req.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== req.get("host"))
        return res.status(403).json({ success: false, code: "ORIGIN_NOT_ALLOWED", message: "Origin not allowed." });
    } catch { return res.status(403).json({ success: false, message: "Invalid origin." }); }
  }
  next();
};
function failure(res: Response, error: unknown) {
  const status = error instanceof SigningError ? error.status : 500;
  const code = error instanceof SigningError ? error.code : "SIGNING_FAILED";
  if (!(error instanceof SigningError)) console.error("Contract signing request failed.", error instanceof Error ? error.name : "Unknown error");
  return res.status(status).json({ success: false, code, message: code });
}
async function settings() {
  const config = await pool.query("SELECT sender_id FROM legal_contract_signing_settings WHERE id=1");
  const templates = await pool.query(`SELECT name,language,is_active AS "isActive" FROM email_templates
    WHERE name=ANY($1::text[]) ORDER BY name,language`, [Object.values(contractTemplateNames)]);
  return { success: true, senderId: config.rows[0]?.sender_id ?? null,
    senders: await emailService.listInvoiceSenders(), templates: templates.rows,
    storageConfigured: getAwsS3Service().isPrivateStorageConfigured() };
}
export async function registerContractSigningRoutes(app: Express, management: RequestHandler) {
  await ensureContractSigningSchema(pool);
  app.get("/api/customers/contract-signing", async (req, res) => {
    try {
      const id = customerId(req);
      await signingCustomer(id);
      const [documents, signatures] = await Promise.all([
        customerDocuments(id), pool.query("SELECT * FROM electronic_contract_signatures WHERE customer_id=$1 ORDER BY signed_at DESC", [id]),
      ]);
      return res.json({ success: true, documents: documents.map(document => {
        const history = signatures.rows.filter(row => row.document_key === document.key);
        const matching = history.find(row => row.version_hash === document.versionHash);
        return { ...document, canSign: document.canSign && !matching,
          signature: matching ? signatureMetadata(matching) : null, signatures: history.map(row => signatureMetadata(row)) };
      }) });
    } catch (error) { return failure(res, error); }
  });
  app.post("/api/customers/contract-signing/challenge", sameOrigin, async (req, res) => {
    try { return res.json({ success: true, ...await createSigningChallenge(customerId(req), req.body) }); }
    catch (error) { return failure(res, error); }
  });
  app.post("/api/customers/contract-signing/complete", sameOrigin, async (req, res) => {
    try {
      const input = completionInput.safeParse(req.body);
      if (!input.success) throw new SigningError("INVALID_OTP_INPUT");
      const signed = await completeSigning(customerId(req), input.data.challengeId, input.data.code,
        { ip: req.ip || "", userAgent: req.get("user-agent") || "" });
      if (signed.email_status === "pending") await deliverSignedCopy(signed.id);
      const updated = (await pool.query("SELECT * FROM electronic_contract_signatures WHERE id=$1", [signed.id])).rows[0];
      return res.json({ success: true, signature: signatureMetadata(updated) });
    } catch (error) { return failure(res, error); }
  });
  app.get("/api/admin/legal-affairs/signing-settings", management, async (_req, res) => {
    try { return res.json(await settings()); } catch (error) { return failure(res, error); }
  });
  app.put("/api/admin/legal-affairs/signing-settings", management, sameOrigin, async (req, res) => {
    try {
      const input = z.object({ senderId: z.number().int().positive().nullable() }).strict().safeParse(req.body);
      if (!input.success) throw new SigningError("INVALID_SENDER");
      if (input.data.senderId !== null && !(await emailService.listInvoiceSenders()).some(sender => sender.id === input.data.senderId))
        throw new SigningError("SENDER_UNAVAILABLE", 409);
      await pool.query("UPDATE legal_contract_signing_settings SET sender_id=$1,updated_at=now() WHERE id=1", [input.data.senderId]);
      return res.json(await settings());
    } catch (error) { return failure(res, error); }
  });
  app.get("/api/admin/legal-affairs/signatures", management, async (_req, res) => {
    try {
      const rows = await pool.query(`SELECT s.*,concat_ws(' ',c.first_name,c.last_name) AS customer_name
        FROM electronic_contract_signatures s JOIN crm_customers c ON c.id=s.customer_id ORDER BY s.signed_at DESC LIMIT 200`);
      return res.json({ success: true, signatures: rows.rows.map(row => signatureMetadata(row, true)) });
    } catch (error) { return failure(res, error); }
  });
  for (const admin of [false, true]) {
    const prefix = admin ? "/api/admin/legal-affairs" : "/api/customers/contract-signing";
    const auth: RequestHandler[] = admin ? [management] : [];
    app.get(`${prefix}/signatures/:id/download`, ...auth, async (req, res) => {
      try {
        if (!z.string().uuid().safeParse(req.params.id).success) throw new SigningError("INVALID_SIGNATURE_ID");
        const id = admin ? null : customerId(req);
        if (id !== null) await signingCustomer(id);
        const row = (await pool.query(`SELECT * FROM electronic_contract_signatures WHERE id=$1
          AND ($2::integer IS NULL OR customer_id=$2)`, [req.params.id, id])).rows[0];
        if (!row) throw new SigningError("SIGNATURE_NOT_FOUND", 404);
        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", attachmentContentDisposition(`${row.document_snapshot.number}-signed.pdf`));
        return res.send(await signedPdf(row));
      } catch (error) { return failure(res, error); }
    });
    app.post(`${prefix}/signatures/:id/resend`, ...auth, sameOrigin, async (req, res) => {
      try {
        if (!z.string().uuid().safeParse(req.params.id).success) throw new SigningError("INVALID_SIGNATURE_ID");
        const id = admin ? null : customerId(req);
        if (id !== null) await signingCustomer(id);
        const row = (await pool.query(`SELECT * FROM electronic_contract_signatures WHERE id=$1
          AND ($2::integer IS NULL OR customer_id=$2)`, [req.params.id, id])).rows[0];
        if (!row) throw new SigningError("SIGNATURE_NOT_FOUND", 404);
        const reset = await pool.query(`UPDATE electronic_contract_signatures
          SET email_status='pending',email_error=NULL,next_email_attempt_at=now()
          WHERE id=$1 AND email_status!='sending'
            AND (last_email_attempt_at IS NULL OR last_email_attempt_at<now()-interval '60 seconds') RETURNING id`, [row.id]);
        if (!reset.rowCount) throw new SigningError("EMAIL_RATE_LIMIT", 429);
        await deliverSignedCopy(row.id);
        const updated = (await pool.query("SELECT * FROM electronic_contract_signatures WHERE id=$1", [row.id])).rows[0];
        return res.json({ success: true, signature: signatureMetadata(updated, admin) });
      } catch (error) { return failure(res, error); }
    });
  }
  startSignedContractEmailWorker();
}
