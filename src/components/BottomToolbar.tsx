interface BottomToolbarProps {
  canUndo: boolean
  onUndo: () => void
  onReset: () => void
  onHint: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onShowAnswer: () => void
}

export function BottomToolbar({
  canUndo,
  onUndo,
  onReset,
  onHint,
  onZoomIn,
  onZoomOut,
  onShowAnswer,
}: BottomToolbarProps) {
  return (
    <div className="flex items-center justify-between border-t border-[#1e293b] bg-[#0b1220] p-2 text-xs text-slate-400">
      <div className="flex gap-2">
        <button
          disabled={!canUndo}
          onClick={onUndo}
          className="rounded px-2 py-0.5 hover:bg-[#1e293b] disabled:opacity-50"
        >
          Undo
        </button>
        <button onClick={onReset} className="rounded px-2 py-0.5 hover:bg-[#1e293b]">
          Reset
        </button>
        <button onClick={onHint} className="rounded px-2 py-0.5 hover:bg-[#1e293b]">
          Hint
        </button>
        <button onClick={onShowAnswer} className="rounded px-2 py-0.5 hover:bg-[#1e293b]">
          Answer
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={onZoomOut} className="rounded px-2 py-0.5 hover:bg-[#1e293b]">
          –
        </button>
        <button onClick={onZoomIn} className="rounded px-2 py-0.5 hover:bg-[#1e293b]">
          +
        </button>
      </div>
    </div>
  )
}
