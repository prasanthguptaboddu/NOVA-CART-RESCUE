import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import type { Overview, TabId } from "../types.ts";

const FAILURES = [
  { label: "Phantom inventory stockouts", share: 14.2, detail: "App shows stock the dark-store shelf does not have", tab: "inventory" as TabId },
  { label: "Picking queue & SLA breaches", share: 11.5, detail: "30–45 min fulfilment against a 15–20 min promise", tab: "operations" as TabId },
  { label: "Damaged produce & mis-picks", share: 2.9, detail: "Crushed eggs, wrong variant packed", tab: "operations" as TabId },
];

export default function DiagnosticCockpit({ overview, onNavigate }: { overview: Overview | null; onNavigate: (t: TabId) => void }) {
  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <section className="lg:col-span-7">
        <p className="label">Case evidence · 120,000 new customers / month</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
          Customers don't churn after order one because of price.{" "}
          <span className="text-amber">They churn because order one broke.</span>
        </h1>
        <p className="mt-5 max-w-xl text-dust">
          Only <b className="text-bone">19.4%</b> of first-time customers place a second order, and just{" "}
          <b className="text-bone">13.8%</b> repeat within 30 days. <b className="text-bone">28.6%</b> of first orders hit a
          fulfilment failure, and those customers are the ones who leave.
        </p>
      </section>

      <section className="panel relative overflow-hidden p-6 lg:col-span-5">
        <p className="label">The churn chasm · 2nd-order repeat rate</p>
        <div className="mt-6 grid grid-cols-2 gap-6">
          {[
            { label: "Zero friction", rate: 42.1, color: "bg-mint", text: "text-mint" },
            { label: "1+ failure", rate: 8.6, color: "bg-signal", text: "text-signal" },
          ].map((b, i) => (
            <div key={b.label}>
              <div className="relative flex h-48 items-end rounded bg-panel-2">
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.15 + i * 0.12, duration: 0.6, ease: "easeOut" }}
                  style={{ height: `${(b.rate / 50) * 100}%`, transformOrigin: "bottom" }}
                  className={`w-full rounded ${b.color}`}
                />
              </div>
              <p className={`mt-3 font-display text-4xl font-bold ${b.text}`}>{b.rate}%</p>
              <p className="text-sm text-dust">{b.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 border-t border-line pt-4 text-sm">
          One bad first delivery makes a customer <b className="text-signal">4.9× less likely</b> to come back.
        </p>
      </section>

      <section className="lg:col-span-7">
        <p className="label mb-3">Where first orders fail (% of all first orders)</p>
        <div className="space-y-2">
          {FAILURES.map((f, i) => (
            <motion.button
              key={f.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.08 }}
              onClick={() => onNavigate(f.tab)}
              className="panel group grid w-full grid-cols-[4.5rem_1fr_auto] items-center gap-4 p-4 text-left transition-colors hover:border-dust"
            >
              <span className="font-mono text-2xl font-semibold text-amber">{f.share}%</span>
              <span>
                <span className="block font-medium">{f.label}</span>
                <span className="block text-sm text-dust">{f.detail}</span>
                <span className="mt-2 block h-1 rounded bg-panel-2">
                  <span className="block h-1 rounded bg-amber/70" style={{ width: `${(f.share / 14.2) * 100}%` }} />
                </span>
              </span>
              <ArrowRight size={16} className="text-dust transition-transform group-hover:translate-x-1" />
            </motion.button>
          ))}
        </div>
      </section>

      <section className="panel p-6 lg:col-span-5">
        <p className="label">Live engine state</p>
        {overview ? (
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5">
            {[
              ["Active orders", overview.orders.active],
              ["Breaching SLA", overview.orders.breached],
              ["Phantom-risk SKUs", overview.skus.highRisk],
              ["Quarantined SKUs", overview.skus.quarantined],
              ["Reliance credits issued", `₹${overview.creditsIssued}`],
              ["Customers on order #2+", `${overview.customers.repeat} / ${overview.customers.total}`],
            ].map(([k, v]) => (
              <div key={k as string}>
                <dt className="text-xs text-dust">{k}</dt>
                <dd className="font-mono text-2xl">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="skeleton mt-4 h-40" />
        )}
      </section>
    </div>
  );
}
