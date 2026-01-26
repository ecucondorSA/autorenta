#!/bin/bash

set -e

# Skip validation in CI environments
if [ -z "$CI" ]; then
  ./scripts/validate-pr.sh
fi

if [ "$1" = "install" ]; then
  echo "Running install script..."
  pnpm install
  echo "Install script completed."
else
  echo "Running command: pnpm "$@
  pnpm "$@"
fi