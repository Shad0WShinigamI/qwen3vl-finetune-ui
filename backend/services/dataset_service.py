import json
import logging
from pathlib import Path

import pandas as pd

from backend.config import settings
from backend.schemas.dataset import ColumnMappingRequest
from backend.utils.image import download_images

logger = logging.getLogger(__name__)

_STATE_FILE = settings.data_dir / "dataset_state.json"

# Module-level state for current dataset
_current_df: pd.DataFrame | None = None
_current_mapping: ColumnMappingRequest | None = None
_current_filename: str | None = None
_current_file_path: str | None = None


def _save_state():
    """Persist current dataset path + mapping to disk so it survives backend restarts."""
    state: dict = {}
    if _current_file_path:
        state["file_path"] = _current_file_path
    if _current_filename:
        state["filename"] = _current_filename
    if _current_mapping:
        state["mapping"] = _current_mapping.model_dump()
    _STATE_FILE.write_text(json.dumps(state))


def restore_state():
    """Restore dataset + mapping from disk on startup."""
    global _current_df, _current_mapping, _current_filename, _current_file_path
    if not _STATE_FILE.exists():
        return
    try:
        state = json.loads(_STATE_FILE.read_text())
        fp = state.get("file_path")
        if fp and Path(fp).exists():
            _current_df = pd.read_csv(fp)
            _current_file_path = fp
            _current_filename = state.get("filename", Path(fp).name)
            logger.info("Restored dataset: %s (%d rows)", _current_filename, len(_current_df))
        mapping_data = state.get("mapping")
        if mapping_data and _current_df is not None:
            _current_mapping = ColumnMappingRequest(**mapping_data)
            logger.info("Restored column mapping")
    except Exception:
        logger.exception("Failed to restore dataset state")


def get_current_df() -> pd.DataFrame | None:
    return _current_df


def get_current_mapping() -> ColumnMappingRequest | None:
    return _current_mapping


def get_current_filename() -> str | None:
    return _current_filename


def load_csv(file_path: str) -> pd.DataFrame:
    global _current_df, _current_filename, _current_file_path
    df = pd.read_csv(file_path)
    _current_df = df
    _current_filename = Path(file_path).name
    _current_file_path = file_path
    _save_state()
    return df


def set_mapping(mapping: ColumnMappingRequest):
    global _current_mapping
    _current_mapping = mapping
    _save_state()


def get_preview(page: int = 1, page_size: int = 20) -> dict:
    if _current_df is None:
        return {"rows": [], "total_rows": 0, "page": page, "page_size": page_size, "total_pages": 0}

    total = len(_current_df)
    total_pages = max(1, (total + page_size - 1) // page_size)
    start = (page - 1) * page_size
    end = min(start + page_size, total)
    rows = _current_df.iloc[start:end].fillna("").to_dict(orient="records")

    return {
        "rows": rows,
        "total_rows": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


def get_image_urls_for_row(row: pd.Series, mapping: ColumnMappingRequest) -> list[str]:
    urls = []
    for col in mapping.image_url_columns:
        val = str(row.get(col, "")).strip()
        if not val or val == "nan":
            continue
        if mapping.image_separator:
            urls.extend([u.strip() for u in val.split(mapping.image_separator) if u.strip()])
        else:
            urls.append(val)
    return urls


def build_conversation(row: pd.Series, mapping: ColumnMappingRequest, fetch_images: bool = False) -> dict:
    prompt_text = str(row[mapping.prompt_column])
    response_text = str(row[mapping.response_column])
    image_urls = get_image_urls_for_row(row, mapping)

    user_content = []
    if image_urls and fetch_images:
        images = download_images(image_urls)
        for img in images:
            user_content.append({"type": "image", "image": img})
    elif image_urls:
        for url in image_urls:
            user_content.append({"type": "image"})
    user_content.append({"type": "text", "text": prompt_text})

    messages = [
        {"role": "user", "content": user_content},
        {"role": "assistant", "content": [{"type": "text", "text": response_text}]},
    ]
    return {"messages": messages, "image_urls": image_urls}


def check_row_mandatory(row: pd.Series, mapping: ColumnMappingRequest) -> str | None:
    """Returns None if row is valid, or a reason string if a mandatory column is empty."""
    for col in [mapping.prompt_column, mapping.response_column]:
        val = str(row.get(col, "")).strip()
        if not val or val == "nan":
            return f"empty: {col}"
    for col in mapping.mandatory_columns:
        val = str(row.get(col, "")).strip()
        if not val or val == "nan":
            return f"empty: {col}"
    return None


def build_training_dataset() -> tuple[list[dict], int]:
    if _current_df is None or _current_mapping is None:
        raise ValueError("Dataset or mapping not set")

    dataset = []
    num_skipped = 0
    for _, row in _current_df.iterrows():
        reason = check_row_mandatory(row, _current_mapping)
        if reason:
            num_skipped += 1
            continue
        conv = build_conversation(row, _current_mapping, fetch_images=True)
        dataset.append({"messages": conv["messages"]})
    return dataset, num_skipped


def get_conversation_preview(start: int = 0, count: int = 5) -> list[dict]:
    if _current_df is None or _current_mapping is None:
        return []

    previews = []
    end = min(start + count, len(_current_df))
    for i in range(start, end):
        row = _current_df.iloc[i]
        conv = build_conversation(row, _current_mapping, fetch_images=False)
        image_urls = get_image_urls_for_row(row, _current_mapping)
        previews.append({
            "index": i,
            "messages": conv["messages"],
            "image_urls": image_urls,
        })
    return previews
