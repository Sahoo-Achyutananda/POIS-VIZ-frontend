/* eslint-disable react-refresh/only-export-components */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import PA1 from './pages/PA1.jsx'
import PA2 from './pages/PA2.jsx'
import CPAAttack from './pages/PA3/CPAAttack.jsx'
import CPAViz from './pages/PA3/CPAViz.jsx'
import PA4 from './pages/PA4.jsx'

const Part1 = () => <div style={{ padding: '40px', textAlign: 'center', minHeight: '100vh' }}><h1>Part I - Symmetric Key Cryptography</h1></div>
const Part2 = () => <div style={{ padding: '40px', textAlign: 'center', minHeight: '100vh' }}><h1>Part II - Public-Key Cryptography</h1></div>
const Part3 = () => <div style={{ padding: '40px', textAlign: 'center', minHeight: '100vh' }}><h1>Part III - Secure MPC</h1></div>
const Part4 = () => <div style={{ padding: '40px', textAlign: 'center', minHeight: '100vh' }}><h1>Part IV - Advanced Topics</h1></div>
const Part5 = () => <div style={{ padding: '40px', textAlign: 'center', minHeight: '100vh' }}><h1>Part V - Implementation</h1></div>

const PAView = () => {
  const { id } = useParams()

  return (
    <div style={{ padding: '40px', textAlign: 'center', minHeight: '100vh' }}>
      <h1>{`PA #${id}`}</h1>
      <p>Detailed page coming soon.</p>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/pa1" element={<PA1 />} />
        <Route path="/pa2" element={<PA2 />} />
        <Route path="/pa3/cpa_basics" element={<CPAViz />} />
        <Route path="/pa3/cpa_attack" element={<CPAAttack />} />
        <Route path="/pa4" element={<PA4 />} />
        <Route path="/part-1" element={<Part1 />} />
        <Route path="/part-2" element={<Part2 />} />
        <Route path="/part-3" element={<Part3 />} />
        <Route path="/part-4" element={<Part4 />} />
        <Route path="/part-5" element={<Part5 />} />
        <Route path="/pa/:id" element={<PAView />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
