import ConceptsTab from './ConceptsTab'
import ConversionFlowTab from './ConversionFlowTab'
import ExplanationTab from './ExplanationTab'

const TABS = [
  { key: 'concepts', label: 'Concepts and Words' },
  { key: 'explanation', label: 'Explanation' },
  { key: 'visual', label: 'Visual Conversion Flow' },
]

export default function SummaryTabs({
  activeTab,
  onTabChange,
  conversionId,
  conversionContext,
  testsData,
}) {
  return (
    <section className="mt-3 overflow-hidden rounded-lg border border-(--border)">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--border) bg-(--code-bg) px-3 py-2">
        <h3 className="m-0 text-sm font-bold text-(--text-h)">Reduction Chain Summary</h3>
        <div className="inline-flex rounded-md border border-(--border) bg-(--bg) p-1">
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-(--accent-bg) text-(--text-h)'
                  : 'text-(--text) hover:bg-(--social-bg)'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'concepts' ? (
        <ConceptsTab
          foundation={conversionContext?.foundation}
          sourcePrimitive={conversionContext?.sourcePrimitive}
          targetPrimitive={conversionContext?.targetPrimitive}
          testsData={testsData}
          col2Data={conversionContext?.col2Data}
        />
      ) : activeTab === 'explanation' ? (
        <ExplanationTab conversionId={conversionId} conversionContext={conversionContext} />
      ) : (
        <ConversionFlowTab conversionId={conversionId} conversionContext={conversionContext} />
      )}
    </section>
  )
}
