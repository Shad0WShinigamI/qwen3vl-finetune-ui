import { useEffect, useRef } from "react"
import { api } from "@/lib/api"
import { useDatasetStore } from "@/stores/datasetStore"
import { useTrainingStore } from "@/stores/trainingStore"
import type { ColumnMapping, DatasetInfo } from "@/lib/types"

export function useHydrate() {
  const status = useTrainingStore((s) => s.status)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initial hydration on mount
  useEffect(() => {
    hydrateDataset()
    hydrateTrainingStatus()
  }, [])

  // Poll backend status while in an active state
  useEffect(() => {
    const isActive = ["loading_model", "preparing_data", "training", "stopping"].includes(status)

    if (isActive && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.trainingStatus() as Record<string, unknown>
          const backendStatus = res.status as string
          const store = useTrainingStore.getState()

          // Sync status from backend
          if (backendStatus !== store.status) {
            store.setStatus(backendStatus)
          }
          // If backend says error, capture message
          if (backendStatus === "error" && res.error_message) {
            store.setError(res.error_message as string)
            store.addLog(`Error: ${res.error_message}`)
          }
        } catch {
          // backend unreachable
        }
      }, 2000)
    }

    if (!isActive && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [status])
}

async function hydrateDataset() {
  try {
    const info = await api.datasetInfo() as Record<string, unknown>
    if (!info.loaded) return

    const dsInfo: DatasetInfo = {
      filename: info.filename as string,
      num_rows: info.num_rows as number,
      num_columns: info.num_columns as number,
      columns: info.columns as string[],
      sample_rows: [],
    }
    useDatasetStore.getState().setInfo(dsInfo)

    try {
      const preview = await api.previewDataset(1, 20)
      useDatasetStore.getState().setPreview(
        preview.rows,
        preview.page,
        preview.total_pages,
        preview.total_rows,
      )
    } catch {
      // ignore
    }

    try {
      const mappingRes = await api.getMapping()
      if (mappingRes.mapping) {
        useDatasetStore.getState().setMapping(mappingRes.mapping as unknown as ColumnMapping)
      }
    } catch {
      // ignore
    }
  } catch {
    // Backend not available yet
  }
}

async function hydrateTrainingStatus() {
  try {
    const res = await api.trainingStatus() as Record<string, unknown>
    const backendStatus = res.status as string
    // Always sync status from backend — it's the source of truth
    useTrainingStore.getState().setStatus(backendStatus)
    if (backendStatus === "error" && res.error_message) {
      useTrainingStore.getState().setError(res.error_message as string)
    }
  } catch {
    // Backend unreachable — reset to idle to avoid stale stuck states
    useTrainingStore.getState().setStatus("idle")
  }
}
