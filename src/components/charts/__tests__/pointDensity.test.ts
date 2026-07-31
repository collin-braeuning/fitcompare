import { describe, it, expect } from 'vitest'
import { collapsePairs } from '../pointDensity'

describe('collapsePairs', () => {
  it('collapses duplicates with the correct counts', () => {
    const pairs: Array<[number, number]> = [
      [1, 2],
      [1, 2],
      [3, 4],
      [1, 2],
    ]
    expect(collapsePairs(pairs)).toEqual([
      { x: 1, y: 2, count: 3 },
      { x: 3, y: 4, count: 1 },
    ])
  })

  it('preserves total count: sum of counts equals input length', () => {
    const pairs: Array<[number, number]> = [
      [1, 1],
      [1, 1],
      [2, 2],
      [3, 3],
      [3, 3],
      [3, 3],
    ]
    const result = collapsePairs(pairs)
    const total = result.reduce((sum, p) => sum + p.count, 0)
    expect(total).toBe(pairs.length)
  })

  it('passes unique input through unchanged with count 1', () => {
    const pairs: Array<[number, number]> = [
      [1, 1],
      [2, 2],
      [3, 3],
    ]
    expect(collapsePairs(pairs)).toEqual([
      { x: 1, y: 1, count: 1 },
      { x: 2, y: 2, count: 1 },
      { x: 3, y: 3, count: 1 },
    ])
  })

  it('orders output by first occurrence, deterministically', () => {
    const pairs: Array<[number, number]> = [
      [5, 5],
      [1, 1],
      [5, 5],
      [3, 3],
      [1, 1],
    ]
    expect(collapsePairs(pairs).map((p) => [p.x, p.y])).toEqual([
      [5, 5],
      [1, 1],
      [3, 3],
    ])
  })

  it('returns an empty array for empty input', () => {
    expect(collapsePairs([])).toEqual([])
  })

  it('distinguishes negative and positive coordinates that could collide as strings', () => {
    // Guards against a naive `${x}${y}` key (no separator) confusing (-1, 2) with (1, -2), etc.
    const pairs: Array<[number, number]> = [
      [-1, 2],
      [1, -2],
      [1, 2],
    ]
    const result = collapsePairs(pairs)
    expect(result).toHaveLength(3)
    expect(result.every((p) => p.count === 1)).toBe(true)
  })
})
