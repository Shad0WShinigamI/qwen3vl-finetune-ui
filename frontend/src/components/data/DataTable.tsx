import { useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { api } from "@/lib/api"
import { useDatasetStore } from "@/stores/datasetStore"

export function DataTable() {
  const { info, previewRows, previewPage, previewTotalPages, totalRows, setPreview } =
    useDatasetStore()

  const loadPage = useCallback(
    async (page: number) => {
      try {
        const result = await api.previewDataset(page, 20)
        setPreview(result.rows, result.page, result.total_pages, result.total_rows)
      } catch {
        // ignore
      }
    },
    [setPreview]
  )

  if (!info || previewRows.length === 0) return null

  const columns = info.columns

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Data Preview ({totalRows.toLocaleString()} rows)
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={previewPage <= 1}
              onClick={() => loadPage(previewPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-muted-foreground tabular-nums">
              {previewPage} / {previewTotalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={previewPage >= previewTotalPages}
              onClick={() => loadPage(previewPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                {columns.map((col) => (
                  <TableHead key={col} className="min-w-[150px]">
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="text-center text-muted-foreground tabular-nums">
                    {(previewPage - 1) * 20 + i + 1}
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell key={col} className="max-w-[300px] truncate">
                      {String(row[col] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
