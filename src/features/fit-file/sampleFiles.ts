import { stripFileExtension } from '../../lib/filename'

export interface SampleFile {
  name: string
  url: string
}

// Vite resolves this glob at build time and emits each .fit file as an asset,
// so the sample list is whatever currently sits in /data — no manual registry.
const sampleUrls = import.meta.glob('/data/*.{fit,FIT}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** Bundled sample activities, newest first (file names are date-prefixed). */
export const SAMPLE_FILES: SampleFile[] = Object.entries(sampleUrls)
  .map(([path, url]) => ({
    name: stripFileExtension(path.split('/').pop() ?? path),
    url,
  }))
  .sort((a, b) => b.name.localeCompare(a.name))
