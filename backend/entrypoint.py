import sys
import os
import uvicorn

# Ensure the parent directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app

if __name__ == "__main__":
    print("[StockProfile Backend] Starting uvicorn server on http://127.0.0.1:8765...")
    uvicorn.run(app, host="127.0.0.1", port=8765, timeout_graceful_shutdown=1)
