import type { LoadedFile } from './fitTypes'

export interface FileSlot {
  id: string
  label: string
}

/**
 * The upload slots the UI renders, in order.
 *
 * Order is meaningful: the first slot is the default pace/lap source, and the
 * first two feed the pairwise comparison (table, Bland-Altman, CCC). Adding an
 * entry here adds another upload card and another chart series — no other
 * change required.
 */
export const FILE_SLOTS: readonly FileSlot[] = [
  { id: 'file-1', label: 'File 1' },
  { id: 'file-2', label: 'File 2' },
] as const

/**
 * Lin's CCC and Bland-Altman agreement are only defined for two series, so the
 * pairwise views always compare these two slots regardless of how many files
 * are loaded.
 */
export const [PRIMARY_SLOT, SECONDARY_SLOT] = FILE_SLOTS

/**
 * Packs a resolved pair of files into the same slot-keyed shape `useFitFiles`
 * produces, so a batch drill-down can hand `ComparisonView` one record built
 * on the spot instead of routing through the upload hook's state.
 */
export function pairBySlot(primary: LoadedFile, secondary: LoadedFile): Record<string, LoadedFile> {
  return { [PRIMARY_SLOT.id]: primary, [SECONDARY_SLOT.id]: secondary }
}
