/**
 * Public surface of the batch feature. Other folders import from here rather
 * than reaching into individual files, so internals can move freely.
 */
export { BatchView } from './BatchView'
export { BatchSessionTable } from './BatchSessionTable'
export { useBatchFiles, type BatchFileState, type BatchProgress } from './useBatchFiles'
export { useBatchAgreement } from './useBatchAgreement'
export { loadBatch, type BatchSource, type LoadBatchCallbacks } from './loadBatch'
export {
  groupActivityFiles,
  completeSessions,
  type ActivitySession,
  type SessionFile,
  type DeviceIdentity,
  type UnparsedFile,
  type BatchGrouping,
} from './activitySessions'
export { intersectHeartRate, type DeviceSamples, type DeviceCoverage, type AlignedSession } from './alignSamples'
export {
  buildBatchAgreement,
  type SessionAgreement,
  type AgreementSpread,
  type PooledAgreement,
  type BatchAgreementInput,
  type BatchAgreement,
} from './batchAgreement'
