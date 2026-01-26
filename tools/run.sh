#!/bin/bash

# Source the utils script
if [ -f "./utils.sh" ]; then
  source "./utils.sh"
else
  echo "Error: utils.sh not found in the tools directory."
  exit 1
fi

set -e

# Default command is install
COMMAND=${1:-install}

# Run the command
run_command "$COMMAND"