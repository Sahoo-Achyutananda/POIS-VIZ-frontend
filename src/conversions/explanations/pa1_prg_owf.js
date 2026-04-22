const pa1PrgOwfExplanation = {
  id: 'pa1_prg_owf',
  title: 'PA1: PRG to OWF',
  summary:
    'This conversion interprets a secure pseudorandom generator as yielding a one-way function by using output truncation and inversion hardness.',
  importantTerms: [
    {
      term: 'PRG',
      definition: 'A pseudorandom generator maps short seeds to longer outputs that look random.',
    },
    {
      term: 'Output Truncation',
      definition: 'A transformation that keeps part of the generator output to define a candidate one-way mapping.',
    },
    {
      term: 'OWF from PRG',
      definition: 'If inversion of the derived map were easy, it would imply non-trivial structure that contradicts PRG security.',
    },
  ],
  conversionSteps: [
    {
      name: '1. Start with secure PRG',
      explanation: 'Use the PRG output computed in Column 1 as the source object.',
    },
    {
      name: '2. Define derived function',
      explanation: 'Construct a function from PRG behavior, commonly by truncation or related transformation.',
    },
    {
      name: '3. Argue inversion hardness',
      explanation: 'Show that efficient inversion would lead to a contradiction with PRG pseudorandomness.',
    },
  ],
  howConversionHappens: [
    'Column 1 builds a concrete PRG output from the chosen seed and extension length.',
    'Column 2 treats this source output as input to the PRG-to-OWF reduction chain.',
    'Each displayed reduction step updates the intermediate value and ends at the OWF target node.',
  ],
}

export default pa1PrgOwfExplanation
