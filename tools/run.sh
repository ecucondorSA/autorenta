#!/bin/bash

set -e

# Check if utils.sh exists in the same directory
if [ ! -f "$(dirname "${BASH_SOURCE[0]}")/utils.sh" ]; then
  echo "Error: utils.sh not found in the same directory as run.sh"
  exit 1
fi

# Source the utils.sh script
source "$(dirname "${BASH_SOURCE[0]}")/utils.sh"

AUTORENTA_SKIP_INSTALL=${AUTORENTA_SKIP_INSTALL:-}

case "$1" in
  install)
    install_dependencies
    ;;
  *)
    echo "Usage: ./tools/run.sh install"
    exit 1
    ;;

esac
