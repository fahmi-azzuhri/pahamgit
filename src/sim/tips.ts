/**
 * Educational feedback: maps engine error output to a short explanation of
 * WHY it failed and what to do instead. This is the "paham Git" layer —
 * we never just block, we teach.
 */
const TIP_RULES: { pattern: RegExp; tip: string }[] = [
  {
    pattern: /nothing to commit/i,
    tip: "Working tree-nya bersih — tidak ada perubahan baru sejak commit terakhir. Commit selalu butuh perubahan: coba ubah sesuatu dulu, atau periksa `git status`.",
  },
  {
    pattern: /empty commit message/i,
    tip: "Setiap commit butuh pesan agar riwayat mudah dibaca. Gunakan `git commit -m \"pesan\"`.",
  },
  {
    pattern: /a branch named '(.+)' already exists/i,
    tip: "Nama branch harus unik. Kalau maksudmu pindah ke branch itu, pakai `git checkout nama-branch` (tanpa -b). Flag `-b` artinya 'buat branch baru'.",
  },
  {
    pattern: /did not match any branch\/commit/,
    tip: "Git tidak mengenali nama itu. Jalankan `git branch` untuk melihat branch yang ada, atau `git log --oneline` untuk melihat commit yang valid.",
  },
  {
    pattern: /not a valid object name|bad revision|ambiguous argument|Failed to resolve/,
    tip: "Referensi itu tidak ditemukan. Di simulasi ini kamu bisa pakai 7 karakter pertama hash commit (dari `git log --oneline`), nama branch, tag, atau `HEAD~1` untuk commit sebelumnya.",
  },
  {
    pattern: /Not possible to fast-forward/,
    tip: "`--ff-only` menuntut riwayat linear: branch tujuan harus turunan langsung dari HEAD. Di sini keduanya sudah bercabang (diverged), jadi butuh merge commit biasa (tanpa `--ff-only`).",
  },
  {
    pattern: /No stash entries found/,
    tip: "Stash masih kosong. `git stash pop` hanya bekerja kalau sebelumnya kamu menjalankan `git stash`.",
  },
  {
    pattern: /detached HEAD/,
    tip: "HEAD sedang lepas (menunjuk commit langsung, bukan branch). Commit di mode ini mudah hilang — kembali ke branch dulu dengan `git checkout main` (atau branch lain).",
  },
  {
    pattern: /requires a branch/,
    tip: "Perintah ini butuh nama target. Contoh: `git merge fitur` menggabungkan branch `fitur` ke branch aktif saat ini.",
  },
  {
    pattern: /no initial commit/,
    tip: "Repositori masih kosong — commit pertama (root) belum ada. Buat dulu dengan `git commit -m \"initial commit\"`.",
  },
  {
    pattern: /not something we can merge/,
    tip: "Yang bisa di-merge hanya branch (atau commit) yang ada. Cek nama branch dengan `git branch`.",
  },
  {
    pattern: /command not found/,
    tip: "Perintah tidak dikenal. Ketik `help` untuk daftar perintah yang didukung simulator ini.",
  },
  {
    pattern: /already exists/,
    tip: "Nama itu sudah dipakai — pilih nama lain.",
  },
]

/** Extra context for a blocked checklist step (wrong order, not a wrong command). */
export function blockedStepTip(label: string): string {
  return `Perintahnya valid, tapi urutannya belum tepat: langkah aktif saat ini adalah \"${label}\". Kerjakan langkah itu dulu — di Git urutan operasi menentukan hasil (mis. commit dulu sebelum pindah branch, atau buat branch sebelum commit di sana).`
}

/** Returns a "💡 tip: ..." line for an engine error, or null if none matches. */
export function tipFor(output: string): string | null {
  for (const rule of TIP_RULES) {
    if (rule.pattern.test(output)) return `💡 tip: ${rule.tip}`
  }
  return null
}
