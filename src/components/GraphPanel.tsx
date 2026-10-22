import { useEffect, useMemo } from "react"
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react"
import type { RepoState } from "../sim/types"
import { buildGraph } from "../lib/graph"
import { CommitNode } from "./CommitNode"
import { BottomToolbar } from "./BottomToolbar"

const nodeTypes = { commit: CommitNode }

interface GraphPanelProps {
  state: RepoState
  scenarioId: string
  onSelectCommit: (id: string) => void
  onHint: () => void
  onShowAnswer: () => void
  canUndo: boolean
  onUndo: () => void
  onReset: () => void
}

export function GraphPanel({
  state,
  scenarioId,
  onSelectCommit,
  onHint,
  onShowAnswer,
  canUndo,
  onUndo,
  onReset,
}: GraphPanelProps) {
  const { nodes, edges } = useMemo(() => buildGraph(state), [state])
  const { fitView, zoomIn, zoomOut } = useReactFlow()

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.25, duration: 400 }), 80)
    return () => clearTimeout(t)
  }, [scenarioId, fitView])

  return (
    <div className="flex h-full flex-col">
      <div className="dot-grid min-h-0 flex-1">
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
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
        </ReactFlow>
      </div>
      <BottomToolbar
        canUndo={canUndo}
        onUndo={onUndo}
        onReset={onReset}
        onHint={onHint}
        onZoomIn={() => zoomIn({ duration: 200 })}
        onZoomOut={() => zoomOut({ duration: 200 })}
        onShowAnswer={onShowAnswer}
      />
    </div>
  )
}