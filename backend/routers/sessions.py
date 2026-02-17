import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.session import TrainingSession
from backend.schemas.session import SessionCreate, SessionUpdate, SessionResponse, SessionListResponse

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("/", response_model=SessionListResponse)
async def list_sessions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TrainingSession).order_by(TrainingSession.updated_at.desc())
    )
    sessions = result.scalars().all()
    return SessionListResponse(
        sessions=[
            SessionResponse(
                id=s.id,
                name=s.name,
                description=s.description,
                status=s.status,
                dataset_config=s.dataset_config,
                training_config=s.training_config,
                lora_config=s.lora_config,
                adapter_path=s.adapter_path,
                dataset_path=s.dataset_path,
                created_at=s.created_at.isoformat(),
                updated_at=s.updated_at.isoformat(),
            )
            for s in sessions
        ]
    )


@router.post("/", response_model=SessionResponse)
async def create_session(req: SessionCreate, db: AsyncSession = Depends(get_db)):
    session = TrainingSession(name=req.name, description=req.description)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return SessionResponse(
        id=session.id,
        name=session.name,
        description=session.description,
        status=session.status,
        dataset_config=session.dataset_config,
        training_config=session.training_config,
        lora_config=session.lora_config,
        adapter_path=session.adapter_path,
        dataset_path=session.dataset_path,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
    )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    session = await db.get(TrainingSession, session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return SessionResponse(
        id=session.id,
        name=session.name,
        description=session.description,
        status=session.status,
        dataset_config=session.dataset_config,
        training_config=session.training_config,
        lora_config=session.lora_config,
        adapter_path=session.adapter_path,
        dataset_path=session.dataset_path,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
    )


@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(session_id: int, req: SessionUpdate, db: AsyncSession = Depends(get_db)):
    session = await db.get(TrainingSession, session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    if req.name is not None:
        session.name = req.name
    if req.description is not None:
        session.description = req.description
    await db.commit()
    await db.refresh(session)
    return SessionResponse(
        id=session.id,
        name=session.name,
        description=session.description,
        status=session.status,
        dataset_config=session.dataset_config,
        training_config=session.training_config,
        lora_config=session.lora_config,
        adapter_path=session.adapter_path,
        dataset_path=session.dataset_path,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
    )


@router.delete("/{session_id}")
async def delete_session(session_id: int, db: AsyncSession = Depends(get_db)):
    session = await db.get(TrainingSession, session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    await db.delete(session)
    await db.commit()
    return {"status": "deleted"}


@router.post("/{session_id}/clone", response_model=SessionResponse)
async def clone_session(session_id: int, db: AsyncSession = Depends(get_db)):
    original = await db.get(TrainingSession, session_id)
    if not original:
        raise HTTPException(404, "Session not found")
    clone = TrainingSession(
        name=f"{original.name} (copy)",
        description=original.description,
        dataset_config=original.dataset_config,
        training_config=original.training_config,
        lora_config=original.lora_config,
        adapter_path=original.adapter_path,
        dataset_path=original.dataset_path,
    )
    db.add(clone)
    await db.commit()
    await db.refresh(clone)
    return SessionResponse(
        id=clone.id,
        name=clone.name,
        description=clone.description,
        status=clone.status,
        dataset_config=clone.dataset_config,
        training_config=clone.training_config,
        lora_config=clone.lora_config,
        adapter_path=clone.adapter_path,
        dataset_path=clone.dataset_path,
        created_at=clone.created_at.isoformat(),
        updated_at=clone.updated_at.isoformat(),
    )


@router.post("/{session_id}/save-config")
async def save_session_config(
    session_id: int,
    config: dict,
    db: AsyncSession = Depends(get_db),
):
    session = await db.get(TrainingSession, session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    if "dataset_config" in config:
        session.dataset_config = json.dumps(config["dataset_config"])
    if "training_config" in config:
        session.training_config = json.dumps(config["training_config"])
    if "lora_config" in config:
        session.lora_config = json.dumps(config["lora_config"])
    if "adapter_path" in config:
        session.adapter_path = config["adapter_path"]
    if "dataset_path" in config:
        session.dataset_path = config["dataset_path"]
    if "status" in config:
        session.status = config["status"]

    await db.commit()
    return {"status": "saved"}
