import type { WSMessage } from "./types"

type MessageHandler = (msg: WSMessage) => void

class WebSocketClient {
  private ws: WebSocket | null = null
  private handlers: Set<MessageHandler> = new Set()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private _connected = false

  get connected(): boolean {
    return this._connected
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${protocol}//${window.location.host}/ws`

    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      this._connected = true
      this.handlers.forEach((h) =>
        h({ type: "ws_connected", payload: {}, timestamp: new Date().toISOString() })
      )
    }

    this.ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        this.handlers.forEach((h) => h(msg))
      } catch {
        // ignore malformed messages
      }
    }

    this.ws.onclose = () => {
      this._connected = false
      this.handlers.forEach((h) =>
        h({ type: "ws_disconnected", payload: {}, timestamp: new Date().toISOString() })
      )
      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 3000)
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
    this._connected = false
  }
}

export const wsClient = new WebSocketClient()
