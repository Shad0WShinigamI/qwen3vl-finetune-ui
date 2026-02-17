import asyncio
import json
from datetime import datetime, timezone

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message_type: str, payload: dict):
        envelope = {
            "type": message_type,
            "payload": payload,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        data = json.dumps(envelope)
        disconnected = []
        for conn in self.active_connections:
            try:
                await conn.send_text(data)
            except Exception:
                disconnected.append(conn)
        for conn in disconnected:
            self.disconnect(conn)

    def broadcast_sync(self, message_type: str, payload: dict, loop: asyncio.AbstractEventLoop):
        """Thread-safe broadcast from sync context (e.g., trainer callback)."""
        future = asyncio.run_coroutine_threadsafe(
            self.broadcast(message_type, payload), loop
        )
        try:
            future.result(timeout=5)
        except Exception:
            pass


ws_manager = ConnectionManager()
