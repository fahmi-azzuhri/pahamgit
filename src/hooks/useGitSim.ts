import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { applyCommand } from "../sim/gitEngine"
import { parseCommand } from "../sim/parser"
import {
  advanceAchieved,
  blockedStep,
  getScenario,
  orderedChecklist,
  ROADMAP_ORDER,
  taskLockReason,
  type ChecklistState,
  type Scenario,
} from "../sim/scenarios"
import type { CommandResult, RepoState } from "../sim/types"
import type { ProgressEntry } from "../lib/progress"
import { saveProgress } from "../lib/progress"
import { tipFor, blockedStepTip } from "../sim/tips"

export type { ChecklistState }

export function useGitSim(
  serverProgress: ProgressEntry[] = [],
  syncProgress?: (scenarioId: string, stepsDone: string[], completed: boolean, repoState?: string | null) => void,
  progressLoaded = true,
  serverCurrentScenarioId?: string | null,
  onScenarioSwitch?: (scenarioId: string) => void | Promise<void>,
) {
  const [currentIndex, setCurrentIndex] = useState(-1)
  const scenarioId = currentIndex >= 0 ? ROADMAP_ORDER[currentIndex] : ROADMAP_ORDER[0]
  const scenario: Scenario = useMemo(() => getScenario(scenarioId), [scenarioId])

  // mirror of App.tsx's completedTaskIds: needed here to enforce per-level locks
  const completedIds = useMemo(() => {
    return ROADMAP_ORDER.filter((id) => {
      const task = getScenario(id)
      const entry = serverProgress.find((item) => item.scenario_id === id)
      if (!entry) return false
      if (task.checklist.every((item) => entry.steps_done.includes(item.id))) return true
      if (!entry.repo_state) return false
      try {
        const savedState = JSON.parse(entry.repo_state) as RepoState
        return task.checklist.every((item) => item.done(savedState))
      } catch (error) {
        console.error(`Gagal membaca progres skenario "${id}":`, error)
        return false
      }
    })
  }, [serverProgress])

  const appliedServerPos = useRef(false)
  useEffect(() => {
    if (!progressLoaded) {
      appliedServerPos.current = false
      return
    }
    if (appliedServerPos.current) return
    appliedServerPos.current = true
    let idx = serverCurrentScenarioId ? ROADMAP_ORDER.indexOf(serverCurrentScenarioId) : -1
    if (idx < 0) idx = 0
    // a stored position past an unfinished task means the position is stale:
    // "next" is gated on finishing, so resume at the first task still open
    const firstOpen = ROADMAP_ORDER.findIndex((id) => !completedIds.includes(id))
    if (firstOpen >= 0) idx = Math.min(idx, firstOpen)
    // per-progression lock: never restore into a locked task — clamp to the
    // first unlocked one instead
    while (idx > 0 && taskLockReason(ROADMAP_ORDER[idx], completedIds)) idx--
    setCurrentIndex(idx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressLoaded, serverCurrentScenarioId])


  const [state, setState] = useState<RepoState>(() => scenario.build())
  const hydratedScenario = useRef<string | null>(null)

  const [history, setHistory] = useState<RepoState[]>([])
  const [achieved, setAchieved] = useState<{ scenarioId: string; ids: Set<string> }>(() => ({
    scenarioId,
    ids: new Set(),
  }))

  useEffect(() => {
    if (!progressLoaded) {
      hydratedScenario.current = null
      return
    }
    if (currentIndex < 0 || hydratedScenario.current === scenario.id) return
    hydratedScenario.current = scenario.id
    const entry = serverProgress.find((e) => e.scenario_id === scenario.id)
    let restoredState = scenario.build()
    if (entry?.repo_state) {
      try {
        restoredState = JSON.parse(entry.repo_state) as RepoState
      } catch (error) {
        console.error(`Gagal memulihkan state untuk skenario "${scenario.id}"`, error)
      }
    }
    setState(restoredState)
    setHistory([])
    setAchieved({ scenarioId: scenario.id, ids: new Set(entry?.steps_done ?? []) })
  }, [currentIndex, progressLoaded, scenario, serverProgress])

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h
      const prev = h[h.length - 1]
      setState(prev)
      return h.slice(0, -1)
    })
  }, [])

  const reset = useCallback(() => {
    setState(scenario.build())
    setHistory([])
    setAchieved({ scenarioId: scenario.id, ids: new Set() })
  }, [scenario])

  // back to the first task with a fresh repo (used on logout)
  const restart = useCallback(() => {
    const first = getScenario(ROADMAP_ORDER[0])
    appliedServerPos.current = false
    hydratedScenario.current = first.id
    setCurrentIndex(0)
    setState(first.build())
    setHistory([])
    setAchieved({ scenarioId: first.id, ids: new Set() })
  }, [])

  const checklist: ChecklistState[] = useMemo(() => {
    const kept = achieved.scenarioId === scenario.id ? achieved.ids : new Set<string>()
    return orderedChecklist(scenario, state, kept)
  }, [scenario, state, achieved])

  useEffect(() => {
    if (!progressLoaded || hydratedScenario.current !== scenario.id) return
    const stepsDone = checklist.filter((item) => item.done).map((item) => item.id)
    const completed = checklist.length > 0 && stepsDone.length === checklist.length
    const repoJson = JSON.stringify(state)
    if (syncProgress) {
      syncProgress(scenario.id, stepsDone, completed, repoJson)
      return
    }
    const tokenValue = localStorage.getItem("pahamgit:token") ?? ""
    void saveProgress(tokenValue, scenario.id, stepsDone, completed, repoJson).catch((error: unknown) => {
      console.error("Gagal menyimpan progres:", error)
    })
  }, [checklist, progressLoaded, scenario.id, state, syncProgress])

  const run = useCallback(
    (raw: string): CommandResult => {
      const trimmed = raw.trim()
      const parsed = parseCommand(trimmed)
      const res = applyCommand(state, parsed)
      // hard-block: a mutating command must advance the active checklist step
      if (res.changed) {
        const kept = achieved.scenarioId === scenario.id ? achieved.ids : new Set<string>()
        const blocked = blockedStep(scenario, state, res.state, kept)
        if (blocked !== null) {
          return {
            state,
            output: [
              `error: "${trimmed}" does not complete the current step: ${scenario.checklist[blocked].label.replace(/`/g, "")}`,
              `💡 tip: ${blockedStepTip(scenario.checklist[blocked].label)}`,
            ].join("\n"),
            ok: false,
            changed: false,
          }
        }
      }
      // educational feedback: failed commands get an explanation of why
      if (!res.ok) {
        const tip = tipFor(res.output)
        if (tip) {
          return { ...res, output: `${res.output}\n${tip}` }
        }
      }
      if (res.changed) {
        setHistory((h) => [...h, state])
        setState(res.state)
        setAchieved((prev) => {
          const base = prev.scenarioId === scenario.id ? prev.ids : new Set<string>()
          return { scenarioId: scenario.id, ids: advanceAchieved(scenario, res.state, base) }
        })
      }
      return res
    },
    [state, scenario, achieved],
  )

  const progress = useMemo(() => {
    const done = checklist.filter((c) => c.done).length
    return { done, total: checklist.length }
  }, [checklist])

  const hasNext = currentIndex < ROADMAP_ORDER.length - 1
  const next = useCallback(async () => {
    const nextIndex = Math.min(currentIndex + 1, ROADMAP_ORDER.length - 1)
    if (nextIndex === currentIndex) return
    const nextId = ROADMAP_ORDER[nextIndex]
    if (taskLockReason(nextId, completedIds)) {
      throw new Error(`Task "${getScenario(nextId).title}" masih terkunci — selesaikan level sebelumnya dulu.`)
    }
    await onScenarioSwitch?.(nextId)
    setCurrentIndex(nextIndex)
  }, [currentIndex, onScenarioSwitch, completedIds])


  return {
    scenario,
    scenarioId,
    state,
    run,
    undo,
    reset,
    canUndo: history.length > 0,
    checklist,
    progress,
    hasNext,
    next,
    restart,

  }
}