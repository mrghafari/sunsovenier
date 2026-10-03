import type { AccountingResource, AccountingRow, PostingKey } from "@shared/accounting-api";

const postingLabels: Record<PostingKey, Record<string, string>> = {
  BANK: { en: "Bank", fa: "بانک", ar: "البنك", tr: "Banka" },
  GATEWAY: { en: "Payment gateway clearing", fa: "حساب واسط درگاه پرداخت", ar: "مستحقات بوابة الدفع", tr: "Ödeme geçidi takas hesabı" },
  CASH: { en: "Cash", fa: "نقد", ar: "نقد", tr: "Nakit" },
  CHEQUES_ON_HAND: { en: "Cheques on hand", fa: "چک‌های دریافت‌شده", ar: "شيكات مستلمة", tr: "Alınan çekler" },
  CHEQUE_CLEARING: { en: "Cheque clearing", fa: "وصول چک", ar: "مقاصة الشيكات", tr: "Çek takası" },
  ACCOUNTS_RECEIVABLE: { en: "Accounts receivable", fa: "حساب‌های دریافتنی", ar: "الذمم المدينة", tr: "Ticari alacaklar" },
  WALLET_LIABILITY: { en: "Wallet liability", fa: "بدهی کیف پول", ar: "التزام المحفظة", tr: "Cüzdan yükümlülüğü" },
  SALES_REVENUE: { en: "Sales revenue", fa: "درآمد فروش", ar: "إيرادات المبيعات", tr: "Satış geliri" },
  TAX_PAYABLE: { en: "Tax payable", fa: "مالیات پرداختنی", ar: "الضريبة المستحقة", tr: "Ödenecek vergi" },
  SHIPPING_REVENUE: { en: "Shipping revenue", fa: "درآمد حمل", ar: "إيرادات الشحن", tr: "Nakliye geliri" },
  SHIPPING_EXPENSE: { en: "Shipping expense", fa: "هزینه حمل", ar: "مصروف الشحن", tr: "Nakliye gideri" },
  CARRIER_PAYABLE: { en: "Carrier payable", fa: "بدهی به حمل‌کننده", ar: "مستحقات الناقل", tr: "Taşıyıcı borcu" },
  FLEET_COST_ABSORBED: { en: "Fleet cost absorbed", fa: "هزینه جذب‌شده ناوگان", ar: "تكلفة الأسطول المحملة", tr: "Yüklenen filo maliyeti" },
  INVENTORY: { en: "Inventory", fa: "موجودی", ar: "المخزون", tr: "Stok" },
  COGS: { en: "Cost of goods sold", fa: "بهای تمام‌شده کالای فروش‌رفته", ar: "تكلفة البضاعة المباعة", tr: "Satılan malın maliyeti" },
  BANK_FEES: { en: "Bank fees", fa: "کارمزد بانکی", ar: "الرسوم المصرفية", tr: "Banka ücretleri" },
  FX_GAIN: { en: "Foreign exchange gain", fa: "سود تسعیر ارز", ar: "أرباح فروق العملة", tr: "Döviz kuru kazancı" },
  FX_LOSS: { en: "Foreign exchange loss", fa: "زیان تسعیر ارز", ar: "خسائر فروق العملة", tr: "Döviz kuru zararı" },
  OPENING_BALANCE_EQUITY: { en: "Opening balance equity", fa: "حقوق مالکانه مانده افتتاحیه", ar: "حقوق ملكية الرصيد الافتتاحي", tr: "Açılış bakiyesi özkaynağı" },
};

export function postingKeyLabel(key: string, language: string): string {
  const localized = postingLabels[key as PostingKey]?.[language] ?? postingLabels[key as PostingKey]?.en ?? key;
  return `${key} · ${localized}`;
}

export function sanitizeAccountingRecord(
  allowedKeys: readonly string[],
  defaults: Record<string, unknown>,
  record?: AccountingRow,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = { ...defaults };
  if (!record) return sanitized;
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) sanitized[key] = record[key];
  }
  return sanitized;
}

export function accountingRecordId(resource: AccountingResource, row: AccountingRow): number | string {
  if (resource === "currencies") return String(row.code ?? "");
  return Number(row.id);
}

export function accountingViewerCapabilities(canManage: boolean) {
  return {
    canCreate: canManage,
    canEdit: canManage,
    fieldsDisabled: !canManage,
    showSave: canManage,
    rowAction: canManage ? "edit" as const : "view" as const,
  };
}