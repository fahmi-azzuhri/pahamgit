import { useEffect, useRef, useState, type FormEvent } from "react"
import { ReactFlowProvider } from "@xyflow/react"
import { Terminal } from "@xterm/xterm"
import "@xterm/xterm/css/xterm.css"
import { FitAddon } from "@xterm/addon-fit"
import { TopBar } from "./components/TopBar"
import { GraphPanel } from "./components/GraphPanel"
import { CommitDrawer } from "./components/CommitDrawer"
import { useGitSim } from "./hooks/useGitSim"
import { complete } from "./sim/parser"
import { login, logout, me, register } from "./lib/auth"

const PROMPT = "\x1b[32muser@git-sim\x1b[0m:\x1b[36m~\x1b[0m$ "
const INTRO = "\x1b[33mPahamGit simulator\x1b[0m — ketik \x1b[36mhelp\x1b[0m untuk daftar perintah."
const CONTROLS = "Tab = autocomplete · ↑/↓ = riwayat · Ctrl+C = batal"

export default function App() {
  const {
    scenario,
    scenarioId,
    state,
    run,
    undo,
    reset,
    canUndo,
    checklist,
    progress,
    hasNext,
    next,
  } = useGitSim()

  const termRef = useRef<HTMLDivElement>(null)
  const term = useRef<Terminal | null>(null)
  const fit = useRef<FitAddon | null>(null)
  // refs keep latest closures for the terminal data handler (created once)
  const inputRef = useRef("")
  const runRef = useRef(run)
  runRef.current = run
  const stateRef = useRef(state)
  stateRef.current = state
  const historyRef = useRef<string[]>([])
  const histIdxRef = useRef(0)
  const firstScenario = useRef(scenarioId)

  const [selected, setSelected] = useState<string | null>(null)

  // ponytail: client-side gate backed by real API sessions; progress itself stays local
  const [authed, setAuthed] = useState(false)
  const [account, setAccount] = useState(() => localStorage.getItem("pahamgit:username") ?? "")
  const [sessionChecking, setSessionChecking] = useState(() => Boolean(localStorage.getItem("pahamgit:token")))
  const [loginOpen, setLoginOpen] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [identifier, setIdentifier] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [authBusy, setAuthBusy] = useState(false)

  // drop stale sessions on load instead of trusting localStorage blindly
  useEffect(() => {
    const stored = localStorage.getItem("pahamgit:token")
    if (!stored) return
    let active = true
    me(stored)
      .then((u) => {
        if (!active) return
        setAuthed(true)
        setAccount(u.username)
        localStorage.setItem("pahamgit:username", u.username)
      })
      .catch(() => {
        if (!active) return
        localStorage.removeItem("pahamgit:token")
        localStorage.removeItem("pahamgit:username")
        setAuthed(false)
        setAccount("")
      })
      .finally(() => {
        if (active) setSessionChecking(false)
      })
    return () => {
      active = false
    }
  }, [])

  // init terminal once
  useEffect(() => {
    const el = termRef.current
    if (!el) return
    const x = new Terminal({
      theme: { background: "#0b1220", foreground: "#e2e8f0" },
      cursorBlink: true,
      fontFamily: "JetBrains Mono, Fira Code, Consolas, monospace",
      fontSize: 13,
      scrollback: 1000,
      // engine output uses "\n" only: without this every new line keeps the previous column
      convertEol: true,
    })
    const f = new FitAddon()
    x.loadAddon(f)
    x.open(el)
    f.fit()
    term.current = x
    fit.current = f

    const prompt = () => x.write(PROMPT)
    const rewrite = (value: string) => {
      x.write(`\r\x1b[K${PROMPT}${value}`)
      inputRef.current = value
    }

    x.writeln(INTRO)
    x.writeln(CONTROLS + "\n")
    prompt()

    const handle = x.onData((data: string) => {
      if (data === "\r") {
        const cmd = inputRef.current.trim()
        x.writeln("")
        if (cmd === "clear" || cmd === "cls") {
          x.clear()
        } else if (cmd) {
          const res = runRef.current(cmd)
          if (res.output) x.writeln(res.output)
          historyRef.current.push(cmd)
        }
        histIdxRef.current = historyRef.current.length
        inputRef.current = ""
        prompt()
        return
      }
      if (data === "\t") {
        const suggestion = complete(inputRef.current, Object.keys(stateRef.current.branches))
        if (suggestion) {
          const space = inputRef.current.lastIndexOf(" ")
          const prefix = space >= 0 ? inputRef.current.slice(0, space + 1) : ""
          rewrite(prefix + suggestion)
        }
        return
      }
      if (data === "\x1b[A") {
        const h = historyRef.current
        if (!h.length) return
        histIdxRef.current = Math.max(0, histIdxRef.current - 1)
        rewrite(h[histIdxRef.current])
        return
      }
      if (data === "\x1b[B") {
        const h = historyRef.current
        if (!h.length) return
        histIdxRef.current = Math.min(h.length, histIdxRef.current + 1)
        rewrite(histIdxRef.current === h.length ? "" : h[histIdxRef.current])
        return
      }
      if (data === "\u007F") {
        if (inputRef.current.length) {
          inputRef.current = inputRef.current.slice(0, -1)
          x.write("\b \b")
        }
        return
      }
      if (data === "\u0003") {
        x.writeln("^C")
        inputRef.current = ""
        prompt()
        return
      }
      if (data === "\u000C") {
        x.clear()
        prompt()
        return
      }
      inputRef.current += data
      x.write(data)
    })

    const ro = new ResizeObserver(() => {
      try {
        f.fit()
      } catch {
        /* container hidden */
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      handle.dispose()
      if (term.current) term.current.dispose()
    }
  }, [])

  // on scenario (roadmap) change, print intro without clearing previous output
  useEffect(() => {
    if (firstScenario.current === scenarioId) {
      return
    }
    firstScenario.current = scenarioId
    const t = term.current
    if (!t) return
    // clear old session, keep the intro visible after reset
    t.clear()
    t.writeln(INTRO)
    t.writeln(CONTROLS + "\n")
    t.write(PROMPT)
    inputRef.current = ""
    historyRef.current = []
    histIdxRef.current = 0
  }, [scenarioId])

  // reset transient UI when scenario changes
  useEffect(() => {
    setSelected(null)
  }, [scenarioId])

  const execExternal = (cmd: string) => {
    const t = term.current
    if (!t) return
    t.writeln(`${PROMPT}${cmd}`)
    const res = run(cmd)
    if (res.output) t.writeln(res.output)
    t.write(PROMPT)
    inputRef.current = ""
  }

  const handleCheckout = (id: string) => {
    execExternal(`git checkout ${id}`)
    setSelected(null)
  }

  const handleHint = () => {
    const t = term.current
    if (!t) return
    // hints follow the checklist order: one hint per step
    const step = Math.min(progress.done, scenario.hints.length - 1)
    t.writeln(`\x1b[33mHint ${step + 1}/${scenario.hints.length}:\x1b[0m ${scenario.hints[step]}`)
    t.write(PROMPT)
  }

  const handleShowAnswer = () => {
    const t = term.current
    if (!t) return
    t.writeln("\x1b[33mSuggested solution:\x1b[0m")
    for (const c of scenario.answer) t.writeln(`  \x1b[36m$ ${c}\x1b[0m`)
    t.write(PROMPT)
  }

  const handleReset = () => {
    reset()
    setSelected(null)
  }

  const handleNext = () => {
    if (sessionChecking) return
    if (!authed) {
      setAuthMode("login")
      setAuthError("")
      setLoginOpen(true)
      return
    }
    next()
  }

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault()
    setAuthBusy(true)
    setAuthError("")
    try {
      const res =
        authMode === "register"
          ? await register(username.trim(), email.trim(), password)
          : await login(identifier.trim(), password)
      localStorage.setItem("pahamgit:token", res.token)
      localStorage.setItem("pahamgit:username", res.user.username)
      setAccount(res.user.username)
      setAuthed(true)
      setSessionChecking(false)
      setLoginOpen(false)
      setUsername("")
      setIdentifier("")
      setEmail("")
      setPassword("")
      next()
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Gagal masuk")
    } finally {
      setAuthBusy(false)
    }
  }

  const handleLogout = () => {
    const stored = localStorage.getItem("pahamgit:token")
    localStorage.removeItem("pahamgit:token")
    localStorage.removeItem("pahamgit:username")
    setAuthed(false)
    setAccount("")
    if (stored) void logout(stored)
  }

  const branchLabel =
    state.head.type === "branch" ? state.head.name : `detached @ ${state.head.commit}`

  return (
    <div className="flex h-screen flex-col">
      <TopBar
        scenarioId={scenarioId}
        title={scenario.title}
        done={progress.done}
        total={progress.total}
        authed={authed}
        username={account}
        onAuthClick={() => setLoginOpen(true)}
        onLogout={handleLogout}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative min-w-0 flex-1 border-r border-[#1e293b]">
          <ReactFlowProvider>
            <GraphPanel
              state={state}
              scenarioId={scenarioId}
              onSelectCommit={setSelected}
              onHint={handleHint}
              onShowAnswer={handleShowAnswer}
              canUndo={canUndo}
              onUndo={undo}
              onReset={handleReset}
            />
          </ReactFlowProvider>
          {selected && state.commits[selected] && (
            <CommitDrawer
              commit={state.commits[selected]}
              state={state}
              onClose={() => setSelected(null)}
              onCheckout={handleCheckout}
            />
          )}
        </div>

        <div className="flex w-[430px] flex-col bg-[#0b1220]">
          <div className="border-b border-[#1e293b] p-3">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wide text-slate-200">
                TASK · LANGKAH {Math.min(progress.done + 1, progress.total)}/{progress.total}
              </h3>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">
                {scenario.difficulty}
              </span>
            </div>
            <ul className="mb-3 space-y-1 text-xs leading-relaxed text-slate-400">
              {scenario.instructions.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            <ul className="space-y-1 text-xs">
              {checklist.map((c, i) => {
                const active = checklist.findIndex((x) => !x.done)
                const locked = !c.done && i > active
                return (
                  <li
                    key={c.id}
                    className={"flex items-start gap-2" + (locked ? " opacity-40" : "")}
                    title={locked ? "Selesaikan langkah sebelumnya dulu" : undefined}
                  >
                    <span
                      className={
                        c.done
                          ? "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-emerald-400 bg-emerald-400/15 text-[10px] text-emerald-300"
                          : i === active
                            ? "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-cyan-400 text-[10px] text-cyan-300"
                            : "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-dashed border-[#334155] text-[10px] text-slate-500"
                      }
                    >
                      {c.done ? "✓" : i + 1}
                    </span>
                    <span
                      className={
                        c.done
                          ? "text-slate-500 line-through"
                          : locked
                            ? "text-slate-500"
                            : "text-slate-200"
                      }
                    >
                      {c.label}
                    </span>
                  </li>
                )
              })}
            </ul>
            {hasNext && progress.done === progress.total && (
              <button
                onClick={handleNext}
                disabled={sessionChecking}
                className="mt-3 w-full rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sessionChecking
                  ? "Memeriksa sesi..."
                  : authed
                    ? "Lanjut ke task berikutnya →"
                    : "Login & lanjut ke task berikutnya →"}
              </button>
            )}
            {!hasNext && progress.done === progress.total && (
              <p className="mt-3 text-xs text-emerald-300">✓ Roadmap selesai</p>
            )}
          </div>

          <div className="flex items-center justify-between border-b border-[#1e293b] px-3 py-1.5 text-[11px] text-slate-500">
            <span>TERMINAL</span>
            <span className="font-mono text-slate-400">
              <span className="text-emerald-400">●</span> {branchLabel}
            </span>
          </div>
          <div ref={termRef} className="min-h-0 flex-1" />
        </div>
      </div>

      {loginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <form
            onSubmit={handleAuth}
            className="w-full max-w-sm rounded-lg border border-[#1e293b] bg-[#0b1220] p-4 shadow-xl"
          >
            <h2 className="text-sm font-semibold text-slate-100">
              {authMode === "login" ? "Masuk untuk lanjut" : "Daftar untuk lanjut"}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Task pertama bisa dicoba tanpa login. {authMode === "login" ? "Masuk" : "Daftar"} dulu untuk membuka task kedua
              dan seterusnya.
            </p>
            {authMode === "register" && (
              <input
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                autoComplete="username"
                className="mt-3 w-full rounded-md border border-[#334155] bg-[#0f172a] px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400"
              />
            )}
            {authMode === "register" && (
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                className="mt-2 w-full rounded-md border border-[#334155] bg-[#0f172a] px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400"
              />
            )}
            <input
              autoFocus={authMode === "login"}
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Email atau username"
              autoComplete="username"
              className="mt-3 w-full rounded-md border border-[#334155] bg-[#0f172a] px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400"
            />
            <input
              type="password"
              required
              minLength={authMode === "register" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={authMode === "register" ? "Password (min. 8 karakter)" : "Password"}
              autoComplete={authMode === "register" ? "new-password" : "current-password"}
              className="mt-2 w-full rounded-md border border-[#334155] bg-[#0f172a] px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400"
            />
            {authError && <p className="mt-2 text-xs text-rose-400">{authError}</p>}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={authBusy}
                onClick={() => {
                  setLoginOpen(false)
                  setPassword("")
                  setAuthError("")
                }}
                className="flex-1 rounded-md border border-[#334155] px-3 py-1.5 text-xs text-slate-400 hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={
                  authBusy ||
                  (authMode === "register" ? !email.trim() : !identifier.trim()) ||
                  !password ||
                  (authMode === "register" && (username.trim().length < 2 || username.trim().length > 50))
                }
                className="flex-1 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {authBusy ? "Memproses..." : authMode === "login" ? "Masuk" : "Daftar"}
              </button>
            </div>
            <button
              type="button"
              disabled={authBusy}
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login")
                setAuthError("")
              }}
              className="mt-3 w-full text-center text-[11px] text-slate-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {authMode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

