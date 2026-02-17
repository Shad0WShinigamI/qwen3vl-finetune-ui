const BASE = ""

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body.detail || res.statusText)
  }
  return res.json()
}

export const api = {
  request,

  // System
  health: () => request<{ status: string }>("/api/system/health"),
  gpuStats: () => request<Record<string, unknown>>("/api/system/gpu"),

  // Datasets
  uploadCsv: async (file: File) => {
    const form = new FormData()
    form.append("file", file)
    const res = await fetch("/api/datasets/upload", { method: "POST", body: form })
    if (!res.ok) throw new Error((await res.json()).detail || res.statusText)
    return res.json()
  },
  getColumns: () => request<{ columns: string[] }>("/api/datasets/columns"),
  setMapping: (mapping: Record<string, unknown>) =>
    request("/api/datasets/mapping", { method: "POST", body: JSON.stringify(mapping) }),
  getMapping: () => request<{ mapping: Record<string, unknown> | null }>("/api/datasets/mapping"),
  previewDataset: (page: number, pageSize: number) =>
    request<{
      rows: Record<string, unknown>[]
      total_rows: number
      page: number
      page_size: number
      total_pages: number
    }>("/api/datasets/preview", {
      method: "POST",
      body: JSON.stringify({ page, page_size: pageSize }),
    }),
  previewConversations: (start: number, count: number) =>
    request<{ conversations: Record<string, unknown>[] }>(
      `/api/datasets/preview/conversations?start=${start}&count=${count}`
    ),
  datasetInfo: () => request<Record<string, unknown>>("/api/datasets/info"),

  // Training
  startTraining: (config: Record<string, unknown>) =>
    request("/api/training/start", { method: "POST", body: JSON.stringify(config) }),
  stopTraining: () => request("/api/training/stop", { method: "POST" }),
  trainingStatus: () => request<Record<string, unknown>>("/api/training/status"),
  listAdapters: () => request<{ adapters: Record<string, unknown>[] }>("/api/training/adapters"),

  // Sessions
  listSessions: () => request<{ sessions: Record<string, unknown>[] }>("/api/sessions/"),
  createSession: (data: { name: string; description?: string }) =>
    request("/api/sessions/", { method: "POST", body: JSON.stringify(data) }),
  getSession: (id: number) => request<Record<string, unknown>>(`/api/sessions/${id}`),
  updateSession: (id: number, data: Record<string, unknown>) =>
    request(`/api/sessions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSession: (id: number) =>
    request(`/api/sessions/${id}`, { method: "DELETE" }),
  cloneSession: (id: number) =>
    request(`/api/sessions/${id}/clone`, { method: "POST" }),
  saveSessionConfig: (id: number, config: Record<string, unknown>) =>
    request(`/api/sessions/${id}/save-config`, {
      method: "POST",
      body: JSON.stringify(config),
    }),

  // Inference
  generate: (data: Record<string, unknown>) =>
    request("/api/inference/generate", { method: "POST", body: JSON.stringify(data) }),
  compare: (data: Record<string, unknown>) =>
    request("/api/inference/compare", { method: "POST", body: JSON.stringify(data) }),

  // Evaluation
  runEval: (data: Record<string, unknown>) =>
    request("/api/evaluation/run", { method: "POST", body: JSON.stringify(data) }),
  evalStatus: () => request<Record<string, unknown>>("/api/evaluation/status"),
  evalResults: () => request<Record<string, unknown>>("/api/evaluation/results"),
  exportEval: (runId: number, format: string) =>
    `/api/evaluation/export/${runId}?format=${format}`,
}
