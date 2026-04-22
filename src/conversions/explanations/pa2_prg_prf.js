const pa2PrgPrfExplanation = {
  id: 'pa2_prg_prf',
  title: 'PA2: PRG to PRF (GGM Route)',
  summary:
    'This flow first computes a concrete PRG instance from the selected foundation, then reduces PRG security to PRF security through a known construction path.',
  importantTerms: [
    {
      term: 'Foundation',
      definition: 'The base hardness assumption or primitive, such as AES or DLP, used to instantiate concrete functions.',
    },
    {
      term: 'Seed s',
      definition: 'The initial input used by OWF/PRG in Column 1.',
    },
    {
      term: 'Extension length l',
      definition: 'The number of extra output bits requested from the PRG expansion process.',
    },
    {
      term: 'Query bits x',
      definition: 'The query string used by the reduction chain to derive step-wise outputs.',
    },
    {
      term: 'Reduction step',
      definition: 'A theorem-backed transformation from one primitive guarantee to another.',
    },
  ],
  conversionSteps: [
    {
      name: '1. Build OWF/PRG instance',
      explanation: 'Column 1 computes OWF(seed) and then PRG output using the selected foundation.',
    },
    {
      name: '2. Feed source instance to reduction',
      explanation: 'Column 2 starts from the concrete source output produced in Column 1.',
    },
    {
      name: '3. Apply route theorems',
      explanation: 'Each edge in the route applies a named theorem and produces a new intermediate value.',
    },
    {
      name: '4. Emit target output',
      explanation: 'The final reduction output is interpreted as the target primitive value.',
    },
  ],
  howConversionHappens: [
    'The visualization connects value flow explicitly: source output, intermediate reductions, and final target output.',
    'Side input nodes such as l and query bits are parameters that influence construction behavior.',
    'Each step output node records the value passed to the next reduction block.',
  ],
}

export default pa2PrgPrfExplanation
