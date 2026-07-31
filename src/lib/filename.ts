/** Strip a trailing file extension: "2026-07-30_pace4_run.fit" → "2026-07-30_pace4_run". */
export function stripFileExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '')
}
