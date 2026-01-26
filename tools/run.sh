#!/bin/bash

set -e

# Default command is 'start'
COMMAND="$1"

if [ -z "$COMMAND" ]; then
  COMMAND="start"
fi

# Load environment variables from .env files
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | xargs -0)
fi
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs -0)
fi

# Function to display help message
show_help() {
  echo "Usage: ./tools/run.sh [command]"
  echo "Commands:"
  echo "  start   - Starts the application (default)"
  echo "  build   - Builds the application"
  echo "  install - Installs dependencies"
  echo "  test    - Runs tests"
  echo "  lint    - Runs linters"
  echo "  format  - Formats code"
}

# Run the specified command
case "$COMMAND" in
  start)
    echo "Starting the application..."
    pnpm run start
    ;;
  build)
    echo "Building the application..."
    # Example: Replace 'install' with a meaningful command, e.g., copying files
    # install source_file destination_directory
    # Or, if 'install' is not needed, remove the line.
    # If install is intended to install dependencies, use pnpm install instead
    pnpm run build:prod
    ;;
  install)
    echo "Installing dependencies..."
    pnpm install
    ;;
  test)
    echo "Running tests..."
    pnpm test
    ;;
  lint)
    echo "Running linters..."
    pnpm run lint
    ;;
  format)
    echo "Formatting code..."
    pnpm run format
    ;;
  *)
    echo "Invalid command: $COMMAND"
    show_help
    exit 1
    ;;
esac

echo "Command '$COMMAND' completed."
