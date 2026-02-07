"use client";

import { Sidebar } from "@/components/sidebar";
import { StatusPanel } from "@/components/status-panel";
import { ActivityFeed } from "@/components/activity-feed";
import { GlassCard } from "@/components/glass-card";
import { useGateway } from "@/hooks/use-gateway";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { health, config, channels, events, connected, loading, error } = useGateway();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar connected={connected} />

      <main
        style={{
          flex: 1,
          marginLeft: 240,
          padding: "var(--space-xl) var(--space-2xl)",
          maxWidth: 1200,
        }}
      >
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: "var(--space-2xl)" }}
        >
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.75rem",
              fontWeight: 600,
              marginBottom: "var(--space-xs)",
            }}
          >
            Dashboard
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.875rem",
              color: "var(--color-text-tertiary)",
            }}
          >
            Real-time view of your AgentPilot system
          </p>
        </motion.div>

        {/* Error banner */}
        {error && (
          <GlassCard
            style={{
              marginBottom: "var(--space-lg)",
              padding: "var(--space-md) var(--space-lg)",
              borderColor: "rgba(239, 68, 68, 0.3)",
              background: "rgba(239, 68, 68, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
              <span style={{ color: "#ef4444", fontSize: "0.875rem" }}>✕</span>
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.875rem",
                  color: "#fca5a5",
                }}
              >
                {error}
              </span>
            </div>
          </GlassCard>
        )}

        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "var(--space-lg)",
            marginBottom: "var(--space-xl)",
          }}
        >
          <StatCard
            label="Channels"
            value={channels.length > 0 ? String(channels.length) : "0"}
            detail={channels.map((c) => c.type).join(", ") || "none"}
            color="var(--color-accent-primary)"
            delay={0}
          />
          <StatCard
            label="AI Provider"
            value={health?.agentReady ? "Ready" : "Off"}
            detail={config?.ai.primary ?? "not set"}
            color="var(--color-accent-amber)"
            delay={0.05}
          />
          <StatCard
            label="Events"
            value={String(events.length)}
            detail="this session"
            color="var(--color-accent-secondary)"
            delay={0.1}
          />
          <StatCard
            label="Gateway"
            value={health?.status === "ok" ? "Online" : "Offline"}
            detail={health?.version ?? "---"}
            color="var(--color-accent-peach)"
            delay={0.15}
          />
        </div>

        {/* Main content */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "340px 1fr",
            gap: "var(--space-lg)",
            alignItems: "start",
          }}
        >
          <StatusPanel
            health={health}
            config={config}
            channels={channels}
            loading={loading}
          />
          <ActivityFeed events={events} />
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  color,
  delay,
}: {
  label: string;
  value: string;
  detail: string;
  color: string;
  delay: number;
}) {
  return (
    <GlassCard delay={delay}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.625rem",
          color: "var(--color-text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          display: "block",
          marginBottom: "var(--space-sm)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color,
          display: "block",
          marginBottom: 2,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.6875rem",
          color: "var(--color-text-tertiary)",
        }}
      >
        {detail}
      </span>
    </GlassCard>
  );
}
