import asyncio
import logging
import time
from datetime import datetime

from backend.callbacks.ws_callback import WebSocketTrainerCallback
from backend.services.model_manager import model_manager
from backend.services.dataset_service import build_training_dataset
from backend.ws.manager import ws_manager
from backend.config import settings

logger = logging.getLogger(__name__)

# Training state
_trainer = None
_training_status = {
    "status": "idle",
    "current_step": 0,
    "total_steps": 0,
    "loss": None,
    "learning_rate": None,
    "eta_seconds": None,
    "error_message": None,
}


def get_training_status() -> dict:
    return _training_status.copy()


def _reset_status():
    global _training_status
    _training_status = {
        "status": "idle",
        "current_step": 0,
        "total_steps": 0,
        "loss": None,
        "learning_rate": None,
        "eta_seconds": None,
        "error_message": None,
    }


def run_training(
    model_config: dict,
    sft_config: dict,
    lora_config: dict,
    loop: asyncio.AbstractEventLoop,
) -> dict:
    """Run training synchronously (called via asyncio.to_thread)."""
    global _trainer, _training_status

    try:
        _training_status["status"] = "loading_model"
        ws_manager.broadcast_sync("training_status", {"status": "loading_model", "message": "Loading model..."}, loop)
        logger.info("Loading model: %s", model_config.get("model_name"))

        # Load model
        model_manager.load_model(
            model_name=model_config.get("model_name"),
            max_seq_length=model_config.get("max_seq_length", 2048),
        )
        ws_manager.broadcast_sync("training_status", {"status": "loading_model", "message": "Applying LoRA adapters..."}, loop)

        # Apply LoRA
        model_manager.apply_lora(lora_config)

        # Set to training mode
        model_manager.for_training()

        _training_status["status"] = "preparing_data"
        ws_manager.broadcast_sync("training_status", {"status": "preparing_data", "message": "Building training dataset..."}, loop)

        # Build dataset
        dataset, num_skipped = build_training_dataset()
        logger.info("Training dataset built with %d samples (%d rows skipped due to mandatory columns)", len(dataset), num_skipped)
        if num_skipped > 0:
            ws_manager.broadcast_sync("training_status", {
                "status": "preparing_data",
                "message": f"Dataset ready: {len(dataset)} samples ({num_skipped} rows skipped)",
            }, loop)

        _training_status["status"] = "training"

        # Create trainer
        from unsloth.trainer import UnslothVisionDataCollator
        from trl import SFTTrainer, SFTConfig

        use_epochs = sft_config.pop("use_epochs", False)
        max_seq_length = sft_config.pop("max_seq_length", 2048)

        sft_args = SFTConfig(
            per_device_train_batch_size=sft_config.get("per_device_train_batch_size", 2),
            gradient_accumulation_steps=sft_config.get("gradient_accumulation_steps", 4),
            warmup_steps=sft_config.get("warmup_steps", 5),
            max_steps=sft_config.get("max_steps", 30) if not use_epochs else -1,
            num_train_epochs=sft_config.get("num_train_epochs", 1) if use_epochs else 1,
            learning_rate=sft_config.get("learning_rate", 2e-4),
            logging_steps=sft_config.get("logging_steps", 1),
            optim=sft_config.get("optim", "adamw_8bit"),
            weight_decay=sft_config.get("weight_decay", 0.01),
            lr_scheduler_type=sft_config.get("lr_scheduler_type", "linear"),
            seed=sft_config.get("seed", 3407),
            output_dir=str(settings.data_dir / "training_output"),
            report_to="none",
            fp16=sft_config.get("fp16", False),
            bf16=sft_config.get("bf16", True),
            remove_unused_columns=False,
            dataset_text_field="",
            dataset_kwargs={"skip_prepare_dataset": True},
            max_length=max_seq_length,
        )

        ws_callback = WebSocketTrainerCallback(loop)

        _trainer = SFTTrainer(
            model=model_manager.model,
            tokenizer=model_manager.tokenizer,
            data_collator=UnslothVisionDataCollator(model_manager.model, model_manager.tokenizer),
            train_dataset=dataset,
            args=sft_args,
            callbacks=[ws_callback],
        )

        _training_status["total_steps"] = sft_args.max_steps if sft_args.max_steps > 0 else 0

        # Train
        start_time = time.time()
        trainer_stats = _trainer.train()
        elapsed = time.time() - start_time

        # Save adapter
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        adapter_name = f"adapter_{timestamp}"
        adapter_path = str(settings.adapter_dir / adapter_name)
        model_manager.save_adapter(adapter_path)

        _training_status["status"] = "completed"
        model_manager.set_idle()

        return {
            "status": "completed",
            "adapter_path": adapter_path,
            "metrics": {
                "train_runtime": round(elapsed, 2),
                "train_loss": trainer_stats.metrics.get("train_loss"),
                "total_steps": trainer_stats.metrics.get("total_flos", 0),
            },
        }

    except Exception as e:
        logger.exception("Training failed")
        _training_status["status"] = "error"
        _training_status["error_message"] = str(e)
        model_manager.set_idle()
        ws_manager.broadcast_sync("training_error", {"error": str(e)}, loop)
        return {"status": "error", "error": str(e)}


def stop_training():
    global _trainer, _training_status
    if _trainer is not None and _training_status["status"] == "training":
        _training_status["status"] = "stopping"
        _trainer.args.max_steps = _trainer.state.global_step
        return True
    return False


def list_adapters() -> list[dict]:
    adapters = []
    adapter_dir = settings.adapter_dir
    if adapter_dir.exists():
        for p in sorted(adapter_dir.iterdir()):
            if p.is_dir() and (p / "adapter_config.json").exists():
                import os
                stat = os.stat(p)
                adapters.append({
                    "name": p.name,
                    "path": str(p),
                    "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                })
    return adapters
