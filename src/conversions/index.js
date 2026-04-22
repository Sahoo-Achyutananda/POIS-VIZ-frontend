import { buildConversionFlow } from './shared/flow'

const conversionFlowRegistry = {
  pa1: buildConversionFlow,
  pa2: buildConversionFlow,
}

export function getConversionFlowBuilder(conversionId) {
  return conversionFlowRegistry[conversionId] || null
}
