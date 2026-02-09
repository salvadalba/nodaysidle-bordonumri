<p align="center">
  <img src="assets/banner.svg" alt="AgentPilot" width="100%" />
</p>

<p align="center">
  <strong>Self-hosted AI assistant that connects to your messaging apps and takes real actions on your machine.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-22+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Tests-133_passing-10b981?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/AI-Claude_|_Gemini_|_OpenRouter-e94560?style=flat-square" alt="AI Providers" />
  <img src="https://img.shields.io/badge/License-MIT-f59e0b?style=flat-square" alt="License" />
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> &nbsp;&bull;&nbsp;
  <a href="#what-can-it-do">What Can It Do</a> &nbsp;&bull;&nbsp;
  <a href="#skills">Skills</a> &nbsp;&bull;&nbsp;
  <a href="#scheduler">Scheduler</a> &nbsp;&bull;&nbsp;
  <a href="#architecture">Architecture</a> &nbsp;&bull;&nbsp;
  <a href="#dashboard">Dashboard</a>
</p>

---

## Why AgentPilot?

Most AI chatbots just talk. AgentPilot **does things**.

Send a message on Telegram and your agent will browse the web, manage files, run shell commands, check the weather, track your git activity, monitor your system &mdash; all from your own machine, under your control.

No cloud lock-in. No subscription fees beyond your AI API key. No data leaving your machine unless you tell it to.

| Feature | AgentPilot | Cloud AI Assistants |
|---------|:---:|:---:|
| Runs on your machine | :white_check_mark: | :x: |
| Full filesystem access | :white_check_mark: | :x: |
| Shell command execution | :white_check_mark: | :x: |
| Multi-channel (Telegram, Discord, SimpleX) | :white_check_mark: | :x: |
| Drop-in skills (teach it anything) | :white_check_mark: | :x: |
| Cron scheduler (automate tasks) | :white_check_mark: | :x: |
| Permission system with audit trail | :white_check_mark: | :x: |
| Encrypted config (API keys at rest) | :white_check_mark: | :x: |
| No monthly subscription | :white_check_mark: | :x: |
| Open source | :white_check_mark: | :x: |

## Quickstart

```bash
# Clone
git clone https://github.com/salvadalba/nodaysidle-bordonumri.git agentpilot
cd agentpilot

# Install dependencies
pnpm install

# Run setup (creates config, database)
./scripts/setup.sh

# Add your API key + Telegram bot token
nano ~/.agentpilot/config.json

# Start the gateway
pnpm dev
```

The gateway starts on `http://localhost:3100`. Send a message to your Telegram bot and watch it work.

> **Need a step-by-step walkthrough?** Check the [User Guide](docs/USER_GUIDE.md).

## What Can It Do

### :globe_with_meridians: Web Browsing & Research
```
"Search for the latest Node.js release"
"Browse https://news.ycombinator.com and summarize the top stories"
"Research the best pizza places in Ljubljana"
```

### :file_folder: File Management
```
"Create a file called todo.txt with my shopping list"
"Read the contents of ~/.zshrc"
"Organize my Downloads folder by file type"
```

### :computer: Shell Commands
```
"How much disk space do I have left?"
"What's eating my CPU right now?"
"List all running Docker containers"
```

### :memo: Notes & Time Tracking
```
"Create a note called ideas with my app concepts"
"Start a timer for coding"
"How many hours did I work this week?"
```

### :email: Email
```
"Send an email to bob@example.com about the meeting tomorrow"
```
> Destructive actions require confirmation &mdash; the bot will ask you to reply "yes" first.

### :clock3: Scheduled Automation
```
"Every day at 8am, give me a weather forecast for my city"
"Schedule a daily summary of my git commits at 6pm"
"List my scheduled tasks"
```

## Skills

Skills are the secret sauce. Drop a `.md` file into `~/.agentpilot/skills/` and the bot instantly learns new capabilities &mdash; no restart needed.

```
~/.agentpilot/skills/
  weather.md          # Weather via wttr.in
  hour-meter.md       # Time tracking with notes
  research-agent.md   # Multi-source web research
  git-reporter.md     # Git activity summaries
  backup-monitor.md   # Disk health & Time Machine
  process-manager.md  # CPU/memory monitoring
  daily-digest.md     # Morning briefing automation
  web-archiver.md     # Save web pages as markdown
  file-organizer.md   # Sort folders by file type
  ...and any custom skill you write
```

### Writing Your Own Skill

A skill is just a markdown file that tells the AI how to handle specific requests:

```markdown
# My Custom Skill

When the user asks about "stock prices", "market update":

## Steps
1. Search the web: web_search("AAPL stock price today")
2. Fetch the result: browse_web(url)
3. Summarize the key data

## Output format
Stock: [TICKER] - $[PRICE] ([CHANGE]%)
```

Drop it in the skills folder and it works on the next message. Skills are cached in memory and auto-reload via file watcher when you add, edit, or remove them.

## Scheduler

Schedule recurring tasks with natural language. Under the hood, it uses cron expressions, but the AI handles the translation for you.

```
You: "Remind me to stretch every 2 hours during work"
Bot: Done! Scheduled "stretch-reminder" with cron 0 9-17/2 * * 1-5

You: "List my scheduled tasks"
Bot: 1. stretch-reminder - 0 9-17/2 * * 1-5 (next: Mon 09:00)
     2. daily-weather    - 0 8 * * *       (next: tomorrow 08:00)

You: "Cancel the stretch reminder"
Bot: Cancelled stretch-reminder.
```

When a scheduled task fires, the agent runs the task prompt autonomously and sends the result to your Telegram.

## Architecture

```
                    +------------------+
                    |   You (Phone)    |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
        +-----+----+  +-----+----+  +------+-----+
        | Telegram |  | Discord  |  |  SimpleX   |
        +-----+----+  +-----+----+  +------+-----+
              |              |              |
              +--------------+--------------+
                             |
                    +--------v---------+
                    |  Gateway Server  |
                    |  (Fastify 5)     |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
     +--------v---------+         +--------v---------+
     |  Agent Engine    |         |    Scheduler     |
     |  (Tool Loop)     |         |   (node-cron)    |
     +--------+---------+         +------------------+
              |
     +--------v---------+
     |   Skills Cache   |
     |  (auto-reload)   |
     +--------+---------+
              |
   +----------+----------+----------+
   |          |          |          |
+--v---+ +---v----+ +---v----+ +---v------+
| AI   | | Perms  | | Action | | Database |
|Claude| | Guard  | |Workers | | (SQLite) |
|Gemini| |        | |        | |          |
+------+ +--------+ +---+----+ +----------+
                         |
        +-------+--------+--------+-------+-------+
        |       |        |        |       |       |
      Shell   Files   Browser   Notes   Email  Scheduler
```

**Turborepo monorepo** with 6 packages + 2 apps:

| Package | Purpose |
|---------|---------|
| `packages/core` | Shared types, config loader, encryption, validation |
| `packages/db` | SQLite + Drizzle ORM (sessions, messages, scheduled tasks, audit) |
| `packages/ai` | Claude, Gemini, and OpenRouter adapters with tool-calling |
| `packages/permissions` | 5-level permission guard with per-channel scoping |
| `packages/actions` | Action workers: browser, email, files, notes, shell, scheduler |
| `packages/channels` | Telegram (grammY), Discord (discord.js), SimpleX adapters |
| `apps/gateway` | Fastify server, agent engine, scheduler, REST API, WebSocket |
| `apps/dashboard` | Next.js 15 glassmorphism control panel |

## Security

AgentPilot takes security seriously for a self-hosted tool with shell access:

### Permission System

5-level access control per channel and per user:

| Level | Name | Capabilities |
|:-----:|------|-------------|
| 0 | ReadOnly | Browse web, search, read files |
| 1 | Communicate | Send emails and messages |
| 2 | Modify | Create, edit, delete files and notes |
| 3 | Execute | Run shell commands |
| 4 | Admin | Full access to everything |

### Additional Safeguards

- **Confirmation prompts** &mdash; Destructive actions require you to reply "yes" before executing
- **Config encryption** &mdash; API keys and bot tokens are encrypted at rest with AES-256-GCM using a machine-specific derived key
- **Input validation** &mdash; URL protocol checks, email format validation, cron expression verification
- **Full audit trail** &mdash; Every action, input, output, and permission check is logged to SQLite
- **Per-channel scoping** &mdash; Telegram can have Execute while Discord stays ReadOnly
- **Per-user overrides** &mdash; Give specific users higher access within a channel

## Dashboard

The web dashboard provides real-time monitoring of your agent:

- **Live activity feed** via WebSocket &mdash; see thinking, actions, and responses in real-time
- **Audit log viewer** &mdash; browse the full history of everything the agent has done
- **System status** &mdash; channel connections, AI provider status, database health
- **Settings** &mdash; configure gateway URL, view current config

> **Hosted dashboard:** [dashboard-nodaysidle.vercel.app](https://dashboard-nodaysidle.vercel.app) (connect it to your local gateway via Settings)

## Configuration

Edit `~/.agentpilot/config.json`:

```jsonc
{
  "ai": {
    "primary": "anthropic",              // "anthropic", "gemini", or "openrouter"
    "anthropicApiKey": "sk-ant-...",
    "geminiApiKey": "AIza...",           // optional
    "openRouterApiKey": "sk-or-...",     // optional
    "maxIterations": 10                  // max tool-call loops per message
  },
  "channels": {
    "telegram": { "botToken": "123456:ABC..." },
    "discord": { "botToken": "MTIz..." },
    "simplex": { "cliPath": "/usr/local/bin/simplex-chat" }
  },
  "permissions": {
    "defaultLevel": 3,                   // 0-4, see table above
    "channelOverrides": {}
  },
  "server": {
    "port": 3100,
    "host": "127.0.0.1"
  }
}
```

> API keys are automatically encrypted on first load using AES-256-GCM with a machine-specific key.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22+, TypeScript 5.7 |
| Monorepo | Turborepo + pnpm workspaces |
| Server | Fastify 5 with WebSocket |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| AI | Claude Haiku 3.5, Gemini Flash, OpenRouter (any model) |
| Channels | grammY, discord.js, simplex-chat CLI |
| Scheduler | node-cron |
| Browser | Playwright |
| Dashboard | Next.js 15, React 19, Framer Motion |
| Testing | Vitest &mdash; 133 tests across 20 test files |

## Development

```bash
pnpm install          # Install dependencies
pnpm turbo test:unit  # Run all 133 tests
pnpm dev              # Start gateway + dashboard
pnpm build            # Production build
```

### Adding a New Action Worker

1. Create `packages/actions/src/myworker.ts` implementing the `ActionWorker` interface
2. Register it in `apps/gateway/src/agent.ts`
3. Add the action type to `packages/core/src/types.ts`
4. Set the permission level in `packages/permissions/src/guard.ts`

### Adding a New Channel

1. Create an adapter in `packages/channels/src/` implementing the `ChannelAdapter` interface
2. Register it in `apps/gateway/src/index.ts`

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Gateway status, version, channels |
| `GET` | `/api/config` | Config overview (secrets redacted) |
| `GET` | `/api/channels` | Connected channel adapters |
| `GET` | `/api/audit?limit=N` | Audit log entries |
| `WS` | `/ws` | Real-time events (thinking, action, response, error) |

## License

MIT

---

<p align="center">
  <sub>Every action logged. Every permission checked. Your machine, your rules.</sub>
</p>
