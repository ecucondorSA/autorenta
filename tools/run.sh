#!/usr/bin/env bash

set -e

script="$(basename "$0")"

cyan() {
  echo -e "\033[1;36m$1\033[0m"
}

info() {
  cyan "[${script}] $*"
}

# Default to production if NODE_ENV is not set
NODE_ENV=${NODE_ENV:-production}

case "$script" in
  build)
    info "Building..."
    pnpm -r --filter=!./apps/api run build
    ;; # Changed pnpm build to pnpm -r --filter=!./apps/api run build
  deploy)
    info "Deploying..."
    pnpm -r run deploy
    ;;
  dev)
    info "Starting development environment..."
    pnpm -r run dev
    ;;
  format)
    info "Formatting code..."
    pnpm -r run format
    ;;
  lint)
    info "Linting code..."
    pnpm -r run lint
    ;;
  test)
    info "Running tests..."
    pnpm -r run test
    ;;
  install)
    info "Installing dependencies..."
    pnpm install
    ;;
  *)
    echo "Usage: $script [build|deploy|dev|format|lint|test|install]"
    exit 1
    ;;

esacn