#!/bin/bash

set -e

# Source utils.sh
if [ -f "./tools/utils.sh" ]; then
  source "./tools/utils.sh"
else
  echo "Error: utils.sh not found in tools directory."
  exit 1
fi

AUTORENTA_DIR=$(pwd)

# Run the install script
install