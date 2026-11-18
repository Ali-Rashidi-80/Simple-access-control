"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, wsUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AccessLog, OpenCommandResult } from "@/lib/types";

interface UnknownTag {
  uid: string;
  timestamp?: string;
}

interface WebSocketContextValue {
  logs: AccessLog[];
  isConnected: boolean;
  hardwareOnline: boolean;
  latestTemperature: number | null;
  lastPongAt: number | null;
  lastUnknownTag: UnknownTag | null;
  sendOpenCommand: () => OpenCommandResult;
  clearUnknownTag: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

async function fetchWsTicket(signal: AbortSignal): Promise<string | null> {
  try {
    const response = await api.post<{ ticket?: string }>("/auth/ws-ticket", undefined, { signal });
    return response.ticket ?? null;
  } catch {
    return null;
  }
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const lastOpenRef = useRef(0);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [hardwareOnline, setHardwareOnline] = useState(false);
  const [latestTemperature, setLatestTemperature] = useState<number | null>(null);
  const [lastPongAt, setLastPongAt] = useState<number | null>(null);
  const [lastUnknownTag, setLastUnknownTag] = useState<UnknownTag | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.close();
      socketRef.current = null;
      setIsConnected(false);
      setHardwareOnline(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const connect = async () => {
      if (cancelled) {
        return;
      }

      const ticket = await fetchWsTicket(controller.signal);
      if (!ticket || cancelled) {
        if (!cancelled) {
          reconnectRef.current = window.setTimeout(connect, 3000);
        }
        return;
      }

      const base = wsUrl();
      if (!base || cancelled) {
        return;
      }

      const separator = base.includes("?") ? "&" : "?";
      const socket = new WebSocket(`${base}${separator}ticket=${encodeURIComponent(ticket)}`);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!cancelled) {
          setIsConnected(true);
        }
      };

      socket.onclose = () => {
        if (cancelled) {
          return;
        }
        setIsConnected(false);
        setHardwareOnline(false);
        reconnectRef.current = window.setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        if (!cancelled) {
          setIsConnected(false);
        }
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as {
            type?: string;
            data?: Record<string, unknown>;
            uid?: string;
            timestamp?: string;
          };

          if (message.type === "ACCESS_LOG" && message.data) {
            const entry = message.data as unknown as AccessLog;
            setLogs((previous) => {
              const deduped = previous.filter((item) => item.id !== entry.id);
              return [entry, ...deduped].slice(0, 50);
            });
            if (typeof entry.temperature === "number") {
              setLatestTemperature(entry.temperature);
            }
            if (entry.rfid_tag && entry.rfid_tag !== "MANUAL_OVERRIDE") {
              setHardwareOnline(true);
            }
          } else if (message.type === "TELEMETRY" && message.data) {
            const temp = message.data.temperature;
            if (typeof temp === "number") {
              setLatestTemperature(temp);
            }
            if (typeof message.data.online === "boolean") {
              setHardwareOnline(message.data.online);
            } else if (typeof message.data.hardware_online === "boolean") {
              setHardwareOnline(message.data.hardware_online);
            } else {
              setHardwareOnline(true);
            }
          } else if (message.type === "STATUS" && message.data) {
            const onlineFlag =
              typeof message.data.hardware_online === "boolean"
                ? message.data.hardware_online
                : typeof message.data.online === "boolean"
                  ? message.data.online
                  : typeof message.data.connected === "boolean"
                    ? message.data.connected
                    : message.data.status === "offline"
                      ? false
                      : true;
            setHardwareOnline(onlineFlag);
            if (typeof message.data.temperature === "number") {
              setLatestTemperature(message.data.temperature);
            }
          } else if (message.type === "PONG") {
            setLastPongAt(Date.now());
            if (typeof message.data?.hardware_online === "boolean") {
              setHardwareOnline(message.data.hardware_online);
            } else if (typeof message.data?.online === "boolean") {
              setHardwareOnline(message.data.online);
            }
          } else if (message.type === "UNKNOWN_TAG") {
            const uid = message.uid ?? (typeof message.data?.uid === "string" ? message.data.uid : undefined);
            if (uid) {
              setLastUnknownTag({ uid, timestamp: message.timestamp });
              setHardwareOnline(true);
            }
          }
        } catch {
          // Ignore non-JSON heartbeat frames.
        }
      };
    };

    void connect();

    return () => {
      cancelled = true;
      controller.abort();
      if (reconnectRef.current) {
        window.clearTimeout(reconnectRef.current);
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [isAuthenticated]);

  const sendOpenCommand = useCallback((): OpenCommandResult => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      return "disconnected";
    }
    const now = Date.now();
    if (now - lastOpenRef.current < 2000) {
      return "cooldown";
    }
    lastOpenRef.current = now;
    socketRef.current.send(JSON.stringify({ cmd: "OPEN" }));
    return "sent";
  }, []);

  const clearUnknownTag = useCallback(() => setLastUnknownTag(null), []);

  const value = useMemo<WebSocketContextValue>(
    () => ({
      logs,
      isConnected,
      hardwareOnline,
      latestTemperature,
      lastPongAt,
      lastUnknownTag,
      sendOpenCommand,
      clearUnknownTag
    }),
    [clearUnknownTag, hardwareOnline, isConnected, lastPongAt, lastUnknownTag, latestTemperature, logs, sendOpenCommand]
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useDoorWebSocket() {
  const value = useContext(WebSocketContext);
  if (!value) {
    throw new Error("useDoorWebSocket must be used inside WebSocketProvider");
  }
  return value;
}
