/**
 * The app's domain model for a FIT file.
 *
 * These types are deliberately independent of `fit-file-parser`'s raw output:
 * the parser hands back loosely-typed, snake_cased data with values that are
 * sometimes boxed in objects. `parseFitData` is the only code that touches
 * that shape — everything downstream works against the types below.
 */

/** One sample from the device, typically recorded once per second. */
export interface FitRecord {
  /** ISO 8601. */
  timestamp: string
  heartRate: number | null
  /** km/h. */
  speed: number | null
  cadence: number | null
  altitude: number | null
  power: number | null
  distance: number | null
  positionLat: number | null
  positionLong: number | null
}

/** A lap, with the device's own aggregates plus the samples it contains. */
export interface FitLap {
  startTime: string
  endTime: string
  elapsedSeconds: number
  distance: number
  avgHeartRate: number
  maxHeartRate: number
  minHeartRate: number
  avgSpeed: number
  maxSpeed: number
  avgCadence: number
  maxCadence: number
  totalAscent: number
  totalDescent: number
  avgPower: number | null
  maxPower: number | null
  calories: number
  records: FitRecord[]
}

/** A single recorded workout (one "session" in FIT terminology). */
export interface FitActivity {
  sport: string
  subSport: string
  /** End of the activity. FIT stores a session's end as its `timestamp`. */
  timestamp: string
  startTime: string
  avgHeartRate: number
  maxHeartRate: number
  /** Every sample across every lap, flattened and in order. */
  records: FitRecord[]
  laps: FitLap[]
}

export interface FitUserProfile {
  friendlyName?: string
  weight?: number
  gender?: string
  restingHeartRate?: number
}

/** Everything we extract from one `.fit` file. */
export interface ParsedFitFile {
  userProfile: FitUserProfile
  activities: FitActivity[]
}

/** An activity paired with the name of the file it came from. */
export interface LoadedFile {
  /** File name without its extension — used as the series label on charts. */
  fileName: string
  activity: FitActivity
}
