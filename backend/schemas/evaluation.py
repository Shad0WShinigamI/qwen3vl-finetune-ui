from pydantic import BaseModel, Field


class EvalRequest(BaseModel):
    adapter_path: str | None = None
    sample_limit: int = Field(default=50, ge=1, le=100000)
    classification_mode: bool = False
    generation_params: dict = Field(default_factory=lambda: {
        "max_new_tokens": 256,
        "temperature": 0.1,
        "do_sample": False,
    })


class EvalMetrics(BaseModel):
    model_type: str
    exact_match_accuracy: float
    token_precision: float
    token_recall: float
    token_f1: float
    num_samples: int
    num_skipped: int = 0


class EvalSampleResult(BaseModel):
    index: int
    prompt: str
    ground_truth: str
    prediction: str
    image_urls: list[str]
    exact_match: float
    token_precision: float
    token_recall: float
    token_f1: float
    skipped: bool = False
    skipped_reason: str | None = None


class EvalRunResponse(BaseModel):
    id: int
    session_id: int | None
    metrics: EvalMetrics
    samples: list[EvalSampleResult]


class EvalCompareResponse(BaseModel):
    base: EvalMetrics
    finetuned: EvalMetrics
    samples: list[dict]
