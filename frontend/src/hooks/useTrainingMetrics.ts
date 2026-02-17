import { useTrainingStore } from "@/stores/trainingStore"

export function useTrainingMetrics() {
  const metrics = useTrainingStore((s) => s.metrics)
  const currentStep = useTrainingStore((s) => s.currentStep)
  const totalSteps = useTrainingStore((s) => s.totalSteps)
  const status = useTrainingStore((s) => s.status)

  const latestMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null

  const lossData = metrics
    .filter((m) => m.loss != null)
    .map((m) => ({ step: m.step, loss: m.loss! }))

  const lrData = metrics
    .filter((m) => m.learning_rate != null)
    .map((m) => ({ step: m.step, lr: m.learning_rate! }))

  return {
    metrics,
    currentStep,
    totalSteps,
    status,
    latestMetric,
    lossData,
    lrData,
  }
}
