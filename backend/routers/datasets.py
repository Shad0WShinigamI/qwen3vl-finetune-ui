import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException

from backend.config import settings
from backend.schemas.dataset import (
    ColumnMappingRequest,
    DatasetInfo,
    DatasetPreviewRequest,
    DatasetPreviewResponse,
    ConversationPreviewItem,
)
from backend.services import dataset_service

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.post("/upload", response_model=DatasetInfo)
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are accepted")

    dest = settings.upload_dir / file.filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    df = dataset_service.load_csv(str(dest))
    sample_rows = df.head(5).fillna("").to_dict(orient="records")

    return DatasetInfo(
        filename=file.filename,
        num_rows=len(df),
        num_columns=len(df.columns),
        columns=list(df.columns),
        sample_rows=sample_rows,
    )


@router.get("/columns")
async def get_columns():
    df = dataset_service.get_current_df()
    if df is None:
        raise HTTPException(404, "No dataset loaded")
    return {"columns": list(df.columns)}


@router.post("/mapping")
async def set_column_mapping(mapping: ColumnMappingRequest):
    df = dataset_service.get_current_df()
    if df is None:
        raise HTTPException(404, "No dataset loaded")

    # Validate columns exist
    all_cols = set(df.columns)
    for col in [mapping.prompt_column, mapping.response_column]:
        if col not in all_cols:
            raise HTTPException(400, f"Column '{col}' not found in dataset")
    if mapping.ground_truth_column and mapping.ground_truth_column not in all_cols:
        raise HTTPException(400, f"Column '{mapping.ground_truth_column}' not found")
    for col in mapping.image_url_columns:
        if col not in all_cols:
            raise HTTPException(400, f"Image column '{col}' not found")
    for col in mapping.mandatory_columns:
        if col not in all_cols:
            raise HTTPException(400, f"Mandatory column '{col}' not found in dataset")

    dataset_service.set_mapping(mapping)
    return {"status": "ok", "mapping": mapping.model_dump()}


@router.get("/mapping")
async def get_column_mapping():
    mapping = dataset_service.get_current_mapping()
    if mapping is None:
        return {"mapping": None}
    return {"mapping": mapping.model_dump()}


@router.post("/preview", response_model=DatasetPreviewResponse)
async def preview_dataset(req: DatasetPreviewRequest):
    result = dataset_service.get_preview(req.page, req.page_size)
    return DatasetPreviewResponse(**result)


@router.get("/preview/conversations")
async def preview_conversations(start: int = 0, count: int = 5):
    previews = dataset_service.get_conversation_preview(start, count)
    return {"conversations": previews}


@router.get("/info")
async def dataset_info():
    df = dataset_service.get_current_df()
    if df is None:
        return {"loaded": False}
    return {
        "loaded": True,
        "filename": dataset_service.get_current_filename(),
        "num_rows": len(df),
        "num_columns": len(df.columns),
        "columns": list(df.columns),
    }
