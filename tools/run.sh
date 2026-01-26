#!/bin/bash

# Change directory to the root of the repository
cd "$(dirname "$0")"/..

# Check if utils.sh exists
if [ ! -f "./tools/utils.sh" ]; then
  echo "Error: utils.sh not found in the tools directory."
  exit 1
fi

# Source utils.sh
source ./tools/utils.sh

# Execute the command
$@
