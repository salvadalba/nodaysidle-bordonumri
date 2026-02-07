"use client";

import { Sidebar } from "@/components/sidebar";
import { AuditTable } from "@/components/audit-table";
import { useGateway } from "@/hooks/use-gateway";
import { motion } from "framer-motion";

export default function AuditPage() {
  const { audit, connected, loading } = useGateway();

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
            Audit Log
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.875rem",
              color: "var(--color-text-tertiary)",
            }}
          >
            Complete history of all agent actions, permissions, and confirmations
          </p>
        </motion.div>

        {/* Summary stats */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-xl)",
            marginBottom: "var(--space-xl)",
          }}
        >
          <AuditStat
            label="Total Actions"
            value={String(audit.length)}
          />
          <AuditStat
            label="Confirmed"
            value={String(audit.filter((a) => a.confirmed).length)}
          />
          <AuditStat
            label="Pending"
            value={String(audit.filter((a) => a.confirmationRequired && !a.confirmed).length)}
          />
          <AuditStat
            label="Unique Sessions"
            value={String(new Set(audit.map((a) => a.sessionId).filter(Boolean)).size)}
          />
        </div>

        <AuditTable entries={audit} loading={loading} />
      </main>
    </div>
  );
}

function AuditStat({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.625rem",
          color: "var(--color-text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          display: "block",
          marginBottom: 4,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.25rem",
          fontWeight: 600,
          color: "var(--color-text-primary)",
        }}
      >
        {value}
      </span>
    </motion.div>
  );
}
