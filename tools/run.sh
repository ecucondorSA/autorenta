#!/bin/bash

set -e

# Check if utils.sh exists
if [ ! -f "./tools/utils.sh" ]; then
  echo "Error: ./tools/utils.sh not found"
  exit 1
fi

# Source utils.sh
. ./tools/utils.sh

# Run the specified command
"$@"
