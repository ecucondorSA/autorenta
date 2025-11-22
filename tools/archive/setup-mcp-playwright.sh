#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "[setup] root dir: $ROOT_DIR"

echo "\n[setup] 1) Installing root dependencies (pnpm) if needed"
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found. Installing pnpm locally via npm..."
  npm i -g pnpm
fi

echo "\n[setup] 2) Installing repo dependencies (pnpm install)"
pnpm install

echo "\n[setup] 3) Install MCP server dependencies and build"
if [ -d "$ROOT_DIR/mcp-server" ]; then
  pushd "$ROOT_DIR/mcp-server" >/dev/null
  if [ -f package-lock.json ] || [ -f package.json ]; then
    echo "Installing mcp-server dependencies (npm ci)..."
    npm ci || npm install
  fi
  if [ -f package.json ] && grep -q "build" package.json; then
    echo "Building mcp-server (npm run build)..."
    npm run build || true
  fi
  # run optional setup script if present
  if [ -f ./setup.sh ]; then
    echo "Running mcp-server/setup.sh"
    chmod +x ./setup.sh
    ./setup.sh || true
  fi
  popd >/dev/null
else
  echo "mcp-server directory not found; skipping MCP server install"
fi

echo "\n[setup] 4) Install Playwright browsers"
# Use npx so it works with the pinned playwright in devDependencies
npx playwright install --with-deps || true

echo "\n[setup] DONE — next steps:\n"
echo "  - Configure MCP env in mcp-server/.env or root .env.test as needed"
echo "  - Run the MCP server for local testing: node mcp-server/dist/index.js  (or npm run dev inside mcp-server)"
echo "  - Generate auth states if needed: pnpm run test:e2e:gen-auth"
echo "  - Run Playwright tests: pnpm run test:e2e"
