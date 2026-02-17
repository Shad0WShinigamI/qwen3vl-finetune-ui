import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, X } from "lucide-react"
import { api } from "@/lib/api"
import { useDatasetStore } from "@/stores/datasetStore"
import type { ColumnMapping } from "@/lib/types"

export function ColumnMapper() {
  const { columns, mapping, setMapping, info } = useDatasetStore()
  const [promptCol, setPromptCol] = useState(mapping?.prompt_column ?? "")
  const [responseCol, setResponseCol] = useState(mapping?.response_column ?? "")
  const [gtCol, setGtCol] = useState(mapping?.ground_truth_column ?? "")
  const [imageCols, setImageCols] = useState<string[]>(
    mapping?.image_url_columns ?? []
  )
  const [mandatoryCols, setMandatoryCols] = useState<Set<string>>(
    new Set(mapping?.mandatory_columns ?? [])
  )
  const [useSeparator, setUseSeparator] = useState(!!mapping?.image_separator)
  const [separator, setSeparator] = useState(mapping?.image_separator ?? ",")
  const [saving, setSaving] = useState(false)

  // Sync local state when mapping is restored from backend
  useEffect(() => {
    if (mapping) {
      setPromptCol(mapping.prompt_column)
      setResponseCol(mapping.response_column)
      setGtCol(mapping.ground_truth_column ?? "")
      setImageCols(mapping.image_url_columns ?? [])
      setMandatoryCols(new Set(mapping.mandatory_columns ?? []))
      setUseSeparator(!!mapping.image_separator)
      setSeparator(mapping.image_separator ?? ",")
    }
  }, [mapping])

  if (!info) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      const filteredImageCols = imageCols.filter(Boolean)
      const m: ColumnMapping = {
        prompt_column: promptCol,
        response_column: responseCol,
        ground_truth_column: gtCol || null,
        image_url_columns: filteredImageCols,
        image_separator: useSeparator ? separator : null,
        mandatory_columns: Array.from(mandatoryCols).filter((c) => filteredImageCols.includes(c)),
      }
      await api.setMapping(m as unknown as Record<string, unknown>)
      setMapping(m)
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const addImageCol = () => {
    setImageCols([...imageCols, ""])
  }

  const updateImageCol = (index: number, value: string) => {
    const oldVal = imageCols[index]
    const next = [...imageCols]
    next[index] = value
    setImageCols(next)
    // Transfer mandatory status from old column to new column
    if (oldVal && mandatoryCols.has(oldVal)) {
      const updated = new Set(mandatoryCols)
      updated.delete(oldVal)
      if (value) updated.add(value)
      setMandatoryCols(updated)
    }
  }

  const removeImageCol = (index: number) => {
    const removed = imageCols[index]
    setImageCols(imageCols.filter((_, i) => i !== index))
    if (removed && mandatoryCols.has(removed)) {
      const updated = new Set(mandatoryCols)
      updated.delete(removed)
      setMandatoryCols(updated)
    }
  }

  const toggleMandatory = (col: string) => {
    const updated = new Set(mandatoryCols)
    if (updated.has(col)) {
      updated.delete(col)
    } else {
      updated.add(col)
    }
    setMandatoryCols(updated)
  }

  // Columns not already selected as image columns (for the dropdown options)
  const availableImageCols = (currentIndex: number) =>
    columns.filter(
      (c) => !imageCols.includes(c) || imageCols[currentIndex] === c
    )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Column Mapping</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Prompt Column *</Label>
          <Select value={promptCol} onValueChange={setPromptCol}>
            <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
            <SelectContent>
              {columns.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Response Column *</Label>
          <Select value={responseCol} onValueChange={setResponseCol}>
            <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
            <SelectContent>
              {columns.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Ground Truth Column (for eval)</Label>
          <Select value={gtCol} onValueChange={setGtCol}>
            <SelectTrigger><SelectValue placeholder="Same as response" /></SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">None (use response)</SelectItem>
              {columns.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Image URL Columns</Label>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={addImageCol}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {imageCols.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No image columns added. Click + to add one.
            </p>
          )}
          {imageCols.map((col, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select
                value={col}
                onValueChange={(v) => updateImageCol(i, v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {availableImageCols(i).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 shrink-0">
                <Switch
                  checked={!!col && mandatoryCols.has(col)}
                  onCheckedChange={() => col && toggleMandatory(col)}
                  disabled={!col}
                  className="scale-75"
                />
                <Label className="text-[10px] text-muted-foreground w-10">Req'd</Label>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeImageCol(i)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {imageCols.length > 0 && (
          <div className="flex items-center gap-3">
            <Switch checked={useSeparator} onCheckedChange={setUseSeparator} />
            <Label className="text-xs">Multiple URLs in single column</Label>
            {useSeparator && (
              <Input
                value={separator}
                onChange={(e) => setSeparator(e.target.value)}
                className="w-16"
                placeholder=","
              />
            )}
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={!promptCol || !responseCol || saving}
          className="w-full"
          size="sm"
        >
          {saving ? "Saving..." : mapping ? "Update Mapping" : "Save Mapping"}
        </Button>
      </CardContent>
    </Card>
  )
}
