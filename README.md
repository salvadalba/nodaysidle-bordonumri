<p align="center">
  <br />
  <strong style="font-size: 2rem;">AgentPilot</strong>
  <br />
  <em>The AI that actually does things.</em>
  <br />
  <br />
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> &middot;
  <a href="#features">Features</a> &middot;
  <a href="#architecture">Architecture</a> &middot;
  <a href="#configuration">Configuration</a> &middot;
  <a href="#development">Development</a>
</p>

---

AgentPilot is a self-hosted personal AI assistant that connects to your messaging apps and **takes real actions** on your behalf. Send a message on Telegram, Discord, or SimpleX &mdash; and your agent browses the web, manages files, runs shell commands, sends emails, and takes notes.

Built with security-first design: a 5-level permission guard, per-channel scoping, destructive action confirmations, and a full audit trail of everything the agent does.

## Features

**Chat Channels**
- Telegram via grammY
- Discord via discord.js
- SimpleX via CLI bridge

**AI Providers**
- Anthropic Claude (primary)
- Google Gemini (secondary)
- Tool-calling agent loop with up to 10 iterations per task

**Action Workers**
- Web browsing &mdash; Playwright-powered page visits and DuckDuckGo search
- File management &mdash; CRUD with path traversal protection
- Shell commands &mdash; Real execution with dangerous command blocking
- Email &mdash; SMTP/IMAP with confirmation-required sends
- Notes &mdash; Create, append, read, list, and search markdown notes

**Security**
- 5-level permission system: ReadOnly, Communicate, Modify, Execute, Admin
- Per-channel, per-user permission scoping
- Destructive action confirmation via chat
- Full audit log of every action, input, output, and permission check

**Dashboard**
- Glassmorphism UI (Warm Glass Laboratory theme)
- Real-time WebSocket activity feed
- System status overview with live channel/AI status
- Expandable audit log viewer
- Settings page with configuration overview
- Framer Motion animations throughout

## Quickstart

```bash
# Clone and setup
git clone https://github.com/salvadalba/nodaysidle-bordonumri.git agentpilot
cd agentpilot
./scripts/setup.sh

# Add your API key
nano ~/.agentpilot/config.json

# Start everything
pnpm dev
```

The gateway runs on `http://localhost:3100` and the dashboard on `http://localhost:3000`.

## Configuration

Edit `~/.agentpilot/config.json`:

```json
{
  "ai": {
    "primary": "anthropic",
    "anthropicApiKey": "sk-ant-...",
    "geminiApiKey": "AIza..."
  },
  "channels": {
    "telegram": { "botToken": "123456:ABC..." },
    "discord": { "botToken": "MTIz..." },
    "simplex": { "cliPath": "/usr/local/bin/simplex-chat" }
  },
  "permissions": {
    "defaultLevel": 0,
    "channelOverrides": {}
  },
  "server": {
    "port": 3100,
    "host": "127.0.0.1",
    "dashboardPort": 3000
  }
}
```

**Permission levels:**

| Level | Name | Can Do |
|-------|------|--------|
| 0 | ReadOnly | Browse web, search |
| 1 | Communicate | Send emails, messages |
| 2 | Modify | Create/edit/delete files and notes |
| 3 | Execute | Run shell commands |
| 4 | Admin | Everything |

## Architecture

```
agentpilot/
  apps/
    gateway/          Fastify server &mdash; routes messages through the agent engine
    dashboard/        Next.js 15 &mdash; glassmorphism control panel
  packages/
    core/             Types, config, errors
    db/               SQLite + Drizzle ORM (sessions, messages, permissions, audit)
    ai/               Anthropic + Gemini adapters with tool-calling support
    permissions/      Permission guard with per-channel scoping
    actions/          Workers: browser, email, files, notes, shell
    channels/         Telegram, Discord, SimpleX adapters
```

**Message flow:**

```
User (Telegram/Discord/SimpleX)
  -> Channel Adapter
    -> Agent Engine
      -> AI Provider (Claude/Gemini)
        -> Tool Call?
          -> Permission Guard (check + confirm)
            -> Action Worker (execute)
              -> Audit Log
        -> Response back to user
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js 22+, TypeScript |
| Monorepo | Turborepo + pnpm workspaces |
| Server | Fastify 5 with WebSocket |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| AI | @anthropic-ai/sdk, @google/generative-ai |
| Chat | grammY (Telegram), discord.js, simplex-chat CLI |
| Browser | Playwright |
| Dashboard | Next.js 15, React 19, Framer Motion 12 |
| Testing | Vitest (119 tests across 7 packages) |

## Development

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm turbo test:unit

# Start gateway + dashboard in dev mode
pnpm dev

# Build everything
pnpm build
```

### Project Structure

- **`packages/core`** &mdash; Shared types (`ChannelMessage`, `AIResponse`, `ActionRequest`, etc.), config loader, error classes
- **`packages/db`** &mdash; Database schema, queries, migrations. SQLite with WAL mode and foreign keys
- **`packages/ai`** &mdash; Provider adapters that normalize Anthropic and Gemini into a common interface with tool-calling support
- **`packages/permissions`** &mdash; The permission guard that checks action requests against per-channel/user permission levels
- **`packages/actions`** &mdash; Five action workers that actually do things: browse, email, files, notes, shell
- **`packages/channels`** &mdash; Adapters that normalize Telegram, Discord, and SimpleX into a common message interface
- **`apps/gateway`** &mdash; The brain. Routes incoming chat messages through the agent engine, serves REST API and WebSocket
- **`apps/dashboard`** &mdash; Next.js dashboard with real-time activity feed, audit log, and system settings

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Gateway status, version, channels, AI readiness |
| GET | `/api/config` | Config overview (no secrets) |
| GET | `/api/channels` | Connected channel adapters |
| GET | `/api/audit?limit=N` | Audit log entries |
| WS | `/ws` | Real-time agent events (thinking, action, response, error) |

## License

MIT

---

<p align="center">
  <sub>Built with security-first design. Every action logged. Every permission checked.</sub>
</p>
