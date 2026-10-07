import type { Response } from "express";
import { sql, type SQLWrapper } from "drizzle-orm";
import { pool } from "./db";
import { assertFleetCategory, fleetCategoryForContract, type FleetCategory } from "../shared/fleet-category";

class FleetPolicyError extends Error {
  constructor(message: string, public statusCode = 422) { super(message); }
}

/** A manually available flag alone must not hide an unfinished mission. */
export function noActiveFleetAssignment(plate: SQLWrapper) {
  return sql`NOT EXISTS (
    SELECT 1 FROM order_management fleet_mission
    WHERE BTRIM(fleet_mission.vehicle_plate) = BTRIM(${plate})
      AND COALESCE(fleet_mission.current_status,'') NOT IN ('delivered','cancelled','completed','returned','failed','deleted')
  )`;
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
      JOIN order_management om ON BTRIM(om.vehicle_plate)=BTRIM(rv.license_plate)
     JOIN customer_orders co ON co.id=om.customer_order_id
     WHERE rv.id=$1 AND rv.fleet_category<>$2
        AND COALESCE(om.current_status,'') NOT IN ('delivered','cancelled','completed','returned','failed','deleted')
        AND $2='standard' AND co.contract_id IS NOT NULL LIMIT 1`,
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
    let vehicle: { fleet_category: string; plate: string; is_available?: boolean; is_active?: boolean; current_status?: string } | undefined;
    for (const source of sources) {
      // Table and column names are fixed by this allowlist, never request text.
      const table = source === "ready" ? "ready_vehicles" : "delivery_vehicles";
      const plateColumn = source === "ready" ? "license_plate" : "plate_number";
      const params: (number | string)[] = [];
      const checks: string[] = [];
      if (id != null) { params.push(id); checks.push(`id=$${params.length}`); }
      if (plate) { params.push(plate); checks.push(`BTRIM(${plateColumn})=$${params.length}`); }
      const availabilityColumns = source === "ready" ? "is_available" : "is_active,current_status";
      const result = await pool.query(`SELECT fleet_category,${plateColumn} AS plate,${availabilityColumns} FROM ${table} WHERE ${checks.join(" AND ")}`, params);
      if (result.rowCount) { vehicle = result.rows[0]; break; }
    }
    if (!vehicle) {
      const pickup = ["pickup", "self_pickup", "personal_pickup", "store_pickup"].includes(String(order.shipping_method).toLowerCase());
      if (input.allowExternalPickup && pickup) return true;
      throw new FleetPolicyError("خودرو در ناوگان ثبت نشده است یا شناسه و پلاک آن مطابقت ندارند.");
    }
    try { assertFleetCategory(order.contract_id, vehicle.fleet_category); }
    catch (error) { throw new FleetPolicyError((error as Error).message); }
    if (vehicle.fleet_category === "contract") {
      const missions = await pool.query(
        `SELECT id,customer_order_id FROM order_management WHERE BTRIM(vehicle_plate)=$1
         AND COALESCE(current_status,'') NOT IN ('delivered','cancelled','completed','returned','failed','deleted')`,
        [vehicle.plate.trim()]);
      const belongsHere = (row: { id: unknown; customer_order_id: unknown }) => input.managementId != null
        ? Number(row.id) === Number(input.managementId)
        : Number(row.customer_order_id) === Number(order.id);
      const assignedElsewhere = missions.rows.some(row => !belongsHere(row));
      const assignedHere = missions.rows.some(belongsHere);
      const available = vehicle.is_available === true
        || (vehicle.is_active === true && vehicle.current_status === "available");
      if (assignedElsewhere || (!available && !assignedHere)) {
        throw new FleetPolicyError("خودروی ناوگان قراردادی آزاد نیست و نمی‌توان آن را به این سفارش تخصیص داد.", 409);
      }
    }
    return true;
  } catch (error) {
    if (!(error instanceof FleetPolicyError)) throw error;
    res.status(error.statusCode).json({ success: false, message: error.message });
    return false;
  }
}
