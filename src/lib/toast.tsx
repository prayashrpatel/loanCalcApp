import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastKind = "info" | "success" | "warn" | "error";
type Toast = {
  id: string;
  kind: ToastKind;
  text: string;
  ctaLabel?: string;
  onCta?: () => void;
  ttl?: number;
};
type AddToastArgs = Omit<Toast, "id"> & { dedupeKey?: string };

const ToastCtx = createContext<{ addToast: (t: AddToastArgs) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dedupe = useRef<Record<string, number>>({}); // key -> timestamp

  const addToast = useCallback((t: AddToastArgs) => {
    // cooldown dedupe (60s default)
    if (t.dedupeKey) {
      const last = dedupe.current[t.dedupeKey] ?? 0;
      if (Date.now() - last < 60000) return;
      dedupe.current[t.dedupeKey] = Date.now();
    }
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [
      ...prev.slice(-2), // keep stack max 2, new becomes 3rd
      { id, kind: t.kind, text: t.text, ctaLabel: t.ctaLabel, onCta: t.onCta, ttl: t.ttl ?? (t.kind === "warn" || t.kind === "error" ? 6000 : 3500) },
    ]);
    // auto-remove
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, t.ttl ?? (t.kind === "warn" || t.kind === "error" ? 6000 : 3500));
  }, []);

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.addToast;
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div style={{
      position: "fixed", right: 16, bottom: 16, display: "grid", gap: 8, zIndex: 9999,
      maxWidth: 360,
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          role={t.kind === "warn" || t.kind === "error" ? "alert" : "status"}
          style={{
            border: "1px solid var(--border)",
            background: "var(--panel)",
            color: "var(--text)",
            borderRadius: 10,
            boxShadow: "var(--shadow)",
            padding: "10px 12px",
            display: "grid",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 14, lineHeight: 1.4 }}>
            <span style={{ padding: "2px 8px", borderRadius: 20, marginRight: 8,
              border: "1px solid var(--border)",
              background: t.kind === "success" ? "#0b2e15" :
                          t.kind === "warn" ? "#3a2a00" :
                          t.kind === "error" ? "#381010" : "#111827" }}>
              {t.kind.toUpperCase()}
            </span>
            {t.text}
          </div>
          {t.onCta && t.ctaLabel && (
            <div>
              <button
                className="btn small ghost"
                onClick={t.onCta}
                style={{ padding: "4px 8px" }}
              >
                {t.ctaLabel}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
