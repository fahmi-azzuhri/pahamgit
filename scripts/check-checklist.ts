import assert from "node:assert/strict"
import { applyCommand } from "../src/sim/gitEngine"
import { parseCommand } from "../src/sim/parser"
import {
  ROADMAP_ORDER,
  SCENARIOS,
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

// every scenario answer must clear the gate and finish all steps
for (const sc of SCENARIOS) {
  let walk = sc.build()
  let sticky = new Set<string>()
  for (const cmd of sc.answer) {
    const next = runOne(walk, cmd)
    assert.equal(blockedStep(sc, walk, next, sticky), null, `${sc.id}: ${cmd}`)
    walk = next
    sticky = advanceAchieved(sc, walk, sticky)
  }
  const done = orderedChecklist(sc, walk, sticky).filter((c) => c.done).length
  assert.equal(done, sc.checklist.length, `${sc.id}: ${done}/${sc.checklist.length}`)
}

// roadmap order must be unique and refer to existing journeys
assert.equal(new Set(ROADMAP_ORDER).size, ROADMAP_ORDER.length)
assert.deepEqual(ROADMAP_ORDER.map(getScenario).map((s: Scenario) => s.id), ROADMAP_ORDER)
// no journey may be omitted from (or duplicated in) the roadmap
assert.deepEqual(
  SCENARIOS.map((s) => s.id).sort(),
  [...ROADMAP_ORDER].sort(),
  "SCENARIOS and ROADMAP_ORDER must cover the same journeys",
)

// roadmap difficulty must never go backwards
const rank = { Beginner: 0, Intermediate: 1, Advanced: 2 } as const
const levels = ROADMAP_ORDER.map((id) => rank[getScenario(id).difficulty])
assert.ok(
  levels.every((lvl, i) => i === 0 || lvl >= levels[i - 1]),
  "ROADMAP_ORDER must be Beginner → Intermediate → Advanced",
)


console.log("checklist sequential + sticky: OK")
