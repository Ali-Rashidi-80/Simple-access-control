"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error("Application error boundary:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="surface-card w-full max-w-md rounded-3xl p-6 text-center md:p-8">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-[var(--err-border)] bg-[var(--err-bg)] text-[var(--err-text)]">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">{t("unexpectedError")}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{t("unexpectedErrorDesc")}</p>
        {error.message && (
          <div className="surface-muted mt-4 rounded-2xl p-3 text-start font-mono text-xs text-[var(--text-secondary)]">
            {error.message}
          </div>
        )}
        <button type="button" onClick={reset} className="btn-primary mt-6 w-full">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t("retry")}
        </button>
      </section>
    </main>
  );
}
