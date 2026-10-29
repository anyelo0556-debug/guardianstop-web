#!/bin/bash
# Guardian Stop — Combined startup (Web + Risk Engine)
set -e

cd "$(dirname "$0")"

# Install Python deps if needed
if [ ! -f ".engine-deps-installed" ]; then
    echo "[STARTUP] Installing Python dependencies..."
    pip install -q -r requirements-engine.txt
    touch .engine-deps-installed
fi

# Start Risk Engine in background
echo "[STARTUP] Starting Risk Engine..."
python engine/main.py &
ENGINE_PID=$!
echo "[STARTUP] Engine PID: $ENGINE_PID"

# Start Web server
echo "[STARTUP] Starting Web server..."
NODE_ENV=production node dist/boot.js &
WEB_PID=$!
echo "[STARTUP] Web PID: $WEB_PID"

# Handle shutdown gracefully
shutdown() {
    echo "[STARTUP] Shutting down..."
    kill $ENGINE_PID 2>/dev/null || true
    kill $WEB_PID 2>/dev/null || true
    wait
    exit 0
}
trap shutdown SIGINT SIGTERM

# Wait for both processes
wait
