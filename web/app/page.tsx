"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    if (!isLoading) {
      router.replace(isAuthenticated ? "/dashboard" : "/login");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="surface-card w-full max-w-xs space-y-3 rounded-3xl p-6 text-center">
        <div className="skeleton mx-auto h-10 w-10 rounded-2xl" />
        <p className="text-sm text-[var(--text-muted)]">{t("loading")}</p>
      </div>
    </main>
  );
}
