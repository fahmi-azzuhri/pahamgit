import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { useProgress } from "./hooks/useProgress"
import { setCurrentScenario } from "./lib/progress"
import "@xterm/xterm/css/xterm.css"
import { lazy, Suspense } from "react"

import { TopBar } from "./components/TopBar"
import { GraphPanelLazy } from "./components/GraphPanelLazy"
import { CommitDrawer } from "./components/CommitDrawer"
import { useGitSim } from "./hooks/useGitSim"
import { complete } from "./sim/parser"
import { login, logout, me, register } from "./lib/auth"
import { HintPanel } from "./components/HintPanel"
import { getScenario, ROADMAP_ORDER, taskLockReason } from "./sim/scenarios"
import { useLang } from "./lib/lang"
import { currentLang, dict, levelLabel, scenarioCopy, scenarioLabel } from "./lib/i18n"
import type { RepoState } from "./sim/types"

const LazyReactFlowProvider = lazy(() => import("@xyflow/react").then(m => ({ default: m.ReactFlowProvider })))
const loadXterm = () =>
  Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")]) as Promise<
    [{ Terminal: typeof import("@xterm/xterm").Terminal }, { FitAddon: typeof import("@xterm/addon-fit").FitAddon }]
  >

const PROMPT = "\x1b[32muser@git-sim\x1b[0m:\x1b[36m~\x1b[0m$ "

export default function App() {
  const { lang, t } = useLang()
  const token = () => localStorage.getItem("pahamgit:token") ?? ""
  const { entries: progressEntries, upsert, loaded: progressLoaded, currentScenarioId } = useProgress(token())
  const onScenarioSwitch = useCallback(
    (sid: string) => setCurrentScenario(token(), sid),
    [],
  )
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
  } = useGitSim(progressEntries, upsert, progressLoaded, currentScenarioId, onScenarioSwitch)
  const completedTaskIds = useMemo(() => {
    return ROADMAP_ORDER.filter((id) => {
      const task = getScenario(id)
      const entry = progressEntries.find((item) => item.scenario_id === id)
      if (!entry) return false
      if (task.checklist.every((item) => entry.steps_done.includes(item.id))) return true
      if (!entry.repo_state) return false
      try {
        const savedState = JSON.parse(entry.repo_state) as RepoState
        return task.checklist.every((item) => item.done(savedState))
      } catch (error) {
        console.error(`Gagal membaca progres skenario "${id}":`, error)
        return false
      }
    })
  }, [progressEntries])
  const nextLockReason = useMemo(() => {
    const idx = ROADMAP_ORDER.indexOf(scenarioId)
    const nextId = ROADMAP_ORDER[idx + 1]
    return nextId ? taskLockReason(nextId, completedTaskIds, lang) : null
  }, [scenarioId, completedTaskIds, lang])
  const highestAchievedLevel = useMemo(() => {
    const levelRank = { Beginner: 1, Intermediate: 2, Advanced: 3 }
    return completedTaskIds.reduce<"Beginner" | "Intermediate" | "Advanced" | null>((highest, id) => {
      const level = getScenario(id).difficulty
      return !highest || levelRank[level] > levelRank[highest] ? level : highest
    }, null)
  }, [completedTaskIds])

  const termRef = useRef<HTMLDivElement>(null)
  const term = useRef<InstanceType<typeof import("@xterm/xterm").Terminal> | null>(null)
  const fit = useRef<InstanceType<typeof import("@xterm/addon-fit").FitAddon> | null>(null)
  // refs keep latest closures for the terminal data handler (created once)
  const inputRef = useRef("")
  const runRef = useRef(run)
  runRef.current = run
  const stateRef = useRef(state)
  stateRef.current = state
  const historyRef = useRef<string[]>([])
  const histIdxRef = useRef(0)
  const firstScenario = useRef(scenarioId)

  // first-run welcome overlay: once per browser, flag in localStorage
  const WELCOME_KEY = "pahamgit:welcome"
  const [welcomeOpen, setWelcomeOpen] = useState(
    () => !localStorage.getItem(WELCOME_KEY),
  )
  const welcomeExamples = ["help", "git status", "git log --oneline"]
  const closeWelcome = () => {
    localStorage.setItem(WELCOME_KEY, "1")
    setWelcomeOpen(false)
  }
  const runWelcomeExample = (cmd: string) => {
    closeWelcome()
    execExternal(cmd)
  }

  const [selected, setSelected] = useState<string | null>(null)

  // ponytail: client-side gate backed by real API sessions; progress itself stays local
  const [authed, setAuthed] = useState(false)
  const [account, setAccount] = useState(() => localStorage.getItem("pahamgit:username") ?? "")
  const [sessionChecking, setSessionChecking] = useState(() => Boolean(localStorage.getItem("pahamgit:token")))
  const [loginOpen, setLoginOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [identifier, setIdentifier] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [authBusy, setAuthBusy] = useState(false)
  const [taskSwitchError, setTaskSwitchError] = useState("")
  const [switchingTask, setSwitchingTask] = useState(false)

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

  // init terminal once (xterm is loaded lazily to shrink the initial bundle)
  useEffect(() => {
    const el = termRef.current
    if (!el) return
    let disposed = false
    let handle: { dispose: () => void } | null = null
    let ro: ResizeObserver | null = null

    loadXterm().then(([{ Terminal }, { FitAddon }]) => {
      if (disposed) return
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

      x.writeln(dict[currentLang()].intro)
      x.writeln(dict[currentLang()].controls + "\n")
      prompt()

      const onData = (data: string) => {
      if (data === "\r") {
        const cmd = inputRef.current.trim()
        x.writeln("")
        if (cmd === "clear" || cmd === "cls") {
          x.clear()
        } else if (cmd) {
          const res = runRef.current(cmd)
          if (res.output) x.writeln(res.ok ? res.output : `\x1b[31m${res.output.split("\n")[0]}\x1b[0m${res.output.includes("\n") ? "\n\x1b[36m" + res.output.split("\n").slice(1).join("\n") + "\x1b[0m" : ""}`)
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
      }

      handle = x.onData(onData)

      ro = new ResizeObserver(() => {
        try {
          f.fit()
        } catch {
          /* container hidden */
        }
      })
      ro.observe(el)
    })

    return () => {
      disposed = true
      ro?.disconnect()
      handle?.dispose()
      if (term.current) term.current.dispose()
    }
  }, [])

  // on scenario (roadmap) change, print intro without clearing previous output
  useEffect(() => {
    if (firstScenario.current === scenarioId) {
      return
    }
    firstScenario.current = scenarioId
    const xterm = term.current
    if (!xterm) return
    // clear old session, keep the intro visible after reset
    xterm.clear()
    xterm.writeln(dict[lang].intro)
    xterm.writeln(dict[lang].controls + "\n")
    xterm.write(PROMPT)
    inputRef.current = ""
    historyRef.current = []
    histIdxRef.current = 0
  }, [scenarioId, lang])

  // reset transient UI when scenario changes
  useEffect(() => {
    setSelected(null)
  }, [scenarioId])

  const execExternal = (cmd: string) => {
    const xterm = term.current
    if (!xterm) return
    xterm.writeln(`${PROMPT}${cmd}`)
    const res = run(cmd)
    if (res.output) xterm.writeln(res.ok ? res.output : `\x1b[31m${res.output.split("\n")[0]}\x1b[0m${res.output.includes("\n") ? "\n\x1b[36m" + res.output.split("\n").slice(1).join("\n") + "\x1b[0m" : ""}`)
    xterm.write(PROMPT)
    inputRef.current = ""
  }

  const handleCheckout = (id: string) => {
    execExternal(`git checkout ${id}`)
    setSelected(null)
  }

  const handleReset = () => {
    reset()
    setSelected(null)
  }

  const handleNext = async () => {
    if (sessionChecking || switchingTask) return
    if (!authed) {
      setAuthMode("login")
      setAuthError("")
      setLoginOpen(true)
      return
    }
    setSwitchingTask(true)
    setTaskSwitchError("")
    try {
      await next()
    } catch (error) {
      console.error("Gagal menyimpan posisi task:", error)
      setTaskSwitchError(t.saveFailed)
    } finally {
      setSwitchingTask(false)
    }
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
      setAuthError(err instanceof Error ? err.message : t.loginFailed)
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

  const copy = useMemo(() => scenarioCopy(scenarioId, lang), [scenarioId, lang])
  const title = copy?.title ?? scenario.title
  const instructions = copy?.instructions ?? scenario.instructions
  const steps = useMemo(
    () => checklist.map((c) => ({ ...c, label: scenarioLabel(scenarioId, c.id, c.label, lang) })),
    [checklist, scenarioId, lang],
  )

  const branchLabel =
    state.head.type === "branch" ? state.head.name : `detached @ ${state.head.commit}`

  return (
    <div className="flex h-screen flex-col">
      <TopBar
        scenarioId={scenarioId}
        title={title}
        done={progress.done}
        total={progress.total}
        authed={authed}
        username={account}
        onAuthClick={() => setLoginOpen(true)}
        onLogout={handleLogout}
        onProfileClick={() => setProfileOpen(true)}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative min-w-0 flex-1 border-r border-[#1e293b]">
          <Suspense fallback={null}>
            <LazyReactFlowProvider>
              <GraphPanelLazy
                state={state}
                scenarioId={scenarioId}
                onSelectCommit={setSelected}
                canUndo={canUndo}
                onUndo={undo}
                onReset={handleReset}
              />
            </LazyReactFlowProvider>
          </Suspense>
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
                {t.stepHeader} {Math.min(progress.done + 1, progress.total)}/{progress.total}
              </h3>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">
                {levelLabel(scenario.difficulty, lang)}
              </span>
            </div>
            <ul className="mb-3 space-y-1 text-xs leading-relaxed text-slate-400">
              {instructions.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            <HintPanel
              checklist={steps}
              activeStep={steps.findIndex((c) => !c.done)}
            />
            <ul className="space-y-1 text-xs">
              {steps.map((c, i) => {
                const active = steps.findIndex((x) => !x.done)
                const locked = !c.done && i > active
                return (
                  <li
                    key={c.id}
                    className={"flex items-start gap-2" + (locked ? " opacity-40" : "")}
                    title={locked ? t.stepLocked : undefined}
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
            {hasNext && progress.done === progress.total && nextLockReason && (
              <p className="mt-3 rounded-md border border-amber-400/30 bg-amber-400/5 px-2 py-1.5 text-[11px] leading-relaxed text-amber-300">
                🔒 {t.taskLocked} — {nextLockReason}
              </p>
            )}
            {hasNext && progress.done === progress.total && !nextLockReason && (
              <button
                onClick={handleNext}
                disabled={sessionChecking || switchingTask}
                className="mt-3 w-full rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sessionChecking
                  ? t.checkingSession
                  : switchingTask
                    ? t.savingPos
                  : authed
                    ? t.nextTask
                    : t.loginNext}
              </button>
            )}
            {taskSwitchError && <p className="mt-2 text-xs text-rose-400">{taskSwitchError}</p>}
            {!hasNext && progress.done === progress.total && (
              <p className="mt-3 text-xs text-emerald-300">{t.roadmapDone}</p>
            )}
          </div>

          <div className="flex items-center justify-between border-b border-[#1e293b] px-3 py-1.5 text-[11px] text-slate-500">
            <span>{t.terminalLabel}</span>
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
              {authMode === "login" ? t.authTitleLogin : t.authTitleRegister}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {authMode === "login" ? t.enter : t.signUp} {t.authLead}
            </p>
            {authMode === "register" && (
              <input
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.username}
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
                placeholder={t.email}
                autoComplete="email"
                className="mt-2 w-full rounded-md border border-[#334155] bg-[#0f172a] px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400"
              />
            )}
            {authMode === "login" && (
              <input
                autoFocus
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t.identifier}
                autoComplete="username"
                className="mt-3 w-full rounded-md border border-[#334155] bg-[#0f172a] px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400"
              />
            )}
            <input
              type="password"
              required
              minLength={authMode === "register" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={authMode === "register" ? t.passwordMin : t.password}
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
                {t.cancel}
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
                {authBusy ? t.processing : authMode === "login" ? t.enter : t.signUp}
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
              {authMode === "login" ? t.noAccount : t.hasAccount}
            </button>
          </form>
        </div>
      )}
      {profileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          onClick={() => setProfileOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg border border-[#1e293b] bg-[#0b1220] p-4 shadow-xl"
          >
            <h2 className="text-sm font-semibold text-slate-100">{t.profileTitle}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{t.profileLead}</p>
            <dl className="mt-3 space-y-2 font-mono text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">username</dt>
                <dd className="truncate text-cyan-300">{account}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{t.progressLabel}</dt>
                <dd className="text-slate-300">{completedTaskIds.length}/{ROADMAP_ORDER.length} {t.task}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{t.lastLevel}</dt>
                <dd className="text-slate-300">
                  {highestAchievedLevel ? levelLabel(highestAchievedLevel, lang) : t.noLevel}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setProfileOpen(false)}
              className="mt-4 w-full rounded-md border border-[#334155] px-3 py-1.5 text-xs text-slate-300 hover:bg-[#1e293b]"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
      {welcomeOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4"
          onClick={closeWelcome}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg border border-[#1e293b] bg-[#0b1220] p-5 shadow-xl"
          >
            <h2 className="text-sm font-semibold text-slate-100">
              {t.welcomeTitle}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {t.welcomeBody}
            </p>
            <div className="mt-3 space-y-1.5">
              {welcomeExamples.map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => runWelcomeExample(cmd)}
                  className="block w-full rounded-md border border-[#334155] bg-[#0f172a] px-3 py-2 text-left font-mono text-xs text-cyan-300 hover:border-emerald-400/50 hover:bg-[#1e293b]"
                >
                  <span className="text-slate-500">$ </span>
                  {cmd}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={closeWelcome}
              className="mt-4 w-full rounded-md border border-[#334155] px-3 py-1.5 text-xs text-slate-300 hover:bg-[#1e293b]"
            >
              {t.startAlone}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
