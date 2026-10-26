import { useEffect, useMemo, useRef, useState } from "react"
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

export interface GraphPanelProps {
  state: RepoState
  scenarioId: string
  onSelectCommit: (id: string) => void
  canUndo: boolean
  onUndo: () => void
  onReset: () => void
}

export function GraphPanel({
  state,
  scenarioId,
  onSelectCommit,
  canUndo,
  onUndo,
  onReset,
}: GraphPanelProps) {
  const { nodes, edges } = useMemo(() => buildGraph(state), [state])
  const { fitView, zoomIn, zoomOut } = useReactFlow()
  // React Flow needs a measured parent (width + height) before it renders.
  // Render only once the container reports a real size, or it logs error #004.
  const paneRef = useRef<HTMLDivElement>(null)
  const [paneReady, setPaneReady] = useState(false)

  useEffect(() => {
    const el = paneRef.current
    if (!el) return
    const check = () => setPaneReady(el.clientWidth > 0 && el.clientHeight > 0)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.25, duration: 400 }), 80)
    return () => clearTimeout(t)
  }, [scenarioId, fitView])

  return (
    <div className="flex h-full flex-col">
      <div ref={paneRef} className="dot-grid min-h-0 flex-1">
        {paneReady && (
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
        )}
      </div>
      <BottomToolbar
        canUndo={canUndo}
        onUndo={onUndo}
        onReset={onReset}
        onZoomIn={() => zoomIn({ duration: 200 })}
        onZoomOut={() => zoomOut({ duration: 200 })}
      />
    </div>
  )
}