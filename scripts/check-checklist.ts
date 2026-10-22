import assert from "node:assert/strict"
import { applyCommand } from "../src/sim/gitEngine"
import { parseCommand } from "../src/sim/parser"
import {
  advanceAchieved,
  blockedStep,
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

// hard-block: an unrelated mutation must not advance the active step
const runOne = (state: RepoState, cmd: string) =>
  applyCommand(state, parseCommand(cmd)).state
const start = scenario.build()
assert.equal(blockedStep(scenario, start, runOne(start, "git checkout -b feature")), null)
assert.equal(blockedStep(scenario, start, runOne(start, "git branch other")), 0)

const feature = runOne(start, "git checkout -b feature")
assert.equal(blockedStep(scenario, feature, runOne(feature, "git tag v1")), 2)
assert.equal(blockedStep(scenario, feature, runOne(feature, 'git commit -m "x"')), null)
// read-only commands never mutate, so the hook lets them through
assert.equal(applyCommand(feature, parseCommand("git status")).changed, false)

// every command in the suggested answer must clear the gate (sticky steps)
let walk = start
let sticky = new Set<string>()
for (const cmd of scenario.answer) {
  const next = runOne(walk, cmd)
  assert.equal(blockedStep(scenario, walk, next, sticky), null, cmd)
  walk = next
  sticky = advanceAchieved(scenario, walk, sticky)
}

console.log("checklist sequential + sticky: OK")
