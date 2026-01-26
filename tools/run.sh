#!/bin/bash

set -e

COMMAND="$1"

echo "Running command: $COMMAND"

if [ "$AUTORENTA_SKIP_INSTALL" = "1" ] && [ "$COMMAND" = "install" ]; then
  echo "Skipping install command due to AUTORENTA_SKIP_INSTALL=1"
  exit 0
fi

case "$COMMAND" in
  install)
    install
    ;;
  test)
    vitest --run
    ;;
  lint)
    eslint . --ext .ts,.tsx
    ;;
  format)
    prettier --write .
    ;;
  build)
    echo "Building..."
    ;; # Placeholder for build command
  *)
    echo "Unknown command: $COMMAND"
    exit 1
    ;;
esac

echo "Done"