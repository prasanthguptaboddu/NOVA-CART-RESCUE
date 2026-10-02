export interface Store {
  id: string;
  code: string;
  name: string;
  city: string;
  locality: string;
  sla_minutes: number;
  active_orders: number;
  picker_count: number;
  phantom_sku_count: number;
  avg_pick_time_mins: number;
  status: 'OPTIMAL' | 'WARNING' | 'CONGESTED';
  live_order_count?: number;
  high_risk_sku_count?: number;
}

export interface Product {
  id: string;
  sku: string;
  store_id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  shelf_stock: number;
  app_stock: number;
  phantom_risk_score: number;
  drift_reason: string;
  substitute_sku: string;
  is_perishable: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  pick_status: 'PENDING' | 'PICKED' | 'OUT_OF_STOCK' | 'SUBSTITUTED';
  substitute_product_id?: string | null;
  substitute_product_name?: string | null;
}

export interface Intervention {
  id: string;
  order_id: string;
  customer_id: string;
  type: string;
  title: string;
  details: string;
  cost_inr: number;
  status: string;
  customer_response: string;
  ltv_protected_inr: number;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_locality: string;
  customer_total_orders: number;
  customer_wallet: number;
  churn_risk_score: number;
  store_id: string;
  store_name: string;
  store_code: string;
  status: 'PENDING' | 'PICKING' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  total_amount: number;
  item_count: number;
  placed_at: string;
  promised_delivery_at: string;
  actual_delivered_at?: string | null;
  picker_id: string;
  friction_type: 'NONE' | 'PHANTOM_STOCKOUT' | 'SLA_BREACH' | 'MISSING_ITEM';
  friction_resolved: number;
  friction_timestamp?: string | null;
  is_first_order: number;
  intervention_applied: number;
  items?: OrderItem[];
  interventions?: Intervention[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  locality: string;
  total_orders: number;
  friction_history: number;
  second_order_converted: number;
  churn_risk_score: number;
  wallet_balance: number;
  preferred_delivery_slot: string;
}

export interface SimulationMetrics {
  caseFacts: {
    company: string;
    monthlyFirstTimeAcquisitions: number;
    baseline2ndOrderConversionPct: number;
    firstOrderFrictionRatePct: number;
    zeroFrictionRetentionPct: number;
    frictionAfflictedRetentionPct: number;
    retentionDestructionMultiplier: string;
    budgetConstraintINR: number;
    averageOrderValueINR: number;
  };
  liveDatabaseState: {
    totalOrders: number;
    frictionDetectedOrders: number;
    frictionResolvedOrders: number;
    totalInterventionsApplied: number;
    interventionCostSpentINR: number;
    ltvProtectedINR: number;
  };
  projections6Month: {
    target2ndOrderConversionPct: number;
    incremental2ndOrdersMonthly: number;
    incrementalGMVMonthlyINR: number;
    sixMonthGrossProfitINR: number;
    sixMonthSupportSavingsINR: number;
    sixMonthNetBenefitINR: number;
    sixMonthBudgetUsedINR: number;
    sixMonthBudgetRemainingINR: number;
    roiMultiplier: string;
    paybackPeriodMonths: number;
  };
}
