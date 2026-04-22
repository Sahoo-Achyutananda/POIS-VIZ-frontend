import CliqueExplorerLayout from '../components/explorer/CliqueExplorerLayout'

const PA1_CONVERSION_OPTIONS = [
  {
    key: 'owf-to-prg',
    label: 'OWF to PRG',
    sourcePrimitive: 'OWF',
    targetPrimitive: 'PRG',
  },
  {
    key: 'prg-to-owf',
    label: 'PRG to OWF',
    sourcePrimitive: 'PRG',
    targetPrimitive: 'OWF',
  },
]

export default function PA1() {
  return (
    <CliqueExplorerLayout
      conversionId="pa1"
      pageTitle="CS8.401 Minicrypt Clique Explorer - PA1"
      conversionOptions={PA1_CONVERSION_OPTIONS}
      defaultConversionKey="owf-to-prg"
    />
  )
}
