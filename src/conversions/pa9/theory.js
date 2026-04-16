/**
 * PA #9 — Pure-JS birthday attack theory helpers.
 * No API calls needed — the theoretical CDF is computed client-side.
 */

/**
 * Compute the theoretical birthday CDF:
 *   P(collision within k queries) ≈ 1 − e^{−k(k−1) / (2·N)}
 * where N = 2^n_bits.
 *
 * Returns an array of { k, probability } for charting.
 */
export function theoreticalCDF(n_bits, pointCount = 200) {
  const N = Math.pow(2, n_bits)
  const bound = Math.sqrt(N)               // birthday bound 2^(n/2)
  const maxK  = Math.min(N, bound * 4)     // stop at 4× birthday bound

  const step = Math.max(1, Math.floor(maxK / pointCount))
  const points = []

  for (let k = 0; k <= maxK; k += step) {
    const p = 1 - Math.exp((-k * (k - 1)) / (2 * N))
    points.push({ k, probability: Math.min(1, p) })
  }

  // Always include exact k = maxK
  if (points[points.length - 1]?.k !== maxK) {
    const p = 1 - Math.exp((-maxK * (maxK - 1)) / (2 * N))
    points.push({ k: maxK, probability: Math.min(1, p) })
  }

  return points
}

/**
 * Expected birthday bound: sqrt(2^n) = 2^(n/2)
 */
export function birthdayBound(n_bits) {
  return Math.round(Math.sqrt(Math.pow(2, n_bits)))
}

/**
 * Build empirical CDF from an array of collision iteration counts.
 * Returns [{ k, probability }] matching the x-axis of theoreticalCDF.
 */
export function empiricalCDF(counts, n_bits, pointCount = 200) {
  if (!counts || counts.length === 0) return []
  const N     = Math.pow(2, n_bits)
  const bound = Math.sqrt(N)
  const maxK  = Math.min(N, bound * 4)
  const step  = Math.max(1, Math.floor(maxK / pointCount))
  const total = counts.length
  const sorted = [...counts].sort((a, b) => a - b)

  const points = []
  for (let k = 0; k <= maxK; k += step) {
    // fraction of trials that found collision by step k
    let hits = 0
    for (const c of sorted) {
      if (c <= k) hits++
      else break
    }
    points.push({ k, probability: hits / total })
  }
  return points
}

/**
 * MD5 / SHA-1 context data for the educational panel.
 * Assumes 10^9 hashes/second CPU throughput.
 */
const HASHES_PER_SEC = 1e9
const SECS_PER_YEAR  = 365.25 * 24 * 3600

export function md5Context() {
  const n = 128
  const bound = Math.pow(2, n / 2)  // 2^64
  const seconds = bound / HASHES_PER_SEC
  const years   = seconds / SECS_PER_YEAR
  return {
    name:   'MD5',
    n_bits: n,
    boundLabel:   '2⁶⁴ ≈ 1.84 × 10¹⁹',
    years:  years.toExponential(2),
    note:   'Wang et al. found practical MD5 collisions in 2004 using differential cryptanalysis — far cheaper than brute-force birthday.',
  }
}

export function sha1Context() {
  const n = 160
  const bound = Math.pow(2, n / 2)  // 2^80
  const seconds = bound / HASHES_PER_SEC
  const years   = seconds / SECS_PER_YEAR
  return {
    name:   'SHA-1',
    n_bits: n,
    boundLabel:   '2⁸⁰ ≈ 1.21 × 10²⁴',
    years:  years.toExponential(2),
    note:   'SHAttered (2017) found the first SHA-1 collision in ~6,500 CPU-years equivalent. Deprecated in certificates since 2017.',
  }
}
