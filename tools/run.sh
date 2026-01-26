#!/bin/bash

set -e

# Check if utils.sh exists
if [ ! -f "./utils.sh" ]; then
  echo "Error: ./tools/utils.sh not found. Please ensure it exists in the repository."
  exit 1
fi

# Source the utils.sh script
. ./utils.sh

# Get the command to run from the arguments
command="$1"
shift

# Run the command
case "$command" in
  install)
    install "$@"
    ;;
  build)
    build "$@"
    ;;
  test)
    test "$@"
    ;;
  deploy)
    deploy "$@"
    ;;
  *)
    echo "Usage: $0 {install|build|test|deploy}"
    exit 1
    ;;
esac