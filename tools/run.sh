#!/usr/bin/env bash

set -euo pipefail

# This script is used to run commands in the context of the autorentar project.
# It ensures that the environment is set up correctly and that the necessary
# dependencies are installed.

COMMAND=$1
shift

# shellcheck disable=SC2086
log() { echo "\033[0;32m. $1: $(eval echo \"$@\")\033[0m"; }

case "$COMMAND" in
  install)
    log install "AUTORENTA_SKIP_INSTALL=$AUTORENTA_SKIP_INSTALL"
    if [ -n "$AUTORENTA_SKIP_INSTALL" ]; then
      log install "AUTORENTA_SKIP_INSTALL is set, skipping install step"
    else
      pnpm install
    fi
    ;;
  prepare)
    log prepare husky
    pnpm exec husky install
    ;;
  build)
    log build "Running command: build"
    pnpm run tsc
    ;;
  *)
    echo "Unknown command: $COMMAND"
    exit 1
    ;;

esac

log "$COMMAND" Done
