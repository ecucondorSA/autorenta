#!/bin/bash

# Fail on error
set -e

# Skip install if AUTORENTA_SKIP_INSTALL is set to 1
if [ "${AUTORENTA_SKIP_INSTALL}" != "1" ]; then
  install
fi

# Run the rest of the script
./scripts/validate-pr.sh
