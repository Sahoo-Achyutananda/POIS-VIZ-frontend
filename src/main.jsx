/* eslint-disable react-refresh/only-export-components */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import PageShell from './components/PageShell.jsx'
import PA1 from './pages/PA1.jsx'
import PA2 from './pages/PA2.jsx'
import CPAAttack from './pages/PA3/CPAAttack.jsx'
import CPAViz from './pages/PA3/CPAViz.jsx'
import PA4 from './pages/PA4/index.jsx'
import PA5Theory from './pages/PA5/PA5Theory.jsx'
import PA5CMAGame from './pages/PA5/PA5CMAGame.jsx'
import PA5LengthExtension from './pages/PA5/PA5LengthExtension.jsx'
import PA6Theory from './pages/PA6/PA6Theory.jsx'
import PA6Malleability from './pages/PA6/PA6Malleability.jsx'
import PA6CCAGame from './pages/PA6/PA6CCAGame.jsx'
import MDChainViewer from './pages/PA7/MDChainViewer.jsx'
import MDCollisionDemo from './pages/PA7/MDCollisionDemo.jsx'
import DLPHashDemo from './pages/PA8/DLPHashDemo.jsx'
import BirthdayAttackDemo from './pages/PA9/BirthdayAttackDemo.jsx'
import HMACDemo from './pages/PA10/HMACDemo.jsx'
import LengthExtensionDemo from './pages/PA10/LengthExtensionDemo.jsx'
import MillerRabinDemo from './pages/PA13/MillerRabinDemo.jsx'
import DHDemo from './pages/PA11/DHDemo.jsx'
import RSADemo from './pages/PA12/RSADemo.jsx'
import CRTDemo from './pages/PA14/CRTDemo.jsx'
import SignatureDemo from './pages/PA15/SignatureDemo.jsx'
import ElGamalDemo from './pages/PA16/ElGamalDemo.jsx'
import SigncryptDemo from './pages/PA17/SigncryptDemo.jsx'
import OTDemo from './pages/PA18/OTDemo.jsx'
import SecureGateDemo from './pages/PA19/SecureGateDemo.jsx'
import MPCDemo from './pages/PA20/MPCDemo.jsx'
import CliqueExplored from './pages/CliqueExplored.jsx'

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

const W = ({ children }) => <PageShell>{children}</PageShell>

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/pa1"                 element={<W><PA1 /></W>} />
        <Route path="/pa2"                 element={<W><PA2 /></W>} />
        <Route path="/pa3/cpa_basics"      element={<W><CPAViz /></W>} />
        <Route path="/pa3/cpa_attack"      element={<W><CPAAttack /></W>} />
        <Route path="/pa4"                 element={<W><PA4 /></W>} />
        <Route path="/pa5/basics"          element={<W><PA5Theory /></W>} />
        <Route path="/pa5/euf_cma_game"    element={<W><PA5CMAGame /></W>} />
        <Route path="/pa5/length_extension" element={<W><PA5LengthExtension /></W>} />
        <Route path="/pa6/basics"          element={<W><PA6Theory /></W>} />
        <Route path="/pa6/malleability"    element={<W><PA6Malleability /></W>} />
        <Route path="/pa6/cca_game"        element={<W><PA6CCAGame /></W>} />
        <Route path="/pa7/md_chain"        element={<W><MDChainViewer /></W>} />
        <Route path="/pa7/collision"       element={<W><MDCollisionDemo /></W>} />
        <Route path="/pa8/dlp_hash"        element={<W><DLPHashDemo /></W>} />
        <Route path="/pa9/birthday"        element={<W><BirthdayAttackDemo /></W>} />
        <Route path="/pa10/hmac"            element={<W><HMACDemo /></W>} />
        <Route path="/pa10/length-extension" element={<W><LengthExtensionDemo /></W>} />
        <Route path="/pa13/miller-rabin"     element={<W><MillerRabinDemo /></W>} />
        <Route path="/pa/13"                 element={<W><MillerRabinDemo /></W>} />
        <Route path="/pa11/dh-exchange"      element={<W><DHDemo /></W>} />
        <Route path="/pa/11"                 element={<W><DHDemo /></W>} />
        <Route path="/pa12/rsa"              element={<W><RSADemo /></W>} />
        <Route path="/pa/12"                 element={<W><RSADemo /></W>} />
        <Route path="/pa14/crt"              element={<W><CRTDemo /></W>} />
        <Route path="/pa/14"                 element={<W><CRTDemo /></W>} />
        <Route path="/pa15/signatures"       element={<W><SignatureDemo /></W>} />
        <Route path="/pa/15"                 element={<W><SignatureDemo /></W>} />
        <Route path="/pa16/elgamal"          element={<W><ElGamalDemo /></W>} />
        <Route path="/pa/16"                 element={<W><ElGamalDemo /></W>} />
        <Route path="/pa17/signcrypt"        element={<W><SigncryptDemo /></W>} />
        <Route path="/pa/17"                 element={<W><SigncryptDemo /></W>} />
        <Route path="/pa18/ot"               element={<W><OTDemo /></W>} />
        <Route path="/pa/18"                 element={<W><OTDemo /></W>} />
        <Route path="/pa19/gates"            element={<W><SecureGateDemo /></W>} />
        <Route path="/pa/19"                 element={<W><SecureGateDemo /></W>} />
        <Route path="/pa20/mpc"              element={<W><MPCDemo /></W>} />
        <Route path="/pa/20"                 element={<W><MPCDemo /></W>} />
        <Route path="/clique-explored"     element={<CliqueExplored />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
