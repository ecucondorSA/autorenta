#!/bin/bash

# Source the utils script
if [ -f "./tools/utils.sh" ]; then
  source "./tools/utils.sh"
else
  echo "Error: ./tools/utils.sh not found. Exiting."
  exit 1
fi

set -e

# Default command is install
COMMAND=${1:-install}

# Run the command
run_command "$COMMAND"