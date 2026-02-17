import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChevronDown, ChevronRight, ChevronLeft, Download } from "lucide-react"
import { useEvaluationStore } from "@/stores/evaluationStore"
import { api } from "@/lib/api"
import type { EvalSample } from "@/lib/types"

interface PagedSamples {
  samples: EvalSample[]
  total: number
  page: number
  total_pages: number
}

export function SampleComparison() {
  const latestRunId = useEvaluationStore((s) => s.latestRunId)
  const [data, setData] = useState<PagedSamples | null>(null)
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)

  const loadPage = useCallback(
    async (p: number) => {
      if (!latestRunId) return
      setLoading(true)
      try {
        const res = await api.request<PagedSamples>(
          `/api/evaluation/runs/${latestRunId}/samples?page=${p}&page_size=20`
        )
        setData(res)
        setPage(p)
        setExpanded(new Set())
      } catch {
        // ignore
      }
      setLoading(false)
    },
    [latestRunId]
  )

  useEffect(() => {
    if (latestRunId) {
      loadPage(1)
    }
  }, [latestRunId, loadPage])

  if (!latestRunId || !data) return null

  const toggle = (i: number) => {
    const next = new Set(expanded)
    if (next.has(i)) next.delete(i)
    else next.add(i)
    setExpanded(next)
  }

  const exportCsv = async () => {
    const a = document.createElement("a")
    a.href = `/api/evaluation/export/${latestRunId}?format=csv`
    a.download = `eval_${latestRunId}.csv`
    a.click()
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Sample Results ({data.total} total)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
              <Download className="h-3 w-3" />
              Export CSV
            </Button>
          </div>
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
                <TableHead className="w-20 text-center">EM</TableHead>
                <TableHead className="w-20 text-center">F1</TableHead>
                <TableHead className="w-20 text-center">P</TableHead>
                <TableHead className="w-20 text-center">R</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : (
                data.samples.map((s) => (
                  <>
                    <TableRow
                      key={s.index}
                      className={`${s.skipped ? "opacity-50" : "cursor-pointer"}`}
                      onClick={() => !s.skipped && toggle(s.index)}
                    >
                      <TableCell>
                        {s.skipped ? null : expanded.has(s.index) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">{s.index + 1}</TableCell>
                      <TableCell className="max-w-[300px] truncate text-xs">
                        {s.skipped
                          ? <span className="italic text-yellow-400">Skipped — {s.skipped_reason}</span>
                          : s.prompt}
                      </TableCell>
                      <TableCell className="text-center">
                        {s.skipped ? (
                          <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/30">Skip</Badge>
                        ) : (
                          <Badge
                            variant={s.exact_match === 1 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {s.exact_match === 1 ? "Yes" : "No"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-xs">
                        {s.skipped ? "—" : `${(s.token_f1 * 100).toFixed(1)}%`}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-xs">
                        {s.skipped ? "—" : `${(s.token_precision * 100).toFixed(1)}%`}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-xs">
                        {s.skipped ? "—" : `${(s.token_recall * 100).toFixed(1)}%`}
                      </TableCell>
                    </TableRow>
                    {!s.skipped && expanded.has(s.index) && (
                      <TableRow key={`${s.index}-detail`}>
                        <TableCell colSpan={7} className="bg-muted/30 p-4">
                          <div className="space-y-3 text-xs">
                            <div>
                              <span className="font-medium text-muted-foreground">
                                Ground Truth:
                              </span>
                              <p className="mt-1 whitespace-pre-wrap">{s.ground_truth}</p>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">
                                Prediction:
                              </span>
                              <p className="mt-1 whitespace-pre-wrap">{s.prediction}</p>
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

        {/* Pagination */}
        {data.total_pages > 1 && (
          <div className="flex items-center justify-center gap-2 py-3 border-t border-border">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => loadPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {page} / {data.total_pages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= data.total_pages}
              onClick={() => loadPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
