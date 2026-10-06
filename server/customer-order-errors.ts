type Language = "en" | "fa" | "ar" | "tr";

const messages: Record<string, Record<Language, string>> = {
  WALLET_LINK_REQUIRED: {
    en: "This prepaid account is not ready for checkout. Finance must verify its accounting link. You can choose a bank payment instead.",
    fa: "اتصال حسابداری این حساب نزد شرکت هنوز تأیید نشده است. واحد مالی باید آن را بررسی کند؛ می‌توانید روش پرداخت بانکی انتخاب کنید.",
    ar: "لم يتم اعتماد ربط هذا الحساب بالمحاسبة. يجب مراجعته من القسم المالي؛ يمكنك اختيار الدفع البنكي.",
    tr: "Bu hesabın muhasebe bağlantısı henüz onaylanmadı. Finans birimi incelemelidir; banka ödemesini seçebilirsiniz.",
  },
  WALLET_CUTOVER_BLOCKED: {
    en: "Prepaid-account checkout is awaiting financial setup approval. Choose a bank payment or contact finance.",
    fa: "پرداخت از حساب نزد شرکت منتظر تأیید تنظیمات مالی است. پرداخت بانکی انتخاب کنید یا با واحد مالی تماس بگیرید.",
    ar: "الدفع من الحساب ينتظر اعتماد الإعدادات المالية. اختر الدفع البنكي أو تواصل مع القسم المالي.",
    tr: "Hesaptan ödeme finansal ayarların onayını bekliyor. Banka ödemesi seçin veya finans birimiyle görüşün.",
  },
  INSUFFICIENT_BALANCE: {
    en: "The available, unblocked account balance is insufficient.",
    fa: "ماندهٔ قابل استفاده و بلوکه‌نشدهٔ حساب کافی نیست.",
    ar: "الرصيد المتاح وغير المحجوز غير كافٍ.",
    tr: "Kullanılabilir, bloke edilmemiş bakiye yetersiz.",
  },
  WALLET_CURRENCY_MISMATCH: {
    en: "The order currency and prepaid-account currency must match.",
    fa: "ارز سفارش و حساب نزد شرکت باید یکسان باشد.",
    ar: "يجب أن تتطابق عملة الطلب مع عملة الحساب.",
    tr: "Sipariş ve hesap para birimleri aynı olmalıdır.",
  },
};

const genericAccounting: Record<Language, string> = {
  en: "The payment could not pass financial validation. Contact finance with the reference below.",
  fa: "پرداخت از کنترل‌های مالی عبور نکرد. کد پیگیری زیر را به واحد مالی اعلام کنید.",
  ar: "لم يجتز الدفع التحقق المالي. أرسل رقم المرجع أدناه إلى القسم المالي.",
  tr: "Ödeme finansal doğrulamayı geçemedi. Aşağıdaki referansla finans birimine başvurun.",
};

export function customerOrderErrorResponse(error: unknown, requestedLanguage: unknown, requestId: string) {
  const candidate = String(requestedLanguage || "en").toLowerCase().split("-")[0];
  const language: Language = ["en", "fa", "ar", "tr"].includes(candidate) ? candidate as Language : "en";
  const financial = error instanceof Error && error.name === "AccountingError"
    ? error as Error & { status?: number; code?: string } : null;
  const status = financial && Number.isInteger(financial.status) &&
    Number(financial.status) >= 400 && Number(financial.status) <= 503 ? Number(financial.status) : 500;
  const code = financial && typeof financial.code === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(financial.code)
    ? financial.code : "ORDER_CREATION_FAILED";
  const message = financial ? (messages[code]?.[language] || genericAccounting[language]) : "Failed to create order";
  return { status, body: { success: false, code, requestId, message: `${message} [${requestId}]` } };
}
