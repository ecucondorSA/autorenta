#!/bin/bash

set -e

source ./tools/utils.sh

AUTORENTA_DIR=$(pwd)

# Install dependencies
if [ "$1" = "install" ]; then
  if [ -z "${AUTORENTA_SKIP_INSTALL}" ]; then
    echo "Installing dependencies..."
    npm install
  else
    echo "Skipping dependency installation..."
  fi
fi

# Run the command
if [ "$1" = "dev" ]; then
  npm run dev
fi

if [ "$1" = "build" ]; then
  npm run build
fi

if [ "$1" = "test" ]; then
  npm run test
fi

if [ "$1" = "lint" ]; then
  npm run lint
fi

if [ "$1" = "format" ]; then
  npm run format
fi
