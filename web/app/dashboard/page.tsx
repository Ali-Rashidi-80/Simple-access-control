"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Cpu, DoorOpen, Radio, Thermometer, UserRound, X } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { AppShell, EmptyState, PageCard } from "@/components/app-shell";
import { useToast } from "@/components/toast";
import { api, isAbortError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime, parseUtcTimestamp } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useDoorWebSocket } from "@/lib/websocket";
import type { AccessLog, LogsResponse } from "@/lib/types";

export default function DashboardPage() {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const {
    logs: wsLogs,
    isConnected,
    hardwareOnline,
    latestTemperature: wsTemperature,
    lastUnknownTag,
    sendOpenCommand,
    clearUnknownTag
  } = useDoorWebSocket();

  const [ping, setPing] = useState<number | null>(null);
  const [initialLogs, setInitialLogs] = useState<AccessLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);
  const cooldownTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const start = performance.now();
    setLoading(true);

    api
      .get<LogsResponse>("/logs/?limit=8", { signal: controller.signal })
      .then((response) => {
        setPing(Math.round(performance.now() - start));
        setInitialLogs(response.logs);
        setTotalCount(response.total);
        setError(null);
      })
      .catch((err) => {
        if (isAbortError(err)) {
          return;
        }
        const message = err instanceof Error ? err.message : t("backendUnavailable");
        setPing(null);
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [t, toast]);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        window.clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const mergedLogs = useMemo(() => {
    const seen = new Set<number>();
    const combined: AccessLog[] = [];
    for (const entry of [...wsLogs, ...initialLogs]) {
      if (seen.has(entry.id)) {
        continue;
      }
      seen.add(entry.id);
      combined.push(entry);
    }
    combined.sort((a, b) => {
      const timeA = parseUtcTimestamp(a.timestamp)?.getTime() ?? 0;
      const timeB = parseUtcTimestamp(b.timestamp)?.getTime() ?? 0;
      return timeB - timeA;
    });
    return combined.slice(0, 8);
  }, [initialLogs, wsLogs]);

  const effectiveTemperature = useMemo(() => {
    if (typeof wsTemperature === "number") {
      return wsTemperature;
    }
    const recentWithTemp = mergedLogs.find((item) => typeof item.temperature === "number");
    return recentWithTemp?.temperature ?? null;
  }, [mergedLogs, wsTemperature]);

  const displayTotalCount = Math.max(totalCount, mergedLogs.length);

  function handleRemoteOpen() {
    const result = sendOpenCommand();
    if (result === "sent") {
      setCooldownActive(true);
      setCommandFeedback(t("unlockCommandSent"));
      toast.success(t("unlockCommandSent"));
      if (cooldownTimerRef.current) {
        window.clearTimeout(cooldownTimerRef.current);
      }
      cooldownTimerRef.current = window.setTimeout(() => {
        setCooldownActive(false);
      }, 2000);
    } else if (result === "cooldown") {
      setCommandFeedback(t("unlockCooldown"));
      toast.warning(t("unlockCooldown"));
    } else {
      setCommandFeedback(t("unlockDisconnected"));
      toast.error(t("unlockDisconnected"));
    }
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <PageCard>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <UserRound className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t("dashboard")}</p>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {user?.fullName || user?.username}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className={isConnected ? "badge-ok" : "badge-err"}>
                <span
                  className={clsx(
                    "h-2 w-2 rounded-full",
                    isConnected ? "bg-[var(--ok-text)]" : "bg-[var(--err-text)]"
                  )}
                />
                <span>
                  {t("websocketStatus")}: {isConnected ? t("connected") : t("offline")}
                </span>
              </div>

              <div className={hardwareOnline ? "badge-ok" : "badge-warn"}>
                <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {t("hardwareStatus")}: {hardwareOnline ? t("hardwareOnline") : t("hardwareOffline")}
                </span>
              </div>
            </div>
          </div>
        </PageCard>

        {lastUnknownTag && (
          <PageCard className="border-[var(--warn-border)] bg-[var(--warn-bg)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-bold text-[var(--warn-text)]">{t("unknownRfidDetected")}</div>
                <div className="mt-1 font-mono text-sm text-[var(--text-primary)]" dir="ltr">
                  {lastUnknownTag.uid}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  className="btn-primary text-sm"
                  href={`/users?register=true&rfid=${encodeURIComponent(lastUnknownTag.uid)}`}
                >
                  {t("registerTag")}
                </Link>
                <button
                  type="button"
                  onClick={clearUnknownTag}
                  aria-label={t("dismiss")}
                  className="btn-ghost !rounded-xl !p-2.5"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </PageCard>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-[var(--err-border)] bg-[var(--err-bg)] px-4 py-3 text-sm font-medium text-[var(--err-text)]"
          >
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={<Thermometer aria-hidden="true" />}
            label={t("temperature")}
            value={effectiveTemperature === null ? "--" : `${effectiveTemperature} °C`}
            loading={loading && effectiveTemperature === null}
          />
          <MetricCard
            icon={<Activity aria-hidden="true" />}
            label={t("ping")}
            value={ping === null ? "--" : `${ping} ms`}
            loading={loading}
          />
          <MetricCard
            icon={<Radio aria-hidden="true" />}
            label={t("accessLogs")}
            value={String(displayTotalCount)}
            loading={loading}
          />
        </div>

        <PageCard>
          <div className="flex flex-col items-center gap-5 py-6 text-center">
            <button
              type="button"
              onClick={handleRemoteOpen}
              disabled={cooldownActive}
              aria-label={t("pressAndHold")}
              className={clsx(
                "grid h-40 w-40 place-items-center rounded-full border-2 transition focus-visible:ring-4",
                cooldownActive
                  ? "cursor-not-allowed border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-text)]"
                  : isConnected
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] hover:scale-[1.02]"
                    : "border-[var(--border-strong)] bg-[var(--bg-surface-muted)] text-[var(--text-muted)]"
              )}
            >
              <DoorOpen className="h-14 w-14" aria-hidden="true" />
            </button>
            <div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">{t("pressAndHold")}</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {cooldownActive
                  ? t("unlockCooldown")
                  : commandFeedback ?? t("remoteOpenPrompt")}
              </p>
            </div>
          </div>
        </PageCard>

        <PageCard>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">{t("recentActivity")}</h3>
            <Link href="/logs" className="text-sm font-semibold text-[var(--accent)] hover:underline">
              {t("logs")}
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="skeleton h-16 w-full" />
              ))}
            </div>
          ) : mergedLogs.length === 0 ? (
            <EmptyState message={t("noResults")} />
          ) : (
            <div className="space-y-3">
              {mergedLogs.map((log) => (
                <div
                  key={`${log.id}-${log.timestamp}`}
                  className="surface-muted flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {log.user_name || t("unknown")}
                      </span>
                      {log.is_duress && <span className="badge-err">{t("duressAlert")}</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {formatDateTime(log.timestamp, language)}
                    </div>
                  </div>
                  <span className={log.action === "GRANTED" ? "badge-ok" : "badge-err"}>
                    {log.action}
                  </span>
                </div>
              ))}
            </div>
          )}
        </PageCard>
      </div>
    </AppShell>
  );
}

function MetricCard({
  icon,
  label,
  value,
  loading
}: {
  icon: ReactNode;
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <PageCard>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-[var(--text-muted)]">{label}</div>
          {loading ? (
            <div className="skeleton mt-2 h-8 w-20" />
          ) : (
            <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]" dir="ltr">
              {value}
            </div>
          )}
        </div>
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)] [&_svg]:h-6 [&_svg]:w-6">
          {icon}
        </div>
      </div>
    </PageCard>
  );
}
