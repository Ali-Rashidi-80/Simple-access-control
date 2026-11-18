"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, KeyRound, Trash2 } from "lucide-react";
import clsx from "clsx";
import { AppShell, EmptyState, PageCard } from "@/components/app-shell";
import { DialogModal } from "@/components/dialog-modal";
import { useToast } from "@/components/toast";
import { api, isAbortError } from "@/lib/api";
import { formatDateTime, parseUtcTimestamp } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { TempPinCreateResponse, TemporaryPin } from "@/lib/types";

type PinFilter = "all" | "active" | "expired";

function isPinActive(pin: TemporaryPin): boolean {
  if (pin.uses_remaining <= 0) {
    return false;
  }
  const expiresAt = parseUtcTimestamp(pin.expires_at);
  return expiresAt ? expiresAt.getTime() > Date.now() : true;
}

export default function TemporaryPinsPage() {
  const { t, language } = useI18n();
  const toast = useToast();

  const [pins, setPins] = useState<TemporaryPin[]>([]);
  const [filter, setFilter] = useState<PinFilter>("all");
  const [form, setForm] = useState({
    label: "",
    ttl_hours: "24",
    max_uses: "1",
    phone: "",
    send_sms: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<TempPinCreateResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<TemporaryPin | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadPins = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const list = await api.get<TemporaryPin[]>("/api/temporary-pins", { signal });
        setPins(list);
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
    void loadPins(controller.signal);
    return () => controller.abort();
  }, [loadPins]);

  const filteredPins = useMemo(() => {
    return pins.filter((pin) => {
      if (filter === "all") {
        return true;
      }
      const active = isPinActive(pin);
      return filter === "active" ? active : !active;
    });
  }, [filter, pins]);

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const phone = form.phone.trim();
      const response = await api.post<TempPinCreateResponse>("/api/temporary-pins", {
        label: form.label.trim() || undefined,
        ttl_hours: Number(form.ttl_hours),
        max_uses: Number(form.max_uses),
        send_sms: form.send_sms && Boolean(phone),
        phone: phone || undefined
      });
      setCreatedResult(response);
      setCopied(false);
      setForm({ label: "", ttl_hours: "24", max_uses: "1", phone: "", send_sms: true });
      await loadPins();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("error");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyPin() {
    if (!createdResult?.pin) {
      return;
    }
    try {
      await navigator.clipboard.writeText(createdResult.pin);
      setCopied(true);
      toast.success(t("copied"));
    } catch {
      toast.error(t("error"));
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) {
      return;
    }
    setRevoking(true);
    try {
      await api.delete(`/api/temporary-pins/${revokeTarget.id}`);
      setRevokeTarget(null);
      toast.success(t("pinRevoked"));
      await loadPins();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setRevoking(false);
    }
  }

  return (
    <AppShell>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <PageCard>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-[var(--accent)]">{t("temporaryPins")}</h2>
            <div className="surface-muted flex rounded-2xl p-1 text-xs font-semibold" role="tablist">
              {(["all", "active", "expired"] as const).map((tabKey) => (
                <button
                  key={tabKey}
                  type="button"
                  role="tab"
                  aria-selected={filter === tabKey}
                  onClick={() => setFilter(tabKey)}
                  className={clsx(
                    "rounded-xl px-3 py-1.5 transition",
                    filter === tabKey
                      ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {tabKey === "all" ? t("all") : tabKey === "active" ? t("active") : t("expired")}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-[var(--err-border)] bg-[var(--err-bg)] p-3 text-sm text-[var(--err-text)]"
            >
              {error}
            </div>
          )}

          {createdResult && (
            <div className="mb-5 rounded-2xl border border-[var(--ok-border)] bg-[var(--ok-bg)] p-4 text-sm text-[var(--ok-text)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold">{t("pinCreatedOnce")}</div>
                <span className={createdResult.sms_sent ? "badge-ok" : "badge-neutral"}>
                  {createdResult.sms_sent ? t("smsSentBadge") : t("smsNotSentBadge")}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 text-[var(--text-primary)]">
                <span className="font-mono text-2xl font-bold tracking-widest" dir="ltr">
                  {createdResult.pin}
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => void handleCopyPin()} className="btn-ghost !py-1.5 text-xs">
                    {copied ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )}
                    {copied ? t("copied") : t("copy")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatedResult(null)}
                    className="btn-ghost !py-1.5 text-xs"
                  >
                    {t("dismiss")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {[0, 1].map((idx) => (
                <div key={idx} className="skeleton h-36 w-full rounded-3xl" />
              ))}
            </div>
          ) : filteredPins.length === 0 ? (
            <EmptyState message={t("noResults")} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredPins.map((pin) => {
                const active = isPinActive(pin);
                return (
                  <div key={pin.id} className="surface-muted rounded-3xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
                          <KeyRound className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-bold text-[var(--text-primary)]">
                            {pin.label || `#${pin.id}`}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {t("usesRemaining")}: {pin.uses_remaining}
                          </div>
                        </div>
                      </div>
                      {active && (
                        <button
                          type="button"
                          onClick={() => setRevokeTarget(pin)}
                          aria-label={t("revokePin")}
                          title={t("revokePin")}
                          className="btn-danger !rounded-xl !p-2"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    <div className="surface-card mt-4 flex items-center justify-between gap-2 rounded-2xl p-3 text-xs">
                      <span className="text-[var(--text-secondary)]">
                        {formatDateTime(pin.expires_at, language)}
                      </span>
                      <span className={active ? "badge-ok" : "badge-err"}>
                        {active ? t("active") : t("expired")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PageCard>

        <PageCard>
          <h2 className="mb-5 text-lg font-bold text-[var(--accent)]">{t("createTempPin")}</h2>
          <form className="space-y-4" onSubmit={submitCreate}>
            <Input
              label={t("label")}
              value={form.label}
              onChange={(value) => setForm({ ...form, label: value })}
            />
            <Input
              label={t("ttlHours")}
              value={form.ttl_hours}
              onChange={(value) => setForm({ ...form, ttl_hours: value })}
              type="number"
              min={1}
              max={168}
              dir="ltr"
              required
            />
            <Input
              label={t("maxUses")}
              value={form.max_uses}
              onChange={(value) => setForm({ ...form, max_uses: value })}
              type="number"
              min={1}
              max={100}
              dir="ltr"
              required
            />
            <Input
              label={t("phoneOptional")}
              value={form.phone}
              onChange={(value) => setForm({ ...form, phone: value })}
              type="tel"
              dir="ltr"
            />
            <label className="surface-muted flex items-center justify-between rounded-2xl p-4">
              <span className="text-sm font-medium text-[var(--text-primary)]">{t("sendSms")}</span>
              <input
                type="checkbox"
                checked={form.send_sms}
                onChange={(event) => setForm({ ...form, send_sms: event.target.checked })}
                className="h-5 w-5 accent-[var(--accent)]"
              />
            </label>
            <button className="btn-primary w-full" disabled={saving}>
              {saving ? t("loading") : t("save")}
            </button>
          </form>
        </PageCard>
      </div>

      <DialogModal
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        title={t("revokePin")}
        description={revokeTarget ? revokeTarget.label || `#${revokeTarget.id}` : undefined}
        maxWidthClass="max-w-md"
      >
        <p className="text-sm text-[var(--text-secondary)]">{t("revokePinConfirm")}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setRevokeTarget(null)} className="btn-ghost">
            {t("cancel")}
          </button>
          <button
            type="button"
            disabled={revoking}
            onClick={() => void confirmRevoke()}
            className="btn-danger"
          >
            {revoking ? t("loading") : t("confirm")}
          </button>
        </div>
      </DialogModal>
    </AppShell>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  min,
  max,
  dir
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  dir?: "ltr" | "rtl";
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      <input
        className="field"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        min={min}
        max={max}
        dir={dir}
      />
    </label>
  );
}
