import { getConversionExplanation } from '../../conversions/explanations'

function Section({ title, children }) {
  return (
    <section className="rounded-md border border-(--border) bg-(--bg) px-3 py-2">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-h)">{title}</h4>
      {children}
    </section>
  )
}

export default function ExplanationTab({ conversionId, conversionContext }) {
  const { key, data } = getConversionExplanation({
    conversionId,
    sourcePrimitive: conversionContext?.sourcePrimitive,
    targetPrimitive: conversionContext?.targetPrimitive,
  })

  if (!data) {
    return (
      <div className="bg-(--code-bg) px-3 py-6 text-sm text-(--text)">
        No explanation data found for this conversion.
        <div className="mt-1 font-mono text-xs text-(--text)">Expected key: {key || 'N/A'}</div>
      </div>
    )
  }

  return (
    <div className="space-y-3 bg-(--code-bg) px-3 py-3 text-left">
      <div>
        <h3 className="text-sm font-bold text-(--text-h)">{data.title}</h3>
        <p className="mt-1 text-sm text-(--text)">{data.summary}</p>
      </div>

      {Array.isArray(data.importantTerms) && data.importantTerms.length > 0 ? (
        <Section title="Important Terms">
          <div className="space-y-2">
            {data.importantTerms.map((item) => (
              <div key={item.term}>
                <p className="text-sm font-semibold text-(--text-h)">{item.term}</p>
                <p className="text-sm text-(--text)">{item.definition}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {Array.isArray(data.conversionSteps) && data.conversionSteps.length > 0 ? (
        <Section title="How Conversion Happens">
          <ol className="space-y-2">
            {data.conversionSteps.map((step) => (
              <li className="text-sm text-(--text)" key={step.name}>
                <span className="font-semibold text-(--text-h)">{step.name}</span>
                <span>: {step.explanation}</span>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {Array.isArray(data.howConversionHappens) && data.howConversionHappens.length > 0 ? (
        <Section title="Notes">
          <ul className="space-y-1">
            {data.howConversionHappens.map((line) => (
              <li className="text-sm text-(--text)" key={line}>
                {line}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  )
}
