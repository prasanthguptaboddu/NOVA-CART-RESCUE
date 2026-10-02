import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  customers,
  darkStores,
  orderItems,
  orders,
  replenishmentOrders,
  shelfAudits,
  skus,
  walletCredits,
} from "../db/schema.js";
import { CUSTOMERS, PRODUCTS, STORES, phantomRiskScore } from "./catalog.js";

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

// Deterministic pseudo-random so every reset produces the same demo state.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Orders: [customerIndex, status, promised, elapsed, product codes with qty]
const ORDER_PLAN: [number, string, number, number, [string, number][]][] = [
  [0, "picking", 20, 17, [["DRY-MLK-500", 2], ["EGG-FRM-12", 1], ["BKY-BRN-400", 1]]],
  [1, "picking", 15, 22, [["PRD-TOM-1K", 1], ["PRD-ONI-1K", 1], ["DRY-CRD-400", 1], ["STP-DAL-1K", 1]]],
  [2, "packed", 20, 12, [["BEV-COF-200", 1], ["DRY-MLK-1L", 1]]],
  [3, "picking", 20, 9, [["DRY-BTR-100", 1], ["BKY-PAV-6", 2], ["EGG-FRE-6", 1]]],
  [4, "out_for_delivery", 15, 18, [["STP-ATA-5K", 1], ["DRY-MLK-500", 3]]],
  [5, "picking", 20, 27, [["EGG-FRM-12", 1], ["PRD-BAN-1D", 1], ["DRY-CRD-400", 2]]],
  [6, "picking", 15, 11, [["DRY-MLK-1L", 2], ["BKY-BRN-400", 1]]],
  [7, "packed", 20, 24, [["PRD-TOM-1K", 2], ["STP-DAL-1K", 1], ["DRY-BTR-100", 1]]],
  [8, "delivered", 20, 14, [["BEV-COF-200", 1], ["BKY-PAV-6", 1], ["DRY-MLK-500", 2]]],
  [9, "picking", 20, 6, [["EGG-FRE-6", 1], ["PRD-BAN-1D", 1], ["STP-ATA-5K", 1]]],
];

// SKUs that are deliberately drifted (app shows stock, shelf is short or empty).
const PHANTOM: Record<string, [number, number, number]> = {
  "KOR:EGG-FRM-12": [14, 0, 9],
  "HSR:EGG-FRM-12": [9, 0, 11],
  "HSR:DRY-CRD-400": [22, 3, 8],
  "KOR:PRD-TOM-1K": [30, 6, 6],
  "IND:BKY-PAV-6": [16, 1, 10],
  "WFD:STP-ATA-5K": [11, 4, 7],
  "HSR:STP-DAL-1K": [18, 9, 12],
};

export async function seedDatabase() {
  const rand = rng(42);

  await db.insert(darkStores).values(STORES);

  const skuRows = STORES.flatMap((store) =>
    PRODUCTS.map((p) => {
      const phantom = PHANTOM[`${store.id}:${p.code}`];
      const appStock = phantom ? phantom[0] : 18 + Math.floor(rand() * 40);
      const shelfStock = phantom ? phantom[1] : appStock - Math.floor(rand() * 3);
      const lastAuditAt = daysAgo(phantom ? phantom[2] : Math.floor(rand() * 4));
      return {
        ...p,
        storeId: store.id,
        appStock,
        shelfStock,
        lastAuditAt,
        phantomRiskScore: phantomRiskScore(appStock, shelfStock, lastAuditAt),
      };
    }),
  );
  const insertedSkus = await db.insert(skus).values(skuRows).returning();
  const skuFor = (storeId: string, code: string) =>
    insertedSkus.find((s) => s.storeId === storeId && s.code === code)!;

  const insertedCustomers = await db
    .insert(customers)
    .values(
      CUSTOMERS.map((c, i) => {
        const [, status, promised, elapsed] = ORDER_PLAN[i];
        const friction = elapsed > promised && status !== "delivered";
        return { ...c, churnRisk: friction ? 89 : 31, firstOrderAt: daysAgo(1 + (i % 4)) };
      }),
    )
    .returning();

  for (const [i, [ci, status, promised, elapsed, lines]] of ORDER_PLAN.entries()) {
    const customer = insertedCustomers[ci];
    const lineSkus = lines.map(([code, qty]) => ({ sku: skuFor(customer.storeId, code), qty }));
    const total = lineSkus.reduce((sum, l) => sum + l.sku.price * l.qty, 0);
    const [order] = await db
      .insert(orders)
      .values({
        code: `NC-${(48213 + i * 37).toString()}`,
        customerId: customer.id,
        storeId: customer.storeId,
        status,
        promisedMinutes: promised,
        elapsedMinutes: elapsed,
        total,
        createdAt: new Date(Date.now() - elapsed * 60_000),
      })
      .returning();
    const prePicked = status !== "picking";
    await db.insert(orderItems).values(
      lineSkus.map((l, j) => ({
        orderId: order.id,
        skuId: l.sku.id,
        qty: l.qty,
        unitPrice: l.sku.price,
        // Partially picked orders make the console feel live.
        picked: prePicked || (j === 0 && l.sku.shelfStock >= l.qty && i % 2 === 1),
      })),
    );
  }
}

export async function ensureSeeded() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(darkStores);
  if (count > 0) return;
  try {
    await seedDatabase();
  } catch (err) {
    // A concurrent request may have seeded first (duplicate store keys); only rethrow if still empty.
    const [{ count: after }] = await db.select({ count: sql<number>`count(*)::int` }).from(darkStores);
    if (after === 0) throw err;
  }
}

export async function resetDatabase() {
  await db.delete(replenishmentOrders);
  await db.delete(walletCredits);
  await db.delete(shelfAudits);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(customers);
  await db.delete(skus);
  await db.delete(darkStores);
  await seedDatabase();
}
