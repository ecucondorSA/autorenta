#!/bin/bash
# Load env vars
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi
if [ -f .env.development.local ]; then
  export $(grep -v '^#' .env.development.local | xargs)
fi

export NODE_OPTIONS="--max-old-space-size=4096"
cd apps/web
NG_BIN="./node_modules/.bin/ng"
echo "Starting $NG_BIN serve..."
nohup $NG_BIN serve --configuration development-low-spec --host 0.0.0.0 --port 4200 > ../../server_direct.log 2>&1 &
echo $! > ../../server_direct.pid
echo "Started PID $(cat ../../server_direct.pid)"