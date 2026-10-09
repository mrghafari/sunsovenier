import { createHash, randomInt, randomUUID } from "node:crypto";
import { pool } from "./db";
import { getAwsS3Service } from "./aws-s3-service";
import { createSignedContractPdf } from "./contract-signing-pdf";
import { sendContractMail, signingSender } from "./contract-signing-email";
import {
  challengeInput, signingDocument, SigningError, otpHash, otpMatches,
  maskedEmail, signingConsent, type SigningDocument,
} from "./contract-signing-domain";

type Queryable = { query: (sql: string, values?: any[]) => Promise<any> };
export async function customerDocuments(customerId: number, client: Queryable = pool): Promise<SigningDocument[]> {
  const contracts = await client.query("SELECT * FROM shop_contracts WHERE customer_id=$1 ORDER BY id DESC", [customerId]);
  const addenda = await client.query(`SELECT a.* FROM shop_contract_addenda a
    JOIN shop_contracts c ON c.id=a.parent_contract_id WHERE c.customer_id=$1 ORDER BY a.sequence`, [customerId]);
  return contracts.rows.flatMap((row: any) => [
    signingDocument(row),
    ...addenda.rows.filter((a: any) => Number(a.parent_contract_id) === Number(row.id)).map((a: any) => signingDocument(row, a)),
  ]);
}
export async function signingCustomer(id: number, client: Queryable = pool) {
  const result = await client.query(`SELECT id,email,first_name,last_name,preferred_language FROM crm_customers
    WHERE id=$1 AND is_active=true`, [id]);
  const customer = result.rows[0];
  if (!customer) throw new SigningError("CUSTOMER_UNAVAILABLE", 403);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new SigningError("CUSTOMER_EMAIL_REQUIRED", 409);
  return customer;
}
function secret() {
  if (!process.env.SESSION_SECRET) throw new SigningError("SIGNING_UNAVAILABLE", 503);
  return process.env.SESSION_SECRET;
}
async function requireDocument(customerId: number, key: string, hash: string, client: Queryable) {
  const document = (await customerDocuments(customerId, client)).find(row => row.key === key);
  if (!document) throw new SigningError("DOCUMENT_NOT_FOUND", 404);
  if (!document.canSign) throw new SigningError("DOCUMENT_NOT_SIGNABLE", 409);
  if (document.versionHash !== hash) throw new SigningError("DOCUMENT_CHANGED", 409);
  return document;
}
export async function createSigningChallenge(customerId: number, body: unknown) {
  const ink = (body as any)?.strokes;
  if (!Array.isArray(ink) || ink.length > 100 ||
      ink.some(stroke => !Array.isArray(stroke) || stroke.length > 3000) ||
      ink.reduce((sum, stroke) => sum + stroke.length, 0) > 6000)
    throw new SigningError("INVALID_SIGNATURE_INPUT");
  const parsed = challengeInput.safeParse(body);
  if (!parsed.success) throw new SigningError("INVALID_SIGNATURE_INPUT");
  if (!getAwsS3Service().isPrivateStorageConfigured()) throw new SigningError("STORAGE_UNAVAILABLE", 503);
  await signingSender();
  const input = parsed.data;
  const id = randomUUID(), code = String(randomInt(0, 1000000)).padStart(6, "0");
  const expires = new Date(Date.now() + 10 * 60000);
  const client = await pool.connect();
  let customer: any, document: SigningDocument;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(61832,$1)", [customerId]);
    customer = await signingCustomer(customerId, client);
    const recent = await client.query(`SELECT count(*)::int AS hourly,
      COALESCE(bool_or(created_at>now()-interval '60 seconds'),false) AS cooldown
      FROM contract_signing_challenges WHERE customer_id=$1 AND created_at>now()-interval '1 hour'`, [customerId]);
    if (recent.rows[0].cooldown || recent.rows[0].hourly >= 5) throw new SigningError("OTP_RATE_LIMIT", 429);
    document = await requireDocument(customerId, input.documentKey, input.versionHash, client);
    const signed = await client.query(`SELECT id FROM electronic_contract_signatures
      WHERE customer_id=$1 AND document_key=$2 AND version_hash=$3`, [customerId, document.key, document.versionHash]);
    if (signed.rowCount) throw new SigningError("ALREADY_SIGNED", 409);
    await client.query(`UPDATE contract_signing_challenges SET consumed_at=now()
      WHERE customer_id=$1 AND document_key=$2 AND consumed_at IS NULL`, [customerId, document.key]);
    await client.query(`INSERT INTO contract_signing_challenges
      (id,customer_id,contract_id,addendum_id,document_key,version_hash,document_snapshot,
       signer_name,customer_email,strokes,consent_text,otp_hash,expires_at)
      VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10::jsonb,$11,$12,$13)`,
    [id, customerId, document.contractId, document.addendumId, document.key, document.versionHash,
      JSON.stringify(document), input.signerName, customer.email, JSON.stringify(input.strokes),
      signingConsent[document.language], otpHash(id, code, secret()), expires]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
  // Never return/log the code or make an unsent challenge usable.
  await sendContractMail("otp", customer.email, document!.language, {
    customerName: [customer.first_name, customer.last_name].filter(Boolean).join(" "),
    contractNumber: document!.number, code, expiresMinutes: "10",
  });
  await pool.query("UPDATE contract_signing_challenges SET email_sent_at=now() WHERE id=$1", [id]);
  return { challengeId: id, expiresAt: expires.toISOString(), maskedEmail: maskedEmail(customer.email) };
}

export async function completeSigning(customerId: number, challengeId: string, code: string, audit: { ip: string; userAgent: string }) {
  const client = await pool.connect();
  let key: string | null = null, committed = false;
  try {
    await client.query("BEGIN");
    // Same lock order as contract edits: parent contract before challenge.
    const target = await client.query(`SELECT contract_id FROM contract_signing_challenges WHERE id=$1 AND customer_id=$2`, [challengeId, customerId]);
    if (!target.rows[0]) throw new SigningError("CHALLENGE_NOT_FOUND", 404);
    await client.query("SELECT id FROM shop_contracts WHERE id=$1 FOR UPDATE", [target.rows[0].contract_id]);
    const challenge = (await client.query(`SELECT * FROM contract_signing_challenges
      WHERE id=$1 AND customer_id=$2 FOR UPDATE`, [challengeId, customerId])).rows[0];
    const existing = await client.query(`SELECT * FROM electronic_contract_signatures
      WHERE customer_id=$1 AND document_key=$2 AND version_hash=$3`, [customerId, challenge.document_key, challenge.version_hash]);
    if (existing.rows[0]) { await client.query("COMMIT"); committed = true; return existing.rows[0]; }
    if (challenge.consumed_at || !challenge.email_sent_at || new Date(challenge.expires_at).getTime() <= Date.now())
      throw new SigningError("OTP_EXPIRED", 409);
    if (challenge.attempts >= 5) throw new SigningError("OTP_ATTEMPTS_EXCEEDED", 429);
    if (!otpMatches(challengeId, code, challenge.otp_hash, secret())) {
      await client.query("UPDATE contract_signing_challenges SET attempts=attempts+1 WHERE id=$1", [challengeId]);
      await client.query("COMMIT"); committed = true;
      throw new SigningError("OTP_INVALID");
    }
    // Lock the recipient as well: profile edits must not change the verified email mid-signature.
    await client.query("SELECT id FROM crm_customers WHERE id=$1 FOR SHARE", [customerId]);
    const customer = await signingCustomer(customerId, client);
    if (customer.email !== challenge.customer_email) throw new SigningError("CUSTOMER_EMAIL_CHANGED", 409);
    const document = await requireDocument(customerId, challenge.document_key, challenge.version_hash, client);
    const id = randomUUID(), signedAt = new Date();
    const pdf = await createSignedContractPdf(document, {
      id, signerName: challenge.signer_name, email: customer.email, signedAt,
      readAt: new Date(challenge.created_at), consent: challenge.consent_text, strokes: challenge.strokes,
    });
    key = `private/electronic-contracts/${document.contractId}/${id}.pdf`;
    if (!await getAwsS3Service().uploadPrivateFileToKey(pdf, key, "application/pdf"))
      throw new SigningError("STORAGE_UNAVAILABLE", 503);
    const result = await client.query(`INSERT INTO electronic_contract_signatures
      (id,customer_id,contract_id,addendum_id,document_key,version_hash,document_snapshot,signer_name,
       customer_email,strokes,consent_text,read_confirmed_at,signed_at,request_ip,user_agent,pdf_key,pdf_sha256)
      VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
    [id, customerId, document.contractId, document.addendumId, document.key, document.versionHash,
      JSON.stringify(document), challenge.signer_name, customer.email, JSON.stringify(challenge.strokes),
      challenge.consent_text, challenge.created_at, signedAt, audit.ip.slice(0, 100), audit.userAgent.slice(0, 500),
      key, createHash("sha256").update(pdf).digest("hex")]);
    await client.query("UPDATE contract_signing_challenges SET consumed_at=now() WHERE id=$1", [challengeId]);
    await client.query("COMMIT"); committed = true; key = null;
    return result.rows[0];
  } catch (error) {
    if (!committed) await client.query("ROLLBACK");
    if (key) await getAwsS3Service().deleteFile(key).catch(() => console.warn("An uncommitted contract PDF could not be cleaned up."));
    throw error;
  } finally { client.release(); }
}
