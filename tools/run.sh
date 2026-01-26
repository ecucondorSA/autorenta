#!/bin/bash

# Check if utils.sh exists
if [ ! -f "./tools/utils.sh" ]; then
  echo "Error: ./tools/utils.sh not found. Please ensure it exists in the repository."
  exit 1
fi

# Source the utils script
. ./tools/utils.sh

set -e

# Default command is install
COMMAND=${1:-install}

# Run the command
run_command "$COMMAND"