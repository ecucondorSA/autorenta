#!/usr/bin/env bash

set -e

# Default command if none is provided
COMMAND="start"

if [ -n "$1" ]; then
  COMMAND="$1"
fi

# Load environment variables from .env files
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | xargs -0) # Load .env.local, ignoring comments
fi
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs -0) # Load .env, ignoring comments
fi

# Function to execute commands within each package
run_in_each_package() {
  local script_name="$1"
  local package
  for package in packages/* apps/*;
  do
    if [ -d "$package" ]; then
      echo "Running ${script_name} in $package"
      pushd "$package" > /dev/null
      if [ -f package.json ]; then
        if grep -q "scripts" package.json > /dev/null; then
          if jq -e ".scripts.${script_name}" package.json > /dev/null 2>&1; then
            pnpm run "${script_name}"
          else
            echo "Skipping ${script_name} in $package: script not found in package.json"
          fi
        else
          echo "Skipping ${script_name} in $package: no scripts defined in package.json"
        fi
      else
        echo "Skipping ${script_name} in $package: no package.json found"
      fi
      popd > /dev/null
    fi
  done
}

case "${COMMAND}" in
  "install")
    # Only run install if AUTORENTA_SKIP_INSTALL is not set
    if [ -z "${AUTORENTA_SKIP_INSTALL}" ]; then
      echo "Running install in all packages"
      run_in_each_package "install"
    else
      echo "Skipping install due to AUTORENTA_SKIP_INSTALL"
    fi
    ;;
  "build")
    echo "Running build in all packages"
    run_in_each_package "build"
    ;;
  "test")
    echo "Running test in all packages"
    run_in_each_package "test"
    ;;
  "lint")
    echo "Running lint in all packages"
    run_in_each_package "lint"
    ;;
  "format")
    echo "Running format in all packages"
    run_in_each_package "format"
    ;;
  "start")
    echo "Running start in apps/web"
    pushd "apps/web" > /dev/null
    pnpm run start
    popd > /dev/null
    ;;
  *) # Default case
    echo "Unknown command: ${COMMAND}"
    exit 1
    ;;
esac

echo "Done."
