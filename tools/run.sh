#!/bin/bash

set -e

SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")

# Check if utils.sh exists
if [ ! -f "${SCRIPT_DIR}/utils.sh" ]; then
  echo "Error: utils.sh not found in the tools directory."
  exit 1
fi

source "${SCRIPT_DIR}/utils.sh"

COMMAND=$1
shift

case $COMMAND in
  install)
    install_dependencies "$@"
    ;;
  *)
    echo "Usage: $0 [install]"
    exit 1
    ;;
esac
