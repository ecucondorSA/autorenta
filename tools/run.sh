#!/usr/bin/env bash

set -euo pipefail

# shellcheck disable=SC2034
readonly SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
readonly PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"

# shellcheck disable=SC2034
readonly AUTORENTA_REPO_ROOT="${PROJECT_ROOT}"

readonly CMD="${1}"
readonly ARGS="${@:2}"

log() {
  echo ". ${CMD}: ${1}"
}

error() {
  echo ". ${CMD}: ERROR: ${1}" >&2
}

run_command() {
  log "Running command: $@"
  "$@"
}

case "${CMD}" in
  install)
    log "Running install step"
    if [[ -n "${AUTORENTA_SKIP_INSTALL}" ]]; then
      log "AUTORENTA_SKIP_INSTALL is set, skipping install step"
    else
      run_command pnpm install "${ARGS[@]}"
    fi
    ;;

  prepare)
    log "Running prepare step"
    run_command husky
    ;;

  build)
    log "Running build step"
    run_command pnpm -r build
    ;;

  *)
    echo "Unknown command: ${CMD}"
    exit 1
    ;;

esac

log "Done"
