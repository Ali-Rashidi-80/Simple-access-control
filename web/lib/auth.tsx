"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, isAbortError } from "@/lib/api";
import type { OtpSendResponse, SessionUser } from "@/lib/types";

const AUTH_CHANNEL = "sg_auth";

interface AuthContextValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  login: (username: string, password: string) => Promise<boolean>;
  sendOtp: (phone: string) => Promise<OtpSendResponse>;
  verifyOtp: (phone: string, otp: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: (signal?: AbortSignal) => Promise<SessionUser | null>;
  updateProfile: (data: { full_name?: string; email?: string }) => Promise<void>;
  notifyProfileUpdated: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeUser(value: unknown): SessionUser | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  return {
    id: (raw.id as number | string | undefined) ?? "",
    username: String(raw.username ?? ""),
    fullName: String(raw.fullName ?? raw.full_name ?? raw.username ?? ""),
    email: (raw.email as string | null | undefined) ?? null,
    phone: (raw.phone as string | null | undefined) ?? null,
    role: String(raw.role ?? "operator"),
    clearanceLevel: Number(raw.clearanceLevel ?? raw.clearance_level ?? 1),
    avatar: (raw.avatar as string | null | undefined) ?? (raw.avatar_path as string | null | undefined) ?? null,
    lastLogin: (raw.lastLogin as string | null | undefined) ?? null,
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : raw.is_active !== undefined ? Boolean(raw.is_active) : true,
    isOnline: Boolean(raw.isOnline ?? true)
  };
}

function broadcastAuthEvent(type: "login" | "logout" | "profile_updated") {
  if (typeof BroadcastChannel === "undefined") {
    return;
  }
  const channel = new BroadcastChannel(AUTH_CHANNEL);
  channel.postMessage({ type });
  channel.close();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async (signal?: AbortSignal): Promise<SessionUser | null> => {
    try {
      const response = await api.get<SessionUser>("/auth/me", { signal });
      const normalized = normalizeUser(response);
      setUser(normalized);
      return normalized;
    } catch (err) {
      if (!isAbortError(err)) {
        setUser(null);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshUser(controller.signal).finally(() => {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    });
    return () => controller.abort();
  }, [refreshUser]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return;
    }
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.onmessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === "logout") {
        setUser(null);
        setError(null);
      } else if (event.data?.type === "login" || event.data?.type === "profile_updated") {
        void refreshUser();
      }
    };
    return () => {
      channel.close();
    };
  }, [refreshUser]);

  const clearError = useCallback(() => setError(null), []);

  const login = useCallback(
    async (username: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.post<{ user?: unknown }>("/auth/login", { username, password });
        const nextUser = normalizeUser(response.user);
        if (nextUser) {
          setUser(nextUser);
        } else {
          await refreshUser();
        }
        broadcastAuthEvent("login");
        return true;
      } catch (err) {
        setUser(null);
        setError(err instanceof Error ? err.message : "Login failed");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshUser]
  );

  const sendOtp = useCallback(async (phone: string): Promise<OtpSendResponse> => {
    setError(null);
    try {
      return await api.post<OtpSendResponse>("/auth/otp/send", { phone });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "OTP send failed";
      setError(msg);
      throw err;
    }
  }, []);

  const verifyOtp = useCallback(
    async (phone: string, otp: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.post<{ user?: unknown }>("/auth/otp/verify", { phone, otp });
        const nextUser = normalizeUser(response.user);
        if (nextUser) {
          setUser(nextUser);
        } else {
          await refreshUser();
        }
        broadcastAuthEvent("login");
        return true;
      } catch (err) {
        setUser(null);
        setError(err instanceof Error ? err.message : "OTP verification failed");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshUser]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Cookie may already be expired; still clear local session and notify tabs.
    } finally {
      setUser(null);
      setError(null);
      broadcastAuthEvent("logout");
    }
  }, []);

  const updateProfile = useCallback(
    async (data: { full_name?: string; email?: string }) => {
      await api.put("/profile/", data);
      await refreshUser();
      broadcastAuthEvent("profile_updated");
    },
    [refreshUser]
  );

  const notifyProfileUpdated = useCallback(async () => {
    await refreshUser();
    broadcastAuthEvent("profile_updated");
  }, [refreshUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      error,
      clearError,
      login,
      sendOtp,
      verifyOtp,
      logout,
      refreshUser,
      updateProfile,
      notifyProfileUpdated
    }),
    [
      clearError,
      error,
      isLoading,
      login,
      logout,
      notifyProfileUpdated,
      refreshUser,
      sendOtp,
      updateProfile,
      user,
      verifyOtp
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
