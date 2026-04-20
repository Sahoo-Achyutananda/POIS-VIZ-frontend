import { useNavigate } from 'react-router-dom'
import Accordion from './components/Accordion'
import './App.css'
import { accordionData } from './data/accordian_data'
import CliqueGraph from './components/CliqueGraph'

function CliqueExplorerBar() {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate('/clique-explorer')}
      className="group w-full overflow-hidden rounded-md border border-amber-500/30 bg-amber-500/5 px-5 py-4 text-left transition-all duration-200 hover:border-amber-400/60 hover:bg-amber-500/10 hover:shadow-[0_0_18px_rgba(251,191,36,0.08)]"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400/70">Unified Explorer</span>
          </div>
          <h3 className="m-0 text-lg font-semibold text-amber-100/90 group-hover:text-amber-50">
            Minicrypt Clique Explorer
          </h3>
          <p className="mt-1 text-sm text-amber-200/40 group-hover:text-amber-200/55 transition-colors">
            OWF → PRG → PRF → PRP → MAC → CRHF → HMAC — select any source and target, see the full reduction chain live
          </p>
        </div>
        <span className="shrink-0 text-xl text-amber-400/60 group-hover:text-amber-300 transition-all duration-200 group-hover:translate-x-1">
          →
        </span>
      </div>
    </button>
  )
}

function App() {
  return (
    <>
      <section className="grid-bg relative border-b border-[var(--border)] py-16 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-12 px-5 lg:flex-row lg:px-8">
          {/* Left Column: Text */}
          <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">
            <h1 className="m-0 bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-6xl font-extrabold text-transparent md:text-5xl lg:text-7xl">
              POIS Project
            </h1>
            <p className="mt-4 max-w-xl text-lg font-medium text-[var(--text)]/90 lg:text-xl">
              Principles of Information Security - <span className="text-purple-400">Cryptographic Primitives Explorer</span>
            </p>
            <p className="mt-6 max-w-lg text-base text-[var(--text)]/70">
              Interactive demonstrations of One-Way Functions, PRGs, PRFs, and higher-level constructions that form the foundation of modern cryptography.
            </p>
          </div>

          {/* Right Column: Interactive Graph */}
          <div className="flex flex-1 items-center justify-center lg:justify-end">
            <div className="w-full max-w-[550px]">
              <CliqueGraph />
            </div>
          </div>
        </div>
      </section>

      <div className="ticks"></div>

      <section className="mx-auto w-full max-w-6xl px-5 py-8 md:px-4">
        <div className="space-y-3">
          <CliqueExplorerBar />
          {accordionData.map((item, idx) => (
            <Accordion
              key={idx}
              title={item.title}
              subtitle={item.subtitle}
              subItems={item.subItems}
            />
          ))}
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
