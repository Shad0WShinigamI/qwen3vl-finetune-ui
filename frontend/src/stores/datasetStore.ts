import { create } from "zustand"
import type { ColumnMapping, DatasetInfo } from "@/lib/types"

interface DatasetState {
  info: DatasetInfo | null
  columns: string[]
  mapping: ColumnMapping | null
  previewRows: Record<string, unknown>[]
  previewPage: number
  previewTotalPages: number
  totalRows: number
  loading: boolean
  error: string | null

  setInfo: (info: DatasetInfo) => void
  setColumns: (cols: string[]) => void
  setMapping: (mapping: ColumnMapping) => void
  setPreview: (rows: Record<string, unknown>[], page: number, totalPages: number, totalRows: number) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  reset: () => void
}

export const useDatasetStore = create<DatasetState>((set) => ({
  info: null,
  columns: [],
  mapping: null,
  previewRows: [],
  previewPage: 1,
  previewTotalPages: 0,
  totalRows: 0,
  loading: false,
  error: null,

  setInfo: (info) => set({ info, columns: info.columns, error: null }),
  setColumns: (columns) => set({ columns }),
  setMapping: (mapping) => set({ mapping }),
  setPreview: (rows, page, totalPages, totalRows) =>
    set({ previewRows: rows, previewPage: page, previewTotalPages: totalPages, totalRows }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  reset: () =>
    set({
      info: null,
      columns: [],
      mapping: null,
      previewRows: [],
      previewPage: 1,
      previewTotalPages: 0,
      totalRows: 0,
      loading: false,
      error: null,
    }),
}))
