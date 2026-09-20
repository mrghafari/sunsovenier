import { pool } from './db';
import { UniversalEmailService } from './universal-email-service';
import { createSmsService } from './sms-service';

export type ReminderMethod = 'email' | 'sms' | 'both';
export const SUPPORTED_REMINDER_VARIABLES = [
  'customer_name', 'order_number', 'deadline_date', 'days_before',
  'hours_remaining', 'total_amount', 'currency',
] as const;

/** Deliberately supports both syntaxes used by legacy and new templates. */
export function renderReminderTemplate(template: string, values: Record<string, string>): string {
  const rendered = template.replace(/\{\{([a-zA-Z0-9_]+)\}\}|\{([a-zA-Z0-9_]+)\}/g,
    (_match, doubleKey, singleKey) => values[doubleKey || singleKey] ?? _match);
  const unresolved = rendered.match(/\{\{?[a-zA-Z0-9_]+\}?\}/g);
  if (unresolved?.length) throw new Error(`Unresolved template variables: ${[...new Set(unresolved)].join(', ')}`);
  return rendered;
}

export function channelsForMethod(method: string): ('email' | 'sms')[] {
  if (method === 'both') return ['email', 'sms'];
  if (method === 'email' || method === 'sms') return [method];
  throw new Error('notificationMethod must be email, sms, or both');
}
export function localDateAndHour(now: Date, timezone: string): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

export function validReminderSchedule(input: any): { ok: true } | { ok: false; error: string } {
  const integer = (v: any) => typeof v === 'number' && Number.isInteger(v);
  if (!integer(input.reminderHour) || input.reminderHour < 0 || input.reminderHour > 23) return { ok: false, error: 'reminderHour must be an integer from 0 to 23' };
  if (!integer(input.daysBefore) || input.daysBefore < 0 || input.daysBefore > 30) return { ok: false, error: 'daysBefore must be an integer from 0 to 30' };
  if (!['email', 'sms', 'both'].includes(input.notificationMethod)) return { ok: false, error: 'Invalid notification method' };
  if (!integer(input.priority) || input.priority < 1) return { ok: false, error: 'priority must be a positive integer' };
  return { ok: true };
}

interface Schedule {
  id: number; reminder_hour: number; days_before: number; notification_method: ReminderMethod;
  priority: number; email_template_id?: number; sms_template_id?: number; sender_category_key?: string;
}
interface Order {
  id: number; order_number: string; recipient_name?: string; recipient_phone?: string;
  email?: string; phone?: string; customer_name?: string; payment_deadline: Date;
  total_amount: string | number; currency: string; preferred_language?: string;
}

export interface ReminderDeliveryResult {
  success: boolean;
  channel: 'email' | 'sms';
  recipient?: string;
  error?: string;
}

export class ProformaReminderService {
  private static instance: ProformaReminderService;
  static getInstance() { return this.instance || (this.instance = new ProformaReminderService()); }

  /** Additive migration only. The old customer_email/sent rows remain readable. */
  async initializeLogTable(): Promise<void> {
    await pool.query(`INSERT INTO shop_settings (
      setting_key, setting_value, setting_type, display_name, description,
      category, is_public, validation_rule, default_value, updated_at
    ) VALUES (
      'proforma_reminder_timezone', 'Asia/Baghdad', 'string',
      'Proforma Reminder Timezone', 'Timezone used to evaluate reminder dates and hours',
      'payment', false, 'iana_timezone', 'Asia/Baghdad', NOW()
    ) ON CONFLICT (setting_key) DO NOTHING`);
    await pool.query(`CREATE TABLE IF NOT EXISTS proforma_reminder_logs (
      id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL, schedule_id INTEGER NOT NULL,
      customer_email TEXT, sent_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
    await pool.query(`ALTER TABLE proforma_reminder_schedule ADD COLUMN IF NOT EXISTS sender_category_key TEXT`);
    await pool.query(`ALTER TABLE proforma_reminder_logs
      ADD COLUMN IF NOT EXISTS recipient TEXT,
      ADD COLUMN IF NOT EXISTS notification_type TEXT NOT NULL DEFAULT 'email',
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent',
      ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
      ADD COLUMN IF NOT EXISTS error_message TEXT`);
    // Replace the old channel-blind constraint. This does not delete log data.
    await pool.query(`DROP INDEX IF EXISTS idx_proforma_reminder_logs_daily`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_proforma_reminder_logs_daily_channel
      ON proforma_reminder_logs (order_id, schedule_id, DATE(sent_at), notification_type)`);
    // Legacy rows may reference removed templates or have no sender. Disable them
    // rather than repeatedly reporting success/failure or choosing a sender silently.
    await pool.query(`UPDATE proforma_reminder_schedule s
      SET is_active = false, updated_at = NOW()
      WHERE s.is_active = true AND (
        (s.notification_method IN ('email','both') AND (
          s.email_template_id IS NULL OR s.sender_category_key IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM email_templates e
            WHERE e.id=NULLIF(s.email_template_id, '')::int AND e.is_active=true
          )
          OR NOT EXISTS (
            SELECT 1 FROM email_categories c
            JOIN smtp_settings smtp ON smtp.category_id=c.id
            WHERE c.category_key=s.sender_category_key AND c.is_active=true AND smtp.is_active=true
              AND smtp.from_email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
          )
        ))
        OR (s.notification_method IN ('sms','both') AND (
          s.sms_template_id IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM sms_templates t
            WHERE t.id=NULLIF(s.sms_template_id, '')::int AND t.is_active=true
          )
        ))
      )`);
  }

  private async schedules(): Promise<Schedule[]> {
    const r = await pool.query(`SELECT id, reminder_hour, days_before, notification_method,
      priority, email_template_id, sms_template_id, sender_category_key
      FROM proforma_reminder_schedule WHERE is_active = true ORDER BY priority, days_before`);
    return r.rows;
  }

  private async orders(schedule: Schedule): Promise<Order[]> {
    const setting = await pool.query(`SELECT setting_value FROM shop_settings WHERE setting_key='proforma_reminder_timezone' LIMIT 1`);
    const timezone = setting.rows[0]?.setting_value || 'Asia/Baghdad';
    const local = localDateAndHour(new Date(), timezone);
    if (local.hour !== schedule.reminder_hour) return [];
    const r = await pool.query(`SELECT co.id, co.order_number,
      COALESCE(om.recipient_name, co.recipient_name, c.first_name || ' ' || c.last_name, co.guest_name) AS recipient_name,
      COALESCE(om.recipient_phone, co.recipient_phone, c.phone) AS recipient_phone,
      COALESCE(c.email, co.guest_email) AS email,
      c.phone AS phone,
      COALESCE(c.first_name || ' ' || c.last_name, co.guest_name, 'مشتری گرامی') AS customer_name,
      om.payment_grace_period_end AS payment_deadline, co.total_amount, COALESCE(co.currency, 'IQD') AS currency,
      COALESCE(c.preferred_language, 'fa') AS preferred_language
      FROM customer_orders co JOIN order_management om ON om.customer_order_id = co.id
      LEFT JOIN customers c ON c.id = co.customer_id
      WHERE co.payment_method = 'bank_transfer_grace'
        AND om.payment_grace_period_end IS NOT NULL
        AND om.current_status IN ('finance_pending','pending_payment','payment_grace_period')
        AND COALESCE(co.payment_status, 'pending') IN ('pending','unpaid','awaiting_payment')
        AND COALESCE(co.status, 'pending') NOT IN ('cancelled','deleted','paid','receipt_uploaded','processing','shipped','delivered')
        AND COALESCE(om.payment_receipt_url, '') = ''
        AND (om.payment_grace_period_end AT TIME ZONE 'UTC' AT TIME ZONE $1)::date = ($2::date + $3::int)`,
      [timezone, local.date, schedule.days_before]);
    return r.rows;
  }

  private async template(table: 'email_templates' | 'sms_templates', id: number): Promise<any> {
    const r = await pool.query(`SELECT * FROM ${table} WHERE id = $1 AND is_active = true`, [id]);
    if (!r.rows.length) throw new Error(`Active ${table} template ${id} not found`);
    return r.rows[0];
  }

  private async log(orderId: number, scheduleId: number, channel: string, recipient: string | null, status: string, providerId?: string, error?: string) {
    await pool.query(`INSERT INTO proforma_reminder_logs
      (order_id,schedule_id,customer_email,recipient,notification_type,status,provider_message_id,error_message)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (order_id,schedule_id,(DATE(sent_at)),notification_type)
      DO UPDATE SET recipient=EXCLUDED.recipient, customer_email=EXCLUDED.customer_email,
        status=EXCLUDED.status, provider_message_id=EXCLUDED.provider_message_id, error_message=EXCLUDED.error_message, sent_at=NOW()`,
      [orderId, scheduleId, recipient || '', recipient, channel, status, providerId || null, error || null]);
  }

  private async already(orderId: number, scheduleId: number, channel: string) {
    const r = await pool.query(`SELECT 1 FROM proforma_reminder_logs
      WHERE order_id=$1 AND schedule_id=$2 AND notification_type=$3 AND sent_at::date=CURRENT_DATE
        AND status IN ('accepted','sent') LIMIT 1`,
      [orderId, scheduleId, channel]);
    return (r.rowCount || 0) > 0;
  }

  private async send(order: Order, schedule: Schedule, channel: 'email' | 'sms'): Promise<ReminderDeliveryResult> {
    const recipient = channel === 'email' ? order.email : (order.recipient_phone || order.phone);
    if (!recipient) {
      const error = `Missing ${channel} recipient`;
      await this.log(order.id, schedule.id, channel, null, 'failed', undefined, error);
      return { success: false, channel, error };
    }
    try {
      const values = {
        customer_name: order.customer_name || 'مشتری گرامی', order_number: order.order_number,
        deadline_date: new Date(order.payment_deadline).toLocaleDateString('fa-IR'),
        days_before: String(schedule.days_before),
        hours_remaining: String(Math.max(0, Math.round((new Date(order.payment_deadline).getTime() - Date.now()) / 3600000))),
        total_amount: Number(order.total_amount).toLocaleString('fa-IR'), currency: order.currency || 'IQD',
      };
      if (channel === 'email') {
        if (!schedule.email_template_id || !schedule.sender_category_key) throw new Error('Email template and sender category are required');
        const t = await this.template('email_templates', schedule.email_template_id);
        const accepted = await UniversalEmailService.sendEmail({ categoryKey: schedule.sender_category_key, to: [recipient], subject: renderReminderTemplate(t.subject, values), html: renderReminderTemplate(t.html_content, values), text: renderReminderTemplate(t.text_content || t.html_content.replace(/<[^>]+>/g, ''), values), language: order.preferred_language });
        if (!accepted) throw new Error('Email provider rejected message');
        await this.log(order.id, schedule.id, channel, recipient, 'accepted');
      } else {
        if (!schedule.sms_template_id) throw new Error('SMS template is required');
        const t = await this.template('sms_templates', schedule.sms_template_id);
        const result = await (await createSmsService()).sendSms({ to: recipient, message: renderReminderTemplate(t.template_content, values) });
        if (!result.success) throw new Error(result.error || 'SMS provider rejected message');
        await this.log(order.id, schedule.id, channel, recipient, 'accepted', result.messageId);
      }
      return { success: true, channel, recipient };
    } catch (e: any) {
      const error = e?.message || String(e);
      await this.log(order.id, schedule.id, channel, recipient, 'failed', undefined, error);
      return { success: false, channel, recipient, error };
    }
  }

  async sendManualReminder(orderManagementId: number, channel: 'email' | 'sms'): Promise<ReminderDeliveryResult> {
    const scheduleResult = await pool.query(`SELECT id, reminder_hour, days_before, notification_method,
      priority, email_template_id, sms_template_id, sender_category_key
      FROM proforma_reminder_schedule
      WHERE is_active = true
        AND (notification_method = $1 OR notification_method = 'both')
      ORDER BY priority, days_before
      LIMIT 1`, [channel]);
    if (!scheduleResult.rows.length) {
      return { success: false, channel, error: `No active ${channel} reminder schedule is configured` };
    }

    const orderResult = await pool.query(`SELECT co.id, co.order_number,
      COALESCE(om.recipient_name, co.recipient_name, c.first_name || ' ' || c.last_name, co.guest_name) AS recipient_name,
      COALESCE(om.recipient_phone, co.recipient_phone, c.phone) AS recipient_phone,
      COALESCE(c.email, co.guest_email) AS email,
      c.phone AS phone,
      COALESCE(c.first_name || ' ' || c.last_name, co.guest_name, 'مشتری گرامی') AS customer_name,
      om.payment_grace_period_end AS payment_deadline, co.total_amount,
      COALESCE(co.currency, 'IQD') AS currency, COALESCE(c.preferred_language, 'fa') AS preferred_language
      FROM order_management om
      JOIN customer_orders co ON co.id = om.customer_order_id
      LEFT JOIN customers c ON c.id = co.customer_id
      WHERE om.id = $1
        AND co.payment_method = 'bank_transfer_grace'
        AND om.payment_grace_period_end IS NOT NULL
        AND om.current_status IN ('finance_pending','pending_payment','payment_grace_period')
        AND COALESCE(co.payment_status, 'pending') IN ('pending','unpaid','awaiting_payment')
        AND COALESCE(co.status, 'pending') NOT IN ('cancelled','deleted','paid','receipt_uploaded','processing','shipped','delivered')
        AND COALESCE(om.payment_receipt_url, '') = ''
      LIMIT 1`, [orderManagementId]);
    if (!orderResult.rows.length) {
      return { success: false, channel, error: 'Eligible unpaid grace-period order not found' };
    }

    return this.send(orderResult.rows[0], scheduleResult.rows[0], channel);
  }

  async processReminders(): Promise<void> {
    for (const schedule of await this.schedules()) {
      for (const order of await this.orders(schedule)) {
        for (const channel of channelsForMethod(schedule.notification_method)) {
          if (!(await this.already(order.id, schedule.id, channel))) await this.send(order, schedule, channel);
        }
      }
    }
  }
}

export const proformaReminderService = ProformaReminderService.getInstance();