import type { Config } from "@netlify/functions";
import { and, asc, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  customers,
  darkStores,
  orderItems,
  orders,
  replenishmentOrders,
  shelfAudits,
  skus,
  walletCredits,
} from "../../db/schema.js";
import { CONSUMPTION_CYCLE_DAYS, phantomRiskScore } from "../../server/catalog.js";
import { ensureSeeded, resetDatabase } from "../../server/seed.js";

const RESCUE_CREDIT = 50;
const STATUS_FLOW = ["picking", "packed", "out_for_delivery", "delivered"];

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const readJson = async (req: Request) => {
  try {
    return await req.json();
  } catch {
    return {};
  }
};

async function getOverview() {
  const [orderStats] = await db
    .select({
      active: sql<number>`count(*) filter (where ${orders.status} <> 'delivered')::int`,
      breached: sql<number>`count(*) filter (where ${orders.status} <> 'delivered' and ${orders.elapsedMinutes} > ${orders.promisedMinutes})::int`,
      rescued: sql<number>`count(*) filter (where ${orders.rescued})::int`,
    })
    .from(orders);
  const [skuStats] = await db
    .select({
      highRisk: sql<number>`count(*) filter (where ${skus.phantomRiskScore} >= 60 and not ${skus.quarantined})::int`,
      quarantined: sql<number>`count(*) filter (where ${skus.quarantined})::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(skus);
  const [customerStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      repeat: sql<number>`count(*) filter (where ${customers.ordersCount} > 1)::int`,
      avgChurn: sql<number>`coalesce(round(avg(${customers.churnRisk})), 0)::int`,
    })
    .from(customers);
  const [creditStats] = await db
    .select({ issued: sql<number>`coalesce(sum(${walletCredits.amount}), 0)::int` })
    .from(walletCredits);
  const [audits] = await db.select({ count: sql<number>`count(*)::int` }).from(shelfAudits);
  return { orders: orderStats, skus: skuStats, customers: customerStats, creditsIssued: creditStats.issued, audits: audits.count };
}

async function listOrders(storeId: string | null) {
  const rows = await db
    .select({ order: orders, customer: customers })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(storeId ? eq(orders.storeId, storeId) : undefined)
    .orderBy(desc(sql`${orders.elapsedMinutes} - ${orders.promisedMinutes}`));
  if (rows.length === 0) return [];
  const items = await db
    .select({ item: orderItems, sku: skus })
    .from(orderItems)
    .innerJoin(skus, eq(orderItems.skuId, skus.id))
    .where(inArray(orderItems.orderId, rows.map((r) => r.order.id)))
    .orderBy(asc(orderItems.id));
  const subIds = items.map((i) => i.item.substitutedSkuId).filter((id): id is number => id !== null);
  const subs = subIds.length ? await db.select().from(skus).where(inArray(skus.id, subIds)) : [];
  return rows.map(({ order, customer }) => ({
    ...order,
    customer: { id: customer.id, name: customer.name, churnRisk: customer.churnRisk, walletCredit: customer.walletCredit },
    items: items
      .filter((i) => i.item.orderId === order.id)
      .map(({ item, sku }) => ({
        ...item,
        sku: { id: sku.id, code: sku.code, name: sku.name, category: sku.category, shelfStock: sku.shelfStock, quarantined: sku.quarantined },
        substitute: subs.find((s) => s.id === item.substitutedSkuId)?.name ?? null,
      })),
  }));
}

async function loadItem(orderId: number, itemId: number) {
  const [row] = await db
    .select({ item: orderItems, sku: skus, order: orders })
    .from(orderItems)
    .innerJoin(skus, eq(orderItems.skuId, skus.id))
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)));
  if (!row) throw new HttpError(404, "Order item not found");
  if (row.item.picked) throw new HttpError(409, "Item is already picked");
  return row;
}

async function consumeStock(skuId: number, qty: number) {
  await db
    .update(skus)
    .set({
      shelfStock: sql`greatest(${skus.shelfStock} - ${qty}, 0)`,
      appStock: sql`greatest(${skus.appStock} - ${qty}, 0)`,
    })
    .where(eq(skus.id, skuId));
}

async function pickItem(orderId: number, itemId: number) {
  const { item, sku } = await loadItem(orderId, itemId);
  if (sku.quarantined || sku.shelfStock < item.qty) {
    throw new HttpError(409, `Only ${sku.shelfStock} of ${sku.name} on shelf. Substitute instead.`);
  }
  await consumeStock(sku.id, item.qty);
  await db.update(orderItems).set({ picked: true }).where(eq(orderItems.id, itemId));
  return { ok: true };
}

async function substituteItem(orderId: number, itemId: number) {
  const { item, sku } = await loadItem(orderId, itemId);
  const [candidate] = await db
    .select()
    .from(skus)
    .where(
      and(
        eq(skus.storeId, sku.storeId),
        eq(skus.category, sku.category),
        ne(skus.id, sku.id),
        eq(skus.quarantined, false),
        gte(skus.shelfStock, item.qty),
      ),
    )
    .orderBy(asc(skus.phantomRiskScore), desc(skus.price));
  if (!candidate) throw new HttpError(409, `No in-stock ${sku.category.toLowerCase()} substitute at this store`);
  await consumeStock(candidate.id, item.qty);
  // Customer keeps the original unit price: zero price delta.
  await db.update(orderItems).set({ picked: true, substitutedSkuId: candidate.id }).where(eq(orderItems.id, itemId));
  return { ok: true, substitute: candidate.name, priceDelta: (candidate.price - sku.price) * item.qty };
}

async function advanceOrder(orderId: number) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new HttpError(404, "Order not found");
  const idx = STATUS_FLOW.indexOf(order.status);
  if (idx === STATUS_FLOW.length - 1) throw new HttpError(409, "Order already delivered");
  if (order.status === "picking") {
    const [{ pending }] = await db
      .select({ pending: sql<number>`count(*) filter (where not ${orderItems.picked})::int` })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
    if (pending > 0) throw new HttpError(409, `${pending} item(s) still to pick`);
  }
  const next = STATUS_FLOW[idx + 1];
  await db
    .update(orders)
    .set({ status: next, elapsedMinutes: order.elapsedMinutes + (next === "delivered" ? 6 : 3) })
    .where(eq(orders.id, orderId));
  return { ok: true, status: next };
}

async function rescueOrder(orderId: number) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new HttpError(404, "Order not found");
  if (order.rescued) throw new HttpError(409, "Reliance Pass credit already issued for this order");
  await db.update(orders).set({ rescued: true }).where(eq(orders.id, orderId));
  await db
    .update(customers)
    .set({ walletCredit: sql`${customers.walletCredit} + ${RESCUE_CREDIT}`, churnRisk: 18 })
    .where(eq(customers.id, order.customerId));
  await db.insert(walletCredits).values({
    customerId: order.customerId,
    orderId,
    amount: RESCUE_CREDIT,
    reason: `Preemptive SLA rescue on ${order.code}`,
  });
  return { ok: true, credit: RESCUE_CREDIT };
}

async function listInventory(storeId: string | null) {
  return db
    .select()
    .from(skus)
    .where(storeId ? eq(skus.storeId, storeId) : undefined)
    .orderBy(desc(skus.phantomRiskScore), asc(skus.name));
}

async function auditSku(skuId: number, counted: unknown) {
  const count = Number(counted);
  if (!Number.isInteger(count) || count < 0 || count > 10_000) throw new HttpError(400, "Counted stock must be a whole number");
  const [sku] = await db.select().from(skus).where(eq(skus.id, skuId));
  if (!sku) throw new HttpError(404, "SKU not found");
  await db.insert(shelfAudits).values({ skuId, appStockBefore: sku.appStock, countedStock: count });
  const now = new Date();
  const [updated] = await db
    .update(skus)
    .set({ appStock: count, shelfStock: count, lastAuditAt: now, phantomRiskScore: phantomRiskScore(count, count, now) })
    .where(eq(skus.id, skuId))
    .returning();
  return { ...updated, correctedBy: count - sku.appStock };
}

async function toggleQuarantine(skuId: number) {
  const [updated] = await db
    .update(skus)
    .set({ quarantined: sql`not ${skus.quarantined}` })
    .where(eq(skus.id, skuId))
    .returning();
  if (!updated) throw new HttpError(404, "SKU not found");
  return updated;
}

async function listCustomers() {
  return db.select().from(customers).orderBy(desc(customers.churnRisk), asc(customers.name));
}

async function buildBasket(customerId: number) {
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) throw new HttpError(404, "Customer not found");
  const firstItems = await db
    .select({ item: orderItems, sku: skus })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(skus, eq(orderItems.skuId, skus.id))
    .where(and(eq(orders.customerId, customerId), eq(orders.isFirstOrder, true)));
  const storeSkus = await db.select().from(skus).where(eq(skus.storeId, customer.storeId));
  const daysSinceFirst = (Date.now() - customer.firstOrderAt.getTime()) / 86_400_000;

  const items = firstItems
    .map(({ item, sku }) => {
      const cycle = CONSUMPTION_CYCLE_DAYS[sku.category] ?? 7;
      // Fall back to an in-stock sibling if the original is quarantined or empty.
      const available =
        !sku.quarantined && sku.shelfStock >= item.qty
          ? sku
          : storeSkus.find((s) => s.category === sku.category && !s.quarantined && s.shelfStock >= item.qty);
      return available
        ? {
            skuId: available.id,
            name: available.name,
            category: available.category,
            qty: item.qty,
            price: available.price,
            cycleDays: cycle,
            dueInDays: Math.max(0, Math.round((cycle - daysSinceFirst) * 10) / 10),
            swapped: available.id !== sku.id,
          }
        : null;
    })
    .filter((i) => i !== null)
    .sort((a, b) => a.dueInDays - b.dueInDays);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const creditApplied = Math.min(customer.walletCredit, subtotal);
  const history = await db
    .select()
    .from(replenishmentOrders)
    .where(eq(replenishmentOrders.customerId, customerId))
    .orderBy(desc(replenishmentOrders.createdAt));
  return { customer, items, subtotal, creditApplied, total: subtotal - creditApplied, history };
}

async function placeReorder(customerId: number, body: { items?: { skuId: number; qty: number }[] }) {
  const requested = (body.items ?? []).filter((i) => Number.isInteger(i.skuId) && Number.isInteger(i.qty) && i.qty > 0 && i.qty <= 20);
  if (requested.length === 0) throw new HttpError(400, "Basket is empty");
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) throw new HttpError(404, "Customer not found");
  const rows = await db
    .select()
    .from(skus)
    .where(and(inArray(skus.id, requested.map((i) => i.skuId)), eq(skus.storeId, customer.storeId)));
  const lines = requested.flatMap((r) => {
    const sku = rows.find((s) => s.id === r.skuId);
    return sku && !sku.quarantined ? [{ skuId: sku.id, name: sku.name, qty: Math.min(r.qty, sku.shelfStock), price: sku.price }] : [];
  }).filter((l) => l.qty > 0);
  if (lines.length === 0) throw new HttpError(409, "None of the basket items are in stock");
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const creditApplied = Math.min(customer.walletCredit, subtotal);
  for (const l of lines) await consumeStock(l.skuId, l.qty);
  const [order] = await db
    .insert(replenishmentOrders)
    .values({ customerId, items: lines, subtotal, creditApplied, total: subtotal - creditApplied })
    .returning();
  await db
    .update(customers)
    .set({
      walletCredit: customer.walletCredit - creditApplied,
      ordersCount: customer.ordersCount + 1,
      churnRisk: Math.min(customer.churnRisk, 9),
    })
    .where(eq(customers.id, customerId));
  return order;
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const store = url.searchParams.get("store");
  const id = (i: number) => {
    const n = Number(parts[i]);
    if (!Number.isInteger(n)) throw new HttpError(400, "Invalid id");
    return n;
  };
  const route = `${req.method} ${parts.map((p) => (/^\d+$/.test(p) ? ":id" : p)).join("/")}`;

  try {
    if (route === "POST reset") {
      await resetDatabase();
      return Response.json({ ok: true });
    }
    await ensureSeeded();
    switch (route) {
      case "GET overview":
        return Response.json(await getOverview());
      case "GET stores":
        return Response.json(await db.select().from(darkStores).orderBy(asc(darkStores.cluster)));
      case "GET orders":
        return Response.json(await listOrders(store));
      case "POST orders/:id/items/:id/pick":
        return Response.json(await pickItem(id(1), id(3)));
      case "POST orders/:id/items/:id/substitute":
        return Response.json(await substituteItem(id(1), id(3)));
      case "POST orders/:id/advance":
        return Response.json(await advanceOrder(id(1)));
      case "POST orders/:id/rescue":
        return Response.json(await rescueOrder(id(1)));
      case "GET inventory":
        return Response.json(await listInventory(store));
      case "POST inventory/:id/audit":
        return Response.json(await auditSku(id(1), (await readJson(req)).counted));
      case "POST inventory/:id/quarantine":
        return Response.json(await toggleQuarantine(id(1)));
      case "GET customers":
        return Response.json(await listCustomers());
      case "GET customers/:id/basket":
        return Response.json(await buildBasket(id(1)));
      case "POST customers/:id/reorder":
        return Response.json(await placeReorder(id(1), await readJson(req)), { status: 201 });
      default:
        return Response.json({ error: "Not found" }, { status: 404 });
    }
  } catch (err) {
    if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/*",
};
