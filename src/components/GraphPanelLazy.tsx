import { lazy, Suspense } from "react"
import type { ComponentProps } from "react"

/**
 * GraphPanel pulls in @xyflow/react (~600 kB minified), the heaviest
 * dependency in the app. Loading it lazily keeps the initial bundle small;
 * the graph shows a lightweight skeleton while the chunk streams in.
 */
const GraphPanelInner = lazy(() => import("./GraphPanelModule"))

export type GraphPanelProps = ComponentProps<typeof GraphPanelInner>

function GraphSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full animate-pulse opacity-60" aria-label="Memuat graph..." />
    </div>
  )
}

export function GraphPanelLazy(props: GraphPanelProps) {
  return (
    <Suspense fallback={<GraphSkeleton />}>
      <GraphPanelInner {...props} />
    </Suspense>
  )
}
