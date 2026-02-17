import { useCallback, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileText, CheckCircle2 } from "lucide-react"
import { api } from "@/lib/api"
import { useDatasetStore } from "@/stores/datasetStore"

export function CsvUploader() {
  const { info, loading, setInfo, setLoading, setError, setPreview } = useDatasetStore()
  const [dragOver, setDragOver] = useState(false)

  const handleUpload = useCallback(
    async (file: File) => {
      setLoading(true)
      try {
        const result = await api.uploadCsv(file)
        setInfo(result)
        // Load first page of preview
        const preview = await api.previewDataset(1, 20)
        setPreview(preview.rows, preview.page, preview.total_pages, preview.total_rows)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed")
      }
      setLoading(false)
    },
    [setInfo, setLoading, setError, setPreview]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file?.name.endsWith(".csv")) handleUpload(file)
    },
    [handleUpload]
  )

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleUpload(file)
    },
    [handleUpload]
  )

  if (info) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Dataset Loaded
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{info.filename}</span>
            </div>
            <span className="text-muted-foreground">
              {info.num_rows.toLocaleString()} rows
            </span>
            <span className="text-muted-foreground">
              {info.num_columns} columns
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                useDatasetStore.getState().reset()
              }}
            >
              Upload New
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Upload Dataset</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onClick={() => document.getElementById("csv-input")?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium">
            {loading ? "Uploading..." : "Drop CSV file here or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            CSV files with image URLs, prompts, and responses
          </p>
          <input
            id="csv-input"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onFileSelect}
          />
        </div>
      </CardContent>
    </Card>
  )
}
