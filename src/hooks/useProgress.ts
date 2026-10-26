import { fetchProgress, saveProgress, type ProgressEntry } from "../lib/progress"

import { useCallback, useEffect, useState } from "react"

export function useProgress(token: string) {
  const [entries, setEntries] = useState<ProgressEntry[]>([])
  const [repoStates, setRepoStates] = useState<Record<string, string>>({})
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null)
  const [loadedToken, setLoadedToken] = useState<string | null>(null)

  // Reload progress when the authenticated account changes.
  useEffect(() => {
    if (!token) return
    let active = true
    fetchProgress(token)
      .then((data) => {
        if (active) {
          setEntries(data.entries)
          const states: Record<string, string> = {}
          for (const e of data.entries) if (e.repo_state) states[e.scenario_id] = e.repo_state
          setRepoStates(states)
          setCurrentScenarioId(data.current_scenario_id)
          setLoadedToken(token)
        }
      })
      .catch((error: unknown) => {
        console.error("Gagal memuat progres dari server:", error)
      })
    return () => {
      active = false
    }
  }, [token])

  const upsert = useCallback(
    (scenarioId: string, stepsDone: string[], completed: boolean, repoState?: string | null) => {
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.scenario_id === scenarioId)
        const newEntry: ProgressEntry = {
          scenario_id: scenarioId,
          steps_done: stepsDone,
          completed_at: completed ? new Date().toISOString() : null,
          repo_state: repoState ?? prev.find((e) => e.scenario_id === scenarioId)?.repo_state ?? null,
        }
        if (idx >= 0) {
          const copy = [...prev]
          copy[idx] = newEntry
          return copy
        }
        return [...prev, newEntry]
      })
      if (repoState !== undefined) {
        setRepoStates((prev) => ({ ...prev, [scenarioId]: repoState ?? "" }))
      }
      // guests have no token: a request would always come back 401, so keep
      // progress local-only until they sign in
      if (!token) return
      void saveProgress(token, scenarioId, stepsDone, completed, repoState).catch((error: unknown) => {
        console.error("Gagal menyimpan progres:", error)
      })
    },
    [token],
  )

  return { entries, upsert, loaded: !token || loadedToken === token, currentScenarioId, repoStates }
}
