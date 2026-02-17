import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useGpuStats } from "@/hooks/useGpuStats"
import { Cpu, Thermometer, MemoryStick } from "lucide-react"

export function GpuMonitor() {
  const stats = useGpuStats()

  if (!stats?.available) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">GPU Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {stats === null ? "Connecting..." : "No GPU available"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Cpu className="h-4 w-4" />
          {stats.device_name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MemoryStick className="h-3 w-3" />
              VRAM
            </span>
            <span className="tabular-nums">
              {stats.memory_allocated_mb?.toFixed(0)} / {stats.memory_total_mb?.toFixed(0)} MB
            </span>
          </div>
          <Progress value={stats.memory_utilization_pct ?? 0} className="h-2" />
        </div>

        {stats.gpu_utilization_pct != null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">GPU Utilization</span>
              <span className="tabular-nums">{stats.gpu_utilization_pct}%</span>
            </div>
            <Progress value={stats.gpu_utilization_pct} className="h-2" />
          </div>
        )}

        {stats.temperature_c != null && (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Thermometer className="h-3 w-3" />
              Temperature
            </span>
            <span className="tabular-nums">{stats.temperature_c}°C</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
