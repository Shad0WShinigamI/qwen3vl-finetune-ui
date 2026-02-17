import { create } from "zustand"
import type { EvalMetrics } from "@/lib/types"

export interface ClassificationMetrics {
  accuracy: number
  precision: number
  recall: number
  f1: number
  tp: number
  fp: number
  tn: number
  fn: number
  total: number
  model_type: string
}

interface EvaluationState {
  running: boolean
  progress: number
  total: number
  baseMetrics: EvalMetrics | null
  ftMetrics: EvalMetrics | null
  classificationMetrics: ClassificationMetrics | null
  latestRunId: number | null
  sampleLimit: number
  classificationMode: boolean
  error: string | null

  setRunning: (v: boolean) => void
  setProgress: (current: number, total: number) => void
  setBaseMetrics: (m: EvalMetrics | null) => void
  setFtMetrics: (m: EvalMetrics | null) => void
  setClassificationMetrics: (m: ClassificationMetrics | null) => void
  setLatestRunId: (id: number | null) => void
  setSampleLimit: (n: number) => void
  setClassificationMode: (v: boolean) => void
  setError: (e: string | null) => void
  reset: () => void
}

export const useEvaluationStore = create<EvaluationState>((set) => ({
  running: false,
  progress: 0,
  total: 0,
  baseMetrics: null,
  ftMetrics: null,
  classificationMetrics: null,
  latestRunId: null,
  sampleLimit: 50,
  classificationMode: false,
  error: null,

  setRunning: (running) => set({ running }),
  setProgress: (progress, total) => set({ progress, total }),
  setBaseMetrics: (baseMetrics) => set({ baseMetrics }),
  setFtMetrics: (ftMetrics) => set({ ftMetrics }),
  setClassificationMetrics: (classificationMetrics) => set({ classificationMetrics }),
  setLatestRunId: (latestRunId) => set({ latestRunId }),
  setSampleLimit: (sampleLimit) => set({ sampleLimit }),
  setClassificationMode: (classificationMode) => set({ classificationMode }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      running: false,
      progress: 0,
      total: 0,
      baseMetrics: null,
      ftMetrics: null,
      classificationMetrics: null,
      latestRunId: null,
      error: null,
    }),
}))
