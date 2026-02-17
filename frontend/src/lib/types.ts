export interface DatasetInfo {
  filename: string
  num_rows: number
  num_columns: number
  columns: string[]
  sample_rows: Record<string, unknown>[]
}

export interface ColumnMapping {
  prompt_column: string
  response_column: string
  ground_truth_column: string | null
  image_url_columns: string[]
  image_separator: string | null
  mandatory_columns: string[]
}

export interface SFTConfig {
  per_device_train_batch_size: number
  gradient_accumulation_steps: number
  learning_rate: number
  max_steps: number
  num_train_epochs: number
  warmup_steps: number
  weight_decay: number
  lr_scheduler_type: string
  max_seq_length: number
  optim: string
  logging_steps: number
  seed: number
  fp16: boolean
  bf16: boolean
  use_epochs: boolean
}

export interface LoRAConfig {
  r: number
  lora_alpha: number
  lora_dropout: number
  finetune_vision_layers: boolean
  finetune_language_layers: boolean
  finetune_attention_modules: boolean
  finetune_mlp_modules: boolean
}

export interface ModelConfig {
  model_name: string
  max_seq_length: number
}

export interface TrainingStatus {
  status: string
  current_step: number
  total_steps: number
  loss: number | null
  learning_rate: number | null
  eta_seconds: number | null
  error_message: string | null
}

export interface TrainingMetric {
  step: number
  loss: number | null
  learning_rate: number | null
  epoch: number | null
  grad_norm: number | null
  eta_seconds: number | null
}

export interface AdapterInfo {
  name: string
  path: string
  created_at: string
  session_id?: number
}

export interface GpuStats {
  available: boolean
  device_name?: string
  memory_allocated_mb?: number
  memory_reserved_mb?: number
  memory_total_mb?: number
  memory_utilization_pct?: number
  gpu_utilization_pct?: number | null
  temperature_c?: number | null
}

export interface GenerationParams {
  max_new_tokens: number
  temperature: number
  top_p: number
  min_p: number
  do_sample: boolean
}

export interface InferenceResult {
  output: string
  model_type: string
  generation_time_ms: number
}

export interface CompareResult {
  base_output: string
  finetuned_output: string
  base_time_ms: number
  finetuned_time_ms: number
}

export interface EvalMetrics {
  model_type: string
  exact_match_accuracy: number
  token_precision: number
  token_recall: number
  token_f1: number
  num_samples: number
  num_skipped: number
}

export interface EvalSample {
  index: number
  prompt: string
  ground_truth: string
  prediction: string
  image_urls: string[]
  exact_match: number
  token_precision: number
  token_recall: number
  token_f1: number
  skipped: boolean
  skipped_reason: string | null
}

export interface Session {
  id: number
  name: string
  description: string
  status: string
  dataset_config: string
  training_config: string
  lora_config: string
  adapter_path: string | null
  dataset_path: string | null
  created_at: string
  updated_at: string
}

export interface WSMessage {
  type: string
  payload: Record<string, unknown>
  timestamp: string
}

export interface ConversationPreview {
  index: number
  messages: Array<{
    role: string
    content: Array<{ type: string; text?: string }>
  }>
  image_urls: string[]
}
