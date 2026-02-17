import { create } from "zustand"
import type { Session } from "@/lib/types"

interface SessionState {
  sessions: Session[]
  activeSessionId: number | null
  loading: boolean

  setSessions: (s: Session[]) => void
  setActiveSessionId: (id: number | null) => void
  setLoading: (v: boolean) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSessionId: null,
  loading: false,

  setSessions: (sessions) => set({ sessions }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  setLoading: (loading) => set({ loading }),
}))
