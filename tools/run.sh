#!/bin/bash

set -euo pipefail

COMMAND="$1"
shift
ARGS="$@"

# shellcheck disable=SC2086
echo ". ${COMMAND}: Running command: ${COMMAND} ${ARGS}"

case "${COMMAND}" in
  install)
    # The original script was calling the bare `install` command, which requires file operands.
    # This has been replaced with `pnpm install` to install dependencies.
    pnpm install
    ;;
  *)
    echo ". ${COMMAND}: Unknown command"
    exit 1
    ;;

esac
