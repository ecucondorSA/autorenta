#!/usr/bin/env bash

set -euo pipefail

# Base path for the isolated Chrome profile dedicated to debugging.
DEV_PROFILE_DIR="${CHROME_DEV_PROFILE_DIR:-$HOME/.config/google-chrome-dev}"
REMOTE_DEBUG_PORT="${CHROME_DEVTOOLS_PORT:-9222}"

mkdir -p "$DEV_PROFILE_DIR"

google-chrome \
  --user-data-dir="$DEV_PROFILE_DIR" \
  --profile-directory="DevTools" \
  --remote-debugging-port="$REMOTE_DEBUG_PORT" \
  --auto-open-devtools-for-tabs \
  --enable-logging \
  --v=1 \
  --enable-features=DevToolsExperiments,TracingServiceInProcess \
  --disable-features=IsolateOrigins,site-per-process \
  --disable-web-security \
  --disable-popup-blocking \
  --disable-background-timer-throttling \
  --disable-background-networking \
  --disable-renderer-backgrounding \
  --no-sandbox \
  --no-default-browser-check \
  --no-first-run \
  "$@"
