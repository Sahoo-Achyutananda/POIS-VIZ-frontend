const pa1OwfPrgExplanation = {
  id: 'pa1_owf_prg',
  title: 'PA1: OWF to PRG',
  summary:
    'This conversion shows how one-wayness can be transformed into pseudorandom expansion through standard hardness amplification constructions.',
  importantTerms: [
    {
      term: 'OWF',
      definition: 'A one-way function is easy to evaluate but computationally hard to invert.',
    },
    {
      term: 'Hardcore Bit',
      definition: 'A predicate of the input that remains unpredictable given the OWF output.',
    },
    {
      term: 'PRG',
      definition: 'A pseudorandom generator stretches a short uniform seed into a longer pseudorandom output.',
    },
  ],
  conversionSteps: [
    {
      name: '1. Begin with OWF security',
      explanation: 'Assume the base one-way function cannot be efficiently inverted.',
    },
    {
      name: '2. Extract unpredictability',
      explanation: 'Use the OWF output to derive hardcore information that an adversary cannot predict.',
    },
    {
      name: '3. Iterate to stretch',
      explanation: 'Repeat the process to output more bits than the seed length while preserving pseudorandomness.',
    },
  ],
  howConversionHappens: [
    'Column 1 computes the concrete OWF instance from the selected foundation and seed.',
    'Column 2 applies the OWF-to-PRG reduction argument and outputs expanded pseudorandom bits.',
    'Security intuition: a distinguisher for the PRG output can be turned into an inverter or predictor that breaks OWF-based assumptions.',
  ],
}

export default pa1OwfPrgExplanation
