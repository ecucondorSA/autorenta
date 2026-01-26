#!/bin/bash

set -e

# Check if utils.sh exists
if [ ! -f ./tools/utils.sh ]; then
  echo "Error: ./tools/utils.sh not found"
  exit 1
fi

# Source utils.sh
. ./tools/utils.sh

# Determine the command to run
COMMAND="$1"

# Check if a command was provided
if [ -z "$COMMAND" ]; then
  echo "Usage: ./tools/run.sh <command>"
  exit 1
fi

# Run the command
case "$COMMAND" in
  install)
    install_dependencies
    ;;
  lint)
    run_lint
    ;;
  format)
    run_format
    ;;
  build)
    run_build
    ;;
  test)
    run_tests
    ;;
  e2e)
    run_e2e
    ;;
  *)  
    echo "Error: Unknown command '$COMMAND'"
    exit 1
    ;;
esac
