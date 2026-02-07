"use client";

import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./glass-card";
import type { AgentEvent } from "@/lib/api";

interface ActivityFeedProps {
  events: AgentEvent[];
}

const EVENT_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  thinking: { icon: "◌", color: "var(--color-accent-amber)", label: "Thinking" },
  action: { icon: "▸", color: "var(--color-accent-primary)", label: "Action" },
  response: { icon: "◆", color: "var(--color-accent-peach)", label: "Response" },
  error: { icon: "✕", color: "#ef4444", label: "Error" },
  confirmation: { icon: "?", color: "var(--color-accent-amber)", label: "Confirm" },
  connected: { icon: "●", color: "#4ade80", label: "Connected" },
};

function EventItem({ event }: { event: AgentEvent }) {
  const cfg = EVENT_CONFIG[event.type] || EVENT_CONFIG.action;
  const time = event.timestamp
    ? new Date(event.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

  let detail = "";
  if (event.type === "thinking") {
    detail = String(event.data?.message ?? "").slice(0, 60);
  } else if (event.type === "action") {
    detail = `${event.data?.tool ?? "unknown"}`;
  } else if (event.type === "response") {
    detail = String(event.data?.content ?? "").slice(0, 80);
  } else if (event.type === "error") {
    detail = String(event.data?.error ?? "Unknown error").slice(0, 80);
  } else if (event.type === "confirmation") {
    detail = String(event.data?.message ?? "").slice(0, 80);
  } else if (event.type === "connected") {
    detail = `Channels: ${(event.channels ?? []).join(", ") || "none"}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10, height: 0 }}
      animate={{ opacity: 1, x: 0, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: "flex",
        gap: "var(--space-sm)",
        padding: "var(--space-sm) 0",
        borderBottom: "1px solid rgba(232, 220, 196, 0.04)",
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          color: cfg.color,
          fontFamily: "var(--font-mono)",
          fontSize: "0.75rem",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {cfg.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.6875rem",
              color: cfg.color,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {cfg.label}
            {event.channelType ? ` · ${event.channelType}` : ""}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.625rem",
              color: "var(--color-text-tertiary)",
            }}
          >
            {time}
          </span>
        </div>
        {detail && (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.8125rem",
              color: "var(--color-text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {detail}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <GlassCard delay={0.1} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <div
            style={{
              width: 3,
              height: 16,
              borderRadius: 2,
              background: "var(--color-accent-amber)",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.6875rem",
              color: "var(--color-text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            Activity Feed
          </span>
        </div>
        {events.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div className="thinking-blob" />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.625rem",
                color: "var(--color-text-tertiary)",
              }}
            >
              {events.length} events
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          minHeight: 200,
          maxHeight: 500,
        }}
      >
        {events.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "var(--space-2xl)",
              gap: "var(--space-md)",
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-full)",
                border: "2px solid rgba(232, 220, 196, 0.1)",
                borderTopColor: "var(--color-accent-primary)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--color-text-tertiary)",
              }}
            >
              Waiting for agent activity...
            </span>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {events.slice(0, 50).map((event, i) => (
              <EventItem key={`${event.type}-${i}-${event.timestamp}`} event={event} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </GlassCard>
  );
}
