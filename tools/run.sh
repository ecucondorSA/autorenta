#!/bin/bash

set -e

# Source the utils script
if [ -f "./tools/utils.sh" ]; then
  source "./tools/utils.sh"
else
  echo "Error: ./tools/utils.sh not found. Please ensure it exists."
  exit 1
fi

# Default command is install
COMMAND=${1:-install}

# Run the command
run_$COMMAND
