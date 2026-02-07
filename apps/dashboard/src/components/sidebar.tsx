"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "◆" },
  { href: "/audit", label: "Audit Log", icon: "◈" },
  { href: "/settings", label: "Settings", icon: "◎" },
];

export function Sidebar({ connected }: { connected: boolean }) {
  const pathname = usePathname();

  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: "240px",
        display: "flex",
        flexDirection: "column",
        padding: "var(--space-xl) var(--space-lg)",
        background: "linear-gradient(180deg, rgba(20, 22, 26, 0.95) 0%, rgba(10, 11, 13, 0.98) 100%)",
        borderRight: "var(--glass-border)",
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          marginBottom: "var(--space-2xl)",
          paddingLeft: "var(--space-xs)",
        }}
      >
        <motion.div
          className={connected ? "agent-active" : ""}
          style={{
            width: 10,
            height: 10,
            borderRadius: "var(--radius-full)",
            background: connected
              ? "var(--color-accent-primary)"
              : "var(--color-text-tertiary)",
          }}
          animate={
            connected
              ? { scale: [1, 1.2, 1] }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1.125rem",
            background:
              "linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-accent-primary) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          AgentPilot
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                padding: "var(--space-sm) var(--space-md)",
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-body)",
                fontSize: "0.875rem",
                fontWeight: isActive ? 500 : 400,
                color: isActive
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
                background: isActive
                  ? "var(--color-glass-overlay)"
                  : "transparent",
                border: isActive ? "var(--glass-border)" : "1px solid transparent",
                textDecoration: "none",
                transition: "var(--transition-fast)",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: "0.75rem", opacity: isActive ? 1 : 0.5 }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom status */}
      <div
        style={{
          marginTop: "auto",
          padding: "var(--space-md)",
          borderRadius: "var(--radius-sm)",
          background: "var(--color-glass-overlay)",
          border: "var(--glass-border)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.6875rem",
            color: "var(--color-text-tertiary)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-xs)",
          }}
        >
          <span>v0.1.0</span>
          <span
            style={{
              color: connected
                ? "var(--color-accent-secondary)"
                : "var(--color-accent-primary)",
            }}
          >
            {connected ? "● connected" : "○ disconnected"}
          </span>
        </div>
      </div>
    </aside>
  );
}
