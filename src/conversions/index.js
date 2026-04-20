import { buildConversionFlow } from './shared/flow'
import { buildCliqueFlow } from './cliqueExplorer/flow'
import { buildGGMFlow } from './pa2/ggmFlow'

const conversionFlowRegistry = {
  pa1: buildConversionFlow,
  pa2: buildConversionFlow,
  'pa2-ggm': buildGGMFlow,
  'clique-explorer': buildCliqueFlow,
}

export function getConversionFlowBuilder(conversionId) {
  return conversionFlowRegistry[conversionId] || null
}
