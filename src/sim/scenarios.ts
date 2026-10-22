import type { RepoState } from "./types"
import { initialRepo } from "./gitEngine"

export interface ChecklistItem {
  id: string
  label: string
  done: (state: RepoState) => boolean
}

export interface Scenario {
  id: string
  title: string
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  instructions: string[]
  checklist: ChecklistItem[]
  hints: string[]
  answer: string[]
  build: () => RepoState
}

export const SCENARIOS: Scenario[] = [
  {
    id: "feature-merge",
    title: "Feature Branch & Merge",
    difficulty: "Beginner",
    instructions: [
      "Kamu bekerja di repo dengan branch `main`. Tugasmu mengembangkan fitur baru tanpa mengganggu main.",
      "Buat branch `feature`, lakukan satu commit di sana, lalu kembali ke `main` dan gabungkan.",
    ],
    checklist: [
      {
        id: "create-feature",
        label: "Buat branch baru bernama `feature`",
        done: (s) => Boolean(s.branches["feature"]),
      },
      {
        id: "switch-feature",
        label: "Pindah (checkout/switch) ke branch `feature`",
        done: (s) => s.head.type === "branch" && s.head.name === "feature",
      },
      {
        id: "commit-feature",
        label: "Buat minimal 1 commit di `feature`",
        done: (s) => {
          const f = s.branches["feature"]
          const m = s.branches["main"]
          if (!f || !m) return false
          // feature is ahead of main (main is ancestor of feature)
          const reach = new Set<string>()
          const stack = [f]
          while (stack.length) {
            const id = stack.pop()!
            if (reach.has(id)) continue
            reach.add(id)
            const c = s.commits[id]
            if (c) for (const p of c.parents) stack.push(p)
          }
          return reach.has(m) && f !== m
        },
      },
      {
        id: "back-main",
        label: "Kembali ke branch `main`",
        done: (s) => s.head.type === "branch" && s.head.name === "main",
      },
      {
        id: "merge",
        label: "Merge `feature` ke `main`",
        done: (s) => {
          const m = s.branches["main"]
          const f = s.branches["feature"]
          if (!m || !f) return false
          const c = s.commits[m]
          // either a merge commit (2 parents) or fast-forward (main == feature)
          return (c && c.parents.length === 2) || m === f
        },
      },
    ],
    hints: [
      "Gunakan `git checkout -b feature` untuk membuat sekaligus pindah branch.",
      "Setelah commit, kembali ke main dengan `git checkout main`.",
      "Gabungkan dengan `git merge feature` dari dalam branch main.",
    ],
    answer: [
      "git checkout -b feature",
      'git commit -m "add feature"',
      "git checkout main",
      "git merge feature",
    ],
    build: initialRepo,
  },
]

export function getScenario(id: string): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0]
}

export interface ChecklistState {
  id: string
  label: string
  done: boolean
}

/**
 * Steps are sequential: a step only counts when every earlier step is done,
 * so later items cannot be pre-checked by unrelated state.
 */
export function advanceAchieved(
  scenario: Scenario,
  state: RepoState,
  ids: Set<string>,
): Set<string> {
  const next = new Set(ids)
  for (const item of scenario.checklist) {
    if (!item.done(state) && !next.has(item.id)) break
    next.add(item.id)
  }
  return next
}

/** Checklist with the sequential rule applied on top of the sticky achievements. */
export function orderedChecklist(
  scenario: Scenario,
  state: RepoState,
  achieved: Set<string>,
): ChecklistState[] {
  const out: ChecklistState[] = []
  for (let i = 0; i < scenario.checklist.length; i++) {
    const item = scenario.checklist[i]
    const prevDone = i === 0 || out[i - 1].done
    out.push({
      id: item.id,
      label: item.label,
      done: (item.done(state) || achieved.has(item.id)) && prevDone,
    })
  }
  return out
}