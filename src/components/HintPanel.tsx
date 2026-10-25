import { useState } from "react"
import type { ChecklistState } from "../sim/scenarios"
import { CONCEPTS, type ConceptId } from "../sim/concepts"

interface HintPanelProps {
  hints: string[]
  checklist: ChecklistState[]
  activeStep: number
}

/** Commands in `...` render styled, other text plain. */
function renderHint(text: string) {
  const parts = text.split(/(`[^`]+`)/g)
  return parts.map((p, i) =>
    p.startsWith("`") ? (
      <code key={i} className="rounded bg-[#0f172a] px-1 py-0.5 font-mono text-[11px] text-cyan-300">
        {p.slice(1, -1)}
      </code>
    ) : (
      <span key={i}>{p}</span>
    ),
  )
}

export function HintPanel({ hints, checklist, activeStep }: HintPanelProps) {
  const [open, setOpen] = useState(true)
  const [shownSteps, setShownSteps] = useState<Record<string, number>>({})
  const [concept, setConcept] = useState<ConceptId | null>(null)

  const done = checklist.filter((c) => c.done).length
  const current = Math.min(activeStep, checklist.length - 1)
  const activeItem = checklist[current]
  const revealed = done > 0 ? Math.min(shownSteps[activeItem?.id ?? ""] ?? 0, hints.length) : 0
  const stepHints = revealed > 0 ? hints.slice(0, revealed) : []

  return (
    <div className="border-b border-[#1e293b]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] text-slate-500 hover:bg-[#0f172a]"
      >
        <span className="flex items-center gap-1.5">
          {revealed > 0 && (
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 text-[10px] text-amber-300">
              {revealed} hint
            </span>
          )}
        </span>
        <span>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="space-y-2 px-3 pb-2 text-xs">
          {activeItem && !activeItem.done && (
            <div className="rounded-md border border-[#1e293b] bg-[#0f172a] p-2">
              <p className="mb-1 text-[10px] font-semibold tracking-wide text-slate-500">
                LANGKAH AKTIF · {current + 1}/{checklist.length}
              </p>
              <p className="text-slate-200">{activeItem.label}</p>
              {stepHints.length > 0 && (
                <ul className="mt-1.5 space-y-1 text-slate-400">
                  {stepHints.map((h, i) => (
                    <li key={i} className="leading-relaxed">
                      <span className="mr-1 text-amber-400">{i + 1}.</span>
                      {renderHint(h)}
                    </li>
                  ))}
                </ul>
              )}
              {revealed < hints.length ? (
                <button
                  onClick={() =>
                    setShownSteps((s) => ({
                      ...s,
                      [activeItem.id]: (s[activeItem.id] ?? 0) + 1,
                    }))
                  }
                  className="mt-2 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-300 hover:bg-amber-400/20"
                >
                  Buka hint berikutnya ({revealed}/{hints.length})
                </button>
              ) : (
                <p className="mt-2 text-[11px] text-slate-500">
                  Semua hint untuk langkah ini sudah terbuka — tombol Answer di bawah graph menunjukkan solusi lengkap.
                </p>
              )}
            </div>
          )}
          {activeItem && activeItem.done && (
            <p className="rounded-md border border-emerald-400/30 bg-emerald-400/10 p-2 text-emerald-300">
              ✓ Langkah selesai — lanjut ke langkah berikutnya.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] tracking-wide text-slate-500">PAHAMI KONSEP:</span>
            {CONCEPTS.map((c) => (
              <button
                key={c.id}
                onClick={() => setConcept(concept === c.id ? null : c.id)}
                className={
                  "rounded border px-1.5 py-0.5 text-[10px] transition-colors " +
                  (concept === c.id
                    ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-200"
                    : "border-[#334155] text-slate-400 hover:border-cyan-400/40 hover:text-cyan-300")
                }
              >
                {c.label}
              </button>
            ))}
          </div>
          {concept &&
            CONCEPTS.filter((c) => c.id === concept).map((c) => (
              <div key={c.id} className="rounded-md border border-[#1e293b] bg-[#0f172a] p-2">
                <p className="mb-1 font-semibold text-slate-200">{c.title}</p>
                <p className="leading-relaxed text-slate-400">{renderHint(c.body)}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
