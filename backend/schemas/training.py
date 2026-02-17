from pydantic import BaseModel, Field


class SFTConfigSchema(BaseModel):
    per_device_train_batch_size: int = Field(default=2, ge=1, le=8)
    gradient_accumulation_steps: int = Field(default=4, ge=1, le=32)
    learning_rate: float = Field(default=2e-4, ge=1e-5, le=1e-3)
    max_steps: int = Field(default=30, ge=-1, le=10000)
    num_train_epochs: int = Field(default=1, ge=1, le=5)
    warmup_steps: int = Field(default=5, ge=0, le=500)
    weight_decay: float = Field(default=0.01, ge=0.0, le=0.5)
    lr_scheduler_type: str = Field(default="linear")
    max_seq_length: int = Field(default=2048, ge=512, le=8192)
    optim: str = Field(default="adamw_8bit")
    logging_steps: int = Field(default=1, ge=1, le=50)
    seed: int = Field(default=3407)
    fp16: bool = Field(default=False)
    bf16: bool = Field(default=True)
    use_epochs: bool = Field(default=False)


class LoRAConfigSchema(BaseModel):
    r: int = Field(default=16)
    lora_alpha: int = Field(default=16)
    lora_dropout: float = Field(default=0.0, ge=0.0, le=0.1)
    finetune_vision_layers: bool = Field(default=True)
    finetune_language_layers: bool = Field(default=True)
    finetune_attention_modules: bool = Field(default=True)
    finetune_mlp_modules: bool = Field(default=True)


class ModelConfigSchema(BaseModel):
    model_name: str = Field(default="unsloth/Qwen3-VL-8B-Instruct-unsloth-bnb-4bit")
    max_seq_length: int = Field(default=2048, ge=512, le=8192)


class TrainingStartRequest(BaseModel):
    model_config_data: ModelConfigSchema = Field(default_factory=ModelConfigSchema)
    sft_config: SFTConfigSchema = Field(default_factory=SFTConfigSchema)
    lora_config: LoRAConfigSchema = Field(default_factory=LoRAConfigSchema)
    session_name: str | None = None


class TrainingStatusResponse(BaseModel):
    status: str  # idle, loading_model, training, stopping, completed, error
    current_step: int = 0
    total_steps: int = 0
    loss: float | None = None
    learning_rate: float | None = None
    eta_seconds: float | None = None
    error_message: str | None = None


class AdapterInfo(BaseModel):
    name: str
    path: str
    created_at: str
    session_id: int | None = None
