const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export function apiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }
  // Same-origin behind nginx: /auth, /users, /api/temporary-pins, etc.
  return "";
}

export function wsUrl() {
  const configured = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (configured) {
    return configured;
  }
  if (typeof window === "undefined") {
    return "";
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/frontend`;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isAbortError(error: unknown): boolean {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return error.name === "AbortError";
  }
  return error instanceof Error && error.name === "AbortError";
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function parseError(response: Response): Promise<string> {
  const fallback = `HTTP ${response.status}`;
  try {
    const body = (await response.json()) as {
      detail?: string | Array<{ msg?: string; loc?: Array<string | number> }>;
      message?: string;
    };
    if (typeof body.detail === "string" && body.detail.trim()) {
      return body.detail;
    }
    if (Array.isArray(body.detail) && body.detail.length > 0) {
      const first = body.detail[0];
      if (first?.msg) {
        return first.msg;
      }
    }
    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export interface ApiRequestOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
  idempotencyKey?: string;
}

export async function apiRequest<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (method === "POST" && !headers.has("Idempotency-Key")) {
    headers.set("Idempotency-Key", generateIdempotencyKey());
  }

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    method,
    headers,
    credentials: "include",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

function buildOptions(options?: ApiRequestOptions): RequestInit {
  const headers = new Headers(options?.headers);
  if (options?.idempotencyKey) {
    headers.set("Idempotency-Key", options.idempotencyKey);
  }
  return {
    signal: options?.signal,
    headers
  };
}

export const api = {
  get: <T>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...buildOptions(options), method: "GET" }),
  post: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      ...buildOptions(options),
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body)
    }),
  postForm: <T>(endpoint: string, formData: FormData, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      ...buildOptions(options),
      method: "POST",
      body: formData
    }),
  put: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      ...buildOptions(options),
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body)
    }),
  delete: <T>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...buildOptions(options), method: "DELETE" }),
  patch: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      ...buildOptions(options),
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body)
    })
};
