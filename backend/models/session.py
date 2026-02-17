import datetime
from sqlalchemy import String, Text, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class TrainingSession(Base):
    __tablename__ = "training_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(50), default="created")

    # JSON-serialized config blobs
    dataset_config: Mapped[str] = mapped_column(Text, default="{}")
    training_config: Mapped[str] = mapped_column(Text, default="{}")
    lora_config: Mapped[str] = mapped_column(Text, default="{}")

    adapter_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    dataset_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )
