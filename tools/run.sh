#!/bin/bash

MAX_RETRIES=2
RETRY_DELAY=60  # seconds

build() {
  local attempt=0
  while true; do
    attempt=$((attempt + 1))
    echo "Attempting build (Attempt $attempt/$MAX_RETRIES)"

    # Check available memory (example, adjust as needed)
    free -m | awk '/Mem:/ { if ($4 < 500) { print "Low memory, exiting..."; exit 1; } }'

    npm run build:components && npm run build:web && npm run build:worker && npm run build:e2e # Run all build tasks

    if [ $? -eq 0 ]; then
      echo "Build succeeded on attempt $attempt."
      break
    else
      echo "Build failed on attempt $attempt."
      if [ $attempt -ge $MAX_RETRIES ]; then
        echo "Max retries reached. Build failed."
        exit 1
      fi
      echo "Waiting $RETRY_DELAY seconds before retrying..."
      sleep $RETRY_DELAY

      # Clean up resources (example, adjust as needed)
      npm cache clean --force
      # killall -9 node  # Use with caution, may disrupt other processes

    fi
done
}

build