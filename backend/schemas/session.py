from pydantic import BaseModel


class SessionCreate(BaseModel):
    name: str
    description: str = ""


class SessionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class SessionResponse(BaseModel):
    id: int
    name: str
    description: str
    status: str
    dataset_config: str
    training_config: str
    lora_config: str
    adapter_path: str | None
    dataset_path: str | None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class SessionListResponse(BaseModel):
    sessions: list[SessionResponse]
