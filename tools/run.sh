#!/usr/bin/env bash

set -e

source ./tools/utils.sh

AUTORENTA_SKIP_INSTALL=${AUTORENTA_SKIP_INSTALL:-}

if [ "$1" = "install" ]; then
  if [ -z "$AUTORENTA_SKIP_INSTALL" ]; then
    echo "Installing dependencies..."
    pnpm install
  else
    echo "Skipping dependency installation..."
  fi
elif [ "$1" = "build" ]; then
  echo "Building..."
  pnpm build
elif [ "$1" = "test" ]; then
  echo "Testing..."
  pnpm test
elif [ "$1" = "lint" ]; then
  echo "Linting..."
  pnpm lint
elif [ "$1" = "format" ]; then
  echo "Formatting..."
  pnpm format
else
  echo "Usage: ./tools/run.sh [install|build|test|lint|format]"
  exit 1
fi
