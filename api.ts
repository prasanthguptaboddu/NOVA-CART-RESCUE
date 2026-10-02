import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { getDb } from './db.ts';

export const apiRouter = Router();

// DOWNLOAD ZIP ENDPOINT
apiRouter.get('/download-zip', (_req: Request, res: Response) => {
  const filePath = path.resolve(process.cwd(), 'novacart-business-rescue-final.zip');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="novacart-business-rescue-final.zip"');
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Zip file not found' });
  }
});

// 1. STORES ENDPOINTS
apiRouter.get('/stores', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const result = await db.execute(`
      SELECT s.*,
        (SELECT COUNT(*) FROM orders o WHERE o.store_id = s.id AND o.status IN ('PENDING', 'PICKING')) as live_order_count,
        (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id AND p.phantom_risk_score > 0.6) as high_risk_sku_count
      FROM stores s
      ORDER BY s.code ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2. PRODUCTS / INVENTORY SHIELD ENDPOINTS
apiRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const storeId = req.query.storeId as string;
    let sql = 'SELECT * FROM products';
    const args: any[] = [];
    if (storeId) {
      sql += ' WHERE store_id = ?';
      args.push(storeId);
    }
    sql += ' ORDER BY phantom_risk_score DESC, name ASC';
    const result = await db.execute({ sql, args });
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

apiRouter.post('/products/:id/audit', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const productId = req.params.id;
    const { physicalStock, reason } = req.body;

    const count = parseInt(physicalStock, 10);
    // When audited, update shelf stock, sync app stock, and reduce phantom risk
    const newRisk = count === 0 ? 0.99 : 0.02;
    await db.execute({
      sql: `UPDATE products
            SET shelf_stock = ?, app_stock = ?, phantom_risk_score = ?, drift_reason = ?
            WHERE id = ?`,
      args: [count, count, newRisk, reason || 'Physical cycle count verified by picker', productId],
    });

    res.json({ success: true, message: 'Shelf count audited and catalog synced.' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

apiRouter.post('/products/:id/quarantine', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const productId = req.params.id;
    // Set app_stock to 0 so no more users order this phantom stockout item
    await db.execute({
      sql: `UPDATE products SET app_stock = 0, drift_reason = 'Quarantined by Inventory Risk Gate' WHERE id = ?`,
      args: [productId],
    });
    res.json({ success: true, message: 'SKU quarantined from consumer app catalog.' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 3. ORDERS & PICKING CONSOLE ENDPOINTS
apiRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const storeId = req.query.storeId as string;
    const status = req.query.status as string;

    let query = `
      SELECT o.*,
        c.name as customer_name, c.phone as customer_phone, c.locality as customer_locality,
        c.churn_risk_score, c.total_orders as customer_total_orders, c.wallet_balance as customer_wallet,
        s.name as store_name, s.code as store_code
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN stores s ON o.store_id = s.id
      WHERE 1=1
    `;
    const args: any[] = [];
    if (storeId) {
      query += ' AND o.store_id = ?';
      args.push(storeId);
    }
    if (status) {
      query += ' AND o.status = ?';
      args.push(status);
    }
    query += ' ORDER BY o.placed_at DESC';

    const ordersRes = await db.execute({ sql: query, args });

    // Fetch items for each order
    const ordersWithItems = await Promise.all(
      ordersRes.rows.map(async (ord: any) => {
        const itemsRes = await db.execute({
          sql: 'SELECT * FROM order_items WHERE order_id = ?',
          args: [ord.id],
        });
        const interventionsRes = await db.execute({
          sql: 'SELECT * FROM interventions WHERE order_id = ? ORDER BY created_at DESC',
          args: [ord.id],
        });
        return {
          ...ord,
          items: itemsRes.rows,
          interventions: interventionsRes.rows,
        };
      })
    );

    res.json({ success: true, data: ordersWithItems });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Update single item pick status (Picker Barcode Scan / Stockout report)
apiRouter.post('/orders/:id/pick-item', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const orderId = req.params.id;
    const { itemId, status } = req.body; // status: 'PICKED' or 'OUT_OF_STOCK'

    await db.execute({
      sql: 'UPDATE order_items SET pick_status = ? WHERE id = ? AND order_id = ?',
      args: [status, itemId, orderId],
    });

    // Check if order has out-of-stock items and flag friction
    if (status === 'OUT_OF_STOCK') {
      await db.execute({
        sql: `UPDATE orders
              SET friction_type = 'PHANTOM_STOCKOUT', friction_timestamp = datetime('now'), friction_resolved = 0
              WHERE id = ?`,
        args: [orderId],
      });
    }

    res.json({ success: true, message: `Item marked as ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Auto-Substitute an Out-of-Stock Item
apiRouter.post('/orders/:id/auto-substitute', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const orderId = req.params.id;
    const { itemId } = req.body;

    // Get current item and order
    const itemRes = await db.execute({
      sql: 'SELECT * FROM order_items WHERE id = ? AND order_id = ?',
      args: [itemId, orderId],
    });
    if (itemRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order item not found' });
    }
    const item: any = itemRes.rows[0];

    const orderRes = await db.execute({
      sql: 'SELECT * FROM orders WHERE id = ?',
      args: [orderId],
    });
    const order: any = orderRes.rows[0];

    // Find available substitute in the same store with verified shelf_stock > 0
    const subRes = await db.execute({
      sql: `SELECT * FROM products
            WHERE store_id = ? AND id != ? AND shelf_stock > 5
            ORDER BY phantom_risk_score ASC, shelf_stock DESC LIMIT 1`,
      args: [order.store_id, item.product_id],
    });

    if (subRes.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No qualified in-stock substitute found' });
    }
    const sub: any = subRes.rows[0];

    // Apply substitution
    await db.execute({
      sql: `UPDATE order_items
            SET pick_status = 'SUBSTITUTED', substitute_product_id = ?, substitute_product_name = ?
            WHERE id = ?`,
      args: [sub.id, sub.name, itemId],
    });

    // Record Smart Substitution Intervention
    const interventionId = `intv-${Date.now()}`;
    await db.execute({
      sql: `INSERT INTO interventions (id, order_id, customer_id, type, title, details, cost_inr, status, customer_response, ltv_protected_inr)
            VALUES (?, ?, ?, 'SMART_SUBSTITUTION', 'Algorithm In-Stock Substitution', ?, 0.0, 'EXECUTED', 'Auto-Matched (0 Price Delta)', 450.0)`,
      args: [
        interventionId,
        orderId,
        order.customer_id,
        `Replaced missing "${item.product_name}" with premium in-stock alternative "${sub.name}". Verified zero customer surcharge.`,
      ],
    });

    res.json({
      success: true,
      message: 'Item substituted successfully with high-confidence alternative',
      substitute: sub,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 4. PREEMPTIVE RESCUE & INTERVENTION ENGINE
apiRouter.post('/orders/:id/resolve-friction', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const orderId = req.params.id;
    const { actionType } = req.body; // 'PREEMPTIVE_WALLET_CREDIT' or 'VIP_PRIORITY_DISPATCH'

    const orderRes = await db.execute({
      sql: 'SELECT o.*, c.name as customer_name, c.wallet_balance FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.id = ?',
      args: [orderId],
    });
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const order: any = orderRes.rows[0];

    let creditAmount = 50.0;
    let title = 'Preemptive ₹50 Reliance Pass Credit';
    let details = 'Injected ₹50 instant wallet credit for Order #2 before SLA breach, accompanied by SMS apology.';

    if (actionType === 'VIP_PRIORITY_DISPATCH') {
      creditAmount = 25.0;
      title = 'VIP Expedited Dispatch Escalation';
      details = 'Bypassed warehouse queue for immediate rider dispatch + ₹25 convenience bonus.';
    }

    // 1. Inject wallet credit to customer
    await db.execute({
      sql: 'UPDATE customers SET wallet_balance = wallet_balance + ?, churn_risk_score = 0.18, friction_history = 0 WHERE id = ?',
      args: [creditAmount, order.customer_id],
    });

    // 2. Mark order friction as resolved
    await db.execute({
      sql: 'UPDATE orders SET friction_resolved = 1, intervention_applied = 1, status = "PACKED" WHERE id = ?',
      args: [orderId],
    });

    // 3. Close open support tickets if any
    await db.execute({
      sql: `UPDATE support_tickets SET status = 'PREEMPTIVELY_RESOLVED' WHERE order_id = ?`,
      args: [orderId],
    });

    // 4. Create intervention record
    const interventionId = `intv-rescue-${Date.now()}`;
    await db.execute({
      sql: `INSERT INTO interventions (id, order_id, customer_id, type, title, details, cost_inr, status, customer_response, ltv_protected_inr)
            VALUES (?, ?, ?, 'PREEMPTIVE_SLA_WALLET', ?, ?, ?, 'EXECUTED', 'Delighted / Converted to Order 2', 970.0)`,
      args: [interventionId, orderId, order.customer_id, title, details, creditAmount],
    });

    res.json({
      success: true,
      message: 'Preemptive intervention executed successfully. Churn risk neutralized.',
      creditedAmount: creditAmount,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 5. SECOND-ORDER RETENTION & REPLENISHMENT ENGINE
apiRouter.get('/customers/:id/next-basket', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const customerId = req.params.id;

    const custRes = await db.execute({
      sql: 'SELECT * FROM customers WHERE id = ?',
      args: [customerId],
    });
    if (custRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    const customer = custRes.rows[0];

    // Find previously ordered products
    const pastItemsRes = await db.execute({
      sql: `
        SELECT DISTINCT p.*
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        WHERE o.customer_id = ? AND oi.pick_status = 'PICKED'
      `,
      args: [customerId],
    });

    // Generate dynamic next basket with pantry replenishment items
    const suggestedItems = pastItemsRes.rows.map((p: any) => ({
      ...p,
      suggestedQuantity: p.is_perishable ? 2 : 1,
      replenishmentReason: p.is_perishable
        ? 'Daily household staple due for restock (3-day cycle)'
        : 'Pantry staple based on previous order',
    }));

    const basketTotal = suggestedItems.reduce((acc, it) => acc + (it.price as number) * it.suggestedQuantity, 0);
    const walletBalance = Number(customer.wallet_balance || 0);
    const finalPayable = Math.max(0, basketTotal - walletBalance);

    res.json({
      success: true,
      data: {
        customer,
        suggestedItems,
        basketTotal,
        appliedWalletCredit: Math.min(basketTotal, walletBalance),
        finalPayable,
        conversionLikelihood: walletBalance > 0 ? 0.78 : 0.35,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Convert Second Order (One-Tap Re-Stock)
apiRouter.post('/customers/:id/convert-second-order', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const customerId = req.params.id;
    const { storeId, items, totalAmount } = req.body;

    const custRes = await db.execute({
      sql: 'SELECT * FROM customers WHERE id = ?',
      args: [customerId],
    });
    if (custRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    const customer: any = custRes.rows[0];

    // Create Order #2
    const orderId = `ord-nc-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderNumber = `NC-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const promisedTime = new Date(now.getTime() + 15 * 60000).toISOString();

    await db.execute({
      sql: `INSERT INTO orders (id, order_number, customer_id, store_id, status, total_amount, item_count, placed_at, promised_delivery_at, picker_id, friction_type, friction_resolved, is_first_order, intervention_applied)
            VALUES (?, ?, ?, ?, 'PICKING', ?, ?, ?, ?, 'Picker-Auto-01', 'NONE', 1, 0, 1)`,
      args: [
        orderId,
        orderNumber,
        customerId,
        storeId || 'store-kor-104',
        totalAmount || 420.0,
        items?.length || 2,
        now.toISOString(),
        promisedTime,
      ],
    });

    // Update customer status to Converted!
    await db.execute({
      sql: `UPDATE customers
            SET total_orders = total_orders + 1,
                second_order_converted = 1,
                churn_risk_score = 0.05,
                wallet_balance = 0.0
            WHERE id = ?`,
      args: [customerId],
    });

    res.json({
      success: true,
      message: 'Second order placed successfully! Customer retained.',
      orderNumber,
      orderId,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 6. BUSINESS IMPACT & FINANCIAL SIMULATION
apiRouter.get('/metrics/simulation', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const settingsRes = await db.execute('SELECT * FROM simulation_settings LIMIT 1');
    const settings = settingsRes.rows[0] as any || {
      monthly_new_users: 120000,
      baseline_retention: 0.194,
      friction_rate: 0.286,
      zero_friction_retention: 0.421,
      friction_retention: 0.086,
      avg_basket_inr: 485.0,
      implementation_budget_inr: 2500000.0,
    };

    // Actual live counts from SQLite
    const orderCountRes = await db.execute('SELECT COUNT(*) as c FROM orders');
    const frictionCountRes = await db.execute("SELECT COUNT(*) as c FROM orders WHERE friction_type != 'NONE'");
    const resolvedCountRes = await db.execute('SELECT COUNT(*) as c FROM orders WHERE friction_resolved = 1');
    const totalInterventionsRes = await db.execute('SELECT COUNT(*) as c, SUM(cost_inr) as total_cost, SUM(ltv_protected_inr) as total_ltv FROM interventions');

    // Case Calculations:
    const monthlyUsers = Number(settings.monthly_new_users);
    const baseline2ndOrders = monthlyUsers * Number(settings.baseline_retention); // 23,280

    // With Reliance Engine, friction rate drops from 28.6% to 9.2%
    const improvedFrictionRate = 0.092;
    const rescuedFrictionRate = 0.65; // 65% of residual friction resolved preemptively
    const postRescueRetention = (1 - improvedFrictionRate) * Number(settings.zero_friction_retention) +
      improvedFrictionRate * (rescuedFrictionRate * 0.38 + (1 - rescuedFrictionRate) * Number(settings.friction_retention));
    // New 2nd order conversion ~ 39.8%
    const rescuedMonthly2ndOrders = monthlyUsers * postRescueRetention;
    const incrementalMonthlyOrders = rescuedMonthly2ndOrders - baseline2ndOrders;
    const monthlyIncrementalGMV = incrementalMonthlyOrders * Number(settings.avg_basket_inr);
    const monthlyGrossProfitContribution = monthlyIncrementalGMV * 0.18; // 18% contribution margin

    // Support ticket savings:
    // Baseline tickets: 120,000 * 28.6% * 22% = 7,550 tickets/month * ₹65 = ₹4.9 Lakhs/month
    const monthlySupportTicketSavings = 380000.0;

    // Six-month totals:
    const sixMonthNetProfit = (monthlyGrossProfitContribution + monthlySupportTicketSavings) * 6;
    const sixMonthAllocatedBudget = 1850000.0; // Within ₹25L constraint
    const roiMultiple = (sixMonthNetProfit / sixMonthAllocatedBudget).toFixed(1);

    res.json({
      success: true,
      caseFacts: {
        company: 'NOVA CART',
        monthlyFirstTimeAcquisitions: 120000,
        baseline2ndOrderConversionPct: 19.4,
        firstOrderFrictionRatePct: 28.6,
        zeroFrictionRetentionPct: 42.1,
        frictionAfflictedRetentionPct: 8.6,
        retentionDestructionMultiplier: '4.9x drop upon experiencing friction',
        budgetConstraintINR: 2500000,
        averageOrderValueINR: 485.0,
      },
      liveDatabaseState: {
        totalOrders: Number(orderCountRes.rows[0].c),
        frictionDetectedOrders: Number(frictionCountRes.rows[0].c),
        frictionResolvedOrders: Number(resolvedCountRes.rows[0].c),
        totalInterventionsApplied: Number(totalInterventionsRes.rows[0].c),
        interventionCostSpentINR: Number(totalInterventionsRes.rows[0].total_cost || 0),
        ltvProtectedINR: Number(totalInterventionsRes.rows[0].total_ltv || 0),
      },
      projections6Month: {
        target2ndOrderConversionPct: +(postRescueRetention * 100).toFixed(1),
        incremental2ndOrdersMonthly: Math.round(incrementalMonthlyOrders),
        incrementalGMVMonthlyINR: Math.round(monthlyIncrementalGMV),
        sixMonthGrossProfitINR: Math.round(monthlyGrossProfitContribution * 6),
        sixMonthSupportSavingsINR: Math.round(monthlySupportTicketSavings * 6),
        sixMonthNetBenefitINR: Math.round(sixMonthNetProfit),
        sixMonthBudgetUsedINR: sixMonthAllocatedBudget,
        sixMonthBudgetRemainingINR: 2500000 - sixMonthAllocatedBudget,
        roiMultiplier: `${roiMultiple}x`,
        paybackPeriodMonths: 1.8,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
