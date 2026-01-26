#!/bin/bash

set -e

COMMAND=$1

# Exit if no command was specified
if [ -z "$COMMAND" ]; then
  echo "No command specified. Usage: ./tools/run.sh <command>"
  exit 1
fi

echo ". install: Running command: $COMMAND"

case $COMMAND in
  install)
    if [ "$AUTORENTA_SKIP_INSTALL" = "1" ]; then
      echo ". install: Skipping install due to AUTORENTA_SKIP_INSTALL=1"
    else
      pnpm install
    fi
    ;;
  prepare)
    husky
    ;;
  build)
    cd apps/web
    pnpm build
    ;;
  *)
    echo "Unknown command: $COMMAND"
    exit 1
    ;;
esac

echo ". install: Done"
