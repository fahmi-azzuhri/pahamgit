export type Lang = "id" | "en"

export const LANG_KEY = "pahamgit:lang"

export const dict = {
  id: {
    tagline: "Simulator Git Interaktif",
    task: "Task",
    progress: "Progres",
    profile: "Profil",
    logout: "Keluar",
    login: "Masuk",
    stepHeader: "TASK · LANGKAH",
    stepLocked: "Selesaikan langkah sebelumnya dulu",
    nextTask: "Lanjut ke task berikutnya →",
    loginNext: "Masuk & lanjut ke task berikutnya →",
    authTitleLogin: "Masuk untuk lanjut",
    authTitleRegister: "Daftar untuk lanjut",
    authLead: "supaya progres kamu tersimpan dan tidak hilang.",
    username: "Username",
    email: "Email",
    identifier: "Email atau username",
    password: "Password",
    passwordMin: "Password (min. 8 karakter)",
    cancel: "Batal",
    processing: "Memproses...",
    enter: "Masuk",
    signUp: "Daftar",
    noAccount: "Belum punya akun? Daftar",
    hasAccount: "Sudah punya akun? Masuk",
    profileTitle: "Profil",
    profileLead: "Data akun kamu.",
    progressLabel: "progres",
    doneLabel: "selesai",
    lastLevel: "level terakhir",
    noLevel: "Belum ada",
    close: "Tutup",
    welcomeTitle: "Selamat datang di PahamGit",
    welcomeBody:
      "Ini simulator git. Semua perintah diketik langsung di terminal di sebelah kanan. Mulai dengan:",
    startAlone: "Mulai sendiri",
    intro: "\x1b[33mPahamGit simulator\x1b[0m — ketik \x1b[36mhelp\x1b[0m untuk daftar perintah.",
    controls: "Tab = autocomplete · ↑/↓ = riwayat · Ctrl+C = batal",
    helpTitle: "Perintah yang didukung:",
    helpStatus: "status repo",
    helpLog: "riwayat commit",
    helpBranch: "lihat / buat branch",
    helpCheckout: "pindah / buat branch",
    helpSwitch: "pindah / buat branch",
    helpCommit: "catat commit baru",
    helpMerge: "gabung branch (--no-ff opsional)",
    helpReset: "mundurkan branch",
    helpRevert: "batalkan commit dengan commit baru",
    helpRebase: "putar ulang commit di atas branch lain",
    helpStash: "simpan / kembalikan perubahan",
    helpPush: "kirim branch ke remote (simulasi)",
    helpPull: "ambil dari remote (simulasi)",
    helpTag: "buat tag",
    helpClear: "bersihkan terminal",
    helpHelp: "tampilkan bantuan ini",
    beginner: "Pemula",
    intermediate: "Menengah",
    advanced: "Mahir",
    understand: "PAHAMI KONSEP",
    activeStep: "LANGKAH AKTIF",
    stepDone: "✓ Langkah selesai — lanjut ke langkah berikutnya.",
    checkingSession: "Memeriksa sesi...",
    savingPos: "Menyimpan posisi...",
    roadmapDone: "✓ Roadmap selesai",
    terminalLabel: "TERMINAL",
    taskLocked: "Task berikutnya terkunci",
    saveFailed: "Posisi task gagal disimpan. Coba lagi.",
    loginFailed: "Gagal masuk",
  },
  en: {
    tagline: "Interactive Git Simulator",
    task: "Task",
    progress: "Progress",
    profile: "Profile",
    logout: "Log out",
    login: "Log in",
    stepHeader: "TASK · STEP",
    stepLocked: "Finish the previous step first",
    nextTask: "Continue to the next task →",
    loginNext: "Log in & continue to the next task →",
    authTitleLogin: "Log in to continue",
    authTitleRegister: "Sign up to continue",
    authLead: "so your progress is saved and does not disappear.",
    username: "Username",
    email: "Email",
    identifier: "Email or username",
    password: "Password",
    passwordMin: "Password (min. 8 characters)",
    cancel: "Cancel",
    processing: "Working...",
    enter: "Log in",
    signUp: "Sign up",
    noAccount: "No account yet? Sign up",
    hasAccount: "Already have an account? Log in",
    profileTitle: "Profile",
    profileLead: "Your account.",
    progressLabel: "progress",
    doneLabel: "done",
    lastLevel: "latest level",
    noLevel: "None yet",
    close: "Close",
    welcomeTitle: "Welcome to PahamGit",
    welcomeBody: "This is a git simulator. Type every command in the terminal on the right. Start with:",
    startAlone: "Start on my own",
    intro: "\x1b[33mPahamGit simulator\x1b[0m — type \x1b[36mhelp\x1b[0m for the command list.",
    controls: "Tab = autocomplete · ↑/↓ = history · Ctrl+C = cancel",
    helpTitle: "Supported commands:",
    helpStatus: "repo state",
    helpLog: "commit history",
    helpBranch: "list / create branch",
    helpCheckout: "switch / create",
    helpSwitch: "switch / create",
    helpCommit: "record a commit",
    helpMerge: "merge (--no-ff optional)",
    helpReset: "move branch back",
    helpRevert: "undo a commit with a new commit",
    helpRebase: "replay commits on top of another branch",
    helpStash: "save / restore working changes",
    helpPush: "publish branch to remote (simulated)",
    helpPull: "fetch from remote (simulated)",
    helpTag: "create a tag",
    helpClear: "clear the terminal",
    helpHelp: "show this help",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    understand: "UNDERSTAND THE CONCEPT",
    activeStep: "ACTIVE STEP",
    stepDone: "✓ Step done — continue to the next step.",
    checkingSession: "Checking session...",
    savingPos: "Saving position...",
    roadmapDone: "✓ Roadmap complete",
    terminalLabel: "TERMINAL",
    taskLocked: "Next task locked",
    saveFailed: "Could not save your position. Try again.",
    loginFailed: "Login failed",
  },
} satisfies Record<Lang, Record<string, string>>

export type Copy = (typeof dict)["id"]

export function currentLang(): Lang {
  return localStorage.getItem(LANG_KEY) === "en" ? "en" : "id"
}

export function lockReason(level: string, n: number, names: string, lang: Lang = currentLang()) {
  return lang === "en"
    ? `Finish every ${level} task first (${n} left: ${names}).`
    : `Selesaikan semua task ${level} dulu (sisa ${n}: ${names}).`
}

export function helpText(lang: Lang = currentLang()): string {
  const t = dict[lang]
  return `${t.helpTitle}
  git status                  ${t.helpStatus}
  git log [--oneline]         ${t.helpLog}
  git branch <name> [start]   ${t.helpBranch}
  git checkout [-b] <ref>     ${t.helpCheckout}
  git switch [-c] <branch>    ${t.helpSwitch}
  git commit -m "msg"         ${t.helpCommit}
  git merge <branch>          ${t.helpMerge}
  git reset [--hard] [id]     ${t.helpReset}
  git revert [id]             ${t.helpRevert}
  git rebase <branch>         ${t.helpRebase}
  git stash [pop|list]        ${t.helpStash}
  git push [origin <branch>]  ${t.helpPush}
  git pull [origin <branch>]  ${t.helpPull}
  git tag <name> [id]         ${t.helpTag}
  clear                       ${t.helpClear}
  help                        ${t.helpHelp}`
}

export function levelLabel(level: "Beginner" | "Intermediate" | "Advanced", lang: Lang = currentLang()) {
  const t = dict[lang]
  return level === "Beginner" ? t.beginner : level === "Intermediate" ? t.intermediate : t.advanced
}

/** One string in both languages. */
export type Text = { id: string; en: string }
export type ScenarioText = {
  title: Text
  instructions: Text[]
  labels: Record<string, Text>
  hints: Text[]
}

/** Scenario copy keyed by scenario id. Labels keyed by checklist item id. */
export const scenarioText: Record<string, ScenarioText> = {
  "feature-merge": {
    title: { id: "Feature Branch & Merge", en: "Feature Branch & Merge" },
    instructions: [
      { id: "Kamu bekerja di repo dengan branch `main`. Tugasmu mengembangkan fitur baru tanpa mengganggu main.", en: "You are in a repo on branch `main`. Build a new feature without touching main." },
      { id: "Buat branch `feature`, lakukan satu commit di sana, lalu kembali ke `main` dan gabungkan.", en: "Create branch `feature`, make one commit there, return to `main`, and merge." },
    ],
    labels: {
      "create-feature": { id: "Buat branch baru bernama `feature`", en: "Create a new branch named `feature`" },
      "switch-feature": { id: "Pindah (checkout/switch) ke branch `feature`", en: "Switch (checkout/switch) to branch `feature`" },
      "commit-feature": { id: "Buat minimal 1 commit di `feature`", en: "Make at least 1 commit on `feature`" },
      "back-main": { id: "Kembali ke branch `main`", en: "Return to branch `main`" },
      merge: { id: "Merge `feature` ke `main`", en: "Merge `feature` into `main`" },
    },
    hints: [
      { id: "Gunakan `git checkout -b feature` untuk membuat sekaligus pindah branch.", en: "Use `git checkout -b feature` to create and switch in one step." },
      { id: "Setelah commit, kembali ke main dengan `git checkout main`.", en: "After the commit, return to main with `git checkout main`." },
      { id: "Gabungkan dengan `git merge feature` dari dalam branch main.", en: "Merge with `git merge feature` while on main." },
    ],
  },
  "first-commit": {
    title: { id: "Commit Pertama", en: "First Commit" },
    instructions: [{ id: "Repo sudah punya satu commit awal. Buat satu commit baru di branch `main`.", en: "The repo already has one initial commit. Make one new commit on `main`." }],
    labels: { commit: { id: "Buat satu commit baru", en: "Make one new commit" } },
    hints: [{ id: "Gunakan `git commit -m` untuk membuat commit.", en: "Use `git commit -m` to create a commit." }],
  },
  "tag-release": {
    title: { id: "Rilis dengan Tag", en: "Release with a Tag" },
    instructions: [
      { id: "Buat commit fitur, beri tag `v1.0.0`, lalu buat commit perbaikan dan tag `v1.0.1`.", en: "Make a feature commit, tag it `v1.0.0`, then make a fix commit and tag `v1.0.1`." },
    ],
    labels: {
      "feature-commit": { id: "Buat commit fitur", en: "Make a feature commit" },
      "tag-v1": { id: "Buat tag `v1.0.0` pada commit fitur", en: "Create tag `v1.0.0` on the feature commit" },
      "fix-commit": { id: "Buat commit perbaikan", en: "Make a fix commit" },
      "tag-v2": { id: "Buat tag `v1.0.1` pada commit terbaru", en: "Create tag `v1.0.1` on the latest commit" },
    },
    hints: [
      { id: "Tag menempel ke commit, bukan ke branch.", en: "A tag points at a commit, not a branch." },
      { id: "`git tag v1.0.0` menandai HEAD saat ini.", en: "`git tag v1.0.0` marks the current HEAD." },
    ],
  },
  "reset-recovery": {
    title: { id: "Batalkan Commit dengan Reset", en: "Undo a Commit with Reset" },
    instructions: [
      {
        id: "Buat commit yang benar, tandai dengan branch `backup`, buat commit rusak, lalu reset `main` kembali ke backup.",
        en: "Make a good commit, mark it with branch `backup`, make a bad commit, then reset `main` back to backup.",
      },
    ],
    labels: {
      "good-commit": { id: "Buat commit yang benar", en: "Make the good commit" },
      backup: { id: "Buat branch `backup` di commit tersebut", en: "Create branch `backup` on that commit" },
      "bad-commit": { id: "Buat commit rusak setelah backup", en: "Make a bad commit after the backup" },
      reset: { id: "Reset `main` ke `backup`", en: "Reset `main` to `backup`" },
    },
    hints: [
      { id: "Branch `backup` jadi penanda commit yang ingin dipertahankan.", en: "Branch `backup` marks the commit you want to keep." },
      { id: "`git reset --hard backup` memindahkan `main` ke sana.", en: "`git reset --hard backup` moves `main` there." },
    ],
  },
  "release-merge": {
    title: { id: "Merge dengan --no-ff", en: "Merge with --no-ff" },
    instructions: [
      {
        id: "Kerjakan di branch `release`, lalu gabungkan ke `main` dengan merge commit (`--no-ff`).",
        en: "Work on branch `release`, then merge it into `main` with a merge commit (`--no-ff`).",
      },
    ],
    labels: {
      "create-release": { id: "Buat branch `release`", en: "Create branch `release`" },
      "switch-release": { id: "Pindah ke branch `release`", en: "Switch to branch `release`" },
      "commit-release": { id: "Buat commit di `release`", en: "Make a commit on `release`" },
      "back-main": { id: "Kembali ke `main`", en: "Return to `main`" },
      "merge-no-ff": { id: "Merge `release` dengan `--no-ff`", en: "Merge `release` with `--no-ff`" },
    },
    hints: [
      {
        id: "`--no-ff` memaksa merge commit meski bisa fast-forward.",
        en: "`--no-ff` forces a merge commit even when a fast-forward is possible.",
      },
    ],
  },
  "tag-old-commit": {
    title: { id: "Tag Commit Lama", en: "Tag an Old Commit" },
    instructions: [
      {
        id: "Buat dua commit. Tag `v0.1.0` harus menunjuk ke commit pertama, bukan HEAD.",
        en: "Make two commits. Tag `v0.1.0` must point at the first commit, not HEAD.",
      },
    ],
    labels: {
      "first-commit": { id: "Buat commit pertama", en: "Make the first commit" },
      "mark-old": { id: "Buat branch `old` di commit pertama", en: "Create branch `old` on the first commit" },
      "second-commit": { id: "Buat commit kedua", en: "Make the second commit" },
      "tag-old": { id: "Tag `v0.1.0` mengarah ke `old`, bukan HEAD", en: "Tag `v0.1.0` points at `old`, not HEAD" },
    },
    hints: [
      {
        id: "`git tag v0.1.0 old` menandai commit yang ditunjuk branch `old`.",
        en: "`git tag v0.1.0 old` marks the commit that branch `old` points at.",
      },
    ],
  },
  "merge-ff-only": {
    title: { id: "Fast-forward Merge", en: "Fast-forward Merge" },
    instructions: [
      {
        id: "Buat commit di `hotfix`, kembali ke `main`, lalu merge dengan `--ff-only` tanpa merge commit.",
        en: "Make a commit on `hotfix`, return to `main`, then merge with `--ff-only` and no merge commit.",
      },
    ],
    labels: {
      "create-hotfix": { id: "Buat branch `hotfix`", en: "Create branch `hotfix`" },
      "commit-hotfix": { id: "Buat commit di `hotfix`", en: "Make a commit on `hotfix`" },
      "back-main": { id: "Kembali ke `main`", en: "Return to `main`" },
      "ff-merge": {
        id: "Merge `hotfix` dengan `--ff-only` tanpa merge commit",
        en: "Merge `hotfix` with `--ff-only` and no merge commit",
      },
    },
    hints: [
      {
        id: "`git merge --ff-only hotfix` hanya jalan kalau `main` belum bercabang.",
        en: "`git merge --ff-only hotfix` only works if `main` has not diverged.",
      },
    ],
  },
  "tag-survives-reset": {
    title: { id: "Tag Tetap Ada Setelah Reset", en: "Tag Survives a Reset" },
    instructions: [
      {
        id: "Tandai commit awal, buat commit baru, lalu reset. Tag harus tetap ada.",
        en: "Mark the initial commit, make a new commit, then reset. The tag must remain.",
      },
    ],
    labels: {
      "create-base": { id: "Buat branch `base` di commit awal", en: "Create branch `base` on the initial commit" },
    },
    hints: [{ id: "Reset memindahkan branch, bukan tag.", en: "Reset moves a branch, not a tag." }],
  },
  "merge-undo": {
    title: { id: "Batalkan Merge dengan Reset", en: "Undo a Merge with Reset" },
    instructions: [
      {
        id: "Merge sebuah branch ke `main`, lalu batalkan merge itu dengan reset ke titik sebelum merge.",
        en: "Merge a branch into `main`, then undo that merge by resetting to the point before it.",
      },
    ],
    labels: {},
    hints: [
      {
        id: "Simpan posisi `main` sebelum merge, misalnya dengan branch penanda.",
        en: "Save `main` before the merge, for example with a marker branch.",
      },
    ],
  },
  "two-branch-merge": {
    title: { id: "Merge Dua Branch Berurutan", en: "Merge Two Branches in Order" },
    instructions: [
      {
        id: "Kerjakan dua branch terpisah, lalu gabungkan keduanya ke `main` satu per satu.",
        en: "Work on two separate branches, then merge both into `main`, one after the other.",
      },
    ],
    labels: {},
    hints: [{ id: "Selesaikan satu merge dulu sebelum mulai merge kedua.", en: "Finish one merge before starting the second." }],
  },
  "hotfix-from-tag": {
    title: { id: "Hotfix dari Tag Rilis", en: "Hotfix from a Release Tag" },
    instructions: [
      {
        id: "Buat tag rilis, lalu buat branch hotfix dari tag itu dan merge kembali ke `main`.",
        en: "Create a release tag, then branch a hotfix from that tag and merge it back into `main`.",
      },
    ],
    labels: {},
    hints: [{ id: "`git checkout -b hotfix v1.0.0` membuat branch dari tag.", en: "`git checkout -b hotfix v1.0.0` creates a branch from a tag." }],
  },
  "three-commits": {
    title: { id: "Tiga Commit Berurutan", en: "Three Commits in a Row" },
    instructions: [{ id: "Buat tiga commit baru berturut-turut di `main`.", en: "Make three new commits in a row on `main`." }],
    labels: {},
    hints: [{ id: "Ulangi `git commit -m` tiga kali.", en: "Repeat `git commit -m` three times." }],
  },
  "switch-branches": {
    title: { id: "Berpindah Branch", en: "Switching Branches" },
    instructions: [{ id: "Buat branch baru, pindah ke sana, lalu kembali ke `main`.", en: "Create a new branch, switch to it, then return to `main`." }],
    labels: {},
    hints: [{ id: "`git switch` atau `git checkout` memindahkan HEAD.", en: "`git switch` or `git checkout` moves HEAD." }],
  },
  "merge-two-commits": {
    title: { id: "Merge Branch dengan Dua Commit", en: "Merge a Branch with Two Commits" },
    instructions: [{ id: "Buat dua commit di branch fitur, lalu merge branch itu ke `main`.", en: "Make two commits on a feature branch, then merge that branch into `main`." }],
    labels: {},
    hints: [{ id: "Kedua commit harus ada sebelum kamu kembali ke `main`.", en: "Both commits must exist before you return to `main`." }],
  },
  "branch-from-tag": {
    title: { id: "Buat Branch dari Tag", en: "Create a Branch from a Tag" },
    instructions: [{ id: "Buat tag, lalu buat branch baru yang dimulai dari tag itu.", en: "Create a tag, then create a new branch that starts from that tag." }],
    labels: {},
    hints: [{ id: "`git checkout -b nama tag` memulai branch dari tag.", en: "`git checkout -b name tag` starts a branch at a tag." }],
  },
  "release-to-main": {
    title: { id: "Merge Branch Release ke Main", en: "Merge the Release Branch into Main" },
    instructions: [{ id: "Selesaikan pekerjaan di `release`, lalu gabungkan ke `main`.", en: "Finish the work on `release`, then merge it into `main`." }],
    labels: {},
    hints: [{ id: "Kamu harus berada di `main` saat menjalankan `git merge release`.", en: "You must be on `main` when you run `git merge release`." }],
  },
  "tag-merge-result": {
    title: { id: "Tag Hasil Merge", en: "Tag the Merge Result" },
    instructions: [{ id: "Merge sebuah branch, lalu beri tag pada commit hasil merge.", en: "Merge a branch, then tag the resulting merge commit." }],
    labels: {},
    hints: [{ id: "`git tag` tanpa argumen commit menandai HEAD.", en: "`git tag` without a commit argument marks HEAD." }],
  },
  "release-snapshot": {
    title: { id: "Backport Main ke Branch Release", en: "Backport Main onto the Release Branch" },
    instructions: [{ id: "Bawa perubahan dari `main` ke branch `release`.", en: "Bring the changes from `main` onto the `release` branch." }],
    labels: {},
    hints: [{ id: "Pindah ke `release` dulu, baru `git merge main`.", en: "Switch to `release` first, then `git merge main`." }],
  },
  "hotfix-then-tag": {
    title: { id: "Hotfix Lalu Tag Patch", en: "Hotfix, then Tag the Patch" },
    instructions: [{ id: "Buat hotfix, merge ke `main`, lalu tag hasilnya `v1.0.1`.", en: "Make a hotfix, merge it into `main`, then tag the result `v1.0.1`." }],
    labels: {
      "tag-patch": { id: "Buat tag `v1.0.1` pada commit merge", en: "Create tag `v1.0.1` on the merge commit" },
    },
    hints: [{ id: "Tag dipasang setelah merge, bukan sebelum.", en: "The tag goes on after the merge, not before." }],
  },
  "init-first-commit": {
    title: { id: "Init & Commit Pertama", en: "Init & First Commit" },
    instructions: [
      {
        id: "Repo kosong. Siapkan dengan `git init`, lalu buat commit pertama.",
        en: "The repo is empty. Prepare it with `git init`, then make the first commit.",
      },
    ],
    labels: {
      init: { id: "Repo siap (git init)", en: "Repo ready (git init)" },
      "first-commit": { id: "Buat commit pertama", en: "Make the first commit" },
    },
    hints: [
      { id: "Gunakan `git commit -m` untuk membuat commit pertama.", en: "Use `git commit -m` to make the first commit." },
    ],
  },
  "reset-modes": {
    title: { id: "Reset: Soft / Mixed / Hard", en: "Reset: Soft / Mixed / Hard" },
    instructions: [
      {
        id: "Buat dua commit, lalu reset `main` kembali ke commit pertama.",
        en: "Make two commits, then reset `main` back to the first commit.",
      },
    ],
    labels: {
      "commit-one": { id: "Buat commit pertama", en: "Make the first commit" },
      "commit-two": { id: "Buat commit kedua", en: "Make the second commit" },
      reset: { id: "Reset `main` ke commit pertama", en: "Reset `main` to the first commit" },
    },
    hints: [
      {
        id: "`git reset --hard` memindahkan branch dan membuang commit di atasnya dari branch.",
        en: "`git reset --hard` moves the branch and drops the commits above it from the branch.",
      },
    ],
  },
  "resolve-conflict": {
    title: { id: "Selesaikan Konflik Merge", en: "Resolve a Merge Conflict" },
    instructions: [
      {
        id: "Buat commit di `main` dan `side` yang bentrok, lalu selesaikan merge dari kedua sisi.",
        en: "Make conflicting commits on `main` and `side`, then finish the merge from both sides.",
      },
    ],
    labels: {
      branch: { id: "Buat branch `side`", en: "Create branch `side`" },
      "checkout-main": { id: "Switch kembali ke main", en: "Switch back to main" },
      "main-commit": { id: "Buat satu commit di `main`", en: "Make one commit on `main`" },
      "checkout-side": { id: "Switch ke branch `side`", en: "Switch to branch `side`" },
      "side-commit": { id: "Buat satu commit di `side`", en: "Make one commit on `side`" },
      "merge-main": {
        id: "Dari `side`, merge `main` (menyelesaikan konflik)",
        en: "From `side`, merge `main` (resolving the conflict)",
      },
      "back-main": { id: "Kembali ke `main`", en: "Return to `main`" },
      "merge-commit": { id: "Terakhir: merge `side` ke `main`", en: "Finally: merge `side` into `main`" },
    },
    hints: [
      {
        id: "Simulator menyelesaikan konflik saat merge dijalankan. Ikuti urutan checklist.",
        en: "The simulator resolves the conflict when the merge runs. Follow the checklist order.",
      },
    ],
  },
  "rebase-branch": {
    title: { id: "Rebase Branch", en: "Rebase a Branch" },
    instructions: [
      {
        id: "Commit di `topic` dan di `main` sampai keduanya bercabang, lalu dari `topic` jalankan `git rebase main`.",
        en: "Commit on `topic` and on `main` until they diverge, then from `topic` run `git rebase main`.",
      },
    ],
    labels: {
      topic: { id: "Buat branch `topic`", en: "Create branch `topic`" },
      "commit-topic": { id: "Buat satu commit di `topic`", en: "Make one commit on `topic`" },
      "back-main": { id: "Kembali ke `main`", en: "Return to `main`" },
      "commit-main": { id: "Buat satu commit di `main`", en: "Make one commit on `main`" },
      "checkout-topic": { id: "Kembali ke `topic`", en: "Return to `topic`" },
      rebase: { id: "Rebase `topic` ke atas `main`", en: "Rebase `topic` onto `main`" },
    },
    hints: [
      { id: "Buat `git checkout -b topic` dan commit.", en: "Run `git checkout -b topic` and commit." },
      {
        id: "Kembali ke `main`, commit lagi, lalu `git checkout topic`.",
        en: "Return to `main`, commit again, then `git checkout topic`.",
      },
      { id: "Jalankan `git rebase main`.", en: "Run `git rebase main`." },
    ],
  },
  "revert-commit": {
    title: { id: "Revert Commit", en: "Revert a Commit" },
    instructions: [
      {
        id: "Buat commit baru, lalu batalkan dengan `git revert HEAD`. Commit pembatal tetap tercatat.",
        en: "Make a new commit, then undo it with `git revert HEAD`. The undo commit stays in history.",
      },
    ],
    labels: {
      commit: { id: "Buat commit", en: "Make a commit" },
      revert: { id: "Revert HEAD (muncul commit `Revert ...`)", en: "Revert HEAD (a `Revert ...` commit appears)" },
    },
    hints: [
      {
        id: "Gunakan `git revert HEAD` untuk membatalkan commit terakhir tanpa menghapus sejarah.",
        en: "Use `git revert HEAD` to undo the latest commit without erasing history.",
      },
    ],
  },
  "stash-work": {
    title: { id: "Stash Pekerjaan", en: "Stash Your Work" },
    instructions: [
      {
        id: "Simpan perubahan yang belum di-commit dengan `git stash`, lalu kembalikan dengan `git stash pop` dan commit.",
        en: "Save uncommitted changes with `git stash`, restore them with `git stash pop`, and commit.",
      },
    ],
    labels: {
      stash: { id: "Simpan perubahan ke stash", en: "Save the changes to the stash" },
      pop: {
        id: "Kembalikan stash (`stash pop`) — stash kembali kosong",
        en: "Restore the stash (`stash pop`) — the stash is empty again",
      },
      commit: { id: "Commit pekerjaan yang dikembalikan", en: "Commit the restored work" },
    },
    hints: [
      { id: "`git stash` menyimpan, `git stash pop` mengembalikan.", en: "`git stash` saves, `git stash pop` restores." },
    ],
  },
  "remote-push-pull": {
    title: { id: "Remote: Push & Pull (Simulasi)", en: "Remote: Push & Pull (Simulated)" },
    instructions: [
      {
        id: "Buat commit, push ke `origin/main`, lalu pull supaya lokal dan remote sinkron.",
        en: "Make a commit, push to `origin/main`, then pull so local and remote match.",
      },
    ],
    labels: {
      commit: { id: "Buat commit", en: "Make a commit" },
      push: { id: "Push ke `origin/main`", en: "Push to `origin/main`" },
      pull: { id: "Pull dari `origin/main` (sudah sinkron)", en: "Pull from `origin/main` (already in sync)" },
    },
    hints: [
      {
        id: "Push dulu, baru pull. Remote di sini hanya simulasi.",
        en: "Push first, then pull. The remote here is only a simulation.",
      },
    ],
  },
}

/** Localized scenario strings; undefined when the scenario has no copy yet. */
export function scenarioCopy(id: string, lang: Lang = currentLang()) {
  const s = scenarioText[id]
  if (!s) return null
  return {
    title: s.title[lang],
    instructions: s.instructions.map((x) => x[lang]),
    hints: s.hints.map((x) => x[lang]),
  }
}

/** Localized checklist label, falling back to the Indonesian string in scenarios.ts. */
export function scenarioLabel(id: string, itemId: string, fallback: string, lang: Lang = currentLang()) {
  return scenarioText[id]?.labels[itemId]?.[lang] ?? fallback
}

