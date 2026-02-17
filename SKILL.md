# Qwen3-VL Fine-Tuning — Backend API Skill

Use this document to operate the Qwen3-VL fine-tuning backend directly via `curl` or any HTTP client. No frontend is needed. The backend runs at `http://localhost:8000`.

## Quick Start

```bash
# Start backend only (from project root)
source .venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

The backend is ready when `GET /api/system/health` returns `{"status": "ok"}`.

## Workflow

The typical end-to-end workflow is:

1. **Upload** a CSV dataset
2. **Map** columns (prompt, response, images, mandatory)
3. **Train** a LoRA adapter
4. **Evaluate** base vs. fine-tuned model
5. **Export** results
6. **Infer** on new prompts

---

## 1. System

### Health Check
```bash
curl http://localhost:8000/api/system/health
# {"status": "ok"}
```

### GPU Stats
```bash
curl http://localhost:8000/api/system/gpu
# {"available": true, "device_name": "NVIDIA RTX 5090", "memory_total_mb": 32768, ...}
```

### Model Status
```bash
curl http://localhost:8000/api/system/model-status
# {"loaded": false, "mode": null, "adapter": null}
```

### Unload Model (free VRAM)
```bash
curl -X POST http://localhost:8000/api/system/unload-model
```

---

## 2. Dataset

### Upload CSV
```bash
curl -X POST http://localhost:8000/api/datasets/upload \
  -F "file=@/path/to/dataset.csv"
```
Response:
```json
{
  "filename": "dataset.csv",
  "num_rows": 709,
  "num_columns": 12,
  "columns": ["prompt", "response", "image_url", ...],
  "sample_rows": [...]
}
```

### List Columns
```bash
curl http://localhost:8000/api/datasets/columns
# {"columns": ["col1", "col2", ...]}
```

### Set Column Mapping
```bash
curl -X POST http://localhost:8000/api/datasets/mapping \
  -H "Content-Type: application/json" \
  -d '{
    "prompt_column": "prompt",
    "response_column": "response",
    "ground_truth_column": null,
    "image_url_columns": ["input_image_url", "swapped_image"],
    "image_separator": null,
    "mandatory_columns": ["input_image_url"]
  }'
```
- `mandatory_columns`: rows where these columns are empty will be **skipped** during training and evaluation. Use this for image columns that must have a URL.

### Get Current Mapping
```bash
curl http://localhost:8000/api/datasets/mapping
```

### Dataset Info
```bash
curl http://localhost:8000/api/datasets/info
# {"loaded": true, "filename": "dataset.csv", "num_rows": 709, "num_columns": 12, "columns": [...]}
```

### Preview Rows
```bash
curl -X POST http://localhost:8000/api/datasets/preview \
  -H "Content-Type: application/json" \
  -d '{"page": 1, "page_size": 5}'
```

### Preview Conversations (as model will see them)
```bash
curl "http://localhost:8000/api/datasets/preview/conversations?start=0&count=3"
```

---

## 3. Training

### Start Training
```bash
curl -X POST http://localhost:8000/api/training/start \
  -H "Content-Type: application/json" \
  -d '{
    "model_config_data": {
      "model_name": "unsloth/Qwen3-VL-8B-Instruct-unsloth-bnb-4bit",
      "max_seq_length": 2048
    },
    "sft_config": {
      "per_device_train_batch_size": 2,
      "gradient_accumulation_steps": 4,
      "learning_rate": 2e-4,
      "max_steps": 30,
      "warmup_steps": 5,
      "weight_decay": 0.01,
      "lr_scheduler_type": "linear",
      "max_seq_length": 2048,
      "optim": "adamw_8bit",
      "logging_steps": 1,
      "seed": 3407,
      "fp16": false,
      "bf16": true,
      "use_epochs": false
    },
    "lora_config": {
      "r": 16,
      "lora_alpha": 16,
      "lora_dropout": 0.0,
      "finetune_vision_layers": true,
      "finetune_language_layers": true,
      "finetune_attention_modules": true,
      "finetune_mlp_modules": true
    }
  }'
# {"status": "started"}
```

All fields have defaults — you can send `{}` for a quick run with default settings.

### Poll Training Status
```bash
curl http://localhost:8000/api/training/status
# {"status": "training", "current_step": 15, "total_steps": 30, "loss": 0.42, ...}
```

Status values: `idle` → `loading_model` → `preparing_data` → `training` → `completed` / `error` / `stopping`

### Stop Training (graceful)
```bash
curl -X POST http://localhost:8000/api/training/stop
# {"status": "stopping"}
```
The trainer finishes the current step and saves the adapter.

### List Saved Adapters
```bash
curl http://localhost:8000/api/training/adapters
# {"adapters": [{"name": "adapter_20260215_143022", "path": "/path/to/adapter", "created_at": "..."}]}
```

---

## 4. Evaluation

### Run Evaluation
```bash
curl -X POST http://localhost:8000/api/evaluation/run \
  -H "Content-Type: application/json" \
  -d '{
    "adapter_path": null,
    "sample_limit": 100,
    "classification_mode": false,
    "generation_params": {
      "max_new_tokens": 256,
      "temperature": 0.1,
      "do_sample": false
    }
  }'
# {"status": "started", "model_type": "base"}
```
- `adapter_path: null` = base model, or set to an adapter path from `/api/training/adapters`
- `sample_limit`: how many rows to evaluate (from the top of the CSV)
- `classification_mode: true` adds binary classification metrics (accuracy, precision, recall, F1, confusion matrix)
- Rows with empty mandatory columns are **skipped** but still included in results (with `skipped: true`) to preserve row alignment

### Poll Evaluation Status
```bash
curl http://localhost:8000/api/evaluation/status
# {"running": true, "model_type": "base"}
```

Evaluation completion is broadcast via WebSocket (`eval_complete` event). Alternatively, poll `/api/evaluation/runs` until a new run appears.

### List Evaluation Runs
```bash
curl http://localhost:8000/api/evaluation/runs
```
Response:
```json
{
  "runs": [
    {
      "id": 3,
      "model_type": "finetuned",
      "eval_mode": "token",
      "num_samples": 100,
      "num_skipped": 5,
      "exact_match_accuracy": 0.7368,
      "token_precision": 0.8521,
      "token_recall": 0.8234,
      "token_f1": 0.8375,
      "created_at": "2026-02-17T10:30:00"
    }
  ]
}
```

### Get Run Details
```bash
curl http://localhost:8000/api/evaluation/runs/3
```

### Get Samples (paginated)
```bash
curl "http://localhost:8000/api/evaluation/runs/3/samples?page=1&page_size=20"
```
Response includes per-sample: `index`, `prompt`, `ground_truth`, `prediction`, `exact_match`, `token_f1`, `token_precision`, `token_recall`, `skipped`, `skipped_reason`.

### Export Results as CSV
```bash
curl -o eval_results.csv "http://localhost:8000/api/evaluation/export/3?format=csv"
```
The CSV includes ALL rows (skipped ones have empty prediction, `skipped=True`, and the reason). This preserves 1:1 alignment with the original dataset for easy paste-back.

### Export Results as JSON
```bash
curl "http://localhost:8000/api/evaluation/export/3?format=json"
```

### Delete a Run
```bash
curl -X DELETE http://localhost:8000/api/evaluation/runs/3
```

---

## 5. Inference

### Generate (single model)
```bash
curl -X POST http://localhost:8000/api/inference/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Describe what you see in this image",
    "image_urls": ["https://example.com/photo.jpg"],
    "adapter_path": null,
    "generation_params": {
      "max_new_tokens": 256,
      "temperature": 0.7,
      "top_p": 0.9,
      "min_p": 0.0,
      "do_sample": true
    }
  }'
```
Response:
```json
{
  "output": "The image shows...",
  "model_type": "base",
  "generation_time_ms": 1234.5
}
```

### Compare (base vs. fine-tuned)
```bash
curl -X POST http://localhost:8000/api/inference/compare \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Describe what you see",
    "image_urls": ["https://example.com/photo.jpg"],
    "adapter_path": "/path/to/adapter_20260215_143022"
  }'
```
Response:
```json
{
  "base_output": "...",
  "finetuned_output": "...",
  "base_time_ms": 1100.0,
  "finetuned_time_ms": 1250.0
}
```

---

## 6. Sessions

Sessions save training configurations for reuse.

### Create Session
```bash
curl -X POST http://localhost:8000/api/sessions/ \
  -H "Content-Type: application/json" \
  -d '{"name": "experiment-1", "description": "Testing lr=2e-4"}'
```

### List Sessions
```bash
curl http://localhost:8000/api/sessions/
```

### Save Config to Session
```bash
curl -X POST http://localhost:8000/api/sessions/1/save-config \
  -H "Content-Type: application/json" \
  -d '{
    "training_config": "{\"max_steps\": 60, \"learning_rate\": 1e-4}",
    "adapter_path": "/path/to/adapter",
    "status": "completed"
  }'
```

### Clone Session
```bash
curl -X POST http://localhost:8000/api/sessions/1/clone
```

### Delete Session
```bash
curl -X DELETE http://localhost:8000/api/sessions/1
```

---

## WebSocket

Connect to `ws://localhost:8000/ws` for real-time events:

| Event | Payload | When |
|-------|---------|------|
| `gpu_stats` | GPU utilization, memory, temp | Every 2s |
| `training_status` | status, message | During training lifecycle |
| `training_progress` | step, loss, lr, eta | Each training step |
| `training_complete` | metrics, adapter_path | Training finished |
| `training_error` | error message | Training failed |
| `eval_progress` | current, total, model_type | During evaluation |
| `eval_complete` | metrics, run_id | Evaluation finished |
| `eval_error` | error message | Evaluation failed |

---

## Typical Scripted Workflow

```bash
BASE=http://localhost:8000

# 1. Upload dataset
curl -X POST $BASE/api/datasets/upload -F "file=@data.csv"

# 2. Map columns
curl -X POST $BASE/api/datasets/mapping \
  -H "Content-Type: application/json" \
  -d '{"prompt_column":"prompt","response_column":"answer","image_url_columns":["image"],"mandatory_columns":["image"]}'

# 3. Train (defaults are fine for a quick test)
curl -X POST $BASE/api/training/start -H "Content-Type: application/json" -d '{}'

# 4. Wait for training to complete
while true; do
  STATUS=$(curl -s $BASE/api/training/status | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
  echo "Training: $STATUS"
  [ "$STATUS" = "completed" ] || [ "$STATUS" = "error" ] && break
  sleep 5
done

# 5. Get adapter path
ADAPTER=$(curl -s $BASE/api/training/adapters | python3 -c "import sys,json; print(json.load(sys.stdin)['adapters'][-1]['path'])")

# 6. Evaluate base model
curl -X POST $BASE/api/evaluation/run \
  -H "Content-Type: application/json" \
  -d "{\"adapter_path\":null,\"sample_limit\":50}"

# 7. Wait for eval, then evaluate fine-tuned
sleep 30  # or poll /api/evaluation/status
curl -X POST $BASE/api/evaluation/run \
  -H "Content-Type: application/json" \
  -d "{\"adapter_path\":\"$ADAPTER\",\"sample_limit\":50}"

# 8. Export results
sleep 30
RUN_ID=$(curl -s $BASE/api/evaluation/runs | python3 -c "import sys,json; print(json.load(sys.stdin)['runs'][0]['id'])")
curl -o results.csv "$BASE/api/evaluation/export/$RUN_ID?format=csv"
```
