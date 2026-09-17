import type { Express, RequestHandler } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { customerDb } from "./customer-db";

export const KPI_PERIODS = [7, 30, 90] as const;
export type KpiPeriod = typeof KPI_PERIODS[number];

export function parseKpiPeriod(value: unknown): KpiPeriod {
  const parsed = Number(value);
  return KPI_PERIODS.includes(parsed as KpiPeriod) ? parsed as KpiPeriod : 30;
}

export function percentage(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : Number(((numerator / denominator) * 100).toFixed(2));
}

export function eligibleOrder(order: { status: string; payment_status: string }): boolean {
  return !["cancelled", "failed", "deleted"].includes(order.status) && order.payment_status !== "failed";
}

type Row = Record<string, unknown>;
const rows = (result: { rows?: Row[] } | Row[]) => Array.isArray(result) ? result : result.rows ?? [];
const integer = (value: unknown) => Number(value ?? 0);
const nullableNumber = (value: unknown) => value == null ? null : Number(value);

export type CurrencyAggregate = { currency: string; revenue: number; orders: number; averageOrderValue: number };

export function groupEligibleOrdersByCurrency(source: Array<{
  status: string;
  payment_status: string;
  currency?: string | null;
  total_amount?: number | string | null;
}>): CurrencyAggregate[] {
  const groups = new Map<string, CurrencyAggregate>();
  source.filter(eligibleOrder).forEach(order => {
    const currency = String(order.currency || "UNKNOWN").toUpperCase();
    const group = groups.get(currency) ?? { currency, revenue: 0, orders: 0, averageOrderValue: 0 };
    group.revenue += Number(order.total_amount ?? 0);
    group.orders += 1;
    group.averageOrderValue = group.revenue / group.orders;
    groups.set(currency, group);
  });
  return [...groups.values()].sort((a, b) => b.orders - a.orders || a.currency.localeCompare(b.currency));
}

export async function getKpiDashboard(period: KpiPeriod) {
  const clockResult = await customerDb.execute(sql`SELECT CURRENT_TIMESTAMP AS as_of,
    CURRENT_TIMESTAMP - (${period} * INTERVAL '1 day') AS current_start,
    CURRENT_TIMESTAMP - ((${period} * 2) * INTERVAL '1 day') AS previous_start`);
  const clock = rows(clockResult)[0] ?? {};
  const ordersResult = await customerDb.execute(sql`
    SELECT id, customer_id, status, payment_status, currency,
      o.total_amount, o.created_at, o.shipped_at, o.delivered_at
    FROM customer_orders o
    WHERE o.created_at >= CURRENT_TIMESTAMP - ((${period} * 2) * INTERVAL '1 day')
  `);
  const orderRows = rows(ordersResult);
  const asOf = new Date(String(clock.as_of ?? new Date())).toISOString();
  const currentStart = new Date(String(clock.current_start)).getTime();
  const previousStart = new Date(String(clock.previous_start)).getTime();
  const current = orderRows.filter(order => new Date(String(order.created_at)).getTime() >= currentStart);
  const previous = orderRows.filter(order => {
    const timestamp = new Date(String(order.created_at)).getTime();
    return timestamp >= previousStart && timestamp < currentStart;
  });
  const currentCurrency = groupEligibleOrdersByCurrency(current as Array<Row & { status: string; payment_status: string }>);
  const previousCurrency = groupEligibleOrdersByCurrency(previous as Array<Row & { status: string; payment_status: string }>);
  const headline = currentCurrency[0] ?? null;
  const previousHeadline = headline
    ? previousCurrency.find(item => item.currency === headline.currency) ?? null
    : null;

  const customerResult = await customerDb.execute(sql`
    WITH bounds AS (
      SELECT CURRENT_TIMESTAMP - (${period} * INTERVAL '1 day') AS current_start
    ), eligible_orders AS (
      SELECT customer_id, created_at
      FROM customer_orders
      WHERE status NOT IN ('cancelled', 'failed', 'deleted')
        AND payment_status <> 'failed'
    )
    SELECT
      (SELECT COUNT(*) FROM crm_customers WHERE is_active IS NOT FALSE) AS active,
      (SELECT COUNT(*) FROM crm_customers) AS total,
      (SELECT COUNT(*) FROM crm_customers, bounds WHERE crm_customers.created_at >= bounds.current_start) AS new,
      (SELECT COUNT(DISTINCT customer_id) FROM eligible_orders, bounds WHERE eligible_orders.created_at >= bounds.current_start) AS with_orders,
      (SELECT COUNT(*) FROM crm_customers WHERE id IN (
        SELECT customer_id FROM eligible_orders GROUP BY customer_id HAVING COUNT(*) >= 2
      )) AS repeat
  `);
  const customer = rows(customerResult)[0] ?? {};

  const operationResult = await customerDb.execute(sql`
    WITH bounds AS (
      SELECT CURRENT_TIMESTAMP - (${period} * INTERVAL '1 day') AS current_start
    )
    SELECT status, COUNT(*)::int AS count,
      COUNT(*) FILTER (
        WHERE payment_status = 'pending'
          AND status NOT IN ('cancelled', 'failed', 'deleted')
      )::int AS pending_payment,
      COUNT(*) FILTER (
        WHERE payment_status = 'paid'
          AND status NOT IN ('cancelled', 'failed', 'deleted')
      )::int AS paid,
      COUNT(*) FILTER (
        WHERE payment_status IN ('paid', 'failed')
          AND status NOT IN ('cancelled', 'deleted')
      )::int AS payment_outcomes,
      COUNT(*) FILTER (WHERE status IN ('cancelled', 'failed') OR payment_status = 'failed')::int AS cancellation_failure,
      COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered,
      AVG(EXTRACT(EPOCH FROM (delivered_at - shipped_at)) / 86400)
        FILTER (WHERE status = 'delivered' AND shipped_at IS NOT NULL AND delivered_at IS NOT NULL) AS lead_time
    FROM customer_orders, bounds
    WHERE created_at >= bounds.current_start
    GROUP BY GROUPING SETS ((status), ())
  `);
  const operationRows = rows(operationResult);
  const totalOperation = operationRows.find(row => row.status == null) ?? {};
  const statusCounts = Object.fromEntries(operationRows.filter(row => row.status != null).map(row => [String(row.status), integer(row.count)]));
  const paid = integer(totalOperation.paid);
  const paymentOutcomes = integer(totalOperation.payment_outcomes);

  const productResult = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE is_active = true)::int AS active,
      COUNT(*) FILTER (WHERE COALESCE(stock_quantity, 0) <= COALESCE(low_stock_threshold, min_stock_level, 0)
        AND COALESCE(stock_quantity, 0) > 0)::int AS low_stock,
      COUNT(*) FILTER (WHERE COALESCE(stock_quantity, 0) <= 0)::int AS out_of_stock
    FROM shop_products
  `);
  const product = rows(productResult)[0] ?? {};

  const alerts = [
    { type: "low_stock", count: integer(product.low_stock), href: "/admin/products" },
    { type: "out_of_stock", count: integer(product.out_of_stock), href: "/admin/products" },
    { type: "pending_payment", count: integer(totalOperation.pending_payment), href: "/admin/finance-orders" },
  ].filter(alert => alert.count > 0);

  return {
    asOf,
    period,
    sales: {
      current: currentCurrency,
      previous: previousCurrency,
      growth: headline && previousHeadline
        ? percentage(headline.revenue - previousHeadline.revenue, previousHeadline.revenue)
        : null,
      headline,
    },
    customers: {
      active: integer(customer.active),
      total: integer(customer.total),
      new: integer(customer.new),
      withEligibleOrders: integer(customer.with_orders),
      repeat: integer(customer.repeat),
    },
    operations: {
      statusCounts,
      pendingPayment: integer(totalOperation.pending_payment),
      paid,
      paymentSuccessRate: percentage(paid, paymentOutcomes),
      cancellationFailureCount: integer(totalOperation.cancellation_failure),
      cancellationFailureRate: percentage(integer(totalOperation.cancellation_failure), integer(totalOperation.count)),
      delivered: integer(totalOperation.delivered),
      averageDeliveryLeadTimeDays: nullableNumber(totalOperation.lead_time),
    },
    inventory: {
      total: integer(product.total),
      active: integer(product.active),
      lowStock: integer(product.low_stock),
      outOfStock: integer(product.out_of_stock),
      // shop_products has no reliable currency column, so this is intentionally empty.
      valueByCurrency: [],
    },
    alerts,
  };
}

export function registerKpiDashboardRoute(app: Express, requireAuth: RequestHandler) {
  app.get("/api/admin/kpi-dashboard", requireAuth, async (req, res) => {
    try {
      res.json(await getKpiDashboard(parseKpiPeriod(req.query.period)));
    } catch (error) {
      console.error("[KPI DASHBOARD] Failed to aggregate canonical metrics:", error);
      res.status(500).json({ success: false, message: "KPI dashboard data unavailable" });
    }
  });
}