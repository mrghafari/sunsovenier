import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const signingLanguages = ["fa", "ar", "en", "tr"] as const;
export type SigningLanguage = typeof signingLanguages[number];
export type Ink = Array<Array<{ x: number; y: number }>>;
export type SigningDocument = {
  key: string; contractId: number; addendumId: number | null; number: string;
  type: "contract" | "addendum"; terms: string; language: SigningLanguage;
  versionHash: string; canSign: boolean;
};
export class SigningError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
export const challengeInput = z.object({
  documentKey: z.string().regex(/^(contract|addendum):[1-9]\d*$/),
  versionHash: z.string().regex(/^[a-f0-9]{64}$/),
  signerName: z.string().trim().min(3).max(150).refine(value => !/[\u0000-\u001f<>]/.test(value)),
  consent: z.literal(true),
  strokes: z.array(z.array(z.object({
    x: z.number().finite().min(0).max(1), y: z.number().finite().min(0).max(1),
  }).strict()).min(2).max(3000)).min(1).max(100),
}).strict().superRefine((value, context) => {
  const points = value.strokes.reduce((n, stroke) => n + stroke.length, 0);
  const length = value.strokes.reduce((sum, stroke) => sum + stroke.slice(1).reduce((distance, point, i) =>
    distance + Math.hypot(point.x - stroke[i].x, point.y - stroke[i].y), 0), 0);
  if (points > 6000 || length < 0.1) context.addIssue({ code: "custom", path: ["strokes"], message: "Draw a complete signature." });
});
export const completionInput = z.object({
  challengeId: z.string().uuid(),
  code: z.string().transform(value => value.trim().replace(/[۰-۹٠-٩]/g, char =>
    String(char.charCodeAt(0) - (char >= "۰" ? 0x06f0 : 0x0660)))).pipe(z.string().regex(/^\d{6}$/)),
}).strict();

export function documentLanguage(language: unknown, text: string): SigningLanguage {
  if (signingLanguages.includes(language as SigningLanguage)) return language as SigningLanguage;
  const arabic = (text.match(/\p{Script=Arabic}/gu) || []).length;
  const latin = (text.match(/\p{Script=Latin}/gu) || []).length;
  return arabic > latin ? "fa" : "en";
}
export function signingDocument(contract: any, addendum?: any): SigningDocument {
  // The mutable parent reflects the latest addendum; sign the original stored
  // agreement separately instead of labelling the latest terms as the original.
  const snapshot = addendum?.contract_snapshot ?? contract.original_contract_snapshot ?? contract;
  const terms = snapshot.terms ?? contract.terms ?? "";
  const number = addendum?.number ?? contract.number;
  const language = documentLanguage(snapshot.draftData?.language ?? snapshot.draft_data?.language, terms);
  const key = `${addendum ? "addendum" : "contract"}:${addendum?.id ?? contract.id}`;
  const hash = createHash("sha256").update(JSON.stringify({ key, number, terms, language })).digest("hex");
  return {
    key, contractId: Number(contract.id), addendumId: addendum ? Number(addendum.id) : null,
    type: addendum ? "addendum" : "contract", number, terms, language, versionHash: hash,
    canSign: contract.is_active === true && !contract.ended_at && Boolean(terms.trim()),
  };
}
export function otpHash(id: string, code: string, secret: string): string {
  return createHmac("sha256", secret).update(`${id}:${code}`).digest("hex");
}
export function otpMatches(id: string, code: string, expected: string, secret: string): boolean {
  const actual = Buffer.from(otpHash(id, code, secret), "hex");
  const saved = Buffer.from(expected, "hex");
  return actual.length === saved.length && timingSafeEqual(actual, saved);
}
export function maskedEmail(email: string): string {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}***@${domain}`;
}
export const signingConsent = {
  fa: "متن کامل این قرارداد را خوانده‌ام و شرایط آن را می‌پذیرم. تأیید می‌کنم اختیار امضای این قرارداد را دارم و امضای الکترونیکی ثبت‌شده متعلق به من است.",
  ar: "قرأت نص هذا العقد كاملاً وأوافق على شروطه. أؤكد أنني مخول بتوقيع هذا العقد وأن التوقيع الإلكتروني المسجل يخصني.",
  en: "I have read the complete agreement and accept its terms. I confirm I am authorized to sign it and that the recorded electronic signature is mine.",
  tr: "Sözleşmenin tamamını okudum ve şartlarını kabul ediyorum. İmzalamaya yetkili olduğumu ve kaydedilen elektronik imzanın bana ait olduğunu onaylıyorum.",
};
export function signatureMetadata(row: any, admin = false) {
  return {
    id: row.id, number: row.document_snapshot.number, signerName: row.signer_name,
    signedAt: row.signed_at, emailStatus: row.email_status, emailError: row.email_error,
    downloadUrl: `${admin ? "/api/admin/legal-affairs" : "/api/customers/contract-signing"}/signatures/${row.id}/download`,
    ...(admin ? { contractId: Number(row.contract_id), documentType: row.document_snapshot.type,
      customerName: row.customer_name, customerEmail: row.customer_email } : {}),
  };
}
