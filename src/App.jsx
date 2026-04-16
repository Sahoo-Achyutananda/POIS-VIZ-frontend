import Accordion from './components/Accordion'
import './App.css'
import { accordionData } from './data/accordian_data'
import CliqueGraph from './components/CliqueGraph'

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
