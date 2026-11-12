#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "🚀 Starting StockProfile (Indian Stock Portfolio & Alert Desktop App)..."

# 1. Start Python FastAPI Sidecar Daemon if not running
if lsof -Pi :8765 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Python backend daemon already running on http://127.0.0.1:8765"
else
    echo "⚡ Launching Python backend daemon on http://127.0.0.1:8765..."
    bash "$DIR/backend/run_backend.sh" > "$DIR/backend/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$DIR/.backend.pid"
    
    # Wait for backend to be ready
    for i in {1..30}; do
        if curl -s http://127.0.0.1:8765/api/health >/dev/null; then
            echo "✅ Python backend daemon is live and listening!"
            break
        fi
        sleep 0.5
    done
fi

# 2. Launch Tauri Desktop App
export PATH="$HOME/.cargo/bin:$PATH"
if [ -f "$DIR/src-tauri/target/debug/stock_profile" ]; then
    echo "🖥️  Launching StockProfile native macOS window..."
    exec "$DIR/src-tauri/target/debug/stock_profile"
else
    echo "🖥️  Launching via npm run tauri dev..."
    exec npm run tauri dev
fi
