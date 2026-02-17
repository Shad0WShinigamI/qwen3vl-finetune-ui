import { useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTrainingStore } from "@/stores/trainingStore"

export function LogPanel() {
  const logs = useTrainingStore((s) => s.logs)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Log</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          <div className="font-mono text-xs space-y-0.5">
            {logs.length === 0 && (
              <p className="text-muted-foreground">No logs yet</p>
            )}
            {logs.map((log, i) => (
              <div key={i} className="text-muted-foreground">
                {log}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
