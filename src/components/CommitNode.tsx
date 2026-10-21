import { Handle, Position } from "@xyflow/react"
import { memo } from "react"
import type { CommitNodeData } from "../lib/graph"

function CommitNodeBase({ data }: { data: CommitNodeData }) {
  const { commit, color, refs, isHead } = data
  return (
    <div className="commit-node" style={{ ["--c" as string]: color }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      {refs.length > 0 && (
        <div className="commit-chips">
          {refs.map((r, i) => (
            <span
              key={i}
              className={`chip ${r.kind === "head" ? "head" : r.kind === "tag" ? "tag" : "branch"}`}
              style={{ ["--c" as string]: r.color }}
            >
              {plainLabel(r.label)}
            </span>
          ))}
        </div>
      )}
      <div className={isHead ? "ring head" : "ring"} />
      <span className="hash">{commit.id}</span>
      <span className="msg">{commit.message}</span>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  )
}

/** strip ANSI codes for label display in the graph chip */
function plainLabel(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "")
}

export const CommitNode = memo(CommitNodeBase)