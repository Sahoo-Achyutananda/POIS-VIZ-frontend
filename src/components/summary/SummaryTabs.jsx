import ConceptsTab from './ConceptsTab'
import ConversionFlowTab from './ConversionFlowTab'
import ExplanationTab from './ExplanationTab'
import Tabs from '../Tabs'

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
        <Tabs tabs={TABS} activeTab={activeTab} onTabChange={onTabChange} />
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
