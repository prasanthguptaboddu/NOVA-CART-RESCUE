export type TabId = "diagnostic" | "operations" | "inventory" | "retention" | "impact";

export interface Overview {
  orders: { active: number; breached: number; rescued: number };
  skus: { highRisk: number; quarantined: number; total: number };
  customers: { total: number; repeat: number; avgChurn: number };
  creditsIssued: number;
  audits: number;
}

export interface DarkStore {
  id: string;
  name: string;
  cluster: string;
  activePickers: number;
  queueDepth: number;
  avgPickMinutes: number;
}

export interface Sku {
  id: number;
  code: string;
  name: string;
  category: string;
  storeId: string;
  price: number;
  appStock: number;
  shelfStock: number;
  phantomRiskScore: number;
  quarantined: boolean;
  lastAuditAt: string;
}

export interface OrderItem {
  id: number;
  qty: number;
  unitPrice: number;
  picked: boolean;
  substitute: string | null;
  sku: { id: number; code: string; name: string; category: string; shelfStock: number; quarantined: boolean };
}

export interface Order {
  id: number;
  code: string;
  storeId: string;
  status: "picking" | "packed" | "out_for_delivery" | "delivered";
  promisedMinutes: number;
  elapsedMinutes: number;
  total: number;
  rescued: boolean;
  customer: { id: number; name: string; churnRisk: number; walletCredit: number };
  items: OrderItem[];
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  storeId: string;
  walletCredit: number;
  churnRisk: number;
  ordersCount: number;
}

export interface BasketItem {
  skuId: number;
  name: string;
  category: string;
  qty: number;
  price: number;
  cycleDays: number;
  dueInDays: number;
  swapped: boolean;
}

export interface Basket {
  customer: Customer;
  items: BasketItem[];
  subtotal: number;
  creditApplied: number;
  total: number;
  history: { id: number; total: number; creditApplied: number; createdAt: string; items: { name: string; qty: number }[] }[];
}
