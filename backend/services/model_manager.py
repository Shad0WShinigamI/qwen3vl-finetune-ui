import gc
import logging
import threading
from pathlib import Path

import torch

from backend.config import settings

logger = logging.getLogger(__name__)


class ModelManager:
    """Singleton managing GPU model lifecycle."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._model = None
        self._tokenizer = None
        self._model_name = None
        self._mode = "idle"  # idle, loading, training, inference
        self._op_lock = threading.Lock()
        self._current_adapter_path = None

    @property
    def status(self) -> str:
        return self._mode

    @property
    def model(self):
        return self._model

    @property
    def tokenizer(self):
        return self._tokenizer

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    @property
    def is_training(self) -> bool:
        return self._mode == "training"

    def load_model(self, model_name: str | None = None, max_seq_length: int = 2048):
        with self._op_lock:
            if self._mode == "training":
                raise RuntimeError("Cannot load model during training")

            target = model_name or settings.default_model_name
            if self._model is not None and self._model_name == target and self._current_adapter_path is None:
                logger.info("Model already loaded: %s", target)
                return

            self._mode = "loading"
            try:
                if self._model is not None:
                    del self._model
                    del self._tokenizer
                    gc.collect()
                    torch.cuda.empty_cache()

                from unsloth import FastVisionModel

                logger.info("Loading model: %s", target)
                model, tokenizer = FastVisionModel.from_pretrained(
                    target,
                    load_in_4bit=True,
                    use_gradient_checkpointing="unsloth",
                )
                self._model = model
                self._tokenizer = tokenizer
                self._model_name = target
                self._current_adapter_path = None
                self._mode = "idle"
                logger.info("Model loaded successfully: %s", target)
            except Exception:
                self._mode = "idle"
                raise

    def apply_lora(self, lora_config: dict):
        with self._op_lock:
            if self._model is None:
                raise RuntimeError("Model not loaded")
            if self._mode == "training":
                raise RuntimeError("Cannot apply LoRA during training")

            from unsloth import FastVisionModel

            self._model = FastVisionModel.get_peft_model(
                self._model,
                finetune_vision_layers=lora_config.get("finetune_vision_layers", True),
                finetune_language_layers=lora_config.get("finetune_language_layers", True),
                finetune_attention_modules=lora_config.get("finetune_attention_modules", True),
                finetune_mlp_modules=lora_config.get("finetune_mlp_modules", True),
                r=lora_config.get("r", 16),
                lora_alpha=lora_config.get("lora_alpha", 16),
                lora_dropout=lora_config.get("lora_dropout", 0.0),
                bias="none",
                random_state=3407,
                use_rslora=False,
                loftq_config=None,
            )
            self._current_adapter_path = None

    def for_training(self):
        with self._op_lock:
            if self._model is None:
                raise RuntimeError("Model not loaded")
            from unsloth import FastVisionModel
            FastVisionModel.for_training(self._model)
            self._mode = "training"

    def for_inference(self):
        with self._op_lock:
            if self._model is None:
                raise RuntimeError("Model not loaded")
            from unsloth import FastVisionModel
            FastVisionModel.for_inference(self._model)
            self._mode = "inference"

    def set_idle(self):
        self._mode = "idle"

    def save_adapter(self, save_path: str):
        with self._op_lock:
            if self._model is None:
                raise RuntimeError("Model not loaded")
            path = Path(save_path)
            path.mkdir(parents=True, exist_ok=True)
            self._model.save_pretrained(str(path))
            self._tokenizer.save_pretrained(str(path))
            self._current_adapter_path = str(path)
            logger.info("Adapter saved to: %s", path)
            return str(path)

    def load_adapter(self, adapter_path: str):
        """Load a saved LoRA adapter from disk."""
        with self._op_lock:
            if self._mode == "training":
                raise RuntimeError("Cannot load adapter during training")

            # Reload the base model with the adapter
            if self._model is not None:
                del self._model
                del self._tokenizer
                gc.collect()
                torch.cuda.empty_cache()

            from unsloth import FastVisionModel

            logger.info("Loading adapter from: %s", adapter_path)
            model, tokenizer = FastVisionModel.from_pretrained(
                model_name=adapter_path,
                load_in_4bit=True,
            )
            self._model = model
            self._tokenizer = tokenizer
            self._current_adapter_path = adapter_path
            self._mode = "idle"

    def unload(self):
        with self._op_lock:
            if self._mode == "training":
                raise RuntimeError("Cannot unload during training")
            if self._model is not None:
                del self._model
                del self._tokenizer
                gc.collect()
                torch.cuda.empty_cache()
            self._model = None
            self._tokenizer = None
            self._model_name = None
            self._current_adapter_path = None
            self._mode = "idle"

    def generate(self, inputs: dict, **gen_kwargs) -> str:
        if self._mode == "training":
            raise RuntimeError("Model is currently training")
        if self._model is None:
            raise RuntimeError("Model not loaded")

        with torch.no_grad():
            output_ids = self._model.generate(**inputs, **gen_kwargs)

        # Decode only the new tokens
        input_len = inputs["input_ids"].shape[1]
        new_tokens = output_ids[0][input_len:]
        return self._tokenizer.decode(new_tokens, skip_special_tokens=True)


model_manager = ModelManager()
