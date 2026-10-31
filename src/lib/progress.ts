export interface ProgressEntry {
  scenario_id: string
  steps_done: string[]
  completed_at: string | null
  repo_state: string | null
}

export interface ProgressSnapshot {
  entries: ProgressEntry[]
  current_scenario_id: string | null
}

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:8080"

function authHeaders(token: string): HeadersInit {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
}

function fail(status: number, message: string): never {
  // status travels with the error so callers can tell "offline" from "token expired"
  throw Object.assign(new Error(message), { status })
}

export async function fetchProgress(token: string): Promise<ProgressSnapshot> {
  let res: Response
  try {
    res = await fetch(`${API_URL}/api/progress`, { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    throw new Error("Tidak bisa menghubungi server")
  }
  if (!res.ok) fail(res.status, `Request gagal (${res.status})`)
  const data = await res.json()
  if (!data || !Array.isArray(data.entries)) return { entries: [], current_scenario_id: null }
  return data as ProgressSnapshot
}

export async function setCurrentScenario(token: string, scenarioId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/progress/current`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ scenario_id: scenarioId }),
  })
  if (!res.ok) fail(res.status, `Gagal menyimpan posisi task (${res.status})`)
}

export async function saveProgress(
  token: string,
  scenarioId: string,
  stepsDone: string[],
  completed: boolean,
  repoState?: string | null,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/progress/${encodeURIComponent(scenarioId)}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ steps_done: stepsDone, completed, repo_state: repoState ?? null }),
  })
  if (!res.ok) fail(res.status, `Gagal menyimpan progres (${res.status})`)
}

/** Clear every pahamgit key from this browser (used on logout). */
export function clearLocalProgress(): void {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith("pahamgit:")) keys.push(k)
  }
  for (const k of keys) localStorage.removeItem(k)
}
