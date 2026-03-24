#!/bin/bash
# Run a research memo for a specific protocol
# Usage: ./scripts/run-memo.sh AAVE

TICKER="${1:?Usage: run-memo.sh TICKER}"
DATE=$(date +%Y-%m-%d)
OUTPUT_DIR="output"
ARCHIVE_DIR="archive/memos"
PORTAL_MEMOS="portal/data/memos"

mkdir -p "$OUTPUT_DIR" "$ARCHIVE_DIR" "$PORTAL_MEMOS/${TICKER,,}"

echo "=== Conclave Research Memo: $TICKER ==="
echo "Date: $DATE"
echo ""

# Phase 1: Fetch data
echo "[Phase 1] Fetching protocol data..."
if [ -f "$HOME/.claude/skills/conclave/scripts/fetch_protocol_data.py" ]; then
  python3 "$HOME/.claude/skills/conclave/scripts/fetch_protocol_data.py" "$TICKER" -o "$OUTPUT_DIR/${TICKER,,}-${DATE}-data.json" 2>/dev/null
  echo "Data saved to $OUTPUT_DIR/${TICKER,,}-${DATE}-data.json"
else
  echo "Warning: fetch_protocol_data.py not found. Proceeding without live data."
fi

echo ""
echo "[Phase 2-4] Run 'claude' to spawn the analysis agents."
echo "The orchestrator in SKILL.md will handle the rest."
