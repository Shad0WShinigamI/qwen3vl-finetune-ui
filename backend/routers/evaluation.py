import asyncio
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db, async_session
from backend.models.training_run import EvaluationRun, EvalSample
from backend.schemas.evaluation import EvalRequest
from backend.services import evaluation_service
from backend.services.model_manager import model_manager
from backend.ws.manager import ws_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/evaluation", tags=["evaluation"])

_eval_status = {"running": False, "model_type": None}


def _run_to_dict(r: EvaluationRun) -> dict:
    d: dict = {
        "id": r.id,
        "model_type": r.model_type,
        "eval_mode": r.eval_mode,
        "num_samples": r.num_samples,
        "num_skipped": r.num_skipped,
        "created_at": r.created_at.isoformat(),
    }
    if r.eval_mode == "classification":
        d.update({
            "cls_accuracy": r.cls_accuracy,
            "cls_precision": r.cls_precision,
            "cls_recall": r.cls_recall,
            "cls_f1": r.cls_f1,
            "cls_tp": r.cls_tp,
            "cls_fp": r.cls_fp,
            "cls_tn": r.cls_tn,
            "cls_fn": r.cls_fn,
        })
    else:
        d.update({
            "exact_match_accuracy": r.exact_match_accuracy,
            "token_precision": r.token_precision,
            "token_recall": r.token_recall,
            "token_f1": r.token_f1,
        })
    return d


async def _save_eval_to_db(result: dict) -> int:
    """Save evaluation results to the database. Returns the run ID."""
    async with async_session() as db:
        metrics = result["metrics"]
        cls = result.get("classification_metrics")
        is_cls = cls is not None

        run = EvaluationRun(
            session_id=None,
            adapter_path=None,
            model_type=metrics["model_type"],
            eval_mode="classification" if is_cls else "token",
            num_samples=metrics["num_samples"],
            num_skipped=metrics.get("num_skipped", 0),
            exact_match_accuracy=metrics["exact_match_accuracy"],
            token_precision=metrics["token_precision"],
            token_recall=metrics["token_recall"],
            token_f1=metrics["token_f1"],
            cls_accuracy=cls["accuracy"] if cls else 0.0,
            cls_precision=cls["precision"] if cls else 0.0,
            cls_recall=cls["recall"] if cls else 0.0,
            cls_f1=cls["f1"] if cls else 0.0,
            cls_tp=cls["tp"] if cls else 0,
            cls_fp=cls["fp"] if cls else 0,
            cls_tn=cls["tn"] if cls else 0,
            cls_fn=cls["fn"] if cls else 0,
        )
        db.add(run)
        await db.flush()

        for s in result["samples"]:
            sample = EvalSample(
                eval_run_id=run.id,
                sample_index=s["index"],
                prompt=s["prompt"],
                ground_truth=s["ground_truth"],
                prediction=s["prediction"],
                image_urls=json.dumps(s.get("image_urls", [])),
                exact_match=s["exact_match"],
                token_precision=s["token_precision"],
                token_recall=s["token_recall"],
                token_f1=s["token_f1"],
                skipped=1 if s.get("skipped") else 0,
                skipped_reason=s.get("skipped_reason"),
            )
            db.add(sample)

        await db.commit()
        logger.info("Saved eval run #%d (%s) with %d samples", run.id, run.eval_mode, len(result["samples"]))
        return run.id


@router.post("/run")
async def run_evaluation(req: EvalRequest):
    if model_manager.is_training:
        raise HTTPException(409, "Model is currently training")
    if _eval_status["running"]:
        raise HTTPException(409, "Evaluation already in progress")

    _eval_status["running"] = True
    _eval_status["model_type"] = "finetuned" if req.adapter_path else "base"

    loop = asyncio.get_event_loop()

    async def _run():
        try:
            result = await asyncio.to_thread(
                evaluation_service.run_evaluation,
                req.adapter_path,
                req.sample_limit,
                req.generation_params,
                loop,
                req.classification_mode,
            )

            # Save to database
            run_id = await _save_eval_to_db(result)

            # Broadcast completion with just metrics (no samples — those are in the DB)
            payload: dict = {
                "model_type": result["model_type"],
                "metrics": result["metrics"],
                "run_id": run_id,
            }
            if "classification_metrics" in result:
                payload["classification_metrics"] = result["classification_metrics"]
            await ws_manager.broadcast("eval_complete", payload)

        except Exception as e:
            logger.exception("Evaluation failed")
            await ws_manager.broadcast("eval_error", {"error": str(e)})
        finally:
            _eval_status["running"] = False

    asyncio.create_task(_run())
    return {"status": "started", "model_type": _eval_status["model_type"]}


@router.get("/status")
async def eval_status():
    return _eval_status


@router.get("/runs")
async def list_runs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EvaluationRun).order_by(EvaluationRun.created_at.desc()).limit(20)
    )
    runs = result.scalars().all()
    return {"runs": [_run_to_dict(r) for r in runs]}


@router.delete("/runs/{run_id}")
async def delete_run(run_id: int, db: AsyncSession = Depends(get_db)):
    run = await db.get(EvaluationRun, run_id)
    if not run:
        raise HTTPException(404, "Evaluation run not found")
    # Delete samples first
    samples = await db.execute(
        select(EvalSample).where(EvalSample.eval_run_id == run_id)
    )
    for s in samples.scalars().all():
        await db.delete(s)
    await db.delete(run)
    await db.commit()
    return {"status": "deleted"}


@router.get("/runs/{run_id}")
async def get_run(run_id: int, db: AsyncSession = Depends(get_db)):
    run = await db.get(EvaluationRun, run_id)
    if not run:
        raise HTTPException(404, "Evaluation run not found")
    return _run_to_dict(run)


@router.get("/runs/{run_id}/samples")
async def get_run_samples(
    run_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Paginated sample results for a given eval run."""
    run = await db.get(EvaluationRun, run_id)
    if not run:
        raise HTTPException(404, "Evaluation run not found")

    # Count
    count_result = await db.execute(
        select(func.count()).where(EvalSample.eval_run_id == run_id)
    )
    total = count_result.scalar() or 0

    # Fetch page
    offset = (page - 1) * page_size
    result = await db.execute(
        select(EvalSample)
        .where(EvalSample.eval_run_id == run_id)
        .order_by(EvalSample.sample_index)
        .offset(offset)
        .limit(page_size)
    )
    samples = result.scalars().all()

    return {
        "samples": [
            {
                "index": s.sample_index,
                "prompt": s.prompt,
                "ground_truth": s.ground_truth,
                "prediction": s.prediction,
                "image_urls": json.loads(s.image_urls) if s.image_urls else [],
                "exact_match": s.exact_match,
                "token_precision": s.token_precision,
                "token_recall": s.token_recall,
                "token_f1": s.token_f1,
                "skipped": bool(s.skipped),
                "skipped_reason": s.skipped_reason,
            }
            for s in samples
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/export/{run_id}")
async def export_results(run_id: int, format: str = "json", db: AsyncSession = Depends(get_db)):
    run = await db.get(EvaluationRun, run_id)
    if not run:
        raise HTTPException(404, "Evaluation run not found")

    result = await db.execute(
        select(EvalSample).where(EvalSample.eval_run_id == run_id).order_by(EvalSample.sample_index)
    )
    samples = result.scalars().all()

    data = {
        "metrics": {
            "exact_match_accuracy": run.exact_match_accuracy,
            "token_precision": run.token_precision,
            "token_recall": run.token_recall,
            "token_f1": run.token_f1,
            "num_samples": run.num_samples,
            "num_skipped": run.num_skipped,
        },
        "samples": [
            {
                "index": s.sample_index,
                "prompt": s.prompt,
                "ground_truth": s.ground_truth,
                "prediction": s.prediction,
                "exact_match": s.exact_match,
                "token_f1": s.token_f1,
                "skipped": bool(s.skipped),
                "skipped_reason": s.skipped_reason or "",
            }
            for s in samples
        ],
    }

    if format == "csv":
        import pandas as pd
        df = pd.DataFrame(data["samples"])
        csv_content = df.to_csv(index=False)
        from fastapi.responses import Response
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=eval_{run_id}.csv"},
        )

    return data
