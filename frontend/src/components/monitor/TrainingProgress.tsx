import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { useTrainingMetrics } from "@/hooks/useTrainingMetrics"
import { useTrainingStore } from "@/stores/trainingStore"

function formatEta(seconds: number | null | undefined): string {
  if (seconds == null) return "--"
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`
  return `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`
}

const statusColors: Record<string, string> = {
  idle: "bg-muted text-muted-foreground",
  loading_model: "bg-yellow-500/15 text-yellow-500",
  preparing_data: "bg-yellow-500/15 text-yellow-500",
  training: "bg-blue-500/15 text-blue-500",
  stopping: "bg-orange-500/15 text-orange-500",
  completed: "bg-green-500/15 text-green-500",
  error: "bg-red-500/15 text-red-500",
}

const statusLabels: Record<string, string> = {
  idle: "Idle",
  loading_model: "Loading Model",
  preparing_data: "Preparing Data",
  training: "Training",
  stopping: "Stopping",
  completed: "Completed",
  error: "Error",
}

const isLoadingStatus = (s: string) => s === "loading_model" || s === "preparing_data"

export function TrainingProgress() {
  const { status, currentStep, totalSteps, latestMetric } = useTrainingMetrics()
  const logs = useTrainingStore((s) => s.logs)
  const pct = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : null

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className={statusColors[status] ?? ""}>
              {isLoadingStatus(status) && (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              )}
              {statusLabels[status] ?? status}
            </Badge>
            {status === "training" && (
              <span className="text-sm tabular-nums">
                Step {currentStep} / {totalSteps}
              </span>
            )}
            {isLoadingStatus(status) && lastLog && (
              <span className="text-sm text-muted-foreground">
                {lastLog}
              </span>
            )}
          </div>
          {latestMetric?.eta_seconds != null && status === "training" && (
            <span className="text-sm text-muted-foreground">
              ETA: {formatEta(latestMetric.eta_seconds)}
            </span>
          )}
        </div>
        <Progress value={isLoadingStatus(status) ? undefined : pct} className="h-2" />
      </CardContent>
    </Card>
  )
}
