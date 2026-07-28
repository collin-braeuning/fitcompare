// Types for simplified FIT data structure
export interface SimplifiedLapRecord {
  timestamp: string;
  heartRate: number | null;
  speed: number | null;
  cadence: number | null;
  altitude: number | null;
  power: number | null;
  distance: number | null;
  positionLat: number | null;
  positionLong: number | null;
}

export interface SimplifiedLapData {
  startTime: string;
  endTime: string;
  elapsedSeconds: number;
  distance: number;
  avgHeartRate: number;
  maxHeartRate: number;
  minHeartRate: number;
  avgSpeed: number;
  maxSpeed: number;
  avgCadence: number;
  maxCadence: number;
  totalAscent: number;
  totalDescent: number;
  avgPower: number | null;
  maxPower: number | null;
  calories: number;
  records: SimplifiedLapRecord[];
}

export interface SimplifiedActivity {
  sport: string;
  subSport: string;
  timestamp: string;
  startTime: string;
  avgHeartRate: number;
  maxHeartRate: number;
  records: SimplifiedLapRecord[];
  laps: SimplifiedLapData[];
}

export interface SimplifiedFitData {
  userProfile: {
    friendlyName?: string;
    weight?: number;
    gender?: string;
    restingHeartRate?: number;
  };
  activities: SimplifiedActivity[];
}

/**
 * Safely convert a value to an ISO string.
 */
function toISOString(v: unknown): string {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return String(v);
}

/**
 * Safely extract a numeric value from a FIT field.
 * FIT values can be plain numbers, or wrapped in objects like { value: 42 }.
 */
function toNumber(v: unknown): number | null {
  if (v == null || v === 0) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && 'value' in v) return (v as any).value ?? null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse raw FIT data and consolidate into simplified records.
 *
 * fit-file-parser in 'cascade' mode produces this structure:
 *   data.activity.sessions[].laps[].records[]
 *
 * Records (per-sample data points) are nested inside each lap, not at the
 * session or activity level.  Lap-level aggregates (avg_heart_rate, etc.)
 * are on the lap object itself.
 */
export function parseFitData(rawData: unknown): SimplifiedFitData {
  const data = rawData as any;

  // Extract user profile info
  const userProfile = {
    friendlyName: data.user_profile?.friendly_name,
    weight: data.user_profile?.weight,
    gender: data.user_profile?.gender,
    restingHeartRate: data.user_profile?.resting_heart_rate,
  };

  // Extract and consolidate activity data
  const activities: SimplifiedActivity[] = [];

  // fit-file-parser with mode 'cascade' nests sessions under data.activity.sessions
  const activityData = data.activity || data;
  const sessions = activityData.sessions || data.sessions || [];

  if (sessions.length > 0) {
    sessions.forEach((session: any) => {
      // Collect all records by flattening records from every lap.
      // In cascade mode: session.laps[].records[]
      const allRecords: SimplifiedLapRecord[] = [];
      const laps: SimplifiedLapData[] = [];
      const allLaps = session.laps || [];

      allLaps.forEach((lap: any) => {
        // Parse lap-level data
        const lapData: SimplifiedLapData = {
          startTime: toISOString(lap.start_time),
          endTime: toISOString(lap.end_time),
          elapsedSeconds: toNumber(lap.elapsed_time) ?? 0,
          distance: toNumber(lap.total_distance) ?? 0,
          avgHeartRate: toNumber(lap.avg_heart_rate) ?? 0,
          maxHeartRate: toNumber(lap.max_heart_rate) ?? 0,
          minHeartRate: toNumber(lap.min_heart_rate) ?? 0,
          avgSpeed: toNumber(lap.avg_speed) ?? 0,
          maxSpeed: toNumber(lap.max_speed) ?? 0,
          avgCadence: toNumber(lap.avg_cadence) ?? 0,
          maxCadence: toNumber(lap.max_cadence) ?? 0,
          totalAscent: toNumber(lap.total_ascent) ?? 0,
          totalDescent: toNumber(lap.total_descent) ?? 0,
          avgPower: toNumber(lap.avg_power) ?? null,
          maxPower: toNumber(lap.max_power) ?? null,
          calories: toNumber(lap.total_calories) ?? 0,
          records: [],
        };

        // Parse per-lap records and also collect them into the flat list
        const lapRecords = lap.records || [];
        lapRecords.forEach((rec: any) => {
          const record: SimplifiedLapRecord = {
            timestamp: toISOString(rec.timestamp),
            heartRate: toNumber(rec.heart_rate) ?? null,
            speed: toNumber(rec.speed) ?? null,
            cadence: toNumber(rec.cadence) ?? null,
            altitude: toNumber(rec.altitude) ?? null,
            power: toNumber(rec.power) ?? null,
            distance: toNumber(rec.distance) ?? null,
            positionLat: toNumber(rec.position_lat) ?? null,
            positionLong: toNumber(rec.position_long) ?? null,
          };
          lapData.records.push(record);
          allRecords.push(record);
        });

        laps.push(lapData);
      });

      // Create simplified activity record
      const activity: SimplifiedActivity = {
        sport: session.sport || 'unknown',
        subSport: session.sub_sport || 'unknown',
        timestamp: toISOString(session.timestamp),
        startTime: toISOString(session.start_time),
        avgHeartRate: toNumber(session.avg_heart_rate) ?? 0,
        maxHeartRate: toNumber(session.max_heart_rate) ?? 0,
        records: allRecords,
        laps,
      };

      activities.push(activity);
    });
  }

  return {
    userProfile,
    activities,
  };
}
