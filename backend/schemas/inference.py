from pydantic import BaseModel, Field


class GenerationParams(BaseModel):
    max_new_tokens: int = Field(default=256, ge=1, le=4096)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)
    min_p: float = Field(default=0.0, ge=0.0, le=1.0)
    do_sample: bool = True


class InferenceRequest(BaseModel):
    prompt: str
    image_urls: list[str] = []
    adapter_path: str | None = None
    generation_params: GenerationParams = Field(default_factory=GenerationParams)


class InferenceResponse(BaseModel):
    output: str
    model_type: str  # "base" or "finetuned"
    generation_time_ms: float


class CompareRequest(BaseModel):
    prompt: str
    image_urls: list[str] = []
    adapter_path: str
    generation_params: GenerationParams = Field(default_factory=GenerationParams)


class CompareResponse(BaseModel):
    base_output: str
    finetuned_output: str
    base_time_ms: float
    finetuned_time_ms: float
