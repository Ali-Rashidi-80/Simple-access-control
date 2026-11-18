"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Camera, Shield, UserRound } from "lucide-react";
import { AppShell, PageCard } from "@/components/app-shell";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export default function ProfilePage() {
  const { user, updateProfile, notifyProfileUpdated } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  useEffect(() => {
    setFullName(user?.fullName ?? "");
    setEmail(user?.email ?? "");
    setAvatarLoadError(false);
  }, [user]);

  async function handleAvatarSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setError(null);
    setMessage(null);

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setError(t("avatarInvalidType"));
      toast.error(t("avatarInvalidType"));
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setError(t("avatarTooLarge"));
      toast.error(t("avatarTooLarge"));
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.postForm<{ ok: boolean; avatar_url: string }>("/profile/avatar", formData);
      await notifyProfileUpdated();
      setAvatarLoadError(false);
      setMessage(t("avatarUpdated"));
      toast.success(t("avatarUpdated"));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : t("error");
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        setError(t("currentPasswordRequired"));
        toast.error(t("currentPasswordRequired"));
        return;
      }
      if (newPassword.length < 6) {
        setError(t("passwordTooShort"));
        toast.error(t("passwordTooShort"));
        return;
      }
      if (newPassword !== confirmPassword) {
        setError(t("passwordsDoNotMatch"));
        toast.error(t("passwordsDoNotMatch"));
        return;
      }
    }

    setSaving(true);
    try {
      await updateProfile({ full_name: fullName.trim(), email: email.trim() || undefined });
      if (newPassword) {
        await api.put("/profile/password", {
          current_password: currentPassword,
          new_password: newPassword
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
      setMessage(t("profileUpdated"));
      toast.success(t("profileUpdated"));
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
      <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <PageCard>
          <div className="flex flex-col items-center text-center">
            {user?.avatar && !avatarLoadError ? (
              <img
                src={user.avatar}
                alt={user.fullName || user.username}
                onError={() => setAvatarLoadError(true)}
                className="h-24 w-24 rounded-full border-2 border-[var(--accent-border)] object-cover"
              />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <UserRound className="h-12 w-12" aria-hidden="true" />
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(event) => void handleAvatarSelect(event)}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="btn-ghost mt-4 text-xs"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              {uploadingAvatar ? t("loading") : t("uploadAvatar")}
            </button>
            <p className="mt-2 text-xs text-[var(--text-muted)]">{t("avatarRequirements")}</p>

            <h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">{user?.fullName}</h2>
            <p className="text-sm text-[var(--text-muted)]" dir="ltr">
              @{user?.username}
            </p>

            <div className="mt-5 w-full space-y-3 text-sm">
              <div className="surface-muted flex justify-between rounded-2xl p-3">
                <span className="text-[var(--text-muted)]">{t("role")}</span>
                <span className="font-semibold text-[var(--accent)]">{user?.role}</span>
              </div>
              <div className="surface-muted flex justify-between rounded-2xl p-3">
                <span className="text-[var(--text-muted)]">{t("clearanceLevel")}</span>
                <span className="font-semibold text-[var(--ok-text)]">
                  {user?.clearanceLevel ?? "--"}
                </span>
              </div>
            </div>
          </div>
        </PageCard>

        <PageCard>
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-[var(--accent)]">
            <Shield className="h-5 w-5" aria-hidden="true" />
            {t("profile")}
          </h2>

          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">{t("fullName")}</span>
                <input
                  className="field"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">{t("email")}</span>
                <input
                  className="field"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  dir="ltr"
                />
              </label>
            </div>

            <div className="grid gap-4 border-t border-[var(--border-subtle)] pt-5 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {t("currentPassword")}
                </span>
                <input
                  className="field"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  dir="ltr"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {t("newPassword")}
                </span>
                <input
                  className="field"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  dir="ltr"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {t("confirmPassword")}
                </span>
                <input
                  className="field"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  dir="ltr"
                />
              </label>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-[var(--err-border)] bg-[var(--err-bg)] p-3 text-sm text-[var(--err-text)]"
              >
                {error}
              </div>
            )}

            {message && (
              <div
                role="status"
                className="rounded-2xl border border-[var(--ok-border)] bg-[var(--ok-bg)] p-3 text-sm text-[var(--ok-text)]"
              >
                {message}
              </div>
            )}

            <button className="btn-primary px-8" disabled={saving}>
              {saving ? t("loading") : t("saveChanges")}
            </button>
          </form>
        </PageCard>
      </div>
    </AppShell>
  );
}
