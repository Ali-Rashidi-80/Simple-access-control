"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  Shield,
  Sun,
  UserCog,
  UserRound,
  Users,
  X
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import type { TranslationKey } from "@/lib/types";

interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/users", labelKey: "users", icon: Users },
  { href: "/logs", labelKey: "logs", icon: FileText },
  { href: "/operators", labelKey: "operators", icon: UserCog, adminOnly: true },
  { href: "/temporary-pins", labelKey: "temporaryPins", icon: Clock3 },
  { href: "/settings", labelKey: "settings", icon: Settings },
  { href: "/profile", labelKey: "profile", icon: Shield }
];

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }
  return pathname.replace(/\/+$/, "");
}

function AvatarBadge({ avatar, name }: { avatar?: string | null; name: string }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatar]);

  if (avatar && !imgError) {
    return (
      <img
        src={avatar}
        alt={name}
        onError={() => setImgError(true)}
        className="h-8 w-8 rounded-full border border-[var(--border-strong)] object-cover"
      />
    );
  }

  return (
    <span className="grid h-8 w-8 place-items-center rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
      <UserRound className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const normalizedPath = normalizePath(pathname);
  const router = useRouter();
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const { t, isRTL, language, setLanguage } = useI18n();
  const { theme, toggleLightDark } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || user?.role === "admin");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  if (isLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="surface-card w-full max-w-sm space-y-3 rounded-3xl p-6 text-center">
          <div className="skeleton mx-auto h-10 w-10 rounded-2xl" />
          <div className="skeleton mx-auto h-4 w-32" />
          <p className="text-sm text-[var(--text-muted)]">{t("loading")}</p>
        </div>
      </main>
    );
  }

  const currentNav = visibleNavItems.find((item) => item.href === normalizedPath);
  const pageTitle = currentNav ? t(currentNav.labelKey) : t("dashboard");
  const displayName = user?.fullName || user?.username || "";

  return (
    <div className={clsx("min-h-screen", isRTL ? "rtl" : "ltr")}>
      <aside
        className={clsx(
          "surface-card fixed top-0 z-30 hidden h-screen w-64 flex-col p-4 md:flex",
          isRTL ? "right-0 border-l" : "left-0 border-r"
        )}
      >
        <Link href="/dashboard" className="mb-7 flex items-center gap-3 px-2 pt-2">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
            <Shield className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-bold tracking-wide text-[var(--accent)]">{t("appName")}</div>
            <div className="truncate text-xs text-[var(--text-muted)]">{t("doorControl")}</div>
          </div>
        </Link>

        <nav className="flex-1 space-y-1" aria-label={t("menu")}>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = normalizedPath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  active
                    ? "border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="truncate">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="surface-muted rounded-2xl p-3 text-sm">
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <Activity className="h-4 w-4 shrink-0 text-[var(--ok-text)]" aria-hidden="true" />
            <span className="truncate font-semibold">{displayName}</span>
          </div>
          <div className="mt-0.5 text-xs text-[var(--text-muted)]">{user?.role}</div>
          <button type="button" onClick={() => void logout()} className="btn-ghost mt-3 w-full !py-2 text-sm">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t("logout")}
          </button>
        </div>
      </aside>

      <div className={clsx("relative z-10 min-w-0", isRTL ? "md:mr-64" : "md:ml-64")}>
        <header className="surface-card sticky top-0 z-20 border-x-0 border-t-0 px-3 py-3 md:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label={t("menu")}
                aria-expanded={mobileMenuOpen}
                className="btn-ghost !rounded-xl !p-2 md:hidden"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
              <div className="min-w-0">
                <div className="text-xs text-[var(--text-muted)]">{t("appName")}</div>
                <h1 className="truncate text-base font-bold text-[var(--accent)] md:text-lg">{pageTitle}</h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
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

              <Link
                href="/profile"
                aria-label={t("profile")}
                className="surface-muted flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-[var(--text-primary)] transition hover:border-[var(--accent-border)]"
              >
                <AvatarBadge avatar={user?.avatar} name={displayName} />
                <span className="hidden max-w-[8rem] truncate font-medium sm:inline">{user?.username}</span>
              </Link>
            </div>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="fixed inset-0 bg-black/60"
              aria-hidden="true"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t("menu")}
              className={clsx(
                "surface-card fixed top-0 bottom-0 z-50 flex w-72 max-w-[85vw] flex-col p-4",
                isRTL ? "right-0 border-l" : "left-0 border-r"
              )}
            >
              <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2.5">
                  <AvatarBadge avatar={user?.avatar} name={displayName} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-[var(--text-primary)]">{displayName}</div>
                    <div className="truncate text-xs text-[var(--text-muted)]">{user?.role}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label={t("close")}
                  className="btn-ghost !rounded-xl !p-2"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto" aria-label={t("menu")}>
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = normalizedPath === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition",
                        active
                          ? "border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "border border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]"
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  );
                })}
              </nav>

              <button
                type="button"
                onClick={() => void logout()}
                className="btn-danger mt-4 w-full !py-2.5 text-sm"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {t("logout")}
              </button>
            </div>
          </div>
        )}

        <main className="px-3 py-5 pb-24 md:px-6 md:pb-8">{children}</main>
      </div>

      <nav
        aria-label={t("menu")}
        className={clsx(
          "surface-card fixed inset-x-2 bottom-2 z-30 grid gap-0.5 rounded-2xl p-1.5 md:hidden",
          visibleNavItems.length === 7 ? "grid-cols-7" : "grid-cols-6"
        )}
      >
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = normalizedPath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={t(item.labelKey)}
              title={t(item.labelKey)}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "grid h-10 place-items-center rounded-xl transition",
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx("surface-card rounded-3xl p-4 md:p-6", className)}>{children}</section>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="surface-muted rounded-2xl border-dashed p-8 text-center text-sm text-[var(--text-muted)]">
      {message}
    </div>
  );
}
