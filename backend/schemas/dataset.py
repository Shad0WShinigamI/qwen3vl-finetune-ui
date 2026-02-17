from pydantic import BaseModel


class ColumnMappingRequest(BaseModel):
    prompt_column: str
    response_column: str
    ground_truth_column: str | None = None
    image_url_columns: list[str] = []
    image_separator: str | None = None
    mandatory_columns: list[str] = []


class DatasetInfo(BaseModel):
    filename: str
    num_rows: int
    num_columns: int
    columns: list[str]
    sample_rows: list[dict]


class DatasetPreviewRequest(BaseModel):
    page: int = 1
    page_size: int = 20


class DatasetPreviewResponse(BaseModel):
    rows: list[dict]
    total_rows: int
    page: int
    page_size: int
    total_pages: int


class ConversationPreviewItem(BaseModel):
    index: int
    messages: list[dict]
    image_urls: list[str]
