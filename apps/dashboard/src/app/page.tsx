export default function Home() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "var(--space-xl)",
        gap: "var(--space-lg)",
      }}
    >
      <div className="page-enter" style={{ textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "3rem",
            fontWeight: 700,
            marginBottom: "var(--space-sm)",
            background:
              "linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-accent-primary) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          AgentPilot
        </h1>
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "1.125rem",
            marginBottom: "var(--space-2xl)",
          }}
        >
          The AI that actually does things.
        </p>
      </div>

      <div
        className="glass page-enter"
        style={{
          padding: "var(--space-xl)",
          maxWidth: "480px",
          width: "100%",
          animationDelay: "0.1s",
          animationFillMode: "backwards",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
            marginBottom: "var(--space-lg)",
          }}
        >
          <div className="agent-active" style={{
            width: "10px",
            height: "10px",
            borderRadius: "var(--radius-full)",
            background: "var(--color-accent-primary)",
          }} />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--space-sm)",
              color: "var(--color-text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            System Status
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <StatusRow label="Gateway" status="ready" />
          <StatusRow label="Telegram" status="disconnected" />
          <StatusRow label="Discord" status="disconnected" />
          <StatusRow label="SimpleX" status="disconnected" />
          <StatusRow label="AI Provider" status="not configured" />
        </div>
      </div>

      <div
        className="glass page-enter"
        style={{
          padding: "var(--space-xl)",
          maxWidth: "480px",
          width: "100%",
          animationDelay: "0.2s",
          animationFillMode: "backwards",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.875rem",
            color: "var(--color-text-tertiary)",
            lineHeight: 1.6,
          }}
        >
          $ agentpilot onboard
          <br />
          <span style={{ color: "var(--color-accent-primary)" }}>
            &gt; Welcome to AgentPilot v0.1.0
          </span>
          <br />
          <span style={{ color: "var(--color-text-secondary)" }}>
            &gt; Run the onboarding wizard to get started...
          </span>
        </p>
      </div>
    </main>
  );
}

function StatusRow({ label, status }: { label: string; status: string }) {
  const isActive = status === "ready" || status === "connected";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem" }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.75rem",
          color: isActive
            ? "var(--color-accent-secondary)"
            : "var(--color-text-tertiary)",
          background: isActive
            ? "rgba(26, 77, 46, 0.2)"
            : "rgba(232, 220, 196, 0.05)",
          padding: "2px 8px",
          borderRadius: "var(--radius-full)",
          border: isActive
            ? "1px solid rgba(26, 77, 46, 0.3)"
            : "1px solid rgba(232, 220, 196, 0.1)",
        }}
      >
        {status}
      </span>
    </div>
  );
}
