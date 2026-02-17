import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  Play,
  Loader2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Download,
  Clock,
  Hash,
  BarChart3,
  Trash2,
  GitCompare,
  X,
} from "lucide-react"
import { api } from "@/lib/api"
import { useEvaluationStore } from "@/stores/evaluationStore"
import { useInferenceStore } from "@/stores/inferenceStore"
import { useDatasetStore } from "@/stores/datasetStore"
import { CHART_COLORS } from "@/lib/colors"
import type { AdapterInfo, EvalSample } from "@/lib/types"

// --- Types ---

interface EvalRunSummary {
  id: number
  model_type: string
  eval_mode: string // "token" or "classification"
  num_samples: number
  num_skipped?: number
  created_at: string
  // Token mode
  exact_match_accuracy?: number
  token_precision?: number
  token_recall?: number
  token_f1?: number
  // Classification mode
  cls_accuracy?: number
  cls_precision?: number
  cls_recall?: number
  cls_f1?: number
  cls_tp?: number
  cls_fp?: number
  cls_tn?: number
  cls_fn?: number
}

interface PagedSamples {
  samples: EvalSample[]
  total: number
  page: number
  total_pages: number
}

type ViewMode = "single" | "compare"

// --- Main Tab ---

export function EvaluationTab() {
  const [runs, setRuns] = useState<EvalRunSummary[]>([])
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  const [compareRunId, setCompareRunId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("single")
  const latestRunId = useEvaluationStore((s) => s.latestRunId)

  const loadRuns = useCallback(async () => {
    try {
      const res = await api.request<{ runs: EvalRunSummary[] }>("/api/evaluation/runs")
      setRuns(res.runs)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    loadRuns()
  }, [loadRuns, latestRunId])

  useEffect(() => {
    if (latestRunId) setSelectedRunId(latestRunId)
  }, [latestRunId])

  const handleDelete = async (id: number) => {
    try {
      await api.request(`/api/evaluation/runs/${id}`, { method: "DELETE" })
      if (selectedRunId === id) setSelectedRunId(null)
      if (compareRunId === id) setCompareRunId(null)
      loadRuns()
    } catch {
      // ignore
    }
  }

  const handleSelectForCompare = (id: number) => {
    if (viewMode === "compare") {
      if (selectedRunId === id) return
      setCompareRunId(id)
    } else {
      setSelectedRunId(id)
    }
  }

  const enterCompare = () => {
    setViewMode("compare")
    setCompareRunId(null)
  }

  const exitCompare = () => {
    setViewMode("single")
    setCompareRunId(null)
  }

  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? null
  const compareRun = runs.find((r) => r.id === compareRunId) ?? null

  return (
    <div className="flex gap-6 max-w-7xl h-[calc(100vh-8rem)]">
      {/* Left sidebar */}
      <div className="w-72 shrink-0 flex flex-col gap-4">
        <NewEvalPanel onStarted={loadRuns} />
        <RunList
          runs={runs}
          selectedId={selectedRunId}
          compareId={compareRunId}
          viewMode={viewMode}
          onSelect={(id) => {
            if (viewMode === "compare") {
              handleSelectForCompare(id)
            } else {
              setSelectedRunId(id)
            }
          }}
          onDelete={handleDelete}
          onEnterCompare={enterCompare}
          onExitCompare={exitCompare}
        />
      </div>

      {/* Right content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {viewMode === "compare" && selectedRun ? (
          <CompareView
            runA={selectedRun}
            runB={compareRun}
          />
        ) : selectedRun ? (
          <RunDetails run={selectedRun} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {runs.length === 0
              ? "No evaluation runs yet. Configure and start one."
              : "Select a run from the list to view results."}
          </div>
        )}
      </div>
    </div>
  )
}

// --- New Eval Panel ---

function NewEvalPanel({ onStarted }: { onStarted: () => void }) {
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

  const handleRun = async (adapterPath: string | null) => {
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
      onStarted()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed")
      setRunning(false)
    }
  }

  const canRun = datasetInfo && mapping && !running

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          New Evaluation
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">
            Samples{datasetInfo ? ` (of ${(datasetInfo as { num_rows?: number }).num_rows ?? "?"})` : ""}
          </Label>
          <Input
            type="number"
            min={1}
            max={(datasetInfo as { num_rows?: number })?.num_rows ?? 100000}
            value={sampleLimit}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v) && v >= 1) setSampleLimit(v)
            }}
            className="h-7 text-xs tabular-nums"
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={classificationMode}
            onCheckedChange={setClassificationMode}
            className="scale-90"
          />
          <Label className="text-xs">Binary classification</Label>
        </div>

        {running && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Running...
              </span>
              <span className="tabular-nums">{progress}/{total}</span>
            </div>
            <Progress value={total > 0 ? (progress / total) * 100 : 0} className="h-1.5" />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={!canRun}
            onClick={() => handleRun(null)}
            className="gap-1.5 h-7 text-xs justify-start"
          >
            <Play className="h-3 w-3" />
            Base Model
          </Button>
          {adapters.map((a) => (
            <Button
              key={a.path}
              size="sm"
              disabled={!canRun}
              onClick={() => handleRun(a.path)}
              className="gap-1.5 h-7 text-xs justify-start"
            >
              <Play className="h-3 w-3" />
              {a.name}
            </Button>
          ))}
        </div>

        {!datasetInfo && (
          <p className="text-[11px] text-muted-foreground">Upload dataset first</p>
        )}
        {datasetInfo && !mapping && (
          <p className="text-[11px] text-muted-foreground">Set column mapping first</p>
        )}
      </CardContent>
    </Card>
  )
}

// --- Run List ---

function RunList({
  runs,
  selectedId,
  compareId,
  viewMode,
  onSelect,
  onDelete,
  onEnterCompare,
  onExitCompare,
}: {
  runs: EvalRunSummary[]
  selectedId: number | null
  compareId: number | null
  viewMode: ViewMode
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  onEnterCompare: () => void
  onExitCompare: () => void
}) {
  if (runs.length === 0) return null

  return (
    <Card className="flex-1 min-h-0 flex flex-col">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Run History
          </CardTitle>
          {runs.length >= 2 && (
            viewMode === "compare" ? (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={onExitCompare}>
                <X className="h-3 w-3" />
                Exit
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={onEnterCompare}>
                <GitCompare className="h-3 w-3" />
                Compare
              </Button>
            )
          )}
        </div>
        {viewMode === "compare" && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {!compareId
              ? "Click a second run to compare against the selected one."
              : "Showing comparison below."}
          </p>
        )}
      </CardHeader>
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2 space-y-0.5">
          {runs.map((run) => {
            const isSelected = run.id === selectedId
            const isCompare = run.id === compareId
            const date = new Date(run.created_at)
            const timeStr = date.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })

            let bgClass = "hover:bg-muted/50"
            if (isSelected) bgClass = "bg-accent text-accent-foreground"
            else if (isCompare) bgClass = "bg-blue-500/10 ring-1 ring-blue-500/30"

            return (
              <div
                key={run.id}
                className={`group rounded-md px-3 py-2 cursor-pointer transition-colors ${bgClass}`}
                onClick={() => onSelect(run.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {viewMode === "compare" && (
                      <span className="text-[9px] font-bold w-3 shrink-0">
                        {isSelected ? "A" : isCompare ? "B" : ""}
                      </span>
                    )}
                    <Badge
                      variant={run.model_type === "base" ? "secondary" : "default"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {run.model_type}
                    </Badge>
                    <span className="text-xs font-medium tabular-nums">
                      #{run.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {run.eval_mode === "classification"
                        ? `${((run.cls_accuracy ?? 0) * 100).toFixed(1)}% acc`
                        : `${((run.exact_match_accuracy ?? 0) * 100).toFixed(1)}% EM`}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 hidden group-hover:flex shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(run.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Hash className="h-2.5 w-2.5" />
                    {run.num_samples}
                    {(run.num_skipped ?? 0) > 0 && (
                      <span className="text-yellow-400 ml-0.5">({run.num_skipped} skip)</span>
                    )}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {timeStr}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </Card>
  )
}

// --- Compare View ---

function CompareView({
  runA,
  runB,
}: {
  runA: EvalRunSummary
  runB: EvalRunSummary | null
}) {
  if (!runB) {
    return (
      <div className="space-y-6">
        <RunDetails run={runA} />
        <div className="text-center text-sm text-muted-foreground py-8 border border-dashed border-border rounded-lg">
          Select a second run from the sidebar to compare.
        </div>
      </div>
    )
  }

  const isCls = runA.eval_mode === "classification" && runB.eval_mode === "classification"
  const isToken = runA.eval_mode === "token" && runB.eval_mode === "token"
  const isMixed = !isCls && !isToken

  const metricNames = isCls
    ? ["Accuracy", "Precision", "Recall", "F1"] as const
    : ["Exact Match", "Token Precision", "Token Recall", "Token F1"] as const
  const metricKeys = isCls
    ? (["cls_accuracy", "cls_precision", "cls_recall", "cls_f1"] as const)
    : (["exact_match_accuracy", "token_precision", "token_recall", "token_f1"] as const)

  const comparisonData = metricNames.map((name, i) => ({
    name,
    [`#${runA.id} (${runA.model_type})`]: (runA as Record<string, unknown>)[metricKeys[i]] as number ?? 0,
    [`#${runB.id} (${runB.model_type})`]: (runB as Record<string, unknown>)[metricKeys[i]] as number ?? 0,
  }))

  const deltaData = metricKeys.map((key, i) => ({
    name: metricNames[i],
    a: ((runA as Record<string, unknown>)[key] as number) ?? 0,
    b: ((runB as Record<string, unknown>)[key] as number) ?? 0,
    delta: (((runB as Record<string, unknown>)[key] as number) ?? 0) - (((runA as Record<string, unknown>)[key] as number) ?? 0),
  }))

  const labelA = `#${runA.id} (${runA.model_type})`
  const labelB = `#${runB.id} (${runB.model_type})`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <GitCompare className="h-5 w-5" />
          Comparing Runs
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          <Badge variant="secondary" className="text-xs">{labelA}</Badge>
          {" vs "}
          <Badge className="text-xs">{labelB}</Badge>
        </p>
      </div>

      {isMixed && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-3 text-xs text-yellow-400">
            These runs use different eval modes (token vs classification). Metrics are not directly comparable.
          </CardContent>
        </Card>
      )}

      {/* Delta cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {deltaData.map((d) => {
          const improved = d.delta > 0
          const deltaStr = `${improved ? "+" : ""}${(d.delta * 100).toFixed(1)}%`
          return (
            <Card key={d.name}>
              <CardContent className="pt-4 pb-4">
                <div className="text-xs text-muted-foreground">{d.name}</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-semibold tabular-nums">
                    {(d.a * 100).toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {(d.b * 100).toFixed(1)}%
                  </span>
                </div>
                <div className={`text-xs font-medium mt-1 ${
                  d.delta > 0.001 ? "text-green-400" : d.delta < -0.001 ? "text-red-400" : "text-muted-foreground"
                }`}>
                  {deltaStr}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Side-by-side bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Side-by-Side Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={comparisonData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} stroke={CHART_COLORS.grid} />
              <YAxis
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                stroke={CHART_COLORS.grid}
                domain={[0, 1]}
                tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: CHART_COLORS.tooltip.bg,
                  border: `1px solid ${CHART_COLORS.tooltip.border}`,
                  borderRadius: "6px",
                  fontSize: 12,
                  color: "#fff",
                }}
                formatter={(v: number | undefined) => [`${((v ?? 0) * 100).toFixed(1)}%`]}
              />
              <Legend />
              <Bar dataKey={labelA} fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
              <Bar dataKey={labelB} fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Individual run details below */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">{labelA}</Badge>
            {runA.num_samples} samples
            {(runA.num_skipped ?? 0) > 0 && (
              <span className="text-yellow-400 text-xs">({runA.num_skipped} skipped)</span>
            )}
          </h3>
          <SampleTable runId={runA.id} />
        </div>
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Badge className="text-xs">{labelB}</Badge>
            {runB.num_samples} samples
            {(runB.num_skipped ?? 0) > 0 && (
              <span className="text-yellow-400 text-xs">({runB.num_skipped} skipped)</span>
            )}
          </h3>
          <SampleTable runId={runB.id} />
        </div>
      </div>
    </div>
  )
}

// --- Run Header ---

function RunHeader({ run }: { run: EvalRunSummary }) {
  const date = new Date(run.created_at)
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Run #{run.id}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {date.toLocaleString()} &middot;{" "}
          <Badge variant={run.model_type === "base" ? "secondary" : "default"} className="text-xs">
            {run.model_type}
          </Badge>
          {" "}&middot;{" "}
          <Badge variant="outline" className="text-xs">
            {run.eval_mode === "classification" ? "Classification" : "Token"}
          </Badge>
          {" "}&middot; {run.num_samples} samples
          {(run.num_skipped ?? 0) > 0 && (
            <span className="text-yellow-400 ml-1">({run.num_skipped} skipped)</span>
          )}
        </p>
      </div>
      <a href={`/api/evaluation/export/${run.id}?format=csv`} download={`eval_${run.id}.csv`}>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </a>
    </div>
  )
}

// --- Run Details (single) ---

function RunDetails({ run }: { run: EvalRunSummary }) {
  return (
    <div className="space-y-6">
      <RunHeader run={run} />
      {run.eval_mode === "classification" ? (
        <ClassificationDetails run={run} />
      ) : (
        <TokenDetails run={run} />
      )}
      <Separator />
      <SampleTable runId={run.id} />
    </div>
  )
}

function TokenDetails({ run }: { run: EvalRunSummary }) {
  const metricsData = [
    { name: "Exact Match", value: run.exact_match_accuracy ?? 0 },
    { name: "Token Precision", value: run.token_precision ?? 0 },
    { name: "Token Recall", value: run.token_recall ?? 0 },
    { name: "Token F1", value: run.token_f1 ?? 0 },
  ]
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metricsData.map((m) => (
          <Card key={m.name}>
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground">{m.name}</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">{(m.value * 100).toFixed(1)}%</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Metrics Overview</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={metricsData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} stroke={CHART_COLORS.grid} />
              <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.axis }} stroke={CHART_COLORS.grid} domain={[0, 1]} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip contentStyle={{ backgroundColor: CHART_COLORS.tooltip.bg, border: `1px solid ${CHART_COLORS.tooltip.border}`, borderRadius: "6px", fontSize: 12, color: "#fff" }} formatter={(v: number | undefined) => [`${((v ?? 0) * 100).toFixed(1)}%`]} />
              <Bar dataKey="value" fill={run.model_type === "base" ? CHART_COLORS.blue : CHART_COLORS.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  )
}

function ClassificationDetails({ run }: { run: EvalRunSummary }) {
  const tp = run.cls_tp ?? 0
  const fp = run.cls_fp ?? 0
  const tn = run.cls_tn ?? 0
  const fn = run.cls_fn ?? 0
  const scoreData = [
    { name: "Accuracy", value: run.cls_accuracy ?? 0 },
    { name: "Precision", value: run.cls_precision ?? 0 },
    { name: "Recall", value: run.cls_recall ?? 0 },
    { name: "F1 Score", value: run.cls_f1 ?? 0 },
  ]
  const confusionData = [
    { name: "True Pos", value: tp, color: CHART_COLORS.green },
    { name: "True Neg", value: tn, color: CHART_COLORS.blue },
    { name: "False Pos", value: fp, color: CHART_COLORS.orange },
    { name: "False Neg", value: fn, color: CHART_COLORS.red },
  ]

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {scoreData.map((s) => (
          <Card key={s.name}>
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground">{s.name}</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">{(s.value * 100).toFixed(1)}%</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Confusion Matrix</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-1 max-w-xs mx-auto text-center text-xs">
            <div />
            <div className="font-medium text-muted-foreground py-2">Pred Positive</div>
            <div className="font-medium text-muted-foreground py-2">Pred Negative</div>

            <div className="font-medium text-muted-foreground py-4 text-right pr-3">Actual Pos</div>
            <div className="rounded-md py-4 font-semibold text-lg tabular-nums" style={{ backgroundColor: "#166534", color: "#4ade80" }}>
              {tp}<div className="text-[10px] font-normal opacity-70">TP</div>
            </div>
            <div className="rounded-md py-4 font-semibold text-lg tabular-nums" style={{ backgroundColor: "#7f1d1d", color: "#f87171" }}>
              {fn}<div className="text-[10px] font-normal opacity-70">FN</div>
            </div>

            <div className="font-medium text-muted-foreground py-4 text-right pr-3">Actual Neg</div>
            <div className="rounded-md py-4 font-semibold text-lg tabular-nums" style={{ backgroundColor: "#7c2d12", color: "#fb923c" }}>
              {fp}<div className="text-[10px] font-normal opacity-70">FP</div>
            </div>
            <div className="rounded-md py-4 font-semibold text-lg tabular-nums" style={{ backgroundColor: "#1e3a5f", color: "#60a5fa" }}>
              {tn}<div className="text-[10px] font-normal opacity-70">TN</div>
            </div>
          </div>

          <div className="mt-6">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={confusionData} barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} stroke={CHART_COLORS.grid} />
                <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.axis }} stroke={CHART_COLORS.grid} />
                <Tooltip contentStyle={{ backgroundColor: CHART_COLORS.tooltip.bg, border: `1px solid ${CHART_COLORS.tooltip.border}`, borderRadius: "6px", fontSize: 12, color: "#fff" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {confusionData.map((d, i) => (
                    <rect key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// --- Sample Table ---

function SampleTable({ runId }: { runId: number }) {
  const [data, setData] = useState<PagedSamples | null>(null)
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)

  const loadPage = useCallback(
    async (p: number) => {
      setLoading(true)
      try {
        const res = await api.request<PagedSamples>(
          `/api/evaluation/runs/${runId}/samples?page=${p}&page_size=20`
        )
        setData(res)
        setPage(p)
        setExpanded(new Set())
      } catch {
        // ignore
      }
      setLoading(false)
    },
    [runId]
  )

  useEffect(() => {
    loadPage(1)
  }, [runId, loadPage])

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "No sample data."}
        </CardContent>
      </Card>
    )
  }

  const toggle = (i: number) => {
    const next = new Set(expanded)
    if (next.has(i)) next.delete(i)
    else next.add(i)
    setExpanded(next)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Samples ({data.total})
          </CardTitle>
          {data.total_pages > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-6 w-6" disabled={page <= 1} onClick={() => loadPage(page - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">{page}/{data.total_pages}</span>
              <Button variant="outline" size="icon" className="h-6 w-6" disabled={page >= data.total_pages} onClick={() => loadPage(page + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead className="w-12">#</TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead className="w-24 text-center">EM</TableHead>
                <TableHead className="w-20 text-center">F1</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : (
                data.samples.map((s) => (
                  <>
                    <TableRow
                      key={s.index}
                      className={`${s.skipped ? "opacity-50" : "cursor-pointer hover:bg-muted/30"}`}
                      onClick={() => !s.skipped && toggle(s.index)}
                    >
                      <TableCell className="px-2">
                        {s.skipped ? null : expanded.has(s.index)
                          ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{s.index + 1}</TableCell>
                      <TableCell className="max-w-[250px] truncate text-xs">
                        {s.skipped
                          ? <span className="italic text-yellow-400">Skipped — {s.skipped_reason}</span>
                          : s.prompt}
                      </TableCell>
                      <TableCell className="text-center">
                        {s.skipped ? (
                          <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-400/30">Skip</Badge>
                        ) : (
                          <Badge variant={s.exact_match === 1 ? "default" : "secondary"} className="text-[10px]">
                            {s.exact_match === 1 ? "Match" : "Miss"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-xs">
                        {s.skipped ? "—" : `${(s.token_f1 * 100).toFixed(1)}%`}
                      </TableCell>
                    </TableRow>
                    {!s.skipped && expanded.has(s.index) && (
                      <TableRow key={`${s.index}-exp`}>
                        <TableCell colSpan={5} className="bg-muted/20 px-6 py-4">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="font-medium text-muted-foreground mb-1">Ground Truth</div>
                              <div className="whitespace-pre-wrap rounded bg-muted/40 p-2">{s.ground_truth}</div>
                            </div>
                            <div>
                              <div className="font-medium text-muted-foreground mb-1">Prediction</div>
                              <div className="whitespace-pre-wrap rounded bg-muted/40 p-2">{s.prediction}</div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
