#!/usr/bin/env bash
# ==============================================================================
# StockProfile — Master Production Build & DMG Generator Script
# ==============================================================================
set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "========================================================"
echo "🚀 Building StockProfile macOS App & DMG Installer"
echo "========================================================"

# 1. Environment & Dependency Checks
echo "--> Checking build prerequisites..."
command -v node >/dev/null 2>&1 || { echo "Error: node is required"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Error: npm is required"; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo "Error: cargo is required"; exit 1; }
command -v rustc >/dev/null 2>&1 || { echo "Error: rustc is required"; exit 1; }

# 2. Python Virtual Environment & PyInstaller
echo "--> Preparing Python backend environment..."
if [ ! -d "backend/.venv" ]; then
    echo "Creating Python virtualenv..."
    if command -v uv >/dev/null 2>&1; then
        uv venv backend/.venv --python 3.12
    else
        python3 -m venv backend/.venv
    fi
fi

source backend/.venv/bin/activate

# Ensure PyInstaller is installed
if ! python -c "import PyInstaller" >/dev/null 2>&1; then
    echo "Installing PyInstaller..."
    if command -v uv >/dev/null 2>&1; then
        uv pip install --python backend/.venv pyinstaller
    else
        python -m pip install pyinstaller
    fi
fi

# 3. Build Self-Contained Backend Executable
echo "--> Freezing Python backend into standalone binary..."
pyinstaller \
    --name stockprofile-backend \
    --onefile \
    --clean \
    --noconfirm \
    --collect-all uvicorn \
    --collect-all fastapi \
    --collect-all yfinance \
    --collect-all aiosqlite \
    --collect-all keyring \
    --collect-all pyotp \
    --hidden-import=backend.main \
    --hidden-import=backend.models \
    --hidden-import=backend.database \
    --hidden-import=backend.sector_data \
    --hidden-import=backend.portfolio_aggregator \
    --hidden-import=backend.dividend_service \
    --hidden-import=backend.history_service \
    --hidden-import=backend.technical_service \
    --hidden-import=backend.alert_daemon \
    --hidden-import=backend.brokers.zerodha_adapter \
    --hidden-import=backend.brokers.angelone_adapter \
    --hidden-import=backend.brokers.mock_data \
    --paths=. \
    backend/entrypoint.py

# 4. Copy Backend Binary to Tauri Sidecar Binaries
TARGET_TRIPLE=$(rustc -vV | grep 'host:' | cut -d' ' -f2)
echo "--> Detected host architecture target: $TARGET_TRIPLE"
mkdir -p src-tauri/binaries
cp dist/stockprofile-backend "src-tauri/binaries/stockprofile-backend-${TARGET_TRIPLE}"
chmod +x "src-tauri/binaries/stockprofile-backend-${TARGET_TRIPLE}"

# 5. Build Frontend & Tauri App with DMG
echo "--> Building Tauri DMG package..."
npx tauri build --bundles dmg

# 6. Locate and Output DMG
DMG_PATH=$(find src-tauri/target/release/bundle/dmg -name "*.dmg" -type f | head -n 1)

echo ""
echo "========================================================"
echo "✅ BUILD COMPLETED SUCCESSFULLY!"
echo "========================================================"
if [ -n "$DMG_PATH" ] && [ -f "$DMG_PATH" ]; then
    DMG_SIZE=$(ls -lh "$DMG_PATH" | awk '{print $5}')
    echo "📦 DMG Installer: $DMG_PATH ($DMG_SIZE)"
    echo ""
    echo "To install StockProfile locally, run:"
    echo "  open \"$DMG_PATH\""
    echo "Then drag StockProfile.app into your /Applications folder."
else
    echo "Notice: Check src-tauri/target/release/bundle for generated app bundles."
fi
echo "========================================================"
