import test from "node:test";
import assert from "node:assert/strict";
import { settleLegacyWalletCheckout } from "./legacy-wallet-checkout";
import { walletStorage } from "./wallet-storage";
import { customerOrders } from "@shared/customer-schema";
import { readFileSync } from "node:fs";

async function exercise(amount: number, rejectPaidUpdate: boolean, missingOrder = false) {
  const originalCreate = walletStorage.createTransaction;
  const originalUpdate = walletStorage.updateWalletBalance;
  const initial = { balance: 1000, status: "pending", debits: [] as any[] };
  let committed = structuredClone(initial);
  let rowLocked = false;
  const staged = structuredClone(initial);
  const tx: any = {
    select: () => ({ from: () => ({ where: () => ({ limit: () => ({
      for: async (lock: string) => {
        assert.equal(lock, "update");
        rowLocked = true;
        return [{ id: 456, customerId: 123, balance: String(staged.balance),
          reservedBalance: "0", creditLimit: "0", currency: "IQD" }];
      },
    }) }) }) }),
    update: (table: unknown) => {
      assert.equal(table, customerOrders);
      return { set: (values: any) => ({ where: () => ({ returning: async () => {
        if (rejectPaidUpdate) throw new Error("Database paid-status guard rejected");
        if (missingOrder) return [];
        staged.status = values.paymentStatus;
        return [{ id: 789 }];
      } }) }) };
    },
  };
  walletStorage.createTransaction = async (data, callerTx) => {
    assert.equal(callerTx, tx);
    staged.debits.push(data);
    return { id: 1, ...data } as any;
  };
  walletStorage.updateWalletBalance = async (_id, value, callerTx) => {
    assert.equal(callerTx, tx);
    staged.balance = value;
    return { balance: String(value) } as any;
  };
  let error: unknown;
  try {
    await settleLegacyWalletCheckout({ customerId: 123, orderId: 789, orderNumber: "TEST-ONLY", amount }, {
      debitWallet: walletStorage.debitWallet.bind(walletStorage),
      transaction: async (run: any) => {
        const result = await run(tx);
        committed = structuredClone(staged);
        return result;
      },
    });
  } catch (caught) { error = caught; }
  finally {
    walletStorage.createTransaction = originalCreate;
    walletStorage.updateWalletBalance = originalUpdate;
  }
  return { committed, error, rowLocked };
}

test("legacy debit locks the wallet and commits together with the linked order's paid status", async () => {
  const result = await exercise(250, false);
  assert.equal(result.error, undefined);
  assert.equal(result.rowLocked, true);
  assert.equal(result.committed.balance, 750);
  assert.equal(result.committed.status, "paid");
  assert.equal(result.committed.debits.length, 1);
  assert.equal(result.committed.debits[0].referenceId, 789);
});

test("a paid-status failure cannot commit a debit or wallet transaction", async () => {
  const result = await exercise(250, true);
  assert.match(String(result.error), /paid-status guard/);
  assert.deepEqual(result.committed, { balance: 1000, status: "pending", debits: [] });
});

test("insufficient funds cannot mark the order paid", async () => {
  const result = await exercise(1250, false);
  assert.match(String(result.error), /Insufficient funds/);
  assert.deepEqual(result.committed, { balance: 1000, status: "pending", debits: [] });
});

test("a deleted, cancelled, changed-owner or already-paid order cannot commit a debit", async () => {
  const result = await exercise(250, false, true);
  assert.equal((result.error as any)?.code, "ORDER_PAYMENT_STATE_CHANGED");
  assert.deepEqual(result.committed, { balance: 1000, status: "pending", debits: [] });
});

test("customer checkout acknowledges a committed payment if later processing fails", () => {
  const source = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const route = source.slice(source.indexOf('app.post("/api/customers/orders",'));
  assert.ok(route.indexOf("await settleLegacyWalletCheckout(") < route.indexOf("committedLegacyWalletOrder = {"));
  const recovery = route.slice(route.indexOf("if (committedLegacyWalletOrder)"));
  assert.match(recovery, /success: true/);
  assert.match(recovery, /processingPending: true/);
  assert.match(recovery, /orderNumber: committedLegacyWalletOrder.orderNumber/);
});
