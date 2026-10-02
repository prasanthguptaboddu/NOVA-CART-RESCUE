import { boolean, integer, jsonb, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";

export const darkStores = pgTable("dark_stores", {
  id: text().primaryKey(),
  name: text().notNull(),
  cluster: text().notNull(),
  activePickers: integer("active_pickers").notNull(),
  queueDepth: integer("queue_depth").notNull(),
  avgPickMinutes: real("avg_pick_minutes").notNull(),
});

export const skus = pgTable("skus", {
  id: serial().primaryKey(),
  code: text().notNull(),
  name: text().notNull(),
  category: text().notNull(),
  storeId: text("store_id").notNull().references(() => darkStores.id),
  price: integer().notNull(),
  appStock: integer("app_stock").notNull(),
  shelfStock: integer("shelf_stock").notNull(),
  phantomRiskScore: real("phantom_risk_score").notNull().default(0),
  quarantined: boolean().notNull().default(false),
  lastAuditAt: timestamp("last_audit_at").notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial().primaryKey(),
  name: text().notNull(),
  phone: text().notNull(),
  storeId: text("store_id").notNull().references(() => darkStores.id),
  walletCredit: integer("wallet_credit").notNull().default(0),
  churnRisk: integer("churn_risk").notNull(),
  ordersCount: integer("orders_count").notNull().default(1),
  firstOrderAt: timestamp("first_order_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial().primaryKey(),
  code: text().notNull().unique(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  storeId: text("store_id").notNull().references(() => darkStores.id),
  status: text().notNull(),
  isFirstOrder: boolean("is_first_order").notNull().default(true),
  promisedMinutes: integer("promised_minutes").notNull(),
  elapsedMinutes: integer("elapsed_minutes").notNull(),
  total: integer().notNull(),
  rescued: boolean().notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial().primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  skuId: integer("sku_id").notNull().references(() => skus.id),
  qty: integer().notNull(),
  unitPrice: integer("unit_price").notNull(),
  picked: boolean().notNull().default(false),
  substitutedSkuId: integer("substituted_sku_id").references(() => skus.id),
});

export const walletCredits = pgTable("wallet_credits", {
  id: serial().primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
  amount: integer().notNull(),
  reason: text().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const shelfAudits = pgTable("shelf_audits", {
  id: serial().primaryKey(),
  skuId: integer("sku_id").notNull().references(() => skus.id, { onDelete: "cascade" }),
  appStockBefore: integer("app_stock_before").notNull(),
  countedStock: integer("counted_stock").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const replenishmentOrders = pgTable("replenishment_orders", {
  id: serial().primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  items: jsonb().$type<{ skuId: number; name: string; qty: number; price: number }[]>().notNull(),
  subtotal: integer().notNull(),
  creditApplied: integer("credit_applied").notNull(),
  total: integer().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
