set -e

# Default command if none is provided
CMD=""
if [ -n "$1" ]; then
  CMD="$1"
fi

echo "Running command: $CMD"

case "$CMD" in
  build)
    echo "Running build steps..."
    # Add your build commands here
    pnpm -r build
    ;;
  install)
    if [ -z "$AUTORENTA_SKIP_INSTALL" ]; then
      echo "Running install steps..."
      # Add your install commands here
      pnpm install
    else
      echo "Skipping install command due to AUTORENTA_SKIP_INSTALL being set."
    fi
    ;;
  *)
    echo "Unknown command: $CMD"
    exit 1
    ;;

esac

echo "Done"