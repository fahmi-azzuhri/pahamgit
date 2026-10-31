import { fetchProgress, saveProgress, type ProgressEntry } from "../lib/progress"

import { useCallback, useEffect, useState } from "react"

export function useProgress(token: string) {
  const [entries, setEntries] = useState<ProgressEntry[]>([])
  const [repoStates, setRepoStates] = useState<Record<string, string>>({})
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null)
  const [loadedToken, setLoadedToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const report = useCallback((err: unknown) => {
    if ((err as { status?: number }).status === 401) {
      // expired token: boot as guest instead of silently failing every write
      localStorage.removeItem("pahamgit:token")
      localStorage.removeItem("pahamgit:username")
      window.location.reload()
      return
    }
    setError(err instanceof Error ? err.message : String(err))
  }, [])

  // Reload progress when the authenticated account changes.
  useEffect(() => {
    if (!token) {
      // logout must not leave the previous account's progress on screen
      setEntries([])
      setRepoStates({})
      setCurrentScenarioId(null)
      setLoadedToken(null)
      setError(null)
      return
    }
    let active = true
    let timer: number | undefined
    const load = () => {
      fetchProgress(token)
        .then((data) => {
          if (!active) return
          setEntries(data.entries)
          const states: Record<string, string> = {}
          for (const e of data.entries) if (e.repo_state) states[e.scenario_id] = e.repo_state
          setRepoStates(states)
          setCurrentScenarioId(data.current_scenario_id)
          setLoadedToken(token)
          setError(null)
        })
        .catch((err: unknown) => {
          if (!active) return
          report(err)
          // keep retrying: a save triggered before the first load would overwrite
          // server progress with blank local state
          timer = window.setTimeout(load, 5000)
        })
    }
    load()
    return () => {
      active = false
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [token, report])

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
      void saveProgress(token, scenarioId, stepsDone, completed, repoState)
        .then(() => setError(null))
        .catch(report)
    },
    [token, report],
  )

  return {
    entries,
    upsert,
    loaded: !token || loadedToken === token,
    currentScenarioId,
    repoStates,
    error,
  }
}
