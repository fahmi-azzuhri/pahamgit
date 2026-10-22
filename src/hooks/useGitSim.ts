import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { applyCommand } from "../sim/gitEngine"
import { parseCommand } from "../sim/parser"
import {
  advanceAchieved,
  getScenario,
  orderedChecklist,
  type ChecklistState,
  type Scenario,
} from "../sim/scenarios"
import type { CommandResult, RepoState } from "../sim/types"

export type { ChecklistState }

export function useGitSim() {
  const [scenarioId, setScenarioId] = useState<string>(() => "feature-merge")
  const scenario: Scenario = useMemo(() => getScenario(scenarioId), [scenarioId])
  const [state, setState] = useState<RepoState>(() => scenario.build())
  const [history, setHistory] = useState<RepoState[]>([])
  // items stay checked for the rest of the scenario once achieved,
  // even if a later command changes the state back
  const [achieved, setAchieved] = useState<{ scenarioId: string; ids: Set<string> }>(() => ({
    scenarioId,
    ids: new Set(),
  }))
  const lastScenario = useRef(scenario.id)

  // reset when scenario changes
  useEffect(() => {
    setState(scenario.build())
    setHistory([])
    setAchieved({ scenarioId: scenario.id, ids: new Set() })
  }, [scenario])

  const run = useCallback(
    (raw: string): CommandResult => {
      const parsed = parseCommand(raw)
      const res = applyCommand(state, parsed)
      if (res.changed) {
        setHistory((h) => [...h, state])
        setState(res.state)
      }
      return res
    },
    [state],
  )

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

  // remember every checklist item that has been satisfied at least once
  useEffect(() => {
    const switched = lastScenario.current !== scenario.id
    lastScenario.current = scenario.id
    setAchieved((prev) => {
      if (switched) return { scenarioId: scenario.id, ids: new Set() }
      const base = prev.scenarioId === scenario.id ? prev.ids : new Set<string>()
      const ids = advanceAchieved(scenario, state, base)
      if (prev.scenarioId === scenario.id && ids.size === base.size) return prev
      return { scenarioId: scenario.id, ids }
    })
  }, [scenario, state])

  const checklist: ChecklistState[] = useMemo(() => {
    const kept = achieved.scenarioId === scenario.id ? achieved.ids : new Set<string>()
    return orderedChecklist(scenario, state, kept)
  }, [scenario, state, achieved])

  const progress = useMemo(() => {
    const done = checklist.filter((c) => c.done).length
    return { done, total: checklist.length }
  }, [checklist])

  return {
    scenario,
    scenarioId,
    setScenarioId,
    state,
    run,
    undo,
    reset,
    canUndo: history.length > 0,
    checklist,
    progress,
  }
}