#!/bin/bash

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Check if utils.sh exists
if [ ! -f "${SCRIPT_DIR}/utils.sh" ]; then
  echo "Error: utils.sh not found in the tools directory." >&2
  exit 1
fi

source "${SCRIPT_DIR}/utils.sh"

# Execute the command passed as arguments
"$@"
