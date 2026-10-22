import { ROADMAP_ORDER, SCENARIOS } from "../sim/scenarios"

interface TopBarProps {
  scenarioId: string
  done: number
  total: number
}

export function TopBar({ scenarioId, done, total }: TopBarProps) {
  const journey = ROADMAP_ORDER.indexOf(scenarioId) + 1
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

      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="shrink-0 text-xs text-slate-400">
          Roadmap <span className="font-mono text-slate-200">{journey}/{ROADMAP_ORDER.length}</span>
        </span>
        <ol className="flex items-center gap-1">
          {ROADMAP_ORDER.map((id, i) => {
            const s = SCENARIOS.find((x) => x.id === id)
            if (!s) return null
            const done = i < journey - 1
            const active = i === journey - 1
            return (
              <li
                key={s.id}
                title={s.title}
                className={
                  "hidden shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] lg:flex " +
                  (active
                    ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
                    : done
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                      : "border-[#243044] text-slate-500")
                }
              >
                <span className="font-mono">{done ? "✓" : i + 1}</span>
                <span className="max-w-24 truncate">{s.title}</span>
              </li>
            )
          })}
        </ol>
      </div>

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