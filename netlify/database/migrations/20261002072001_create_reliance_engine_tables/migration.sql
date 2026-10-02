CREATE TABLE "customers" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"store_id" text NOT NULL,
	"wallet_credit" integer DEFAULT 0 NOT NULL,
	"churn_risk" integer NOT NULL,
	"orders_count" integer DEFAULT 1 NOT NULL,
	"first_order_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dark_stores" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"cluster" text NOT NULL,
	"active_pickers" integer NOT NULL,
	"queue_depth" integer NOT NULL,
	"avg_pick_minutes" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY,
	"order_id" integer NOT NULL,
	"sku_id" integer NOT NULL,
	"qty" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"picked" boolean DEFAULT false NOT NULL,
	"substituted_sku_id" integer
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY,
	"code" text NOT NULL UNIQUE,
	"customer_id" integer NOT NULL,
	"store_id" text NOT NULL,
	"status" text NOT NULL,
	"is_first_order" boolean DEFAULT true NOT NULL,
	"promised_minutes" integer NOT NULL,
	"elapsed_minutes" integer NOT NULL,
	"total" integer NOT NULL,
	"rescued" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replenishment_orders" (
	"id" serial PRIMARY KEY,
	"customer_id" integer NOT NULL,
	"items" jsonb NOT NULL,
	"subtotal" integer NOT NULL,
	"credit_applied" integer NOT NULL,
	"total" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shelf_audits" (
	"id" serial PRIMARY KEY,
	"sku_id" integer NOT NULL,
	"app_stock_before" integer NOT NULL,
	"counted_stock" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skus" (
	"id" serial PRIMARY KEY,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"store_id" text NOT NULL,
	"price" integer NOT NULL,
	"app_stock" integer NOT NULL,
	"shelf_stock" integer NOT NULL,
	"phantom_risk_score" real DEFAULT 0 NOT NULL,
	"quarantined" boolean DEFAULT false NOT NULL,
	"last_audit_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_credits" (
	"id" serial PRIMARY KEY,
	"customer_id" integer NOT NULL,
	"order_id" integer,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_store_id_dark_stores_id_fkey" FOREIGN KEY ("store_id") REFERENCES "dark_stores"("id");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_sku_id_skus_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_substituted_sku_id_skus_id_fkey" FOREIGN KEY ("substituted_sku_id") REFERENCES "skus"("id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_dark_stores_id_fkey" FOREIGN KEY ("store_id") REFERENCES "dark_stores"("id");--> statement-breakpoint
ALTER TABLE "replenishment_orders" ADD CONSTRAINT "replenishment_orders_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");--> statement-breakpoint
ALTER TABLE "shelf_audits" ADD CONSTRAINT "shelf_audits_sku_id_skus_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "skus" ADD CONSTRAINT "skus_store_id_dark_stores_id_fkey" FOREIGN KEY ("store_id") REFERENCES "dark_stores"("id");--> statement-breakpoint
ALTER TABLE "wallet_credits" ADD CONSTRAINT "wallet_credits_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");--> statement-breakpoint
ALTER TABLE "wallet_credits" ADD CONSTRAINT "wallet_credits_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL;