#!/bin/bash
# Copy this project to Windows Desktop for testing with DigitalPersona Lite Client.
# Run from WSL: bash scripts/sync-to-windows-desktop.sh

set -e
WIN_USER="${WIN_USER:-alive}"
DEST="/mnt/c/Users/${WIN_USER}/Desktop/nova-hr-design"
SRC="/home/galaxy/nova-hr-design"

echo "Syncing $SRC -> $DEST"
mkdir -p "$DEST"

rsync -a --delete \
  --exclude node_modules \
  --exclude backend/node_modules \
  --exclude backend/dist \
  --exclude backend/fingerprint-matcher/target \
  --exclude dist \
  --exclude .git \
  "$SRC/" "$DEST/"

echo ""
echo "Done. On Windows:"
echo "  1. Open PowerShell in: C:\\Users\\${WIN_USER}\\Desktop\\nova-hr-design"
echo "  2. cd backend && npm install && npm run dev"
echo "  3. In another terminal: npm install && npm run dev  (from project root)"
echo "  4. Ensure .env.local has: VITE_API_URL=http://localhost:3001/api"
echo "  5. Open http://localhost:8080 in Chrome/Edge on Windows (not WSL browser)"
echo ""
echo "DigitalPersona Lite Client must be installed on Windows — it does not work inside Linux/WSL."
