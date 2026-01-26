#!/bin/bash

set -e

# Check if utils.sh exists
if [ ! -f "./tools/utils.sh" ]; then
  echo "Error: ./tools/utils.sh not found. Please ensure it exists in the repository."
  exit 1
fi

# Source utils.sh
. ./tools/utils.sh

# Default command is 'start'
COMMAND=${1:-start}

# Execute the command
case "$COMMAND" in
  install)
    install_dependencies
    ;;
  start)
    start_application
    ;;
  build)
    build_application
    ;;
  test)
    test_application
    ;;
  deploy)
    deploy_application
    ;;
  *)
    echo "Usage: $0 [install|start|build|test|deploy]"
    exit 1
    ;;
esac
