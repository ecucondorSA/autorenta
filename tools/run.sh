#!/usr/bin/env bash
set -eo pipefail

# shellcheck source=./tools/utils.sh
. "$(dirname "${BASH_SOURCE[0]}")/utils.sh"

readonly command="$1"

# Run command
info "Running '$command' command..."

case "${command}" in
  build)
    info "Building..."

    # Build web app
    info "Building web app..."
    NG_BUILD_MAX_PARALLEL=2 npx ng build

    # Build payment worker
    info "Building payment worker..."
    cd apps/payment-worker
    npm install
    npm run build
    cd ../..
    ;; # End build)

  deploy)
    info "Deploying..."

    # Deploy web app
    info "Deploying web app..."
    firebase deploy --only hosting

    # Deploy payment worker
    info "Deploying payment worker..."
    wrangler deploy apps/payment-worker/dist/worker.js
    ;; # End deploy)

  *)
    error "Unknown command: ${command}"
    exit 1
    ;;

esac

info "Done."
