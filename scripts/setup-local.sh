#!/bin/bash
# ============================================
# Setup local environment from secrets/
# Run this once after cloning, or after changing secrets.
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/.."
SECRETS="$ROOT/secrets"
PORTAL="$ROOT/portal"

echo "=== Conclave Local Setup ==="

# Check secrets exist
if [ ! -d "$SECRETS" ]; then
  echo "ERROR: secrets/ directory not found."
  echo "Create it with your API keys and whitelist. See secrets/README.md"
  exit 1
fi

# Copy whitelist to portal
if [ -f "$SECRETS/whitelist.json" ]; then
  cp "$SECRETS/whitelist.json" "$PORTAL/data/whitelist.json"
  echo "✓ Whitelist copied to portal/data/"
else
  echo "⚠ No whitelist.json in secrets/ — creating empty one"
  echo '{"users":[]}' > "$PORTAL/data/whitelist.json"
fi

# Copy env to portal
if [ -f "$SECRETS/.env" ]; then
  cp "$SECRETS/.env" "$PORTAL/.env.local"
  echo "✓ .env copied to portal/.env.local"
else
  echo "⚠ No .env in secrets/ — portal auth will not work"
fi

echo ""
echo "Done. Run 'cd portal && npm run dev' to start."
