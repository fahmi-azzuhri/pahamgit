import type { Commit, RepoState } from "../sim/types"

interface CommitDrawerProps {
  commit: Commit
  state: RepoState
  onClose: () => void
  onCheckout: (id: string) => void
}

export function CommitDrawer({
  commit,
  state,
  onClose,
  onCheckout,
}: CommitDrawerProps) {
  const branchRefs = Object.entries(state.branches)
    .filter(([, id]) => id === commit.id)
    .map(([name]) => (state.head.type === "branch" && state.head.name === name ? `HEAD → ${name}` : name))
  const tagRefs = Object.entries(state.tags)
    .filter(([, id]) => id === commit.id)
    .map(([name]) => `tag: ${name}`)

  return (
    <div className="absolute inset-4 z-10 flex flex-col rounded-lg border border-[#243044] bg-[#0b1220]/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-[#1e293b] px-3 py-2">
        <span className="text-xs font-medium text-slate-200">Commit detail</span>
        <button
          onClick={onClose}
          className="rounded px-2 text-sm text-slate-400 hover:bg-[#1e293b] hover:text-slate-100"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-auto p-3 text-xs">
        <div>
          <div className="text-slate-500">Hash</div>
          <div className="font-mono text-amber-300">{commit.id}</div>
        </div>
        <div>
          <div className="text-slate-500">Message</div>
          <div className="text-slate-100">{commit.message}</div>
        </div>
        <div>
          <div className="text-slate-500">Author</div>
          <div className="text-slate-300">{commit.author}</div>
        </div>
        <div>
          <div className="text-slate-500">Date</div>
          <div className="text-slate-300">{new Date(commit.time).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-slate-500">Parent{commit.parents.length > 1 ? "s" : ""}</div>
          {commit.parents.length === 0 ? (
            <div className="text-slate-500">— (root commit)</div>
          ) : (
            commit.parents.map((p) => (
              <div key={p} className="font-mono text-cyan-300">
                {p}
              </div>
            ))
          )}
        </div>
        {(branchRefs.length > 0 || tagRefs.length > 0) && (
          <div>
            <div className="text-slate-500">Refs</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {branchRefs.map((r) => (
                <span key={r} className="rounded-full border border-emerald-400/60 px-2 py-0.5 text-emerald-300">
                  {r}
                </span>
              ))}
              {tagRefs.map((r) => (
                <span key={r} className="rounded-full border border-amber-400/60 px-2 py-0.5 text-amber-300">
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[#1e293b] p-2">
        <button
          onClick={() => onCheckout(commit.id)}
          className="w-full rounded bg-cyan-500/15 px-2 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/25"
        >
          Checkout this commit (detached HEAD)
        </button>
      </div>
    </div>
  )
}