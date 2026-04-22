export default function ConceptsTab({ foundation, sourcePrimitive, targetPrimitive, testsData, col2Data }) {
  return (
    <div className="bg-(--code-bg) px-3 py-3 text-left">
      <p className="my-1 text-sm text-(--text)">
        <strong>{foundation}</strong> to <strong>{sourcePrimitive}</strong> to <strong>{targetPrimitive}</strong>
      </p>
      <p className="my-1 text-sm text-(--text)">
        Security sketch: if an adversary breaks {targetPrimitive}, a reduction can chain back to {sourcePrimitive} and then to the {foundation} assumption.
      </p>
      <p className="my-1 text-sm text-(--text)">
        Randomness tests: {testsData?.summary?.passed_tests ?? 0}/{testsData?.summary?.total_tests ?? 0} passed.
      </p>

      {Array.isArray(col2Data?.steps) && col2Data.steps.length > 0 ? (
        <div className="mt-3 rounded-md border border-(--border) bg-(--bg) px-3 py-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-h)">Reduction Steps</p>
          <ul className="space-y-1">
            {col2Data.steps.map((step, idx) => (
              <li className="font-mono text-xs text-(--text)" key={`${step.from}-${step.to}-${idx}`}>
                {idx + 1}. {step.from} to {step.to} ({step.theorem})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
