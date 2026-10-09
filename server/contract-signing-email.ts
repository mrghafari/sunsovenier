import nodemailer from "nodemailer";
import { pool } from "./db";
import { SigningError, type SigningLanguage } from "./contract-signing-domain";

export const contractTemplateNames = { otp: "Contract signing OTP", copy: "Signed contract copy" } as const;
const copy = {
  fa: {
    otpSubject: "کد تأیید امضای قرارداد {{contractNumber}}",
    otp: "{{customerName}} گرامی،\nکد تأیید امضای قرارداد {{contractNumber}}: {{code}}\nاین کد تا {{expiresMinutes}} دقیقه معتبر است. اگر درخواست امضا نداده‌اید، کد را در اختیار کسی قرار ندهید.",
    copySubject: "نسخهٔ امضاشدهٔ قرارداد {{contractNumber}}",
    copy: "{{customerName}} گرامی،\nقرارداد {{contractNumber}} توسط {{signerName}} در {{signedAt}} امضا شد. نسخهٔ ثبت‌شده به این ایمیل پیوست شده است.\nشناسهٔ امضا: {{signatureId}}\nهش متن توافق: {{documentHash}}",
  },
  ar: {
    otpSubject: "رمز تأكيد توقيع العقد {{contractNumber}}",
    otp: "عزيزي {{customerName}}،\nرمز تأكيد توقيع العقد {{contractNumber}}: {{code}}\nالرمز صالح لمدة {{expiresMinutes}} دقائق. إذا لم تطلب التوقيع، فلا تشارك الرمز.",
    copySubject: "نسخة موقعة من العقد {{contractNumber}}",
    copy: "عزيزي {{customerName}}،\nوقع {{signerName}} العقد {{contractNumber}} في {{signedAt}}. النسخة المسجلة مرفقة بهذا البريد.\nمعرف التوقيع: {{signatureId}}\nبصمة نص العقد: {{documentHash}}",
  },
  en: {
    otpSubject: "Signing code for agreement {{contractNumber}}",
    otp: "Dear {{customerName}},\nYour signing code for agreement {{contractNumber}} is {{code}}.\nIt expires in {{expiresMinutes}} minutes. If you did not request this signature, do not share the code.",
    copySubject: "Signed agreement {{contractNumber}}",
    copy: "Dear {{customerName}},\n{{contractNumber}} was signed by {{signerName}} at {{signedAt}}. The recorded signed copy is attached.\nSignature ID: {{signatureId}}\nAgreement SHA-256: {{documentHash}}",
  },
  tr: {
    otpSubject: "{{contractNumber}} sözleşmesi için imza kodu",
    otp: "Sayın {{customerName}},\n{{contractNumber}} sözleşmesi için imza kodunuz: {{code}}\nKod {{expiresMinutes}} dakika geçerlidir. İmzayı siz istemediyseniz kodu paylaşmayın.",
    copySubject: "İmzalanmış sözleşme {{contractNumber}}",
    copy: "Sayın {{customerName}},\n{{contractNumber}} sözleşmesi {{signerName}} tarafından {{signedAt}} tarihinde imzalandı. Kayıtlı imzalı kopya ektedir.\nİmza kimliği: {{signatureId}}\nSözleşme SHA-256: {{documentHash}}",
  },
};
export function contractEmailDefaults() {
  return Object.entries(copy).flatMap(([language, content]) => (["otp", "copy"] as const).map(kind => ({
    name: contractTemplateNames[kind], language,
    subject: kind === "otp" ? content.otpSubject : content.copySubject,
    text: content[kind],
    html: `<div lang="${language}" dir="${language === "fa" || language === "ar" ? "rtl" : "ltr"}" style="font-family:Tahoma,Arial,sans-serif;white-space:pre-line;line-height:1.8">${content[kind]}</div>`,
    variables: kind === "otp" ? ["customerName", "contractNumber", "code", "expiresMinutes"]
      : ["customerName", "contractNumber", "signerName", "signedAt", "signatureId", "documentHash"],
  })));
}
export function fillContractEmail(template: string, variables: Record<string, string>, html = false): string {
  const escape = (value: string) => value.replace(/[&<>"']/g, char =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key) => {
    if (!(key in variables)) throw new SigningError("TEMPLATE_VARIABLE_MISSING", 503);
    return html ? escape(variables[key]) : variables[key];
  });
}
export async function signingSender() {
  const { rows } = await pool.query(`SELECT s.id,s.host,s.port,s.secure,s.username,s.password,s.from_name,s.from_email
    FROM legal_contract_signing_settings l
    JOIN smtp_settings s ON s.id=l.sender_id LEFT JOIN email_categories c ON c.id=s.category_id
    WHERE l.id=1 AND s.is_active=true AND (s.category_id IS NULL OR c.is_active=true)`);
  if (!rows[0]) throw new SigningError("SENDER_UNAVAILABLE", 503);
  return rows[0];
}
export async function sendContractMail(kind: "otp" | "copy", to: string, language: SigningLanguage,
  variables: Record<string, string>, attachment?: { filename: string; content: Buffer }, signatureId?: string) {
  const sender = await signingSender();
  const template = await pool.query(`SELECT id,subject,html_content,text_content FROM email_templates
    WHERE name=$1 AND language=$2 AND is_active=true ORDER BY id LIMIT 1`, [contractTemplateNames[kind], language]);
  if (!template.rows[0]) throw new SigningError("TEMPLATE_UNAVAILABLE", 503);
  const row = template.rows[0];
  const transporter = nodemailer.createTransport({
    host: sender.host, port: sender.port, secure: sender.secure === true || Number(sender.port) === 465,
    requireTLS: true, auth: { user: sender.username, pass: sender.password },
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
  });
  try {
    const result = await transporter.sendMail({
      from: { name: sender.from_name, address: sender.from_email }, to,
      subject: fillContractEmail(row.subject, variables).replace(/[\r\n]/g, " "),
      html: fillContractEmail(row.html_content, variables, true),
      text: row.text_content ? fillContractEmail(row.text_content, variables) : undefined,
      ...(signatureId ? { messageId: `<contract-signature-${signatureId}@${sender.from_email.split("@")[1]}>` } : {}),
      attachments: attachment ? [{ ...attachment, contentType: "application/pdf" }] : [],
    });
    if (!result.accepted?.some(value => String(value).toLowerCase() === to.toLowerCase()))
      throw new SigningError("EMAIL_NOT_ACCEPTED", 503);
  } catch (error) {
    if (error instanceof SigningError) throw error;
    throw new SigningError("EMAIL_DELIVERY_FAILED", 503);
  } finally { transporter.close(); }
  // Counters are secondary; SMTP acceptance must not become failure if logging fails.
  await pool.query("UPDATE email_templates SET usage_count=COALESCE(usage_count,0)+1,last_used=now() WHERE id=$1", [row.id])
    .catch(() => console.warn("Contract email template usage counter could not be updated."));
}
