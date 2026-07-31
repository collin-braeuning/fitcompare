import { describe, it, expect, vi } from 'vitest'
import { loadBatch, type BatchSource } from '../loadBatch'
import type { LoadedFile } from '../../fit-file'

vi.mock('../../fit-file/loadFitFile', () => ({
  parseFitBuffer: vi.fn(async (_buffer: ArrayBuffer, name: string) => {
    if (name.includes('fail')) throw new Error(`boom: ${name}`)
    return { fileName: name, activity: {} } as unknown as LoadedFile
  }),
}))

function neverStale() {
  return false
}

function source(name: string, delayMs = 0, onRead?: () => void): BatchSource {
  return {
    name,
    read: async () => {
      onRead?.()
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))
      return new ArrayBuffer(0)
    },
  }
}

describe('loadBatch', () => {
  it('calls onStart once and onLoaded once per source, in full', async () => {
    const sources = [source('a'), source('b'), source('c')]
    const started: string[] = []
    const loaded: string[] = []

    await loadBatch(sources, {
      onStart: (name) => started.push(name),
      onLoaded: (name) => loaded.push(name),
      onError: () => {},
      isStale: neverStale,
    })

    expect(started.sort()).toEqual(['a', 'b', 'c'])
    expect(loaded.sort()).toEqual(['a', 'b', 'c'])
  })

  it('never runs more reads concurrently than the configured concurrency', async () => {
    let inFlight = 0
    let peak = 0
    const track = () => {
      inFlight++
      peak = Math.max(peak, inFlight)
    }
    const sources = Array.from({ length: 8 }, (_, i) =>
      source(`s${i}`, 10, () => {
        track()
      }),
    )

    // Wrap read to decrement inFlight after it resolves.
    const wrapped: BatchSource[] = sources.map((s) => ({
      name: s.name,
      read: async () => {
        const buffer = await s.read()
        inFlight--
        return buffer
      },
    }))

    await loadBatch(wrapped, { onStart: () => {}, onLoaded: () => {}, onError: () => {}, isStale: neverStale }, 3)

    expect(peak).toBeLessThanOrEqual(3)
  })

  it('does not abort the rest of the batch when one source rejects', async () => {
    const sources = [source('a'), source('fail-1'), source('b'), source('fail-2'), source('c')]
    const loaded: string[] = []
    const errored: string[] = []

    await loadBatch(sources, {
      onStart: () => {},
      onLoaded: (name) => loaded.push(name),
      onError: (name) => errored.push(name),
      isStale: neverStale,
    })

    expect(loaded.sort()).toEqual(['a', 'b', 'c'])
    expect(errored.sort()).toEqual(['fail-1', 'fail-2'])
  })

  it('suppresses every write once isStale() is true from the start', async () => {
    const sources = [source('a'), source('b'), source('c')]
    const started: string[] = []
    const loaded: string[] = []
    const errored: string[] = []

    await loadBatch(sources, {
      onStart: (name) => started.push(name),
      onLoaded: (name) => loaded.push(name),
      onError: (name) => errored.push(name),
      isStale: () => true,
    })

    expect(started).toEqual([])
    expect(loaded).toEqual([])
    expect(errored).toEqual([])
  })

  it('stops issuing new writes once staleness flips true mid-run, without throwing', async () => {
    let stale = false
    const sources = Array.from({ length: 6 }, (_, i) => source(`s${i}`, 5))
    const loaded: string[] = []

    const runPromise = loadBatch(
      sources,
      { onStart: () => {}, onLoaded: (name) => loaded.push(name), onError: () => {}, isStale: () => stale },
      2,
    )

    // Flip staleness shortly after the run starts, before every source has
    // had a chance to complete.
    setTimeout(() => {
      stale = true
    }, 6)

    await expect(runPromise).resolves.toBeUndefined()
    expect(loaded.length).toBeLessThan(sources.length)
  })
})
