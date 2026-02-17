import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from backend.config import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(f"sqlite+aiosqlite:///{settings.db_path}", echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    from backend.models import TrainingSession, TrainingMetricLog, EvaluationRun, EvalSample  # noqa

    async with engine.begin() as conn:
        # Check if schema needs rebuilding by verifying a known new column exists
        try:
            await conn.execute(text("SELECT skipped FROM eval_samples LIMIT 0"))
        except Exception:
            # Schema is stale or table doesn't exist — drop all and recreate
            logger.warning("Database schema outdated or missing — recreating all tables")
            await conn.run_sync(Base.metadata.drop_all)

        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with async_session() as session:
        yield session
