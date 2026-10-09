#!/bin/bash
# Installs npm dependencies so `npm run check` (typecheck, lint, format, tests) works in
# Claude Code cloud sessions. Does nothing on local machines.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# `npm install` rather than `npm ci`: it reuses node_modules from the cached container.
npm install --no-audit --no-fund

# Cloud networks may block Expo's version API; offline mode makes `npx expo install`
# use the SDK-compatible versions bundled in the `expo` package instead.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export EXPO_OFFLINE=1' >> "$CLAUDE_ENV_FILE"
fi
