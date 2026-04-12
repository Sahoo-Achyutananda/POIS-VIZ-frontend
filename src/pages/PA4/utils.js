// ---------------------------------------------------------------------------
// PA4 pure helper utilities
// ---------------------------------------------------------------------------

export function getErrorText(error) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (typeof error?.message === 'string') return error.message
  return 'Request failed'
}

export function shortHex(value) {
  if (!value) return 'N/A'
  return value.length > 20 ? `${value.slice(0, 8)}...${value.slice(-8)}` : value
}

export function toUtf8Bytes(input) {
  return new TextEncoder().encode(input)
}

export function fromUtf8Bytes(bytes) {
  return new TextDecoder().decode(bytes)
}

export function splitBlocks(bytes, blockSize = 16) {
  const blocks = []
  for (let i = 0; i < bytes.length; i += blockSize) {
    blocks.push(bytes.slice(i, i + blockSize))
  }
  return blocks
}

export function byteToBits(byteValue) {
  return byteValue.toString(2).padStart(8, '0').split('')
}

export function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function hexToBytes(hex) {
  if (!hex || typeof hex !== 'string' || hex.length % 2 !== 0) return new Uint8Array(0)
  const values = []
  for (let i = 0; i < hex.length; i += 2) {
    const parsed = Number.parseInt(hex.slice(i, i + 2), 16)
    if (Number.isNaN(parsed)) return new Uint8Array(0)
    values.push(parsed)
  }
  return new Uint8Array(values)
}

/**
 * Flip a single bit inside a ciphertext hex string.
 * bitInByte 0 = MSB (matches byteToBits representation).
 */
export function flipCipherBit(ciphertextHex, blockIndex, byteIndex, bitInByte) {
  const bytes = hexToBytes(ciphertextHex)
  if (!bytes.length) return ciphertextHex
  const absoluteByte = blockIndex * 16 + byteIndex
  if (absoluteByte >= bytes.length) return ciphertextHex
  const mutable = new Uint8Array(bytes)
  // bit 0 of byteToBits is the MSB (0x80), bit 7 is the LSB (0x01)
  mutable[absoluteByte] ^= (0x80 >> bitInByte)
  return bytesToHex(mutable)
}

export function resolveDemoBlockHex(block, idx) {
  const hex = bytesToHex(block)
  if (hex) return hex
  return `block-${idx}`
}
