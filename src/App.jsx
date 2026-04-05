import Accordion from './components/Accordion'
import './App.css'
import { accordionData } from './data/accordian_data'

function App() {
  return (
    <>
      <section id="center">
        <div className="hero">
          <h1 className="m-0 text-5xl font-bold text-[var(--text-h)] md:text-4xl">POIS Project</h1>
        </div>
        <p className="text-base text-[var(--text)]/80">Principles of Information Security - Cryptographic Primitives</p>
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
