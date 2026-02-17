import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Play, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { useEvaluationStore } from "@/stores/evaluationStore"
import { useInferenceStore } from "@/stores/inferenceStore"
import { useDatasetStore } from "@/stores/datasetStore"
import type { AdapterInfo } from "@/lib/types"

export function EvalConfigPanel() {
  const {
    running, progress, total, sampleLimit, classificationMode,
    setSampleLimit, setClassificationMode, setRunning, setError,
  } = useEvaluationStore()
  const adapters = useInferenceStore((s) => s.adapters)
  const setAdapters = useInferenceStore((s) => s.setAdapters)
  const datasetInfo = useDatasetStore((s) => s.info)
  const mapping = useDatasetStore((s) => s.mapping)

  useEffect(() => {
    api.listAdapters().then((res) => {
      setAdapters(res.adapters as unknown as AdapterInfo[])
    }).catch(() => {})
  }, [setAdapters])

  const handleRunEval = async (adapterPath: string | null) => {
    if (!datasetInfo || !mapping) return
    setRunning(true)
    setError(null)
    try {
      await api.runEval({
        adapter_path: adapterPath,
        sample_limit: sampleLimit,
        classification_mode: classificationMode,
        generation_params: {
          max_new_tokens: 256,
          temperature: 0.1,
          do_sample: false,
        },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed")
      setRunning(false)
    }
  }

  const canRun = datasetInfo && mapping && !running

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Evaluation Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Sample Limit: {sampleLimit}</Label>
          <Slider
            value={[sampleLimit]}
            onValueChange={([v]) => setSampleLimit(v)}
            min={5}
            max={500}
            step={5}
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={classificationMode}
            onCheckedChange={setClassificationMode}
          />
          <div>
            <Label className="text-xs">Binary Classification Mode</Label>
            <p className="text-[11px] text-muted-foreground">
              For yes/no, true/false tasks. Computes TP/FP/TN/FN, accuracy, precision, recall, F1.
            </p>
          </div>
        </div>

        {running && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Evaluating...
              </span>
              <span className="tabular-nums">{progress} / {total}</span>
            </div>
            <Progress value={total > 0 ? (progress / total) * 100 : 0} className="h-2" />
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            disabled={!canRun}
            onClick={() => handleRunEval(null)}
            className="gap-2"
          >
            <Play className="h-3 w-3" />
            Eval Base Model
          </Button>
          {adapters.map((a) => (
            <Button
              key={a.path}
              size="sm"
              disabled={!canRun}
              onClick={() => handleRunEval(a.path)}
              className="gap-2"
            >
              <Play className="h-3 w-3" />
              Eval {a.name}
            </Button>
          ))}
        </div>

        {!datasetInfo && (
          <p className="text-xs text-muted-foreground">Upload a dataset first</p>
        )}
        {datasetInfo && !mapping && (
          <p className="text-xs text-muted-foreground">Set column mapping first</p>
        )}
      </CardContent>
    </Card>
  )
}
