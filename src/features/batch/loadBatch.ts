import { parseFitBuffer } from '../fit-file/loadFitFile'
import type { LoadedFile } from '../fit-file'

/**
 * The tricky async part of loading a whole batch of `.fit` files, kept out of
 * the hook so it is testable under vitest's node environment with fake `read`
 * callbacks.
 */

export interface BatchSource {
  name: string
  read: () => Promise<ArrayBuffer>
}

export interface LoadBatchCallbacks {
  onStart(name: string): void
  onLoaded(name: string, file: LoadedFile): void
  onError(name: string, message: string): void
  isStale(): boolean
}

/**
 * Load and parse every source, `concurrency` at a time.
 *
 * `FitParser.parse` calls its callback synchronously, so `await
 * parseFitBuffer(...)` resolves in a microtask and does *not* yield to the
 * renderer — a naive loop would block the main thread for the whole run and
 * the progress bar would never paint. Yielding explicitly before each parse
 * fixes that without a worker: at ~323ms in Node for all 14 bundled files
 * (roughly 0.6-1.5s in-browser), this is a progress bar, not a worker job —
 * the worker seam stays clean if the corpus ever grows past ~50 files.
 *
 * `concurrency` overlaps `fetch`/file-read with parsing across sources; it
 * cannot parallelise parsing itself (that work is single-threaded JS).
 */
export async function loadBatch(
  sources: readonly BatchSource[],
  callbacks: LoadBatchCallbacks,
  concurrency = 3,
): Promise<void> {
  let nextIndex = 0

  async function worker(): Promise<void> {
    for (;;) {
      if (callbacks.isStale()) return

      const index = nextIndex++
      if (index >= sources.length) return

      const { name, read } = sources[index]
      callbacks.onStart(name)

      try {
        const buffer = await read()
        if (callbacks.isStale()) return

        await new Promise((resolve) => setTimeout(resolve, 0))
        const file = await parseFitBuffer(buffer, name)
        if (callbacks.isStale()) return

        callbacks.onLoaded(name, file)
      } catch (error) {
        if (callbacks.isStale()) return
        const message = error instanceof Error ? error.message : 'Unknown error.'
        callbacks.onError(name, message)
      }
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, sources.length))
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
}
