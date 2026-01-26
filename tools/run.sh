#!/bin/bash

set -e

# shellcheck source=./tools/utils.sh
if [ -f "./tools/utils.sh" ]; then
  source ./tools/utils.sh
else
  echo "Error: ./tools/utils.sh not found. Please ensure it exists."
  exit 1
fi

ACTION=$1
shift

case "${ACTION}" in
  install)
    echo "Running install..."
    # Add install logic here if needed. Currently, AUTORENTA_SKIP_INSTALL is used.
    if [ "${AUTORENTA_SKIP_INSTALL}" != "1" ]; then
      echo "AUTORENTA_SKIP_INSTALL is not set to 1. Actual install logic should be here."
      # Example: npm install or pnpm install
      exit 1 # Indicate failure as install logic is missing
    else
      echo "Skipping install as AUTORENTA_SKIP_INSTALL is set to 1."
    fi
    ;;
  *)
    echo "Usage: ./tools/run.sh install"
    exit 1
    ;;

esac

echo "${ACTION} completed successfully"
