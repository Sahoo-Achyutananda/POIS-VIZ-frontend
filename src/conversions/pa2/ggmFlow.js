import { Position } from '@xyflow/react'
import { createFlowNode } from '../../components/flow/flowNodeFactory'

const LEAF_GAP = 210
const LEVEL_H = 165
const SX = 80
const SY = 50
const PATH_ONLY_THRESHOLD = 4

function shortHex(hex, take = 9) {
  if (!hex) return 'N/A'
  return hex.length > take * 2 + 1 ? `${hex.slice(0, take)}…${hex.slice(-take)}` : hex
}

function makeEdge(id, source, target, bit, isActivePath) {
  return {
    id,
    source,
    target,
    sourceHandle: 'out',
    targetHandle: 'in',
    type: 'smoothstep',
    animated: isActivePath,
    label: bit,
    labelStyle: {
      fill: isActivePath ? '#c4b5fd' : '#475569',
      fontSize: 11,
      fontWeight: 700,
    },
    style: {
      stroke: isActivePath ? '#a5b4fc' : '#2d3a52',
      strokeWidth: isActivePath ? 2.2 : 1,
    },
    markerEnd: {
      type: 'arrowclosed',
      color: isActivePath ? '#a5b4fc' : '#2d3a52',
      width: isActivePath ? 16 : 11,
      height: isActivePath ? 16 : 11,
    },
  }
}

export function buildGGMFlow(conversionContext) {
  const apiData = conversionContext?.col1Data
  if (!apiData?.nodes) return { nodes: [], edges: [] }

  const { nodes: treeNodes, depth, query_bits } = apiData
  const pathOnly = depth > PATH_ONLY_THRESHOLD

  // Build the set of node IDs to render
  const showSet = new Set()
  if (pathOnly) {
    for (const tn of treeNodes) {
      if (!tn.active) continue
      showSet.add(tn.id)
      // sibling of each active node
      const sibIdx = tn.index % 2 === 0 ? tn.index + 1 : tn.index - 1
      showSet.add(`L${tn.level}N${sibIdx}`)
    }
  } else {
    treeNodes.forEach(n => showSet.add(n.id))
  }

  const nodeMap = new Map(treeNodes.map(n => [n.id, n]))
  const reactNodes = []
  const reactEdges = []

  for (const tn of treeNodes) {
    if (!showSet.has(tn.id)) continue
    const { id, level, index, prefix, active, value_hex } = tn
    const isLeaf = level === depth
    const isRoot = level === 0

    // Position
    let x, y
    if (pathOnly) {
      // Active path down left column, siblings to the right
      x = SX + (active ? 0 : 380)
      y = SY + level * LEVEL_H
    } else {
      const span = Math.pow(2, depth - level)
      x = SX + (index * span + (span - 1) / 2) * LEAF_GAP
      y = SY + level * LEVEL_H
    }

    // Variant
    let variant = 'neutral'
    if (active) {
      if (isRoot) variant = 'input'
      else if (isLeaf) variant = 'output'
      else variant = 'main'
    }

    // Label
    const dir = !isRoot && prefix ? (prefix.slice(-1) === '0' ? 'G₀' : 'G₁') : null
    let title
    if (isRoot) title = 'k  (root)'
    else if (isLeaf && active) title = `F_k(${query_bits})`
    else if (dir) title = active ? `${dir}  ✦ active` : dir
    else title = `L${level}.${index}`

    const detailRows = [
      prefix !== undefined && prefix !== '' ? `path: ${prefix}` : `depth: 0`,
      `val: ${shortHex(value_hex)}`,
    ]

    reactNodes.push(createFlowNode({
      id,
      x,
      y,
      variant,
      title,
      detailRows,
      showInputHandle: !isRoot,
      showOutputHandle: !isLeaf,
      inputPosition: Position.Top,
      outputPosition: Position.Bottom,
      minWidth: 170,
      maxWidth: 230,
    }))
  }

  // Edges: connect each non-leaf node to both children (if shown)
  for (const tn of treeNodes) {
    if (tn.level >= depth) continue
    if (!showSet.has(tn.id)) continue

    for (const dir of [0, 1]) {
      const childIdx = tn.index * 2 + dir
      const childId = `L${tn.level + 1}N${childIdx}`
      if (!showSet.has(childId)) continue

      const child = nodeMap.get(childId)
      const activePath = tn.active && child?.active

      reactEdges.push(makeEdge(
        `e-${tn.id}-${childId}`,
        tn.id,
        childId,
        String(dir),
        activePath,
      ))
    }
  }

  return { nodes: reactNodes, edges: reactEdges }
}
