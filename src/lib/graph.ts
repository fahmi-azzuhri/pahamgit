import type { Edge, Node } from "@xyflow/react"
import type { Commit, RepoState } from "../sim/types"
import { refsFor } from "../sim/gitEngine"

export const LANE_COLORS = [
  "#60a5fa", // main / blue
  "#34d399", // feature / emerald
  "#a78bfa", // purple
  "#fbbf24", // amber
  "#fb7185", // rose
  "#22d3ee", // cyan
  "#f472b6", // pink
]

export function laneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length]
}

export interface CommitNodeData extends Record<string, unknown> {
  commit: Commit
  color: string
  refs: ReturnType<typeof refsFor>
  isHead: boolean
}

export function buildGraph(state: RepoState): {
  nodes: Node<CommitNodeData>[]
  edges: Edge[]
} {
  const commits = Object.values(state.commits)
  const nodes: Node<CommitNodeData>[] = commits.map((commit) => {
    const refs = refsFor(state, commit.id)
    const isHead =
      (state.head.type === "branch" &&
        state.branches[state.head.name] === commit.id) ||
      (state.head.type === "detached" && state.head.commit === commit.id)
    return {
      id: commit.id,
      type: "commit",
      position: { x: 60 + commit.order * 150, y: 80 + commit.lane * 110 },
      data: {
        commit,
        color: laneColor(commit.lane),
        refs,
        isHead,
      },
      draggable: false,
    }
  })

  const edges: Edge[] = []
  for (const commit of commits) {
    for (const p of commit.parents) {
      const parent = state.commits[p]
      if (!parent) continue
      edges.push({
        id: `${p}->${commit.id}`,
        source: p,
        target: commit.id,
        type: "smoothstep",
        animated: false,
        style: { stroke: laneColor(commit.lane), strokeWidth: 2 },
      })
    }
  }

  return { nodes, edges }
}