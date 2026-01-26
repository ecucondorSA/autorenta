#!/usr/bin/env bash

set -e

# shellcheck source=./tools/utils.sh
if [ -f ./tools/utils.sh ]; then
  source ./tools/utils.sh
else
  echo "Error: ./tools/utils.sh not found. Please ensure it exists in the repository."
  exit 1
fi

ACTION=$1
shift

case "${ACTION}" in
  install)
    install_deps "$@"
    ;;
  *)
    echo "Unknown action: ${ACTION}"
    exit 1
    ;;
esac
