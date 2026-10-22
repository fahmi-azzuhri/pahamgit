import { ROADMAP_ORDER } from "../sim/scenarios"

interface TopBarProps {
  scenarioId: string
  title: string
  done: number
  total: number
}

export function TopBar({ scenarioId, title, done, total }: TopBarProps) {
  const journey = ROADMAP_ORDER.indexOf(scenarioId) + 1
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <header className="flex items-center gap-4 border-b border-[#1e293b] bg-[#0b1220] px-4 py-2.5">
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-purple-500 text-sm font-bold text-slate-950">
          P
        </div>
        <span className="text-sm font-semibold tracking-wide text-slate-100">
          PahamGit
        </span>
        <span className="hidden text-xs text-slate-500 sm:inline">
          Interactive Git Simulator
        </span>
      </div>

      <div className="mx-2 h-5 w-px shrink-0 bg-[#1e293b]" />

      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-slate-500">
          Task{" "}
          <span className="font-mono text-slate-300">
            {journey}/{ROADMAP_ORDER.length}
          </span>
        </p>
        <p className="truncate text-xs font-medium text-slate-200">{title}</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 text-xs text-slate-400">
        <span className="hidden sm:inline">Progress</span>
        <div className="h-2 w-20 overflow-hidden rounded-full bg-[#1e293b] sm:w-32">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-slate-300">
          {done}/{total}
        </span>
      </div>
    </header>
  )
}