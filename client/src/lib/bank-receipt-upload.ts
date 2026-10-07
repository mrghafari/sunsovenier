export interface UploadedBankReceipt {
  receiptUrl: string;
  uploadToken: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
}

export async function uploadBankReceiptFile(file: File): Promise<UploadedBankReceipt> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/payment/receipt-file", {
    method: "POST", body, credentials: "include",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success || !result.receiptUrl || !result.uploadToken) {
    throw new Error(result?.message || `File upload failed (${response.status})`);
  }
  return result;
}

export async function submitBankReceipt(data: {
  orderId: string | number; receiptUrl: string; uploadToken: string; notes?: string;
}) {
  const response = await fetch("/api/payment/upload-receipt", {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) {
    throw new Error(result?.message || `Receipt registration failed (${response.status})`);
  }
  return result;
}
