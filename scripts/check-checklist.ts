import assert from "node:assert/strict"
import { applyCommand } from "../src/sim/gitEngine"
import { parseCommand } from "../src/sim/parser"
import {
  advanceAchieved,
  getScenario,
  orderedChecklist,
  type Scenario,
} from "../src/sim/scenarios"
import type { RepoState } from "../src/sim/types"

const scenario: Scenario = getScenario("feature-merge")

/** Replays commands the same way the hook does: sticky achievements + sequential gate. */
function replay(commands: string[], stopAfter: number) {
  let state: RepoState = scenario.build()
  let achieved = new Set<string>()
  for (const cmd of commands.slice(0, stopAfter)) {
    state = applyCommand(state, parseCommand(cmd)).state
    achieved = advanceAchieved(scenario, state, achieved)
  }
  return orderedChecklist(scenario, state, achieved)
    .filter((c) => c.done)
    .map((c) => c.id)
}

const answer = scenario.answer // checkout -b feature, commit, checkout main, merge
assert.deepEqual(replay(answer, 1), ["create-feature", "switch-feature"])
assert.deepEqual(replay(answer, 2), ["create-feature", "switch-feature", "commit-feature"])
assert.deepEqual(replay(answer, 3), [
  "create-feature",
  "switch-feature",
  "commit-feature",
  "back-main",
])
assert.equal(replay(answer, 4).length, scenario.checklist.length)

// sequential: creating a branch alone must not pre-check later steps
assert.deepEqual(replay(["git branch feature"], 1), ["create-feature"])

console.log("checklist sequential + sticky: OK")
