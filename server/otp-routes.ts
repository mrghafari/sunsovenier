import { Router } from 'express';
import { db } from './db';
import { customersOtp, crmCustomers, customerLoginOtps } from '../shared/schema';
import { emailTemplates, customerVerificationSettings } from '../shared/customer-schema';
import { eq, and, gt, or, sql, desc } from 'drizzle-orm';
import { SmsService } from './sms-service';
import { normalizeSmsLanguage, selectLocalizedSms } from './sms-language';
import { WhatsAppService } from './whatsapp-service';
import nodemailer from 'nodemailer';
import { EmailStorage } from './email-storage';
import bcrypt from 'bcryptjs';
import { randomInt, randomUUID } from 'node:crypto';

const router = Router();
const emailStorage = new EmailStorage();

// Helper: Get verification settings from database
async function getVerificationSettings() {
  const settings = await db.select().from(customerVerificationSettings).limit(1);
  return settings[0] || {
    smsVerificationEnabled: false,
    emailVerificationEnabled: true,
    whatsappVerificationEnabled: false,
    requireBothVerifications: false,
    allowSkipVerification: false,
  };
}

// Helper: Generate 4-digit OTP code
function generateOtpCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Helper: Send OTP via WhatsApp
async function sendOtpWhatsApp(phone: string, code: string): Promise<boolean> {
  try {
    const whatsappService = new WhatsAppService({
      isEnabled: true,
      provider: 'ultramsg', // or your configured provider
    });

    const message = `کد تایید شما: ${code}\nYour verification code: ${code}\n\nاین کد ظرف 5 دقیقه منقضی خواهد شد.\nThis code expires in 5 minutes.`;

    const result = await whatsappService.sendMessage({
      to: phone,
      message,
    });

    console.log(`📱 [OTP WhatsApp] Sent to ${phone}:`, result.success);
    return result.success;
  } catch (error) {
    console.error('❌ [OTP WhatsApp] Error:', error);
    return false;
  }
}

// Helper: Send OTP via SMS
async function sendOtpSms(phone: string, code: string, preferredLanguage?: unknown): Promise<boolean> {
  try {
    const smsService = new SmsService({
      isEnabled: true,
      provider: 'infobip', // or your configured provider
      codeLength: 6,
      codeExpiry: 300,
      maxAttempts: 3,
      rateLimitMinutes: 5,
    });

    const language = normalizeSmsLanguage(preferredLanguage);
    const message = selectLocalizedSms({
      en: `Verification code: ${code}\nExpires in 5 minutes.`,
      fa: `کد تأیید شما: ${code}\nاین کد تا ۵ دقیقه معتبر است.`,
      ar: `رمز التحقق الخاص بك: ${code}\nتنتهي صلاحية الرمز خلال 5 دقائق.`,
      tr: `Doğrulama kodunuz: ${code}\nBu kod 5 dakika içinde geçerliliğini yitirir.`,
    }, language)!;

    const result = await smsService.sendSms({
      to: phone,
      message,
      code,
    });

    console.log(`📱 [OTP SMS] Sent to ${phone}:`, result.success);
    return result.success;
  } catch (error) {
    console.error('❌ [OTP SMS] Error:', error);
    return false;
  }
}

// Helper: Send OTP via Email
async function sendOtpEmail(email: string, code: string, name?: string): Promise<boolean> {
  try {
    // Get SMTP settings for OTP from database
    const smtpSetting = await emailStorage.getOtpSmtpSetting();
    
    if (!smtpSetting) {
      console.error('❌ [OTP Email] No SMTP settings configured for OTP');
      return false;
    }

    // Load OTP email template from database
    const templates = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.category, 'authentication'),
          eq(emailTemplates.isActive, true)
        )
      )
      .limit(1);
    
    const template = templates[0];

    if (!template) {
      console.error('❌ [OTP Email] No OTP email template found in database');
      return false;
    }

    // Simple template variable replacement
    const variables = {
      code,
      customerName: name || '',
      year: new Date().getFullYear().toString(),
    };

    let html = template.htmlContent;
    let subject = template.subject;

    // Replace all variables in format {{variableName}}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, value);
      subject = subject.replace(regex, value);
    });

    // Handle conditional blocks {{#if customerName}}...{{else}}...{{/if}}
    if (name) {
      html = html.replace(/{{#if customerName}}(.*?){{else}}.*?{{\/if}}/gs, '$1');
    } else {
      html = html.replace(/{{#if customerName}}.*?{{else}}(.*?){{\/if}}/gs, '$1');
    }

    // Create SMTP transporter with database settings
    const transporter = nodemailer.createTransport({
      host: smtpSetting.host,
      port: smtpSetting.port,
      secure: smtpSetting.secure,
      auth: {
        user: smtpSetting.username,
        pass: smtpSetting.password,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"${smtpSetting.fromName}" <${smtpSetting.fromEmail}>`,
      to: email,
      subject,
      html,
    });

    console.log(`📧 [OTP Email] Sent to ${email} using ${smtpSetting.fromEmail}:`, info.messageId);
    return true;
  } catch (error) {
    console.error('❌ [OTP Email] Error:', error);
    return false;
  }
}

function normalizeLoginIdentifier(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

async function saveCustomerSession(req: any, customer: typeof crmCustomers.$inferSelect) {
  req.session.adminId = undefined;
  req.session.customUserId = undefined;
  req.session.customerId = customer.id;
  req.session.customerEmail = customer.email;
  req.session.crmCustomerId = customer.id;
  req.session.isAuthenticated = true;
  await new Promise<void>((resolve, reject) => {
    req.session.save((error: Error | null) => error ? reject(error) : resolve());
  });
}

router.post('/api/customers/login-otp/request', async (req, res) => {
  try {
    const identifier = normalizeLoginIdentifier(req.body.identifier);
    if (identifier.length < 3) {
      return res.status(400).json({ success: false, message: 'ایمیل یا شماره موبایل معتبر وارد کنید' });
    }

    const isEmail = identifier.includes('@');
    const normalizedPhone = normalizePhone(identifier);
    const customer = await db.query.crmCustomers.findFirst({
      where: isEmail
        ? sql`lower(${crmCustomers.email}) = ${identifier}`
        : sql`regexp_replace(coalesce(${crmCustomers.phone}, ''), '[^0-9]', '', 'g') = ${normalizedPhone}`,
    });

    if (!customer || customer.isActive === false) {
      return res.json({
        success: true,
        challengeId: randomUUID(),
        message: 'اگر حساب فعالی وجود داشته باشد، کد ورود ارسال می‌شود',
      });
    }

    const recentOtp = await db.query.customerLoginOtps.findFirst({
      where: and(
        eq(customerLoginOtps.customerId, customer.id),
        gt(customerLoginOtps.createdAt, new Date(Date.now() - 60_000)),
      ),
      orderBy: [desc(customerLoginOtps.createdAt)],
    });
    if (recentOtp) {
      return res.status(429).json({
        success: false,
        message: 'لطفاً یک دقیقه تا درخواست کد جدید صبر کنید',
      });
    }

    const channel = isEmail ? 'email' : 'sms';
    if ((channel === 'email' && customer.emailEnabled === false) ||
        (channel === 'sms' && customer.smsEnabled === false)) {
      return res.status(400).json({ success: false, message: 'این روش ورود برای حساب شما فعال نیست' });
    }

    const code = randomInt(100000, 1000000).toString();
    const challengeId = randomUUID();
    const codeHash = await bcrypt.hash(code, 10);
    await db.insert(customerLoginOtps).values({
      challengeId,
      customerId: customer.id,
      channel,
      codeHash,
      expiresAt: new Date(Date.now() + 5 * 60_000),
    });

    const sent = channel === 'email'
      ? await sendOtpEmail(customer.email, code, customer.firstName)
      : await sendOtpSms(customer.phone || identifier, code, customer.preferredLanguage);
    if (!sent) {
      await db.delete(customerLoginOtps).where(eq(customerLoginOtps.challengeId, challengeId));
      return res.status(503).json({ success: false, message: 'ارسال کد ورود ناموفق بود. دوباره تلاش کنید' });
    }

    return res.json({
      success: true,
      challengeId,
      channel,
      message: 'کد ورود ارسال شد',
    });
  } catch (error) {
    console.error('Customer login OTP request failed:', error);
    return res.status(500).json({ success: false, message: 'خطا در ارسال کد ورود' });
  }
});

router.post('/api/customers/login-otp/verify', async (req, res) => {
  try {
    const challengeId = String(req.body.challengeId || '');
    const code = String(req.body.code || '').trim();
    const otp = await db.query.customerLoginOtps.findFirst({
      where: and(
        eq(customerLoginOtps.challengeId, challengeId),
        eq(customerLoginOtps.used, false),
      ),
    });

    if (!otp || otp.expiresAt < new Date() || otp.attempts >= 5) {
      return res.status(400).json({ success: false, message: 'کد ورود نامعتبر یا منقضی شده است' });
    }

    const valid = await bcrypt.compare(code, otp.codeHash);
    if (!valid) {
      await db.update(customerLoginOtps)
        .set({ attempts: otp.attempts + 1 })
        .where(eq(customerLoginOtps.id, otp.id));
      return res.status(400).json({ success: false, message: 'کد ورود صحیح نیست' });
    }

    const [consumed] = await db.update(customerLoginOtps)
      .set({ used: true })
      .where(and(eq(customerLoginOtps.id, otp.id), eq(customerLoginOtps.used, false)))
      .returning();
    if (!consumed) {
      return res.status(400).json({ success: false, message: 'این کد قبلاً استفاده شده است' });
    }

    const customer = await db.query.crmCustomers.findFirst({
      where: and(eq(crmCustomers.id, otp.customerId), eq(crmCustomers.isActive, true)),
    });
    if (!customer) {
      return res.status(401).json({ success: false, message: 'حساب مشتری فعال نیست' });
    }

    await saveCustomerSession(req, customer);
    return res.json({
      success: true,
      message: 'ورود موفق',
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
      },
    });
  } catch (error) {
    console.error('Customer login OTP verification failed:', error);
    return res.status(500).json({ success: false, message: 'خطا در تأیید کد ورود' });
  }
});

// POST /api/customers/send-otp
router.post('/api/customers/send-otp', async (req, res) => {
  try {
    const { phone, email, registrationData } = req.body;

    if (!phone || !email) {
      return res.status(400).json({
        success: false,
        message: 'Phone and email are required',
      });
    }

    // Check if email or phone already exists in database
    const existingCustomer = await db.query.crmCustomers.findFirst({
      where: or(
        eq(crmCustomers.email, email),
        eq(crmCustomers.phone, phone)
      ),
    });

    if (existingCustomer) {
      const duplicateField = existingCustomer.email === email ? 'email' : 'phone';
      const duplicateValue = duplicateField === 'email' ? email : phone;
      
      console.log(`⚠️ [OTP] Registration blocked - ${duplicateField} already exists: ${duplicateValue}`);
      
      return res.status(409).json({
        success: false,
        message: duplicateField === 'email' 
          ? 'این ایمیل قبلاً ثبت شده است. اگر رمز عبور خود را فراموش کرده‌اید، از گزینه «فراموشی رمز عبور» استفاده کنید.'
          : 'این شماره تلفن قبلاً ثبت شده است. اگر رمز عبور خود را فراموش کرده‌اید، از گزینه «فراموشی رمز عبور» استفاده کنید.',
        duplicateField,
        duplicateValue,
      });
    }

    // Check rate limiting (max 1 OTP every 1 minute per phone/email)
    const recentOtp = await db.query.customersOtp.findFirst({
      where: and(
        eq(customersOtp.phone, phone),
        eq(customersOtp.email, email),
        gt(customersOtp.lastSentAt, new Date(Date.now() - 60000)) // Last 1 minute
      ),
    });

    if (recentOtp) {
      const secondsRemaining = Math.ceil((60000 - (Date.now() - new Date(recentOtp.lastSentAt).getTime())) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${secondsRemaining} seconds before requesting a new code`,
        retryAfter: secondsRemaining,
      });
    }

    // Generate OTP code
    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP to database
    const [otpRecord] = await db.insert(customersOtp).values({
      phone,
      email,
      code,
      expiresAt,
      attempts: 0,
      verified: false,
      lastSentAt: new Date(),
      createdAt: new Date(),
      registrationData: registrationData || null,
    }).returning();

    console.log(`🔐 [OTP] Generated code for ${phone}/${email}: ${code}`);

    // Get verification settings from database
    const verificationSettings = await getVerificationSettings();
    console.log(`⚙️ [OTP] Verification settings - SMS: ${verificationSettings.smsVerificationEnabled}, Email: ${verificationSettings.emailVerificationEnabled}, WhatsApp: ${verificationSettings.whatsappVerificationEnabled}`);

    // Send OTP only via enabled channels
    const sendPromises: Promise<boolean>[] = [];
    const channelNames: string[] = [];

    if (verificationSettings.whatsappVerificationEnabled) {
      sendPromises.push(sendOtpWhatsApp(phone, code));
      channelNames.push('whatsapp');
    }
    if (verificationSettings.smsVerificationEnabled) {
      sendPromises.push(sendOtpSms(phone, code, registrationData?.preferredLanguage));
      channelNames.push('sms');
    }
    if (verificationSettings.emailVerificationEnabled) {
      sendPromises.push(sendOtpEmail(email, code, registrationData?.firstName));
      channelNames.push('email');
    }

    // If no channels are enabled, allow skip if configured
    if (sendPromises.length === 0) {
      if (verificationSettings.allowSkipVerification) {
        // Skip verification and create customer directly
        console.log(`⚠️ [OTP] No verification channels enabled, skipping verification`);
        return res.json({
          success: true,
          message: 'Verification skipped - no channels enabled',
          skipVerification: true,
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'No verification channels are enabled. Please contact support.',
        });
      }
    }

    const results = await Promise.allSettled(sendPromises);
    
    const sentVia: { whatsapp?: boolean; sms?: boolean; email?: boolean } = {};
    let anySuccess = false;

    results.forEach((result, index) => {
      const success = result.status === 'fulfilled' && result.value;
      const channel = channelNames[index];
      sentVia[channel as keyof typeof sentVia] = success;
      if (success) anySuccess = true;
    });

    console.log(`📤 [OTP] Delivery results:`, sentVia);

    // At least one enabled channel must succeed
    if (!anySuccess) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
      });
    }

    return res.json({
      success: true,
      message: 'Verification code sent successfully',
      expiresAt: otpRecord.expiresAt,
      sentVia,
    });

  } catch (error) {
    console.error('❌ [OTP] Send error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send verification code',
    });
  }
});

// POST /api/customers/verify-otp
router.post('/api/customers/verify-otp', async (req, res) => {
  try {
    const { phone, email, code } = req.body;

    if (!phone || !email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Phone, email, and code are required',
      });
    }

    // Find OTP record
    const otpRecord = await db.query.customersOtp.findFirst({
      where: and(
        eq(customersOtp.phone, phone),
        eq(customersOtp.email, email),
        eq(customersOtp.verified, false)
      ),
      orderBy: (customersOtp, { desc }) => [desc(customersOtp.createdAt)],
    });

    if (!otpRecord) {
      return res.status(404).json({
        success: false,
        message: 'No verification code found for this phone/email',
      });
    }

    // Check if expired
    if (new Date() > otpRecord.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new one.',
        expired: true,
      });
    }

    // Check max attempts
    if (otpRecord.attempts >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new code.',
        maxAttemptsExceeded: true,
      });
    }

    // Verify code
    if (otpRecord.code !== code) {
      // Increment attempts
      await db.update(customersOtp)
        .set({ attempts: otpRecord.attempts + 1 })
        .where(eq(customersOtp.id, otpRecord.id));

      return res.status(400).json({
        success: false,
        message: 'Invalid verification code',
        attemptsRemaining: 3 - (otpRecord.attempts + 1),
      });
    }

    // Mark as verified
    await db.update(customersOtp)
      .set({ verified: true })
      .where(eq(customersOtp.id, otpRecord.id));

    console.log(`✅ [OTP] Verified successfully for ${phone}/${email}`);

    // Create customer account from registrationData
    if (otpRecord.registrationData) {
      const regData = otpRecord.registrationData as any;
      
      // Check if customer already exists
      const existingCustomer = await db.query.crmCustomers.findFirst({
        where: eq(crmCustomers.email, email),
      });

      if (existingCustomer) {
        return res.json({
          success: true,
          message: 'Verification successful',
          customer: existingCustomer,
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(regData.password, 10);

      // Create customer in CRM
      const [newCustomer] = await db.insert(crmCustomers).values({
        email: regData.email,
        passwordHash: hashedPassword,
        firstName: regData.firstName,
        lastName: regData.lastName,
        phone: regData.phone,
        alternatePhone: regData.alternatePhone || null,
        company: regData.company || null,
        country: regData.country,
        province: regData.province,
        cityRegion: regData.city,
        address: regData.address,
        secondaryAddress: regData.secondaryAddress || null,
        postalCode: regData.postalCode || null,
        industry: regData.industry || null,
        businessType: regData.businessType || 'end_user',
        companySize: regData.companySize || null,
        communicationPreference: regData.communicationPreference || 'email',
        preferredLanguage: regData.preferredLanguage || 'en',
        marketingConsent: regData.marketingConsent || false,
        customerType: 'retail',
        customerSource: 'website',
        customerStatus: 'active',
      }).returning();

      console.log(`✅ [OTP] Customer account created for ${email}`);

      return res.json({
        success: true,
        message: 'Verification successful',
        customer: newCustomer,
      });
    }

    return res.json({
      success: true,
      message: 'Verification successful',
      registrationData: otpRecord.registrationData,
    });

  } catch (error) {
    console.error('❌ [OTP] Verify error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify code',
    });
  }
});

// POST /api/customers/resend-otp
router.post('/api/customers/resend-otp', async (req, res) => {
  try {
    const { phone, email } = req.body;

    if (!phone || !email) {
      return res.status(400).json({
        success: false,
        message: 'Phone and email are required',
      });
    }

    // Check rate limiting (max 1 OTP every 1 minute)
    const recentOtp = await db.query.customersOtp.findFirst({
      where: and(
        eq(customersOtp.phone, phone),
        eq(customersOtp.email, email),
        gt(customersOtp.lastSentAt, new Date(Date.now() - 60000))
      ),
      orderBy: (customersOtp, { desc }) => [desc(customersOtp.lastSentAt)],
    });

    if (recentOtp) {
      const secondsRemaining = Math.ceil((60000 - (Date.now() - new Date(recentOtp.lastSentAt).getTime())) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${secondsRemaining} seconds before requesting a new code`,
        retryAfter: secondsRemaining,
      });
    }

    // Get the last OTP record for registration data
    const lastOtp = await db.query.customersOtp.findFirst({
      where: and(
        eq(customersOtp.phone, phone),
        eq(customersOtp.email, email)
      ),
      orderBy: (customersOtp, { desc }) => [desc(customersOtp.createdAt)],
    });

    // Generate new OTP
    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Save new OTP
    const [otpRecord] = await db.insert(customersOtp).values({
      phone,
      email,
      code,
      expiresAt,
      attempts: 0,
      verified: false,
      lastSentAt: new Date(),
      createdAt: new Date(),
      registrationData: lastOtp?.registrationData || null,
    }).returning();

    console.log(`🔄 [OTP] Resent code for ${phone}/${email}: ${code}`);

    // Get verification settings from database
    const verificationSettings = await getVerificationSettings();

    // Send OTP only via enabled channels
    const sendPromises: Promise<boolean>[] = [];
    const channelNames: string[] = [];

    if (verificationSettings.whatsappVerificationEnabled) {
      sendPromises.push(sendOtpWhatsApp(phone, code));
      channelNames.push('whatsapp');
    }
    if (verificationSettings.smsVerificationEnabled) {
      sendPromises.push(sendOtpSms(phone, code, (lastOtp?.registrationData as any)?.preferredLanguage));
      channelNames.push('sms');
    }
    if (verificationSettings.emailVerificationEnabled) {
      sendPromises.push(sendOtpEmail(email, code, (lastOtp?.registrationData as any)?.firstName));
      channelNames.push('email');
    }

    if (sendPromises.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'No verification channels are enabled.',
      });
    }

    const results = await Promise.allSettled(sendPromises);
    
    const sentVia: { whatsapp?: boolean; sms?: boolean; email?: boolean } = {};
    let anySuccess = false;

    results.forEach((result, index) => {
      const success = result.status === 'fulfilled' && result.value;
      const channel = channelNames[index];
      sentVia[channel as keyof typeof sentVia] = success;
      if (success) anySuccess = true;
    });

    console.log(`📤 [OTP Resend] Delivery results:`, sentVia);

    if (!anySuccess) {
      return res.status(500).json({
        success: false,
        message: 'Failed to resend OTP. Please try again.',
      });
    }

    return res.json({
      success: true,
      message: 'New verification code sent successfully',
      expiresAt: otpRecord.expiresAt,
      sentVia,
    });

  } catch (error) {
    console.error('❌ [OTP] Resend error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resend verification code',
    });
  }
});

export default router;
