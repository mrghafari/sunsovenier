export type ContractSigningProgress = {
  items: Array<{
    productId: number;
    productName: string;
    quantity: number;
    shippedQuantity: number;
    remainingQuantity: number;
  }>;
  deliveryDate: string | null;
  deliveryDateStatus: "valid" | "unset" | "unparseable";
  endedAt: string | null;
  isActive: boolean;
};
