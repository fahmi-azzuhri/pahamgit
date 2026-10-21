import { SCENARIOS } from "../sim/scenarios"

interface TopBarProps {
  scenarioId: string
  onScenarioChange: (id: string) => void
  done: number
  total: number
}

export function TopBar({ scenarioId, onScenarioChange, done, total }: TopBarProps) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <header className="flex items-center gap-4 border-b border-[#1e293b] bg-[#0b1220] px-4 py-2.5">
      <div className="flex items-center gap-2">
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

      <div className="mx-2 h-5 w-px bg-[#1e293b]" />

      <label className="flex items-center gap-2 text-xs text-slate-400">
        <span>Scenario</span>
        <select
          value={scenarioId}
          onChange={(e) => onScenarioChange(e.target.value)}
          className="rounded-md border border-[#243044] bg-[#0f172a] px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-400"
        >
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} · {s.difficulty}
            </option>
          ))}
        </select>
      </label>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Progress</span>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-[#1e293b]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-mono text-slate-300">
            {done}/{total}
          </span>
        </div>
      </div>
    </header>
  )
}