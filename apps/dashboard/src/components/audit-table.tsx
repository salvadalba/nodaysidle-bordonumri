"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./glass-card";
import type { AuditEntry } from "@/lib/api";

const PERM_LABELS = ["Read Only", "Communicate", "Modify", "Execute", "Admin"];
const ACTION_COLORS: Record<string, string> = {
  browser: "#60a5fa",
  email: "#a78bfa",
  files: "#34d399",
  notes: "#fbbf24",
  shell: "#f87171",
};

interface AuditTableProps {
  entries: AuditEntry[];
  loading: boolean;
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const color = ACTION_COLORS[entry.actionType] || "var(--color-text-secondary)";
  const time = new Date(entry.createdAt).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{ cursor: "pointer" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "100px 90px 1fr 100px 80px",
          gap: "var(--space-sm)",
          padding: "var(--space-sm) var(--space-md)",
          alignItems: "center",
          borderBottom: "1px solid rgba(232, 220, 196, 0.04)",
          transition: "var(--transition-fast)",
          background: expanded ? "rgba(232, 220, 196, 0.03)" : "transparent",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.6875rem",
            color: "var(--color-text-tertiary)",
          }}
        >
          {time}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.6875rem",
            color,
            background: `${color}15`,
            padding: "2px 8px",
            borderRadius: "var(--radius-full)",
            border: `1px solid ${color}25`,
            textAlign: "center",
          }}
        >
          {entry.actionType}
        </span>
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.8125rem",
            color: "var(--color-text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {entry.operation}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.625rem",
            color: "var(--color-text-tertiary)",
          }}
        >
          {PERM_LABELS[entry.permissionLevel] ?? `L${entry.permissionLevel}`}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.6875rem",
            color: entry.confirmed ? "#4ade80" : "var(--color-accent-amber)",
          }}
        >
          {entry.confirmed ? "done" : entry.confirmationRequired ? "pending" : "done"}
        </span>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "var(--space-md) var(--space-lg)",
                background: "rgba(232, 220, 196, 0.02)",
                borderBottom: "1px solid rgba(232, 220, 196, 0.06)",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
                <div>
                  <Label>Input</Label>
                  <CodeBlock>{JSON.stringify(entry.input, null, 2)}</CodeBlock>
                </div>
                <div>
                  <Label>Output</Label>
                  <CodeBlock>{JSON.stringify(entry.output, null, 2)}</CodeBlock>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-lg)",
                  marginTop: "var(--space-md)",
                }}
              >
                <Detail label="Channel" value={`${entry.channelType}/${entry.channelId}`} />
                <Detail label="User" value={entry.userId} />
                <Detail label="Session" value={entry.sessionId?.slice(0, 8) ?? "none"} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Label({ children }: { children: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.625rem",
        color: "var(--color-text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: 4,
        display: "block",
      }}
    >
      {children}
    </span>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.6875rem",
        color: "var(--color-text-secondary)",
        background: "rgba(10, 11, 13, 0.5)",
        padding: "var(--space-sm) var(--space-md)",
        borderRadius: "var(--radius-sm)",
        overflow: "auto",
        maxHeight: 160,
        border: "1px solid rgba(232, 220, 196, 0.06)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
    >
      {children}
    </pre>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.75rem",
          color: "var(--color-text-secondary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function AuditTable({ entries, loading }: AuditTableProps) {
  if (loading) {
    return (
      <GlassCard>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton" style={{ height: 36 }} />
          ))}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard delay={0.1} style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "100px 90px 1fr 100px 80px",
          gap: "var(--space-sm)",
          padding: "var(--space-md) var(--space-md)",
          borderBottom: "1px solid rgba(232, 220, 196, 0.08)",
          background: "rgba(232, 220, 196, 0.03)",
        }}
      >
        {["Time", "Type", "Operation", "Permission", "Status"].map((h) => (
          <span
            key={h}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.625rem",
              color: "var(--color-text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {entries.length === 0 ? (
        <div
          style={{
            padding: "var(--space-2xl)",
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "0.8125rem",
            color: "var(--color-text-tertiary)",
          }}
        >
          No audit entries yet. Actions will appear here once the agent starts working.
        </div>
      ) : (
        entries.map((entry) => <AuditRow key={entry.id} entry={entry} />)
      )}
    </GlassCard>
  );
}
