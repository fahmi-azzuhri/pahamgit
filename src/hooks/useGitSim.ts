import { useCallback, useEffect, useMemo, useState } from "react"
import { applyCommand } from "../sim/gitEngine"
import { parseCommand } from "../sim/parser"
import { getScenario, type Scenario } from "../sim/scenarios"
import type { CommandResult, RepoState } from "../sim/types"

export interface ChecklistState {
  id: string
  label: string
  done: boolean
}

export function useGitSim() {
  const [scenarioId, setScenarioId] = useState<string>(() => "feature-merge")
  const scenario: Scenario = useMemo(() => getScenario(scenarioId), [scenarioId])
  const [state, setState] = useState<RepoState>(() => scenario.build())
  const [history, setHistory] = useState<RepoState[]>([])

  // reset when scenario changes
  useEffect(() => {
    setState(scenario.build())
    setHistory([])
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
  }, [scenario])

  const checklist: ChecklistState[] = useMemo(
    () =>
      scenario.checklist.map((item) => ({
        id: item.id,
        label: item.label,
        done: item.done(state),
      })),
    [scenario, state],
  )

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