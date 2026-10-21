import { useEffect, useRef } from "react"
import { ReactFlowProvider } from "@xyflow/react"
import { Terminal } from "@xterm/xterm"
import "@xterm/xterm/css/xterm.css"
import { FitAddon } from "@xterm/addon-fit"
import { TopBar } from "./components/TopBar"
import { GraphPanel } from "./components/GraphPanel"
import { useGitSim } from "./hooks/useGitSim"

export default function App() {
  const {
    scenario,
    scenarioId,
    setScenarioId,
    state,
    run,
    undo,
    reset,
    canUndo,
    checklist,
    progress,
  } = useGitSim()

  const termRef = useRef<HTMLDivElement>(null)
  const term = useRef<Terminal | null>(null)
  const fit = useRef<FitAddon | null>(null)
  // refs keep latest closures for the terminal data handler (created once)
  const inputRef = useRef("")
  const runRef = useRef(run)
  runRef.current = run

  // init terminal once
  useEffect(() => {
    if (!termRef.current) return
    const x = new Terminal({
      theme: { background: "#090d16", foreground: "#e2e8f0" },
      cursorBlink: true,
      fontFamily: "JetBrains Mono, Fira Code, Consolas, monospace",
    })
    const f = new FitAddon()
    x.loadAddon(f)
    x.open(termRef.current)
    f.fit()
    term.current = x
    fit.current = f
    // welcome message
    x.writeln("\x1b[33mWelcome to PahamGit simulator\x1b[0m")
    x.write("$ ")
    const handle = x.onData((data: string) => {
      if (data === "\r") {
        const cmd = inputRef.current.trim()
        term.current?.writeln("")
        const res = runRef.current(cmd)
        if (res.output) term.current?.writeln(res.output)
        term.current?.write("$ ")
        inputRef.current = ""
      } else if (data === "\u007F") {
        // backspace
        if (inputRef.current.length) {
          inputRef.current = inputRef.current.slice(0, -1)
          term.current?.write("\b \b")
        }
      } else if (data === "\u0003") {
        // Ctrl+C
        term.current?.writeln("^C")
        term.current?.write("$ ")
        inputRef.current = ""
      } else {
        inputRef.current += data
        term.current?.write(data)
      }
    })
    return () => {
      handle.dispose()
      x.dispose()
    }
  }, [])

  // resize on window change
  useEffect(() => {
    const onResize = () => fit.current?.fit()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const handleCommitClick = (id: string) => {
    const cmd = `git checkout ${id}`
    term.current?.writeln(`\x1b[36m$ ${cmd}\x1b[0m`)
    const res = run(cmd)
    if (res.output) term.current?.writeln(res.output)
    term.current?.write("$ ")
  }

  return (
    <>
      <TopBar
        scenarioId={scenarioId}
        onScenarioChange={setScenarioId}
        done={progress.done}
        total={progress.total}
      />
      <div className="flex h-[calc(100vh-56px)] overflow-hidden">
        <div className="flex-1 overflow-auto border-r border-[#1e293b]">
          <ReactFlowProvider>
            <GraphPanel
              state={state}
              scenarioId={scenarioId}
              onSelectCommit={handleCommitClick}
            />
          </ReactFlowProvider>
        </div>
        <div className="flex w-96 flex-col bg-[#0b1220]">
          <div className="flex items-center justify-between border-b border-[#1e293b] p-2 text-xs text-slate-400">
            <span>Terminal</span>
            <div className="flex gap-2">
              <button
                disabled={!canUndo}
                onClick={undo}
                className="rounded px-2 py-0.5 hover:bg-[#1e293b] disabled:opacity-50"
              >
                Undo
              </button>
              <button onClick={reset} className="rounded px-2 py-0.5 hover:bg-[#1e293b]">
                Reset
              </button>
            </div>
          </div>
          <div ref={termRef} className="flex-1 overflow-auto" />
          <div className="border-t border-[#1e293b] p-2">
            <h3 className="mb-1 text-xs font-medium text-slate-300">Task</h3>
            <ul className="mb-2 list-inside list-disc space-y-0.5 text-xs text-slate-400">
              {scenario.instructions.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            <h3 className="mb-1 text-xs font-medium text-slate-300">Checklist</h3>
            <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-200">
              {checklist.map((c) => (
                <li key={c.id} className={c.done ? "line-through text-slate-500" : ""}>
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}