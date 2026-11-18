"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { Download, RotateCcw, Search } from "lucide-react";
import { AppShell, EmptyState, PageCard } from "@/components/app-shell";
import { useToast } from "@/components/toast";
import { api, apiBaseUrl, isAbortError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { AccessLog, LogsResponse, LogsStats } from "@/lib/types";

const PAGE_SIZE = 20;

interface LogFilters {
  q: string;
  status: "all" | "success" | "error" | "pending";
  startDate: string;
  endDate: string;
  skip: number;
}

const initialFilters: LogFilters = {
  q: "",
  status: "all",
  startDate: "",
  endDate: "",
  skip: 0
};

function buildFilterQuery(filters: LogFilters, includePagination: boolean): URLSearchParams {
  const params = new URLSearchParams();
  if (includePagination) {
    params.set("skip", String(filters.skip));
    params.set("limit", String(PAGE_SIZE));
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.q.trim()) {
    params.set("q", filters.q.trim());
  }
  if (filters.startDate) {
    params.set("start_date", new Date(filters.startDate).toISOString());
  }
  if (filters.endDate) {
    params.set("end_date", new Date(filters.endDate).toISOString());
  }
  return params;
}

export default function LogsPage() {
  const { t, language } = useI18n();
  const toast = useToast();

  const [draftQ, setDraftQ] = useState("");
  const [draftStatus, setDraftStatus] = useState<"all" | "success" | "error" | "pending">("all");
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<LogFilters>(initialFilters);

  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<LogsStats>({ success: 0, error: 0, pending: 0, all: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(
    async (filters: LogFilters, signal?: AbortSignal) => {
      setLoading(true);
      const params = buildFilterQuery(filters, true);
      try {
        const response = await api.get<LogsResponse>(`/logs/?${params.toString()}`, { signal });
        setLogs(response.logs);
        setTotal(response.total);
        setStats(response.stats);
        setError(null);
      } catch (err) {
        if (isAbortError(err)) {
          return;
        }
        const message = err instanceof Error ? err.message : t("backendUnavailable");
        setError(message);
        toast.error(message);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [t, toast]
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchLogs(appliedFilters, controller.signal);
    return () => controller.abort();
  }, [appliedFilters, fetchLogs]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAppliedFilters({
      q: draftQ,
      status: draftStatus,
      startDate: draftStart,
      endDate: draftEnd,
      skip: 0
    });
  }

  function handleReset() {
    setDraftQ("");
    setDraftStatus("all");
    setDraftStart("");
    setDraftEnd("");
    setAppliedFilters(initialFilters);
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      const params = buildFilterQuery(appliedFilters, false);
      const response = await fetch(`${apiBaseUrl()}/logs/export?${params.toString()}`, {
        credentials: "include",
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "access_logs.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(t("exportSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setExporting(false);
    }
  }

  const currentPage = Math.floor(appliedFilters.skip / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatBox label={t("totalLogs")} value={stats.all ?? 0} loading={loading} />
          <StatBox label={t("grantedCount")} value={stats.success ?? 0} tone="ok" loading={loading} />
          <StatBox label={t("deniedCount")} value={stats.error ?? 0} tone="err" loading={loading} />
          <StatBox label={t("pendingCount")} value={stats.pending ?? 0} tone="warn" loading={loading} />
        </div>

        <PageCard>
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_10rem_1fr_1fr_auto_auto]" onSubmit={handleSubmit}>
            <div className="relative">
              <Search
                className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-[var(--text-muted)]"
                aria-hidden="true"
              />
              <input
                type="search"
                className="field ps-9 text-sm"
                placeholder={t("searchLogsPlaceholder")}
                value={draftQ}
                onChange={(event) => setDraftQ(event.target.value)}
              />
            </div>

            <select
              aria-label={t("status")}
              className="field text-sm"
              value={draftStatus}
              onChange={(event) =>
                setDraftStatus(event.target.value as "all" | "success" | "error" | "pending")
              }
            >
              <option value="all">{t("all")}</option>
              <option value="success">{t("success")}</option>
              <option value="error">{t("error")}</option>
              <option value="pending">{t("pendingCount")}</option>
            </select>

            <input
              aria-label={t("startsAt")}
              className="field text-sm"
              type="datetime-local"
              value={draftStart}
              onChange={(event) => setDraftStart(event.target.value)}
              dir="ltr"
            />
            <input
              aria-label={t("endsAt")}
              className="field text-sm"
              type="datetime-local"
              value={draftEnd}
              onChange={(event) => setDraftEnd(event.target.value)}
              dir="ltr"
            />

            <button type="submit" className="btn-primary text-sm">
              {t("filter")}
            </button>

            <button type="button" onClick={handleReset} className="btn-ghost text-sm">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t("reset")}
            </button>
          </form>
        </PageCard>

        <PageCard>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-[var(--accent)]">{t("accessLogs")}</h2>
              <span className="badge-neutral">{total}</span>
            </div>

            <button
              type="button"
              onClick={() => void handleExportCsv()}
              disabled={exporting}
              className="btn-ghost text-sm"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {exporting ? t("loading") : t("exportCsv")}
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-[var(--err-border)] bg-[var(--err-bg)] p-3 text-sm text-[var(--err-text)]"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((idx) => (
                <div key={idx} className="skeleton h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <EmptyState message={t("noResults")} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                    <tr>
                      <th className="px-3 py-3 text-start">{t("fullName")}</th>
                      <th className="px-3 py-3 text-start">{t("status")}</th>
                      <th className="px-3 py-3 text-start">{t("temperature")}</th>
                      <th className="px-3 py-3 text-start">{t("rfidTag")}</th>
                      <th className="px-3 py-3 text-start">{t("timestamp")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-[var(--border-subtle)]">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                            <span>{log.user_name || t("unknown")}</span>
                            {log.is_duress && <span className="badge-err">{t("duressAlert")}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={log.action === "GRANTED" ? "badge-ok" : "badge-err"}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[var(--text-secondary)]" dir="ltr">
                          {log.temperature === null || log.temperature === undefined
                            ? "--"
                            : `${log.temperature} °C`}
                        </td>
                        <td className="px-3 py-3 font-mono text-[var(--text-secondary)]" dir="ltr">
                          {log.rfid_tag ?? "--"}
                        </td>
                        <td className="px-3 py-3 text-[var(--text-muted)]">
                          {formatDateTime(log.timestamp, language)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4 text-sm">
                <span className="text-[var(--text-muted)]">
                  {t("pageOf")} {currentPage} / {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={appliedFilters.skip === 0}
                    onClick={() =>
                      setAppliedFilters((prev) => ({
                        ...prev,
                        skip: Math.max(0, prev.skip - PAGE_SIZE)
                      }))
                    }
                    className="btn-ghost !py-2 text-sm"
                  >
                    {t("previousPage")}
                  </button>
                  <button
                    type="button"
                    disabled={appliedFilters.skip + PAGE_SIZE >= total}
                    onClick={() =>
                      setAppliedFilters((prev) => ({
                        ...prev,
                        skip: prev.skip + PAGE_SIZE
                      }))
                    }
                    className="btn-ghost !py-2 text-sm"
                  >
                    {t("nextPage")}
                  </button>
                </div>
              </div>
            </>
          )}
        </PageCard>
      </div>
    </AppShell>
  );
}

function StatBox({
  label,
  value,
  tone = "neutral",
  loading
}: {
  label: string;
  value: number;
  tone?: "neutral" | "ok" | "err" | "warn";
  loading?: boolean;
}) {
  const toneClass =
    tone === "ok"
      ? "text-[var(--ok-text)]"
      : tone === "err"
        ? "text-[var(--err-text)]"
        : tone === "warn"
          ? "text-[var(--warn-text)]"
          : "text-[var(--text-primary)]";

  return (
    <PageCard>
      <div className="text-xs font-medium text-[var(--text-muted)]">{label}</div>
      {loading ? (
        <div className="skeleton mt-2 h-7 w-14" />
      ) : (
        <div className={`mt-1 text-2xl font-bold ${toneClass}`} dir="ltr">
          {value}
        </div>
      )}
    </PageCard>
  );
}
