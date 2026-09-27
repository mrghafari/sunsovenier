import crypto from "node:crypto";
import path from "node:path";
import type { Express, Request, RequestHandler, Response } from "express";
import multer from "multer";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 300;

type PdfUpload = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

type SignedContractDocument = {
  id: number | string;
  contract_id: number | string;
  file_name: string;
  file_size: number | string;
  sha256: string;
  uploaded_at: Date | string;
  uploaded_by_admin_id: number | string | null;
  uploaded_by_custom_user_id: string | null;
};

export function validateSignedContractPdf(file: Pick<PdfUpload, "originalname" | "mimetype" | "buffer" | "size">): {
  fileName: string;
  size: number;
  sha256: string;
} {
  const fileName = file.originalname.normalize("NFC");
  const baseName = path.basename(fileName);
  if (
    fileName !== baseName ||
    fileName.length < 5 ||
    fileName.length > 180 ||
    !/^[\p{L}\p{N}][\p{L}\p{N} ._()-]*\.pdf$/iu.test(fileName) ||
    fileName.startsWith(".")
  ) {
    throw new Error("Invalid PDF filename.");
  }
  if (path.extname(fileName).toLowerCase() !== ".pdf") {
    throw new Error("Only PDF files are allowed.");
  }
  if (file.mimetype.toLowerCase() !== "application/pdf") {
    throw new Error("The uploaded file must use the application/pdf MIME type.");
  }
  if (file.size > MAX_FILE_SIZE || file.size !== file.buffer.length) {
    throw new Error("PDF files must be 25 MiB or smaller.");
  }
  if (file.buffer.length < 5 || file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("The uploaded file does not contain a valid PDF signature.");
  }
  return {
    fileName,
    size: file.size,
    sha256: crypto.createHash("sha256").update(file.buffer).digest("hex"),
  };
}

export function isDocumentForContract<T extends Pick<SignedContractDocument, "contract_id">>(
  document: T | null | undefined,
  contractId: number,
): document is T {
  return Boolean(document && Number(document.contract_id) === contractId);
}

export function attachmentContentDisposition(fileName: string): string {
  const safeName = fileName
    .normalize("NFC")
    .replace(/[\\/\u0000-\u001f\u007f"]/g, "_")
    .slice(0, 180) || "contract.pdf";
  const asciiFallback = safeName.replace(/[^\x20-\x7e]|[;\\"]/g, "_");
  const encodedName = encodeURIComponent(safeName).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`;
}

export function documentMetadata(row: SignedContractDocument) {
  return {
    id: Number(row.id),
    fileName: row.file_name,
    size: Number(row.file_size),
    sha256: row.sha256,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by_admin_id !== null
      ? { type: "admin" as const, userId: Number(row.uploaded_by_admin_id) }
      : { type: "custom" as const, userId: row.uploaded_by_custom_user_id },
  };
}

class ContractNotFoundError extends Error {}

export async function insertDocumentWithContractLock(
  transactionPool: { connect: () => Promise<any> },
  values: [number, string, number, string, string, number | null, string | null],
): Promise<SignedContractDocument> {
  const client = await transactionPool.connect();
  let transactionStarted = false;
  try {
    await client.query("BEGIN");
    transactionStarted = true;
    const parent = await client.query(
      "SELECT id FROM shop_contracts WHERE id = $1 FOR UPDATE",
      [values[0]],
    );
    if (!parent.rowCount) throw new ContractNotFoundError("Contract not found.");
    const inserted = await client.query(
      `INSERT INTO signed_contract_documents
         (contract_id, file_name, file_size, sha256, s3_key,
          uploaded_by_admin_id, uploaded_by_custom_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, contract_id, file_name, file_size, sha256, uploaded_at,
                 uploaded_by_admin_id, uploaded_by_custom_user_id`,
      values,
    );
    await client.query("COMMIT");
    transactionStarted = false;
    return inserted.rows[0];
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Failed to roll back signed contract document transaction.", rollbackError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

function noStore(_req: Request, res: Response, next: (error?: unknown) => void) {
  res.setHeader("Cache-Control", "no-store");
  next();
}

const parsePdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    const name = file.originalname.normalize("NFC");
    const validName = name === path.basename(name) &&
      name.length >= 5 &&
      name.length <= 180 &&
      /^[\p{L}\p{N}][\p{L}\p{N} ._()-]*\.pdf$/iu.test(name) &&
      !name.startsWith(".");
    if (!validName || path.extname(name).toLowerCase() !== ".pdf") {
      return callback(new Error("Invalid PDF filename."));
    }
    if (file.mimetype.toLowerCase() !== "application/pdf") {
      return callback(new Error("The uploaded file must use the application/pdf MIME type."));
    }
    callback(null, true);
  },
}).single("file");

const parseUpload: RequestHandler = (req, res, next) => {
  parsePdfUpload(req, res, (error) => {
    if (!error) return next();
    const status = (error as multer.MulterError).code === "LIMIT_FILE_SIZE" ? 413 : 400;
    res.status(status).json({ success: false, message: error.message || "Invalid PDF upload." });
  });
};

function positiveId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export function uploaderFromSession(
  session: unknown,
): { adminId: number | null; customUserId: string | null } | null {
  const values = session as { adminId?: unknown; customUserId?: unknown } | null;
  const adminId = Number(values?.adminId);
  const customUserId = values?.customUserId;
  const hasAdmin = Number.isSafeInteger(adminId) && adminId > 0;
  const hasCustom = typeof customUserId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customUserId);
  if (hasAdmin === hasCustom) return null;
  return { adminId: hasAdmin ? adminId : null, customUserId: hasCustom ? customUserId : null };
}

function uploaderFromRequest(req: Request): { adminId: number | null; customUserId: string | null } | null {
  return uploaderFromSession((req as any).session);
}

function respondWithError(res: Response, error: unknown, message: string) {
  console.error(message, error);
  return res.status(500).json({ success: false, message });
}

export function registerSignedContractDocuments(
  app: Express,
  requireContractAccess: RequestHandler,
): void {
  const middleware = [noStore, requireContractAccess] as const;

  app.get(
    "/api/admin/legal-affairs/contracts/:contractId/documents",
    ...middleware,
    async (req, res) => {
      const contractId = positiveId(req.params.contractId);
      if (!contractId) return res.status(400).json({ success: false, message: "Invalid contract id." });
      try {
        const { pool } = await import("./db");
        const contract = await pool.query("SELECT id FROM shop_contracts WHERE id = $1", [contractId]);
        if (!contract.rowCount) return res.status(404).json({ success: false, message: "Contract not found." });
        const result = await pool.query(
          `SELECT id, contract_id, file_name, file_size, sha256, uploaded_at,
                  uploaded_by_admin_id, uploaded_by_custom_user_id
             FROM signed_contract_documents
            WHERE contract_id = $1
            ORDER BY uploaded_at DESC, id DESC`,
          [contractId],
        );
        return res.json({ success: true, documents: result.rows.map(documentMetadata) });
      } catch (error) {
        return respondWithError(res, error, "Unable to load contract documents.");
      }
    },
  );

  app.post(
    "/api/admin/legal-affairs/contracts/:contractId/documents",
    ...middleware,
    parseUpload,
    async (req, res) => {
      const contractId = positiveId(req.params.contractId);
      if (!contractId) return res.status(400).json({ success: false, message: "Invalid contract id." });
      const uploader = uploaderFromRequest(req);
      if (!uploader) return res.status(403).json({ success: false, message: "Authenticated admin identity is unavailable." });
      if (!req.file) return res.status(400).json({ success: false, message: "A PDF file is required in field 'file'." });

      let uploadedKey: string | null = null;
      try {
        const file = req.file as PdfUpload;
        const metadata = validateSignedContractPdf(file);
        const { pool } = await import("./db");
        const contract = await pool.query("SELECT id FROM shop_contracts WHERE id = $1", [contractId]);
        if (!contract.rowCount) return res.status(404).json({ success: false, message: "Contract not found." });

        const key = `private/shop-contracts/${contractId}/${crypto.randomUUID()}.pdf`;
        const { getAwsS3Service } = await import("./aws-s3-service");
        const storage = getAwsS3Service();
        const uploaded = await storage.uploadPrivateFileToKey(file.buffer, key, "application/pdf");
        if (!uploaded) {
          return res.status(503).json({ success: false, message: "Private document storage is unavailable." });
        }
        uploadedKey = key;

        const inserted = await insertDocumentWithContractLock(pool, [
          contractId, metadata.fileName, metadata.size, metadata.sha256, key,
          uploader.adminId, uploader.customUserId,
        ]);
        uploadedKey = null;
        return res.status(201).json({ success: true, document: documentMetadata(inserted) });
      } catch (error) {
        if (uploadedKey) {
          try {
            const { getAwsS3Service } = await import("./aws-s3-service");
            await getAwsS3Service().deleteFile(uploadedKey);
            uploadedKey = null;
          } catch (cleanupError) {
            console.error("Unable to clean up unassociated contract PDF from private storage.", cleanupError);
          }
        }
        if (error instanceof Error && /Invalid PDF|Only PDF|application\/pdf|25 MiB|PDF signature/.test(error.message)) {
          return res.status(400).json({ success: false, message: error.message });
        }
        if (error instanceof ContractNotFoundError) {
          return res.status(404).json({ success: false, message: error.message });
        }
        return respondWithError(res, error, "Unable to save contract document.");
      }
    },
  );

  app.get(
    "/api/admin/legal-affairs/contracts/:contractId/documents/:documentId/download",
    ...middleware,
    async (req, res) => {
      const contractId = positiveId(req.params.contractId);
      const documentId = positiveId(req.params.documentId);
      if (!contractId || !documentId) {
        return res.status(400).json({ success: false, message: "Invalid contract or document id." });
      }
      try {
        const { pool } = await import("./db");
        const result = await pool.query(
          `SELECT id, contract_id, s3_key, file_name
             FROM signed_contract_documents
            WHERE id = $1 AND contract_id = $2`,
          [documentId, contractId],
        );
        const row = result.rows[0];
        if (!isDocumentForContract(row, contractId)) {
          return res.status(404).json({ success: false, message: "Contract document not found." });
        }
        const { getAwsS3Service } = await import("./aws-s3-service");
        const downloadUrl = await getAwsS3Service().getSignedUrl(
          row.s3_key,
          SIGNED_URL_TTL_SECONDS,
          { responseContentDisposition: attachmentContentDisposition(row.file_name) },
        );
        if (!downloadUrl) {
          return res.status(503).json({ success: false, message: "Private document storage is unavailable." });
        }
        return res.json({ success: true, downloadUrl, expiresIn: SIGNED_URL_TTL_SECONDS });
      } catch (error) {
        return respondWithError(res, error, "Unable to create contract document download link.");
      }
    },
  );
}