import type { Language } from "@/lib/types";

const NAIVE_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

export function parseUtcTimestamp(value: string | Date | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = NAIVE_ISO_PATTERN.test(trimmed) ? `${trimmed.replace(" ", "T")}Z` : trimmed;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(
  value: string | Date | number | null | undefined,
  language: Language
): string {
  const date = parseUtcTimestamp(value);
  if (!date) {
    return "--";
  }
  const locale = language === "fa" ? "fa-IR-u-ca-persian" : "en-US";
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(language === "fa" ? { timeZone: "Asia/Tehran" } : {})
  };
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return date.toISOString();
  }
}

export function formatDateOnly(
  value: string | Date | number | null | undefined,
  language: Language
): string {
  const date = parseUtcTimestamp(value);
  if (!date) {
    return "--";
  }
  const locale = language === "fa" ? "fa-IR-u-ca-persian" : "en-US";
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(language === "fa" ? { timeZone: "Asia/Tehran" } : {})
  };
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatNumber(value: number, language: Language): string {
  const locale = language === "fa" ? "fa-IR" : "en-US";
  return new Intl.NumberFormat(locale).format(value);
}
