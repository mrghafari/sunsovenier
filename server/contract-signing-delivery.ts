import { createHash } from "node:crypto";
import { pool } from "./db";
import { getAwsS3Service } from "./aws-s3-service";
import { sendContractMail } from "./contract-signing-email";
import { SigningError } from "./contract-signing-domain";

export async function signedPdf(row: any): Promise<Buffer> {
  const buffer = await getAwsS3Service().getFile(row.pdf_key);
  if (!buffer) throw new SigningError("STORAGE_UNAVAILABLE", 503);
  if (createHash("sha256").update(buffer).digest("hex") !== row.pdf_sha256)
    throw new SigningError("DOCUMENT_INTEGRITY_FAILED", 503);
  return buffer;
}
export async function deliverSignedCopy(id: string): Promise<void> {
  const claim = await pool.query(`UPDATE electronic_contract_signatures
    SET email_status='sending',email_attempts=email_attempts+1,last_email_attempt_at=now(),email_error=NULL
    WHERE id=$1 AND (email_status IN ('pending','failed')
      OR (email_status='sending' AND last_email_attempt_at<now()-interval '10 minutes'))
    RETURNING *`, [id]);
  const row = claim.rows[0];
  if (!row) return;
  try {
    const doc = row.document_snapshot;
    await sendContractMail("copy", row.customer_email, doc.language, {
      customerName: row.signer_name, contractNumber: doc.number, signerName: row.signer_name,
      signedAt: new Date(row.signed_at).toISOString(), signatureId: row.id, documentHash: row.version_hash,
    }, { filename: `${doc.number.replace(/[^A-Za-z0-9_-]/g, "_")}-signed.pdf`, content: await signedPdf(row) }, row.id);
    await pool.query(`UPDATE electronic_contract_signatures SET email_status='accepted',
      email_accepted_at=now(),next_email_attempt_at=NULL,email_error=NULL WHERE id=$1`, [id]);
  } catch (error) {
    const reason = error instanceof SigningError ? error.code : "EMAIL_DELIVERY_FAILED";
    await pool.query(`UPDATE electronic_contract_signatures SET email_status='failed',email_error=$2,
      next_email_attempt_at=CASE WHEN email_attempts<5 THEN now()+interval '5 minutes' ELSE NULL END WHERE id=$1`, [id, reason]);
  }
}
let draining = false;
export async function drainSignedContractEmails() {
  if (draining) return;
  draining = true;
  try {
    const pending = await pool.query(`SELECT id FROM electronic_contract_signatures
      WHERE (email_status IN ('pending','failed') AND email_attempts<5 AND next_email_attempt_at<=now())
         OR (email_status='sending' AND last_email_attempt_at<now()-interval '10 minutes')
      ORDER BY signed_at LIMIT 10`);
    for (const row of pending.rows) await deliverSignedCopy(row.id);
  } catch { console.warn("Signed contract email queue processing failed; the next run will retry."); }
  finally { draining = false; }
}
export function startSignedContractEmailWorker() {
  const timer = setInterval(() => void drainSignedContractEmails(), 60000);
  timer.unref();
}
