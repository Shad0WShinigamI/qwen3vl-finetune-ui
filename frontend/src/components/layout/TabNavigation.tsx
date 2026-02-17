import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Database,
  Settings,
  Activity,
  MessageSquare,
  BarChart3,
} from "lucide-react"

const tabs = [
  { value: "data", label: "Data", icon: Database },
  { value: "training", label: "Training", icon: Settings },
  { value: "monitor", label: "Monitor", icon: Activity },
  { value: "inference", label: "Inference", icon: MessageSquare },
  { value: "evaluation", label: "Evaluation", icon: BarChart3 },
] as const

interface Props {
  value: string
  onChange: (v: string) => void
}

export function TabNavigation({ value, onChange }: Props) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList className="h-10 bg-muted/50">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="gap-2 data-[state=active]:bg-background"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
