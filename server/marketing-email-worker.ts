import nodemailer from "nodemailer";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { customerPool } from "./customer-db";
import { emailStorage } from "./email-storage";

type ClaimedRecipient = {
  id: number; campaign_id: number; email: string; name: string | null;
  normalized_email: string; audience: string; unsubscribe_url: string;
  attempts: number; subject: string; html_content: string; text_content: string | null;
};

/** Claims bounded work and recovers leases with exponential retry backoff. */
export async function claimMarketingEmailBatch(limit = 25) {
  const boundedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const result = await db.execute(sql`
    WITH claimed AS (
      SELECT r.id
      FROM marketing_campaign_recipients r
      JOIN marketing_campaigns c ON c.id = r.campaign_id
      LEFT JOIN marketing_subscribers s ON s.id = r.subscriber_id
      WHERE ((r.status = 'pending' AND (r.next_attempt_at IS NULL OR r.next_attempt_at <= NOW()))
        OR (r.status = 'sending' AND r.claimed_at < NOW() - make_interval(mins => LEAST(60, POWER(2, r.attempts) * 5))))
        AND r.attempts < 5 AND c.status IN ('queued', 'running')
        AND NOT EXISTS (SELECT 1 FROM marketing_suppressions x WHERE x.email = r.normalized_email)
        AND ((r.audience = 'prospect' AND s.status = 'active' AND s.consent = true AND s.verified = true AND s.email = r.normalized_email)
          OR r.audience = 'customer')
      ORDER BY r.id FOR UPDATE SKIP LOCKED LIMIT ${boundedLimit}
    )
    UPDATE marketing_campaign_recipients r
    SET status = 'sending', claimed_at = NOW(), attempts = r.attempts + 1
    FROM claimed WHERE r.id = claimed.id
    RETURNING r.id, r.campaign_id, r.email, r.name, r.normalized_email, r.audience, r.unsubscribe_url, r.attempts
  `);
  const rows = result.rows as Array<{ id: number; audience: string; normalized_email: string; attempts: number }>;
  await db.execute(sql`UPDATE marketing_campaigns c SET status='running', started_at=COALESCE(started_at, NOW()), updated_at=NOW()
    WHERE c.status='queued' AND EXISTS (SELECT 1 FROM marketing_campaign_recipients r WHERE r.campaign_id=c.id AND r.status='sending')`);
  const customerEmails = rows.filter(r => r.audience === "customer").map(r => r.normalized_email);
  const allowed = new Set<string>();
  if (customerEmails.length) {
    const eligible = await customerPool.query(`SELECT lower(trim(email)) AS email FROM customers
      WHERE marketing_consent = true AND is_active = true AND email_verified = true
      AND COALESCE(communication_preference, 'email') = 'email' AND lower(trim(email)) = ANY($1::text[])`, [customerEmails]);
    eligible.rows.forEach(row => allowed.add(row.email));
    for (const row of rows.filter(r => r.audience === "customer" && !allowed.has(r.normalized_email))) {
      await db.execute(sql`UPDATE marketing_campaign_recipients SET status='suppressed', last_error='Consent is no longer active' WHERE id=${row.id} AND status='sending'`);
    }
  }
  return { rows: result.rows.filter((r: any) => r.audience !== "customer" || allowed.has(r.normalized_email)) as ClaimedRecipient[] };
}

async function sendClaimedRecipient(row: ClaimedRecipient) {
  const smtp = await emailStorage.getOtpSmtpSetting();
  if (!smtp) throw new Error("No active SMTP configuration is available");
  const final = await db.execute(sql`
    SELECT r.id, r.email, r.unsubscribe_url, c.subject, c.html_content, c.text_content
    FROM marketing_campaign_recipients r JOIN marketing_campaigns c ON c.id=r.campaign_id
    LEFT JOIN marketing_subscribers s ON s.id=r.subscriber_id
    WHERE r.id=${row.id} AND r.status='sending' AND c.status IN ('queued','running')
      AND NOT EXISTS (SELECT 1 FROM marketing_suppressions x WHERE x.email=r.normalized_email)
      AND (r.audience='customer' OR (r.audience='prospect' AND s.status='active' AND s.consent=true AND s.verified=true AND s.email=r.normalized_email))
  `);
  if (!final.rows.length) {
    const campaign = await db.execute(sql`SELECT status FROM marketing_campaigns WHERE id=${row.campaign_id}`);
    const campaignStatus = (campaign.rows[0] as any)?.status;
    await db.execute(campaignStatus === "paused"
      ? sql`UPDATE marketing_campaign_recipients SET status='pending', last_error='Campaign paused before delivery', claimed_at=NULL WHERE id=${row.id} AND status='sending'`
      : sql`UPDATE marketing_campaign_recipients SET status='suppressed', last_error='Campaign cancelled or consent was revoked', claimed_at=NULL WHERE id=${row.id} AND status='sending'`);
    return { status: "suppressed" as const };
  }
  const message = final.rows[0] as any;
  if (row.audience === "customer") {
    const customer = await customerPool.query(`SELECT 1 FROM customers
      WHERE marketing_consent=true AND is_active=true AND email_verified=true
      AND COALESCE(communication_preference,'email')='email' AND lower(trim(email))=$1`, [row.normalized_email]);
    if (!customer.rowCount) {
      await db.execute(sql`UPDATE marketing_campaign_recipients SET status='suppressed', last_error='Customer consent was revoked' WHERE id=${row.id} AND status='sending'`);
      return { status: "suppressed" as const };
    }
  }
  const transporter = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure ?? smtp.port === 465, auth: { user: smtp.username, pass: smtp.password } });
  const sent = await transporter.sendMail({
    from: `${smtp.fromName} <${smtp.fromEmail}>`, to: message.email,
    subject: message.subject, html: `${message.html_content}<p><a href="${message.unsubscribe_url}">Unsubscribe</a></p>`,
    text: `${message.text_content || ""}\n\nUnsubscribe: ${message.unsubscribe_url}`,
  });
  try {
    await db.execute(sql`UPDATE marketing_campaign_recipients SET status='sent', sent_at=NOW(), provider_message_id=${sent.messageId || null}, claimed_at=NULL, next_attempt_at=NULL, last_error=NULL WHERE id=${row.id} AND status='sending'`);
  } catch (error) {
    try { await db.execute(sql`UPDATE marketing_campaign_recipients SET status='delivery_unknown', delivery_unknown=true, last_error='SMTP accepted message but delivery persistence failed', claimed_at=NULL WHERE id=${row.id}`); } catch { /* persistence unavailable */ }
    throw new Error(`Delivery persistence uncertain: ${String(error)}`);
  }
  return { status: "sent" as const, providerMessageId: sent.messageId };
}

export async function processMarketingEmailBatch(limit = 25) {
  if (process.env.MARKETING_EMAIL_WORKER_ENABLED !== "true") return { enabled: false, sent: 0, failed: 0 };
  const batch = await claimMarketingEmailBatch(limit);
  let sent = 0; let failed = 0;
  for (const row of batch.rows) {
    try {
      const result = await sendClaimedRecipient(row);
      if (result.status === "sent") sent++;
    } catch (error) {
      failed++;
      await db.execute(sql`UPDATE marketing_campaign_recipients SET status=CASE WHEN attempts >= 5 THEN 'failed' ELSE 'pending' END, next_attempt_at=CASE WHEN attempts >= 5 THEN NULL ELSE NOW() + make_interval(mins => LEAST(60, POWER(2, attempts) * 5)) END, last_error=${String(error).slice(0, 1000)}, claimed_at=NULL WHERE id=${row.id} AND status='sending'`);
    }
  }
  await db.execute(sql`UPDATE marketing_campaigns c SET status='completed', completed_at=NOW(), updated_at=NOW()
    WHERE c.status IN ('queued','running')
      AND NOT EXISTS (SELECT 1 FROM marketing_campaign_recipients r WHERE r.campaign_id=c.id AND r.status IN ('pending','sending'))`);
  return { enabled: true, sent, failed };
}

let workerTimer: NodeJS.Timeout | null = null;
export async function startMarketingEmailWorker() {
  if (workerTimer || process.env.MARKETING_EMAIL_WORKER_ENABLED !== "true" ||
      !process.env.MARKETING_PUBLIC_ORIGIN || !process.env.SESSION_SECRET) return false;
  if (!await emailStorage.getOtpSmtpSetting()) return false;
  workerTimer = setInterval(() => { void processMarketingEmailBatch(); }, 30_000);
  void processMarketingEmailBatch();
  return true;
}
export function stopMarketingEmailWorker() {
  if (workerTimer) clearInterval(workerTimer);
  workerTimer = null;
}

export const marketingEmailWorker = { enabled: process.env.MARKETING_EMAIL_WORKER_ENABLED === "true", claim: claimMarketingEmailBatch, process: processMarketingEmailBatch };