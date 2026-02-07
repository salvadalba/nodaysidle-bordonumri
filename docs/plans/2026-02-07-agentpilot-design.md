# AgentPilot - Design Document

## Overview

AgentPilot is a personal AI assistant that connects to messaging apps and takes real actions on your behalf. It differentiates from OpenClaw through security-first architecture, a polished web dashboard, and glassmorphism "Warm Glass Laboratory" UI.

## Decisions

| Decision | Choice |
|----------|--------|
| Name | AgentPilot |
| Audience | Both devs and non-devs, prioritize non-devs |
| Chat channels | Telegram + Discord + SimpleX |
| AI providers | Anthropic Claude (primary) + Google Gemini (secondary) |
| Actions | Email, Web browsing, File management, Shell commands |
| Deployment | Self-hosted first, SaaS later |
| UI theme | Glassmorphism "Warm Glass Laboratory" |

## Architecture

Gateway + Workers architecture with a Permission Guard at the center.

```
[Telegram] ---+
[Discord]  ---+---> [Gateway API] ---> [Agent Engine] ---> [Action Workers]
[SimpleX]  ---+         |                                        |
                   [Web Dashboard]                       [Permission Guard]
                        |                                        |
                   [Auth + DB]                       [Email|Browser|FS|Shell]
```

- **Gateway API**: Node.js/TypeScript server, REST + WebSocket
- **Agent Engine**: Claude/Gemini tool-calling loop with action planning
- **Permission Guard**: Default-deny, per-channel/user/action scoping
- **Action Workers**: Sandboxed executors for each action type
- **Web Dashboard**: Next.js control plane with onboarding wizard

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 22+ |
| Language | TypeScript |
| Dashboard | Next.js 15 |
| Database | SQLite via Drizzle ORM |
| Browser automation | Playwright |
| Email | IMAP/SMTP or Gmail API |
| Chat: Telegram | grammY |
| Chat: Discord | discord.js |
| Chat: SimpleX | simplex-chat CLI bridge |
| AI: Anthropic | @anthropic-ai/sdk |
| AI: Gemini | @google/generative-ai |
| Package manager | pnpm |
| Monorepo | Turborepo |
| Testing | Vitest + Playwright |

## Data Model (SQLite)

### sessions
- id, channel, user_id, created_at, updated_at, metadata

### messages
- id, session_id, role, content, tool_calls, created_at

### permissions
- id, channel, user_id, action_type, level, created_at

### audit_log
- id, session_id, channel, user_id, action_type, input, output, permission_level, confirmation_required, created_at

### workflows
- id, name, steps, trigger, enabled, created_at

### settings
- id, key, value (encrypted), created_at, updated_at

## Permission Guard

Default-deny. Five levels from least to most privileged:

| Level | Can do |
|-------|--------|
| Read-only | Browse web, read emails, read files |
| Communicate | + Send emails, post messages |
| Modify | + Write/move files, manage email folders |
| Execute | + Run shell commands, install packages |
| Admin | + Change permissions, manage settings |

Per-channel scoping. Destructive actions require user confirmation in chat. Full audit trail.

API keys encrypted at rest with AES-256 using user-provided master password.

## Dashboard Pages

| Page | Purpose |
|------|---------|
| Home | Live feed of agent activity, quick stats |
| Conversations | Message history per channel, searchable |
| Audit Log | Full timeline of every action taken |
| Permissions | Per-channel permission matrix, easy toggles |
| Settings | API keys, channel config, preferences |
| Workflows | Placeholder for v2 visual workflow builder |

## Onboarding Wizard

1. Welcome - set master password
2. Connect AI - paste API key, test connection
3. Connect a channel - guided setup with screenshots
4. Set permissions - preset or custom
5. First task - send test message, watch agent respond
6. Done - dashboard unlocks

## UI Design: "Warm Glass Laboratory"

### Color Palette
- `#0A0B0D` - Deep charcoal (background)
- `#14161A` - Elevated surface
- `#E8DCC4` - Warm paper beige (glass tints, text)
- `#FF6B35` - Burnt orange (primary accent)
- `#1A4D2E` - Forest green (success, secondary)
- `#F7931E` - Amber (warnings, loading)
- `#FFE5D9` - Peachy cream (hover states)
- `#2D2E32` - Warm graphite (borders)

### Typography
- Display: Instrument Sans (600-700)
- Body: Inter (400-600)
- Mono: JetBrains Mono

### Glass Specs
- Standard: blur(24px), saturate(180%), rgba(232,220,196,0.07)
- Elevated: blur(40px), saturate(200%), rgba(232,220,196,0.12)
- Subtle: blur(16px), saturate(150%), rgba(20,22,26,0.6)
- Inset top borders for glass edge realism
- Paper texture noise overlay at 3% opacity

### Unique Elements
- Agent breathing animation (pulsing warm glow)
- Glass reflection angle shift on hover
- Warm glow loading states instead of spinners
- Command line echo for agent actions
- Frosted edge lighting on card tops
- Organic blob morphing for AI thinking indicator

### Animations
- Page transitions: glass-in (fade + scale + blur)
- Status changes: warm pulse
- Buttons: magnetic press (scale + glow)
- Loading: shimmer gradient
- Sidebar: paper unfold
- AI thinking: organic blob morph

## Project Structure

```
agentpilot/
├── apps/
│   ├── gateway/          # Core server
│   └── dashboard/        # Next.js web dashboard
├── packages/
│   ├── core/             # Shared types, utils, config
│   ├── ai/               # Model provider abstraction
│   ├── actions/           # Action workers
│   ├── channels/          # Chat adapters
│   ├── permissions/       # Permission guard
│   └── db/               # Drizzle ORM schema
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

## Implementation Phases

| Phase | What | Test |
|-------|------|------|
| 1 | Monorepo scaffold, DB schema, config | Unit tests for config + DB |
| 2 | AI provider abstraction (Claude + Gemini) | Unit tests: tool calling, streaming |
| 3 | Permission guard | Unit tests: every level + edge cases |
| 4 | Action workers (email, browser, files, shell) | Integration tests per worker |
| 5 | Chat adapters (Telegram, Discord, SimpleX) | Integration tests: message in -> action out |
| 6 | Gateway server | E2E: send message -> agent acts |
| 7 | Dashboard (onboarding, live feed, audit log) | Playwright E2E tests |
| 8 | Polish, docs, install script | Smoke test full flow |

Each phase: build, test, move on. No phase starts until previous tests pass.
