#!/bin/bash

set -e

COMMAND=$1
shift

echo "Running command: $COMMAND"

case "$COMMAND" in
  install)
    if [ -z "$AUTORENTA_SKIP_INSTALL" ]; then
      pnpm install "$@"
    else
      echo "Skipping install command due to AUTORENTA_SKIP_INSTALL being set."
    fi
    ;;
  build)
    pnpm build # Or npm run build, depending on your project's setup
    ;;
  *)
    echo "Unknown command: $COMMAND"
    exit 1
    ;;

esac

echo "Done"