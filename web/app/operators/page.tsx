"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { Pencil, ShieldAlert, Trash2, UserCog } from "lucide-react";
import { AppShell, EmptyState, PageCard } from "@/components/app-shell";
import { DialogModal } from "@/components/dialog-modal";
import { useToast } from "@/components/toast";
import { api, isAbortError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { OperatorUser } from "@/lib/types";

const emptyCreateForm = {
  username: "",
  password: "",
  full_name: "",
  email: "",
  phone: "",
  role: "operator"
};

function isOperatorActive(operator: OperatorUser): boolean {
  if (operator.isActive !== undefined) {
    return operator.isActive;
  }
  return operator.is_active !== false;
}

export default function OperatorsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === "admin";

  const [operators, setOperators] = useState<OperatorUser[]>([]);
  const [form, setForm] = useState(emptyCreateForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingOperator, setEditingOperator] = useState<OperatorUser | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "operator",
    is_active: true,
    password: ""
  });
  const [editSaving, setEditSaving] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState<OperatorUser | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const loadOperators = useCallback(
    async (signal?: AbortSignal) => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const list = await api.get<OperatorUser[]>("/auth/admins", { signal });
        setOperators(list);
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
    [isAdmin, t, toast]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadOperators(controller.signal);
    return () => controller.abort();
  }, [loadOperators]);

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    if (form.password.length < 6) {
      toast.error(t("passwordTooShort"));
      return;
    }
    setSaving(true);
    try {
      await api.post("/auth/admins", {
        username: form.username.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        role: form.role
      });
      setForm(emptyCreateForm);
      toast.success(t("operatorCreated"));
      await loadOperators();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("error");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function openEditDialog(operator: OperatorUser) {
    setEditingOperator(operator);
    setEditForm({
      full_name: operator.fullName || operator.full_name || operator.username,
      email: operator.email ?? "",
      phone: operator.phone ?? "",
      role: operator.role,
      is_active: isOperatorActive(operator),
      password: ""
    });
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingOperator) {
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      toast.error(t("passwordTooShort"));
      return;
    }
    setEditSaving(true);
    try {
      const isSelf = String(editingOperator.id) === String(user?.id);
      const payload: Record<string, unknown> = {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null
      };
      if (!isSelf) {
        payload.role = editForm.role;
        payload.is_active = editForm.is_active;
      }
      if (editForm.password) {
        payload.password = editForm.password;
      }
      await api.patch(`/auth/admins/${editingOperator.id}`, payload);
      setEditingOperator(null);
      toast.success(t("operatorUpdated"));
      await loadOperators();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setEditSaving(false);
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) {
      return;
    }
    setDeactivating(true);
    try {
      await api.patch(`/auth/admins/${deactivateTarget.id}`, { is_active: false });
      setDeactivateTarget(null);
      toast.success(t("operatorDeactivated"));
      await loadOperators();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setDeactivating(false);
    }
  }

  return (
    <AppShell>
      {!isAdmin ? (
        <PageCard className="max-w-xl">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-text)]">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">{t("operators")}</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("adminOnlyNotice")}</p>
            </div>
          </div>
        </PageCard>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <PageCard>
            <h2 className="mb-5 text-xl font-bold text-[var(--accent)]">{t("operators")}</h2>

            {error && (
              <div
                role="alert"
                className="mb-4 rounded-2xl border border-[var(--err-border)] bg-[var(--err-bg)] p-3 text-sm text-[var(--err-text)]"
              >
                {error}
              </div>
            )}

            {loading ? (
              <div className="grid gap-3 md:grid-cols-2">
                {[0, 1].map((idx) => (
                  <div key={idx} className="skeleton h-40 w-full rounded-3xl" />
                ))}
              </div>
            ) : operators.length === 0 ? (
              <EmptyState message={t("noResults")} />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {operators.map((operator) => {
                  const active = isOperatorActive(operator);
                  const isSelf = String(operator.id) === String(user?.id);
                  return (
                    <div key={operator.id} className="surface-muted rounded-3xl p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
                            <UserCog className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-bold text-[var(--text-primary)]">
                              {operator.fullName || operator.full_name || operator.username}
                            </div>
                            <div className="truncate text-xs text-[var(--text-muted)]" dir="ltr">
                              @{operator.username}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditDialog(operator)}
                            aria-label={t("editOperator")}
                            title={t("edit")}
                            className="btn-ghost !rounded-xl !p-2"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          {active && (
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => setDeactivateTarget(operator)}
                              aria-label={t("deactivateOperator")}
                              title={isSelf ? t("cannotDeactivateSelf") : t("deactivateOperator")}
                              className="btn-danger !rounded-xl !p-2"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="surface-card mt-4 space-y-2 rounded-2xl p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[var(--text-muted)]">{t("role")}</span>
                          <span className="badge-neutral">{operator.role}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[var(--text-muted)]">{t("status")}</span>
                          <span className={active ? "badge-ok" : "badge-err"}>
                            {active ? t("active") : t("inactive")}
                          </span>
                        </div>
                        {operator.phone && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[var(--text-muted)]">{t("phone")}</span>
                            <span className="font-mono text-xs text-[var(--text-secondary)]" dir="ltr">
                              {operator.phone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </PageCard>

          <PageCard>
            <h2 className="mb-5 text-lg font-bold text-[var(--accent)]">{t("createOperator")}</h2>
            <form className="space-y-4" onSubmit={submitCreate}>
              <Input
                label={t("username")}
                value={form.username}
                onChange={(value) => setForm({ ...form, username: value })}
                required
                dir="ltr"
              />
              <Input
                label={t("password")}
                value={form.password}
                onChange={(value) => setForm({ ...form, password: value })}
                required
                minLength={6}
                type="password"
                dir="ltr"
              />
              <Input
                label={t("fullName")}
                value={form.full_name}
                onChange={(value) => setForm({ ...form, full_name: value })}
                required
              />
              <Input
                label={t("email")}
                value={form.email}
                onChange={(value) => setForm({ ...form, email: value })}
                type="email"
                dir="ltr"
              />
              <Input
                label={t("phoneOptional")}
                value={form.phone}
                onChange={(value) => setForm({ ...form, phone: value })}
                type="tel"
                dir="ltr"
              />
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">{t("role")}</span>
                <select
                  className="field"
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value })}
                >
                  <option value="admin">{t("systemAdmin")}</option>
                  <option value="operator">{t("operator")}</option>
                </select>
              </label>
              <button className="btn-primary w-full" disabled={saving}>
                {saving ? t("loading") : t("save")}
              </button>
            </form>
          </PageCard>
        </div>
      )}

      <DialogModal
        open={Boolean(editingOperator)}
        onClose={() => setEditingOperator(null)}
        title={t("editOperator")}
        description={editingOperator ? `@${editingOperator.username}` : undefined}
      >
        <form className="space-y-4" onSubmit={submitEdit}>
          <Input
            label={t("fullName")}
            value={editForm.full_name}
            onChange={(value) => setEditForm({ ...editForm, full_name: value })}
            required
          />
          <Input
            label={t("email")}
            value={editForm.email}
            onChange={(value) => setEditForm({ ...editForm, email: value })}
            type="email"
            dir="ltr"
          />
          <Input
            label={t("phoneOptional")}
            value={editForm.phone}
            onChange={(value) => setEditForm({ ...editForm, phone: value })}
            type="tel"
            dir="ltr"
          />
          <Input
            label={t("passwordResetOptional")}
            value={editForm.password}
            onChange={(value) => setEditForm({ ...editForm, password: value })}
            type="password"
            dir="ltr"
          />
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--text-secondary)]">{t("role")}</span>
            <select
              className="field"
              value={editForm.role}
              disabled={String(editingOperator?.id) === String(user?.id)}
              onChange={(event) => setEditForm({ ...editForm, role: event.target.value })}
            >
              <option value="admin">{t("systemAdmin")}</option>
              <option value="operator">{t("operator")}</option>
            </select>
          </label>

          <label className="surface-muted flex items-center justify-between rounded-2xl p-3.5">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{t("active")}</span>
            <input
              type="checkbox"
              checked={editForm.is_active}
              disabled={String(editingOperator?.id) === String(user?.id)}
              onChange={(event) => setEditForm({ ...editForm, is_active: event.target.checked })}
              className="h-5 w-5 accent-[var(--accent)]"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditingOperator(null)} className="btn-ghost">
              {t("cancel")}
            </button>
            <button type="submit" className="btn-primary" disabled={editSaving}>
              {editSaving ? t("loading") : t("saveChanges")}
            </button>
          </div>
        </form>
      </DialogModal>

      <DialogModal
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        title={t("deactivateOperator")}
        description={deactivateTarget ? `@${deactivateTarget.username}` : undefined}
        maxWidthClass="max-w-md"
      >
        <p className="text-sm text-[var(--text-secondary)]">{t("deactivateOperatorConfirm")}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setDeactivateTarget(null)} className="btn-ghost">
            {t("cancel")}
          </button>
          <button
            type="button"
            disabled={deactivating}
            onClick={() => void confirmDeactivate()}
            className="btn-danger"
          >
            {deactivating ? t("loading") : t("confirm")}
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
  minLength,
  dir
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
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
        minLength={minLength}
        dir={dir}
      />
    </label>
  );
}
