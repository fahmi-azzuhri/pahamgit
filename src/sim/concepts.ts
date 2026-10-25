export interface Concept {
  id: ConceptId
  label: string
  title: string
  body: string
}

export const CONCEPTS: Concept[] = [
  {
    id: "branch",
    label: "Branch",
    title: "Apa itu branch?",
    body: "Branch adalah penunjuk (pointer) yang bisa bergerak ke sebuah commit. Bayangkan sebagai jalur pengembangan terpisah: `main` adalah jalur utama, dan branch lain (mis. `feature`) adalah cabang untuk mengerjakan sesuatu tanpa mengganggu `main`. Membuat branch tidak menyalin file — cuma membuat penunjuk baru, sehingga sangat murah.",
  },
  {
    id: "head",
    label: "HEAD",
    title: "Apa itu HEAD?",
    body: "HEAD adalah penunjuk ke posisi kamu saat ini — biasanya menunjuk ke branch aktif, dan lewat branch itu menunjuk ke commit terbarinya. Saat kamu `checkout` branch, yang sebenarnya bergerak adalah HEAD. Kalau HEAD menunjuk langsung ke commit (bukan branch), itu disebut *detached HEAD* — commit baru di mode itu mudah hilang karena tidak ada branch yang menunjuknya.",
  },
  {
    id: "commit",
    label: "Commit",
    title: "Apa itu commit?",
    body: "Commit adalah snapshot (potret) proyek pada satu titik waktu, lengkap dengan pesan, penulis, dan commit induknya. Rangkaian commit-induk inilah yang membentuk riwayat. Commit bersifat *immutable*: kamu tidak mengubahnya, kamu menambah commit baru di atasnya (itu sebabnya `revert` membuat commit baru, bukan menghapus).",
  },
  {
    id: "merge",
    label: "Merge",
    title: "Apa itu merge?",
    body: "Merge menggabungkan dua jalur riwayat menjadi satu. Kalau riwayat masih linear, Git melakukan *fast-forward* (cuma memindahkan penunjuk branch). Kalau kedua branch sudah bercabang (diverged), Git membuat *merge commit* dengan dua induk. Konflik terjadi kalau perubahan yang sama diubah di kedua sisi — dan harus diselesaikan sebelum merge selesai.",
  },
  {
    id: "remote",
    label: "Remote",
    title: "Apa itu remote (origin)?",
    body: "Remote adalah salinan repositori di tempat lain (mis. GitHub), biasanya dinamai `origin`. `push` mengirim commit lokal kamu ke remote, `pull` menarik commit dari remote ke lokal. Simulator ini mensimulasikannya dengan *remote tracking* `origin/main` — sama seperti Git asli, yang selalu mencatat posisi terakhir yang diketahui dari remote.",
  },
  {
    id: "reset",
    label: "Reset",
    title: "Apa itu reset?",
    body: "`reset` memindahkan penunjuk branch ke commit lain — memindahkan masa lalu. Tiga mode utamanya: `--soft` (hanya pindahkan branch, perubahan tetap *staged*), `--mixed` default (juga *unstage*), dan `--hard` (buang semua perubahan — berbahaya). Beda dengan `revert` yang aman: revert membuat commit baru yang membatalkan, tanpa mengubah riwayat.",
  },
  {
    id: "stash",
    label: "Stash",
    title: "Apa itu stash?",
    body: "`stash` adalah tumpukan penyimpanan sementara untuk perubahan yang belum di-commit. Berguna saat kamu perlu pindah branch tapi perubahanmu belum siap di-commit. `git stash` menyimpan dan membersihkan working tree, `git stash pop` mengembalikannya. Anggap seperti clipboard untuk pekerjaan setengah jadi.",
  },
  {
    id: "rebase",
    label: "Rebase",
    title: "Apa itu rebase?",
    body: "`rebase` memindahkan (memainkan ulang) commit-mu ke atas basis lain — seolah kamu mulai bekerja dari titik itu. Hasilnya riwayat linear dan rapi, tapi commit lama "ditulis ulang". Aturan emas: jangan rebase commit yang sudah di-push ke shared branch, karena orang lain mungkin sudah membangun di atasnya.",
  },
]
