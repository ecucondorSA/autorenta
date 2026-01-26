#!/bin/bash

set -e

# Source the utils script
if [ -f "./utils.sh" ]; then
  source ./utils.sh
else
  echo "Error: utils.sh not found in the tools directory."
  exit 1
fi

AUTORENTA_DIR=$(pwd)

# Run the command passed as argument
$@
