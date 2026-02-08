# AgentPilot User Guide

A complete guide to setting up and using your self-hosted AI assistant.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Setting Up Telegram](#setting-up-telegram)
4. [Setting Up Discord](#setting-up-discord)
5. [Configuration](#configuration)
6. [Starting the Gateway](#starting-the-gateway)
7. [Using the Dashboard](#using-the-dashboard)
8. [Testing Your Bot](#testing-your-bot)
9. [Permission Levels](#permission-levels)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js 22+** &mdash; [Download](https://nodejs.org/)
- **pnpm** &mdash; `npm install -g pnpm`
- **An Anthropic API key** &mdash; [Get one here](https://console.anthropic.com/settings/keys)
- **A Telegram bot token** (and/or Discord bot token)

## Installation

```bash
# Clone the repo
git clone https://github.com/salvadalba/nodaysidle-bordonumri.git agentpilot
cd agentpilot

# Install dependencies
pnpm install

# Run the setup script (creates ~/.agentpilot/ with default config and database)
./scripts/setup.sh
```

## Setting Up Telegram

1. **Create a bot** &mdash; Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token (looks like `123456789:ABCdefGHIjklMNO...`)
4. Add it to your config:

```bash
nano ~/.agentpilot/config.json
```

```json
{
  "channels": {
    "telegram": {
      "botToken": "YOUR_BOT_TOKEN_HERE"
    }
  }
}
```

5. **Start a chat** with your bot on Telegram
6. Send any message &mdash; the bot will respond once the gateway is running

## Setting Up Discord

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**, give it a name
3. Go to **Bot** > **Add Bot**
4. Copy the bot token
5. Under **Privileged Gateway Intents**, enable:
   - Message Content Intent
   - Server Members Intent
6. Go to **OAuth2** > **URL Generator**:
   - Select scopes: `bot`
   - Select permissions: `Send Messages`, `Read Message History`
7. Copy the generated URL and open it to invite the bot to your server
8. Add the token to your config:

```json
{
  "channels": {
    "discord": {
      "botToken": "YOUR_DISCORD_BOT_TOKEN"
    }
  }
}
```

## Configuration

The full config file lives at `~/.agentpilot/config.json`:

```json
{
  "ai": {
    "primary": "anthropic",
    "anthropicApiKey": "sk-ant-api03-...",
    "geminiApiKey": "AIza...",
    "model": null
  },
  "channels": {
    "telegram": { "botToken": "..." },
    "discord": { "botToken": "..." },
    "simplex": { "cliPath": "/usr/local/bin/simplex-chat" }
  },
  "permissions": {
    "defaultLevel": 3,
    "channelOverrides": {}
  },
  "server": {
    "port": 3100,
    "host": "127.0.0.1",
    "dashboardPort": 3000
  },
  "database": {
    "path": "/Users/YOUR_USERNAME/.agentpilot/agentpilot.db"
  }
}
```

### Key Settings

| Setting | What it does |
|---------|-------------|
| `ai.primary` | Which AI provider to use: `"anthropic"` or `"gemini"` |
| `ai.anthropicApiKey` | Your Anthropic API key for Claude |
| `ai.model` | Override the default model (leave null for Haiku 3.5) |
| `permissions.defaultLevel` | Default permission level for all channels (0-4) |
| `server.port` | Gateway port (default: 3100) |

### Permission Levels Explained

| Level | Name | What the bot can do |
|:-----:|------|-------------------|
| 0 | ReadOnly | Browse the web, search, read files |
| 1 | Communicate | Everything above + send emails |
| 2 | Modify | Everything above + create/edit/delete files and notes |
| 3 | Execute | Everything above + run shell commands |
| 4 | Admin | Full access to everything |

**Recommended:** Start with level `3` (Execute) for personal use. This gives you full functionality while keeping email sends behind a confirmation prompt.

## Starting the Gateway

```bash
# Development mode (with hot reload)
pnpm dev

# Or run the gateway directly
npx tsx apps/gateway/src/index.ts
```

The gateway starts on `http://localhost:3100`. You should see:

```
[Gateway] Server listening on http://127.0.0.1:3100
[Telegram] Bot started
```

Now send a message to your bot on Telegram!

## Using the Dashboard

The dashboard is a web UI for monitoring your agent in real-time.

### Hosted Version

Visit [dashboard-nodaysidle.vercel.app](https://dashboard-nodaysidle.vercel.app) and configure it to point to your local gateway:

1. Click **Settings** in the sidebar
2. Set the Gateway URL to `http://localhost:3100`
3. Click **Save** &mdash; the page will reload and connect

### Running Locally

```bash
cd apps/dashboard
pnpm dev
```

Opens on `http://localhost:3000`.

### Dashboard Features

- **Activity Feed** &mdash; Real-time stream of bot actions via WebSocket
- **Audit Log** &mdash; Full history of every action the bot has taken
- **System Status** &mdash; See which channels are connected, AI provider status
- **Settings** &mdash; View and configure gateway connection

## Testing Your Bot

Here are test prompts to verify everything works. Send these to your bot via Telegram or Discord:

### File Operations
```
Create a file called hello.txt in my home directory with the content "Hello World"
```
```
Read the file ~/hello.txt
```
```
Delete the file ~/hello.txt
```

### Web Search
```
Search the web for "best programming languages 2025"
```

### Web Browsing
```
Browse https://example.com and tell me what it says
```

### Shell Commands
```
What's my current disk usage?
```
```
List the files in my home directory
```

### Notes
```
Create a note called ideas with the content "Build a weather app"
```
```
List all my notes
```
```
Search my notes for "weather"
```
```
Append "Add dark mode" to my ideas note
```
```
Read my ideas note
```

### Multi-step Task
```
Search the web for the current weather in New York, then create a note called weather-nyc with a summary
```

## Troubleshooting

### Bot not responding

1. **Check the gateway is running** &mdash; You should see log output in the terminal
2. **Check your bot token** &mdash; Make sure it's correct in `~/.agentpilot/config.json`
3. **Check the API key** &mdash; Verify your Anthropic API key is valid
4. **Check permissions** &mdash; Default level should be at least `2` for file operations, `3` for shell

### "Cannot connect to gateway" in dashboard

1. Make sure the gateway is running on `http://localhost:3100`
2. In the dashboard Settings, verify the Gateway URL is correct
3. If using the hosted dashboard (Vercel), make sure you're using `http://localhost:3100` (not `127.0.0.1`)

### API key errors

- **Anthropic:** Get your key at [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
- **Gemini:** Get your key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- Make sure the key is in the config file under `ai.anthropicApiKey` or `ai.geminiApiKey`

### Tests failing

```bash
# Run the full test suite
npx vitest run --exclude '**/dist/**'
```

All 120 tests should pass. If not, check that all dependencies are installed:

```bash
pnpm install
```

### Gateway port already in use

```bash
# Find and kill the process using port 3100
lsof -ti:3100 | xargs kill

# Then restart
npx tsx apps/gateway/src/index.ts
```

---

## Tips

- **The bot remembers context** &mdash; It keeps conversation history per channel/user, so you can have multi-turn conversations
- **Use absolute paths** &mdash; When asking about files, use full paths like `~/Documents/file.txt`
- **Shell commands are powerful** &mdash; You can run any bash command. The bot blocks obviously dangerous ones (`rm -rf /`, fork bombs, etc.)
- **Notes persist** &mdash; Notes are stored in the database and survive restarts
- **Audit everything** &mdash; Check the dashboard audit log to see exactly what the bot did

---

<p align="center">
  <sub>Questions? Open an issue on <a href="https://github.com/salvadalba/nodaysidle-bordonumri">GitHub</a>.</sub>
</p>
