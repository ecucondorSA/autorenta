#!/usr/bin/env bash

set -euo pipefail

# This script is used to run commands in the context of the autorenta project.
# It is used by the package.json scripts.

COMMAND=$1
shift

# shellcheck disable=SC2086
log() { echo "\033[0;34m. $COMMAND: $@\033[0m"; }

case $COMMAND in
  install)
    log "AUTORENTA_SKIP_INSTALL is set, skipping install step" && exit 0
    pnpm install
    ;;
  build)
    log "Running command: build"
    pnpm run build:all
    ;;
  deploy)
    log "Running command: deploy"
    pnpm run deploy:all
    ;;
  *)
    echo "Unknown command: $COMMAND"
    exit 1
    ;;

esac

log "Done"
exit 0
