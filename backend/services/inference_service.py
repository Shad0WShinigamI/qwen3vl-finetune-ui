import logging
import time

import torch

from backend.services.model_manager import model_manager
from backend.utils.image import download_images

logger = logging.getLogger(__name__)


def generate(
    prompt: str,
    image_urls: list[str],
    adapter_path: str | None = None,
    generation_params: dict | None = None,
) -> dict:
    if model_manager.is_training:
        raise RuntimeError("Model is currently training")

    gen_params = generation_params or {}

    # Load adapter if specified and different from current
    if adapter_path:
        if model_manager._current_adapter_path != adapter_path:
            model_manager.load_adapter(adapter_path)
        model_type = "finetuned"
    else:
        # Base model requested — reload if adapter is currently loaded
        if not model_manager.is_loaded or model_manager._current_adapter_path is not None:
            model_manager.load_model()
        model_type = "base"

    if model_manager.status != "inference":
        model_manager.for_inference()

    # Build messages
    user_content = []
    images = []
    if image_urls:
        images = download_images(image_urls)
        for _ in images:
            user_content.append({"type": "image"})
    user_content.append({"type": "text", "text": prompt})

    messages = [{"role": "user", "content": user_content}]

    tokenizer = model_manager.tokenizer
    input_text = tokenizer.apply_chat_template(messages, add_generation_prompt=True)

    # Tokenize with images — no truncation during inference to avoid
    # cutting off image tokens (vision models expand images to thousands of tokens)
    if images:
        inputs = tokenizer(
            images[0] if len(images) == 1 else images,
            input_text,
            add_special_tokens=False,
            return_tensors="pt",
            truncation=False,
        ).to("cuda")
    else:
        inputs = tokenizer(
            input_text,
            add_special_tokens=False,
            return_tensors="pt",
            truncation=False,
        ).to("cuda")

    start = time.time()
    output = model_manager.generate(
        inputs,
        max_new_tokens=gen_params.get("max_new_tokens", 256),
        temperature=gen_params.get("temperature", 0.7),
        top_p=gen_params.get("top_p", 0.9),
        min_p=gen_params.get("min_p", 0.0),
        do_sample=gen_params.get("do_sample", True),
        use_cache=True,
    )
    elapsed_ms = (time.time() - start) * 1000

    return {
        "output": output,
        "model_type": model_type,
        "generation_time_ms": round(elapsed_ms, 1),
    }


def compare(
    prompt: str,
    image_urls: list[str],
    adapter_path: str,
    generation_params: dict | None = None,
) -> dict:
    """Generate from both base and finetuned model for comparison."""
    if model_manager.is_training:
        raise RuntimeError("Model is currently training")

    # Generate with base model
    model_manager.load_model()
    base_result = generate(prompt, image_urls, adapter_path=None, generation_params=generation_params)

    # Generate with finetuned model
    ft_result = generate(prompt, image_urls, adapter_path=adapter_path, generation_params=generation_params)

    return {
        "base_output": base_result["output"],
        "finetuned_output": ft_result["output"],
        "base_time_ms": base_result["generation_time_ms"],
        "finetuned_time_ms": ft_result["generation_time_ms"],
    }
