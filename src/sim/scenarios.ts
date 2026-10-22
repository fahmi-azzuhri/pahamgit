import type { RepoState } from "./types"
import { initialRepo, isAncestor } from "./gitEngine"

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
  {
    id: "first-commit",
    title: "Commit Pertama",
    difficulty: "Beginner",
    instructions: [
      "Repo sudah punya satu commit awal. Buat satu commit baru di branch `main`.",
    ],
    checklist: [
      {
        id: "commit",
        label: "Buat satu commit baru",
        done: (s) => Object.keys(s.commits).length >= 2,
      },
    ],
    hints: ["Gunakan `git commit -m` untuk membuat commit."],
    answer: ['git commit -m "hello world"'],
    build: initialRepo,
  },
  {
    id: "tag-release",
    title: "Rilis dengan Tag",
    difficulty: "Beginner",
    instructions: [
      "Buat commit fitur, tandai sebagai rilis `v1.0.0`, lalu buat commit perbaikan dan tandai `v1.0.1`.",
    ],
    checklist: [
      {
        id: "feature-commit",
        label: "Buat commit fitur",
        done: (s) => Object.keys(s.commits).length >= 2,
      },
      {
        id: "tag-v1",
        label: "Buat tag `v1.0.0` pada commit fitur",
        done: (s) => {
          const id = s.tags["v1.0.0"]
          return Boolean(id) && s.commits[id]?.message !== "Initial commit"
        },
      },
      {
        id: "fix-commit",
        label: "Buat commit perbaikan",
        done: (s) => Object.keys(s.commits).length >= 3,
      },
      {
        id: "tag-v2",
        label: "Buat tag `v1.0.1` pada commit terbaru",
        done: (s) => s.tags["v1.0.1"] === s.branches["main"],
      },
    ],
    hints: [
      "Buat commit fitur dengan `git commit -m`.",
      "Tandai rilis dengan `git tag v1.0.0`.",
      "Setelah commit perbaikan, jalankan `git tag v1.0.1`.",
    ],
    answer: [
      'git commit -m "add feature"',
      "git tag v1.0.0",
      'git commit -m "fix typo"',
      "git tag v1.0.1",
    ],
    build: initialRepo,
  },
  {
    id: "reset-recovery",
    title: "Batalkan Commit dengan Reset",
    difficulty: "Intermediate",
    instructions: [
      "Buat commit yang benar, simpan titik aman di branch `backup`, buat commit rusak, lalu kembalikan `main` ke `backup` dengan `git reset --hard`.",
    ],
    checklist: [
      {
        id: "good-commit",
        label: "Buat commit yang benar",
        done: (s) => Object.keys(s.commits).length >= 2,
      },
      {
        id: "backup",
        label: "Buat branch `backup` di commit tersebut",
        done: (s) => Boolean(s.branches["backup"]),
      },
      {
        id: "bad-commit",
        label: "Buat commit rusak setelah backup",
        done: (s) => Object.keys(s.commits).length >= 3,
      },
      {
        id: "reset",
        label: "Reset `main` ke `backup`",
        done: (s) =>
          s.branches["main"] === s.branches["backup"] &&
          Object.keys(s.commits).length >= 3,
      },
    ],
    hints: [
      "Commit pertama: `git commit -m`.",
      "Simpan titik aman: `git branch backup`.",
      "Setelah commit rusak, jalankan `git reset --hard backup`.",
    ],
    answer: [
      'git commit -m "good work"',
      "git branch backup",
      'git commit -m "broken"',
      "git reset --hard backup",
    ],
    build: initialRepo,
  },

  {
    id: "release-merge",
    title: "Merge dengan --no-ff",
    difficulty: "Intermediate",
    instructions: [
      "Buat branch `release`, commit di sana, kembali ke `main`, lalu merge dengan `--no-ff` agar merge commit tetap tercatat.",
    ],
    checklist: [
      {
        id: "create-release",
        label: "Buat branch `release`",
        done: (s) => Boolean(s.branches["release"]),
      },
      {
        id: "switch-release",
        label: "Pindah ke branch `release`",
        done: (s) => s.head.type === "branch" && s.head.name === "release",
      },
      {
        id: "commit-release",
        label: "Buat commit di `release`",
        done: (s) => {
          const r = s.branches["release"]
          const m = s.branches["main"]
          if (!r || !m || r === m) return false
          const reach = new Set<string>()
          const stack = [r]
          while (stack.length) {
            const id = stack.pop()!
            if (reach.has(id)) continue
            reach.add(id)
            const c = s.commits[id]
            if (c) for (const p of c.parents) stack.push(p)
          }
          return reach.has(m)
        },
      },
      {
        id: "back-main",
        label: "Kembali ke `main`",
        done: (s) => s.head.type === "branch" && s.head.name === "main",
      },
      {
        id: "merge-no-ff",
        label: "Merge `release` dengan `--no-ff`",
        done: (s) => {
          const c = s.commits[s.branches["main"]]
          return Boolean(c) && c.parents.length === 2
        },
      },
    ],
    hints: [
      "Buat sekaligus pindah dengan `git checkout -b release`.",
      "Commit di branch release dengan `git commit -m`.",
      "Kembali ke main lalu jalankan `git merge --no-ff release`.",
    ],
    answer: [
      "git checkout -b release",
      'git commit -m "prepare release"',
      "git checkout main",
      "git merge --no-ff release",
    ],
    build: initialRepo,
  },
  {
    id: "tag-old-commit",
    title: "Tag Commit Lama",
    difficulty: "Intermediate",
    instructions: [
      "Buat dua commit. Beri tag `v0.1.0` pada commit pertama, bukan pada HEAD. Gunakan branch `old` sebagai penanda.",
    ],
    checklist: [
      {
        id: "first-commit",
        label: "Buat commit pertama",
        done: (s) => Object.keys(s.commits).length >= 2,
      },
      {
        id: "mark-old",
        label: "Buat branch `old` di commit pertama",
        done: (s) => {
          const id = s.branches["old"]
          return Boolean(id) && s.commits[id]?.order === 1
        },
      },
      {
        id: "second-commit",
        label: "Buat commit kedua",
        done: (s) => Object.keys(s.commits).length >= 3,
      },
      {
        id: "tag-old",
        label: "Tag `v0.1.0` mengarah ke `old`, bukan HEAD",
        done: (s) =>
          s.tags["v0.1.0"] === s.branches["old"] &&
          s.tags["v0.1.0"] !== s.branches["main"],
      },
    ],
    hints: [
      "Commit pertama dengan `git commit -m`.",
      "Tandai commit pertama dengan `git branch old`.",
      "Setelah commit kedua, jalankan `git tag v0.1.0 old`.",
    ],
    answer: [
      'git commit -m "first"',
      "git branch old",
      'git commit -m "second"',
      "git tag v0.1.0 old",
    ],
    build: initialRepo,
  },

  {
    id: "merge-ff-only",
    title: "Fast-forward Merge",
    difficulty: "Intermediate",
    instructions: [
      "Buat branch `hotfix`, commit perbaikan, kembali ke `main`, lalu merge dengan `--ff-only` agar main maju tanpa merge commit.",
    ],
    checklist: [
      {
        id: "create-hotfix",
        label: "Buat branch `hotfix`",
        done: (s) => Boolean(s.branches["hotfix"]),
      },
      {
        id: "commit-hotfix",
        label: "Buat commit di `hotfix`",
        done: (s) => {
          const h = s.branches["hotfix"]
          const m = s.branches["main"]
          return Boolean(h && m && h !== m && isAncestor(s, m, h))
        },
      },
      {
        id: "back-main",
        label: "Kembali ke `main`",
        done: (s) => s.head.type === "branch" && s.head.name === "main",
      },
      {
        id: "ff-merge",
        label: "Merge `hotfix` dengan `--ff-only` tanpa merge commit",
        done: (s) => {
          const h = s.branches["hotfix"]
          const m = s.branches["main"]
          return Boolean(h && m && h === m && s.commits[m]?.parents.length === 1)
        },
      },
    ],
    hints: [
      "Buat branch dengan `git checkout -b hotfix`.",
      "Commit perbaikan lalu kembali ke `main`.",
      "Jalankan `git merge --ff-only hotfix`.",
    ],
    answer: [
      "git checkout -b hotfix",
      'git commit -m "fix bug"',
      "git checkout main",
      "git merge --ff-only hotfix",
    ],
    build: initialRepo,
  },
  {
    id: "tag-survives-reset",
    title: "Tag Tetap Ada Setelah Reset",
    difficulty: "Intermediate",
    instructions: [
      "Simpan commit awal di branch `base`, buat dua commit, beri tag `v1.0.0`, lalu reset `main` ke `base`. Tag harus tetap menunjuk commit lama.",
    ],
    checklist: [
      {
        id: "create-base",
        label: "Buat branch `base` di commit awal",
        done: (s) => {
          const id = s.branches["base"]
          return Boolean(id) && s.commits[id]?.order === 0
        },
      },
      {
        id: "first-commit",
        label: "Buat commit pertama",
        done: (s) => Object.keys(s.commits).length >= 2,
      },
      {
        id: "second-commit",
        label: "Buat commit kedua",
        done: (s) => Object.keys(s.commits).length >= 3,
      },
      {
        id: "tag-head",
        label: "Buat tag `v1.0.0` di HEAD",
        done: (s) =>
          Boolean(s.tags["v1.0.0"]) && s.tags["v1.0.0"] === s.branches["main"],
      },
      {
        id: "reset-main",
        label: "Reset `main` ke `base`, tag tetap menunjuk commit lama",
        done: (s) =>
          s.branches["main"] === s.branches["base"] &&
          s.tags["v1.0.0"] !== s.branches["main"],
      },
    ],
    hints: [
      "Tandai commit awal dengan `git branch base`.",
      "Setelah dua commit, jalankan `git tag v1.0.0`.",
      "Reset dengan `git reset --hard base`.",
    ],
    answer: [
      "git branch base",
      'git commit -m "first change"',
      'git commit -m "second change"',
      "git tag v1.0.0",
      "git reset --hard base",
    ],
    build: initialRepo,
  },

  {
    id: "merge-undo",
    title: "Batalkan Merge dengan Reset",
    difficulty: "Advanced",
    instructions: [
      "Simpan posisi `main` dengan tag `pre-merge`, merge `feature` memakai `--no-ff`, lalu batalkan merge dengan reset ke tag tersebut.",
    ],
    checklist: [
      {
        id: "create-feature",
        label: "Buat branch `feature`",
        done: (s) => Boolean(s.branches["feature"]),
      },
      {
        id: "commit-feature",
        label: "Buat commit di branch `feature`",
        done: (s) => {
          const f = s.branches["feature"]
          const m = s.branches["main"]
          return Boolean(f && m && f !== m && isAncestor(s, m, f))
        },
      },
      {
        id: "back-main",
        label: "Kembali ke `main`",
        done: (s) => s.head.type === "branch" && s.head.name === "main",
      },
      {
        id: "mark-pre-merge",
        label: "Buat tag `pre-merge` di `main` sebelum merge",
        done: (s) =>
          Boolean(s.tags["pre-merge"]) && s.tags["pre-merge"] === s.branches["main"],
      },
      {
        id: "merge-feature",
        label: "Merge `feature` dengan `--no-ff`",
        done: (s) => {
          const m = s.branches["main"]
          const f = s.branches["feature"]
          return Boolean(m && f && s.commits[m]?.parents.length === 2 && isAncestor(s, f, m))
        },
      },
      {
        id: "undo-merge",
        label: "Reset `main` ke `pre-merge`",
        done: (s) => {
          const m = s.branches["main"]
          return m === s.tags["pre-merge"] && (s.commits[m]?.parents.length ?? 2) < 2
        },
      },
    ],
    hints: [
      "Buat commit di `feature`, lalu kembali ke `main`.",
      "Tandai `main` dengan `git tag pre-merge`.",
      "Merge `--no-ff`, lalu `git reset --hard pre-merge`.",
    ],
    answer: [
      "git checkout -b feature",
      'git commit -m "add feature"',
      "git checkout main",
      "git tag pre-merge",
      "git merge --no-ff feature",
      "git reset --hard pre-merge",
    ],
    build: initialRepo,
  },

  {
    id: "two-branch-merge",
    title: "Merge Dua Branch Berurutan",
    difficulty: "Advanced",
    instructions: [
      "Buat branch `feat-a` dan `feat-b`, masing-masing dengan satu commit. Merge keduanya ke `main` memakai `--no-ff`.",
    ],
    checklist: [
      {
        id: "create-a",
        label: "Buat branch `feat-a`",
        done: (s) => Boolean(s.branches["feat-a"]),
      },
      {
        id: "feat-a",
        label: "Branch `feat-a` punya commit baru",
        done: (s) => {
          const f = s.branches["feat-a"]
          const m = s.branches["main"]
          return Boolean(f && m && f !== m && isAncestor(s, m, f))
        },
      },
      {
        id: "back-main-a",
        label: "Kembali ke `main`",
        done: (s) => s.head.type === "branch" && s.head.name === "main",
      },
      {
        id: "create-b",
        label: "Buat branch `feat-b`",
        done: (s) => Boolean(s.branches["feat-b"]),
      },
      {
        id: "feat-b",
        label: "Branch `feat-b` punya commit baru",
        done: (s) => {
          const f = s.branches["feat-b"]
          const m = s.branches["main"]
          return Boolean(f && m && f !== m && isAncestor(s, m, f))
        },
      },
      {
        id: "back-main-b",
        label: "Kembali ke `main`",
        done: (s) => s.head.type === "branch" && s.head.name === "main",
      },

      {
        id: "merge-a",
        label: "Merge `feat-a` ke `main` dengan `--no-ff`",
        done: (s) => {
          const m = s.branches["main"]
          const f = s.branches["feat-a"]
          return Boolean(m && f && isAncestor(s, f, m))
        },
      },
      {
        id: "merge-b",
        label: "Merge `feat-b` ke `main` dengan `--no-ff`",
        done: (s) => {
          const m = s.branches["main"]
          const f = s.branches["feat-b"]
          return Boolean(m && f && isAncestor(s, f, m))
        },
      },
    ],
    hints: [
      "Buat `feat-a` dengan `git checkout -b feat-a`, commit, lalu kembali ke `main`.",
      "Lakukan hal sama untuk `feat-b`.",
      "Merge keduanya satu per satu dengan `git merge --no-ff`.",
    ],
    answer: [
      "git checkout -b feat-a",
      'git commit -m "add feature a"',
      "git checkout main",
      "git checkout -b feat-b",
      'git commit -m "add feature b"',
      "git checkout main",
      "git merge --no-ff feat-a",
      "git merge --no-ff feat-b",
    ],
    build: initialRepo,
  },

  {
    id: "hotfix-from-tag",
    title: "Hotfix dari Tag Rilis",
    difficulty: "Advanced",
    instructions: [
      "Beri tag `v1.0.0` di `main`, commit pekerjaan berikutnya, buat branch `hotfix` dari tag `v1.0.0`, commit perbaikan, lalu merge kembali ke `main` dengan `--no-ff`.",
    ],
    checklist: [
      {
        id: "tag-release",
        label: "Buat tag `v1.0.0` di `main`",
        done: (s) => Boolean(s.tags["v1.0.0"]) && s.tags["v1.0.0"] === s.branches["main"],
      },
      {
        id: "main-commit",
        label: "Buat commit baru di `main`",
        done: (s) => Object.keys(s.commits).length >= 2 && s.commits[s.branches["main"]]?.parents.length === 1,
      },
      {
        id: "create-hotfix",
        label: "Buat `hotfix` dari tag `v1.0.0`",
        done: (s) =>
          Boolean(s.branches["hotfix"]) && s.branches["hotfix"] === s.tags["v1.0.0"],
      },
      {
        id: "fix-commit",
        label: "Buat commit perbaikan di `hotfix`",
        done: (s) => {
          const h = s.branches["hotfix"]
          return Boolean(h && s.tags["v1.0.0"] && h !== s.tags["v1.0.0"] && isAncestor(s, s.tags["v1.0.0"], h))
        },
      },
      {
        id: "back-main",
        label: "Kembali ke `main`",
        done: (s) => s.head.type === "branch" && s.head.name === "main",
      },
      {
        id: "merge-hotfix",
        label: "Merge `hotfix` ke `main` dengan `--no-ff`",
        done: (s) => {
          const m = s.branches["main"]
          const f = s.branches["hotfix"]
          return Boolean(m && f && s.commits[m]?.parents.length === 2 && isAncestor(s, f, m))
        },
      },
    ],
    hints: [
      "Tag HEAD dengan `git tag v1.0.0` sebelum commit berikutnya.",
      "Buat branch dari tag: `git checkout -b hotfix v1.0.0`.",
      "Setelah commit perbaikan, kembali ke `main` dan merge `--no-ff hotfix`.",
    ],
    answer: [
      "git tag v1.0.0",
      'git commit -m "next release work"',
      "git checkout -b hotfix v1.0.0",
      'git commit -m "urgent fix"',
      "git checkout main",
      "git merge --no-ff hotfix",
    ],
    build: initialRepo,
  },

]

export const ROADMAP_ORDER = [
  "first-commit",
  "feature-merge",
  "tag-release",
  "tag-old-commit",
  "release-merge",
  "reset-recovery",
  "merge-ff-only",
  "tag-survives-reset",
  "merge-undo",
  "two-branch-merge",
  "hotfix-from-tag",
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

/**
 * Index of the active step that `next` fails to advance, or null when the
 * command moves the active step forward (or no step is active).
 */
export function blockedStep(
  scenario: Scenario,
  prev: RepoState,
  next: RepoState,
  achieved: Set<string> = new Set(),
): number | null {
  const before = orderedChecklist(scenario, prev, achieved)
  const active = before.findIndex((c) => !c.done)
  if (active < 0) return null
  return orderedChecklist(scenario, next, achieved)[active].done ? null : active
}
