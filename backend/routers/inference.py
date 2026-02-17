import asyncio
from fastapi import APIRouter, HTTPException

from backend.schemas.inference import (
    InferenceRequest,
    InferenceResponse,
    CompareRequest,
    CompareResponse,
)
from backend.services import inference_service
from backend.services.model_manager import model_manager

router = APIRouter(prefix="/api/inference", tags=["inference"])


@router.post("/generate", response_model=InferenceResponse)
async def generate(req: InferenceRequest):
    if model_manager.is_training:
        raise HTTPException(409, "Model is currently training")

    try:
        result = await asyncio.to_thread(
            inference_service.generate,
            req.prompt,
            req.image_urls,
            req.adapter_path,
            req.generation_params.model_dump(),
        )
        return InferenceResponse(**result)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/compare", response_model=CompareResponse)
async def compare(req: CompareRequest):
    if model_manager.is_training:
        raise HTTPException(409, "Model is currently training")

    try:
        result = await asyncio.to_thread(
            inference_service.compare,
            req.prompt,
            req.image_urls,
            req.adapter_path,
            req.generation_params.model_dump(),
        )
        return CompareResponse(**result)
    except Exception as e:
        raise HTTPException(500, str(e))
