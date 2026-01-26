#!/usr/bin/env bash

set -e

# This script is used to run commands in the context of the monorepo.
# It ensures that the correct version of Node.js is used and that the
# correct environment variables are set.

# Load environment variables from .env files
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null;
then
  echo "Node.js could not be found."
  echo "Please install Node.js and try again."
  exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null;
then
  echo "pnpm could not be found."
  echo "Please install pnpm and try again."
  exit 1
fi

# Get the command to run
COMMAND="$@"

# If no command is specified, print usage
if [ -z "$COMMAND" ]; then
  echo "Usage: ./tools/run.sh <command>"
  exit 1
fi

# Run the command
eval "$COMMAND"
