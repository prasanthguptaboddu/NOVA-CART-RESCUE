import { Check, LifeBuoy, Repeat2, Truck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api, inr } from "../api.ts";
import type { Toast } from "../App.tsx";
import type { DarkStore, Order } from "../types.ts";

const STATUS_LABEL: Record<Order["status"], string> = {
  picking: "Picking",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};
const NEXT_LABEL: Partial<Record<Order["status"], string>> = {
  picking: "Mark packed",
  packed: "Dispatch rider",
  out_for_delivery: "Confirm delivery",
};

interface Props {
  stores: DarkStore[];
  notify: (t: Toast) => void;
  onChange: () => void;
}

export default function OperationsConsole({ stores, notify, onChange }: Props) {
  const [store, setStore] = useState<string>("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOrders(await api<Order[]>(`orders${store ? `?store=${store}` : ""}`));
    } catch (e) {
      notify({ tone: "error", text: (e as Error).message });
    }
  }, [store, notify]);

  useEffect(() => {
    setOrders(null);
    void load();
  }, [load]);

  const act = async (key: string, path: string, success: (r: any) => string) => {
    setBusy(key);
    try {
      const r = await api(path, { method: "POST" });
      notify({ tone: "ok", text: success(r) });
      await load();
      onChange();
    } catch (e) {
      notify({ tone: "error", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const active = stores.find((s) => s.id === store);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Dark-store dispatch & picker triage</p>
          <h2 className="mt-1 font-display text-3xl font-bold">Live order stream</h2>
        </div>
        <div className="flex flex-wrap gap-1">
          {[{ id: "", cluster: "All clusters" }, ...stores].map((s) => (
            <button
              key={s.id}
              onClick={() => setStore(s.id)}
              className={`btn ${store === s.id ? "border-amber text-amber" : "text-dust"}`}
            >
              {s.cluster}
            </button>
          ))}
        </div>
      </div>

      {active && (
        <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
          {[
            ["Pickers on shift", active.activePickers],
            ["Queue depth", active.queueDepth],
            ["Avg pick time", `${active.avgPickMinutes} min`],
          ].map(([k, v]) => (
            <div key={k as string} className="panel px-4 py-3">
              <p className="text-xs text-dust">{k}</p>
              <p className="font-mono text-xl">{v}</p>
            </div>
          ))}
        </div>
      )}

      {!orders ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-64" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="panel p-10 text-center text-dust">No orders in this cluster right now.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((o) => {
            const late = o.elapsedMinutes - o.promisedMinutes;
            const breached = late > 0 && o.status !== "delivered";
            const atRisk = !breached && o.status !== "delivered" && o.elapsedMinutes >= o.promisedMinutes * 0.8;
            const pending = o.items.filter((i) => !i.picked).length;
            const pct = Math.min(100, (o.elapsedMinutes / o.promisedMinutes) * 100);
            return (
              <article
                key={o.id}
                className={`panel flex flex-col p-4 ${breached ? "border-signal/50" : atRisk ? "border-amber/50" : ""}`}
              >
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm text-amber">{o.code}</p>
                    <p className="font-medium">{o.customer.name}</p>
                    <p className="text-xs text-dust">
                      {o.storeId} · first order · {inr(o.total)}
                    </p>
                  </div>
                  <span className="rounded bg-panel-2 px-2 py-1 font-mono text-[11px] uppercase text-dust">
                    {STATUS_LABEL[o.status]}
                  </span>
                </header>

                <div className="mt-3">
                  <div className="flex justify-between font-mono text-xs">
                    <span className={breached ? "text-signal" : atRisk ? "text-amber" : "text-mint"}>
                      {o.elapsedMinutes} / {o.promisedMinutes} min
                    </span>
                    <span className={breached ? "text-signal" : "text-dust"}>
                      {breached ? `+${late} min late` : o.status === "delivered" ? "on time" : `${-late} min left`}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded bg-panel-2">
                    <div
                      className={`h-1.5 rounded ${breached ? "bg-signal" : atRisk ? "bg-amber" : "bg-mint"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                  {o.items.map((it) => {
                    const short = !it.picked && (it.sku.quarantined || it.sku.shelfStock < it.qty);
                    return (
                      <li key={it.id} className="flex items-center gap-2">
                        <span
                          className={`grid h-4 w-4 shrink-0 place-items-center rounded-sm border ${
                            it.picked ? "border-mint bg-mint/20 text-mint" : short ? "border-signal" : "border-line"
                          }`}
                        >
                          {it.picked && <Check size={11} strokeWidth={3} />}
                        </span>
                        <span className={`min-w-0 flex-1 ${it.picked ? "text-dust" : ""}`}>
                          <span className="block truncate">
                            {it.qty}× {it.substitute ?? it.sku.name}
                          </span>
                          {it.substitute && (
                            <span className="block truncate text-[11px] text-mint">swapped for {it.sku.name} · ₹0 delta</span>
                          )}
                          {short && <span className="block text-[11px] text-signal">shelf has {it.sku.shelfStock}</span>}
                        </span>
                        {!it.picked && o.status === "picking" && (
                          short ? (
                            <button
                              className="btn px-2 py-1 text-[11px] text-amber"
                              disabled={busy !== null}
                              onClick={() =>
                                act(`s${it.id}`, `orders/${o.id}/items/${it.id}/substitute`, (r) => `Substituted with ${r.substitute} at no extra cost`)
                              }
                            >
                              <Repeat2 size={12} /> Substitute
                            </button>
                          ) : (
                            <button
                              className="btn px-2 py-1 text-[11px]"
                              disabled={busy !== null}
                              onClick={() => act(`p${it.id}`, `orders/${o.id}/items/${it.id}/pick`, () => `Picked ${it.sku.name}`)}
                            >
                              Pick
                            </button>
                          )
                        )}
                      </li>
                    );
                  })}
                </ul>

                <footer className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
                  {NEXT_LABEL[o.status] && (
                    <button
                      className="btn"
                      disabled={busy !== null || (o.status === "picking" && pending > 0)}
                      title={o.status === "picking" && pending > 0 ? `${pending} item(s) still to pick` : undefined}
                      onClick={() => act(`a${o.id}`, `orders/${o.id}/advance`, (r) => `${o.code} → ${STATUS_LABEL[r.status as Order["status"]]}`)}
                    >
                      <Truck size={14} /> {NEXT_LABEL[o.status]}
                    </button>
                  )}
                  {(breached || atRisk) && (
                    <button
                      className="btn btn-amber"
                      disabled={busy !== null || o.rescued}
                      onClick={() =>
                        act(`r${o.id}`, `orders/${o.id}/rescue`, () => `₹50 Reliance Pass credited to ${o.customer.name}. Churn risk 89% → 18%`)
                      }
                    >
                      <LifeBuoy size={14} /> {o.rescued ? "₹50 credited" : "Rescue · ₹50 credit"}
                    </button>
                  )}
                  <span className="ml-auto self-center font-mono text-[11px] text-dust">
                    churn <span className={o.customer.churnRisk > 50 ? "text-signal" : "text-mint"}>{o.customer.churnRisk}%</span>
                  </span>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
