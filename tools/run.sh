#!/bin/bash

set -e

# shellcheck source=./tools/utils.sh
if [ -f "./tools/utils.sh" ]; then
  source ./tools/utils.sh
else
  echo "Error: ./tools/utils.sh not found"
  exit 1
fi

ACTION=$1

case "$ACTION" in
  install)
    echo "Running install..."
    # Add install logic here
    npm install
    ;;
  *)
    echo "Unknown action: $ACTION"
    exit 1
    ;;
esac
