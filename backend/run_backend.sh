#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
source "$DIR/.venv/bin/activate"
exec python -m uvicorn backend.main:app --host 127.0.0.1 --port 8765 --timeout-graceful-shutdown 1

