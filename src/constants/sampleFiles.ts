const sampleUrls = import.meta.glob('/data/*.{fit,FIT}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export interface SampleFile {
  name: string
  url: string
}

export const SAMPLES: SampleFile[] = Object.entries(sampleUrls)
  .map(([path, url]) => ({
    name: path.split('/').pop()!.replace(/\.[^/.]+$/, ''),
    url,
  }))
  .sort((a, b) => b.name.localeCompare(a.name))
