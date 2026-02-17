import asyncio
from fastapi import APIRouter, HTTPException

from backend.schemas.training import (
    TrainingStartRequest,
    TrainingStatusResponse,
    AdapterInfo,
)
from backend.services import training_service, dataset_service

router = APIRouter(prefix="/api/training", tags=["training"])


@router.post("/start")
async def start_training(req: TrainingStartRequest):
    # Check dataset is ready
    if dataset_service.get_current_df() is None:
        raise HTTPException(400, "No dataset loaded")
    if dataset_service.get_current_mapping() is None:
        raise HTTPException(400, "Column mapping not set")

    status = training_service.get_training_status()
    if status["status"] in ("training", "loading_model", "preparing_data"):
        raise HTTPException(409, "Training already in progress")

    loop = asyncio.get_event_loop()

    async def _run():
        try:
            return await asyncio.to_thread(
                training_service.run_training,
                req.model_config_data.model_dump(),
                req.sft_config.model_dump(),
                req.lora_config.model_dump(),
                loop,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).exception("Training task failed")
            training_service._training_status["status"] = "error"
            training_service._training_status["error_message"] = str(e)
            from backend.ws.manager import ws_manager
            await ws_manager.broadcast("training_error", {"error": str(e)})

    asyncio.create_task(_run())
    return {"status": "started"}


@router.post("/stop")
async def stop_training():
    success = training_service.stop_training()
    if not success:
        raise HTTPException(400, "No training in progress to stop")
    return {"status": "stopping"}


@router.get("/status", response_model=TrainingStatusResponse)
async def get_training_status():
    return training_service.get_training_status()


@router.get("/adapters")
async def list_adapters():
    return {"adapters": training_service.list_adapters()}
