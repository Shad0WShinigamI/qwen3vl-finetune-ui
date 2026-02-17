import { Card, CardContent } from "@/components/ui/card"
import { useTrainingMetrics } from "@/hooks/useTrainingMetrics"

export function TrainingStats() {
  const { latestMetric, status } = useTrainingMetrics()

  if (status === "idle") return null

  const stats = [
    {
      label: "Loss",
      value: latestMetric?.loss?.toFixed(4) ?? "--",
    },
    {
      label: "Learning Rate",
      value: latestMetric?.learning_rate?.toExponential(2) ?? "--",
    },
    {
      label: "Epoch",
      value: latestMetric?.epoch?.toFixed(2) ?? "--",
    },
    {
      label: "Grad Norm",
      value: latestMetric?.grad_norm?.toFixed(4) ?? "--",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-xl font-semibold tabular-nums mt-1">{s.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
