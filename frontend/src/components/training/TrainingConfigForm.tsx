import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Play, Square } from "lucide-react"
import { api } from "@/lib/api"
import { useTrainingStore } from "@/stores/trainingStore"
import { useDatasetStore } from "@/stores/datasetStore"

const MODEL_OPTIONS = [
  "unsloth/Qwen3-VL-8B-Instruct-unsloth-bnb-4bit",
  "unsloth/Qwen2-VL-7B-Instruct-bnb-4bit",
  "unsloth/Qwen2-VL-2B-Instruct-bnb-4bit",
  "unsloth/Llama-3.2-11B-Vision-Instruct-bnb-4bit",
  "unsloth/Llama-3.2-11B-Vision-bnb-4bit",
  "unsloth/Pixtral-12B-2409-bnb-4bit",
]

const SCHEDULER_OPTIONS = ["linear", "cosine", "constant", "cosine_with_restarts"]
const OPTIM_OPTIONS = ["adamw_8bit", "adamw_torch", "sgd"]
const LORA_R_OPTIONS = [4, 8, 16, 32, 64]

export function TrainingConfigForm() {
  const {
    modelConfig,
    sftConfig,
    loraConfig,
    status,
    setModelConfig,
    setSftConfig,
    setLoraConfig,
  } = useTrainingStore()
  const datasetInfo = useDatasetStore((s) => s.info)
  const mapping = useDatasetStore((s) => s.mapping)

  const isTraining = ["training", "loading_model", "preparing_data"].includes(status)
  const canStart = datasetInfo && mapping && !isTraining

  const handleStart = async () => {
    try {
      useTrainingStore.getState().reset()
      useTrainingStore.getState().setStatus("loading_model")
      await api.startTraining({
        model_config_data: modelConfig,
        sft_config: sftConfig,
        lora_config: loraConfig,
      })
    } catch (e) {
      useTrainingStore.getState().setError(e instanceof Error ? e.message : "Failed to start")
      useTrainingStore.getState().setStatus("error")
    }
  }

  const handleStop = async () => {
    try {
      await api.stopTraining()
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Model</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Base Model</Label>
            <Select
              value={modelConfig.model_name}
              onValueChange={(v) => setModelConfig({ model_name: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m}>{m.split("/").pop()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Max Sequence Length: {modelConfig.max_seq_length}</Label>
            <Slider
              value={[modelConfig.max_seq_length]}
              onValueChange={([v]) => setModelConfig({ max_seq_length: v })}
              min={512}
              max={8192}
              step={256}
            />
          </div>
        </CardContent>
      </Card>

      {/* LoRA Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">LoRA Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Rank (r)</Label>
              <Select
                value={String(loraConfig.r)}
                onValueChange={(v) => setLoraConfig({ r: Number(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LORA_R_OPTIONS.map((r) => (
                    <SelectItem key={r} value={String(r)}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Alpha</Label>
              <Select
                value={String(loraConfig.lora_alpha)}
                onValueChange={(v) => setLoraConfig({ lora_alpha: Number(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LORA_R_OPTIONS.map((r) => (
                    <SelectItem key={r} value={String(r)}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Dropout: {loraConfig.lora_dropout}</Label>
            <Slider
              value={[loraConfig.lora_dropout]}
              onValueChange={([v]) => setLoraConfig({ lora_dropout: v })}
              min={0}
              max={0.1}
              step={0.01}
            />
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            {([
              ["finetune_vision_layers", "Vision Layers"],
              ["finetune_language_layers", "Language Layers"],
              ["finetune_attention_modules", "Attention"],
              ["finetune_mlp_modules", "MLP"],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <Switch
                  checked={loraConfig[key]}
                  onCheckedChange={(v) => setLoraConfig({ [key]: v })}
                />
                <Label className="text-xs">{label}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SFT Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Training Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Switch
              checked={sftConfig.use_epochs}
              onCheckedChange={(v) => setSftConfig({ use_epochs: v })}
            />
            <Label className="text-xs">Use epochs instead of max_steps</Label>
          </div>

          {sftConfig.use_epochs ? (
            <div className="space-y-2">
              <Label className="text-xs">Epochs: {sftConfig.num_train_epochs}</Label>
              <Slider
                value={[sftConfig.num_train_epochs]}
                onValueChange={([v]) => setSftConfig({ num_train_epochs: v })}
                min={1}
                max={5}
                step={1}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs">Max Steps: {sftConfig.max_steps}</Label>
              <Slider
                value={[sftConfig.max_steps]}
                onValueChange={([v]) => setSftConfig({ max_steps: v })}
                min={1}
                max={1000}
                step={1}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Batch Size: {sftConfig.per_device_train_batch_size}</Label>
              <Slider
                value={[sftConfig.per_device_train_batch_size]}
                onValueChange={([v]) => setSftConfig({ per_device_train_batch_size: v })}
                min={1}
                max={8}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Grad Accum: {sftConfig.gradient_accumulation_steps}</Label>
              <Slider
                value={[sftConfig.gradient_accumulation_steps]}
                onValueChange={([v]) => setSftConfig({ gradient_accumulation_steps: v })}
                min={1}
                max={32}
                step={1}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Learning Rate</Label>
            <Input
              type="number"
              value={sftConfig.learning_rate}
              onChange={(e) => setSftConfig({ learning_rate: parseFloat(e.target.value) || 2e-4 })}
              step={1e-5}
              min={1e-5}
              max={1e-3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Warmup Steps: {sftConfig.warmup_steps}</Label>
              <Slider
                value={[sftConfig.warmup_steps]}
                onValueChange={([v]) => setSftConfig({ warmup_steps: v })}
                min={0}
                max={500}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Weight Decay: {sftConfig.weight_decay}</Label>
              <Slider
                value={[sftConfig.weight_decay]}
                onValueChange={([v]) => setSftConfig({ weight_decay: v })}
                min={0}
                max={0.5}
                step={0.001}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">LR Scheduler</Label>
              <Select
                value={sftConfig.lr_scheduler_type}
                onValueChange={(v) => setSftConfig({ lr_scheduler_type: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEDULER_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Optimizer</Label>
              <Select
                value={sftConfig.optim}
                onValueChange={(v) => setSftConfig({ optim: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPTIM_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Logging Steps: {sftConfig.logging_steps}</Label>
              <Slider
                value={[sftConfig.logging_steps]}
                onValueChange={([v]) => setSftConfig({ logging_steps: v })}
                min={1}
                max={50}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Seed</Label>
              <Input
                type="number"
                value={sftConfig.seed}
                onChange={(e) => setSftConfig({ seed: parseInt(e.target.value) || 3407 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        {isTraining ? (
          <Button variant="destructive" onClick={handleStop} className="gap-2">
            <Square className="h-4 w-4" />
            Stop Training
          </Button>
        ) : (
          <Button
            onClick={handleStart}
            disabled={!canStart}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Start Training
          </Button>
        )}
        {!canStart && !isTraining && (
          <p className="text-sm text-muted-foreground self-center">
            {!datasetInfo
              ? "Upload a dataset first"
              : !mapping
                ? "Set column mapping first"
                : ""}
          </p>
        )}
      </div>
    </div>
  )
}
