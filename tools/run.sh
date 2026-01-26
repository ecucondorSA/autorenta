#!/bin/bash

set -e

# Source the utils script
if [ -f "./utils.sh" ]; then
  source ./utils.sh
else
  echo "Error: utils.sh not found in the same directory as run.sh"
  exit 1
fi

# Run the specified command
$@
