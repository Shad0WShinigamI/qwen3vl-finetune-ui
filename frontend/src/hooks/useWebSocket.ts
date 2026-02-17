import { useEffect } from "react"
import { wsClient } from "@/lib/ws"
import { useTrainingStore } from "@/stores/trainingStore"
import { useEvaluationStore } from "@/stores/evaluationStore"
import type { WSMessage, EvalMetrics } from "@/lib/types"
import type { ClassificationMetrics } from "@/stores/evaluationStore"

export function useWebSocket() {
  const addMetric = useTrainingStore((s) => s.addMetric)
  const setStatus = useTrainingStore((s) => s.setStatus)
  const addLog = useTrainingStore((s) => s.addLog)
  const setError = useTrainingStore((s) => s.setError)
  const setEvalProgress = useEvaluationStore((s) => s.setProgress)
  const setEvalRunning = useEvaluationStore((s) => s.setRunning)
  const setBaseMetrics = useEvaluationStore((s) => s.setBaseMetrics)
  const setFtMetrics = useEvaluationStore((s) => s.setFtMetrics)
  const setEvalError = useEvaluationStore((s) => s.setError)
  const setClassificationMetrics = useEvaluationStore((s) => s.setClassificationMetrics)
  const setLatestRunId = useEvaluationStore((s) => s.setLatestRunId)

  useEffect(() => {
    wsClient.connect()

    const unsub = wsClient.subscribe((msg: WSMessage) => {
      const p = msg.payload
      switch (msg.type) {
        case "training_status":
          setStatus(p.status as string)
          if (p.message) addLog(p.message as string)
          break
        case "training_started":
          setStatus("training")
          addLog(`Training started — ${p.total_steps} steps`)
          break
        case "training_step":
          addMetric({
            step: p.step as number,
            loss: (p.loss as number) ?? null,
            learning_rate: (p.learning_rate as number) ?? null,
            epoch: (p.epoch as number) ?? null,
            grad_norm: (p.grad_norm as number) ?? null,
            eta_seconds: (p.eta_seconds as number) ?? null,
          })
          break
        case "training_complete":
          setStatus("completed")
          addLog(`Training complete — ${p.total_steps} steps in ${p.total_time_seconds}s`)
          break
        case "training_error":
          setStatus("error")
          setError(p.error as string)
          addLog(`Error: ${p.error}`)
          break
        case "eval_progress":
          setEvalProgress(p.current as number, p.total as number)
          break
        case "eval_complete": {
          setEvalRunning(false)
          const metrics = p.metrics as EvalMetrics
          if (metrics.model_type === "base") {
            setBaseMetrics(metrics)
          } else {
            setFtMetrics(metrics)
          }
          if (p.classification_metrics) {
            setClassificationMetrics(p.classification_metrics as ClassificationMetrics)
          }
          if (p.run_id) {
            setLatestRunId(p.run_id as number)
          }
          break
        }
        case "eval_error":
          setEvalRunning(false)
          setEvalError(p.error as string)
          break
      }
    })

    return () => {
      unsub()
      wsClient.disconnect()
    }
  }, [addMetric, setStatus, addLog, setError, setEvalProgress, setEvalRunning, setBaseMetrics, setFtMetrics, setEvalError, setClassificationMetrics, setLatestRunId])
}
