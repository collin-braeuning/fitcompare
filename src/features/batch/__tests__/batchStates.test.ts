import { describe, it, expect } from 'vitest'
import { initialBatchStates, type BatchFileState } from '../batchStates'

describe('initialBatchStates', () => {
  it('marks every source pending', () => {
    const states = initialBatchStates([{ name: 'a' }, { name: 'b' }])
    expect(states).toEqual({ a: { status: 'pending' }, b: { status: 'pending' } })
  })

  it('a previous run entries are absent from the result', () => {
    // Pins the replace fix: `initialBatchStates` never receives the previous
    // run's map, so there's no way for a stale entry to survive.
    const first = initialBatchStates([{ name: 'old-1' }, { name: 'old-2' }])
    expect(first).toHaveProperty('old-1')

    const second = initialBatchStates([{ name: 'new-1' }])
    expect(second).not.toHaveProperty('old-1')
    expect(second).not.toHaveProperty('old-2')
    expect(second).toEqual({ 'new-1': { status: 'pending' } })
  })

  it('rejected duplicate reports survive into the result', () => {
    const rejected: Record<string, BatchFileState> = {
      'dup.FIT': { status: 'error', message: 'duplicates dup' },
    }
    const states = initialBatchStates([{ name: 'dup' }], rejected)
    expect(states['dup.FIT']).toEqual({ status: 'error', message: 'duplicates dup' })
    expect(states['dup']).toEqual({ status: 'pending' })
  })

  it('a rejected key colliding with a source name loses to the pending entry', () => {
    const rejected: Record<string, BatchFileState> = {
      a: { status: 'error', message: 'should be overwritten' },
    }
    const states = initialBatchStates([{ name: 'a' }], rejected)
    expect(states.a).toEqual({ status: 'pending' })
  })
})
