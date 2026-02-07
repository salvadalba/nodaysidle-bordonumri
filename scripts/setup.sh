#!/usr/bin/env bash
set -euo pipefail

# Colors
ORANGE='\033[0;33m'
GREEN='\033[0;32m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${ORANGE}${BOLD}  ◆ AgentPilot Setup${NC}"
echo -e "${DIM}  The AI that actually does things.${NC}"
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
  echo -e "  ${ORANGE}✕${NC} Node.js not found. Install Node.js 22+ first."
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
  echo -e "  ${ORANGE}✕${NC} Node.js 22+ required (found v$(node -v))"
  exit 1
fi
echo -e "  ${GREEN}✓${NC} Node.js $(node -v)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  echo -e "  ${DIM}Installing pnpm...${NC}"
  npm install -g pnpm@9
fi
echo -e "  ${GREEN}✓${NC} pnpm $(pnpm -v)"

# Install dependencies
echo ""
echo -e "  ${DIM}Installing dependencies...${NC}"
pnpm install

# Run tests
echo ""
echo -e "  ${DIM}Running tests...${NC}"
pnpm turbo test:unit 2>&1 | tail -3

# Create config directory
CONFIG_DIR="$HOME/.agentpilot"
if [ ! -d "$CONFIG_DIR" ]; then
  mkdir -p "$CONFIG_DIR"
  echo -e "  ${GREEN}✓${NC} Created $CONFIG_DIR"
fi

# Create notes directory
NOTES_DIR="$CONFIG_DIR/notes"
if [ ! -d "$NOTES_DIR" ]; then
  mkdir -p "$NOTES_DIR"
  echo -e "  ${GREEN}✓${NC} Created $NOTES_DIR"
fi

# Create config if it doesn't exist
CONFIG_FILE="$CONFIG_DIR/config.json"
if [ ! -f "$CONFIG_FILE" ]; then
  cat > "$CONFIG_FILE" <<'CONF'
{
  "ai": {
    "primary": "anthropic"
  },
  "channels": {},
  "permissions": {
    "defaultLevel": 0,
    "channelOverrides": {}
  },
  "server": {
    "port": 3100,
    "host": "127.0.0.1",
    "dashboardPort": 3000
  },
  "database": {
    "path": "~/.agentpilot/agentpilot.db"
  }
}
CONF
  echo -e "  ${GREEN}✓${NC} Created default config at $CONFIG_FILE"
else
  echo -e "  ${GREEN}✓${NC} Config already exists at $CONFIG_FILE"
fi

echo ""
echo -e "${GREEN}${BOLD}  Setup complete!${NC}"
echo ""
echo -e "  ${DIM}Next steps:${NC}"
echo -e "  1. Edit ${BOLD}~/.agentpilot/config.json${NC} to add your API keys"
echo -e "  2. Run ${BOLD}pnpm dev${NC} to start the gateway + dashboard"
echo -e "  3. Open ${BOLD}http://localhost:3000${NC} for the dashboard"
echo ""
