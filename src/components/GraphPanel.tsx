import { useEffect, useMemo } from "react"
import { Background, BackgroundVariant, ReactFlow, useReactFlow } from "@xyflow/react"
import type { RepoState } from "../sim/types"
import { buildGraph } from "../lib/graph"
import { CommitNode } from "./CommitNode"

const nodeTypes = { commit: CommitNode }

interface GraphPanelProps {
  state: RepoState
  scenarioId: string
  onSelectCommit: (id: string) => void
}

export function GraphPanel({ state, scenarioId, onSelectCommit }: GraphPanelProps) {
  const { nodes, edges } = useMemo(() => buildGraph(state), [state])
  const { fitView } = useReactFlow()

  useEffect(() => {
    // refit when scenario resets / changes
    const t = setTimeout(() => fitView({ padding: 0.25, duration: 400 }), 80)
    return () => clearTimeout(t)
  }, [scenarioId, fitView])

  return (
    <div className="dot-grid h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, n) => onSelectCommit(n.id)}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.3}
        maxZoom={2.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
      </ReactFlow>
    </div>
  )
}