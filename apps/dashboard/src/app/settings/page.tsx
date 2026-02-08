"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { GlassCard } from "@/components/glass-card";
import { useGateway } from "@/hooks/use-gateway";
import { getStoredGatewayUrl, setGatewayUrl } from "@/lib/api";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const { config, health, channels, connected, loading, refresh } = useGateway();
  const [gatewayInput, setGatewayInput] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setGatewayInput(getStoredGatewayUrl());
  }, []);

  const handleSaveGateway = () => {
    setGatewayUrl(gatewayInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Reload to reconnect with new URL
    window.location.reload();
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar connected={connected} />

      <main
        style={{
          flex: 1,
          marginLeft: 240,
          padding: "var(--space-xl) var(--space-2xl)",
          maxWidth: 900,
        }}
      >
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
            Settings
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.875rem",
              color: "var(--color-text-tertiary)",
            }}
          >
            Configure your AgentPilot instance
          </p>
        </motion.div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-lg)",
          }}
        >
          {/* Gateway Connection */}
          <GlassCard delay={0} style={{ padding: "var(--space-lg)" }}>
            <div style={{ marginBottom: "var(--space-md)" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.6875rem",
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                Gateway Connection
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                marginBottom: "var(--space-sm)",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: connected ? "#4ade80" : "#ef4444",
                  boxShadow: connected
                    ? "0 0 8px rgba(74, 222, 128, 0.5)"
                    : "0 0 8px rgba(239, 68, 68, 0.5)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.8125rem",
                  color: connected
                    ? "var(--color-text-primary)"
                    : "var(--color-accent-amber)",
                }}
              >
                {connected ? "Connected to gateway" : "Not connected -- make sure gateway is running"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "var(--space-sm)" }}>
              <input
                type="text"
                value={gatewayInput}
                onChange={(e) => setGatewayInput(e.target.value)}
                placeholder="http://localhost:3100"
                style={{
                  flex: 1,
                  padding: "var(--space-sm) var(--space-md)",
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid rgba(232, 220, 196, 0.1)",
                  borderRadius: 8,
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8125rem",
                  outline: "none",
                }}
              />
              <button
                onClick={handleSaveGateway}
                style={{
                  padding: "var(--space-sm) var(--space-lg)",
                  background: saved
                    ? "rgba(74, 222, 128, 0.15)"
                    : "rgba(232, 220, 196, 0.08)",
                  border: saved
                    ? "1px solid rgba(74, 222, 128, 0.3)"
                    : "1px solid rgba(232, 220, 196, 0.12)",
                  borderRadius: 8,
                  color: saved ? "#4ade80" : "var(--color-text-primary)",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {saved ? "Saved" : "Save & Reconnect"}
              </button>
            </div>
            {!connected && (
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.75rem",
                  color: "var(--color-text-tertiary)",
                  marginTop: "var(--space-sm)",
                  lineHeight: 1.5,
                }}
              >
                Enter your gateway URL (e.g. http://localhost:3100) and click Save.
                The gateway must be running on your machine.
              </p>
            )}
          </GlassCard>

          {/* AI Provider */}
          <SettingsSection title="AI Provider" delay={0.05}>
            <SettingsRow
              label="Primary Provider"
              value={config?.ai.primary ?? "not configured"}
            />
            <SettingsRow
              label="Anthropic API Key"
              value={config?.ai.hasAnthropicKey ? "configured" : "not set"}
              status={config?.ai.hasAnthropicKey ? "ok" : "warn"}
            />
            <SettingsRow
              label="Gemini API Key"
              value={config?.ai.hasGeminiKey ? "configured" : "not set"}
              status={config?.ai.hasGeminiKey ? "ok" : "info"}
            />
            <SettingsRow
              label="Agent Status"
              value={health?.agentReady ? "ready" : "not ready"}
              status={health?.agentReady ? "ok" : "warn"}
            />
          </SettingsSection>

          {/* Channels */}
          <SettingsSection title="Chat Channels" delay={0.1}>
            <SettingsRow
              label="Telegram"
              value={config?.channels.telegram ? "configured" : "not set"}
              status={config?.channels.telegram ? "ok" : "info"}
            />
            <SettingsRow
              label="Discord"
              value={config?.channels.discord ? "configured" : "not set"}
              status={config?.channels.discord ? "ok" : "info"}
            />
            <SettingsRow
              label="SimpleX"
              value={config?.channels.simplex ? "configured" : "not set"}
              status={config?.channels.simplex ? "ok" : "info"}
            />
          </SettingsSection>

          {/* Server */}
          <SettingsSection title="Server" delay={0.15}>
            <SettingsRow
              label="Gateway Port"
              value={String(config?.server.port ?? 3100)}
            />
            <SettingsRow
              label="Gateway Host"
              value={config?.server.host ?? "127.0.0.1"}
            />
            <SettingsRow
              label="Dashboard Port"
              value={String(config?.server.dashboardPort ?? 3000)}
            />
            <SettingsRow
              label="Version"
              value={health?.version ?? "unknown"}
            />
          </SettingsSection>

          {/* Config file hint */}
          <GlassCard delay={0.2} style={{ padding: "var(--space-lg)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--color-text-tertiary)",
                lineHeight: 1.8,
              }}
            >
              <span style={{ color: "var(--color-text-secondary)" }}>
                Configuration file:
              </span>{" "}
              ~/.agentpilot/config.json
              <br />
              <span style={{ color: "var(--color-text-secondary)" }}>
                Database:
              </span>{" "}
              ~/.agentpilot/agentpilot.db
              <br />
              <span style={{ color: "var(--color-text-secondary)" }}>
                Notes:
              </span>{" "}
              ~/.agentpilot/notes/
              <br />
              <br />
              <span style={{ color: "var(--color-accent-primary)" }}>
                Edit config.json to update API keys and channel tokens.
                <br />
                Restart the gateway after changes.
              </span>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}

function SettingsSection({
  title,
  delay,
  children,
}: {
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <GlassCard delay={delay} style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          padding: "var(--space-md) var(--space-lg)",
          borderBottom: "1px solid rgba(232, 220, 196, 0.06)",
          background: "rgba(232, 220, 196, 0.03)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.6875rem",
            color: "var(--color-text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          {title}
        </span>
      </div>
      <div>{children}</div>
    </GlassCard>
  );
}

function SettingsRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: "ok" | "warn" | "info";
}) {
  const statusColors = {
    ok: "#4ade80",
    warn: "var(--color-accent-amber)",
    info: "var(--color-text-tertiary)",
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "var(--space-md) var(--space-lg)",
        borderBottom: "1px solid rgba(232, 220, 196, 0.04)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.875rem",
          color: "var(--color-text-primary)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.75rem",
          color: status ? statusColors[status] : "var(--color-text-secondary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
