"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { AppShell, PageCard } from "@/components/app-shell";
import { useToast } from "@/components/toast";
import { api, isAbortError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { isValidTheme, useTheme } from "@/lib/theme";
import type { Language, SettingsResponse, ThemeMode } from "@/lib/types";

const PIN_PATTERN = /^\d{4,8}$/;

function formatHourInput(value: string): string {
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num) || num < 0 || num > 23) {
    return "00:00";
  }
  return `${String(num).padStart(2, "0")}:00`;
}

export default function SettingsPage() {
  const { t, language, setLanguage } = useI18n();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === "admin";

  const [settings, setSettings] = useState({
    theme: theme as ThemeMode,
    language: language as Language,
    auto_lock_start: "22",
    auto_lock_end: "6",
    timer_duration: "5",
    require_pin_with_rfid: "false",
    duress_mode: "false",
    duress_rfid: "",
    duress_pin: "",
    alert_phone: ""
  });
  const [duressPinConfigured, setDuressPinConfigured] = useState(false);
  const [clearDuressPin, setClearDuressPin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tRef = useRef(t);
  const toastRef = useRef(toast);
  tRef.current = t;
  toastRef.current = toast;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api
      .get<SettingsResponse>("/settings/", { signal: controller.signal })
      .then((response) => {
        const loaded = response.settings;
        const loadedTheme = isValidTheme(loaded.theme) ? loaded.theme : null;
        const loadedLang =
          loaded.language === "fa" || loaded.language === "en" ? loaded.language : null;

        setSettings((previous) => ({
          ...previous,
          ...loaded,
          theme: loadedTheme ?? previous.theme,
          language: loadedLang ?? previous.language,
          duress_pin: "",
          alert_phone: loaded.alert_phone ?? ""
        }));
        setDuressPinConfigured(Boolean(loaded.duress_pin_hash));
        setError(null);
      })
      .catch((err) => {
        if (isAbortError(err)) {
          return;
        }
        const errMsg = err instanceof Error ? err.message : tRef.current("backendUnavailable");
        setError(errMsg);
        toastRef.current.error(errMsg);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!isAdmin) {
      return;
    }
    setMessage(null);
    setError(null);

    const trimmedPin = settings.duress_pin.trim();
    if (!clearDuressPin && trimmedPin && !PIN_PATTERN.test(trimmedPin)) {
      setError(t("pinValidationError"));
      toast.error(t("pinValidationError"));
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = {
        theme: settings.theme,
        language: settings.language,
        auto_lock_start: String(Number.parseInt(settings.auto_lock_start, 10) || 0),
        auto_lock_end: String(Number.parseInt(settings.auto_lock_end, 10) || 0),
        timer_duration: settings.timer_duration,
        require_pin_with_rfid: settings.require_pin_with_rfid,
        duress_mode: settings.duress_mode,
        duress_rfid: settings.duress_rfid.trim(),
        alert_phone: settings.alert_phone.trim()
      };

      if (clearDuressPin) {
        payload.clear_duress_pin = "true";
      } else if (trimmedPin) {
        payload.duress_pin = trimmedPin;
      }

      await api.put("/settings/", { settings: payload });

      setTheme(settings.theme);
      setLanguage(settings.language);

      if (clearDuressPin) {
        setDuressPinConfigured(false);
        setClearDuressPin(false);
      } else if (trimmedPin) {
        setDuressPinConfigured(true);
      }
      setSettings((previous) => ({ ...previous, duress_pin: "" }));
      setMessage(t("settingsSaved"));
      toast.success(t("settingsSaved"));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : t("error");
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageCard className="max-w-4xl">
        <h2 className="mb-6 text-xl font-bold text-[var(--accent)]">{t("systemSettings")}</h2>

        {!isAdmin && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[var(--warn-border)] bg-[var(--warn-bg)] p-4 text-sm text-[var(--warn-text)]">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{t("readOnlySettingsNotice")}</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-[var(--err-border)] bg-[var(--err-bg)] p-3 text-sm text-[var(--err-text)]"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-20 w-full" />
            <div className="skeleton h-40 w-full" />
          </div>
        ) : (
          <form className="grid gap-5" onSubmit={submit}>
            <div className="surface-muted rounded-2xl p-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{t("autoLockTimeout")}</h3>
              <p className="mt-1 mb-4 text-xs text-[var(--text-muted)]">{t("tehranTimezoneNote")}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{t("startTime")}</span>
                  <input
                    className="field"
                    type="time"
                    disabled={!isAdmin}
                    value={formatHourInput(settings.auto_lock_start)}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        auto_lock_start: String(Number.parseInt(event.target.value.split(":")[0], 10) || 0)
                      })
                    }
                    dir="ltr"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{t("endTime")}</span>
                  <input
                    className="field"
                    type="time"
                    disabled={!isAdmin}
                    value={formatHourInput(settings.auto_lock_end)}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        auto_lock_end: String(Number.parseInt(event.target.value.split(":")[0], 10) || 0)
                      })
                    }
                    dir="ltr"
                  />
                </label>
              </div>
            </div>

            <label className="surface-muted flex items-center justify-between gap-4 rounded-2xl p-4">
              <span>
                <span className="block font-semibold text-[var(--text-primary)]">
                  {t("requirePinWithRfid")}
                </span>
                <span className="text-sm text-[var(--text-muted)]">{t("requirePinWithRfidDesc")}</span>
              </span>
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={settings.require_pin_with_rfid === "true"}
                onChange={(event) =>
                  setSettings({ ...settings, require_pin_with_rfid: String(event.target.checked) })
                }
                className="h-5 w-5 accent-[var(--accent)]"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">{t("theme")}</span>
                <select
                  className="field"
                  disabled={!isAdmin}
                  value={settings.theme}
                  onChange={(event) => {
                    const nextTheme = event.target.value as ThemeMode;
                    setSettings({ ...settings, theme: nextTheme });
                    setTheme(nextTheme);
                  }}
                >
                  <option value="neon">{t("neon")}</option>
                  <option value="matrix">{t("matrix")}</option>
                  <option value="light">{t("light")}</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">{t("language")}</span>
                <select
                  className="field"
                  disabled={!isAdmin}
                  value={settings.language}
                  onChange={(event) =>
                    setSettings({ ...settings, language: event.target.value as Language })
                  }
                >
                  <option value="fa">فارسی</option>
                  <option value="en">English</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">{t("unlockTimer")}</span>
                <input
                  className="field"
                  type="number"
                  min={1}
                  max={60}
                  disabled={!isAdmin}
                  value={settings.timer_duration}
                  onChange={(event) => setSettings({ ...settings, timer_duration: event.target.value })}
                  dir="ltr"
                />
              </label>
            </div>

            <div className="surface-muted rounded-2xl p-4">
              <h3 className="mb-4 font-bold text-[var(--text-primary)]">{t("duressSettings")}</h3>
              <div className="grid gap-4">
                <label className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block font-semibold text-[var(--text-primary)]">{t("duressMode")}</span>
                    <span className="text-sm text-[var(--text-muted)]">{t("duressModeDesc")}</span>
                  </span>
                  <input
                    type="checkbox"
                    disabled={!isAdmin}
                    checked={settings.duress_mode === "true"}
                    onChange={(event) =>
                      setSettings({ ...settings, duress_mode: String(event.target.checked) })
                    }
                    className="h-5 w-5 accent-[var(--accent)]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{t("duressRfid")}</span>
                  <input
                    className="field"
                    disabled={!isAdmin}
                    value={settings.duress_rfid}
                    onChange={(event) => setSettings({ ...settings, duress_rfid: event.target.value })}
                    dir="ltr"
                    placeholder={t("duressRfidPlaceholder")}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{t("duressPin")}</span>
                  <input
                    className="field"
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    disabled={!isAdmin || clearDuressPin}
                    value={settings.duress_pin}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        duress_pin: event.target.value.replace(/\D/g, "").slice(0, 8)
                      })
                    }
                    dir="ltr"
                    placeholder={
                      duressPinConfigured ? t("duressPinConfigured") : t("duressPinPlaceholder")
                    }
                  />
                  <span className="block text-xs text-[var(--text-muted)]">{t("duressPinHint")}</span>
                </label>

                {duressPinConfigured && (
                  <label className="surface-card flex items-center justify-between rounded-xl p-3">
                    <span className="text-sm font-medium text-[var(--err-text)]">
                      {t("clearDuressPin")}
                    </span>
                    <input
                      type="checkbox"
                      disabled={!isAdmin}
                      checked={clearDuressPin}
                      onChange={(event) => {
                        setClearDuressPin(event.target.checked);
                        if (event.target.checked) {
                          setSettings((prev) => ({ ...prev, duress_pin: "" }));
                        }
                      }}
                      className="h-5 w-5 accent-[var(--danger-bg)]"
                    />
                  </label>
                )}

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{t("alertPhone")}</span>
                  <input
                    className="field"
                    type="tel"
                    disabled={!isAdmin}
                    value={settings.alert_phone}
                    onChange={(event) => setSettings({ ...settings, alert_phone: event.target.value })}
                    dir="ltr"
                    placeholder={t("alertPhonePlaceholder")}
                  />
                </label>
              </div>
            </div>

            {message && (
              <div
                role="status"
                className="rounded-2xl border border-[var(--ok-border)] bg-[var(--ok-bg)] p-3 text-sm text-[var(--ok-text)]"
              >
                {message}
              </div>
            )}

            <button className="btn-primary w-full md:w-auto md:px-8" disabled={!isAdmin || saving}>
              {saving ? t("loading") : t("saveChanges")}
            </button>
          </form>
        )}
      </PageCard>
    </AppShell>
  );
}
