#!/bin/bash
# Guardian Stop Risk Engine startup script
set -e

echo "[ENGINE] Installing Python dependencies..."
pip install -q -r requirements-engine.txt

echo "[ENGINE] Starting risk engine..."
python engine/main.py
