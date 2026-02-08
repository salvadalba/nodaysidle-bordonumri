"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  WS_URL_GETTER,
  getHealth,
  getConfig,
  getChannels,
  getAudit,
  type GatewayHealth,
  type GatewayConfig,
  type ChannelInfo,
  type AuditEntry,
  type AgentEvent,
} from "@/lib/api";

interface GatewayState {
  health: GatewayHealth | null;
  config: GatewayConfig | null;
  channels: ChannelInfo[];
  audit: AuditEntry[];
  events: AgentEvent[];
  connected: boolean;
  loading: boolean;
  error: string | null;
}

export function useGateway() {
  const [state, setState] = useState<GatewayState>({
    health: null,
    config: null,
    channels: [],
    audit: [],
    events: [],
    connected: false,
    loading: true,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [health, config, channels, audit] = await Promise.all([
        getHealth(),
        getConfig(),
        getChannels(),
        getAudit(100),
      ]);
      setState((prev) => ({
        ...prev,
        health,
        config,
        channels,
        audit,
        loading: false,
        error: null,
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Failed to connect to gateway",
      }));
    }
  }, []);

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL_GETTER());
      wsRef.current = ws;

      ws.onopen = () => {
        setState((prev) => ({ ...prev, connected: true, error: null }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as AgentEvent;
          setState((prev) => ({
            ...prev,
            events: [data, ...prev.events].slice(0, 200),
          }));
        } catch {
          // Ignore invalid messages
        }
      };

      ws.onclose = () => {
        setState((prev) => ({ ...prev, connected: false }));
        // Reconnect after 3s
        reconnectTimer.current = setTimeout(connectWs, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket not available
      setState((prev) => ({ ...prev, connected: false }));
    }
  }, []);

  useEffect(() => {
    refresh();
    connectWs();

    // Poll REST API every 15s
    const pollInterval = setInterval(refresh, 15000);

    // Ping WebSocket every 30s
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(pingInterval);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [refresh, connectWs]);

  return { ...state, refresh };
}
