interface BottomToolbarProps {
  canUndo: boolean;
  onUndo: () => void;
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function BottomToolbar({
  canUndo,
  onUndo,
  onReset,
  onZoomIn,
  onZoomOut,
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
        <button
          onClick={onReset}
          className="rounded px-2 py-0.5 hover:bg-[#1e293b]"
        >
          Reset
        </button>
        <a
          href="https://github.com/fahmi-azzuhri/pahamgit"
          target="_blank"
          rel="noopener noreferrer"
          title="Give it a star on GitHub"
          className="flex items-center gap-1 rounded px-2 py-0.5 text-slate-400 hover:bg-[#1e293b] hover:text-slate-100"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.06 11.06 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.7 5.38-5.27 5.67.41.36.78 1.05.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .3.2.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
          </svg>
          <span>Give it a star</span>
        </a>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onZoomOut}
          className="rounded px-2 py-0.5 hover:bg-[#1e293b]"
        >
          –
        </button>
        <button
          onClick={onZoomIn}
          className="rounded px-2 py-0.5 hover:bg-[#1e293b]"
        >
          +
        </button>
      </div>
    </div>
  );
}
