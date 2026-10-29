#!/bin/bash
# Guardian Stop — Combined startup (Web + Risk Engine)
set -e

cd "$(dirname "$0")"

# Detect Python
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "[STARTUP] WARNING: Python not found. Risk Engine will not start."
fi

# Install Python deps if needed
if [ -n "$PYTHON_CMD" ] && [ ! -f ".engine-deps-installed" ]; then
    echo "[STARTUP] Installing Python dependencies..."
    $PYTHON_CMD -m pip install -q -r requirements-engine.txt 2>/dev/null || pip3 install -q -r requirements-engine.txt 2>/dev/null || pip install -q -r requirements-engine.txt 2>/dev/null || true
    touch .engine-deps-installed
fi

# Start Risk Engine in background
if [ -n "$PYTHON_CMD" ]; then
    echo "[STARTUP] Starting Risk Engine..."
    $PYTHON_CMD engine/main.py &
    ENGINE_PID=$!
    echo "[STARTUP] Engine PID: $ENGINE_PID"
fi

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
