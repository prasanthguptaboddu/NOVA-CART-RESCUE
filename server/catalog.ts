// Consumption cycle (days) per category drives the second-order replenishment basket.
export const CONSUMPTION_CYCLE_DAYS: Record<string, number> = {
  Dairy: 3,
  Bakery: 4,
  Eggs: 5,
  Produce: 5,
  Beverages: 12,
  Staples: 14,
};

export const STORES = [
  { id: "KOR", name: "Koramangala 5th Block", cluster: "Koramangala", activePickers: 6, queueDepth: 19, avgPickMinutes: 7.4 },
  { id: "IND", name: "Indiranagar 100ft Rd", cluster: "Indiranagar", activePickers: 5, queueDepth: 11, avgPickMinutes: 5.9 },
  { id: "HSR", name: "HSR Layout Sector 2", cluster: "HSR Layout", activePickers: 4, queueDepth: 23, avgPickMinutes: 9.1 },
  { id: "WFD", name: "Whitefield ITPL Main", cluster: "Whitefield", activePickers: 7, queueDepth: 8, avgPickMinutes: 4.8 },
];

export const PRODUCTS = [
  { code: "DRY-MLK-500", name: "Nandini Toned Milk 500ml", category: "Dairy", price: 27 },
  { code: "DRY-MLK-1L", name: "Akshayakalpa Organic Milk 1L", category: "Dairy", price: 92 },
  { code: "DRY-CRD-400", name: "Milky Mist Curd 400g", category: "Dairy", price: 45 },
  { code: "DRY-BTR-100", name: "Amul Salted Butter 100g", category: "Dairy", price: 58 },
  { code: "BKY-BRN-400", name: "Modern Brown Bread 400g", category: "Bakery", price: 50 },
  { code: "BKY-PAV-6", name: "Iyengar Bakery Pav (6)", category: "Bakery", price: 35 },
  { code: "EGG-FRM-12", name: "Farm Fresh Eggs (12)", category: "Eggs", price: 96 },
  { code: "EGG-FRE-6", name: "Free-Range Brown Eggs (6)", category: "Eggs", price: 78 },
  { code: "PRD-BAN-1D", name: "Robusta Bananas (dozen)", category: "Produce", price: 48 },
  { code: "PRD-TOM-1K", name: "Hybrid Tomato 1kg", category: "Produce", price: 42 },
  { code: "PRD-ONI-1K", name: "Onion 1kg", category: "Produce", price: 38 },
  { code: "STP-ATA-5K", name: "Aashirvaad Whole Wheat Atta 5kg", category: "Staples", price: 289 },
  { code: "STP-DAL-1K", name: "Tata Sampann Toor Dal 1kg", category: "Staples", price: 172 },
  { code: "BEV-COF-200", name: "Cothas Filter Coffee 200g", category: "Beverages", price: 165 },
];

export const CUSTOMERS = [
  { name: "Ananya Raghavan", phone: "+91 98451 22710", storeId: "KOR" },
  { name: "Siddharth Menon", phone: "+91 99020 48113", storeId: "KOR" },
  { name: "Farhan Qureshi", phone: "+91 97411 30982", storeId: "KOR" },
  { name: "Meghana Gowda", phone: "+91 96860 51247", storeId: "IND" },
  { name: "Rohan Kulkarni", phone: "+91 98804 77365", storeId: "IND" },
  { name: "Divya Iyer", phone: "+91 90083 14598", storeId: "HSR" },
  { name: "Karthik Subramanian", phone: "+91 95389 60421", storeId: "HSR" },
  { name: "Nikita Bhat", phone: "+91 81470 29836", storeId: "HSR" },
  { name: "Arjun Shetty", phone: "+91 99459 83170", storeId: "WFD" },
  { name: "Priyanka Das", phone: "+91 88611 45029", storeId: "WFD" },
];

/** Higher score = the app likely shows stock that is not physically on the shelf. */
export function phantomRiskScore(appStock: number, shelfStock: number, lastAuditAt: Date): number {
  const drift = Math.max(0, appStock - shelfStock) / Math.max(appStock, 1);
  const daysSinceAudit = Math.max(0, (Date.now() - lastAuditAt.getTime()) / 86_400_000);
  const emptyShelf = shelfStock === 0 && appStock > 0 ? 15 : 0;
  return Math.min(99, Math.round(drift * 70 + Math.min(daysSinceAudit, 14) * 1.6 + emptyShelf));
}
