import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api.ts";
import DiagnosticCockpit from "./components/DiagnosticCockpit.tsx";
import Navbar from "./components/Navbar.tsx";
import OperationsConsole from "./components/OperationsConsole.tsx";
import type { DarkStore, Overview, TabId } from "./types.ts";

export interface Toast {
  tone: "ok" | "error";
  text: string;
}

export default function App() {
  const [tab, setTab] = useState<TabId>("diagnostic");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [stores, setStores] = useState<DarkStore[]>([]);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setOverview(await api<Overview>("overview"));
    } catch (e) {
      setToast({ tone: "error", text: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    // Overview first: it seeds the database on a fresh deploy before other panels query it.
    (async () => {
      try {
        setOverview(await api<Overview>("overview"));
        setStores(await api<DarkStore[]>("stores"));
        setReady(true);
      } catch (e) {
        setBootError((e as Error).message);
      }
    })();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = useCallback((t: Toast) => setToast(t), []);
  const changed = useCallback(() => void refresh(), [refresh]);

  const reset = async () => {
    try {
      await api("reset", { method: "POST" });
      await refresh();
      setVersion((v) => v + 1);
      notify({ tone: "ok", text: "Demo data restored to the case baseline" });
    } catch (e) {
      notify({ tone: "error", text: (e as Error).message });
    }
  };

  const shared = { stores, notify, onChange: changed };

  return (
    <div className="min-h-screen">
      <div className="grain" aria-hidden />
      <Navbar tab={tab} onTab={setTab} overview={overview} onReset={reset} />
      <main className="mx-auto max-w-[1400px] px-4 pb-20 pt-6 sm:px-8">
        {bootError ? (
          <div className="panel mx-auto mt-16 max-w-lg p-8 text-center">
            <p className="label text-signal">Connection failed</p>
            <p className="mt-3 font-display text-2xl">The engine API did not respond.</p>
            <p className="mt-2 text-sm text-dust">{bootError}</p>
            <button className="btn btn-amber mt-6" onClick={() => location.reload()}>
              Retry
            </button>
          </div>
        ) : !ready ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-40" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${tab}-${version}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              {tab === "diagnostic" && <DiagnosticCockpit overview={overview} onNavigate={setTab} />}
              {tab === "operations" && <OperationsConsole {...shared} />}
              {(tab === "inventory" || tab === "retention" || tab === "impact") && (
                <div className="panel p-10 text-center text-dust">This panel is coming soon.</div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded border px-4 py-2.5 text-sm shadow-2xl ${
              toast.tone === "ok" ? "border-mint/40 bg-[#17241e] text-mint" : "border-signal/40 bg-[#2a1814] text-signal"
            }`}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
