from fastapi import APIRouter, HTTPException

from backend.utils.gpu import get_gpu_stats
from backend.services.model_manager import model_manager

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/gpu")
async def gpu_stats():
    return get_gpu_stats()


@router.post("/unload-model")
async def unload_model():
    if model_manager.is_training:
        raise HTTPException(409, "Cannot unload model during training")
    model_manager.unload()
    return {"status": "ok", "message": "Model unloaded, GPU memory freed"}


@router.get("/model-status")
async def model_status():
    return {
        "loaded": model_manager.is_loaded,
        "mode": model_manager.status,
        "adapter": model_manager._current_adapter_path,
    }
