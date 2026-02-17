def exact_match(prediction: str, ground_truth: str) -> float:
    return 1.0 if prediction.strip().lower() == ground_truth.strip().lower() else 0.0


def _tokenize(text: str) -> list[str]:
    return text.strip().lower().split()


def token_precision_recall_f1(prediction: str, ground_truth: str) -> dict:
    pred_tokens = _tokenize(prediction)
    truth_tokens = _tokenize(ground_truth)

    if not pred_tokens and not truth_tokens:
        return {"precision": 1.0, "recall": 1.0, "f1": 1.0}
    if not pred_tokens:
        return {"precision": 0.0, "recall": 0.0, "f1": 0.0}
    if not truth_tokens:
        return {"precision": 0.0, "recall": 0.0, "f1": 0.0}

    common = set(pred_tokens) & set(truth_tokens)
    num_common = sum(min(pred_tokens.count(t), truth_tokens.count(t)) for t in common)

    precision = num_common / len(pred_tokens) if pred_tokens else 0.0
    recall = num_common / len(truth_tokens) if truth_tokens else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    return {"precision": precision, "recall": recall, "f1": f1}


def compute_metrics(prediction: str, ground_truth: str) -> dict:
    em = exact_match(prediction, ground_truth)
    token_metrics = token_precision_recall_f1(prediction, ground_truth)
    return {
        "exact_match": em,
        "token_precision": token_metrics["precision"],
        "token_recall": token_metrics["recall"],
        "token_f1": token_metrics["f1"],
    }


# --- Binary classification metrics ---

_POSITIVE_LABELS = {"yes", "true", "1", "positive", "correct"}
_NEGATIVE_LABELS = {"no", "false", "0", "negative", "incorrect"}


def _normalize_binary(text: str) -> str | None:
    """Normalize a prediction/ground truth to 'positive' or 'negative'."""
    t = text.strip().lower().rstrip(".!,")
    if t in _POSITIVE_LABELS:
        return "positive"
    if t in _NEGATIVE_LABELS:
        return "negative"
    # Try to find a keyword in longer text
    for w in _POSITIVE_LABELS:
        if w in t.split():
            return "positive"
    for w in _NEGATIVE_LABELS:
        if w in t.split():
            return "negative"
    return None


def compute_classification_metrics(predictions: list[str], ground_truths: list[str]) -> dict:
    """Compute binary classification metrics over the full batch."""
    tp = fp = tn = fn = 0
    skipped = 0

    for pred, gt in zip(predictions, ground_truths):
        gt_label = _normalize_binary(gt)
        pred_label = _normalize_binary(pred)

        if gt_label is None:
            skipped += 1
            continue

        # If prediction couldn't be parsed, treat as wrong
        if pred_label is None:
            if gt_label == "positive":
                fn += 1
            else:
                fp += 1
            continue

        if gt_label == "positive" and pred_label == "positive":
            tp += 1
        elif gt_label == "positive" and pred_label == "negative":
            fn += 1
        elif gt_label == "negative" and pred_label == "positive":
            fp += 1
        else:
            tn += 1

    total = tp + fp + tn + fn
    accuracy = (tp + tn) / total if total > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn,
        "total": total,
        "skipped": skipped,
    }
