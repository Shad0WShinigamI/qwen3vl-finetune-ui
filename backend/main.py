import unsloth  # noqa: F401 — must be first import to patch transformers

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.database import init_db
from backend.ws.manager import ws_manager
from backend.utils.gpu import get_gpu_stats

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("Database initialized")

    # Restore dataset state from disk
    from backend.services.dataset_service import restore_state
    restore_state()

    # Start GPU stats broadcaster
    gpu_task = asyncio.create_task(_gpu_broadcaster())
    yield
    gpu_task.cancel()


async def _gpu_broadcaster():
    """Periodically broadcast GPU stats to all connected WebSocket clients."""
    while True:
        try:
            if ws_manager.active_connections:
                stats = get_gpu_stats()
                await ws_manager.broadcast("gpu_stats", stats)
        except Exception:
            pass
        await asyncio.sleep(2)


app = FastAPI(title=settings.app_name, lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
from backend.routers import system, datasets, training, sessions, inference, evaluation

app.include_router(system.router)
app.include_router(datasets.router)
app.include_router(training.router)
app.include_router(sessions.router)
app.include_router(inference.router)
app.include_router(evaluation.router)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Client can send ping/pong or other messages
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port)
