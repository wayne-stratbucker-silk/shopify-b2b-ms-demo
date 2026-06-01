"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

// Minimal, dependency-free toast system.
//   <ToastProvider> — mount once near the root; renders a fixed container.
//   useToast()      — returns { toast(message, variant?) }.
// Toasts auto-dismiss after ~3.5s and are also dismissable by click.

type ToastVariant = "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastApi {
  toast: (message: string, variant?: ToastVariant) => void;
}

const AUTO_DISMISS_MS = 3500;

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail soft: if the provider isn't mounted, fall back to a no-op so a
    // missing provider never throws and breaks the page.
    return { toast: () => {} };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      if (!message) return;
      const id = nextId.current++;
      setItems((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: "calc(100vw - 40px)",
          pointerEvents: "none",
        }}
      >
        {items.map((t) => {
          const isErr = t.variant === "error";
          return (
            <div
              key={t.id}
              role="status"
              onClick={() => dismiss(t.id)}
              style={{
                pointerEvents: "auto",
                cursor: "pointer",
                minWidth: 240,
                maxWidth: 360,
                padding: "10px 14px",
                fontSize: 13,
                lineHeight: 1.4,
                borderRadius: "var(--radius-card, 8px)",
                border: `1px solid ${isErr ? "var(--danger, #8a2a2a)" : "var(--success, #2e6b46)"}`,
                color: isErr ? "var(--danger, #8a2a2a)" : "var(--success, #2e6b46)",
                background: isErr
                  ? "var(--danger-fade, #f6e6e3)"
                  : "var(--success-fade, #e9efe9)",
                boxShadow: "0 8px 28px rgba(0,0,0,.16)",
              }}
            >
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
