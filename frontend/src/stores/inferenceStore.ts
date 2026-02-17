import { create } from "zustand"
import type { GenerationParams, AdapterInfo } from "@/lib/types"

interface InferenceState {
  prompt: string
  imageUrls: string[]
  selectedAdapter: string | null
  adapters: AdapterInfo[]
  generationParams: GenerationParams
  baseOutput: string | null
  ftOutput: string | null
  baseTimeMs: number | null
  ftTimeMs: number | null
  loading: boolean
  error: string | null

  setPrompt: (p: string) => void
  setImageUrls: (urls: string[]) => void
  setSelectedAdapter: (a: string | null) => void
  setAdapters: (a: AdapterInfo[]) => void
  setGenerationParams: (p: Partial<GenerationParams>) => void
  setResults: (base: string | null, ft: string | null, baseMs: number | null, ftMs: number | null) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
}

export const useInferenceStore = create<InferenceState>((set) => ({
  prompt: "",
  imageUrls: [],
  selectedAdapter: null,
  adapters: [],
  generationParams: {
    max_new_tokens: 256,
    temperature: 0.7,
    top_p: 0.9,
    min_p: 0.0,
    do_sample: true,
  },
  baseOutput: null,
  ftOutput: null,
  baseTimeMs: null,
  ftTimeMs: null,
  loading: false,
  error: null,

  setPrompt: (prompt) => set({ prompt }),
  setImageUrls: (imageUrls) => set({ imageUrls }),
  setSelectedAdapter: (selectedAdapter) => set({ selectedAdapter }),
  setAdapters: (adapters) => set({ adapters }),
  setGenerationParams: (p) =>
    set((s) => ({ generationParams: { ...s.generationParams, ...p } })),
  setResults: (baseOutput, ftOutput, baseTimeMs, ftTimeMs) =>
    set({ baseOutput, ftOutput, baseTimeMs, ftTimeMs }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}))
