#!/bin/bash

# Check if utils.sh exists
if [ ! -f "./utils.sh" ]; then
  echo "Error: utils.sh not found in the tools directory." >&2
  exit 1
fi

# Source utils.sh
. ./utils.sh

# Get the command to run from the arguments
command="$1"
shift

# Check if a command was provided
if [ -z "$command" ]; then
  echo "Usage: ./run.sh <command> [arguments...]" >&2
  exit 1
fi

# Run the command
run_command "$command" "$@"
