#!/usr/bin/env bash

# Load utility functions
source ./utils.sh

set -e

# Default command if none is provided
COMMAND="build"

# Override command if an argument is provided
if [ ! -z "$1" ]; then
  COMMAND="$1"
fi

# Execute the command
case $COMMAND in
install)
  echo "Running install..."
  ./scripts/install.sh
  ;;
build)
  echo "Running build..."
  ./scripts/build.sh
  ;;
test)
  echo "Running test..."
  ./scripts/test.sh
  ;;
lint)
  echo "Running lint..."
  ./scripts/lint.sh
  ;;
*)
  echo "Unknown command: $COMMAND"
  exit 1
  ;;
esac
