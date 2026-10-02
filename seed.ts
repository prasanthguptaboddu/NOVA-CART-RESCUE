import { getDb, initializeDatabase } from '../server/db.ts';

export async function seed() {
  console.log('--- Initializing NOVA CART SQLite Database ---');
  await initializeDatabase();
  const db = getDb();

  // Check if already seeded
  const check = await db.execute('SELECT COUNT(*) as count FROM stores');
  if (Number(check.rows[0].count) > 0) {
    console.log('Database already contains records. Clearing and reseeding...');
    await db.execute('DELETE FROM order_items');
    await db.execute('DELETE FROM interventions');
    await db.execute('DELETE FROM support_tickets');
    await db.execute('DELETE FROM orders');
    await db.execute('DELETE FROM products');
    await db.execute('DELETE FROM customers');
    await db.execute('DELETE FROM stores');
    await db.execute('DELETE FROM simulation_settings');
  }

  // 1. Seed Dark Stores
  const stores = [
    {
      id: 'store-kor-104',
      code: 'DS-KOR-104',
      name: 'Koramangala 4th Block Dark Store',
      city: 'Bangalore',
      locality: 'Koramangala',
      sla_minutes: 15,
      active_orders: 14,
      picker_count: 9,
      phantom_sku_count: 18,
      avg_pick_time_mins: 7.8,
      status: 'WARNING', // High picking congestion
    },
    {
      id: 'store-ind-102',
      code: 'DS-IND-102',
      name: 'Indiranagar 100ft Rd Dark Store',
      city: 'Bangalore',
      locality: 'Indiranagar',
      sla_minutes: 15,
      active_orders: 8,
      picker_count: 8,
      phantom_sku_count: 7,
      avg_pick_time_mins: 3.9,
      status: 'OPTIMAL',
    },
    {
      id: 'store-hsr-108',
      code: 'DS-HSR-108',
      name: 'HSR Sector 2 Dark Store',
      city: 'Bangalore',
      locality: 'HSR Layout',
      sla_minutes: 15,
      active_orders: 19,
      picker_count: 7,
      phantom_sku_count: 24,
      avg_pick_time_mins: 8.6,
      status: 'CONGESTED', // Severe friction hotspot
    },
    {
      id: 'store-wfd-112',
      code: 'DS-WFD-112',
      name: 'Whitefield Inner Circle Dark Store',
      city: 'Bangalore',
      locality: 'Whitefield',
      sla_minutes: 20,
      active_orders: 6,
      picker_count: 6,
      phantom_sku_count: 5,
      avg_pick_time_mins: 4.1,
      status: 'OPTIMAL',
    },
  ];

  for (const s of stores) {
    await db.execute({
      sql: `INSERT INTO stores (id, code, name, city, locality, sla_minutes, active_orders, picker_count, phantom_sku_count, avg_pick_time_mins, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        s.id,
        s.code,
        s.name,
        s.city,
        s.locality,
        s.sla_minutes,
        s.active_orders,
        s.picker_count,
        s.phantom_sku_count,
        s.avg_pick_time_mins,
        s.status,
      ],
    });
  }

  // 2. Seed Products (with real Phantom Stock risk characteristics)
  const products = [
    {
      id: 'prod-milk-a2',
      sku: 'SKU-DAIRY-001',
      store_id: 'store-kor-104',
      name: 'Akshayakalpa Organic A2 Pasteurized Milk (500ml)',
      category: 'Dairy & Eggs',
      unit: '500 ml pouch',
      price: 44.0,
      shelf_stock: 0, // PHANTOM MISMATCH!
      app_stock: 9, // App showed 9, shelf has 0
      phantom_risk_score: 0.94,
      drift_reason: 'Unscanned morning pouch leakage shrinkage',
      substitute_sku: 'SKU-DAIRY-002',
      is_perishable: 1,
    },
    {
      id: 'prod-milk-nandini',
      sku: 'SKU-DAIRY-002',
      store_id: 'store-kor-104',
      name: 'Nandini GoodLife Toned Milk (500ml Tetra)',
      category: 'Dairy & Eggs',
      unit: '500 ml tetra',
      price: 38.0,
      shelf_stock: 42,
      app_stock: 42,
      phantom_risk_score: 0.02,
      drift_reason: 'Stable shelf batch',
      substitute_sku: '',
      is_perishable: 0,
    },
    {
      id: 'prod-yogurt-epigamia',
      sku: 'SKU-DAIRY-003',
      store_id: 'store-hsr-108',
      name: 'Epigamia Greek Yogurt Blueberry (90g)',
      category: 'Dairy & Eggs',
      unit: '90g cup',
      price: 55.0,
      shelf_stock: 1, // High phantom risk
      app_stock: 12,
      phantom_risk_score: 0.88,
      drift_reason: 'Cold chain expiration purge missed in WMS',
      substitute_sku: 'SKU-DAIRY-004',
      is_perishable: 1,
    },
    {
      id: 'prod-yogurt-mango',
      sku: 'SKU-DAIRY-004',
      store_id: 'store-hsr-108',
      name: 'Epigamia Greek Yogurt Alphonso Mango (90g)',
      category: 'Dairy & Eggs',
      unit: '90g cup',
      price: 55.0,
      shelf_stock: 28,
      app_stock: 28,
      phantom_risk_score: 0.04,
      drift_reason: '',
      substitute_sku: '',
      is_perishable: 1,
    },
    {
      id: 'prod-bread-sourdough',
      sku: 'SKU-BAKE-001',
      store_id: 'store-ind-102',
      name: 'The Baker\'s Dozen Artisan Sourdough Loaf (300g)',
      category: 'Bakery & Staples',
      unit: '300g loaf',
      price: 110.0,
      shelf_stock: 14,
      app_stock: 15,
      phantom_risk_score: 0.06,
      drift_reason: '',
      substitute_sku: 'SKU-BAKE-002',
      is_perishable: 1,
    },
    {
      id: 'prod-bread-multigrain',
      sku: 'SKU-BAKE-002',
      store_id: 'store-kor-104',
      name: 'English Oven 100% Whole Wheat Bread (400g)',
      category: 'Bakery & Staples',
      unit: '400g pack',
      price: 52.0,
      shelf_stock: 35,
      app_stock: 35,
      phantom_risk_score: 0.03,
      drift_reason: '',
      substitute_sku: '',
      is_perishable: 1,
    },
    {
      id: 'prod-veg-tomato',
      sku: 'SKU-VEG-001',
      store_id: 'store-kor-104',
      name: 'Farm Fresh Hybrid Tomatoes (500g)',
      category: 'Fresh Vegetables',
      unit: '500g',
      price: 28.0,
      shelf_stock: 3,
      app_stock: 18,
      phantom_risk_score: 0.82,
      drift_reason: 'Quality rejection during crate sorting',
      substitute_sku: 'SKU-VEG-002',
      is_perishable: 1,
    },
    {
      id: 'prod-veg-onion',
      sku: 'SKU-VEG-002',
      store_id: 'store-kor-104',
      name: 'Nashik Red Onions (1kg)',
      category: 'Fresh Vegetables',
      unit: '1 kg bag',
      price: 36.0,
      shelf_stock: 65,
      app_stock: 65,
      phantom_risk_score: 0.01,
      drift_reason: '',
      substitute_sku: '',
      is_perishable: 0,
    },
    {
      id: 'prod-coffee-filter',
      sku: 'SKU-BEV-001',
      store_id: 'store-hsr-108',
      name: 'Cothas Traditional Filter Coffee 85:15 (500g)',
      category: 'Snacks & Beverages',
      unit: '500g pouch',
      price: 245.0,
      shelf_stock: 18,
      app_stock: 18,
      phantom_risk_score: 0.05,
      drift_reason: '',
      substitute_sku: '',
      is_perishable: 0,
    },
    {
      id: 'prod-eggs-brown',
      sku: 'SKU-DAIRY-005',
      store_id: 'store-kor-104',
      name: 'Eggoz Free Range Brown Eggs (Pack of 6)',
      category: 'Dairy & Eggs',
      unit: '6 pcs pack',
      price: 89.0,
      shelf_stock: 0,
      app_stock: 14,
      phantom_risk_score: 0.96,
      drift_reason: 'Tray breakage during intake handling',
      substitute_sku: 'SKU-DAIRY-006',
      is_perishable: 1,
    },
    {
      id: 'prod-eggs-white',
      sku: 'SKU-DAIRY-006',
      store_id: 'store-kor-104',
      name: 'Eggoz Farm Fresh White Eggs (Pack of 6)',
      category: 'Dairy & Eggs',
      unit: '6 pcs pack',
      price: 65.0,
      shelf_stock: 45,
      app_stock: 45,
      phantom_risk_score: 0.02,
      drift_reason: '',
      substitute_sku: '',
      is_perishable: 1,
    },
    {
      id: 'prod-atta-aashirvaad',
      sku: 'SKU-STAPLE-001',
      store_id: 'store-ind-102',
      name: 'Aashirvaad Shudh Chakki Atta (5kg)',
      category: 'Pantry Essentials',
      unit: '5 kg bag',
      price: 260.0,
      shelf_stock: 22,
      app_stock: 22,
      phantom_risk_score: 0.01,
      drift_reason: '',
      substitute_sku: '',
      is_perishable: 0,
    },
  ];

  for (const p of products) {
    await db.execute({
      sql: `INSERT INTO products (id, sku, store_id, name, category, unit, price, shelf_stock, app_stock, phantom_risk_score, drift_reason, substitute_sku, is_perishable)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        p.id,
        p.sku,
        p.store_id,
        p.name,
        p.category,
        p.unit,
        p.price,
        p.shelf_stock,
        p.app_stock,
        p.phantom_risk_score,
        p.drift_reason,
        p.substitute_sku,
        p.is_perishable,
      ],
    });
  }

  // 3. Seed Customers (representing the critical 1st-to-2nd order conversion cohorts)
  const customers = [
    {
      id: 'cust-aravind-01',
      name: 'Aravind Swaminathan',
      email: 'aravind.s@example.com',
      phone: '+91 98450 12841',
      locality: 'Koramangala 4th Block',
      total_orders: 1,
      friction_history: 1, // Had phantom stockout on Order #1
      second_order_converted: 0, // Critical churn risk!
      churn_risk_score: 0.89,
      wallet_balance: 0.0,
      preferred_delivery_slot: 'Morning 7am-8am',
    },
    {
      id: 'cust-priya-02',
      name: 'Priya Nambiar',
      email: 'priya.n@example.com',
      phone: '+91 99801 44520',
      locality: 'HSR Sector 2',
      total_orders: 1,
      friction_history: 1, // SLA delay (>34 mins) on Order #1
      second_order_converted: 0,
      churn_risk_score: 0.82,
      wallet_balance: 0.0,
      preferred_delivery_slot: 'Evening 6pm-7pm',
    },
    {
      id: 'cust-rohit-03',
      name: 'Rohit Verma',
      email: 'rohit.v@example.com',
      phone: '+91 98711 23901',
      locality: 'Indiranagar 100ft Rd',
      total_orders: 2,
      friction_history: 0, // Flawless first order
      second_order_converted: 1, // Successfully converted!
      churn_risk_score: 0.12,
      wallet_balance: 50.0,
      preferred_delivery_slot: 'Immediate (15m)',
    },
    {
      id: 'cust-ananya-04',
      name: 'Ananya Sharma',
      email: 'ananya.s@example.com',
      phone: '+91 97312 88710',
      locality: 'Koramangala 5th Block',
      total_orders: 1,
      friction_history: 1, // Had unnotified missing egg tray
      second_order_converted: 0,
      churn_risk_score: 0.94,
      wallet_balance: 0.0,
      preferred_delivery_slot: 'Immediate (15m)',
    },
    {
      id: 'cust-vikram-05',
      name: 'Vikram Joshi',
      email: 'vikram.j@example.com',
      phone: '+91 94480 33119',
      locality: 'Whitefield',
      total_orders: 3,
      friction_history: 0,
      second_order_converted: 1,
      churn_risk_score: 0.08,
      wallet_balance: 20.0,
      preferred_delivery_slot: 'Evening 7pm-8pm',
    },
    {
      id: 'cust-divya-06',
      name: 'Divya Ranganathan',
      email: 'divya.r@example.com',
      phone: '+91 96112 55902',
      locality: 'HSR Sector 1',
      total_orders: 1,
      friction_history: 0,
      second_order_converted: 0, // In active 2nd-order conversion window (Day 3)
      churn_risk_score: 0.35,
      wallet_balance: 0.0,
      preferred_delivery_slot: 'Morning 8am-9am',
    },
  ];

  for (const c of customers) {
    await db.execute({
      sql: `INSERT INTO customers (id, name, email, phone, locality, total_orders, friction_history, second_order_converted, churn_risk_score, wallet_balance, preferred_delivery_slot)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        c.id,
        c.name,
        c.email,
        c.phone,
        c.locality,
        c.total_orders,
        c.friction_history,
        c.second_order_converted,
        c.churn_risk_score,
        c.wallet_balance,
        c.preferred_delivery_slot,
      ],
    });
  }

  // 4. Seed Orders (with real operational status)
  const now = new Date();
  const minsAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();
  const minsAhead = (m: number) => new Date(now.getTime() + m * 60000).toISOString();

  const orders = [
    {
      id: 'ord-nc-8092',
      order_number: 'NC-8092',
      customer_id: 'cust-aravind-01',
      store_id: 'store-kor-104',
      status: 'PICKING',
      total_amount: 495.0,
      item_count: 4,
      placed_at: minsAgo(18), // Promised in 15 mins -> 3 mins overdue in picking!
      promised_delivery_at: minsAgo(3),
      actual_delivered_at: null,
      picker_id: 'Picker-Sunil-04',
      friction_type: 'PHANTOM_STOCKOUT',
      friction_resolved: 0,
      friction_timestamp: minsAgo(8),
      is_first_order: 1,
      intervention_applied: 0,
    },
    {
      id: 'ord-nc-8093',
      order_number: 'NC-8093',
      customer_id: 'cust-priya-02',
      store_id: 'store-hsr-108',
      status: 'PICKING',
      total_amount: 620.0,
      item_count: 5,
      placed_at: minsAgo(24), // Already overdue!
      promised_delivery_at: minsAgo(9),
      actual_delivered_at: null,
      picker_id: 'Picker-Raju-02',
      friction_type: 'SLA_BREACH',
      friction_resolved: 0,
      friction_timestamp: minsAgo(10),
      is_first_order: 1,
      intervention_applied: 0,
    },
    {
      id: 'ord-nc-8088',
      order_number: 'NC-8088',
      customer_id: 'cust-rohit-03',
      store_id: 'store-ind-102',
      status: 'DELIVERED',
      total_amount: 512.0,
      item_count: 3,
      placed_at: minsAgo(180),
      promised_delivery_at: minsAgo(165),
      actual_delivered_at: minsAgo(167),
      picker_id: 'Picker-Kiran-01',
      friction_type: 'NONE',
      friction_resolved: 1,
      friction_timestamp: null,
      is_first_order: 0,
      intervention_applied: 0,
    },
    {
      id: 'ord-nc-8094',
      order_number: 'NC-8094',
      customer_id: 'cust-ananya-04',
      store_id: 'store-kor-104',
      status: 'PACKED',
      total_amount: 384.0,
      item_count: 3,
      placed_at: minsAgo(12),
      promised_delivery_at: minsAhead(3),
      actual_delivered_at: null,
      picker_id: 'Picker-Sunil-04',
      friction_type: 'PHANTOM_STOCKOUT',
      friction_resolved: 0,
      friction_timestamp: minsAgo(5),
      is_first_order: 1,
      intervention_applied: 0,
    },
    {
      id: 'ord-nc-8095',
      order_number: 'NC-8095',
      customer_id: 'cust-divya-06',
      store_id: 'store-hsr-108',
      status: 'DELIVERED',
      total_amount: 450.0,
      item_count: 3,
      placed_at: minsAgo(4320), // 3 days ago - target for second-order basket replenishment
      promised_delivery_at: minsAgo(4305),
      actual_delivered_at: minsAgo(4307),
      picker_id: 'Picker-Raju-02',
      friction_type: 'NONE',
      friction_resolved: 1,
      friction_timestamp: null,
      is_first_order: 1,
      intervention_applied: 0,
    },
  ];

  for (const o of orders) {
    await db.execute({
      sql: `INSERT INTO orders (id, order_number, customer_id, store_id, status, total_amount, item_count, placed_at, promised_delivery_at, actual_delivered_at, picker_id, friction_type, friction_resolved, friction_timestamp, is_first_order, intervention_applied)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        o.id,
        o.order_number,
        o.customer_id,
        o.store_id,
        o.status,
        o.total_amount,
        o.item_count,
        o.placed_at,
        o.promised_delivery_at,
        o.actual_delivered_at,
        o.picker_id,
        o.friction_type,
        o.friction_resolved,
        o.friction_timestamp,
        o.is_first_order,
        o.intervention_applied,
      ],
    });
  }

  // 5. Seed Order Items
  const items = [
    // Order NC-8092 items
    {
      id: 'item-8092-1',
      order_id: 'ord-nc-8092',
      product_id: 'prod-milk-a2',
      product_name: 'Akshayakalpa Organic A2 Pasteurized Milk (500ml)',
      quantity: 2,
      unit_price: 44.0,
      pick_status: 'OUT_OF_STOCK', // Phantom item! Shelf 0
      substitute_product_id: null,
      substitute_product_name: null,
    },
    {
      id: 'item-8092-2',
      order_id: 'ord-nc-8092',
      product_id: 'prod-bread-multigrain',
      product_name: 'English Oven 100% Whole Wheat Bread (400g)',
      quantity: 1,
      unit_price: 52.0,
      pick_status: 'PICKED',
      substitute_product_id: null,
      substitute_product_name: null,
    },
    {
      id: 'item-8092-3',
      order_id: 'ord-nc-8092',
      product_id: 'prod-eggs-brown',
      product_name: 'Eggoz Free Range Brown Eggs (Pack of 6)',
      quantity: 2,
      unit_price: 89.0,
      pick_status: 'OUT_OF_STOCK', // Phantom item!
      substitute_product_id: null,
      substitute_product_name: null,
    },
    {
      id: 'item-8092-4',
      order_id: 'ord-nc-8092',
      product_id: 'prod-veg-onion',
      product_name: 'Nashik Red Onions (1kg)',
      quantity: 1,
      unit_price: 36.0,
      pick_status: 'PICKED',
      substitute_product_id: null,
      substitute_product_name: null,
    },

    // Order NC-8093 items
    {
      id: 'item-8093-1',
      order_id: 'ord-nc-8093',
      product_id: 'prod-yogurt-epigamia',
      product_name: 'Epigamia Greek Yogurt Blueberry (90g)',
      quantity: 2,
      unit_price: 55.0,
      pick_status: 'OUT_OF_STOCK',
      substitute_product_id: null,
      substitute_product_name: null,
    },
    {
      id: 'item-8093-2',
      order_id: 'ord-nc-8093',
      product_id: 'prod-coffee-filter',
      product_name: 'Cothas Traditional Filter Coffee 85:15 (500g)',
      quantity: 1,
      unit_price: 245.0,
      pick_status: 'PICKED',
      substitute_product_id: null,
      substitute_product_name: null,
    },

    // Order NC-8094 items
    {
      id: 'item-8094-1',
      order_id: 'ord-nc-8094',
      product_id: 'prod-veg-tomato',
      product_name: 'Farm Fresh Hybrid Tomatoes (500g)',
      quantity: 2,
      unit_price: 28.0,
      pick_status: 'OUT_OF_STOCK',
      substitute_product_id: null,
      substitute_product_name: null,
    },
    {
      id: 'item-8094-2',
      order_id: 'ord-nc-8094',
      product_id: 'prod-bread-multigrain',
      product_name: 'English Oven 100% Whole Wheat Bread (400g)',
      quantity: 1,
      unit_price: 52.0,
      pick_status: 'PICKED',
      substitute_product_id: null,
      substitute_product_name: null,
    },

    // Order NC-8095 (delivered 3 days ago, replenishment target)
    {
      id: 'item-8095-1',
      order_id: 'ord-nc-8095',
      product_id: 'prod-milk-nandini',
      product_name: 'Nandini GoodLife Toned Milk (500ml Tetra)',
      quantity: 3,
      unit_price: 38.0,
      pick_status: 'PICKED',
      substitute_product_id: null,
      substitute_product_name: null,
    },
    {
      id: 'item-8095-2',
      order_id: 'ord-nc-8095',
      product_id: 'prod-bread-multigrain',
      product_name: 'English Oven 100% Whole Wheat Bread (400g)',
      quantity: 1,
      unit_price: 52.0,
      pick_status: 'PICKED',
      substitute_product_id: null,
      substitute_product_name: null,
    },
  ];

  for (const it of items) {
    await db.execute({
      sql: `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, pick_status, substitute_product_id, substitute_product_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        it.id,
        it.order_id,
        it.product_id,
        it.product_name,
        it.quantity,
        it.unit_price,
        it.pick_status,
        it.substitute_product_id,
        it.substitute_product_name,
      ],
    });
  }

  // 6. Seed Support Tickets (reflecting the exact friction breakdown from the case)
  const tickets = [
    {
      id: 'tkt-401',
      ticket_number: 'TCK-2024-8901',
      order_id: 'ord-nc-8092',
      customer_id: 'cust-aravind-01',
      issue_type: 'MISSING_ITEM',
      sentiment: 'ANGRY',
      status: 'OPEN',
      cost_inr: 65.0, // Agent handling cost
    },
    {
      id: 'tkt-402',
      ticket_number: 'TCK-2024-8902',
      order_id: 'ord-nc-8093',
      customer_id: 'cust-priya-02',
      issue_type: 'DELIVERY_DELAY',
      sentiment: 'FRUSTRATED',
      status: 'OPEN',
      cost_inr: 65.0,
    },
  ];

  for (const t of tickets) {
    await db.execute({
      sql: `INSERT INTO support_tickets (id, ticket_number, order_id, customer_id, issue_type, sentiment, status, cost_inr)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        t.id,
        t.ticket_number,
        t.order_id,
        t.customer_id,
        t.issue_type,
        t.sentiment,
        t.status,
        t.cost_inr,
      ],
    });
  }

  // 7. Seed Initial Simulation Settings (Baseline Metrics from Case)
  await db.execute({
    sql: `INSERT INTO simulation_settings (id, monthly_new_users, baseline_retention, friction_rate, zero_friction_retention, friction_retention, avg_basket_inr, implementation_budget_inr)
          VALUES ('default', 120000, 0.194, 0.286, 0.421, 0.086, 485.0, 2500000.0)`,
  });

  console.log('✅ NOVA CART Database successfully seeded!');
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}
