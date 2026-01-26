#!/bin/bash

set -e

COMMAND="$1"

if [ "$COMMAND" = "install" ]; then
  if [ -z "$AUTORENTA_SKIP_INSTALL" ]; then
    echo ". install: Running command: install"
    # Add necessary arguments to the install command here, or replace with appropriate installation steps
    # For example:
    # install source_file destination_directory
    echo ". install: No installation steps defined. Please update tools/run.sh"
    exit 1
  else
    echo ". install: Skipping install due to AUTORENTA_SKIP_INSTALL"
  fi
else
  echo ". ${COMMAND}: Running command: ${COMMAND}"
  ${COMMAND}
fi
