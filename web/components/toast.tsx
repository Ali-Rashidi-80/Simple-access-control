"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/lib/i18n";

export type ToastVariant = "info" | "success" | "error" | "warning";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  notify: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = nextIdRef.current++;
      setToasts((previous) => [...previous.slice(-4), { id, message, variant }]);
      window.setTimeout(() => {
        dismiss(id);
      }, 4500);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (message) => notify(message, "success"),
      error: (message) => notify(message, "error"),
      warning: (message) => notify(message, "warning"),
      info: (message) => notify(message, "info"),
      dismiss
    }),
    [dismiss, notify]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-24 end-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 md:bottom-6"
      >
        {toasts.map((toast) => {
          const Icon =
            toast.variant === "success"
              ? CheckCircle2
              : toast.variant === "error"
                ? XCircle
                : toast.variant === "warning"
                  ? AlertTriangle
                  : Info;

          const variantClass =
            toast.variant === "success"
              ? "border-[var(--ok-border)] bg-[var(--ok-bg)] text-[var(--ok-text)]"
              : toast.variant === "error"
                ? "border-[var(--err-border)] bg-[var(--err-bg)] text-[var(--err-text)]"
                : toast.variant === "warning"
                  ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-text)]"
                  : "border-[var(--accent-border)] bg-[var(--bg-surface)] text-[var(--text-primary)]";

          return (
            <div
              key={toast.id}
              role={toast.variant === "error" ? "alert" : "status"}
              className={clsx(
                "pointer-events-auto flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg",
                variantClass
              )}
            >
              <div className="flex items-start gap-2.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label={t("dismiss")}
                className="rounded-lg p-1 opacity-80 transition hover:opacity-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return value;
}
