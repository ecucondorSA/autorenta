#!/bin/bash
# Wrapper para forzar flags de Chrome en entornos restringidos
exec /usr/bin/google-chrome 
  --no-sandbox 
  --disable-setuid-sandbox 
  --disable-dev-shm-usage 
  --disable-accelerated-2d-canvas 
  --no-first-run 
  --no-zygote 
  --single-process 
  --disable-gpu 
  "$@"
