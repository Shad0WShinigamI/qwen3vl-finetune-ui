import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Send, GitCompare, Loader2, ImagePlus, X } from "lucide-react"
import { api } from "@/lib/api"
import { useInferenceStore } from "@/stores/inferenceStore"
import type { AdapterInfo } from "@/lib/types"

export function InferencePanel() {
  const {
    prompt,
    imageUrls,
    selectedAdapter,
    adapters,
    generationParams,
    baseOutput,
    ftOutput,
    baseTimeMs,
    ftTimeMs,
    loading,
    error,
    setPrompt,
    setImageUrls,
    setSelectedAdapter,
    setAdapters,
    setGenerationParams,
    setResults,
    setLoading,
    setError,
  } = useInferenceStore()

  const [newUrl, setNewUrl] = useState("")

  useEffect(() => {
    api.listAdapters().then((res) => {
      setAdapters(res.adapters as unknown as AdapterInfo[])
    }).catch(() => {})
  }, [setAdapters])

  const addImageUrl = () => {
    if (newUrl.trim()) {
      setImageUrls([...imageUrls, newUrl.trim()])
      setNewUrl("")
    }
  }

  const removeImageUrl = (i: number) => {
    setImageUrls(imageUrls.filter((_, idx) => idx !== i))
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.generate({
        prompt,
        image_urls: imageUrls,
        adapter_path: selectedAdapter,
        generation_params: generationParams,
      })
      const r = result as { output: string; model_type: string; generation_time_ms: number }
      if (r.model_type === "base") {
        setResults(r.output, ftOutput, r.generation_time_ms, ftTimeMs)
      } else {
        setResults(baseOutput, r.output, baseTimeMs, r.generation_time_ms)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed")
    }
    setLoading(false)
  }

  const handleCompare = async () => {
    if (!selectedAdapter) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.compare({
        prompt,
        image_urls: imageUrls,
        adapter_path: selectedAdapter,
        generation_params: generationParams,
      })
      const r = result as {
        base_output: string
        finetuned_output: string
        base_time_ms: number
        finetuned_time_ms: number
      }
      setResults(r.base_output, r.finetuned_output, r.base_time_ms, r.finetuned_time_ms)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed")
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Input</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Adapter</Label>
                <Select
                  value={selectedAdapter ?? "base"}
                  onValueChange={(v) =>
                    setSelectedAdapter(v === "base" ? null : v)
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Base model" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Base Model (no adapter)</SelectItem>
                    {adapters.map((a) => (
                      <SelectItem key={a.path} value={a.path}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Prompt</Label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Enter your prompt..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <ImagePlus className="h-3 w-3" />
                  Image URLs
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://..."
                    onKeyDown={(e) => e.key === "Enter" && addImageUrl()}
                  />
                  <Button variant="outline" size="sm" onClick={addImageUrl}>
                    Add
                  </Button>
                </div>
                {imageUrls.map((url, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1"
                  >
                    <span className="truncate flex-1">{url}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={() => removeImageUrl(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-xs font-medium">Generation Parameters</Label>
                <div className="space-y-2">
                  <Label className="text-xs">Max Tokens: {generationParams.max_new_tokens}</Label>
                  <Slider
                    value={[generationParams.max_new_tokens]}
                    onValueChange={([v]) => setGenerationParams({ max_new_tokens: v })}
                    min={1}
                    max={2048}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Temperature: {generationParams.temperature.toFixed(2)}</Label>
                  <Slider
                    value={[generationParams.temperature]}
                    onValueChange={([v]) => setGenerationParams({ temperature: v })}
                    min={0}
                    max={2}
                    step={0.05}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Top P: {generationParams.top_p.toFixed(2)}</Label>
                  <Slider
                    value={[generationParams.top_p]}
                    onValueChange={([v]) => setGenerationParams({ top_p: v })}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Min P: {generationParams.min_p.toFixed(2)}</Label>
                  <Slider
                    value={[generationParams.min_p]}
                    onValueChange={([v]) => setGenerationParams({ min_p: v })}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={generationParams.do_sample}
                    onCheckedChange={(v) => setGenerationParams({ do_sample: v })}
                  />
                  <Label className="text-xs">Sampling</Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleGenerate}
                  disabled={!prompt || loading}
                  className="flex-1 gap-2"
                  size="sm"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Generate
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCompare}
                  disabled={!prompt || !selectedAdapter || loading}
                  className="flex-1 gap-2"
                  size="sm"
                >
                  <GitCompare className="h-4 w-4" />
                  Compare
                </Button>
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Base Model</CardTitle>
                  {baseTimeMs != null && (
                    <Badge variant="secondary" className="text-xs">
                      {baseTimeMs.toFixed(0)}ms
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="min-h-[200px] text-sm whitespace-pre-wrap">
                  {baseOutput ?? (
                    <span className="text-muted-foreground">
                      Run generation or comparison to see output
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Fine-tuned</CardTitle>
                  {ftTimeMs != null && (
                    <Badge variant="secondary" className="text-xs">
                      {ftTimeMs.toFixed(0)}ms
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="min-h-[200px] text-sm whitespace-pre-wrap">
                  {ftOutput ?? (
                    <span className="text-muted-foreground">
                      Select an adapter and run comparison
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
