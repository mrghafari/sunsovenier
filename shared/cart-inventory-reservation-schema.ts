import { pgTable, bigserial, integer, text, timestamp, index } from "drizzle-orm/pg-core";

/**
 * One row represents the current reservation of a quantity from one exact
 * showcase batch.  Physical stock is deliberately not changed while status
 * is active/pending; it is changed only when a payment finalizes the row.
 */
export const cartInventoryReservations = pgTable("cart_inventory_reservations", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  ownerKey: text("owner_key").notNull(),
  sessionId: text("session_id"),
  customerId: integer("customer_id"),
  shopProductId: integer("shop_product_id").notNull(),
  showcaseProductId: integer("showcase_product_id").notNull(),
  quantity: integer("quantity").notNull(),
  status: text("status").notNull().default("active"),
  orderId: integer("order_id"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  releasedAt: timestamp("released_at"),
  finalizedAt: timestamp("finalized_at"),
}, (table) => ({
  ownerStatusIdx: index("cart_inventory_reservations_owner_status_idx")
    .on(table.ownerKey, table.status),
  batchStatusIdx: index("cart_inventory_reservations_batch_status_idx")
    .on(table.showcaseProductId, table.status),
  orderStatusIdx: index("cart_inventory_reservations_order_status_idx")
    .on(table.orderId, table.status),
}));

export type CartInventoryReservation = typeof cartInventoryReservations.$inferSelect;