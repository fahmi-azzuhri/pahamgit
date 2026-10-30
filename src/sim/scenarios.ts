import type { RepoState } from "./types"
import { initialRepo, isAncestor } from "./gitEngine"
import { currentLang, lockReason, scenarioCopy, type Lang } from "../lib/i18n"

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

  {
    id: "three-commits",
    title: "Tiga Commit Berurutan",
    difficulty: "Beginner",
    instructions: [
      "Buat tiga commit berurutan dengan pesan `commit 1`, `commit 2`, dan `commit 3`.",
    ],
    checklist: [
      {
        id: "first",
        label: "Buat commit pertama",
        done: (s) => Object.keys(s.commits).length >= 2,
      },
      {
        id: "second",
        label: "Buat commit kedua",
        done: (s) => Object.keys(s.commits).length >= 3,
      },
      {
        id: "third",
        label: "Buat commit ketiga",
        done: (s) => Object.keys(s.commits).length >= 4,
      },
    ],
    hints: [
      "Jalankan `git commit -m \"commit 1\"`, lalu ulangi untuk `commit 2` dan `commit 3`.",
    ],
    answer: [
      'git commit -m "commit 1"',
      'git commit -m "commit 2"',
      'git commit -m "commit 3"',
    ],
    build: initialRepo,
  },
  {
    id: "switch-branches",
    title: "Berpindah Branch",
    difficulty: "Beginner",
    instructions: [
      "Buat branch `dev`, pindah ke `dev`, lalu kembali ke `main`.",
    ],
    checklist: [
      {
        id: "create-dev",
        label: "Buat branch `dev`",
        done: (s) => Boolean(s.branches["dev"]),
      },
      {
        id: "on-dev",
        label: "Pindah ke branch `dev`",
        done: (s) => s.head.type === "branch" && s.head.name === "dev",
      },
      {
        id: "back-main",
        label: "Kembali ke `main`",
        done: (s) => s.head.type === "branch" && s.head.name === "main",
      },
    ],
    hints: [
      "Buat branch dengan `git branch dev`.",
      "Pindah dengan `git checkout dev`, lalu kembali dengan `git checkout main`.",
    ],
    answer: ["git branch dev", "git checkout dev", "git checkout main"],
    build: initialRepo,
  },
  {
    id: "merge-two-commits",
    title: "Merge Branch dengan Dua Commit",
    difficulty: "Intermediate",
    instructions: [
      "Buat branch `feature`, tambahkan dua commit, kembali ke `main`, lalu merge dengan `--no-ff`.",
    ],
    checklist: [
      {
        id: "create-feature",
        label: "Buat branch `feature`",
        done: (s) => Boolean(s.branches["feature"]),
      },
      {
        id: "commit-one",
        label: "Buat commit pertama di `feature`",
        done: (s) => {
          const f = s.branches["feature"]
          const m = s.branches["main"]
          return Object.keys(s.commits).length >= 2 && Boolean(f && m && f !== m && isAncestor(s, m, f))
        },
      },
      {
        id: "commit-two",
        label: "Buat commit kedua di `feature`",
        done: (s) => Object.keys(s.commits).length >= 3,
      },
      {
        id: "back-main",
        label: "Kembali ke `main`",
        done: (s) => s.head.type === "branch" && s.head.name === "main",
      },
      {
        id: "merge-feature",
        label: "Merge `feature` ke `main` dengan `--no-ff`",
        done: (s) => {
          const m = s.branches["main"]
          const f = s.branches["feature"]
          return Boolean(m && f && s.commits[m]?.parents.length === 2 && isAncestor(s, f, m))
        },
      },
    ],
    hints: [
      "Buat branch dengan `git checkout -b feature`.",
      "Buat dua commit, lalu kembali ke `main`.",
      "Merge dengan `git merge --no-ff feature`.",
    ],
    answer: [
      "git checkout -b feature",
      'git commit -m "first feature change"',
      'git commit -m "second feature change"',
      "git checkout main",
      "git merge --no-ff feature",
    ],
    build: initialRepo,
  },
  {
    id: "branch-from-tag",
    title: "Buat Branch dari Tag",
    difficulty: "Intermediate",
    instructions: [
      "Beri tag `v1.0.0` di commit awal, buat commit baru, lalu buat branch `legacy` dari tag tersebut.",
    ],
    checklist: [
      {
        id: "tag-v1",
        label: "Buat tag `v1.0.0` di `main`",
        done: (s) => Boolean(s.tags["v1.0.0"]) && s.tags["v1.0.0"] === s.branches["main"],
      },
      {
        id: "new-commit",
        label: "Buat commit baru di `main`",
        done: (s) =>
          Object.keys(s.commits).length >= 2 && s.branches["main"] !== s.tags["v1.0.0"],
      },
      {
        id: "branch-legacy",
        label: "Buat branch `legacy` dari tag `v1.0.0`",
        done: (s) => Boolean(s.branches["legacy"]) && s.branches["legacy"] === s.tags["v1.0.0"],
      },
    ],
    hints: [
      "Tag HEAD dengan `git tag v1.0.0` sebelum commit baru.",
      "Buat branch dari tag: `git branch legacy v1.0.0`.",
    ],
    answer: [
      "git tag v1.0.0",
      'git commit -m "new work"',
      "git branch legacy v1.0.0",
    ],
    build: initialRepo,
  },

  {
    id: "release-to-main",
    title: "Merge Branch Release ke Main",
    difficulty: "Intermediate",
    instructions: [
      "Buat branch `release`, commit perubahan, kembali ke `main`, lalu merge `release` dengan `--no-ff`.",
    ],
    checklist: [
      {
        id: "create-release",
        label: "Buat branch `release`",
        done: (s) => Boolean(s.branches["release"]),
      },
      {
        id: "commit-release",
        label: "Buat commit di `release`",
        done: (s) => {
          const r = s.branches["release"]
          const m = s.branches["main"]
          return Boolean(r && m && r !== m && isAncestor(s, m, r))
        },
      },
      {
        id: "back-main",
        label: "Kembali ke `main`",
        done: (s) => s.head.type === "branch" && s.head.name === "main",
      },
      {
        id: "merge-release",
        label: "Merge `release` ke `main` dengan `--no-ff`",
        done: (s) => {
          const m = s.branches["main"]
          const r = s.branches["release"]
          return Boolean(m && r && s.commits[m]?.parents.length === 2 && isAncestor(s, r, m))
        },
      },
    ],
    hints: [
      "Buat branch dengan `git checkout -b release`.",
      "Commit perubahan, lalu kembali ke `main`.",
      "Merge dengan `git merge --no-ff release`.",
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
    id: "tag-merge-result",
    title: "Tag Hasil Merge",
    difficulty: "Intermediate",
    instructions: [
      "Merge branch `feature` ke `main` dengan `--no-ff`, lalu beri tag `v2.0.0` pada commit hasil merge.",
    ],
    checklist: [
      {
        id: "create-feature",
        label: "Buat branch `feature`",
        done: (s) => Boolean(s.branches["feature"]),
      },
      {
        id: "commit-feature",
        label: "Buat commit di `feature`",
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
        id: "merge-feature",
        label: "Merge `feature` ke `main` dengan `--no-ff`",
        done: (s) => {
          const m = s.branches["main"]
          const f = s.branches["feature"]
          return Boolean(m && f && s.commits[m]?.parents.length === 2 && isAncestor(s, f, m))
        },
      },
      {
        id: "tag-v2",
        label: "Buat tag `v2.0.0` pada commit merge",
        done: (s) => {
          const m = s.branches["main"]
          return Boolean(s.tags["v2.0.0"]) && s.tags["v2.0.0"] === m && s.commits[m]?.parents.length === 2
        },
      },
    ],
    hints: [
      "Buat `feature`, commit, lalu kembali ke `main`.",
      "Merge dengan `--no-ff` agar terbentuk merge commit.",
      "Tag merge commit dengan `git tag v2.0.0`.",
    ],
    answer: [
      "git checkout -b feature",
      'git commit -m "feature work"',
      "git checkout main",
      "git merge --no-ff feature",
      "git tag v2.0.0",
    ],
    build: initialRepo,
  },

  {
    id: "release-snapshot",
    title: "Backport Main ke Branch Release",
    difficulty: "Advanced",
    instructions: [
      "Buat tag `v1.0.0`, buat branch `release` dari tag itu, commit pekerjaan baru di `main`, lalu merge `main` ke `release`.",
    ],
    checklist: [
      {
        id: "tag-v1",
        label: "Buat tag `v1.0.0` di `main`",
        done: (s) => Boolean(s.tags["v1.0.0"]) && s.tags["v1.0.0"] === s.branches["main"],
      },
      {
        id: "create-release",
        label: "Buat branch `release` dari tag `v1.0.0`",
        done: (s) => Boolean(s.branches["release"]) && s.branches["release"] === s.tags["v1.0.0"],
      },
      {
        id: "main-commit",
        label: "Buat commit baru di `main`",
        done: (s) =>
          Object.keys(s.commits).length >= 2 &&
          s.branches["main"] !== s.tags["v1.0.0"],
      },
      {
        id: "switch-release",
        label: "Pindah ke branch `release`",
        done: (s) => s.head.type === "branch" && s.head.name === "release",
      },
      {
        id: "merge-main",
        label: "Merge `main` ke `release` dengan `--no-ff`",
        done: (s) => {
          const r = s.branches["release"]
          const m = s.branches["main"]
          return Boolean(r && m && s.commits[r]?.parents.length === 2 && isAncestor(s, m, r))
        },
      },
    ],
    hints: [
      "Tag HEAD dengan `git tag v1.0.0`.",
      "Buat branch dari tag: `git branch release v1.0.0`.",
      "Commit di `main`, pindah ke `release`, lalu `git merge --no-ff main`.",
    ],
    answer: [
      "git tag v1.0.0",
      "git branch release v1.0.0",
      'git commit -m "main work"',
      "git checkout release",
      "git merge --no-ff main",
    ],
    build: initialRepo,
  },
  {
    id: "hotfix-then-tag",
    title: "Hotfix Lalu Tag Patch",
    difficulty: "Advanced",
    instructions: [
      "Beri tag `v1.0.0`, commit pekerjaan baru di `main`, buat hotfix dari tag, merge hotfix, lalu tag hasilnya `v1.0.1`.",
    ],
    checklist: [
      {
        id: "tag-v1",
        label: "Buat tag `v1.0.0` di `main`",
        done: (s) => Boolean(s.tags["v1.0.0"]) && s.tags["v1.0.0"] === s.branches["main"],
      },
      {
        id: "main-commit",
        label: "Buat commit baru di `main`",
        done: (s) =>
          Object.keys(s.commits).length >= 2 &&
          s.branches["main"] !== s.tags["v1.0.0"],
      },
      {
        id: "create-hotfix",
        label: "Buat branch `hotfix` dari tag `v1.0.0`",
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
          const h = s.branches["hotfix"]
          return Boolean(m && h && s.commits[m]?.parents.length === 2 && isAncestor(s, h, m))
        },
      },
      {
        id: "tag-patch",
        label: "Buat tag `v1.0.1` pada commit merge",
        done: (s) => {
          const m = s.branches["main"]
          return Boolean(s.tags["v1.0.1"]) && s.tags["v1.0.1"] === m && s.commits[m]?.parents.length === 2
        },
      },
    ],
    hints: [
      "Tag rilis dengan `git tag v1.0.0`, lalu commit pekerjaan baru.",
      "Buat `hotfix` dari tag: `git checkout -b hotfix v1.0.0`.",
      "Merge `--no-ff hotfix`, lalu `git tag v1.0.1`.",
    ],
    answer: [
      "git tag v1.0.0",
      'git commit -m "next release work"',
      "git checkout -b hotfix v1.0.0",
      'git commit -m "urgent fix"',
      "git checkout main",
      "git merge --no-ff hotfix",
      "git tag v1.0.1",
    ],
    build: initialRepo,
  },
  {
    id: "init-first-commit",
    title: "Init & Commit Pertama",
    difficulty: "Beginner",
    instructions: [
      "Repo sudah tersedia. Buat commit pertama di branch `main` dengan `git commit -m`.",
    ],
    checklist: [
      {
        id: "init",
        label: "Repo siap (git init)",
        done: () => true,
      },
      {
        id: "first-commit",
        label: "Buat commit pertama",
        done: (s) => Object.keys(s.commits).length >= 2,
      },
    ],
    hints: ["Gunakan `git commit -m` untuk membuat commit pertama."],
    answer: ['git commit -m "init"'],
    build: initialRepo,
  },

  {
    id: "reset-modes",
    title: "Reset: Soft / Mixed / Hard",
    difficulty: "Intermediate",
    instructions: [
      "Buat dua commit, lalu reset `main` ke commit pertama dengan `git reset --hard HEAD~2`. Coba juga mode `--soft` dan default (mixed) untuk melihat perbedaannya.",
    ],
    checklist: [
      {
        id: "commit-one",
        label: "Buat commit pertama",
        done: (s) => Object.keys(s.commits).length >= 2,
      },
      {
        id: "commit-two",
        label: "Buat commit kedua",
        done: (s) => Object.keys(s.commits).length >= 3,
      },
      {
        id: "reset",
        label: "Reset `main` ke commit pertama",
        done: (s) => {
          const main = s.branches["main"]
          const first = Object.values(s.commits).find((c) => c.parents.length === 0)?.id
          return Boolean(main && first && main === first)
        },
      },
    ],
    hints: [
      "`git reset --soft HEAD~2` hanya memindahkan HEAD.",
      "`git reset HEAD~2` (mixed) juga meng-unstage.",
      "`git reset --hard HEAD~2` membuang semua perubahan.",
    ],
    answer: ['git commit -m "one"', 'git commit -m "two"', "git reset --hard HEAD~2"],
    build: initialRepo,
  },
  {
    id: "resolve-conflict",
    title: "Selesaikan Konflik Merge",
    difficulty: "Intermediate",
    instructions: [
      "Commit di `main`, buat branch `side` dan commit di sana, kembali ke `main` dan commit lagi, lalu merge `side` — kedua branch maju sehingga merge menghasilkan merge commit (simulasi konflik yang selesai otomatis).",
    ],
    checklist: [
      {
        id: "branch",
        label: "Buat branch `side`",
        done: (s) => Boolean(s.branches["side"]),
      },
      {
        id: "checkout-main",
        label: "Switch kembali ke main",
        done: (s) => s.head.type === "branch" && s.head.name === "main",
      },
      {
        id: "main-commit",
        label: "Buat satu commit di `main`",
        done: (s) => {
          const m = s.branches["main"]
          const base = s.branches["side"]
          if (!m) return false
          return Boolean(base && m !== base && isAncestor(s, base, m))
        },
      },
      {
        id: "checkout-side",
        label: "Switch ke branch `side`",
        done: (s) => s.head.type === "branch" && s.head.name === "side",
      },
      {
        id: "side-commit",
        label: "Buat satu commit di `side`",
        done: (s) => {
          const m = s.branches["main"]
          const sd = s.branches["side"]
          if (!m || !sd) return false
          return !isAncestor(s, sd, m) && !isAncestor(s, m, sd)
        },
      },
      {
        id: "merge-main",
        label: "Dari `side`, merge `main` (menyelesaikan konflik)",
        done: (s) => {
          const sd = s.branches["side"]
          return Boolean(sd && s.commits[sd]?.parents.length === 2)
        },
      },
      {
        id: "back-main",
        label: "Kembali ke `main`",
        done: (s) => s.head.type === "branch" && s.head.name === "main",
      },
      {
        id: "merge-commit",
        label: "Terakhir: merge `side` ke `main`",
        done: (s) => {
          const m = s.branches["main"]
          const sd = s.branches["side"]
          return Boolean(m && sd && isAncestor(s, sd, m))
        },
      },
    ],
    hints: [
      "Buat branch: `git checkout -b side`, lalu kembali `git checkout main`.",
      "Commit di main, pindah ke side (`git checkout side`), commit di sana.",
      "Dari `side`, gabungkan main: `git merge main` — ini menyelesaikan konflik.",
      "Terakhir: `git checkout main` lalu `git merge side`.",
    ],
    answer: [
      "git checkout -b side",
      "git checkout main",
      'git commit -m "main change"',
      "git checkout side",
      'git commit -m "side change"',
      "git merge main",
      "git checkout main",
      "git merge side",
    ],
    build: initialRepo,
  },
  {
    id: "rebase-branch",
    title: "Rebase Branch",
    difficulty: "Intermediate",
    instructions: [
      "Buat branch `topic` dan commit di sana, kembali ke `main` dan commit lagi, lalu dari `topic` jalankan `git rebase main` agar commit topic dipindah ke atas main.",
    ],
    checklist: [
      {
        id: "topic",
        label: "Buat branch `topic`",
        done: (s) => Boolean(s.branches["topic"]),
      },
      {
        id: "commit-topic",
        label: "Buat satu commit di `topic`",
        done: (s) => {
          const t = s.branches["topic"]
          if (!t) return false
          const base = Object.values(s.commits).find((c) => c.parents.length === 0)?.id
          return Boolean(t !== base && s.commits[t]?.parents.length >= 1)
        },
      },
      {
        id: "back-main",
        label: "Kembali ke `main`",
        done: (s) => s.head.type === "branch" && s.head.name === "main",
      },
      {
        id: "commit-main",
        label: "Buat satu commit di `main`",
        done: (s) => {
          const m = s.branches["main"]
          const t = s.branches["topic"]
          if (!m || !t) return false
          return !isAncestor(s, t, m) && !isAncestor(s, m, t)
        },
      },
      {
        id: "checkout-topic",
        label: "Kembali ke `topic`",
        done: (s) => s.head.type === "branch" && s.head.name === "topic",
      },
      {
        id: "rebase",
        label: "Rebase `topic` ke atas `main`",
        done: (s) => {
          const m = s.branches["main"]
          const t = s.branches["topic"]
          if (!m || !t) return false
          return isAncestor(s, m, t) && s.head.type === "branch" && s.head.name === "topic"
        },
      },
    ],
    hints: [
      "Buat `git checkout -b topic` dan commit.",
      "Kembali ke `main`, commit lagi, lalu `git checkout topic`.",
      "Jalankan `git rebase main`.",
    ],
    answer: [
      "git checkout -b topic",
      'git commit -m "topic work"',
      "git checkout main",
      'git commit -m "main work"',
      "git checkout topic",
      "git rebase main",
    ],
    build: initialRepo,
  },

  {
    id: "revert-commit",
    title: "Revert Commit",
    difficulty: "Intermediate",
    instructions: [
      "Buat commit baru, lalu batalkan dengan `git revert HEAD` — commit pembatal tetap tercatat.",
    ],
    checklist: [
      {
        id: "commit",
        label: "Buat commit",
        done: (s) => Object.keys(s.commits).length >= 2,
      },
      {
        id: "revert",
        label: "Revert HEAD (muncul commit `Revert ...`)",
        done: (s) => {
          const main = s.branches["main"]
          return Boolean(main && s.commits[main]?.message.startsWith("Revert"))
        },
      },
    ],
    hints: ["Gunakan `git revert HEAD` untuk membatalkan commit terakhir tanpa menghapus sejarah."],
    answer: ['git commit -m "bad change"', "git revert HEAD"],
    build: initialRepo,
  },
  {
    id: "stash-work",
    title: "Stash Pekerjaan",
    difficulty: "Intermediate",
    instructions: [
      "Simpan perubahan yang belum di-commit dengan `git stash`, lalu kembalikan dengan `git stash pop` dan commit.",
    ],
    checklist: [
      {
        id: "stash",
        label: "Simpan perubahan ke stash",
        done: (s) => (s.stash?.length ?? 0) > 0,
      },
      {
        id: "pop",
        label: "Kembalikan stash (`stash pop`) — stash kembali kosong",
        done: (s) => (s.stash?.length ?? 0) === 0,
      },
      {
        id: "commit",
        label: "Commit pekerjaan yang dikembalikan",
        done: (s) => Object.keys(s.commits).length >= 2,
      },
    ],
    hints: [
      "`git stash` menyimpan perubahan dan membersihkan working tree.",
      "`git stash pop` mengembalikan perubahan terakhir.",
    ],
    answer: ["git stash", "git stash pop", 'git commit -m "stashed work"'],
    build: initialRepo,
  },
  {
    id: "remote-push-pull",
    title: "Remote: Push & Pull (Simulasi)",
    difficulty: "Intermediate",
    instructions: [
      "Buat commit lalu `git push origin main` untuk mengirim, dan `git pull origin main` untuk menarik (simulasi remote, tidak mengubah graf).",
    ],
    checklist: [
      {
        id: "commit",
        label: "Buat commit",
        done: (s) => Object.keys(s.commits).length >= 2,
      },
      {
        id: "push",
        label: "Push ke `origin/main`",
        done: (s) => {
          const m = s.branches["main"]
          return Boolean(m && s.remote?.["origin/main"] === m)
        },
      },
      {
        id: "pull",
        label: "Pull dari `origin/main` (sudah sinkron)",
        done: (s) => {
          const m = s.branches["main"]
          return Boolean(m && s.remote?.["origin/main"] === m)
        },
      },
    ],
    hints: [
      "Commit dulu dengan `git commit -m`.",
      "`git push origin main` memperbarui remote tracking `origin/main`.",
    ],
    answer: ['git commit -m "share work"', "git push origin main", "git pull origin main"],
    build: initialRepo,
  },


]

export const ROADMAP_ORDER = [
  "first-commit",
  "init-first-commit",
  "feature-merge",
  "three-commits",
  "switch-branches",
  "tag-release",
  "revert-commit",
  "tag-old-commit",
  "release-merge",
  "reset-recovery",
  "reset-modes",
  "stash-work",
  "merge-ff-only",
  "resolve-conflict",
  "rebase-branch",
  "remote-push-pull",
  "tag-survives-reset",
  "merge-two-commits",
  "branch-from-tag",
  "release-to-main",
  "tag-merge-result",
  "merge-undo",
  "two-branch-merge",
  "hotfix-from-tag",
  "release-snapshot",
  "hotfix-then-tag",
]

export function getScenario(id: string): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0]
}

export const LEVEL_RANK = { Beginner: 0, Intermediate: 1, Advanced: 2 } as const

/**
 * Per-progression lock: a task stays locked until every task of the previous
 * difficulty level is completed. Returns null when unlocked, otherwise a
 * user-facing reason (Indonesian).
 */
export function taskLockReason(
  scenarioId: string,
  completedIds: Iterable<string>,
  lang: Lang = currentLang(),
): string | null {
  const completed = new Set(completedIds)
  const rank = LEVEL_RANK[getScenario(scenarioId).difficulty]
  if (rank === 0) return null
  const prevLevel = (Object.keys(LEVEL_RANK) as Array<keyof typeof LEVEL_RANK>).find(
    (lvl) => LEVEL_RANK[lvl] === rank - 1,
  )!
  const missing = SCENARIOS.filter((s) => s.difficulty === prevLevel && !completed.has(s.id))
  if (missing.length === 0) return null
  const names = missing
    .slice(0, 3)
    .map((s) => `"${scenarioCopy(s.id, lang)?.title ?? s.title}"`)
    .join(", ")
  return lockReason(prevLevel, missing.length, `${names}${missing.length > 3 ? ", ..." : ""}`, lang)
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
