export type OrderStatusLanguage = "en" | "fa" | "ar" | "tr";

export type CanonicalOrderStatus =
  | "pending_payment"
  | "payment_grace_period"
  | "payment_uploaded"
  | "financial_reviewing"
  | "financial_approved"
  | "financial_rejected"
  | "financial_auto_approved"
  | "warehouse_pending"
  | "warehouse_notified"
  | "warehouse_processing"
  | "warehouse_verified"
  | "warehouse_fulfilled"
  | "warehouse_approved"
  | "warehouse_rejected"
  | "logistics_assigned"
  | "logistics_processing"
  | "logistics_dispatched"
  | "logistics_delivered"
  | "completed"
  | "cancelled"
  | "unknown";

export type CustomerOrderState =
  | "payment_pending"
  | "awaiting_financial"
  | "processing"
  | "completed"
  | "cancelled"
  | "unknown";

export interface OrderStatusInput {
  workflowStatus?: string | null;
  managementStatus?: string | null;
  orderStatus?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  financialReviewedAt?: string | Date | null;
  financiallyApproved?: boolean | null;
}

export interface ResolvedOrderStatus {
  status: CanonicalOrderStatus;
  customerState: CustomerOrderState;
  department: "financial" | "warehouse" | "logistics" | "complete" | "cancelled" | "unknown";
  badgeClass: string;
}

const aliases: Record<string, CanonicalOrderStatus> = {
  pending: "pending_payment",
  finance_pending: "financial_reviewing",
  finance_rejected: "financial_rejected",
  auto_approved: "financial_auto_approved",
  warehouse_ready: "warehouse_approved",
  shipped: "logistics_dispatched",
  delivered: "logistics_delivered",
  confirmed: "financial_approved",
  processing: "warehouse_processing",
  rejected: "financial_rejected",
};

const knownStatuses = new Set<CanonicalOrderStatus>([
  "pending_payment", "payment_grace_period", "payment_uploaded",
  "financial_reviewing", "financial_approved", "financial_rejected",
  "financial_auto_approved", "warehouse_pending", "warehouse_notified",
  "warehouse_processing", "warehouse_verified", "warehouse_fulfilled",
  "warehouse_approved", "warehouse_rejected", "logistics_assigned",
  "logistics_processing", "logistics_dispatched", "logistics_delivered",
  "completed", "cancelled", "unknown",
]);

export const FINANCIAL_VISIBLE_STATUSES = [
  "pending", "finance_pending", "pending_payment", "payment_uploaded",
  "financial_reviewing", "financial_approved", "financial_auto_approved",
  "auto_approved", "financial_rejected", "finance_rejected",
] as const;

export const WAREHOUSE_VISIBLE_STATUSES = [
  "financial_approved", "warehouse_pending", "warehouse_notified",
  "warehouse_processing", "warehouse_verified", "warehouse_fulfilled",
  "warehouse_approved", "warehouse_rejected", "warehouse_ready",
] as const;

export const LOGISTICS_VISIBLE_STATUSES = [
  "warehouse_approved", "logistics_assigned", "logistics_processing",
  "logistics_dispatched", "shipped",
] as const;

const labels: Record<CanonicalOrderStatus, Record<OrderStatusLanguage, string>> = {
  pending_payment: { en: "Pending Payment", fa: "در انتظار پرداخت", ar: "بانتظار الدفع", tr: "Ödeme bekliyor" },
  payment_grace_period: { en: "Payment Grace Period", fa: "مهلت پرداخت", ar: "مهلة الدفع", tr: "Ödeme süresi" },
  payment_uploaded: { en: "Awaiting Financial Approval", fa: "در انتظار تأیید مالی", ar: "بانتظار الموافقة المالية", tr: "Finansal onay bekliyor" },
  financial_reviewing: { en: "Awaiting Financial Approval", fa: "در انتظار تأیید مالی", ar: "بانتظار الموافقة المالية", tr: "Finansal onay bekliyor" },
  financial_approved: { en: "Financially Approved", fa: "تأیید مالی شده", ar: "تمت الموافقة المالية", tr: "Finansal olarak onaylandı" },
  financial_rejected: { en: "Financially Rejected", fa: "رد مالی", ar: "مرفوض مالياً", tr: "Finansal olarak reddedildi" },
  financial_auto_approved: { en: "Financially Approved", fa: "تأیید مالی شده", ar: "تمت الموافقة المالية", tr: "Finansal olarak onaylandı" },
  warehouse_pending: { en: "Awaiting Warehouse", fa: "در انتظار انبار", ar: "بانتظار المستودع", tr: "Depo bekleniyor" },
  warehouse_notified: { en: "Warehouse Notified", fa: "به انبار اطلاع داده شد", ar: "تم إشعار المستودع", tr: "Depoya bildirildi" },
  warehouse_processing: { en: "Warehouse Processing", fa: "در حال پردازش انبار", ar: "قيد المعالجة في المستودع", tr: "Depoda işleniyor" },
  warehouse_verified: { en: "Inventory Verified", fa: "موجودی تأیید شده", ar: "تم التحقق من المخزون", tr: "Stok doğrulandı" },
  warehouse_fulfilled: { en: "Ready to Ship", fa: "آماده ارسال", ar: "جاهز للشحن", tr: "Gönderime hazır" },
  warehouse_approved: { en: "Ready for Logistics", fa: "آماده تحویل به لجستیک", ar: "جاهز للخدمات اللوجستية", tr: "Lojistiğe hazır" },
  warehouse_rejected: { en: "Warehouse Rejected", fa: "ردشده در انبار", ar: "مرفوض من المستودع", tr: "Depo tarafından reddedildi" },
  logistics_assigned: { en: "Assigned for Delivery", fa: "تخصیص به ارسال", ar: "تم تعيينه للتسليم", tr: "Teslimata atandı" },
  logistics_processing: { en: "Preparing Delivery", fa: "در حال آماده‌سازی ارسال", ar: "جارٍ تجهيز التسليم", tr: "Teslimat hazırlanıyor" },
  logistics_dispatched: { en: "Shipped", fa: "ارسال شده", ar: "تم الشحن", tr: "Gönderildi" },
  logistics_delivered: { en: "Delivered", fa: "تحویل داده شده", ar: "تم التسليم", tr: "Teslim edildi" },
  completed: { en: "Completed", fa: "تکمیل شده", ar: "مكتمل", tr: "Tamamlandı" },
  cancelled: { en: "Cancelled", fa: "لغو شده", ar: "ملغى", tr: "İptal edildi" },
  unknown: { en: "Unknown", fa: "نامشخص", ar: "غير معروف", tr: "Bilinmiyor" },
};

const badgeClasses: Record<CanonicalOrderStatus, string> = {
  pending_payment: "bg-orange-100 text-orange-800",
  payment_grace_period: "bg-orange-100 text-orange-800",
  payment_uploaded: "bg-yellow-100 text-yellow-800",
  financial_reviewing: "bg-blue-100 text-blue-800",
  financial_approved: "bg-green-100 text-green-800",
  financial_auto_approved: "bg-emerald-100 text-emerald-800",
  financial_rejected: "bg-red-100 text-red-800",
  warehouse_pending: "bg-yellow-100 text-yellow-800",
  warehouse_notified: "bg-cyan-100 text-cyan-800",
  warehouse_processing: "bg-blue-100 text-blue-800",
  warehouse_verified: "bg-purple-100 text-purple-800",
  warehouse_fulfilled: "bg-green-100 text-green-800",
  warehouse_approved: "bg-green-600 text-white",
  warehouse_rejected: "bg-red-100 text-red-800",
  logistics_assigned: "bg-cyan-100 text-cyan-800",
  logistics_processing: "bg-blue-100 text-blue-800",
  logistics_dispatched: "bg-purple-100 text-purple-800",
  logistics_delivered: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  unknown: "bg-gray-100 text-gray-800",
};

const normalize = (value?: string | null): CanonicalOrderStatus => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "unknown";
  if (aliases[normalized]) return aliases[normalized];
  return knownStatuses.has(normalized as CanonicalOrderStatus)
    ? normalized as CanonicalOrderStatus
    : "unknown";
};

export function resolveOrderStatus(input: OrderStatusInput): ResolvedOrderStatus {
  const orderStatus = normalize(input.orderStatus);
  const workflowStatus = normalize(input.workflowStatus || input.managementStatus);
  const paymentStatus = input.paymentStatus?.trim().toLowerCase();
  const reviewed = Boolean(input.financialReviewedAt || input.financiallyApproved);

  let status: CanonicalOrderStatus;
  if (orderStatus === "cancelled" || workflowStatus === "cancelled") status = "cancelled";
  else if (workflowStatus === "financial_rejected" || orderStatus === "financial_rejected") status = "financial_rejected";
  else if (workflowStatus === "warehouse_rejected") status = "warehouse_rejected";
  else if (orderStatus === "logistics_delivered" || workflowStatus === "logistics_delivered" || orderStatus === "completed") status = "logistics_delivered";
  else if (workflowStatus !== "unknown" && workflowStatus !== "pending_payment") status = workflowStatus;
  else if (paymentStatus === "receipt_uploaded" && !reviewed) status = "financial_reviewing";
  else if (orderStatus !== "unknown") status = orderStatus;
  else if (paymentStatus === "receipt_uploaded") status = reviewed ? "financial_approved" : "financial_reviewing";
  else status = workflowStatus;

  const department =
    status === "cancelled" || status.endsWith("_rejected") ? "cancelled" :
    status === "completed" || status === "logistics_delivered" ? "complete" :
    status.startsWith("logistics_") ? "logistics" :
    status.startsWith("warehouse_") ? "warehouse" :
    status.startsWith("financial_") || status === "payment_uploaded" ||
      status === "pending_payment" || status === "payment_grace_period" ? "financial" :
    "unknown";

  const customerState: CustomerOrderState =
    department === "cancelled" ? "cancelled" :
    department === "complete" ? "completed" :
    status === "financial_reviewing" || status === "payment_uploaded" ? "awaiting_financial" :
    status === "pending_payment" || status === "payment_grace_period" ? "payment_pending" :
    department === "warehouse" || department === "logistics" ||
      status === "financial_approved" || status === "financial_auto_approved" ? "processing" :
    "unknown";

  return { status, customerState, department, badgeClass: badgeClasses[status] };
}

export function getOrderStatusLabel(
  resolved: ResolvedOrderStatus,
  language: OrderStatusLanguage = "en",
): string {
  return labels[resolved.status][language] || labels[resolved.status].en;
}