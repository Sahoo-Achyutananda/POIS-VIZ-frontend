import { useMemo } from 'react'

import FlowCanvas from '../flow/FlowCanvas'
import FlowBlockNode, { FLOW_BLOCK_NODE_TYPE } from '../flow/FlowBlockNode'
import { getConversionFlowBuilder } from '../../conversions'

export default function ConversionFlowTab({ conversionId = 'pa1', conversionContext }) {
  const { nodes, edges } = useMemo(
    () => {
      const buildGraph = getConversionFlowBuilder(conversionId)
      if (!buildGraph) return { nodes: [], edges: [] }
      return buildGraph(conversionContext || {})
    },
    [conversionId, conversionContext],
  )

  const nodeTypes = useMemo(() => ({ [FLOW_BLOCK_NODE_TYPE]: FlowBlockNode }), [])

  if (nodes.length === 0) {
    return <div className="bg-(--code-bg) px-3 py-6 text-sm text-(--text)">Click Recompute Live Values to generate the conversion flow graph.</div>
  }

  return <FlowCanvas nodes={nodes} edges={edges} nodeTypes={nodeTypes} />
}
