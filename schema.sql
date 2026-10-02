-- SQLite Schema for NOVA CART Reliance Engine
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  sla_minutes INTEGER DEFAULT 15,
  active_orders INTEGER DEFAULT 0,
  picker_count INTEGER DEFAULT 8,
  phantom_sku_count INTEGER DEFAULT 0,
  avg_pick_time_mins REAL DEFAULT 4.2,
  status TEXT DEFAULT 'OPTIMAL',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  store_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  price REAL NOT NULL,
  shelf_stock INTEGER DEFAULT 0,
  app_stock INTEGER DEFAULT 0,
  phantom_risk_score REAL DEFAULT 0.05,
  drift_reason TEXT DEFAULT '',
  substitute_sku TEXT DEFAULT '',
  is_perishable INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  locality TEXT NOT NULL,
  total_orders INTEGER DEFAULT 1,
  friction_history INTEGER DEFAULT 0,
  second_order_converted INTEGER DEFAULT 0,
  churn_risk_score REAL DEFAULT 0.20,
  wallet_balance REAL DEFAULT 0.0,
  preferred_delivery_slot TEXT DEFAULT 'Immediate (15m)',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  total_amount REAL NOT NULL,
  item_count INTEGER NOT NULL,
  placed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  promised_delivery_at TEXT NOT NULL,
  actual_delivered_at TEXT,
  picker_id TEXT DEFAULT 'Picker-01',
  friction_type TEXT DEFAULT 'NONE',
  friction_resolved INTEGER DEFAULT 0,
  friction_timestamp TEXT,
  is_first_order INTEGER DEFAULT 1,
  intervention_applied INTEGER DEFAULT 0,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  pick_status TEXT DEFAULT 'PENDING',
  substitute_product_id TEXT,
  substitute_product_name TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS interventions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT NOT NULL,
  cost_inr REAL DEFAULT 0.0,
  status TEXT DEFAULT 'PENDING_APPROVAL',
  customer_response TEXT DEFAULT 'Awaiting',
  ltv_protected_inr REAL DEFAULT 0.0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT UNIQUE NOT NULL,
  order_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  sentiment TEXT DEFAULT 'ANGRY',
  status TEXT DEFAULT 'OPEN',
  cost_inr REAL DEFAULT 0.0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS simulation_settings (
  id TEXT PRIMARY KEY,
  monthly_new_users INTEGER DEFAULT 120000,
  baseline_retention REAL DEFAULT 0.194,
  friction_rate REAL DEFAULT 0.286,
  zero_friction_retention REAL DEFAULT 0.421,
  friction_retention REAL DEFAULT 0.086,
  avg_basket_inr REAL DEFAULT 485.0,
  implementation_budget_inr REAL DEFAULT 2500000.0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
