import { useState, useCallback } from "react"
import { TabNavigation } from "./TabNavigation"
import { SessionList } from "@/components/sessions/SessionList"
import { CsvUploader } from "@/components/data/CsvUploader"
import { DataTable } from "@/components/data/DataTable"
import { ColumnMapper } from "@/components/data/ColumnMapper"
import { ConversationPreview } from "@/components/data/ConversationPreview"
import { TrainingConfigForm } from "@/components/training/TrainingConfigForm"
import { LossChart } from "@/components/monitor/LossChart"
import { LrScheduleChart } from "@/components/monitor/LrScheduleChart"
import { GpuMonitor } from "@/components/monitor/GpuMonitor"
import { TrainingProgress } from "@/components/monitor/TrainingProgress"
import { TrainingStats } from "@/components/monitor/TrainingStats"
import { LogPanel } from "@/components/monitor/LogPanel"
import { InferencePanel } from "@/components/inference/InferencePanel"
import { EvaluationTab as EvalTab } from "@/components/evaluation/EvaluationTab"
import { useWebSocket } from "@/hooks/useWebSocket"
import { useGpuStats } from "@/hooks/useGpuStats"
import { useHydrate } from "@/hooks/useHydrate"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Power } from "lucide-react"
import { api } from "@/lib/api"

export function AppShell() {
  const [activeTab, setActiveTab] = useState("data")
  useWebSocket()
  useHydrate()
  const gpuStats = useGpuStats()

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-semibold tracking-tight">Qwen3-VL</h1>
          <p className="text-xs text-muted-foreground">Fine-Tuning Studio</p>
        </div>
        <SessionList />
        {gpuStats?.available && (
          <div className="mt-auto p-3 border-t border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {gpuStats.device_name}
              </div>
              {(gpuStats.memory_allocated_mb ?? 0) > 100 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-muted-foreground hover:text-destructive"
                  title="Unload model & free GPU memory"
                  onClick={async () => {
                    try {
                      await api.request("/api/system/unload-model", { method: "POST" })
                    } catch (e) {
                      console.error("Failed to unload model:", e)
                      alert(e instanceof Error ? e.message : "Failed to unload model")
                    }
                  }}
                >
                  <Power className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${gpuStats.memory_utilization_pct ?? 0}%` }}
                />
              </div>
              <span className="text-muted-foreground tabular-nums">
                {gpuStats.memory_allocated_mb?.toFixed(0)} / {gpuStats.memory_total_mb?.toFixed(0)} MB
              </span>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="px-6 py-3 border-b border-border flex items-center gap-4">
          <TabNavigation value={activeTab} onChange={setActiveTab} />
        </header>
        <div className={`flex-1 p-6 ${activeTab === "evaluation" ? "overflow-hidden" : "overflow-y-auto"}`}>
          {activeTab === "data" && <DataTab />}
          {activeTab === "training" && <TrainingTab />}
          {activeTab === "monitor" && <MonitorTab />}
          {activeTab === "inference" && <InferenceTab />}
          {activeTab === "evaluation" && <EvalTab />}
        </div>
      </main>
    </div>
  )
}

function DataTab() {
  return (
    <div className="space-y-6 max-w-6xl">
      <CsvUploader />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ColumnMapper />
        <ConversationPreview />
      </div>
      <Separator />
      <DataTable />
    </div>
  )
}

function TrainingTab() {
  return (
    <div className="max-w-4xl">
      <TrainingConfigForm />
    </div>
  )
}

function MonitorTab() {
  return (
    <div className="space-y-6 max-w-6xl">
      <TrainingProgress />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LossChart />
        <LrScheduleChart />
      </div>
      <TrainingStats />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GpuMonitor />
        <LogPanel />
      </div>
    </div>
  )
}

function InferenceTab() {
  return (
    <div className="max-w-6xl">
      <InferencePanel />
    </div>
  )
}

