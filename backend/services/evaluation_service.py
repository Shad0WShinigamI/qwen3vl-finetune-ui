import asyncio
import logging

from backend.services.model_manager import model_manager
from backend.services.dataset_service import get_current_df, get_current_mapping, get_image_urls_for_row, check_row_mandatory
from backend.services.inference_service import generate
from backend.utils.metrics import compute_metrics, compute_classification_metrics
from backend.ws.manager import ws_manager

logger = logging.getLogger(__name__)


def run_evaluation(
    adapter_path: str | None,
    sample_limit: int,
    generation_params: dict,
    loop: asyncio.AbstractEventLoop,
    classification_mode: bool = False,
) -> dict:
    """Run evaluation synchronously (called via asyncio.to_thread)."""
    df = get_current_df()
    mapping = get_current_mapping()

    if df is None or mapping is None:
        raise ValueError("Dataset and mapping must be set before evaluation")

    gt_col = mapping.ground_truth_column or mapping.response_column

    eval_df = df.head(sample_limit)
    total = len(eval_df)

    model_type = "finetuned" if adapter_path else "base"
    samples = []
    all_predictions = []
    all_ground_truths = []
    total_em = 0.0
    total_precision = 0.0
    total_recall = 0.0
    total_f1 = 0.0
    num_skipped = 0
    num_evaluated = 0

    # Broadcast progress every N samples to avoid flooding the browser
    broadcast_interval = max(1, total // 20)  # ~20 updates total

    for i, (_, row) in enumerate(eval_df.iterrows()):
        prompt_text = str(row[mapping.prompt_column])
        ground_truth = str(row[gt_col])
        image_urls = get_image_urls_for_row(row, mapping)

        # Check mandatory columns — skip but preserve row slot
        skip_reason = check_row_mandatory(row, mapping)
        if skip_reason:
            num_skipped += 1
            samples.append({
                "index": i,
                "prompt": prompt_text,
                "ground_truth": ground_truth,
                "prediction": "",
                "image_urls": image_urls,
                "exact_match": 0.0,
                "token_precision": 0.0,
                "token_recall": 0.0,
                "token_f1": 0.0,
                "skipped": True,
                "skipped_reason": skip_reason,
            })
            # Still broadcast progress for skipped rows
            if (i + 1) % broadcast_interval == 0 or i == total - 1:
                ws_manager.broadcast_sync("eval_progress", {
                    "current": i + 1,
                    "total": total,
                    "model_type": model_type,
                }, loop)
            continue

        try:
            result = generate(
                prompt=prompt_text,
                image_urls=image_urls,
                adapter_path=adapter_path,
                generation_params=generation_params,
            )
            prediction = result["output"]
        except Exception as e:
            logger.warning("Eval sample %d failed: %s", i, e)
            prediction = ""

        all_predictions.append(prediction)
        all_ground_truths.append(ground_truth)

        metrics = compute_metrics(prediction, ground_truth)
        num_evaluated += 1
        total_em += metrics["exact_match"]
        total_precision += metrics["token_precision"]
        total_recall += metrics["token_recall"]
        total_f1 += metrics["token_f1"]

        samples.append({
            "index": i,
            "prompt": prompt_text,
            "ground_truth": ground_truth,
            "prediction": prediction,
            "image_urls": image_urls,
            "skipped": False,
            "skipped_reason": None,
            **metrics,
        })

        # Throttled progress broadcast
        if (i + 1) % broadcast_interval == 0 or i == total - 1:
            ws_manager.broadcast_sync("eval_progress", {
                "current": i + 1,
                "total": total,
                "model_type": model_type,
            }, loop)

    n = num_evaluated or 1
    if num_skipped > 0:
        logger.info("Evaluation: %d evaluated, %d skipped due to mandatory columns", num_evaluated, num_skipped)

    result_data: dict = {
        "model_type": model_type,
        "metrics": {
            "model_type": model_type,
            "exact_match_accuracy": round(total_em / n, 4),
            "token_precision": round(total_precision / n, 4),
            "token_recall": round(total_recall / n, 4),
            "token_f1": round(total_f1 / n, 4),
            "num_samples": len(samples),
            "num_skipped": num_skipped,
        },
        "samples": samples,
    }

    if classification_mode:
        cls_metrics = compute_classification_metrics(all_predictions, all_ground_truths)
        cls_metrics["model_type"] = model_type
        result_data["classification_metrics"] = cls_metrics

    return result_data
