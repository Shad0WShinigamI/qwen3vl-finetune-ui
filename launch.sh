#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONDA_ENV="unsloth"

cleanup() {
    echo "Shutting down..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo "Done."
}
trap cleanup EXIT INT TERM

# Start backend
echo "Starting backend (FastAPI :8000)..."
conda run -n "$CONDA_ENV" \
    uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload \
    --reload-exclude "unsloth_compiled_cache/*" --reload-exclude "data/*" --reload-exclude "outputs/*" &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend (Vite :5173)..."
conda run -n "$CONDA_ENV" \
    npm --prefix "$PROJECT_DIR/frontend" run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID | Frontend PID: $FRONTEND_PID"
echo "UI: http://localhost:5173  API: http://localhost:8000"

wait
