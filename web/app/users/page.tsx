"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Pencil, Plus, Search, Trash2, UserRound } from "lucide-react";
import { AppShell, EmptyState, PageCard } from "@/components/app-shell";
import { DialogModal } from "@/components/dialog-modal";
import { useToast } from "@/components/toast";
import { api, isAbortError } from "@/lib/api";
import { formatDateTime, parseUtcTimestamp } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { DoorUser } from "@/lib/types";

const PIN_PATTERN = /^\d{4,8}$/;
const emptyCreateForm = { name: "", role: "user", rfid_tag: "", pin: "", expires_at: "" };

function toDatetimeLocalValue(iso: string | null | undefined): string {
  const date = parseUtcTimestamp(iso);
  if (!date) {
    return "";
  }
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function UsersPage() {
  const { t, language } = useI18n();
  const toast = useToast();

  const [users, setUsers] = useState<DoorUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [form, setForm] = useState(emptyCreateForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<DoorUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    rfid_tag: "",
    role: "user",
    is_active: true,
    expires_at: ""
  });
  const [editSaving, setEditSaving] = useState(false);

  const [pinModalUser, setPinModalUser] = useState<DoorUser | null>(null);
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSaving, setPinSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DoorUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const list = await api.get<DoorUser[]>("/users/", { signal });
        setUsers(list);
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
    const params = new URLSearchParams(window.location.search);
    const rfid = params.get("rfid");
    if (rfid) {
      setForm((previous) => ({ ...previous, rfid_tag: rfid }));
    }
    const controller = new AbortController();
    void loadUsers(controller.signal);
    return () => controller.abort();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((item) => {
      if (statusFilter === "active" && item.is_active === false) {
        return false;
      }
      if (statusFilter === "inactive" && item.is_active !== false) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        item.name.toLowerCase().includes(q) ||
        item.rfid_tag.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, statusFilter, users]);

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const trimmedPin = form.pin.trim();
    if (trimmedPin && !PIN_PATTERN.test(trimmedPin)) {
      setFormError(t("pinValidationError"));
      toast.error(t("pinValidationError"));
      return;
    }

    setSaving(true);
    try {
      const created = await api.post<DoorUser>("/users/", {
        name: form.name.trim(),
        role: form.role,
        rfid_tag: form.rfid_tag.trim()
      });

      if (form.expires_at) {
        await api.patch(`/users/${created.id}`, {
          expires_at: new Date(form.expires_at).toISOString()
        });
      }

      if (trimmedPin) {
        await api.put(`/users/${created.id}/pin`, { pin: trimmedPin });
      }

      setForm(emptyCreateForm);
      toast.success(t("userCreated"));
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("error");
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function openEditDialog(user: DoorUser) {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      rfid_tag: user.rfid_tag,
      role: user.role || "user",
      is_active: user.is_active !== false,
      expires_at: toDatetimeLocalValue(user.expires_at)
    });
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingUser) {
      return;
    }
    setEditSaving(true);
    try {
      await api.patch(`/users/${editingUser.id}`, {
        name: editForm.name.trim(),
        rfid_tag: editForm.rfid_tag.trim(),
        role: editForm.role,
        is_active: editForm.is_active,
        expires_at: editForm.expires_at ? new Date(editForm.expires_at).toISOString() : null
      });
      setEditingUser(null);
      toast.success(t("userUpdated"));
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setEditSaving(false);
    }
  }

  function openPinDialog(user: DoorUser) {
    setPinModalUser(user);
    setPinValue("");
    setPinError(null);
  }

  async function submitPin(event: FormEvent) {
    event.preventDefault();
    if (!pinModalUser) {
      return;
    }
    const trimmed = pinValue.trim();
    if (!PIN_PATTERN.test(trimmed)) {
      setPinError(t("pinValidationError"));
      return;
    }
    setPinSaving(true);
    setPinError(null);
    try {
      await api.put(`/users/${pinModalUser.id}/pin`, { pin: trimmed });
      setPinModalUser(null);
      toast.success(t("pinSaved"));
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("error");
      setPinError(message);
      toast.error(message);
    } finally {
      setPinSaving(false);
    }
  }

  async function clearPin() {
    if (!pinModalUser) {
      return;
    }
    setPinSaving(true);
    setPinError(null);
    try {
      await api.delete(`/users/${pinModalUser.id}/pin`);
      setPinModalUser(null);
      toast.success(t("pinCleared"));
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("error");
      setPinError(message);
      toast.error(message);
    } finally {
      setPinSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      toast.success(t("userDeleted"));
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppShell>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <PageCard>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">{t("authorizedUsers")}</p>
              <h2 className="text-xl font-bold text-[var(--accent)]">{t("users")}</h2>
            </div>
            <span className="badge-neutral self-start sm:self-auto">{filteredUsers.length}</span>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
            <div className="relative">
              <Search
                className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-[var(--text-muted)]"
                aria-hidden="true"
              />
              <input
                type="search"
                className="field ps-9 text-sm"
                placeholder={t("searchUsersPlaceholder")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <select
              aria-label={t("status")}
              className="field text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
            >
              <option value="all">{t("all")}</option>
              <option value="active">{t("active")}</option>
              <option value="inactive">{t("inactive")}</option>
            </select>
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
            <div className="grid gap-3 md:grid-cols-2">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="skeleton h-44 w-full rounded-3xl" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState message={t("noResults")} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredUsers.map((user) => (
                <div key={user.id} className="surface-muted rounded-3xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
                        <UserRound className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-bold text-[var(--text-primary)]">{user.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{user.role}</div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditDialog(user)}
                        aria-label={t("editUser")}
                        title={t("edit")}
                        className="btn-ghost !rounded-xl !p-2"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openPinDialog(user)}
                        aria-label={t("managePin")}
                        title={t("managePin")}
                        className="btn-ghost !rounded-xl !p-2"
                      >
                        <KeyRound className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(user)}
                        aria-label={t("delete")}
                        title={t("delete")}
                        className="btn-danger !rounded-xl !p-2"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="surface-card mt-4 space-y-2 rounded-2xl p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--text-muted)]">{t("rfidTag")}</span>
                      <span className="font-mono font-semibold text-[var(--accent)]" dir="ltr">
                        {user.rfid_tag}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--text-muted)]">{t("status")}</span>
                      <span className={user.is_active === false ? "badge-err" : "badge-ok"}>
                        {user.is_active === false ? t("inactive") : t("active")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--text-muted)]">{t("pin")}</span>
                      <span className={user.has_pin ? "badge-ok" : "badge-neutral"}>
                        {user.has_pin ? t("pinConfigured") : t("noPin")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--text-muted)]">{t("expiresAt")}</span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {user.expires_at ? formatDateTime(user.expires_at, language) : t("noExpiry")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageCard>

        <PageCard>
          <div className="mb-5 flex items-center gap-2 text-[var(--accent)]">
            <Plus className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-lg font-bold">{t("addUser")}</h2>
          </div>

          <form className="space-y-4" onSubmit={submitCreate}>
            <Field
              label={t("fullName")}
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
              required
            />
            <Field
              label={t("rfidTag")}
              value={form.rfid_tag}
              onChange={(value) => setForm({ ...form, rfid_tag: value })}
              required
              dir="ltr"
            />
            <Field
              label={t("pinOptional")}
              value={form.pin}
              onChange={(value) => setForm({ ...form, pin: value.replace(/\D/g, "").slice(0, 8) })}
              inputMode="numeric"
              maxLength={8}
              dir="ltr"
            />
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--text-secondary)]">{t("expiresAt")}</span>
              <input
                type="datetime-local"
                className="field"
                value={form.expires_at}
                onChange={(event) => setForm({ ...form, expires_at: event.target.value })}
                dir="ltr"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--text-secondary)]">{t("role")}</span>
              <select
                className="field"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
              >
                <option value="user">{t("standardUser")}</option>
                <option value="operator">{t("operator")}</option>
                <option value="guest">{t("guest")}</option>
              </select>
            </label>

            {formError && (
              <div
                role="alert"
                className="rounded-2xl border border-[var(--err-border)] bg-[var(--err-bg)] p-3 text-sm text-[var(--err-text)]"
              >
                {formError}
              </div>
            )}

            <button className="btn-primary w-full" disabled={saving}>
              {saving ? t("loading") : t("save")}
            </button>
          </form>
        </PageCard>
      </div>

      <DialogModal
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title={t("editUser")}
      >
        <form className="space-y-4" onSubmit={submitEdit}>
          <Field
            label={t("fullName")}
            value={editForm.name}
            onChange={(value) => setEditForm({ ...editForm, name: value })}
            required
          />
          <Field
            label={t("rfidTag")}
            value={editForm.rfid_tag}
            onChange={(value) => setEditForm({ ...editForm, rfid_tag: value })}
            required
            dir="ltr"
          />
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--text-secondary)]">{t("role")}</span>
            <select
              className="field"
              value={editForm.role}
              onChange={(event) => setEditForm({ ...editForm, role: event.target.value })}
            >
              <option value="user">{t("standardUser")}</option>
              <option value="operator">{t("operator")}</option>
              <option value="guest">{t("guest")}</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--text-secondary)]">{t("expiresAt")}</span>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                className="field"
                value={editForm.expires_at}
                onChange={(event) => setEditForm({ ...editForm, expires_at: event.target.value })}
                dir="ltr"
              />
              {editForm.expires_at && (
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, expires_at: "" })}
                  className="btn-ghost shrink-0 text-xs"
                >
                  {t("reset")}
                </button>
              )}
            </div>
          </label>
          <label className="surface-muted flex items-center justify-between rounded-2xl p-3.5">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{t("active")}</span>
            <input
              type="checkbox"
              checked={editForm.is_active}
              onChange={(event) => setEditForm({ ...editForm, is_active: event.target.checked })}
              className="h-5 w-5 accent-[var(--accent)]"
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditingUser(null)} className="btn-ghost">
              {t("cancel")}
            </button>
            <button type="submit" className="btn-primary" disabled={editSaving}>
              {editSaving ? t("loading") : t("saveChanges")}
            </button>
          </div>
        </form>
      </DialogModal>

      <DialogModal
        open={Boolean(pinModalUser)}
        onClose={() => setPinModalUser(null)}
        title={`${t("managePin")}${pinModalUser ? ` — ${pinModalUser.name}` : ""}`}
      >
        <form className="space-y-4" onSubmit={submitPin}>
          <Field
            label={t("setPin")}
            value={pinValue}
            onChange={(value) => setPinValue(value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            maxLength={8}
            placeholder="4–8 digits"
            dir="ltr"
          />
          {pinError && (
            <div
              role="alert"
              className="rounded-2xl border border-[var(--err-border)] bg-[var(--err-bg)] p-3 text-sm text-[var(--err-text)]"
            >
              {pinError}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button
              type="button"
              disabled={pinSaving || pinModalUser?.has_pin === false}
              onClick={() => void clearPin()}
              className="btn-danger text-sm"
            >
              {t("clearPin")}
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPinModalUser(null)} className="btn-ghost">
                {t("cancel")}
              </button>
              <button type="submit" className="btn-primary" disabled={pinSaving}>
                {pinSaving ? t("loading") : t("save")}
              </button>
            </div>
          </div>
        </form>
      </DialogModal>

      <DialogModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t("delete")}
        description={deleteTarget ? `${deleteTarget.name} (${deleteTarget.rfid_tag})` : undefined}
        maxWidthClass="max-w-md"
      >
        <p className="text-sm text-[var(--text-secondary)]">{t("deleteUserConfirm")}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setDeleteTarget(null)} className="btn-ghost">
            {t("cancel")}
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => void confirmDelete()}
            className="btn-danger"
          >
            {deleting ? t("loading") : t("delete")}
          </button>
        </div>
      </DialogModal>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  dir,
  inputMode,
  maxLength,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  dir?: "ltr" | "rtl";
  inputMode?: "numeric" | "text";
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      <input
        className="field"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        dir={dir}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
      />
    </label>
  );
}
