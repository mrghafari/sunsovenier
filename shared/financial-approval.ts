export const FINANCIAL_APPROVAL_REASON_MIN = 5;
export const FINANCIAL_APPROVAL_REASON_MAX = 500;

export function isValidFinancialApprovalReason(notes: unknown): notes is string {
  return typeof notes === "string" &&
    notes.trim().length >= FINANCIAL_APPROVAL_REASON_MIN &&
    notes.length <= FINANCIAL_APPROVAL_REASON_MAX;
}
