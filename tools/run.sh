#!/usr/bin/env bash

set -e

# Source utils
if [ -f "./tools/utils.sh" ]; then
  source ./tools/utils.sh
else
  echo "Error: ./tools/utils.sh not found"
  exit 1
fi

# Run the command
COMMAND=$1
shift

case $COMMAND in
  install)
    install_dependencies "$@"
    ;;
  *)
    echo "Unknown command: $COMMAND"
    exit 1
    ;;
esac
