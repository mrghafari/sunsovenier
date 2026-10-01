import { isValidIsoDate } from "./contract-draft";

export type ContractDeliveryTiming =
  | { state: "ended"; days: null }
  | { state: "unset"; days: null }
  | { state: "unparseable"; days: null }
  | { state: "upcoming"; days: number }
  | { state: "today"; days: number }
  | { state: "overdue"; days: number };

// A contract's delivery date is a calendar day, not an automatic expiry.
// Compare it to the viewer's local calendar day, without inventing a time of day.
export function getContractDeliveryTiming(
  deliveryDate: string | null,
  deliveryDateStatus: "valid" | "unset" | "unparseable",
  endedAt: string | null,
  now = new Date(),
): ContractDeliveryTiming {
  if (endedAt) return { state: "ended", days: null };
  if (deliveryDateStatus === "unparseable") return { state: "unparseable", days: null };
  if (!deliveryDate) return { state: "unset", days: null };
  if (!isValidIsoDate(deliveryDate)) return { state: "unparseable", days: null };
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const deadline = new Date(`${deliveryDate}T00:00:00.000Z`).getTime();
  const days = Math.round((deadline - today) / 86_400_000);
  return { state: days > 0 ? "upcoming" : days < 0 ? "overdue" : "today", days: Math.abs(days) };
}