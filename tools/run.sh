#!/bin/bash

# Source utils.sh from the same directory as this script
dirname=$(dirname "${BASH_SOURCE[0]}")
utils_path="${dirname}/utils.sh"

if [ ! -f "${utils_path}" ]; then
  echo "Error: utils.sh not found in ${dirname}"
  exit 1
fi

. "${utils_path}"

set -e

# Run the command passed as argument
$@
