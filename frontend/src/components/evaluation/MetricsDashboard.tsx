import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useEvaluationStore } from "@/stores/evaluationStore"
import { CHART_COLORS } from "@/lib/colors"

export function MetricsDashboard() {
  const { baseMetrics, ftMetrics, classificationMetrics } = useEvaluationStore()

  if (!baseMetrics && !ftMetrics && !classificationMetrics) return null

  const tokenMetricsData = [
    {
      name: "Exact Match",
      base: baseMetrics?.exact_match_accuracy ?? 0,
      finetuned: ftMetrics?.exact_match_accuracy ?? 0,
    },
    {
      name: "Token Precision",
      base: baseMetrics?.token_precision ?? 0,
      finetuned: ftMetrics?.token_precision ?? 0,
    },
    {
      name: "Token Recall",
      base: baseMetrics?.token_recall ?? 0,
      finetuned: ftMetrics?.token_recall ?? 0,
    },
    {
      name: "Token F1",
      base: baseMetrics?.token_f1 ?? 0,
      finetuned: ftMetrics?.token_f1 ?? 0,
    },
  ]

  const hasTokenMetrics = baseMetrics || ftMetrics

  return (
    <div className="space-y-4">
      {/* Token-level metric cards */}
      {hasTokenMetrics && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {tokenMetricsData.map((m) => (
              <Card key={m.name}>
                <CardContent className="pt-4 pb-4">
                  <div className="text-xs text-muted-foreground">{m.name}</div>
                  <div className="flex items-baseline gap-3 mt-1">
                    {baseMetrics && (
                      <div>
                        <span className="text-lg font-semibold tabular-nums">
                          {(m.base * 100).toFixed(1)}%
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">base</span>
                      </div>
                    )}
                    {ftMetrics && (
                      <div>
                        <span className="text-lg font-semibold tabular-nums text-primary">
                          {(m.finetuned * 100).toFixed(1)}%
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">FT</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Metrics Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tokenMetricsData}>
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
                  {baseMetrics && (
                    <Bar dataKey="base" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
                  )}
                  {ftMetrics && (
                    <Bar dataKey="finetuned" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* Classification metrics */}
      {classificationMetrics && <ClassificationDashboard metrics={classificationMetrics} />}
    </div>
  )
}

interface ClassificationMetrics {
  accuracy: number
  precision: number
  recall: number
  f1: number
  tp: number
  fp: number
  tn: number
  fn: number
  total: number
  model_type: string
}

function ClassificationDashboard({ metrics }: { metrics: ClassificationMetrics }) {
  const confusionData = [
    { name: "True Pos", value: metrics.tp, color: CHART_COLORS.green },
    { name: "True Neg", value: metrics.tn, color: CHART_COLORS.blue },
    { name: "False Pos", value: metrics.fp, color: CHART_COLORS.orange },
    { name: "False Neg", value: metrics.fn, color: CHART_COLORS.red },
  ]

  const scoreData = [
    { name: "Accuracy", value: metrics.accuracy },
    { name: "Precision", value: metrics.precision },
    { name: "Recall", value: metrics.recall },
    { name: "F1", value: metrics.f1 },
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">
        Binary Classification ({metrics.model_type})
      </h3>

      {/* Score cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {scoreData.map((s) => (
          <Card key={s.name}>
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground">{s.name}</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">
                {(s.value * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Confusion matrix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Confusion Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-1 max-w-xs mx-auto text-center text-xs">
            <div />
            <div className="font-medium text-muted-foreground py-2">Pred Positive</div>
            <div className="font-medium text-muted-foreground py-2">Pred Negative</div>

            <div className="font-medium text-muted-foreground py-4 text-right pr-3">Actual Positive</div>
            <div className="rounded-md py-4 font-semibold text-lg tabular-nums" style={{ backgroundColor: "#166534", color: "#4ade80" }}>
              {metrics.tp}
              <div className="text-[10px] font-normal opacity-70">TP</div>
            </div>
            <div className="rounded-md py-4 font-semibold text-lg tabular-nums" style={{ backgroundColor: "#7f1d1d", color: "#f87171" }}>
              {metrics.fn}
              <div className="text-[10px] font-normal opacity-70">FN</div>
            </div>

            <div className="font-medium text-muted-foreground py-4 text-right pr-3">Actual Negative</div>
            <div className="rounded-md py-4 font-semibold text-lg tabular-nums" style={{ backgroundColor: "#7c2d12", color: "#fb923c" }}>
              {metrics.fp}
              <div className="text-[10px] font-normal opacity-70">FP</div>
            </div>
            <div className="rounded-md py-4 font-semibold text-lg tabular-nums" style={{ backgroundColor: "#1e3a5f", color: "#60a5fa" }}>
              {metrics.tn}
              <div className="text-[10px] font-normal opacity-70">TN</div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={confusionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} stroke={CHART_COLORS.grid} />
                <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.axis }} stroke={CHART_COLORS.grid} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: CHART_COLORS.tooltip.bg,
                    border: `1px solid ${CHART_COLORS.tooltip.border}`,
                    borderRadius: "6px",
                    fontSize: 12,
                    color: "#fff",
                  }}
                />
                {confusionData.map((d) => (
                  <Bar key={d.name} dataKey="value" fill={d.color} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
