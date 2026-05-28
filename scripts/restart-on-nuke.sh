#!/bin/bash
while true; do
  echo "Starting preview on 5173 with username fix (auto top-up after entry, faucet connected)..."
  ./node_modules/.bin/vite preview --host 0.0.0.0 --port 5173
  echo "Preview nuked (exit -9). Restarting in 2s..."
  sleep 2
done