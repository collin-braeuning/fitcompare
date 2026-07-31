import type { LoadedFile } from '../fit-file'

/**
 * Loading state for one file in the batch, keyed by its extension-stripped
 * name so it lines up with `SAMPLE_FILES.name` and `parseActivityFileName`.
 *
 * Pulled out of `useBatchFiles` so the "what does a fresh batch look like"
 * question is a pure function, testable without touching React state.
 */
export type BatchFileState =
  | { status: 'pending' }
  | { status: 'loading' }
  | { status: 'loaded'; file: LoadedFile }
  | { status: 'error'; message: string }

export interface BatchProgress {
  total: number
  done: number
  errored: number
}

export const EMPTY_PROGRESS: BatchProgress = { total: 0, done: 0, errored: 0 }

/**
 * The starting `states` map for a new batch run: every source pending, plus
 * any pre-computed rejections (e.g. duplicate filenames caught before the
 * run even started).
 *
 * A batch load is one atomic operation — see `useBatchFiles`'s doc comment —
 * so this always builds a fresh map rather than merging into whatever the
 * previous run left behind. `rejected` is threaded in as an argument rather
 * than written separately beforehand, so a caller can't accidentally have
 * its rejections wiped by the replace.
 */
export function initialBatchStates(
  sources: readonly { name: string }[],
  rejected: Readonly<Record<string, BatchFileState>> = {},
): Record<string, BatchFileState> {
  const states: Record<string, BatchFileState> = { ...rejected }
  for (const source of sources) states[source.name] = { status: 'pending' }
  return states
}
