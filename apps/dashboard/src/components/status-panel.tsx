"use client";

import { motion } from "framer-motion";
import { GlassCard } from "./glass-card";
import type { GatewayHealth, GatewayConfig, ChannelInfo } from "@/lib/api";

interface StatusPanelProps {
  health: GatewayHealth | null;
  config: GatewayConfig | null;
  channels: ChannelInfo[];
  loading: boolean;
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <motion.div
      animate={active ? { scale: [1, 1.3, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
      style={{
        width: 8,
        height: 8,
        borderRadius: "var(--radius-full)",
        background: active ? "#4ade80" : "var(--color-text-tertiary)",
        boxShadow: active ? "0 0 8px rgba(74, 222, 128, 0.5)" : "none",
      }}
    />
  );
}

function StatusRow({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "var(--space-sm) 0",
        borderBottom: "1px solid rgba(232, 220, 196, 0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
        <StatusDot active={active} />
        <span style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem" }}>{label}</span>
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.75rem",
          color: active ? "var(--color-accent-peach)" : "var(--color-text-tertiary)",
          background: active ? "rgba(26, 77, 46, 0.15)" : "rgba(232, 220, 196, 0.04)",
          padding: "2px 10px",
          borderRadius: "var(--radius-full)",
          border: active ? "1px solid rgba(26, 77, 46, 0.25)" : "1px solid rgba(232, 220, 196, 0.08)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function StatusPanel({ health, config, channels, loading }: StatusPanelProps) {
  if (loading) {
    return (
      <GlassCard>
        <SectionHeader label="System Status" />
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 36, width: "100%" }} />
          ))}
        </div>
      </GlassCard>
    );
  }

  const gatewayOnline = health?.status === "ok";
  const aiReady = health?.agentReady ?? false;
  const aiProvider = config?.ai.primary ?? "none";

  return (
    <GlassCard delay={0.05}>
      <SectionHeader label="System Status" />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <StatusRow
          label="Gateway"
          value={gatewayOnline ? "online" : "offline"}
          active={gatewayOnline}
        />
        <StatusRow
          label="AI Provider"
          value={aiReady ? `${aiProvider} ready` : "not configured"}
          active={aiReady}
        />
        {channels.length > 0
          ? channels.map((ch) => (
              <StatusRow
                key={ch.type}
                label={ch.type.charAt(0).toUpperCase() + ch.type.slice(1)}
                value={ch.connected ? "connected" : "offline"}
                active={ch.connected}
              />
            ))
          : (
            <>
              <StatusRow label="Telegram" value="not configured" active={false} />
              <StatusRow label="Discord" value="not configured" active={false} />
              <StatusRow label="SimpleX" value="not configured" active={false} />
            </>
          )}
      </div>
    </GlassCard>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        marginBottom: "var(--space-lg)",
      }}
    >
      <div
        style={{
          width: 3,
          height: 16,
          borderRadius: 2,
          background: "var(--color-accent-primary)",
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
        {label}
      </span>
    </div>
  );
}
