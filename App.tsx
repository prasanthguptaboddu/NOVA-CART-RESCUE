import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { DiagnosticCockpit } from './components/DiagnosticCockpit.tsx';
import { OperationsConsole } from './components/OperationsConsole.tsx';
import { DeliveryMapTracker } from './components/DeliveryMapTracker.tsx';
import { InventoryShield } from './components/InventoryShield.tsx';
import { SecondOrderLoop } from './components/SecondOrderLoop.tsx';
import { FinancialImpact } from './components/FinancialImpact.tsx';
import { Order, Store, Product, Customer, SimulationMetrics } from './types.ts';
import { CheckCircle2, AlertCircle, Info, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('diagnosis');
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [metrics, setMetrics] = useState<SimulationMetrics | null>(null);
  const [selectedMapOrderId, setSelectedMapOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, storesRes, prodsRes, metricsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/stores'),
        fetch('/api/products'),
        fetch('/api/metrics/simulation'),
      ]);

      const [ordersData, storesData, prodsData, metricsData] = await Promise.all([
        ordersRes.json(),
        storesRes.json(),
        prodsRes.json(),
        metricsRes.json(),
      ]);

      if (ordersData.success) {
        setOrders(ordersData.data);
        // Extract distinct customers from orders for customer tab
        const custMap = new Map<string, Customer>();
        ordersData.data.forEach((o: any) => {
          if (!custMap.has(o.customer_id)) {
            custMap.set(o.customer_id, {
              id: o.customer_id,
              name: o.customer_name,
              email: `${o.customer_name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
              phone: o.customer_phone,
              locality: o.customer_locality,
              total_orders: o.customer_total_orders || 1,
              friction_history: o.friction_type !== 'NONE' ? 1 : 0,
              second_order_converted: o.customer_total_orders > 1 ? 1 : 0,
              churn_risk_score: o.churn_risk_score || 0.2,
              wallet_balance: o.customer_wallet || 0,
              preferred_delivery_slot: 'Immediate (15m)',
            });
          }
        });
        setCustomers(Array.from(custMap.values()));
      }

      if (storesData.success) setStores(storesData.data);
      if (prodsData.success) setProducts(prodsData.data);
      if (metricsData.success) setMetrics(metricsData);
    } catch (err) {
      console.error('Failed to load application data:', err);
      showToast('Error connecting to backend database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResetData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/metrics/simulation'); // trigger DB check
      await fetchData();
      showToast('Database re-synced with initial NOVA CART case state', 'success');
    } catch (err) {
      showToast('Failed to reset data', 'error');
    }
  };

  const handleAutoSubstitute = async (orderId: string, itemId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/auto-substitute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        await fetchData();
      } else {
        showToast(data.error || 'Auto-substitution failed', 'error');
      }
    } catch (err) {
      showToast('Error executing substitution', 'error');
    }
  };

  const handleResolveFriction = async (orderId: string, actionType: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/resolve-friction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        await fetchData();
      } else {
        showToast(data.error || 'Failed to resolve friction', 'error');
      }
    } catch (err) {
      showToast('Network error resolving friction', 'error');
    }
  };

  const handlePickItem = async (orderId: string, itemId: string, status: 'PICKED' | 'OUT_OF_STOCK') => {
    try {
      const res = await fetch(`/api/orders/${orderId}/pick-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, status }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Item updated to ${status}`, 'info');
        await fetchData();
      }
    } catch (err) {
      showToast('Failed to update pick item', 'error');
    }
  };

  const handleAuditProduct = async (productId: string, physicalCount: number, reason: string) => {
    try {
      const res = await fetch(`/api/products/${productId}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ physicalStock: physicalCount, reason }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Shelf inventory count audited & synced to app catalog', 'success');
        await fetchData();
      }
    } catch (err) {
      showToast('Audit failed', 'error');
    }
  };

  const handleQuarantineProduct = async (productId: string) => {
    try {
      const res = await fetch(`/api/products/${productId}/quarantine`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showToast('SKU quarantined from catalog to prevent stockouts', 'info');
        await fetchData();
      }
    } catch (err) {
      showToast('Quarantine failed', 'error');
    }
  };

  const handleConvertSecondOrder = async (customerId: string, basketData: any) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/convert-second-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basketData),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Order ${data.orderNumber} placed! Customer successfully retained.`, 'success');
        await fetchData();
      }
    } catch (err) {
      showToast('Conversion failed', 'error');
    }
  };

  const activeFrictionCount = orders.filter((o) => o.friction_type !== 'NONE' && o.friction_resolved === 0).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-2xl bg-slate-850 border border-slate-700 text-xs font-semibold animate-in slide-in-from-bottom-3">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-teal-400" />}
          <span className="text-white">{toast.message}</span>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetData={handleResetData}
        frictionCount={activeFrictionCount}
        totalOrders={orders.length}
        loading={loading}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && orders.length === 0 ? (
          <div className="py-28 text-center space-y-3">
            <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mx-auto opacity-80" />
            <h3 className="text-base font-bold text-white">Loading NOVA CART Operational Engine...</h3>
            <p className="text-xs text-slate-400">Connecting to SQLite database & dark-store telemetry...</p>
          </div>
        ) : (
          <>
            {activeTab === 'diagnosis' && (
              <DiagnosticCockpit
                metrics={metrics}
                onExploreTriage={() => setActiveTab('triage')}
              />
            )}

            {activeTab === 'triage' && (
              <OperationsConsole
                orders={orders}
                stores={stores}
                onRefresh={fetchData}
                onAutoSubstitute={handleAutoSubstitute}
                onResolveFriction={handleResolveFriction}
                onPickItem={handlePickItem}
                onTrackOnMap={(orderId) => {
                  setSelectedMapOrderId(orderId);
                  setActiveTab('map');
                }}
              />
            )}

            {activeTab === 'map' && (
              <DeliveryMapTracker
                orders={orders}
                stores={stores}
                selectedOrderId={selectedMapOrderId}
                onSelectOrder={setSelectedMapOrderId}
                onResolveFriction={handleResolveFriction}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryShield
                products={products}
                stores={stores}
                onAuditProduct={handleAuditProduct}
                onQuarantineProduct={handleQuarantineProduct}
              />
            )}

            {activeTab === 'second-order' && (
              <SecondOrderLoop
                customers={customers}
                onRefresh={fetchData}
                onConvertOrder={handleConvertSecondOrder}
              />
            )}

            {activeTab === 'impact' && (
              <FinancialImpact metrics={metrics} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800/80 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>NOVA CART Reliance Engine</strong> • Competition Prototype v1.0.0
          </div>
          <div className="text-[11px] text-slate-400">
            Powered by SQLite + Express + React 19 + TypeScript + Tailwind CSS
          </div>
        </div>
      </footer>
    </div>
  );
}
