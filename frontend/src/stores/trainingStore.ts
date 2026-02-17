import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { SFTConfig, LoRAConfig, ModelConfig, TrainingMetric } from "@/lib/types"

interface TrainingState {
  modelConfig: ModelConfig
  sftConfig: SFTConfig
  loraConfig: LoRAConfig
  status: string
  currentStep: number
  totalSteps: number
  metrics: TrainingMetric[]
  logs: string[]
  lastAdapterPath: string | null
  error: string | null

  setModelConfig: (c: Partial<ModelConfig>) => void
  setSftConfig: (c: Partial<SFTConfig>) => void
  setLoraConfig: (c: Partial<LoRAConfig>) => void
  setStatus: (s: string) => void
  addMetric: (m: TrainingMetric) => void
  addLog: (l: string) => void
  setLastAdapterPath: (p: string | null) => void
  setError: (e: string | null) => void
  reset: () => void
}

const defaultSft: SFTConfig = {
  per_device_train_batch_size: 2,
  gradient_accumulation_steps: 4,
  learning_rate: 2e-4,
  max_steps: 30,
  num_train_epochs: 1,
  warmup_steps: 5,
  weight_decay: 0.01,
  lr_scheduler_type: "linear",
  max_seq_length: 2048,
  optim: "adamw_8bit",
  logging_steps: 1,
  seed: 3407,
  fp16: false,
  bf16: true,
  use_epochs: false,
}

const defaultLora: LoRAConfig = {
  r: 16,
  lora_alpha: 16,
  lora_dropout: 0.0,
  finetune_vision_layers: true,
  finetune_language_layers: true,
  finetune_attention_modules: true,
  finetune_mlp_modules: true,
}

export const useTrainingStore = create<TrainingState>()(
  persist(
    (set) => ({
      modelConfig: { model_name: "unsloth/Qwen3-VL-8B-Instruct-unsloth-bnb-4bit", max_seq_length: 2048 },
      sftConfig: { ...defaultSft },
      loraConfig: { ...defaultLora },
      status: "idle",
      currentStep: 0,
      totalSteps: 0,
      metrics: [],
      logs: [],
      lastAdapterPath: null,
      error: null,

      setModelConfig: (c) => set((s) => ({ modelConfig: { ...s.modelConfig, ...c } })),
      setSftConfig: (c) => set((s) => ({ sftConfig: { ...s.sftConfig, ...c } })),
      setLoraConfig: (c) => set((s) => ({ loraConfig: { ...s.loraConfig, ...c } })),
      setStatus: (status) => set({ status }),
      addMetric: (m) => set((s) => ({ metrics: [...s.metrics, m], currentStep: m.step, totalSteps: Math.max(s.totalSteps, m.step) })),
      addLog: (l) => set((s) => ({ logs: [...s.logs, l] })),
      setLastAdapterPath: (p) => set({ lastAdapterPath: p }),
      setError: (e) => set({ error: e }),
      reset: () =>
        set({
          status: "idle",
          currentStep: 0,
          totalSteps: 0,
          metrics: [],
          logs: [],
          lastAdapterPath: null,
          error: null,
        }),
    }),
    {
      name: "qwen3vl-training",
      partialize: (state) => ({
        modelConfig: state.modelConfig,
        sftConfig: state.sftConfig,
        loraConfig: state.loraConfig,
        lastAdapterPath: state.lastAdapterPath,
        // Only persist last 500 metrics and last 100 logs to avoid localStorage bloat
        metrics: state.metrics.slice(-500),
        logs: state.logs.slice(-100),
        currentStep: state.currentStep,
        totalSteps: state.totalSteps,
      }),
    },
  ),
)
