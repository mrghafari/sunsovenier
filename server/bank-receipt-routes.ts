import type { Express, RequestHandler } from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { and, eq, or, desc } from "drizzle-orm";
import { customerOrders } from "@shared/customer-schema";
import { orderManagement, paymentReceipts } from "@shared/order-management-schema";
import { db } from "./db";
import { getAwsS3Service } from "./aws-s3-service";
import { fileSecurityService } from "./fileSecurityService";
import { issueBankReceiptTicket, verifyBankReceiptTicket } from "./bank-receipt-ticket";

const receiptMimeTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"]);
const bankMethods = new Set(["bank_receipt", "bank_transfer", "bank_transfer_grace"]);
const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 4 },
}).single("file");

export function registerBankReceiptRoutes(
  app: Express, requireCustomerAuth: RequestHandler, requireStaffAuth: RequestHandler,
  dependencies: {
    database?: typeof db;
    storage?: Pick<ReturnType<typeof getAwsS3Service>, "uploadPrivateFile" | "getFile">;
    validateFile?: typeof fileSecurityService.validateFile;
    signingSecret?: string;
  } = {},
) {
  const database = dependencies.database ?? db;
  const storage = () => dependencies.storage ?? getAwsS3Service();
  const validateFile = dependencies.validateFile ?? fileSecurityService.validateFile.bind(fileSecurityService);
  const signingSecret = () => dependencies.signingSecret ?? process.env.SESSION_SECRET ?? "";
  app.post("/api/payment/receipt-file", requireCustomerAuth, (req, res) => {
    receiptUpload(req, res, async (uploadError) => {
      if (uploadError) {
        return res.status(uploadError.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
          success: false,
          message: uploadError.code === "LIMIT_FILE_SIZE"
            ? "حجم فایل نباید از ۵ مگابایت بیشتر باشد" : "فایل ارسالی معتبر نیست",
        });
      }
      try {
        const customerId = Number(req.session?.customerId);
        if (!Number.isSafeInteger(customerId) || customerId <= 0) {
          return res.status(401).json({ success: false, message: "لطفاً دوباره وارد حساب مشتری شوید" });
        }
        if (!req.file?.buffer.length) {
          return res.status(400).json({ success: false, message: "فایل فیش بانکی ارسال نشده است" });
        }
        if (!signingSecret()) throw new Error("Receipt signing is not configured");
        const detected = await fileTypeFromBuffer(req.file.buffer);
        if (!detected || !receiptMimeTypes.has(detected.mime)) {
          return res.status(415).json({ success: false, message: "فقط تصاویر JPG، PNG، GIF، WebP و فایل PDF مجاز هستند" });
        }
        const validation = await validateFile(req.file.buffer, `receipt.${detected.ext}`);
        if (!validation.isValid) {
          return res.status(422).json({ success: false, message: validation.errors.join("؛ ") });
        }
        // Never expose a browser PUT URL or a public S3 object for financial evidence.
        const result = await storage().uploadPrivateFile(
          req.file.buffer, `receipt.${detected.ext}`, detected.mime, `receipts/customer-${customerId}`,
        );
        if (!result.success || !result.key) {
          return res.status(503).json({ success: false, message: "ذخیره‌سازی فیش بانکی انجام نشد؛ لطفاً دوباره تلاش کنید" });
        }
        const fileName = result.key.split("/").pop()!;
        const evidence = {
          customerId,
          receiptUrl: `/files/bank-receipts/${customerId}/${fileName}`,
          originalFileName: req.file.originalname.slice(0, 255),
          fileSize: req.file.size,
          mimeType: detected.mime,
        };
        res.json({ success: true, ...evidence, uploadToken: issueBankReceiptTicket(evidence, signingSecret()) });
      } catch (error) {
        console.error("[BANK RECEIPT] File upload failed", error instanceof Error ? error.message : "Unknown error");
        res.status(500).json({ success: false, message: "آپلود فیش بانکی انجام نشد؛ لطفاً دوباره تلاش کنید" });
      }
    });
  });

  app.get("/files/bank-receipts/:customerId/:fileName", (req, res, next) => {
    const customerId = Number(req.params.customerId);
    if (Number(req.session?.customerId) === customerId && customerId > 0) return next();
    // Staff access uses the existing authenticated management boundary.
    requireStaffAuth(req, res, next);
  }, async (req, res) => {
    try {
      if (!/^[1-9]\d*$/.test(req.params.customerId) ||
          !/^\d+-[a-f0-9]{16}\.(?:jpg|jpeg|png|gif|webp|pdf)$/.test(req.params.fileName)) {
        return res.status(404).end();
      }
      // Keep authenticated GET/HEAD on the app's origin. Redirecting a
      // credentials-included request to S3 makes its wildcard CORS header
      // invalid, even though the signed object itself is readable.
      const file = await storage().getFile(
        `receipts/customer-${req.params.customerId}/${req.params.fileName}`,
      );
      if (!file?.length) return res.status(503).json({ success: false, message: "فایل فیش بانکی در دسترس نیست" });
      const detected = await fileTypeFromBuffer(file);
      if (!detected || !receiptMimeTypes.has(detected.mime)) {
        return res.status(415).json({ success: false, message: "نوع فایل فیش بانکی معتبر نیست" });
      }
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Type", detected.mime);
      res.setHeader("Content-Disposition", `inline; filename="${req.params.fileName}"`);
      // Express also handles HEAD here, preserving metadata without a body.
      res.send(file);
    } catch {
      res.status(503).json({ success: false, message: "دریافت فیش بانکی انجام نشد" });
    }
  });

  app.post("/api/payment/upload-receipt", requireCustomerAuth, async (req, res) => {
    try {
      const customerId = Number(req.session?.customerId);
      const { receiptUrl, uploadToken, orderId, notes } = req.body || {};
      const evidence = verifyBankReceiptTicket(uploadToken, customerId, receiptUrl, signingSecret());
      if (!evidence) {
        return res.status(400).json({ success: false, message: "فایل فیش معتبر نیست؛ لطفاً فایل را دوباره آپلود کنید" });
      }
      if ((typeof orderId !== "string" && typeof orderId !== "number") || !String(orderId).trim()) {
        return res.status(400).json({ success: false, message: "شماره سفارش الزامی است" });
      }
      const orderIdentifier = String(orderId).trim();
      const numericId = /^[1-9]\d*$/.test(orderIdentifier) && Number.isSafeInteger(Number(orderIdentifier))
        ? Number(orderIdentifier) : null;
      const result = await database.transaction(async (tx) => {
        const [order] = await tx.select().from(customerOrders).where(and(
          eq(customerOrders.customerId, customerId),
          numericId === null ? eq(customerOrders.orderNumber, orderIdentifier)
            : or(eq(customerOrders.orderNumber, orderIdentifier), eq(customerOrders.id, numericId)),
        )).for("update");
        if (!order) return { status: 404, message: "سفارش پیدا نشد یا شما دسترسی به آن ندارید" };
        if (!bankMethods.has(order.paymentMethod || "")) {
          return { status: 400, message: "این سفارش نیاز به آپلود فیش بانکی ندارد" };
        }
        if (["cancelled", "canceled", "deleted", "failed", "delivered", "completed"].includes(order.status || "") ||
            ["paid", "completed", "successful", "success", "refunded"].includes(order.paymentStatus || "")) {
          return { status: 409, message: "برای این وضعیت سفارش نمی‌توان فیش جدید ثبت کرد" };
        }
        const [existing] = await tx.select().from(paymentReceipts).where(and(
          eq(paymentReceipts.customerOrderId, order.id), eq(paymentReceipts.receiptUrl, receiptUrl),
        )).limit(1);
        if (existing) return { status: 200, order, receipt: existing };
        const [receipt] = await tx.insert(paymentReceipts).values({
          customerOrderId: order.id, customerId, receiptUrl,
          originalFileName: evidence.originalFileName, fileSize: evidence.fileSize,
          mimeType: evidence.mimeType, notes: typeof notes === "string" ? notes.slice(0, 10000) : null,
        }).returning();
        await tx.update(customerOrders).set({
          receiptPath: receiptUrl, paymentStatus: "receipt_uploaded", updatedAt: new Date(),
        }).where(eq(customerOrders.id, order.id));
        await tx.update(orderManagement).set({
          paymentReceiptUrl: receiptUrl, currentStatus: "payment_uploaded",
          updatedAt: new Date(),
        }).where(eq(orderManagement.customerOrderId, order.id));
        return { status: 200, order, receipt };
      });
      if (!result.order || !result.receipt) {
        return res.status(result.status).json({ success: false, message: result.message });
      }
      res.json({
        success: true, message: "فیش بانکی برای بررسی واحد مالی ثبت شد",
        data: { receiptUrl, orderId: result.order.id, orderNumber: result.order.orderNumber, paymentReceiptId: result.receipt.id },
      });
    } catch (error) {
      console.error("[BANK RECEIPT] Registration failed", error instanceof Error ? error.message : "Unknown error");
      res.status(500).json({ success: false, message: "ثبت فیش بانکی انجام نشد؛ لطفاً دوباره تلاش کنید" });
    }
  });

  app.get("/api/payment/receipt/:orderId", requireCustomerAuth, async (req, res) => {
    const orderId = Number(req.params.orderId);
    if (!Number.isSafeInteger(orderId) || orderId <= 0) return res.status(400).json({ success: false, message: "شناسه سفارش معتبر نیست" });
    try {
      const [order] = await database.select().from(customerOrders).where(and(
        eq(customerOrders.id, orderId), eq(customerOrders.customerId, Number(req.session?.customerId)),
      ));
      if (!order) return res.status(404).json({ success: false, message: "سفارش یافت نشد" });
      if (!order.receiptPath) return res.status(404).json({ success: false, message: "فیش بانکی برای این سفارش آپلود نشده است" });
      const [receipt] = await database.select().from(paymentReceipts).where(eq(paymentReceipts.customerOrderId, order.id))
        .orderBy(desc(paymentReceipts.uploadedAt)).limit(1);
      res.json({ success: true, data: {
        receiptUrl: order.receiptPath, receiptUploadDate: receipt?.uploadedAt ?? null,
        receiptNotes: receipt?.notes ?? null, paymentStatus: order.paymentStatus,
      } });
    } catch {
      res.status(500).json({ success: false, message: "دریافت اطلاعات فیش بانکی انجام نشد" });
    }
  });
}
