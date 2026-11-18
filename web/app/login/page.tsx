"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Moon, Phone, Shield, Sun } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/components/toast";

type LoginTab = "password" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const { login, sendOtp, verifyOtp, isAuthenticated, isLoading, error, clearError } = useAuth();
  const { t, language, setLanguage, isRTL } = useI18n();
  const { theme, toggleLightDark } = useTheme();
  const toast = useToast();

  const [tab, setTab] = useState<LoginTab>("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneMasked, setPhoneMasked] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!otpSent || countdown <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpSent, countdown]);

  function switchTab(nextTab: LoginTab) {
    setTab(nextTab);
    setLocalError(null);
    clearError();
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    const ok = await login(username.trim(), password);
    setSubmitting(false);
    if (ok) {
      router.replace("/dashboard");
    }
  }

  async function handleSendOtp(event?: FormEvent) {
    event?.preventDefault();
    setLocalError(null);
    clearError();
    const cleanedPhone = phone.trim();
    if (!cleanedPhone) {
      return;
    }
    setSubmitting(true);
    try {
      const response = await sendOtp(cleanedPhone);
      setOtpSent(true);
      setPhoneMasked(response.phone_masked ?? cleanedPhone);
      setCountdown(response.expires_in ?? 300);
      toast.success(response.message || t("otpSentTo"));
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t("error"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    const ok = await verifyOtp(phone.trim(), otpCode.trim());
    setSubmitting(false);
    if (ok) {
      router.replace("/dashboard");
    }
  }

  const activeError = localError || error;
  const formattedCountdown = `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, "0")}`;

  return (
    <main
      dir={isRTL ? "rtl" : "ltr"}
      className="flex min-h-screen items-center justify-center px-4 py-10"
    >
      <section className="surface-card w-full max-w-md rounded-3xl p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
              <Shield className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--accent)]">{t("appName")}</h1>
              <p className="text-sm text-[var(--text-muted)]">{t("loginDescription")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLightDark}
              aria-label={t("quickTheme")}
              title={t("quickTheme")}
              className="btn-ghost !rounded-xl !p-2"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <select
              aria-label={t("language")}
              className="field !w-auto !rounded-xl !px-2.5 !py-1.5 text-sm font-semibold"
              value={language}
              onChange={(event) => setLanguage(event.target.value as "fa" | "en")}
            >
              <option value="fa">FA</option>
              <option value="en">EN</option>
            </select>
          </div>
        </div>

        <div className="surface-muted mb-6 grid grid-cols-2 gap-1.5 rounded-2xl p-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "password"}
            onClick={() => switchTab("password")}
            className={clsx(
              "rounded-xl px-3 py-2 text-sm font-semibold transition",
              tab === "password"
                ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            {t("passwordLoginTab")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "otp"}
            onClick={() => switchTab("otp")}
            className={clsx(
              "rounded-xl px-3 py-2 text-sm font-semibold transition",
              tab === "otp"
                ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            {t("otpLoginTab")}
          </button>
        </div>

        {tab === "password" ? (
          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--text-secondary)]">{t("username")}</span>
              <input
                className="field"
                autoComplete="username"
                placeholder={t("username")}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                dir="ltr"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--text-secondary)]">{t("password")}</span>
              <div className="relative">
                <input
                  className="field pe-11"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder={t("password")}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  className="absolute inset-y-0 end-2 my-auto grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </label>

            {activeError && (
              <div
                role="alert"
                className="rounded-2xl border border-[var(--err-border)] bg-[var(--err-bg)] px-4 py-3 text-sm font-medium text-[var(--err-text)]"
              >
                {activeError}
              </div>
            )}

            <button className="btn-primary w-full" disabled={submitting || isLoading}>
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
              {submitting ? t("loading") : t("login")}
            </button>
          </form>
        ) : !otpSent ? (
          <form className="space-y-4" onSubmit={handleSendOtp}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--text-secondary)]">{t("phone")}</span>
              <input
                className="field"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={t("phonePlaceholder")}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                dir="ltr"
              />
            </label>

            {activeError && (
              <div
                role="alert"
                className="rounded-2xl border border-[var(--err-border)] bg-[var(--err-bg)] px-4 py-3 text-sm font-medium text-[var(--err-text)]"
              >
                {activeError}
              </div>
            )}

            <button className="btn-primary w-full" disabled={submitting || isLoading}>
              <Phone className="h-5 w-5" aria-hidden="true" />
              {submitting ? t("loading") : t("sendOtp")}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleVerifyOtp}>
            <div className="surface-muted rounded-2xl p-3.5 text-sm">
              <div className="text-[var(--text-secondary)]">
                {t("otpSentTo")}{" "}
                <span className="font-mono font-bold text-[var(--text-primary)]" dir="ltr">
                  {phoneMasked || phone}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>{t("otpExpiresIn")}</span>
                <span className="font-mono font-bold text-[var(--accent)]" dir="ltr">
                  {formattedCountdown}
                </span>
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--text-secondary)]">{t("otpCode")}</span>
              <input
                className="field text-center font-mono text-lg tracking-widest"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoComplete="one-time-code"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                dir="ltr"
              />
            </label>

            {activeError && (
              <div
                role="alert"
                className="rounded-2xl border border-[var(--err-border)] bg-[var(--err-bg)] px-4 py-3 text-sm font-medium text-[var(--err-text)]"
              >
                {activeError}
              </div>
            )}

            <button className="btn-primary w-full" disabled={submitting || otpCode.length !== 6}>
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
              {submitting ? t("loading") : t("verifyOtp")}
            </button>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                disabled={submitting || countdown > 240}
                onClick={() => void handleSendOtp()}
                className="btn-ghost !py-2 text-xs"
              >
                {t("resendOtp")}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setOtpSent(false);
                  setOtpCode("");
                  setLocalError(null);
                  clearError();
                }}
                className="btn-ghost !py-2 text-xs"
              >
                {t("changePhone")}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">{t("cookieAuthHint")}</p>
      </section>
    </main>
  );
}
