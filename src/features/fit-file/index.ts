/**
 * Public surface of the fit-file feature. Other folders import from here
 * rather than reaching into individual files, so internals can move freely.
 */
export type {
  FitActivity,
  FitLap,
  FitRecord,
  FitUserProfile,
  LoadedFile,
  ParsedFitFile,
} from './fitTypes'
export { parseFitData } from './parseFitData'
export { toSecondBucket, usableHeartRate, heartRateBySecond } from './heartRateSamples'
export { FILE_SLOTS, PRIMARY_SLOT, SECONDARY_SLOT, type FileSlot } from './fileSlots'
export { SAMPLE_FILES, type SampleFile } from './sampleFiles'
export { useFitFiles, type SlotState } from './useFitFiles'
