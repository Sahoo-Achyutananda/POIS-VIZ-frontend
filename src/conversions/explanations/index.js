import pa2PrgPrfExplanation from './pa2_prg_prf'
import pa1OwfPrgExplanation from './pa1_owf_prg'
import pa1PrgOwfExplanation from './pa1_prg_owf'

const explanationRegistry = {
  pa2_prg_prf: pa2PrgPrfExplanation,
  pa1_owf_prg: pa1OwfPrgExplanation,
  pa1_prg_owf: pa1PrgOwfExplanation,
}

function normalizePrimitive(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

export function getExplanationKey({ conversionId, sourcePrimitive, targetPrimitive }) {
  const source = normalizePrimitive(sourcePrimitive)
  const target = normalizePrimitive(targetPrimitive)
  if (!conversionId || !source || !target) return null
  return `${conversionId}_${source}_${target}`
}

export function getConversionExplanation(context = {}) {
  const key = getExplanationKey(context)
  if (!key) return { key: null, data: null }
  return {
    key,
    data: explanationRegistry[key] || null,
  }
}
