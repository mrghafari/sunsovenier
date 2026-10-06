import { and, eq, notInArray } from "drizzle-orm";
import { customerOrders } from "@shared/customer-schema";
import { customerDb } from "./customer-db";
import { walletStorage, type WalletTransactionDb } from "./wallet-storage";
import { AccountingError } from "./modules/accounting/access";

const paymentDependencies = {
  transaction: <T>(run: (tx: WalletTransactionDb) => Promise<T>) => customerDb.transaction(run),
  debitWallet: walletStorage.debitWallet.bind(walletStorage),
};

export async function settleLegacyWalletCheckout(
  input: { customerId: number; orderId: number; orderNumber: string; amount: number },
  dependencies = paymentDependencies,
) {
  await dependencies.transaction(async tx => {
    await dependencies.debitWallet(
      input.customerId, input.amount, `پرداخت سفارش ${input.orderNumber}`,
      "order", input.orderId, undefined, tx,
    );
    const paid = await tx.update(customerOrders)
      .set({ paymentStatus: "paid", updatedAt: new Date() })
      .where(and(
        eq(customerOrders.id, input.orderId),
        eq(customerOrders.customerId, input.customerId),
        eq(customerOrders.paymentMethod, "wallet_full"),
        eq(customerOrders.paymentStatus, "pending"),
        notInArray(customerOrders.status, ["cancelled", "canceled", "deleted"]),
      ))
      .returning({ id: customerOrders.id });
    if (paid.length !== 1) {
      throw new AccountingError("Order no longer awaits this wallet payment", 409, "ORDER_PAYMENT_STATE_CHANGED");
    }
  });
}
