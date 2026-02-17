# Qwen3-VL Fine-Tuning UI

A full-stack web application for fine-tuning [Qwen3-VL](https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct) vision-language models using [Unsloth](https://github.com/unslothai/unsloth) for 2-5x faster training with 50-80% less VRAM.

FastAPI backend + React/Vite frontend with real-time WebSocket training progress, LoRA configuration, evaluation with token & classification metrics, and side-by-side base vs. fine-tuned model comparison.

## Features

- **CSV Dataset Management** — Upload CSVs, map columns (prompt, response, images), preview conversations
- **Mandatory Column Validation** — Mark image columns as required; rows with missing data are automatically skipped during training and evaluation
- **LoRA Fine-Tuning** — Configure rank, alpha, dropout, vision/language layer targeting with live loss curves and GPU monitoring
- **Evaluation** — Token-level (exact match, precision, recall, F1) and binary classification metrics with per-sample drill-down
- **Inference Playground** — Test prompts against base or fine-tuned models, compare outputs side-by-side
- **Session Management** — Save/restore training configurations across runs
- **Export** — Download evaluation results as CSV with row alignment preserved (skipped rows included with empty predictions)

## Requirements

- Python 3.12+
- NVIDIA GPU with CUDA support (tested on RTX 5090 32GB)
- Node.js 18+
- [Unsloth](https://github.com/unslothai/unsloth) and its dependencies (PyTorch, transformers, etc.)

## Setup

### Using venv (recommended)

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate

# Install Python dependencies (Unsloth must be installed separately first)
pip install -r requirements.txt

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Using Conda

```bash
# Assuming you have an environment with Unsloth already installed
conda activate unsloth
pip install -r requirements.txt
cd frontend && npm install && cd ..
```

## Running

### Using launch scripts

```bash
# venv (auto-activates .venv/)
./launch-venv.sh

# conda
./launch.sh
```

Both scripts start the backend (FastAPI on `:8000`) and frontend (Vite on `:5173`) concurrently, with a single Ctrl+C to shut both down.

### Manual startup

```bash
# Terminal 1 — Backend
source .venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload \
  --reload-exclude "unsloth_compiled_cache/*" --reload-exclude "data/*"

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:5173** in your browser.

## Project Structure

```
qwen3vl-ft/
├── backend/
│   ├── callbacks/       # Trainer callback for WS progress
│   ├── config.py        # Settings (env prefix: QWEN3VL_)
│   ├── database.py      # SQLite via SQLAlchemy async
│   ├── main.py          # FastAPI app, WebSocket, lifespan
│   ├── models/          # SQLAlchemy ORM models
│   ├── routers/         # API route handlers
│   │   ├── datasets.py  # Upload, mapping, preview
│   │   ├── evaluation.py# Eval runs, samples, export
│   │   ├── inference.py # Generate, compare
│   │   ├── sessions.py  # CRUD for training sessions
│   │   ├── system.py    # Health, GPU stats, model status
│   │   └── training.py  # Start/stop training, list adapters
│   ├── schemas/         # Pydantic request/response models
│   ├── services/        # Business logic
│   │   ├── dataset_service.py    # CSV loading, conversation building
│   │   ├── evaluation_service.py # Eval loop with skip logic
│   │   ├── inference_service.py  # Model inference
│   │   ├── model_manager.py      # Singleton model lifecycle
│   │   └── training_service.py   # SFTTrainer orchestration
│   ├── utils/           # GPU stats, image download, metrics
│   └── ws/              # WebSocket connection manager
├── frontend/
│   └── src/
│       ├── components/  # React components (shadcn/ui)
│       ├── hooks/       # WebSocket, GPU stats, hydration
│       ├── lib/         # API client, types, utilities
│       └── stores/      # Zustand state management
├── launch.sh            # Conda launch script
├── launch-venv.sh       # Venv launch script
├── Makefile             # Make targets (dev, backend, frontend)
└── requirements.txt     # Python deps (excluding Unsloth/torch)
```

## Configuration

Environment variables (prefix `QWEN3VL_`):

| Variable | Default | Description |
|----------|---------|-------------|
| `QWEN3VL_PORT` | `8000` | Backend port |
| `QWEN3VL_HOST` | `0.0.0.0` | Backend bind address |
| `QWEN3VL_DEBUG` | `true` | Debug mode |
| `QWEN3VL_DEFAULT_MODEL_NAME` | `unsloth/Qwen3-VL-8B-Instruct-unsloth-bnb-4bit` | Default model |
| `QWEN3VL_DEFAULT_MAX_SEQ_LENGTH` | `2048` | Default sequence length |

## API

The backend exposes a REST API at `http://localhost:8000`. See [`SKILL.md`](SKILL.md) for a complete API reference designed for programmatic/CLI usage without the frontend.

Key endpoints:
- `POST /api/datasets/upload` — Upload CSV
- `POST /api/datasets/mapping` — Set column mapping
- `POST /api/training/start` — Start fine-tuning
- `POST /api/evaluation/run` — Run evaluation
- `POST /api/inference/generate` — Generate text
- `GET /api/evaluation/export/{id}?format=csv` — Export results

## License

MIT
