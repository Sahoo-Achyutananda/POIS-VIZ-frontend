import { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

// Utility to calculate perpendicular offset points for parallel lines
const getParallelPoints = (start, end, offset) => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.sqrt(dx * dx + dy * dy)
  if (length === 0) return { start, end }
  
  // Normal vector
  const nx = -dy / length
  const ny = dx / length
  
  return {
    start: { x: start.x + nx * offset, y: start.y + ny * offset },
    end: { x: end.x + nx * offset, y: end.y + ny * offset }
  }
}

const CliqueGraph = () => {
  const [rotate, setRotate] = useState({ x: 0, y: 0 })
  const [hoveredEdge, setHoveredEdge] = useState(null)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  const handleMouseMove = (e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -12
    const rotateY = ((x - centerX) / centerX) * 12
    setRotate({ x: rotateX, y: rotateY })
  }

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 })
    setHoveredEdge(null)
  }

  // Node definitions with optimized spacing
  const nodes = useMemo(() => ({
    owf: { x: 250, y: 45, label: 'OWF', sub: 'One-Way Function', color: '#c084fc' },
    prg: { x: 90, y: 130, label: 'PRG', sub: 'Pseudorandom Gen.', color: '#60a5fa' },
    owp: { x: 410, y: 130, label: 'OWP', sub: 'One-Way Permutation', color: '#60a5fa' },
    prf: { x: 250, y: 230, label: 'PRF', sub: 'Pseudorandom Func.', color: '#60a5fa' },
    prp: { x: 250, y: 350, label: 'PRP', sub: 'Pseudorandom Perm.', color: '#60a5fa' },
    mac: { x: 420, y: 350, label: 'MAC', sub: 'Message Auth. Code', color: '#60a5fa' },
    crhf: { x: 80, y: 350, label: 'CRHF', sub: 'Coll.-Res. Hash', color: '#4ade80' },
    hmac: { x: 80, y: 460, label: 'HMAC', sub: 'Hash-based MAC', color: '#4ade80' },
  }), [])

  // Edge definitions specifying bidirectional nature
  const edges = useMemo(() => [
    { id: 'owf-prg', from: 'owf', to: 'prg', label: 'HILL', desc: 'HILL hard-core-bit construction', bidirectional: true },
    { id: 'owf-owp', from: 'owf', to: 'owp', label: 'Identity', desc: 'DLP is already a OWP (identity for DLP foundation)', bidirectional: false },
    { id: 'prg-prf', from: 'prg', to: 'prf', label: 'GGM', desc: 'GGM root-to-leaf tree construction', bidirectional: true },
    { id: 'prf-prp', from: 'prf', to: 'prp', label: 'Feistel', desc: 'Luby-Rackoff 3-round Feistel / Switching Lemma', bidirectional: true },
    { id: 'prf-mac', from: 'prf', to: 'mac', label: 'Direct', desc: 'Direct PRF-based MAC: Mack(m) = Fk(m)', bidirectional: true },
    { id: 'prp-mac', from: 'prp', to: 'mac', label: 'Switching', desc: 'PRP/PRF switching lemma for MACs', bidirectional: false },
    { id: 'crhf-hmac', from: 'crhf', to: 'hmac', label: 'HMAC', desc: 'HMAC construction using CRHF (PA#10)', bidirectional: true },
    { id: 'hmac-mac', from: 'hmac', to: 'mac', label: 'Generic', desc: 'Direct reduction (HMAC is a secure MAC)', bidirectional: false },
  ], [])

  return (
    <div 
      ref={containerRef}
      className="relative flex h-[600px] w-full items-center justify-center overflow-visible"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '1200px' }}
    >
      <style>{`
        @keyframes dashroll {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        .moving-edge {
          animation: dashroll 0.8s linear infinite;
        }
        .node-rect {
          transition: fill 0.3s, stroke 0.3s, transform 0.3s;
        }
        .node-rect:hover {
          fill: #22232b;
          transform: translateZ(10px);
        }
      `}</style>

      <div 
        className="relative h-full w-full transition-transform duration-200 ease-out"
        style={{ 
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
          transformStyle: 'preserve-3d'
        }}
      >
        <svg viewBox="0 0 500 500" className="h-full w-full overflow-visible">
          <defs>
            {/* Larger, high-visibility arrowheads */}
            <marker id="arrow-purple" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <path d="M0,0 L10,4 L0,8 Z" fill="#c084fc" />
            </marker>
            <marker id="arrow-blue" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <path d="M0,0 L10,4 L0,8 Z" fill="#60a5fa" />
            </marker>
            <marker id="arrow-gray" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <path d="M0,0 L10,4 L0,8 Z" fill="#4b5563" />
            </marker>
            <marker id="arrow-accent" markerWidth="12" markerHeight="10" refX="10" refY="5" orient="auto">
              <path d="M0,0 L12,5 L0,10 Z" fill="var(--accent)" />
            </marker>
            <filter id="strong-glow">
              <feGaussianBlur stdDeviation="3" result="glow"/>
              <feMerge>
                <feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Edges */}
          <g>
            {edges.map((edge, idx) => {
              const startNode = nodes[edge.from]
              const endNode = nodes[edge.to]
              const isHovered = hoveredEdge === edge.id
              const opacity = hoveredEdge === null || isHovered ? 1 : 0.2

              // Determine markers and colors
              const baseMarker = edge.bidirectional ? "url(#arrow-purple)" : "url(#arrow-gray)"
              const activeMarker = "url(#arrow-accent)"
              const baseColor = edge.bidirectional ? "#a855f7" : "#4b5563"

              // Component for a single directed line
              const DirectedLine = ({ from, to, reverse = false, offset = 0 }) => {
                const p = getParallelPoints(from, to, offset)
                const s = reverse ? p.end : p.start
                const e = reverse ? p.start : p.end
                
                return (
                  <line 
                    x1={s.x} y1={s.y} x2={e.x} y2={e.y} 
                    stroke={isHovered ? 'var(--accent)' : baseColor} 
                    strokeWidth={isHovered ? "4" : "3"}
                    strokeDasharray={isHovered ? "0" : "8,6"}
                    className={isHovered ? "" : "moving-edge"}
                    markerEnd={isHovered ? activeMarker : baseMarker}
                    opacity={opacity}
                    style={{ transition: 'stroke 0.3s, stroke-width 0.3s, opacity 0.3s' }}
                    filter={isHovered ? "url(#strong-glow)" : ""}
                  />
                )
              }

              return (
                <g 
                  key={edge.id} 
                  onMouseEnter={() => setHoveredEdge(edge.id)}
                  className="cursor-pointer"
                  onClick={() => navigate('/clique-explored')}
                >
                  {/* Hit area */}
                  <line x1={startNode.x} y1={startNode.y} x2={endNode.x} y2={endNode.y} stroke="transparent" strokeWidth="24" />
                  
                  {edge.bidirectional ? (
                    <>
                      {/* Forward parallel line */}
                      <DirectedLine from={startNode} to={endNode} offset={-6} />
                      {/* Backward parallel line */}
                      <DirectedLine from={startNode} to={endNode} offset={6} reverse={true} />
                    </>
                  ) : (
                    <DirectedLine from={startNode} to={endNode} offset={0} />
                  )}
                </g>
              )
            })}
          </g>

          {/* Nodes */}
          {Object.entries(nodes).map(([id, node]) => (
            <g key={id} style={{ transform: 'translateZ(40px)' }}>
              <rect 
                x={node.x - 55} 
                y={node.y - 25} 
                width="110" 
                height="50" 
                rx="10" 
                fill="#16171d" 
                stroke={node.color} 
                strokeWidth="2.5"
                className="node-rect"
              />
              <text x={node.x} y={node.y - 1} fontSize="13" fontWeight="bold" fill="#f3f4f6" textAnchor="middle" pointerEvents="none">{node.label}</text>
              <text x={node.x} y={node.y + 14} fontSize="7" fill="#9ca3af" textAnchor="middle" pointerEvents="none">{node.sub}</text>
            </g>
          ))}
        </svg>

        {/* Hover Info Overlay */}
        <div 
          className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[420px] pointer-events-none transition-all duration-300"
          style={{ 
            opacity: hoveredEdge !== null ? 1 : 0,
            transform: `translateY(${hoveredEdge !== null ? 0 : 20}px) translateZ(60px)`
          }}
        >
          <div className="rounded-xl border border-[var(--accent-border)] bg-[#1f2028]/95 p-5 shadow-2xl backdrop-blur-md">
            {hoveredEdge !== null && (() => {
              const edge = edges.find(e => e.id === hoveredEdge)
              return (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${edge.bidirectional ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {edge.bidirectional ? 'Bidirectional Equivalence' : 'One-Way Reduction'}
                    </span>
                    <div className="h-[1px] flex-1 bg-[var(--border)] opacity-20" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    {nodes[edge.from].label} {edge.bidirectional ? '↔' : '→'} {nodes[edge.to].label}
                  </h4>
                  <p className="mt-1.5 text-xs italic text-gray-300">
                    "{edge.desc}"
                  </p>
                </>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CliqueGraph
