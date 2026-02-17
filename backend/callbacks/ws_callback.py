import asyncio
import logging
import time
from transformers import TrainerCallback

from backend.ws.manager import ws_manager
from backend.config import settings

logger = logging.getLogger(__name__)


class WebSocketTrainerCallback(TrainerCallback):
    def __init__(self, loop: asyncio.AbstractEventLoop, save_best: bool = True, save_every_n: int = 0):
        self.loop = loop
        self._start_time = None
        self._step_times: list[float] = []
        self._save_best = save_best
        self._save_every_n = save_every_n
        self._best_loss = float("inf")
        self._best_step = 0

    def on_train_begin(self, args, state, control, **kwargs):
        self._start_time = time.time()
        ws_manager.broadcast_sync("training_started", {
            "total_steps": state.max_steps,
        }, self.loop)

    def on_log(self, args, state, control, logs=None, **kwargs):
        if logs is None:
            return
        step = state.global_step
        now = time.time()
        self._step_times.append(now)

        # Compute ETA
        eta = None
        if len(self._step_times) >= 2 and state.max_steps > 0:
            elapsed = self._step_times[-1] - self._step_times[0]
            steps_done = len(self._step_times) - 1
            if steps_done > 0:
                secs_per_step = elapsed / steps_done
                remaining = state.max_steps - step
                eta = secs_per_step * remaining

        loss = logs.get("loss")

        ws_manager.broadcast_sync("training_step", {
            "step": step,
            "total_steps": state.max_steps,
            "loss": loss,
            "learning_rate": logs.get("learning_rate"),
            "epoch": logs.get("epoch"),
            "grad_norm": logs.get("grad_norm"),
            "eta_seconds": eta,
        }, self.loop)

        # Track best loss and save checkpoint
        if self._save_best and loss is not None and loss < self._best_loss:
            self._best_loss = loss
            self._best_step = step
            try:
                from backend.services.model_manager import model_manager
                best_path = settings.adapter_dir / "best_adapter"
                best_path.mkdir(parents=True, exist_ok=True)
                if model_manager.model is not None:
                    model_manager.model.save_pretrained(str(best_path))
                    model_manager.tokenizer.save_pretrained(str(best_path))
                    logger.info("Saved best adapter at step %d (loss=%.4f)", step, loss)
                    ws_manager.broadcast_sync("training_checkpoint", {
                        "step": step,
                        "loss": loss,
                        "path": str(best_path),
                    }, self.loop)
            except Exception as e:
                logger.debug("Could not save best checkpoint: %s", e)

    def on_train_end(self, args, state, control, **kwargs):
        total_time = time.time() - self._start_time if self._start_time else 0
        ws_manager.broadcast_sync("training_complete", {
            "total_steps": state.global_step,
            "total_time_seconds": round(total_time, 2),
            "best_loss": self._best_loss if self._best_loss < float("inf") else None,
            "best_step": self._best_step,
        }, self.loop)
