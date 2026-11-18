"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ThemeMode } from "@/lib/types";

const THEME_STORAGE_KEY = "sg_theme";
const PREFS_CHANNEL = "sg_prefs";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (nextTheme: ThemeMode) => void;
  toggleLightDark: () => void;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => { finished: Promise<void> };
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function isValidTheme(value: unknown): value is ThemeMode {
  return value === "neon" || value === "matrix" || value === "light";
}

function applyThemeToDom(nextTheme: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.setAttribute("data-theme", nextTheme);
  document.documentElement.style.colorScheme = nextTheme === "light" ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("neon");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    const initial: ThemeMode = isValidTheme(stored) ? stored : "neon";
    setThemeState(initial);
    applyThemeToDom(initial);
  }, []);

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return;
    }
    const channel = new BroadcastChannel(PREFS_CHANNEL);
    channel.onmessage = (event: MessageEvent<{ type?: string; theme?: unknown }>) => {
      if (event.data?.type === "theme" && isValidTheme(event.data.theme)) {
        const synced = event.data.theme;
        applyThemeToDom(synced);
        setThemeState(synced);
      }
    };
    return () => {
      channel.close();
    };
  }, []);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    if (!isValidTheme(nextTheme)) {
      return;
    }
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);

    const update = () => {
      applyThemeToDom(nextTheme);
      setThemeState(nextTheme);
    };

    const doc = document as ViewTransitionDocument;
    if (typeof doc.startViewTransition === "function") {
      try {
        doc.startViewTransition(update);
      } catch {
        update();
      }
    } else {
      update();
    }

    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(PREFS_CHANNEL);
      channel.postMessage({ type: "theme", theme: nextTheme });
      channel.close();
    }
  }, []);

  const toggleLightDark = useCallback(() => {
    setTheme(theme === "light" ? "neon" : "light");
  }, [setTheme, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleLightDark
    }),
    [setTheme, theme, toggleLightDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return value;
}
