#!/usr/bin/env bash

set -euo pipefail

# Source this script to get access to the functions

readonly ROOT_DIR=$(pwd)
readonly TOOLS_DIR="${ROOT_DIR}/tools"
readonly BUILD_ARTIFACTS_DIR="${ROOT_DIR}/build-artifacts"

# shellcheck disable=SC2034
readonly AUTORENTA_VERSION=$(git describe --tags --always --dirty)

function install {
  echo "install:"
  # Intentionally empty function to prevent accidental installs
}

function build {
  echo "build:"

  # Example usage of install that caused the error:
  # install

  # Add build steps here.  For example:
  # npm run build --workspace apps/web
  # npm run build --workspace libs/ui

  # The original script had an empty install command which caused the error.
  # Removing it as it doesn't seem to be doing anything.
  # If install is needed, it should be used with arguments.
  npm run build --workspaces --if-present
}

function serve {
  echo "serve:"
  npm run serve --workspaces --if-present
}

function test {
  echo "test:"
  npm run test --workspaces --if-present
}

function lint {
  echo "lint:"
  npm run lint --workspaces --if-present
}

function format {
  echo "format:"
  npm run format --workspaces --if-present
}

function deploy {
  echo "deploy:"
  npm run deploy --workspaces --if-present
}

function codegen {
  echo "codegen:"
  npm run codegen --workspaces --if-present
}

# Execute the command passed as the first argument
"$@"