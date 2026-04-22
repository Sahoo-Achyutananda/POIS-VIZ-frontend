import { generateDLPHashFlow } from './src/conversions/pa8/flow.js'

const trace = [
  { m_hex: '0x01', z_out_hex: '0x0a', g_z_hex: '0x02', h_m_hex: '0x03' }
]
const params = { p: 11, g: 2, h_hat: 3 }

try {
  const result = generateDLPHashFlow(trace, params)
  console.log('Nodes count:', result.nodes.length)
  console.log('Edges count:', result.edges.length)
} catch (err) {
  console.error('Crash in generateDLPHashFlow:', err)
}
