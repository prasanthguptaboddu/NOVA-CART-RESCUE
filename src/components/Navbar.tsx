import { Activity, Boxes, LineChart, RotateCcw, ShieldAlert, ShoppingBasket } from "lucide-react";
import { useState } from "react";
import type { Overview, TabId } from "../types.ts";

const TABS: { id: TabId; label: string; icon: typeof Activity }[] = [
  { id: "diagnostic", label: "Diagnosis", icon: Activity },
  { id: "operations", label: "Dispatch", icon: Boxes },
  { id: "inventory", label: "Stock Shield", icon: ShieldAlert },
  { id: "retention", label: "2nd Order", icon: ShoppingBasket },
  { id: "impact", label: "ROI", icon: LineChart },
];

interface Props {
  tab: TabId;
  onTab: (t: TabId) => void;
  overview: Overview | null;
  onReset: () => Promise<void>;
}

export default function Navbar({ tab, onTab, overview, onReset }: Props) {
  const [resetting, setResetting] = useState(false);
  const badges = overview
    ? [
        { label: "SLA breach", value: overview.orders.breached, hot: overview.orders.breached > 0 },
        { label: "Phantom SKUs", value: overview.skus.highRisk, hot: overview.skus.highRisk > 0 },
        { label: "Avg churn", value: `${overview.customers.avgChurn}%`, hot: overview.customers.avgChurn > 50 },
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-8">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-xl font-extrabold tracking-tight">
            NOVA<span className="text-amber">/</span>CART
          </span>
          <span className="label hidden sm:inline">Reliance Engine</span>
        </div>

        <nav className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto lg:order-none lg:w-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTab(id)}
              className={`flex shrink-0 items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors ${
                tab === id ? "bg-panel-2 text-bone" : "text-dust hover:text-bone"
              }`}
            >
              <Icon size={15} strokeWidth={2} className={tab === id ? "text-amber" : ""} />
              {label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {badges.map((b) => (
            <span
              key={b.label}
              className={`hidden items-center gap-1.5 rounded border px-2 py-1 font-mono text-[11px] md:inline-flex ${
                b.hot ? "border-signal/40 text-signal" : "border-mint/30 text-mint"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${b.hot ? "animate-pulse bg-signal" : "bg-mint"}`} />
              {b.label} {b.value}
            </span>
          ))}
          <button
            className="btn"
            disabled={resetting}
            title="Restore demo data"
            onClick={async () => {
              setResetting(true);
              await onReset();
              setResetting(false);
            }}
          >
            <RotateCcw size={14} className={resetting ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Reset data</span>
          </button>
        </div>
      </div>
    </header>
  );
}
