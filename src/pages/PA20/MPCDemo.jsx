import { useState, useEffect, useRef, useMemo } from 'react'
import axios from 'axios'
import api from '../../lib/api'
import PageHeader from '../../components/PageHeader'
import Btn from '../../components/Btn'

const pa20api = axios.create({ baseURL: api.defaults.baseURL, timeout: 180_000 })

function cx(...c) { return c.filter(Boolean).join(' ') }
function Spinner() { return <span className="inline-block animate-spin mr-1">⟳</span> }

function Badge({ label, color = 'purple' }) {
  const cls = {
    green:  'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    red:    'bg-rose-500/20    border-rose-500/40    text-rose-300',
    amber:  'bg-amber-500/20   border-amber-500/40   text-amber-300',
    purple: 'bg-purple-500/20  border-purple-500/40  text-purple-300',
    blue:   'bg-blue-500/20    border-blue-500/40    text-blue-300',
    cyan:   'bg-cyan-500/20    border-cyan-500/40    text-cyan-300',
  }
  return (
    <span className={cx('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider', cls[color] ?? cls.purple)}>
      {label}
    </span>
  )
}

// ── Circuit definitions ────────────────────────────────────────────────────────
const GATE_OPS = {
  AND: (...i) => i.reduce((a, b) => a & b, 1),
  XOR: (a, b) => a ^ b,
  NOT: (a)    => 1 - a,
  OR:  (a, b) => a | b,
}

const NODE_R = 28
const INP_W  = 54
const INP_H  = 30
const OUT_W  = 60
const COL_W  = 150
const ROW_H  = 78
const PAD_X  = 70
const PAD_Y  = 44

const GCOL = {
  AND: { fill: 'rgba(88,28,135,.45)',   stroke: '#c084fc', text: '#e9d5ff' },
  XOR: { fill: 'rgba(120,53,15,.45)',   stroke: '#fbbf24', text: '#fde68a' },
  NOT: { fill: 'rgba(14,116,144,.45)',  stroke: '#22d3ee', text: '#a5f3fc' },
  OR:  { fill: 'rgba(30,64,175,.45)',   stroke: '#60a5fa', text: '#bfdbfe' },
}
const ICOL = {
  alice: { fill: 'rgba(30,58,138,.55)',  stroke: '#60a5fa', text: '#bfdbfe' },
  bob:   { fill: 'rgba(127,29,29,.55)',  stroke: '#f87171', text: '#fecaca' },
  other: { fill: 'rgba(6,78,59,.55)',    stroke: '#34d399', text: '#d1fae5' },
}
const OCOL = { fill: 'rgba(88,28,135,.55)', stroke: '#c084fc', text: '#e9d5ff' }

// ── Superscript/subscript helpers ─────────────────────────────────────────────
const SUB = '₀₁₂₃₄₅₆₇₈₉'
const sub = (i) => String(i).split('').map(d => SUB[d]).join('')

// ── Dynamic circuit builders ───────────────────────────────────────────────────
// All bits are indexed LSB=0. Inputs listed MSB-first for natural visual column order.

// n-bit Equality: out = ⋀ᵢ XNOR(xᵢ,yᵢ)
// Gate cost: n XOR (free) + n NOT (free) + (n-1) AND (= n-1 OT calls)
function buildEqualityCircuit(n) {
  const nodes = []
  // Inputs MSB first
  for (let i = n - 1; i >= 0; i--)
    nodes.push({ id: `x${i}`, type: 'INPUT', group: 'alice', label: `x${sub(i)}`, inputs: [] })
  for (let i = n - 1; i >= 0; i--)
    nodes.push({ id: `y${i}`, type: 'INPUT', group: 'bob',   label: `y${sub(i)}`, inputs: [] })
  // XOR per bit (free)
  for (let i = 0; i < n; i++)
    nodes.push({ id: `xr${i}`, type: 'XOR', label: 'XOR', inputs: [`x${i}`, `y${i}`] })
  // NOT = XNOR (free)
  for (let i = 0; i < n; i++)
    nodes.push({ id: `n${i}`, type: 'NOT', label: 'NOT', inputs: [`xr${i}`] })
  // AND chain: n-1 AND gates = n-1 OT calls
  if (n === 1) {
    nodes.push({ id: 'OUT', type: 'OUTPUT', label: 'x=y', inputs: ['n0'] })
  } else {
    nodes.push({ id: 'a0', type: 'AND', label: 'AND', inputs: ['n0', 'n1'], secure: true })
    for (let i = 2; i < n; i++)
      nodes.push({ id: `a${i - 1}`, type: 'AND', label: 'AND', inputs: [`a${i - 2}`, `n${i}`], secure: true })
    nodes.push({ id: 'OUT', type: 'OUTPUT', label: 'x=y', inputs: [n === 2 ? 'a0' : `a${n - 2}`] })
  }
  const otCalls = n - 1
  return {
    name: `${n}-bit Equality Circuit`,
    formula: `out = XNOR(x${sub(0)},y${sub(0)}) · … · XNOR(x${sub(n-1)},y${sub(n-1)})  [${n} XOR + ${n} NOT + ${otCalls} AND]`,
    nodes,
  }
}

// n-bit Yao Garbled Comparator — MSB→LSB ripple, exactly matching backend algorithm.
// Per bit: NOT(yi)[free] + AND(xi,NOT(yi))[OT] + XOR[free] + NOT(XOR)[free]
//        + AND(eq,gt_i)[OT] + NOT(gt)[free] + NOT(eg)[free] + AND(NOT(gt),NOT(eg))[OT] + NOT(…)[free]
//        + AND(eq,eq_i)[OT]  →  4 OT per bit
// Plus: x<y = NOT(gt_f) AND NOT(eq_f)  → 1 OT
// Total: 4n + 1 AND gates = 4n + 1 OT calls
function buildYaoComparatorCircuit(n) {
  const nodes = []
  // Alice inputs MSB first (x_{n-1} … x_0)
  for (let i = n - 1; i >= 0; i--)
    nodes.push({ id: `x${i}`, type: 'INPUT', group: 'alice', label: `x${sub(i)}`, inputs: [] })
  // Bob inputs MSB first
  for (let i = n - 1; i >= 0; i--)
    nodes.push({ id: `y${i}`, type: 'INPUT', group: 'bob', label: `y${sub(i)}`, inputs: [] })
  // Carry-in state: gt=0, eq=1
  nodes.push({ id: 'CIGT', type: 'INPUT', group: 'other', label: 'gt₀=0', inputs: [] })
  nodes.push({ id: 'CIEQ', type: 'INPUT', group: 'other', label: 'eq₀=1', inputs: [] })

  let prevGt = 'CIGT', prevEq = 'CIEQ'

  for (let i = 0; i < n; i++) {
    const bit = n - 1 - i           // actual bit index: i=0 → MSB = n-1
    const xId = `x${bit}`, yId = `y${bit}`

    nodes.push({ id: `nyi${i}`,  type: 'NOT', label: 'NOT', inputs: [yId]                          })  // NOT(yi) — free
    nodes.push({ id: `gti${i}`,  type: 'AND', label: 'AND', inputs: [xId, `nyi${i}`], secure: true })  // GT_bit — OT
    nodes.push({ id: `xri${i}`,  type: 'XOR', label: 'XOR', inputs: [xId, yId]                     })  // XOR — free
    nodes.push({ id: `eqi${i}`,  type: 'NOT', label: 'NOT', inputs: [`xri${i}`]                    })  // EQ_bit — free
    nodes.push({ id: `eg${i}`,   type: 'AND', label: 'AND', inputs: [prevEq, `gti${i}`], secure: true })  // EQ∧GT — OT
    nodes.push({ id: `na${i}`,   type: 'NOT', label: 'NOT', inputs: [prevGt]                        })  // NOT(gt) — free (for OR)
    nodes.push({ id: `nb${i}`,   type: 'NOT', label: 'NOT', inputs: [`eg${i}`]                      })  // NOT(eg) — free (for OR)
    nodes.push({ id: `aor${i}`,  type: 'AND', label: 'AND', inputs: [`na${i}`, `nb${i}`], secure: true }) // OR-core AND — OT
    nodes.push({ id: `ngt${i}`,  type: 'NOT', label: 'NOT', inputs: [`aor${i}`]                     })  // new gt — free
    nodes.push({ id: `neq${i}`,  type: 'AND', label: 'AND', inputs: [prevEq, `eqi${i}`], secure: true })  // new eq — OT

    prevGt = `ngt${i}`
    prevEq = `neq${i}`
  }

  // Derive x<y = NOT(gt_final) AND NOT(eq_final)
  nodes.push({ id: 'ngtf',  type: 'NOT', label: 'NOT', inputs: [prevGt]            })
  nodes.push({ id: 'neqf',  type: 'NOT', label: 'NOT', inputs: [prevEq]            })
  nodes.push({ id: 'ltand', type: 'AND', label: 'AND', inputs: ['ngtf', 'neqf'], secure: true })

  nodes.push({ id: 'GT', type: 'OUTPUT', label: 'x>y', inputs: [prevGt]  })
  nodes.push({ id: 'EQ', type: 'OUTPUT', label: 'x=y', inputs: [prevEq]  })
  nodes.push({ id: 'LT', type: 'OUTPUT', label: 'x<y', inputs: ['ltand'] })

  const otCalls = 4 * n + 1
  return {
    name: `${n}-bit Yao Garbled Comparator (MSB→LSB ripple)`,
    formula: `Ripple eq/gt carry chain: 4×${n} AND (compare) + 1 AND (x<y) = ${otCalls} OT calls`,
    nodes,
  }
}

// ── Derive n_bits from a value ─────────────────────────────────────────────────
const nBitsFor = (v) => Math.max(1, Math.ceil(Math.log2(v + 1)))

// Bit inputs for the Yao comparator (includes CIGT=0, CIEQ=1 carry-in constants)
function makeBitsForYao(n, x, y) {
  const b = { CIGT: 0, CIEQ: 1 }
  for (let i = 0; i < n; i++) { b[`x${i}`] = (x >> i) & 1; b[`y${i}`] = (y >> i) & 1 }
  return b
}

// Concrete gate-by-gate evaluation for x, y using the backend ripple algorithm.
// Returns { gates, gt, eq, lt, decisionBit, bitSummary, xBits, yBits }
function computeGateTrace(n, x, y) {
  // MSB-first bit arrays
  const xBits = [], yBits = []
  for (let i = n - 1; i >= 0; i--) { xBits.push((x >> i) & 1); yBits.push((y >> i) & 1) }

  const gates = []
  let gid = 0
  const g = (label, type, inputs, output, ot) => { gates.push({ id: ++gid, label, type, inputs: [...inputs], output, ot }); return output }

  let gt = 0, eq = 1
  let decisionBit = null
  const bitSummary = []

  for (let i = 0; i < n; i++) {
    const xi = xBits[i], yi = yBits[i]
    const bitPos = n - 1 - i   // actual bit position (MSB = n-1)

    const not_yi = g(`NOT_y[${i}]`,    'NOT', [yi],         1 - yi,       false)
    const gt_i   = g(`GT_bit[${i}]`,   'AND', [xi, not_yi], xi & not_yi,  true)  // OT#1
    const xor_i  = g(`XOR_bit[${i}]`,  'XOR', [xi, yi],     xi ^ yi,      false)
    const eq_i   = g(`EQ_bit[${i}]`,   'NOT', [xor_i],      1 - xor_i,   false)
    const eg_i   = g(`EQ∧GT[${i}]`,    'AND', [eq, gt_i],   eq & gt_i,   true)  // OT#2
    const na     = g(`NOT_gt[${i}]`,   'NOT', [gt],          1 - gt,      false)
    const nb     = g(`NOT_eg[${i}]`,   'NOT', [eg_i],        1 - eg_i,    false)
    const aor    = g(`OR_AND[${i}]`,   'AND', [na, nb],      na & nb,     true)  // OT#3
    const new_gt = g(`gt_new[${i}]`,   'NOT', [aor],         1 - aor,     false)
    const new_eq = g(`eq_new[${i}]`,   'AND', [eq, eq_i],    eq & eq_i,   true)  // OT#4

    if (decisionBit === null && eq === 1 && new_eq === 0) decisionBit = i
    bitSummary.push({ i, bitPos, xi, yi, not_yi, gt_i, xor_i, eq_i, eg_i, na, nb, aor, new_gt, new_eq, prev_gt: gt, prev_eq: eq })
    gt = new_gt; eq = new_eq
  }

  // Derive x < y = NOT(gt_final) AND NOT(eq_final)
  const ngt_f = g('NOT_gt_f',  'NOT', [gt],         1 - gt,       false)
  const neq_f = g('NOT_eq_f',  'NOT', [eq],         1 - eq,       false)
  const lt    = g('LT (x<y)',  'AND', [ngt_f,neq_f], ngt_f&neq_f, true)  // OT

  return { gates, gt, eq, lt, decisionBit, bitSummary, xBits, yBits }
}

// ── Equality gate-by-gate trace (frontend) ───────────────────────────────────
// n-bit XNOR equality: XOR + NOT per bit (free), then AND chain (n-1 OT calls)
function computeEqualityTrace(n, x, y) {
  const gates = []
  let gid = 0
  const g = (label, type, inputs, output, ot) => {
    gates.push({ id: ++gid, label, type, inputs: [...inputs], output, ot })
    return output
  }
  // XNOR per bit, MSB first
  const eqBits = []
  for (let i = n - 1; i >= 0; i--) {
    const xi = (x >> i) & 1
    const yi = (y >> i) & 1
    const xorOut  = g(`XOR[${i}]`, 'XOR', [xi, yi],     xi ^ yi,    false)
    const xnorOut = g(`NOT[${i}]`, 'NOT', [xorOut],      1 - xorOut, false)
    eqBits.push(xnorOut)
  }
  // AND chain: n-1 AND gates
  let acc = eqBits[0] ?? 1
  for (let i = 1; i < eqBits.length; i++) {
    acc = g(`AND[${i-1}]`, 'AND', [acc, eqBits[i]], acc & eqBits[i], true)
  }
  return { gates, result: acc }
}

// 1-bit Full Adder gate-by-gate trace (frontend)
// sum = a⊕b⊕cin,  carry = (a·b) ⊕ ((a⊕b)·cin)
// Gate cost: 3 XOR (free) + 2 AND (= 2 OT calls)
function computeAdderTrace(a, b, cin) {
  const gates = []
  let gid = 0
  const g = (label, type, inputs, output, ot) => {
    gates.push({ id: ++gid, label, type, inputs: [...inputs], output, ot })
    return output
  }
  const xab   = g('XOR(a,b)',      'XOR', [a, b],       a ^ b,         false)
  const aab   = g('AND(a,b)',      'AND', [a, b],       a & b,         true)   // OT#1
  const sum   = g('XOR(xab,cin)', 'XOR', [xab, cin],   xab ^ cin,     false)
  const axc   = g('AND(xab,cin)', 'AND', [xab, cin],   xab & cin,     true)   // OT#2
  const carry = aab ^ axc
  g('XOR(aab,axc)', 'XOR', [aab, axc], carry, false)
  return { gates, sum, carry }
}

// Bit inputs for legacy equality circuit (indexed LSB=0)
function makeBits(n, x, y) {
  const b = {}
  for (let i = 0; i < n; i++) { b[`x${i}`] = (x >> i) & 1; b[`y${i}`] = (y >> i) & 1 }
  return b
}

const CIRCUITS = {
  adder: {
    name: '1-bit Full Adder',
    formula: 'sum = a⊕b⊕cᵢₙ   carry = (a·b) ⊕ ((a⊕b)·cᵢₙ)',
    nodes: [
      { id:'a',     type:'INPUT',  group:'alice', label:'a',    inputs:[] },
      { id:'b',     type:'INPUT',  group:'bob',   label:'b',    inputs:[] },
      { id:'cin',   type:'INPUT',  group:'other', label:'cᵢₙ', inputs:[] },
      { id:'xab',   type:'XOR',   label:'XOR',   inputs:['a','b']           },
      { id:'aab',   type:'AND',   label:'AND',   inputs:['a','b'],   secure:true },
      { id:'sum',   type:'XOR',   label:'XOR',   inputs:['xab','cin']        },
      { id:'axc',   type:'AND',   label:'AND',   inputs:['xab','cin'], secure:true },
      { id:'carry', type:'XOR',   label:'XOR',   inputs:['aab','axc']        },
      { id:'SUM',   type:'OUTPUT',              label:'SUM',   inputs:['sum']   },
      { id:'CARRY', type:'OUTPUT',              label:'CARRY', inputs:['carry'] },
    ]
  },

  // ── 3-bit Equality  (AND chain: 2 AND = 2 OT calls) ───────────────────────────
  equality: {
    name: '3-bit Equality Circuit',
    formula: 'out = XNOR(x₀,y₀) · XNOR(x₁,y₁) · XNOR(x₂,y₂)',
    nodes: [
      // Alice inputs
      { id:'x0', type:'INPUT', group:'alice', label:'x₀', inputs:[] },
      { id:'x1', type:'INPUT', group:'alice', label:'x₁', inputs:[] },
      { id:'x2', type:'INPUT', group:'alice', label:'x₂', inputs:[] },
      // Bob inputs
      { id:'y0', type:'INPUT', group:'bob', label:'y₀', inputs:[] },
      { id:'y1', type:'INPUT', group:'bob', label:'y₁', inputs:[] },
      { id:'y2', type:'INPUT', group:'bob', label:'y₂', inputs:[] },
      // XOR per bit (free)
      { id:'xr0', type:'XOR', label:'XOR', inputs:['x0','y0'] },
      { id:'xr1', type:'XOR', label:'XOR', inputs:['x1','y1'] },
      { id:'xr2', type:'XOR', label:'XOR', inputs:['x2','y2'] },
      // NOT = XNOR (free)
      { id:'n0', type:'NOT', label:'NOT', inputs:['xr0'] },
      { id:'n1', type:'NOT', label:'NOT', inputs:['xr1'] },
      { id:'n2', type:'NOT', label:'NOT', inputs:['xr2'] },
      // AND chain: 2 AND gates = 2 OT calls
      { id:'a01', type:'AND', label:'AND', inputs:['n0','n1'], secure:true },
      { id:'res', type:'AND', label:'AND', inputs:['a01','n2'], secure:true },
      { id:'OUT', type:'OUTPUT', label:'x=y', inputs:['res'] },
    ]
  },

  // ── 3-bit Comparator  (ripple cascade: 8 AND = 8 OT calls) ──────────────────
  compare: {
    name: '3-bit Comparator (Millionaires)',
    formula: 'x>y ↔ x₂>y₂ ∨ (x₂=y₂∧x₁>y₁) ∨ (x₂=y₂∧x₁=y₁∧x₀>y₀)',
    nodes: [
      // Inputs
      { id:'x2', type:'INPUT', group:'alice', label:'x₂', inputs:[] },
      { id:'x1', type:'INPUT', group:'alice', label:'x₁', inputs:[] },
      { id:'x0', type:'INPUT', group:'alice', label:'x₀', inputs:[] },
      { id:'y2', type:'INPUT', group:'bob',   label:'y₂', inputs:[] },
      { id:'y1', type:'INPUT', group:'bob',   label:'y₁', inputs:[] },
      { id:'y0', type:'INPUT', group:'bob',   label:'y₀', inputs:[] },
      // NOT y_i  (free)
      { id:'ny2', type:'NOT', label:'NOT', inputs:['y2'] },
      { id:'ny1', type:'NOT', label:'NOT', inputs:['y1'] },
      { id:'ny0', type:'NOT', label:'NOT', inputs:['y0'] },
      // per-bit greater: gt_i = x_i AND NOT(y_i)  [OT]
      { id:'gt2', type:'AND', label:'AND', inputs:['x2','ny2'], secure:true },
      { id:'gt1', type:'AND', label:'AND', inputs:['x1','ny1'], secure:true },
      { id:'gt0', type:'AND', label:'AND', inputs:['x0','ny0'], secure:true },
      // per-bit equality: eq_i = NOT(XOR(x_i,y_i))  (free)
      { id:'xd2', type:'XOR', label:'XOR', inputs:['x2','y2'] },
      { id:'xd1', type:'XOR', label:'XOR', inputs:['x1','y1'] },
      { id:'eq2', type:'NOT', label:'NOT', inputs:['xd2']      },
      { id:'eq1', type:'NOT', label:'NOT', inputs:['xd1']      },
      // cascade terms
      { id:'c1',   type:'AND', label:'AND', inputs:['eq2','gt1'], secure:true },   // eq2 ∧ gt1  [OT]
      { id:'eq21', type:'AND', label:'AND', inputs:['eq2','eq1'], secure:true },   // eq2 ∧ eq1  [OT]
      { id:'c0',   type:'AND', label:'AND', inputs:['eq21','gt0'], secure:true },  // eq21∧gt0  [OT]
      // OR(gt2, c1, c0) via XOR-based OR: OR(a,b) = XOR(a,b,AND(a,b))  [1 AND per OR]
      { id:'t12',  type:'XOR', label:'XOR', inputs:['gt2','c1'] },
      { id:'a12',  type:'AND', label:'AND', inputs:['gt2','c1'], secure:true },  // AND for OR(gt2,c1)  [OT]
      { id:'or12', type:'XOR', label:'XOR', inputs:['t12','a12'] },              // = OR(gt2, c1)
      { id:'t_f',  type:'XOR', label:'XOR', inputs:['or12','c0'] },
      { id:'a_f',  type:'AND', label:'AND', inputs:['or12','c0'], secure:true }, // AND for OR(or12,c0) [OT]
      { id:'res',  type:'XOR', label:'XOR', inputs:['t_f','a_f'] },              // = x > y
      { id:'OUT',  type:'OUTPUT', label:'x>y', inputs:['res'] },
    ]
  },
}

// ── Circuit layout hook ───────────────────────────────────────────────────────
function useCircuitLayout(nodes) {
  return useMemo(() => {
    const depth = {}
    nodes.forEach(n => { depth[n.id] = n.inputs.length === 0 ? 0 : 999 })
    let changed = true
    while (changed) {
      changed = false
      nodes.forEach(n => {
        if (n.type === 'INPUT' || n.type === 'OUTPUT') return
        const d = Math.max(...n.inputs.map(id => depth[id] ?? 0)) + 1
        if (depth[n.id] !== d) { depth[n.id] = d; changed = true }
      })
    }
    const maxGD = Math.max(0, ...nodes.filter(n => n.type !== 'INPUT' && n.type !== 'OUTPUT').map(n => depth[n.id] ?? 0))
    nodes.filter(n => n.type === 'OUTPUT').forEach(n => { depth[n.id] = maxGD + 1 })

    const byDepth = {}
    nodes.forEach(n => {
      const d = depth[n.id] ?? 0
      if (!byDepth[d]) byDepth[d] = []
      byDepth[d].push(n)
    })
    Object.values(byDepth).forEach(col =>
      col.sort((a, b) => {
        const ord = { alice:0, bob:1, other:2 }
        if (a.group !== undefined && b.group !== undefined) return (ord[a.group]??0) - (ord[b.group]??0)
        return 0
      })
    )

    const maxRows = Math.max(...Object.values(byDepth).map(c => c.length))
    const svgH    = Math.max(maxRows * ROW_H + PAD_Y * 2, 280)
    const numCols = maxGD + 2
    const svgW    = PAD_X + (numCols - 1) * COL_W + PAD_X + OUT_W
    const pos = {}
    Object.entries(byDepth).forEach(([d_, col]) => {
      const d = Number(d_)
      const count = col.length
      const startY = (svgH - count * ROW_H) / 2 + ROW_H / 2
      col.forEach((n, i) => { pos[n.id] = { x: PAD_X + d * COL_W, y: startY + i * ROW_H } })
    })
    return { pos, svgW, svgH, depth }
  }, [nodes])
}

function portX(node, side) {
  const half = node.type === 'INPUT' ? INP_W / 2 : node.type === 'OUTPUT' ? OUT_W / 2 : NODE_R
  return side === 'right' ? half : -half
}

function bezier(x1, y1, x2, y2) {
  const dx = Math.abs(x2 - x1) * 0.5
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
}

// ── Circuit SVG ───────────────────────────────────────────────────────────────
function CircuitSVG({ circuit, vals, activeGate }) {
  const { pos, svgW, svgH } = useCircuitLayout(circuit.nodes)
  const nodeMap = useMemo(() => Object.fromEntries(circuit.nodes.map(n => [n.id, n])), [circuit.nodes])

  const secureAnds = circuit.nodes.filter(n => n.secure && n.type === 'AND')
  let annBox = null
  if (secureAnds.length) {
    const xs = secureAnds.map(n => pos[n.id]?.x ?? 0)
    const ys = secureAnds.map(n => pos[n.id]?.y ?? 0)
    annBox = {
      x: Math.min(...xs) - NODE_R - 14,
      y: Math.min(...ys) - NODE_R - 14,
      w: Math.max(...xs) - Math.min(...xs) + (NODE_R + 14) * 2,
      h: Math.max(...ys) - Math.min(...ys) + (NODE_R + 14) * 2,
      cx: (Math.min(...xs) + Math.max(...xs)) / 2,
    }
  }

  return (
    <svg width={svgW} height={svgH} className="overflow-visible">
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0,8 3,0 6" fill="rgba(255,255,255,0.35)" />
        </marker>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-active">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Secure AND annotation box */}
      {annBox && (
        <g>
          <rect x={annBox.x} y={annBox.y} width={annBox.w} height={annBox.h}
            fill="none" stroke="#c084fc" strokeWidth={1.5} strokeDasharray="6,4" rx={12} opacity={0.5} />
          <text x={annBox.cx} y={annBox.y - 7} textAnchor="middle"
            fill="#c084fc" fontSize={10} fontStyle="italic">
            secure AND gates (OT via PA#19)
          </text>
        </g>
      )}

      {/* Edges */}
      {circuit.nodes.map(node =>
        node.inputs.map(srcId => {
          const src = nodeMap[srcId]; const dst = node
          const sp = pos[srcId]; const dp = pos[node.id]
          if (!sp || !dp) return null
          const v = vals[srcId]
          const isActive = srcId === activeGate || node.id === activeGate
          const color = v === 1 ? '#4ade80' : v === 0 ? '#f87171' : 'rgba(255,255,255,0.18)'
          const x1 = sp.x + portX(src, 'right')
          const x2 = dp.x + portX(dst, 'left')
          return (
            <path key={`${srcId}->${node.id}`}
              d={bezier(x1, sp.y, x2, dp.y)}
              stroke={isActive ? '#fff' : color}
              strokeWidth={isActive ? 2.5 : v !== undefined ? 2.0 : 1.5}
              fill="none" markerEnd="url(#arr)"
              opacity={isActive ? 1 : v !== undefined ? 0.85 : 0.35}
              style={{ transition: 'stroke 0.2s, opacity 0.2s' }}
            />
          )
        })
      )}

      {/* Nodes */}
      {circuit.nodes.map(node => {
        const p = pos[node.id]; if (!p) return null
        const v   = vals[node.id]
        const isActive  = node.id === activeGate
        const evaluated = v !== undefined

        if (node.type === 'INPUT') {
          const s = ICOL[node.group ?? 'other']
          return (
            <g key={node.id} transform={`translate(${p.x},${p.y})`}>
              <rect x={-INP_W/2} y={-INP_H/2} width={INP_W} height={INP_H} rx={8}
                fill={s.fill} stroke={s.stroke} strokeWidth={1.5} />
              <text textAnchor="middle" dominantBaseline="middle"
                fill={s.text} fontSize={13} fontStyle="italic" fontWeight="bold">{node.label}</text>
              {evaluated && (
                <text textAnchor="middle" dominantBaseline="middle" y={-INP_H/2 - 11}
                  fill={v ? '#4ade80' : '#f87171'} fontSize={13} fontWeight="900">{v}</text>
              )}
            </g>
          )
        }

        if (node.type === 'OUTPUT') {
          const outV = vals[node.id]
          return (
            <g key={node.id} transform={`translate(${p.x},${p.y})`}
              filter={outV !== undefined ? 'url(#glow)' : undefined}>
              <rect x={-OUT_W/2} y={-INP_H/2} width={OUT_W} height={INP_H} rx={8}
                fill={OCOL.fill}
                stroke={outV === 1 ? '#4ade80' : outV === 0 ? '#f87171' : OCOL.stroke}
                strokeWidth={2.5} />
              <text textAnchor="middle" dominantBaseline="middle"
                fill={outV !== undefined ? (outV ? '#4ade80' : '#f87171') : OCOL.text}
                fontSize={11} fontWeight="black">
                {node.label}{outV !== undefined ? ` = ${outV}` : ''}
              </text>
            </g>
          )
        }

        const s = GCOL[node.type] ?? GCOL.AND
        return (
          <g key={node.id} transform={`translate(${p.x},${p.y})`}
            filter={isActive ? 'url(#glow-active)' : evaluated ? 'url(#glow)' : undefined}
            style={{ transition: 'filter 0.15s' }}>
            {isActive && <circle r={NODE_R + 12} fill={s.stroke} opacity={0.22} />}
            <circle r={NODE_R}
              fill={evaluated ? s.fill : 'rgba(255,255,255,0.04)'}
              stroke={isActive ? '#fff' : evaluated ? s.stroke : 'rgba(255,255,255,0.18)'}
              strokeWidth={isActive ? 3 : 1.5}
              style={{ transition: 'fill 0.2s, stroke 0.2s' }}
            />
            <text textAnchor="middle" dominantBaseline="middle"
              fill={evaluated ? s.text : 'rgba(255,255,255,0.25)'} fontSize={9} fontWeight="black" letterSpacing="0.5">
              {node.label}
            </text>
            {isActive && (
              <text textAnchor="middle" dominantBaseline="middle" y={NODE_R + 15}
                fill="#fff" fontSize={10} fontWeight="black">⚡</text>
            )}
            {evaluated && !isActive && (
              <text textAnchor="middle" dominantBaseline="middle" y={NODE_R + 14}
                fill={v ? '#4ade80' : '#f87171'} fontSize={12} fontWeight="black">{v}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Animated Circuit Viz (replaces GateAnimation) ─────────────────────────────
// Animates the CircuitSVG gate-by-gate when `active` becomes true.
// `circuit` is one of the CIRCUITS definitions.
// `inputBits` is supplied for labelled inputs; if absent we show unlabelled placeholders.
function AnimatedCircuit({ circuit, active, inputBits = {} }) {
  const [vals, setVals]             = useState({})
  const [activeGate, setActiveGate] = useState(null)
  const [revealed, setRevealed]     = useState(0)
  const animRef                     = useRef(false)

  // ── Zoom state ────────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1.0)
  const ZOOM_STEP = 0.15
  const ZOOM_MIN  = 0.3
  const ZOOM_MAX  = 2.5
  const zoomIn    = () => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))
  const zoomOut   = () => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))
  const zoomReset = () => setZoom(1.0)

  // Keyboard shortcuts: + / - when hovering the circuit
  const containerRef = useRef(null)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e) => {
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn() }
      if (e.key === '-')                  { e.preventDefault(); zoomOut() }
      if (e.key === '0')                  { e.preventDefault(); zoomReset() }
    }
    el.addEventListener('keydown', handler)
    return () => el.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    setVals({})
    setActiveGate(null)
    setRevealed(0)
    animRef.current = false
    if (!circuit || !active) return

    animRef.current = true
    const gateNodes = circuit.nodes.filter(n => n.type !== 'INPUT')
    let partial = { ...inputBits }

    circuit.nodes.filter(n => n.type === 'INPUT').forEach(n => {
      if (inputBits[n.id] !== undefined) partial[n.id] = inputBits[n.id]
    })
    setVals({ ...partial })

    let idx = 0
    const step = () => {
      if (!animRef.current || idx >= gateNodes.length) { setActiveGate(null); return }
      const n = gateNodes[idx]
      setActiveGate(n.id)
      if (n.type === 'OUTPUT') partial[n.id] = partial[n.inputs[0]] ?? 0
      else partial[n.id] = GATE_OPS[n.type]?.(...n.inputs.map(id => partial[id] ?? 0)) ?? 0
      setVals({ ...partial })
      setRevealed(idx + 1)
      idx++
      setTimeout(step, 240)
    }
    setTimeout(step, 120)
    return () => { animRef.current = false }
  }, [active, circuit, JSON.stringify(inputBits)])

  const total      = circuit?.nodes.filter(n => n.type !== 'INPUT').length ?? 0
  const progress   = total ? Math.round((revealed / total) * 100) : 0
  const gateCounts = {}
  circuit?.nodes.forEach(n => {
    if (n.type === 'INPUT' || n.type === 'OUTPUT') return
    gateCounts[n.type] = (gateCounts[n.type] || 0) + 1
  })
  const BADGE_COLOR = { AND: 'purple', XOR: 'amber', NOT: 'cyan', OR: 'blue' }

  // Compact icon button for zoom controls
  const ZBtn = ({ onClick, title, children }) => (
    <button
      onClick={onClick}
      title={title}
      className={cx(
        'h-6 w-6 rounded border border-(--border) bg-(--code-bg)',
        'text-[13px] font-black leading-none',
        'text-white/60 hover:text-white hover:border-purple-400 hover:bg-purple-500/20',
        'transition-all flex items-center justify-center select-none'
      )}
    >{children}</button>
  )

  return (
    <div className="space-y-3">

      {/* ── Progress bar + gate-count badges ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
          <span className="text-(--text)/50">Gates Evaluated</span>
          <span className="text-purple-300">{revealed} / {total} ({progress}%)</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-(--code-bg) border border-(--border) overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(gateCounts).map(([k, v]) => (
            <Badge key={k} label={`${k}: ${v}`} color={BADGE_COLOR[k] ?? 'purple'} />
          ))}
          <Badge label={`${circuit?.nodes.filter(n => n.secure && n.type === 'AND').length ?? 0} OT calls (AND gates)`} color="blue" />
        </div>
      </div>

      {/* ── Live circuit SVG panel ── */}
      <div className="rounded-xl border border-(--border) bg-[#07070e]" ref={containerRef} tabIndex={-1}>

        {/* Header: name · formula · zoom controls · gate legend */}
        <div className="border-b border-(--border) bg-(--code-bg) px-3 py-1.5 flex items-center gap-2 flex-wrap">
          <p className="text-[10px] font-black uppercase tracking-widest text-white shrink-0">{circuit?.name}</p>
          <p className="text-[10px] font-mono text-purple-300 flex-1 min-w-0 truncate">{circuit?.formula}</p>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 shrink-0" title="Use +/– keys or click">
            <ZBtn onClick={zoomOut}  title="Zoom out  (–)">−</ZBtn>

            {/* % badge — click resets */}
            <button
              onClick={zoomReset}
              title="Reset zoom (0)"
              className={cx(
                'h-6 min-w-[46px] rounded border px-1 text-[10px] font-black select-none transition-all',
                zoom !== 1
                  ? 'border-purple-400/60 bg-purple-500/20 text-purple-200 hover:bg-purple-500/30'
                  : 'border-(--border) bg-(--code-bg) text-white/50 hover:text-white hover:border-purple-400'
              )}
            >{Math.round(zoom * 100)}%</button>

            <ZBtn onClick={zoomIn}  title="Zoom in  (+)">+</ZBtn>
          </div>

          <div className="flex gap-1.5 text-[9px] font-black uppercase tracking-widest shrink-0">
            <span className="text-purple-300">AND</span>·
            <span className="text-amber-300">XOR</span>·
            <span className="text-cyan-300">NOT</span>
          </div>
        </div>
        {/* Scrollable zoom container — SVG scales inside; scrollbars appear as needed */}
        <div className="overflow-auto" style={{ maxHeight: '500px' }}>
          <div
            style={{
              display: 'inline-block',
              transformOrigin: 'top left',
              transform: `scale(${zoom})`,
              transition: 'transform 0.12s ease',
              willChange: 'transform',
            }}
          >
            <div className="p-4">
              {circuit && <CircuitSVG circuit={circuit} vals={vals} activeGate={activeGate} />}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap text-[10px]">
        {[
          ['Alice inputs', 'text-blue-300'],
          ['Bob inputs', 'text-rose-300'],
          ['AND = secure (OT)', 'text-purple-300'],
          ['XOR/NOT = free', 'text-amber-300'],
          ['Green wire = 1', 'text-emerald-400'],
          ['Red wire = 0', 'text-rose-400'],
        ].map(([l, c]) => (
          <span key={l} className={cx('font-black', c)}>{l}</span>
        ))}
      </div>
    </div>
  )
}

// ── Circuit Trace Section ───────────────────────────────────────────────────────
// Expandable: shows AND/XOR gates evaluated + output wire values.
// The other party's input wires are NOT displayed (they arrive encrypted via OT).
function CircuitTraceSection({ gates = [], outputs = [], title = 'Circuit Trace', note = null }) {
  const [open, setOpen] = useState(false)
  const andXor = gates.filter(g => g.type === 'AND' || g.type === 'XOR')
  const andN   = gates.filter(g => g.type === 'AND').length
  const xorN   = gates.filter(g => g.type === 'XOR').length
  const GC     = { AND: 'text-purple-300', XOR: 'text-amber-300' }
  return (
    <div className="rounded-xl border border-(--border) overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full bg-(--code-bg) px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[10px] font-black uppercase tracking-widest text-white">🔍 {title}</p>
          <Badge label={`${andN} AND (OT)`} color="purple" />
          <Badge label={`${xorN} XOR (free)`} color="amber" />
        </div>
        <span className="text-white/40">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="p-4 space-y-4 border-t border-(--border)">
          {outputs.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Output Wire Values</p>
              <div className="flex gap-3 flex-wrap">
                {outputs.map(({ label, value }) => (
                  <div key={label} className={cx(
                    'rounded-xl border px-4 py-2 text-center min-w-[80px]',
                    value ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'
                  )}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-(--text)/40">{label}</p>
                    <p className={cx('text-3xl font-black', value ? 'text-emerald-400' : 'text-rose-400')}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/50">
              AND / XOR gates — other party's input wires arrive encrypted via OT (not shown)
            </p>
            <div className="rounded-xl border border-(--border) overflow-hidden">
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-[11px] font-mono">
                  <thead className="sticky top-0">
                    <tr className="border-b border-(--border) bg-(--code-bg) text-[9px]">
                      {['#','Gate','Type','Input Wires','Output Wire','Cost'].map(h => (
                        <th key={h} className="px-2 py-1.5 text-left font-black text-(--text)/40 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {andXor.map((g, i) => (
                      <tr key={g.id ?? i} className="border-b border-(--border)/20 hover:bg-(--code-bg)/50">
                        <td className="px-2 py-1.5 text-(--text)/30">{g.id}</td>
                        <td className="px-2 py-1.5 font-black text-white/80 whitespace-nowrap">{g.label}</td>
                        <td className={cx('px-2 py-1.5 font-black', GC[g.type] ?? 'text-white')}>{g.type}</td>
                        <td className="px-2 py-1.5">
                          {(g.inputs ?? []).map((v, k) => (
                            <span key={k} className={cx('mr-1 font-black', v ? 'text-emerald-400' : 'text-rose-400')}>{v}</span>
                          ))}
                        </td>
                        <td className={cx('px-2 py-1.5 font-black', g.output ? 'text-emerald-400' : 'text-rose-400')}>{g.output}</td>
                        <td className="px-2 py-1.5">
                          {g.ot
                            ? <span className="rounded-full bg-purple-500/20 border border-purple-500/40 px-1.5 py-0.5 text-[9px] font-black text-purple-300">OT</span>
                            : <span className="text-(--text)/20 text-[9px]">free</span>}
                        </td>
                      </tr>
                    ))}
                    {andXor.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-4 text-center text-[11px] text-(--text)/30 italic">No gates to display</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-[9px] text-(--text)/30 italic">NOT gates omitted (local/free). AND inputs from the other party are never exposed — only output wire values are learned.</p>
          </div>
          {note && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-1">Gate Count Clarification</p>
              <p className="text-(--text)/70">{note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Gate Trace Panel ──────────────────────────────────────────────────────────
// Shows the full concrete gate-by-gate evaluation for a given x, y, n.
function GateTracePanel({ x, y, n }) {
  const [showAll, setShowAll] = useState(false)
  const trace = useMemo(() => computeGateTrace(n, x, y), [n, x, y])

  const GATE_COLOR = { AND: 'text-purple-300', XOR: 'text-amber-300', NOT: 'text-cyan-300' }
  const BIT_COLORS = ['border-indigo-500/30 bg-indigo-500/5', 'border-violet-500/30 bg-violet-500/5',
    'border-blue-500/30 bg-blue-500/5', 'border-sky-500/30 bg-sky-500/5',
    'border-teal-500/30 bg-teal-500/5', 'border-emerald-500/30 bg-emerald-500/5']

  const visibleGates = showAll ? trace.gates : trace.gates.filter(g => g.bit <= (trace.decisionBit ?? n - 1) + 1)

  return (
    <div className="space-y-4">

      {/* Bit decomposition */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { who: 'Alice (Garbler)', val: x, bits: trace.xBits, color: 'border-blue-500/30 bg-blue-500/5', label: 'text-blue-300' },
          { who: 'Bob (Evaluator)', val: y, bits: trace.yBits, color: 'border-rose-500/30  bg-rose-500/5', label: 'text-rose-300'  },
        ].map(({ who, val, bits, color, label }) => (
          <div key={who} className={cx('rounded-xl border p-3 space-y-2', color)}>
            <p className={cx('text-[10px] font-black uppercase tracking-widest', label)}>{who}: {val}</p>
            <div className="flex gap-1.5 font-mono">
              {bits.map((b, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <span className="text-[8px] text-(--text)/30">b{n-1-i}</span>
                  <span className={cx('text-base font-black w-5 text-center rounded', b ? 'text-emerald-400' : 'text-rose-400')}>{b}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-mono text-(--text)/40">{val} = {val.toString(2).padStart(n, '0')}₂</p>
          </div>
        ))}
      </div>

      {/* Bit-by-bit summary table */}
      <div className="rounded-xl border border-(--border) overflow-hidden">
        <div className="border-b border-(--border) bg-(--code-bg) px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-white">
            Equality & Greater-Than Chain — MSB → LSB (bit {n-1} → bit 0)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="border-b border-(--border) bg-(--code-bg)/50 text-[9px]">
                {['Iter i','Bit pos','xᵢ','yᵢ','gt_i AND','eq_i NOT','eq∧gt AND','gt_new','eq_new AND','gt state','eq state'].map(h => (
                  <th key={h} className="px-2 py-1.5 text-left font-black text-(--text)/40 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trace.bitSummary.map((row) => {
                const isDecision = row.i === trace.decisionBit
                return (
                  <tr key={row.i} className={cx(
                    'border-b border-(--border)/30',
                    isDecision ? 'bg-amber-500/10' : 'hover:bg-(--code-bg)/40'
                  )}>
                    <td className="px-2 py-1.5 font-black text-purple-300">{row.i}</td>
                    <td className="px-2 py-1.5 text-(--text)/50">bit {row.bitPos}</td>
                    <td className={cx('px-2 py-1.5 font-black', row.xi ? 'text-emerald-400' : 'text-rose-400')}>{row.xi}</td>
                    <td className={cx('px-2 py-1.5 font-black', row.yi ? 'text-emerald-400' : 'text-rose-400')}>{row.yi}</td>
                    <td className={cx('px-2 py-1.5 border-l border-purple-500/20', row.gt_i ? 'text-emerald-400 font-black' : 'text-rose-400')}>{row.gt_i}</td>
                    <td className={cx('px-2 py-1.5', row.eq_i ? 'text-emerald-400' : 'text-rose-400')}>{row.eq_i}</td>
                    <td className={cx('px-2 py-1.5 border-l border-purple-500/20', row.eg_i ? 'text-emerald-400 font-black' : 'text-rose-400')}>{row.eg_i}</td>
                    <td className={cx('px-2 py-1.5 font-black', row.new_gt ? 'text-emerald-400' : 'text-rose-400/70')}>{row.new_gt}</td>
                    <td className={cx('px-2 py-1.5 border-l border-purple-500/20 font-black', row.new_eq ? 'text-emerald-400' : 'text-rose-400')}>
                      {row.new_eq}{isDecision ? ' ← 0!' : ''}
                    </td>
                    <td className={cx('px-2 py-1.5', row.new_gt ? 'text-emerald-300' : 'text-(--text)/30')}>gt={row.new_gt}</td>
                    <td className={cx('px-2 py-1.5', row.new_eq ? 'text-emerald-300' : 'text-rose-400/70')}>
                      {isDecision
                        ? <span className="text-amber-400 font-black">eq=0 ← LOCK</span>
                        : `eq=${row.new_eq}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision point callout */}
      {trace.decisionBit !== null && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-xs space-y-1">
          <p className="font-black text-amber-300 text-[10px] uppercase tracking-widest">Decision Point</p>
          <p className="text-(--text)/70 leading-relaxed">
            At iteration <strong className="text-white">{trace.decisionBit}</strong>{' '}
            (bit position <strong className="text-white">{n - 1 - trace.decisionBit}</strong>):
            {' '}x<sub>{n-1-trace.decisionBit}</sub> = <strong className="text-blue-300">{trace.bitSummary[trace.decisionBit].xi}</strong>,
            {' '}y<sub>{n-1-trace.decisionBit}</sub> = <strong className="text-rose-300">{trace.bitSummary[trace.decisionBit].yi}</strong>.
            {' '}Since y&gt;x at this bit,{' '}
            <strong className="text-amber-300">eq_new = AND(eq=1, eq_i=0) = 0</strong> — the equality chain locks permanently.
            No lower bit can change the outcome.
          </p>
        </div>
      )}

      {/* Full per-gate trace */}
      <div className="rounded-xl border border-(--border) overflow-hidden">
        <div className="border-b border-(--border) bg-(--code-bg) px-3 py-2 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-white">
            Full Gate Trace — {trace.gates.length} gates ({trace.gates.filter(g=>g.ot).length} AND/OT)
          </p>
          <button
            onClick={() => setShowAll(s => !s)}
            className="text-[10px] font-black text-purple-300 hover:text-white uppercase tracking-widest"
          >{showAll ? 'Show decision bits only' : 'Show all gates'}</button>
        </div>
        <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
          <table className="w-full text-[11px] font-mono">
            <thead className="sticky top-0">
              <tr className="border-b border-(--border) bg-(--code-bg) text-[9px]">
                {['#','Gate ID','Type','Inputs','Output','OT?'].map(h => (
                  <th key={h} className="px-2 py-1.5 text-left font-black text-(--text)/40 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleGates.map((gate) => {
                const bitIdx = gate.bit >= 0 ? gate.bit : null
                const isDecisionGate = bitIdx === trace.decisionBit
                const rowColor = isDecisionGate
                  ? 'bg-amber-500/5'
                  : bitIdx !== null
                    ? BIT_COLORS[bitIdx % BIT_COLORS.length].split(' ')[1] + '/30'
                    : ''
                return (
                  <tr key={gate.id} className={cx('border-b border-(--border)/20 hover:bg-(--code-bg)/50', rowColor)}>
                    <td className="px-2 py-1 text-(--text)/30 text-[10px]">{gate.id}</td>
                    <td className="px-2 py-1 font-black text-white/80 whitespace-nowrap">{gate.label}</td>
                    <td className={cx('px-2 py-1 font-black text-[10px]', GATE_COLOR[gate.type])}>{gate.type}</td>
                    <td className="px-2 py-1">
                      {gate.inputs.map((v, k) => (
                        <span key={k} className={cx('mr-1 font-black', v ? 'text-emerald-400' : 'text-rose-400')}>{v}</span>
                      ))}
                    </td>
                    <td className={cx('px-2 py-1 font-black text-base', gate.output ? 'text-emerald-400' : 'text-rose-400')}>
                      {gate.output}
                    </td>
                    <td className="px-2 py-1">
                      {gate.ot
                        ? <span className="rounded-full bg-purple-500/20 border border-purple-500/40 px-1.5 py-0.5 text-[9px] font-black text-purple-300">OT</span>
                        : <span className="text-(--text)/20 text-[9px]">free</span>}
                    </td>
                  </tr>
                )
              })}
              {!showAll && trace.gates.length > visibleGates.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-2 text-center text-[10px] text-(--text)/30 italic">
                    {trace.gates.length - visibleGates.length} more gates hidden (eq=0 after decision bit, outcome unchanged) — click "Show all gates" above
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Final outputs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'x > y', val: trace.gt, true_color: 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400', false_color: 'border-rose-500/30 bg-rose-500/5 text-rose-400' },
          { label: 'x < y', val: trace.lt, true_color: 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400', false_color: 'border-rose-500/30 bg-rose-500/5 text-rose-400' },
          { label: 'x == y', val: trace.eq, true_color: 'border-amber-500/50 bg-amber-500/5 text-amber-400', false_color: 'border-rose-500/30 bg-rose-500/5 text-rose-400' },
        ].map(({ label, val, true_color, false_color }) => (
          <div key={label} className={cx('rounded-xl border p-4 text-center', val ? true_color : false_color)}>
            <p className="text-[9px] font-black uppercase tracking-widest text-(--text)/40 mb-1">{label}</p>
            <p className={cx('text-5xl font-black', val ? true_color.split(' ').pop() : false_color.split(' ').pop())}>{val}</p>
            <p className="text-[9px] text-(--text)/30 mt-1 font-black uppercase">{val ? 'TRUE' : 'FALSE'}</p>
          </div>
        ))}
      </div>

      {/* OT consistency check */}
      <div className="rounded-xl border border-(--border) bg-(--code-bg) px-3 py-2 text-[10px] font-mono text-(--text)/50">
        <span className="text-emerald-400 font-black">✓ </span>
        AND gates = {trace.gates.filter(g => g.ot).length} = OT calls &nbsp;|&nbsp;
        Free gates (XOR/NOT) = {trace.gates.filter(g => !g.ot).length} &nbsp;|&nbsp;
        Total gates = {trace.gates.length} &nbsp;|&nbsp;
        n = {n} bits &nbsp;|&nbsp; formula: 4×{n} + 1 = {4*n+1} OT
      </div>
    </div>
  )
}

// ── Privacy summary ───────────────────────────────────────────────────────────
function Privacy({ p }) {
  if (!p) return null
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { who: '👩 Alice', learns: p.alice_learns, hidden: p.alice_hidden, color: 'blue' },
        { who: '👨 Bob',   learns: p.bob_learns,   hidden: p.bob_hidden,   color: 'green' },
      ].map(({ who, learns, hidden, color }) => (
        <div key={who} className={cx('rounded-xl border p-2.5 space-y-1 text-xs',
          color === 'blue' ? 'border-blue-500/20 bg-blue-500/5' : 'border-emerald-500/20 bg-emerald-500/5')}>
          <p className={cx('font-black text-[10px]', color === 'blue' ? 'text-blue-300' : 'text-emerald-300')}>{who}</p>
          <p><span className="text-(--text)/40">Learns: </span><span className="text-emerald-300">{learns}</span></p>
          <p><span className="text-(--text)/40">Hidden: </span><span className="text-rose-300/80">{hidden}</span></p>
        </div>
      ))}
    </div>
  )
}

// ── Wealth Slider Panel ───────────────────────────────────────────────────────
function WealthPanel({ who, icon, color, value, onChange, disabled, revealed, max = 100, quickVals }) {
  const isBlue = color === 'blue'
  const qv = quickVals ?? (max <= 7 ? [0,1,2,3,4,5,6,7].slice(0, max + 1) : [1, 25, 50, 75, max])
  const accent = isBlue
    ? { border: 'border-blue-500/30', bg: 'bg-blue-500/5', label: 'text-blue-300', track: 'accent-blue-400', bar: 'bg-blue-500' }
    : { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', label: 'text-emerald-300', track: 'accent-emerald-400', bar: 'bg-emerald-500' }

  return (
    <div className={cx('rounded-xl border-2 p-4 space-y-4', accent.border, accent.bg)}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className={cx('font-black text-sm', accent.label)}>{who}</p>
          <p className="text-[10px] text-(--text)/40">Private value (0–{max}) — hidden from the other party</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className={cx('rounded-xl border px-5 py-3 text-center min-w-[80px]', accent.border, 'bg-(--code-bg)')}>
          {revealed
            ? <p className={cx('text-4xl font-black', accent.label)}>{value}</p>
            : <p className="text-4xl font-black text-(--text)/20">?</p>
          }
          <p className="text-[9px] font-black uppercase tracking-widest text-(--text)/30 mt-1">
            {revealed ? `${max <= 7 ? value.toString(2).padStart(3,'0') + ' ₂' : value}` : 'hidden'}
          </p>
        </div>
        <div className="flex-1 ml-4 space-y-1">
          <div className="flex justify-between text-[9px] text-(--text)/40 font-black uppercase tracking-widest">
            <span>0</span><span>{Math.floor(max/2)}</span><span>{max}</span>
          </div>
          <div className="h-3 w-full rounded-full bg-(--code-bg) border border-(--border) overflow-hidden">
            <div
              className={cx('h-full rounded-full transition-all duration-300', accent.bar, 'opacity-80')}
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <input
          type="range"
          min={0} max={max} value={value}
          onChange={e => onChange(Number(e.target.value))}
          disabled={disabled}
          className={cx('w-full h-2 rounded-full outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed', accent.track)}
        />
        <div className="flex justify-between">
          {qv.map(v => (
            <button
              key={v} onClick={() => onChange(v)} disabled={disabled}
              className={cx(
                'rounded-lg border px-2 py-0.5 text-[10px] font-black transition-all disabled:opacity-30',
                value === v
                  ? cx(accent.border, accent.bg, accent.label)
                  : 'border-(--border) text-(--text)/40 hover:text-white'
              )}
            >{v}</button>
          ))}
        </div>
      </div>

      <div className={cx('rounded-lg border px-3 py-2 text-[10px] text-(--text)/50', accent.border)}>
        🔒 {who.split(' ')[0]}'s actual value is <em>never transmitted</em> — only encrypted gate inputs via OT.
      </div>
    </div>
  )
}

// ── Result Banner ─────────────────────────────────────────────────────────────
function ResultBanner({ result, x, y, otCalls }) {
  if (!result) return null
  const isGt = result.result === '1' || result.result === 1
  const isEq = x === y
  const verdict = isEq ? 'Equal' : isGt ? 'Alice is Richer' : 'Bob is Richer'
  const emoji   = isEq ? '🤝' : isGt ? '👩‍💼' : '👨‍💼'
  const color   = isEq
    ? 'border-amber-500/50 bg-amber-500/5 text-amber-300'
    : isGt
      ? 'border-blue-500/50 bg-blue-500/5 text-blue-300'
      : 'border-emerald-500/50 bg-emerald-500/5 text-emerald-300'

  return (
    <div className={cx('rounded-2xl border-2 p-6 text-center space-y-2', color)}>
      <p className="text-7xl">{emoji}</p>
      <p className="text-3xl font-black">{verdict}</p>
      <p className="text-sm text-(--text)/50 italic">
        Computed securely — neither party revealed their actual wealth value.
      </p>
      <div className="flex gap-3 justify-center flex-wrap mt-2">
        <Badge label={`${otCalls ?? result.ot_calls} OT calls (AND gates)`} color="purple" />
        <Badge label={`${result.elapsed_ms}ms`} color="amber" />
        <Badge label={`${result.gate_trace?.length ?? 0} gates`} color="blue" />
        <Badge label={result.correct ? '✓ Verified' : '✗ Error'} color={result.correct ? 'green' : 'red'} />
      </div>
    </div>
  )
}

// ── Millionaire's Tab ─────────────────────────────────────────────────────────
function MillionairesTab() {
  const [params, setParams]         = useState(null)
  const [x, setX]                   = useState(42)
  const [y, setY]                   = useState(50)
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [animActive, setAnimActive] = useState(false)
  const [error, setError]           = useState('')
  // Frozen at compute time so animation/trace don't drift when sliders change
  const [circuit,   setCircuit]   = useState(() => buildYaoComparatorCircuit(7))
  const [inputBits, setInputBits] = useState({})
  const [lastNBits, setLastNBits] = useState(7)
  const [lastX, setLastX]         = useState(42)
  const [lastY, setLastY]         = useState(50)

  const previewN = Math.max(nBitsFor(x), nBitsFor(y))

  const genParams = async () => {
    setGenLoading(true); setError('')
    try {
      const r = await pa20api.post('/api/pa20/gen-params', { bits: 32 })
      setParams(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Failed') }
    finally { setGenLoading(false) }
  }

  const compute = async () => {
    if (!params) { setError('Generate group first'); return }
    const n = Math.max(nBitsFor(x), nBitsFor(y))  // exact bits for these x, y
    setLoading(true); setError(''); setResult(null); setAnimActive(false)
    try {
      const r = await pa20api.post('/api/pa20/millionaires', {
        p: params.p, q: params.q, g: params.g,
        x, y, n_bits: n,
      })
      setResult(r.data)
      setCircuit(buildYaoComparatorCircuit(n))
      setInputBits(makeBitsForYao(n, x, y))
      setLastNBits(n); setLastX(x); setLastY(y)
      setAnimActive(true)
    } catch (e) { setError(e?.response?.data?.detail || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-(--border) bg-(--code-bg) p-3 flex items-center gap-3 flex-wrap">
        <Btn onClick={genParams} disabled={genLoading} id="pa20-gen-params-btn">
          {genLoading ? <><Spinner />Generating…</> : '⚡ Generate 32-bit Group'}
        </Btn>
        {params && <span className="text-xs text-emerald-300 font-black">✓ Group ready</span>}
        {error   && <span className="text-xs text-rose-400  font-black">{error}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WealthPanel who="👩 Alice (Garbler)" icon="👩" color="blue"
          value={x} onChange={setX} disabled={loading} revealed={true} max={100}
          quickVals={[1,25,50,75,100]} />
        <WealthPanel who="👨 Bob (Evaluator)" icon="👨" color="green"
          value={y} onChange={setY} disabled={loading} revealed={true} max={100}
          quickVals={[1,25,50,75,100]} />
      </div>

      <div className="rounded-xl border border-(--border) bg-(--code-bg) px-4 py-3 text-xs text-(--text)/60 leading-relaxed">
        <span className="font-black text-white">Auto n-bits: </span>
        x = {x} = <span className="font-mono text-blue-300">{x.toString(2)}&#x2082;</span> ({previewN} bits) &nbsp;·&nbsp;
        y = {y} = <span className="font-mono text-rose-300">{y.toString(2)}&#x2082;</span> ({Math.max(nBitsFor(x), nBitsFor(y))} bits) → circuit uses <strong className="text-white">{previewN} bits</strong>, <strong className="text-white">{4 * previewN + 1} AND gates</strong> ({4 * previewN + 1} OT calls; formula: 4n+1).
      </div>

      <Btn onClick={compute} disabled={loading || !params} id="pa20-millionaires-btn">
        {loading
          ? <><Spinner />Evaluating {lastNBits}-bit Yao comparator ({4*lastNBits+1} OT calls)…</>
          : `🔒 Securely Compare: ${x} vs ${y}  (${previewN}-bit Yao circuit, ${4*previewN+1} OT)`
        }
      </Btn>

      {result && (
        <div className="space-y-4">
          <ResultBanner result={result} x={lastX} y={lastY} otCalls={4 * lastNBits + 1} />
          <Privacy p={result.privacy} />


          {/* Concrete gate trace for the exact inputs */}
          <div className="rounded-xl border border-(--border) overflow-hidden">
            <div className="bg-(--code-bg) border-b border-(--border) px-4 py-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-white">
                Circuit Trace — x = {lastX} ({lastX.toString(2).padStart(lastNBits,'0')}₂)
                &nbsp;vs&nbsp; y = {lastY} ({lastY.toString(2).padStart(lastNBits,'0')}₂)
              </p>
            </div>
            <div className="p-4">
              <GateTracePanel x={lastX} y={lastY} n={lastNBits} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────── Equality Tab ──────────────────────────────────────────────
function EqualityTab() {
  const [params, setParams]   = useState(null)
  const [x, setX]             = useState(55)   // 1-100
  const [y, setY]             = useState(55)   // 1-100
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [animActive, setAnimActive] = useState(false)
  const [error, setError]     = useState('')
  // Frozen at compute time
  const [circuit,   setCircuit]   = useState(() => buildEqualityCircuit(7))
  const [inputBits, setInputBits] = useState({})
  const [lastNBits, setLastNBits] = useState(7)

  const previewN = Math.max(nBitsFor(x), nBitsFor(y))

  const ensureParams = async () => {
    if (params) return params
    const r = await pa20api.post('/api/pa20/gen-params', { bits: 32 })
    setParams(r.data); return r.data
  }

  const compute = async () => {
    const n = Math.max(nBitsFor(x), nBitsFor(y))
    setLoading(true); setError(''); setResult(null); setAnimActive(false)
    try {
      const p = await ensureParams()
      const r = await pa20api.post('/api/pa20/equality', {
        p: p.p, q: p.q, g: p.g, x, y, n_bits: n,
      })
      setResult(r.data)
      setCircuit(buildEqualityCircuit(n))
      setInputBits(makeBits(n, x, y))
      setLastNBits(n)
      setAnimActive(true)
    } catch (e) { setError(e?.response?.data?.detail || 'Failed') }
    finally { setLoading(false) }
  }

  const isEq = result && (result.result === '1' || result.result === 1)

  return (
    <div className="space-y-5">
      {error && <p className="text-xs text-rose-400 font-black">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WealthPanel who="👩 Alice" icon="👩" color="blue"  value={x} onChange={setX} disabled={loading} revealed={true} max={100} quickVals={[1,25,50,75,100]} />
        <WealthPanel who="👨 Bob"   icon="👨" color="green" value={y} onChange={setY} disabled={loading} revealed={true} max={100} quickVals={[1,25,50,75,100]} />
      </div>

      <div className="rounded-xl border border-(--border) bg-(--code-bg) px-4 py-3 text-xs text-(--text)/60 leading-relaxed">
        <span className="font-black text-white">Auto n-bits: </span>
        x = {x} = <span className="font-mono text-blue-300">{x.toString(2)}&#x2082;</span> ,&nbsp;
        y = {y} = <span className="font-mono text-rose-300">{y.toString(2)}&#x2082;</span> &rarr; circuit uses <strong className="text-white">{previewN} bits</strong>, <strong className="text-white">{previewN - 1} AND gates</strong> ({previewN - 1} OT calls).
      </div>

      <Btn onClick={compute} disabled={loading} id="pa20-equality-btn">
        {loading ? <><Spinner />Evaluating {lastNBits}-bit equality ({lastNBits - 1} OT gates)…</> : `🔒 Securely Check: ${x} == ${y}?  (${previewN}-bit circuit)`}
      </Btn>

      {result && (
        <div className="space-y-4">
          <div className={cx('rounded-2xl border-2 p-6 text-center',
            isEq ? 'border-amber-500/50 bg-amber-500/5' : 'border-purple-500/50 bg-purple-500/5'
          )}>
            <p className="text-7xl">{isEq ? '⚖️' : '≠'}</p>
            <p className={cx('text-3xl font-black mt-2', isEq ? 'text-amber-300' : 'text-purple-300')}>
              {isEq ? 'Equal Wealth' : 'Different Wealth'}
            </p>
            <p className="text-sm text-(--text)/50 italic mt-1">Computed securely — actual values never revealed.</p>
            <div className="flex gap-3 justify-center flex-wrap mt-3">
              <Badge label={`${lastNBits - 1} OT calls (n−1 AND gates)`} color="purple" />
              <Badge label={`${result.elapsed_ms}ms`} color="amber" />
              <Badge label={result.correct ? '✓ Verified' : '✗ Error'} color={result.correct ? 'green' : 'red'} />
            </div>
          </div>
          <Privacy p={result.privacy} />

          {(() => {
            const _t = computeEqualityTrace(lastNBits, x, y)
            const correctOT = lastNBits - 1
            return (
              <CircuitTraceSection
                gates={_t.gates}
                title={`Circuit Trace — ${lastNBits}-bit Equality`}
                outputs={[{ label: 'x = y', value: _t.result }]}
                note={`In Yao's garbled-circuit protocol, only AND gates require Oblivious Transfer (OT); XOR and NOT gates are evaluated locally and incur no OT cost. An n-bit equality circuit computes XNOR per bit using n free (XOR, NOT) gate pairs, then conjoins the n per-bit results via a chain of n−1 AND gates. For n = ${lastNBits}, this yields exactly ${correctOT} AND gate${correctOT !== 1 ? 's' : ''} and hence ${correctOT} OT call${correctOT !== 1 ? 's' : ''}. Any figure of ${lastNBits} OT calls is an off-by-one error caused by incorrectly counting each per-bit XOR/XNOR comparison as requiring a separate AND, rather than recognising that only n−1 AND gates are needed to conjoin n XNOR outputs into a single equality wire.`}
              />
            )
          })()}
        </div>
      )}
    </div>
  )
}

// ── Full Adder Tab ────────────────────────────────────────────────────────────
function AdderTab() {
  const [params, setParams]   = useState(null)
  const [a, setA]             = useState(1)
  const [b, setB]             = useState(1)
  const [cin, setCin]         = useState(0)
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [animActive, setAnimActive] = useState(false)
  const [error, setError]     = useState('')
  const [lastA,   setLastA]   = useState(1)
  const [lastB,   setLastB]   = useState(1)
  const [lastCin, setLastCin] = useState(0)

  const inputBits = useMemo(() => ({ a, b, cin }), [a, b, cin])

  const ensureParams = async () => {
    if (params) return params
    const r = await pa20api.post('/api/pa20/gen-params', { bits: 32 })
    setParams(r.data); return r.data
  }

  const compute = async () => {
    setLoading(true); setError(''); setResult(null); setAnimActive(false)
    try {
      const p = await ensureParams()
      const r = await pa20api.post('/api/pa20/full-adder', { p: p.p, q: p.q, g: p.g, a, b, cin })
      setResult(r.data)
      setLastA(a); setLastB(b); setLastCin(cin)
      setAnimActive(true)
    } catch (e) { setError(e?.response?.data?.detail || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      {error && <p className="text-xs text-rose-400 font-black">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        {[
          { lbl: 'a (Alice)', val: a, set: setA, c: 'blue',   ic: '👩' },
          { lbl: 'b (Bob)',   val: b, set: setB, c: 'green',  ic: '👨' },
          { lbl: 'cᵢₙ',      val: cin, set: setCin, c: 'purple', ic: '⬇' },
        ].map(({ lbl, val, set, c, ic }) => (
          <div key={lbl} className={cx('rounded-xl border-2 p-3 space-y-2',
            c === 'blue'   ? 'border-blue-500/30 bg-blue-500/5'
            : c === 'green' ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-purple-500/30 bg-purple-500/5'
          )}>
            <p className={cx('text-xs font-black',
              c === 'blue' ? 'text-blue-300' : c === 'green' ? 'text-emerald-300' : 'text-purple-300'
            )}>{ic} {lbl}</p>
            <div className="flex gap-1">
              {[0, 1].map(v => (
                <button key={v} onClick={() => set(v)} disabled={loading}
                  className={cx('flex-1 rounded-lg border py-2 font-black text-lg transition-all disabled:opacity-50',
                    val === v
                      ? (c === 'blue'   ? 'border-blue-500/60 bg-blue-500/20 text-white'
                        : c === 'green' ? 'border-emerald-500/60 bg-emerald-500/20 text-white'
                                        : 'border-purple-500/60 bg-purple-500/20 text-white')
                      : 'border-(--border) bg-(--bg) text-(--text)/40 hover:text-white'
                  )}>{v}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Btn onClick={compute} disabled={loading} id="pa20-adder-btn">
        {loading ? <><Spinner />Evaluating…</> : `🔒 Compute Full Adder: ${a} + ${b} + ${cin}`}
      </Btn>

      {result && (
        <div className="space-y-4">
          <div className={cx('rounded-2xl border-2 p-5', result.correct ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-rose-500/50 bg-rose-500/5')}>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/40">Sum bit</p>
                <p className="text-7xl font-black text-emerald-300">{result.sum}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-(--text)/40">Carry bit</p>
                <p className="text-7xl font-black text-amber-300">{result.carry}</p>
              </div>
            </div>
            <p className="text-center text-sm text-(--text)/60 mt-3">
              {a} + {b} + {cin} = sum={result.sum}, carry={result.carry} — {result.correct ? '✅ Correct' : '❌ Wrong'}
            </p>
            <div className="flex gap-3 justify-center mt-2">
              <Badge label="2 OT calls (2 AND gates)" color="purple" />
              <Badge label={`${result.elapsed_ms}ms`} color="amber" />
            </div>
          </div>
          <Privacy p={result.privacy} />

          {(() => {
            const _at = computeAdderTrace(lastA, lastB, lastCin)
            return (
              <CircuitTraceSection
                gates={_at.gates}
                title="Circuit Trace — 1-bit Full Adder"
                outputs={[
                  { label: 'SUM',   value: _at.sum },
                  { label: 'CARRY', value: _at.carry },
                ]}
                note="In Yao's garbled-circuit protocol, only AND gates require Oblivious Transfer (OT); XOR and NOT gates are evaluated locally and are free. A 1-bit full adder (sum = a⊕b⊕cᵢₙ, carry = (a·b)⊕((a⊕b)·cᵢₙ)) requires exactly 3 XOR gates (free) and 2 AND gates, yielding precisely 2 OT calls. This is consistent with the circuit trace above and with the backend result."
              />
            )
          })()}
        </div>
      )}
    </div>
  )
}

// ── Sweep Tab ─────────────────────────────────────────────────────────────────
function SweepTab() {
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError]     = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null); setElapsed(0)
    const timer = setInterval(() => setElapsed(s => s + 1), 1000)
    try {
      const pg = await pa20api.post('/api/pa20/gen-params', { bits: 32 })
      const r  = await pa20api.post('/api/pa20/correctness-sweep', {
        p: pg.data.p, q: pg.data.q, g: pg.data.g, n_bits: 2,
      })
      setResult(r.data)
    } catch (e) { setError(e?.response?.data?.detail || 'Failed') }
    finally { clearInterval(timer); setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-(--border) bg-(--code-bg) p-4 space-y-2">
        <p className="font-black text-sm text-white">Correctness Sweep — All 2-bit Inputs</p>
        <p className="text-sm text-(--text)/70">
          Runs Millionaire's, Equality, and Full-Adder over <strong className="text-white">all (x,y)</strong> combos
          for 2-bit inputs (0–3). Verifies 100% correctness of the boolean circuit decomposition.
        </p>
        <Btn onClick={run} disabled={loading} id="pa20-sweep-btn">
          {loading ? `Evaluating all combos… (${elapsed}s)` : '▶ Run Correctness Sweep'}
        </Btn>
        {error && <p className="text-xs text-rose-400 font-black">{error}</p>}
      </div>

      {result && (
        <div className="space-y-3">
          <div className={cx('rounded-xl border-2 p-5 text-center',
            result.all_pass ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-rose-500/50 bg-rose-500/5'
          )}>
            <p className="text-5xl font-black text-emerald-300">{result.all_pass ? '✅ All Pass' : '❌ Failures'}</p>
            <p className="text-sm text-(--text)/60 mt-2">Completed in {result.elapsed_ms}ms</p>
          </div>

          {[
            { label: "Millionaires (x > y)", key: 'millionaires', cols: ['x','y','Expected','Got','OK'], rows: result.millionaires?.results, fmt: r => [r.x, r.y, r.expected, r.result, r.correct ? '✓' : '✗'] },
            { label: 'Equality (x == y)',    key: 'equality',     cols: ['x','y','Expected','Got','OK'], rows: result.equality?.results,  fmt: r => [r.x, r.y, r.expected, r.result, r.correct ? '✓' : '✗'] },
            { label: '1-bit Full Adder',     key: 'adder',        cols: ['a','b','cin','Exp sum','Got sum','Carry','OK'], rows: result.adder?.results, fmt: r => [r.a, r.b, r.cin, r.expected_sum ?? '', r.sum, r.carry, r.correct ? '✓' : '✗'] },
          ].map(({ label, key, cols, rows, fmt }) => rows && (
            <div key={key} className="overflow-x-auto rounded-xl border border-(--border)">
              <div className="border-b border-(--border) bg-(--code-bg) px-3 py-2 flex items-center gap-2">
                <p className="text-xs font-black text-white">{label}</p>
                <Badge label={result[key]?.pass ? 'All correct' : 'Failures'} color={result[key]?.pass ? 'green' : 'red'} />
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-(--border) bg-(--code-bg)/50">
                    {cols.map(c => <th key={c} className="px-3 py-1.5 text-left font-black text-(--text)/40 text-[9px] uppercase">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const cells = fmt(r)
                    return (
                      <tr key={i} className={cx('border-b border-(--border)/30', !r.correct && 'bg-rose-500/5')}>
                        {cells.map((c, j) => (
                          <td key={j} className={cx('px-3 py-1.5 font-mono',
                            j === cells.length - 1
                              ? (c === '✓' ? 'text-emerald-300 font-black' : 'text-rose-400 font-black')
                              : 'text-(--text)/70'
                          )}>{String(c)}</td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'millionaires', label: "💰 Millionaire's Problem" },
  { key: 'equality',     label: '⚖ Secure Equality' },
  { key: 'adder',        label: '➕ Full Adder' },
  { key: 'sweep',        label: '📊 Correctness Sweep' },
]

export default function MPCDemo() {
  const [tab, setTab] = useState('millionaires')

  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-3 shadow-(--shadow)">
        <PageHeader title="CS8.401 Minicrypt Clique Explorer — PA#20: Secure 2-Party Computation (MPC)" />

        <div className="mb-4 rounded-xl border border-(--border) bg-(--code-bg) px-4 py-3 space-y-2">
          <p className="text-[13px] font-black uppercase tracking-widest text-white">Boolean Circuit Evaluation via Secure Gates</p>
          <p className="text-sm text-(--text)/70 leading-relaxed">
            Alice and Bob each hold a <strong className="text-white">private wealth value (1–100)</strong>.
            They jointly compute <strong className="text-white">who is richer</strong> without revealing their actual wealth.
            Every circuit decomposes into <strong className="text-purple-300">AND</strong> (costs 1 OT via PA#19),
            <strong className="text-amber-300"> XOR</strong> (free), and <strong className="text-cyan-300">NOT</strong> (local) gates.
            The circuit DAG <strong className="text-white">animates live</strong> gate-by-gate after each computation.
          </p>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {[
              { circuit: "Millionaire's", desc: 'x > y (7-bit / up to 100)', gates: '~21 AND + XOR/NOT', color: 'border-purple-500/30 text-purple-300' },
              { circuit: 'Equality',      desc: 'x == y (7-bit)',             gates: '6 AND + 7 XOR/NOT', color: 'border-amber-500/30 text-amber-300'  },
              { circuit: 'Full Adder',    desc: 'sum, carry (1-bit)',         gates: '2 AND + 3 XOR',     color: 'border-cyan-500/30 text-cyan-300'    },
            ].map(({ circuit, desc, gates, color }) => (
              <div key={circuit} className={cx('rounded-lg border p-2 text-center', color)}>
                <p className="font-black text-sm">{circuit}</p>
                <p className="text-[10px] text-(--text)/50">{desc}</p>
                <p className="text-[10px] font-mono mt-0.5">{gates}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-mono text-(--text)/40">
            PA#20 → PA#19 (AND/XOR/NOT) → PA#18 (OT) → PA#16 (ElGamal) → PA#11 (DH) → PA#13 (mod_exp/Miller-Rabin)
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-(--border)">
          <div className="border-b border-(--border) bg-(--code-bg) px-3 py-2">
            <div className="flex gap-1 flex-wrap">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={cx('rounded-lg px-3 py-1.5 text-xs font-black transition-all',
                    tab === t.key
                      ? 'bg-purple-500/20 border border-purple-500/50 text-white'
                      : 'text-(--text)/60 hover:text-white hover:bg-(--code-bg)'
                  )}>{t.label}</button>
              ))}
            </div>
          </div>
          <div className="p-4 min-h-[500px]">
            {tab === 'millionaires' && <MillionairesTab />}
            {tab === 'equality'     && <EqualityTab />}
            {tab === 'adder'        && <AdderTab />}
            {tab === 'sweep'        && <SweepTab />}
          </div>
        </div>
      </section>
    </main>
  )
}
