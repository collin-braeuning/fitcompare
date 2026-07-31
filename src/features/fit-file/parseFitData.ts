import type {
  FitActivity,
  FitLap,
  FitRecord,
  FitUserProfile,
  ParsedFitFile,
} from './fitTypes'

/**
 * Translates `fit-file-parser`'s raw output into our domain model.
 *
 * This is the app's trust boundary: the input is `unknown` because it comes
 * from a binary file we didn't write, so every field is narrowed explicitly
 * rather than asserted with `as`. Keeping that noise here means the rest of
 * the app can rely on the types in `fitTypes.ts` being accurate.
 */

// --- narrowing helpers for untrusted input -----------------------------------

type RawObject = Record<string, unknown>

function asObject(value: unknown): RawObject | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as RawObject)
    : undefined
}

function asObjectArray(value: unknown): RawObject[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is RawObject => asObject(item) !== undefined)
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

/** Coerce a FIT timestamp (a Date, or already a string) to ISO 8601. */
function toISOString(value: unknown): string {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  return String(value)
}

/**
 * Coerce a FIT numeric field.
 *
 * Depending on the field definition the parser yields either a plain number
 * or a boxed `{ value: n }`, so both are handled. Note that 0 is a legitimate
 * reading (stopped, no ascent, cadence of zero) and is preserved — only
 * genuinely absent or non-finite values become null.
 */
function toNumber(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const boxed = asObject(value)
  if (boxed && 'value' in boxed) return toNumber(boxed.value)

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

// --- parsing -----------------------------------------------------------------

function parseUserProfile(raw: RawObject): FitUserProfile {
  const profile = asObject(raw.user_profile)
  if (!profile) return {}

  return {
    friendlyName: asString(profile.friendly_name) || undefined,
    weight: toNumber(profile.weight) ?? undefined,
    gender: asString(profile.gender) || undefined,
    restingHeartRate: toNumber(profile.resting_heart_rate) ?? undefined,
  }
}

function parseRecord(raw: RawObject): FitRecord {
  return {
    timestamp: toISOString(raw.timestamp),
    heartRate: toNumber(raw.heart_rate),
    speed: toNumber(raw.speed),
    cadence: toNumber(raw.cadence),
    altitude: toNumber(raw.altitude),
    power: toNumber(raw.power),
    distance: toNumber(raw.distance),
    positionLat: toNumber(raw.position_lat),
    positionLong: toNumber(raw.position_long),
  }
}

function parseLap(raw: RawObject): FitLap {
  return {
    startTime: toISOString(raw.start_time),
    endTime: toISOString(raw.end_time),
    elapsedSeconds: toNumber(raw.elapsed_time) ?? 0,
    distance: toNumber(raw.total_distance) ?? 0,
    avgHeartRate: toNumber(raw.avg_heart_rate) ?? 0,
    maxHeartRate: toNumber(raw.max_heart_rate) ?? 0,
    minHeartRate: toNumber(raw.min_heart_rate) ?? 0,
    avgSpeed: toNumber(raw.avg_speed) ?? 0,
    maxSpeed: toNumber(raw.max_speed) ?? 0,
    avgCadence: toNumber(raw.avg_cadence) ?? 0,
    maxCadence: toNumber(raw.max_cadence) ?? 0,
    totalAscent: toNumber(raw.total_ascent) ?? 0,
    totalDescent: toNumber(raw.total_descent) ?? 0,
    avgPower: toNumber(raw.avg_power),
    maxPower: toNumber(raw.max_power),
    calories: toNumber(raw.total_calories) ?? 0,
    records: asObjectArray(raw.records).map(parseRecord),
  }
}

function parseSession(raw: RawObject): FitActivity {
  const laps = asObjectArray(raw.laps).map(parseLap)

  return {
    sport: asString(raw.sport, 'unknown'),
    subSport: asString(raw.sub_sport, 'unknown'),
    timestamp: toISOString(raw.timestamp),
    startTime: toISOString(raw.start_time),
    avgHeartRate: toNumber(raw.avg_heart_rate) ?? 0,
    maxHeartRate: toNumber(raw.max_heart_rate) ?? 0,
    // Per-sample records live inside laps in cascade mode, so the activity's
    // flat record list is the concatenation of every lap's samples.
    records: laps.flatMap((lap) => lap.records),
    laps,
  }
}

/**
 * Parse raw FIT data into the app's domain model.
 *
 * `fit-file-parser` in `cascade` mode nests everything:
 *   data.activity.sessions[].laps[].records[]
 * Some files put `sessions` at the top level instead, so both are checked.
 */
export function parseFitData(rawData: unknown): ParsedFitFile {
  const root = asObject(rawData) ?? {}
  const activity = asObject(root.activity)

  const sessions = asObjectArray(activity?.sessions ?? root.sessions)

  return {
    userProfile: parseUserProfile(root),
    activities: sessions.map(parseSession),
  }
}
