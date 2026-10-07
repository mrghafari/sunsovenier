import type { Response } from "express";
import { pool } from "./db";
import { assertFleetCategory, fleetCategoryForContract, type FleetCategory } from "../shared/fleet-category";

class FleetPolicyError extends Error {
  constructor(message: string, public statusCode = 422) { super(message); }
}

function positiveId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new FleetPolicyError("Invalid order or vehicle identity.", 400);
  return id;
}

export async function getOrderFleetCategory(orderId: unknown): Promise<FleetCategory> {
  const result = await pool.query("SELECT contract_id FROM customer_orders WHERE id=$1", [positiveId(orderId)]);
  if (!result.rowCount) throw new FleetPolicyError("Order not found.", 404);
  return fleetCategoryForContract(result.rows[0].contract_id);
}

export async function validateReadyFleetCategoryChange(res: Response, id: unknown, category: FleetCategory): Promise<boolean> {
  const result = await pool.query(
    `SELECT om.id FROM ready_vehicles rv
     JOIN order_management om ON om.vehicle_plate=rv.license_plate
     JOIN customer_orders co ON co.id=om.customer_order_id
     WHERE rv.id=$1 AND rv.fleet_category<>$2
       AND om.current_status NOT IN ('delivered','cancelled','completed','returned','failed','deleted')
       AND CASE WHEN co.contract_id IS NOT NULL THEN 'contract' ELSE 'standard' END <> $2 LIMIT 1`,
    [positiveId(id), category]);
  if (!result.rowCount) return true;
  res.status(409).json({ success: false, message: "تا پایان مأموریت جاری، گروه ناوگان این خودرو قابل تغییر نیست." });
  return false;
}

/** Check persisted order/vehicle identities before any assignment writes. */
export async function validateFleetAssignment(res: Response, input: {
  customerOrderId?: unknown; managementId?: unknown;
  vehicleId?: unknown; plate?: unknown; source?: "ready" | "delivery";
  allowExternalPickup?: boolean;
}): Promise<boolean> {
  try {
    const values: number[] = [];
    let condition: string;
    if (input.managementId != null) {
      values.push(positiveId(input.managementId));
      condition = "om.id=$1";
      if (input.customerOrderId != null) {
        values.push(positiveId(input.customerOrderId));
        condition += " AND co.id=$2";
      }
    } else {
      values.push(positiveId(input.customerOrderId));
      condition = "co.id=$1";
    }
    const orderResult = await pool.query(
      `SELECT co.id,co.contract_id,co.shipping_method FROM customer_orders co
       LEFT JOIN order_management om ON om.customer_order_id=co.id WHERE ${condition} LIMIT 1`, values);
    if (!orderResult.rowCount) throw new FleetPolicyError("Order and management identities do not match.", 404);
    const order = orderResult.rows[0];
    const plate = String(input.plate ?? "").trim();
    const id = input.vehicleId == null ? null : positiveId(input.vehicleId);
    if (!plate && id == null) throw new FleetPolicyError("A registered fleet vehicle must be selected.", 400);
    const sources = input.source ? [input.source] : ["ready", "delivery"];
    let vehicle: { fleet_category: string } | undefined;
    for (const source of sources) {
      // Table and column names are fixed by this allowlist, never request text.
      const table = source === "ready" ? "ready_vehicles" : "delivery_vehicles";
      const plateColumn = source === "ready" ? "license_plate" : "plate_number";
      const params: (number | string)[] = [];
      const checks: string[] = [];
      if (id != null) { params.push(id); checks.push(`id=$${params.length}`); }
      if (plate) { params.push(plate); checks.push(`${plateColumn}=$${params.length}`); }
      const result = await pool.query(`SELECT fleet_category FROM ${table} WHERE ${checks.join(" AND ")}`, params);
      if (result.rowCount) { vehicle = result.rows[0]; break; }
    }
    if (!vehicle) {
      const pickup = ["pickup", "self_pickup", "personal_pickup", "store_pickup"].includes(String(order.shipping_method).toLowerCase());
      if (input.allowExternalPickup && pickup) return true;
      throw new FleetPolicyError("خودرو در ناوگان ثبت نشده است یا شناسه و پلاک آن مطابقت ندارند.");
    }
    try { assertFleetCategory(order.contract_id, vehicle.fleet_category); }
    catch (error) { throw new FleetPolicyError((error as Error).message); }
    return true;
  } catch (error) {
    if (!(error instanceof FleetPolicyError)) throw error;
    res.status(error.statusCode).json({ success: false, message: error.message });
    return false;
  }
}
