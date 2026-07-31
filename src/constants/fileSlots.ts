export interface FileSlot {
  id: string
  label: string
}

// Order determines default pace/lap source (first slot) and which two
// slots feed the pairwise comparison (table, Bland-Altman, CCC). Add an
// entry here to add another upload card.
export const FILE_SLOTS: FileSlot[] = [
  { id: 'file-1', label: 'File 1' },
  { id: 'file-2', label: 'File 2' },
]
