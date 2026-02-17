import datetime
from sqlalchemy import Integer, Float, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class TrainingMetricLog(Base):
    __tablename__ = "training_metric_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("training_sessions.id"))
    step: Mapped[int] = mapped_column(Integer)
    loss: Mapped[float] = mapped_column(Float)
    learning_rate: Mapped[float] = mapped_column(Float)
    epoch: Mapped[float] = mapped_column(Float, default=0.0)
    grad_norm: Mapped[float | None] = mapped_column(Float, nullable=True)
    timestamp: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("training_sessions.id"), nullable=True, default=None)
    adapter_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    model_type: Mapped[str] = mapped_column(String(50))
    eval_mode: Mapped[str] = mapped_column(String(20), default="token")  # "token" or "classification"
    num_samples: Mapped[int] = mapped_column(Integer, default=0)
    num_skipped: Mapped[int] = mapped_column(Integer, default=0)

    # Token-level metrics (used when eval_mode="token")
    exact_match_accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    token_precision: Mapped[float] = mapped_column(Float, default=0.0)
    token_recall: Mapped[float] = mapped_column(Float, default=0.0)
    token_f1: Mapped[float] = mapped_column(Float, default=0.0)

    # Classification metrics (used when eval_mode="classification")
    cls_accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    cls_precision: Mapped[float] = mapped_column(Float, default=0.0)
    cls_recall: Mapped[float] = mapped_column(Float, default=0.0)
    cls_f1: Mapped[float] = mapped_column(Float, default=0.0)
    cls_tp: Mapped[int] = mapped_column(Integer, default=0)
    cls_fp: Mapped[int] = mapped_column(Integer, default=0)
    cls_tn: Mapped[int] = mapped_column(Integer, default=0)
    cls_fn: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class EvalSample(Base):
    __tablename__ = "eval_samples"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    eval_run_id: Mapped[int] = mapped_column(Integer, ForeignKey("evaluation_runs.id"))
    sample_index: Mapped[int] = mapped_column(Integer)
    prompt: Mapped[str] = mapped_column(Text)
    ground_truth: Mapped[str] = mapped_column(Text)
    prediction: Mapped[str] = mapped_column(Text)
    image_urls: Mapped[str] = mapped_column(Text, default="")
    exact_match: Mapped[float] = mapped_column(Float, default=0.0)
    token_precision: Mapped[float] = mapped_column(Float, default=0.0)
    token_recall: Mapped[float] = mapped_column(Float, default=0.0)
    token_f1: Mapped[float] = mapped_column(Float, default=0.0)
    skipped: Mapped[int] = mapped_column(Integer, default=0)
    skipped_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
