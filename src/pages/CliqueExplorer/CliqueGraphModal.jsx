import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// ── Graph definition ──────────────────────────────────────────

const W = 760
const H = 400

const NODES = {
  OWF:  { x: 80,  y: 80,  label: 'OWF',  sublabel: 'One-Way Function' },
  PRG:  { x: 260, y: 80,  label: 'PRG',  sublabel: 'Pseudorandom Generator' },
  PRF:  { x: 440, y: 80,  label: 'PRF',  sublabel: 'Pseudorandom Function' },
  PRP:  { x: 620, y: 80,  label: 'PRP',  sublabel: 'Pseudorandom Permutation' },
  MAC:  { x: 440, y: 270, label: 'MAC',  sublabel: 'Message Auth. Code' },
  CRHF: { x: 260, y: 270, label: 'CRHF', sublabel: 'Collision-Resistant Hash' },
  HMAC: { x: 440, y: 370, label: 'HMAC', sublabel: 'Hash-Based MAC' },
}

const EDGES = [
  { from: 'OWF',  to: 'PRG',  label: 'HILL',           offset: -20 },
  { from: 'PRG',  to: 'OWF',  label: 'truncation',     offset: -20 },
  { from: 'PRG',  to: 'PRF',  label: 'GGM tree',       offset:   0 },
  { from: 'PRF',  to: 'PRP',  label: 'Luby-Rackoff',   offset: -20 },
  { from: 'PRP',  to: 'PRF',  label: 'Switching Lemma',offset: -20 },
  { from: 'PRF',  to: 'MAC',  label: 'PRF-MAC',        offset:   8 },
  { from: 'MAC',  to: 'CRHF', label: 'MAC→CRHF',      offset:   0 },
  { from: 'CRHF', to: 'HMAC', label: 'HMAC wrapper',   offset:   8 },
]

const NODE_R = 36

// ── SVG arrow helper ──────────────────────────────────────────

function arrowPath(from, to, offset) {
  const fx = NODES[from].x
  const fy = NODES[from].y
  const tx = NODES[to].x
  const ty = NODES[to].y

  const dx = tx - fx
  const dy = ty - fy
  const len = Math.hypot(dx, dy)
  const nx = dx / len
  const ny = dy / len

  // perpendicular for parallel offset
  const px = -ny * offset
  const py =  nx * offset

  const sx = fx + nx * NODE_R + px
  const sy = fy + ny * NODE_R + py
  const ex = tx - nx * NODE_R + px
  const ey = ty - ny * NODE_R + py

  if (offset === 0) {
    return `M ${sx} ${sy} L ${ex} ${ey}`
  }

  // slight bezier curve for offset edges
  const mx = (sx + ex) / 2 + px * 0.8
  const my = (sy + ey) / 2 + py * 0.8
  return `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`
}

function midPoint(from, to, offset) {
  const fx = NODES[from].x, fy = NODES[from].y
  const tx = NODES[to].x,   ty = NODES[to].y
  const dx = tx - fx, dy = ty - fy
  const len = Math.hypot(dx, dy)
  const nx = dx / len, ny = dy / len
  const px = -ny * offset, py = nx * offset
  return {
    x: (fx + tx) / 2 + px * 2.8,
    y: (fy + ty) / 2 + py * 2.8,
  }
}

// ── Variant helpers ───────────────────────────────────────────

function nodeStyle(id, pendingSrc, pendingTgt, pathIds) {
  if (id === pendingSrc) return { ring: '#818cf8', fill: '#1e1b4b', text: '#c7d2fe' }
  if (id === pendingTgt) return { ring: '#f472b6', fill: '#1f0a1e', text: '#fbcfe8' }
  if (pathIds.has(id))   return { ring: '#a78bfa', fill: '#1e0d3a', text: '#ddd6fe' }
  return { ring: '#334155', fill: '#0f172a', text: '#94a3b8' }
}

function edgeStyle(from, to, pendingSrc, pendingTgt, pathEdges) {
  const onPath = pathEdges.some(e => e.from === from && e.to === to)
  if (onPath) return { stroke: '#a78bfa', width: 2, opacity: 1 }
  if ((from === pendingSrc || to === pendingSrc) || (from === pendingTgt || to === pendingTgt))
    return { stroke: '#475569', width: 1.5, opacity: 0.7 }
  return { stroke: '#2d3a52', width: 1.2, opacity: 0.5 }
}

// ── Component ─────────────────────────────────────────────────

export default function CliqueGraphModal({ open, onClose, onSelect, initialSrc, initialTgt }) {
  const [pendingSrc, setPendingSrc] = useState(null)
  const [pendingTgt, setPendingTgt] = useState(null)

  useEffect(() => {
    if (open) {
      setPendingSrc(initialSrc ?? null)
      setPendingTgt(initialTgt ?? null)
    }
  }, [open, initialSrc, initialTgt])

  function handleNodeClick(id) {
    if (!pendingSrc) {
      setPendingSrc(id)
      setPendingTgt(null)
      return
    }
    if (id === pendingSrc) {
      setPendingSrc(null)
      return
    }
    setPendingTgt(id)
  }

  function handleConfirm() {
    if (pendingSrc && pendingTgt) {
      onSelect(pendingSrc, pendingTgt)
      onClose()
    }
  }

  function handleBackdropClose() {
    setPendingSrc(null)
    setPendingTgt(null)
    onClose()
  }

  // Highlight path if both selected
  const pathNodes = new Set()
  const pathEdges = []
  if (pendingSrc && pendingTgt) {
    // BFS shortest path
    const queue = [{ node: pendingSrc, path: [] }]
    const seen = new Set([pendingSrc])
    outer: while (queue.length) {
      const { node, path } = queue.shift()
      for (const e of EDGES) {
        if (e.from !== node || seen.has(e.to)) continue
        const next = [...path, e]
        if (e.to === pendingTgt) {
          next.forEach(edge => { pathNodes.add(edge.from); pathNodes.add(edge.to); pathEdges.push(edge) })
          break outer
        }
        seen.add(e.to)
        queue.push({ node: e.to, path: next })
      }
    }
    pathNodes.add(pendingSrc)
    pathNodes.add(pendingTgt)
  }

  const canConfirm = !!pendingSrc && !!pendingTgt

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={handleBackdropClose}
        >
          {/* Frosted backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <motion.div
            key="dialog"
            className="relative z-10 w-full max-w-[860px] rounded-2xl border-2 border-(--border) bg-(--bg) shadow-(--shadow)"
            initial={{ scale: 0.93, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-(--border) bg-(--accent-bg) px-5 py-3 rounded-t-2xl">
              <div className='flex items-start flex-col'>
                <p className="text-[13px] font-black uppercase tracking-widest text-white">Minicrypt Clique</p>
                <p className="text-sm font-bold text-white">Interactive Primitive Graph</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[14px] text-white font-bold">
                  {!pendingSrc
                    ? 'Click a node to set source'
                    : !pendingTgt
                    ? 'Click another node to set target'
                    : `${pendingSrc} → ${pendingTgt}`}
                </p>
                <button
                  type="button"
                  onClick={handleBackdropClose}
                  className="ml-2 rounded border border-(--border) px-2 py-1 text-[14px] text-white hover:border-(--accent-border) hover:text-(--text-h) transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* SVG Graph */}
            <div className="px-3 pt-3 pb-2 mx-1 my-1 rounded-xl overflow-hidden" style={{ background: '#0b1020' }}>
              <svg
                viewBox={`0 0 ${W} ${H}`}
                width="100%"
                style={{ display: 'block' }}
              >
                <defs>
                  <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="#a78bfa" />
                  </marker>
                  <marker id="arrow-dim" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="#2d3a52" />
                  </marker>
                  {/* grid pattern */}
                  <pattern id="cgrid-sm" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(148,163,184,0.07)" strokeWidth="0.5"/>
                  </pattern>
                  <pattern id="cgrid-lg" width="100" height="100" patternUnits="userSpaceOnUse">
                    <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(139,92,246,0.10)" strokeWidth="1"/>
                  </pattern>
                </defs>

                {/* background */}
                <rect width={W} height={H} fill="#0b1020" />
                <rect width={W} height={H} fill="url(#cgrid-sm)" />
                <rect width={W} height={H} fill="url(#cgrid-lg)" />

                {/* Edges */}
                {EDGES.map(edge => {
                  const es = edgeStyle(edge.from, edge.to, pendingSrc, pendingTgt, pathEdges)
                  const d = arrowPath(edge.from, edge.to, edge.offset)
                  const mid = midPoint(edge.from, edge.to, edge.offset)
                  const isActive = pathEdges.some(e => e.from === edge.from && e.to === edge.to)
                  const labelLen = edge.label.length * 5.2
                  return (
                    <g key={`${edge.from}-${edge.to}`}>
                      <path
                        d={d}
                        stroke={es.stroke}
                        strokeWidth={es.width}
                        fill="none"
                        opacity={es.opacity}
                        markerEnd={isActive ? 'url(#arrow-active)' : 'url(#arrow-dim)'}
                      />
                      {/* label background pill */}
                      <rect
                        x={mid.x - labelLen / 2 - 3}
                        y={mid.y - 15}
                        width={labelLen + 6}
                        height={14}
                        rx="3"
                        fill={isActive ? '#1e0d3a' : '#0d1220'}
                        opacity={es.opacity * 0.92}
                      />
                      <text
                        x={mid.x}
                        y={mid.y - 4}
                        textAnchor="middle"
                        fontSize="12"
                        fill={isActive ? '#c4b5fd' : '#f9fbffff'}
                        opacity={es.opacity}
                        fontFamily="ui-monospace, monospace"
                        fontWeight={isActive ? '700' : '500'}
                      >
                        {edge.label}
                      </text>
                    </g>
                  )
                })}

                {/* Nodes */}
                {Object.entries(NODES).map(([id, node]) => {
                  const ns = nodeStyle(id, pendingSrc, pendingTgt, pathNodes)
                  const isSrc = id === pendingSrc
                  const isTgt = id === pendingTgt
                  return (
                    <g
                      key={id}
                      onClick={() => handleNodeClick(id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Glow ring when selected */}
                      {(isSrc || isTgt) && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={NODE_R + 6}
                          fill="none"
                          stroke={isSrc ? '#818cf8' : '#f472b6'}
                          strokeWidth="4"
                          opacity="0.8"
                        />
                      )}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={NODE_R}
                        fill={ns.fill}
                        stroke={ns.ring}
                        strokeWidth={isSrc || isTgt ? 2.5 : 1.5}
                      />
                      <text
                        x={node.x}
                        y={node.y}
                        textAnchor="middle"
                        fontSize="13"
                        fontWeight="800"
                        fill={ns.text}
                        fontFamily="ui-monospace, monospace"
                      >
                        {node.label}
                      </text>
                      {/* <text
                        x={node.x}
                        y={node.y + 10}
                        textAnchor="middle"
                        fontSize="7.5"
                        fill={ns.text}
                        opacity="0.6"
                        fontFamily="sans-serif"
                      >
                        {node.sublabel}
                      </text> */}
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* Legend + action row */}
            <div className="flex items-center justify-between gap-3 border-t border-(--border) bg-(--accent-bg) px-5 py-3 rounded-b-2xl">
              <div className="flex items-center gap-5 text-[14px] font-semibold text-white">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-indigo-400 bg-indigo-950" />
                  Source
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-pink-400 bg-pink-950" />
                  Target
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-violet-400 bg-violet-950" />
                  Reduction path
                </span>
              </div>
              <div className="flex items-center gap-2">
                {pendingSrc && (
                  <button
                    type="button"
                    onClick={() => { setPendingSrc(null); setPendingTgt(null) }}
                    className="rounded border border-(--border) px-3 py-1.5 text-[14px] text-white hover:border-(--accent-border) hover:text-(--text-h) transition-colors"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                  className={`rounded border px-4 py-1.5 text-[14px] font-bold transition-all ${
                    canConfirm
                      ? 'border-(--accent-border) bg-(--accent-bg) text-(--text-h) hover:brightness-110'
                      : 'border-(--border) text-(--text)/20 cursor-not-allowed'
                  }`}
                >
                  Set Source &amp; Target →
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
