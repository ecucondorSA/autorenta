#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MCP_DIR="$ROOT_DIR/mcp-server"
LOG_DIR="$ROOT_DIR/logs"
RUN_DIR="$ROOT_DIR/run"

mkdir -p "$LOG_DIR" "$RUN_DIR"

echo "[mcp] Starting MCP server from $MCP_DIR"

if [ ! -d "$MCP_DIR" ]; then
  echo "[mcp] mcp-server directory not found: $MCP_DIR"
  exit 2
fi

pushd "$MCP_DIR" >/dev/null

if [ -f package-lock.json ] || [ -f package.json ]; then
  echo "[mcp] Ensuring dependencies are installed (npm ci || npm install)"
  npm ci || npm install
fi

if [ -f dist/index.js ]; then
  echo "[mcp] Found built dist/index.js — will run production start"
  CMD="npm run start"
else
  echo "[mcp] dist/index.js not found — starting in dev mode (npm run dev)"
  CMD="npm run dev"
fi

echo "[mcp] Running: $CMD"
nohup bash -lc "$CMD" > "$LOG_DIR/mcp.log" 2>&1 &
PID=$!
echo $PID > "$RUN_DIR/mcp.pid"
echo "[mcp] Started (pid: $PID). Logs: $LOG_DIR/mcp.log"

popd >/dev/null
