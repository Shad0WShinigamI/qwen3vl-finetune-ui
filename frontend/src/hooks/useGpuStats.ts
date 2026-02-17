import { useState, useEffect } from "react"
import { wsClient } from "@/lib/ws"
import type { GpuStats, WSMessage } from "@/lib/types"

export function useGpuStats(): GpuStats | null {
  const [stats, setStats] = useState<GpuStats | null>(null)

  useEffect(() => {
    const unsub = wsClient.subscribe((msg: WSMessage) => {
      if (msg.type === "gpu_stats") {
        setStats(msg.payload as unknown as GpuStats)
      }
    })
    return unsub
  }, [])

  return stats
}
