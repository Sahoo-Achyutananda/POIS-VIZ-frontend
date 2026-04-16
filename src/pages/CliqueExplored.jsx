import PageHeader from '../components/PageHeader'

const CliqueExplored = () => {
  return (
    <main className="min-h-screen w-full bg-[#16171d] px-5 py-6 text-white md:px-4">
      <section className="mx-auto w-full max-w-6xl rounded-2xl border-2 border-[#2e303a] p-3 shadow-2xl">
        <PageHeader title="CS8.401 Minicrypt Clique Explorer - Detailed View" />
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
          <div className="rounded-full bg-purple-500/20 p-6">
            <svg className="h-16 w-16 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Clique Detailed Exploration</h2>
          <p className="max-w-md text-center text-gray-400">
            This module is currently under development. Soon, you will be able to trace every reduction
            from OWF to high-level primitives with interactive proofs and stack traces.
          </p>
          <button 
            onClick={() => window.history.back()}
            className="rounded-md bg-purple-600 px-6 py-2 font-semibold transition-all hover:bg-purple-500 hover:shadow-lg active:scale-95"
          >
            Go Back
          </button>
        </div>
      </section>
    </main>
  )
}

export default CliqueExplored
