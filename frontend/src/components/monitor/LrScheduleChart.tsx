import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useTrainingMetrics } from "@/hooks/useTrainingMetrics"
import { CHART_COLORS } from "@/lib/colors"

export function LrScheduleChart() {
  const { lrData } = useTrainingMetrics()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Learning Rate Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        {lrData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
            No training data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={lrData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="step" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} stroke={CHART_COLORS.grid} />
              <YAxis
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                stroke={CHART_COLORS.grid}
                tickFormatter={(v: number) => v.toExponential(1)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: CHART_COLORS.tooltip.bg,
                  border: `1px solid ${CHART_COLORS.tooltip.border}`,
                  borderRadius: "6px",
                  fontSize: 12,
                  color: "#fff",
                }}
                formatter={(v: number | undefined) => [(v ?? 0).toExponential(3), "LR"]}
              />
              <Line
                type="monotone"
                dataKey="lr"
                stroke={CHART_COLORS.green}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
