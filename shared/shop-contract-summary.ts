import { isValidIsoDate } from "./contract-draft";

export type ShopContractSummaryItem = {
  productId: number;
  productName: string;
  maxQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
  unitPrice: number;
};

export type ShopContractSummary = {
  id: number;
  number: string;
  isActive: boolean;
  endedAt: string | null;
  deliveryDate: string | null;
  deliveryDateStatus: "valid" | "unset" | "unparseable";
  remainingQuantity: number;
  remainingValue: number;
  currency: "IQD";
  items: ShopContractSummaryItem[];
};

type ContractSummarySource = {
  id: unknown;
  number: unknown;
  isActive: unknown;
  endedAt: unknown;
  draftData: unknown;
};

type ContractSummaryItemSource = {
  productId: unknown;
  productName: unknown;
  maxQuantity: unknown;
  usedQuantity: unknown;
  unitPrice: unknown;
};

function finiteNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function isoTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function deliveryDateFromDraft(draftData: unknown): {
  deliveryDate: string | null;
  deliveryDateStatus: ShopContractSummary["deliveryDateStatus"];
} {
  if (!draftData || typeof draftData !== "object" || Array.isArray(draftData)) {
    return { deliveryDate: null, deliveryDateStatus: "unset" };
  }

  const delivery = (draftData as Record<string, unknown>).delivery;
  if (!delivery || typeof delivery !== "object" || Array.isArray(delivery)) {
    return { deliveryDate: null, deliveryDateStatus: "unset" };
  }

  const date = (delivery as Record<string, unknown>).date;
  if (date === null || date === undefined || (typeof date === "string" && date.trim() === "")) {
    return { deliveryDate: null, deliveryDateStatus: "unset" };
  }
  if (typeof date === "string" && isValidIsoDate(date)) {
    return { deliveryDate: date, deliveryDateStatus: "valid" };
  }
  return { deliveryDate: null, deliveryDateStatus: "unparseable" };
}

export function buildShopContractSummary(
  contract: ContractSummarySource,
  sourceItems: ContractSummaryItemSource[],
): ShopContractSummary {
  const items = sourceItems.map((item) => {
    const maxQuantity = finiteNumber(item.maxQuantity);
    const usedQuantity = finiteNumber(item.usedQuantity);
    return {
      productId: finiteNumber(item.productId),
      productName: String(item.productName ?? ""),
      maxQuantity,
      usedQuantity,
      remainingQuantity: Math.max(0, maxQuantity - usedQuantity),
      unitPrice: finiteNumber(item.unitPrice),
    };
  });
  const date = deliveryDateFromDraft(contract.draftData);

  return {
    id: finiteNumber(contract.id),
    number: String(contract.number ?? ""),
    isActive: contract.isActive === true,
    endedAt: isoTimestamp(contract.endedAt),
    ...date,
    remainingQuantity: items.reduce((total, item) => total + item.remainingQuantity, 0),
    remainingValue: items.reduce((total, item) => total + item.remainingQuantity * item.unitPrice, 0),
    currency: "IQD",
    items,
  };
}