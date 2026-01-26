#!/bin/bash

set -e

# Source the utils.sh script
if [ -f "./utils.sh" ]; then
  source "./utils.sh"
else
  echo "Error: utils.sh not found in the tools directory."
  exit 1
fi

# Determine the command to execute
COMMAND="$1"

# Execute the command
case "$COMMAND" in
  install)
    echo ". install"
    # Add any install specific logic here
    # Example: npm install
    if [ "$AUTORENTA_SKIP_INSTALL" = "1" ]; then
      echo ". install: Skipping install due to AUTORENTA_SKIP_INSTALL=1"
      exit 0
    fi

    echo ". install: Running install"
    # Replace with your actual install commands
    # For example:
    # npm install
    exit 0 # Indicate success even if no install commands are run
    ;;
  *)
    echo "Usage: $0 {install}"
    exit 1
    ;;
esac

echo ". install: Failed"
exit 1
