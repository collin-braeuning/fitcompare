/**
 * Collapses duplicate integer (x, y) pairs into weighted points.
 *
 * A pooled batch scatter can carry tens of thousands of pairs that only take
 * a few hundred distinct integer bpm combinations — heart rate is reported in
 * whole beats per minute, so `(112, 110)` recorded 40 times is the same point
 * plotted 40 times on top of itself. `scatterStyle`'s fixed 8px marker would
 * render that as a solid blob no denser-looking than a single point.
 * Collapsing and sizing by multiplicity is exact (every input pair is
 * accounted for in some `count`), not a downsampling approximation.
 */

export interface WeightedPair {
  x: number
  y: number
  count: number
}

/** Collapse duplicate pairs, summing their counts. Order is by first occurrence. */
export function collapsePairs(pairs: Iterable<readonly [number, number]>): WeightedPair[] {
  const order: string[] = []
  const byKey = new Map<string, WeightedPair>()

  for (const [x, y] of pairs) {
    const key = `${x},${y}`
    const existing = byKey.get(key)
    if (existing) {
      existing.count++
    } else {
      byKey.set(key, { x, y, count: 1 })
      order.push(key)
    }
  }

  return order.map((key) => byKey.get(key)!)
}
