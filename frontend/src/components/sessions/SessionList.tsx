import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

import { Plus, Copy, Trash2, Save } from "lucide-react"
import { api } from "@/lib/api"
import { useSessionStore } from "@/stores/sessionStore"
import type { Session } from "@/lib/types"

export function SessionList() {
  const { sessions, activeSessionId, setSessions, setActiveSessionId } =
    useSessionStore()
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)

  const loadSessions = async () => {
    try {
      const res = await api.listSessions()
      setSessions(res.sessions as unknown as Session[])
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(false)
    try {
      await api.createSession({ name: newName.trim() })
      setNewName("")
      loadSessions()
    } catch {
      // ignore
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.deleteSession(id)
      if (activeSessionId === id) setActiveSessionId(null)
      loadSessions()
    } catch {
      // ignore
    }
  }

  const handleClone = async (id: number) => {
    try {
      await api.cloneSession(id)
      loadSessions()
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Sessions
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setCreating(!creating)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {creating && (
        <div className="px-3 pb-2 flex gap-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Session name"
            className="h-7 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleCreate}>
            <Save className="h-3 w-3" />
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="px-2 space-y-0.5">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors ${
                activeSessionId === session.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => setActiveSessionId(session.id)}
            >
              <span className="flex-1 truncate text-xs">{session.name}</span>
              <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClone(session.id)
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(session.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">
              No sessions yet
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
