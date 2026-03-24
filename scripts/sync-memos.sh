#!/bin/bash
# Sync committee memos from archive to portal
ARCHIVE_DIR="$(dirname "$0")/../archive/memos"
PORTAL_MEMOS="$(dirname "$0")/../portal/data/memos"

mkdir -p "$PORTAL_MEMOS"

for memo_file in "$ARCHIVE_DIR"/*.md; do
  [ -f "$memo_file" ] || continue
  basename=$(basename "$memo_file" .md)
  slug=$(echo "$basename" | sed 's/-[0-9]*-[0-9]*-[0-9]*-memo//')

  mkdir -p "$PORTAL_MEMOS/$slug"
  cp "$memo_file" "$PORTAL_MEMOS/$slug/memo.md"

  # Generate meta.json if it doesn't exist
  if [ ! -f "$PORTAL_MEMOS/$slug/meta.json" ]; then
    ticker=$(echo "$slug" | tr '[:lower:]' '[:upper:]')
    date=$(echo "$basename" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
    cat > "$PORTAL_MEMOS/$slug/meta.json" << METAEOF
{
  "ticker": "$ticker",
  "date": "${date:-$(date +%Y-%m-%d)}",
  "decision": "MONITOR",
  "conviction": 0,
  "summary": "Committee memo — review for details"
}
METAEOF
  fi
done

echo "Synced memos from archive to portal"
