// Types for simplified FIT data structure
export interface SimplifiedLapRecord {
  timestamp: string;
  heartRate: number | null;
  speed: number | null;
  cadence: number | null;
  altitude: number | null;
}

export interface SimplifiedLapData {
  startTime: string;
  endTime: string;
  elapsedSeconds: number;
  distance: number;
  avgHeartRate: number;
  maxHeartRate: number;
  avgSpeed: number;
  maxSpeed: number;
  avgCadence: number;
  maxCadence: number;
  totalAscent: number;
  totalDescent: number;
  avgPower: number | null;
  maxPower: number | null;
  calories: number;
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
 * Parse raw FIT data and consolidate into simplified records.
 * fit-file-parser outputs a flat structure: data.records, data.laps, data.sessions, etc.
 */
export function parseFitData(rawData: unknown): SimplifiedFitData {
  const data = rawData as any;

  console.log('[parseFitData] raw data keys:', Object.keys(data));
  console.log('[parseFitData] has sessions:', !!data.sessions, 'length:', data.sessions?.length);
  console.log('[parseFitData] has records:', !!data.records, 'length:', data.records?.length);
  console.log('[parseFitData] has laps:', !!data.laps, 'length:', data.laps?.length);

  // Extract user profile info
  const userProfile = {
    friendlyName: data.user_profile?.friendly_name,
    weight: data.user_profile?.weight,
    gender: data.user_profile?.gender,
    restingHeartRate: data.user_profile?.resting_heart_rate,
  };

  // Extract and consolidate activity data
  const activities: SimplifiedActivity[] = [];

  // fit-file-parser with mode 'cascade' nests messages under data.activity
  const activityData = data.activity || data;
  const sessions = activityData.sessions || data.sessions || [];

  console.log('[parseFitData] sessions resolved:', sessions.length);

  if (sessions.length > 0) {
    sessions.forEach((session: any) => {
      // Collect per-record data
      const records: SimplifiedLapRecord[] = [];
      const allRecords = activityData.records || data.records || [];

      console.log('[parseFitData] processing session:', session.sport, 'records count:', allRecords.length);

      allRecords.forEach((record: any) => {
        const ts = record.timestamp || record.local_timestamp;
        const timestampStr = ts
          ? (ts.toISOString ? ts.toISOString() : String(ts))
          : (session.start_time
              ? (session.start_time.toISOString ? session.start_time.toISOString() : String(session.start_time))
              : '');
        records.push({
          timestamp: timestampStr,
          heartRate: record.heart_rate || null,
          speed: record.speed || null,
          cadence: record.cadence || null,
          altitude: record.altitude || null,
        });
      });

      // Collect lap data
      const laps: SimplifiedLapData[] = [];
      const allLaps = activityData.laps || data.laps || [];

      allLaps.forEach((lap: any) => {
        const toStr = (v: any) => {
          if (!v) return '';
          return v.toISOString ? v.toISOString() : String(v);
        };
        laps.push({
          startTime: toStr(lap.start_time),
          endTime: toStr(lap.end_time),
          elapsedSeconds: lap.elapsed_time || 0,
          distance: lap.distance || 0,
          avgHeartRate: lap.avg_heart_rate || 0,
          maxHeartRate: lap.max_heart_rate || 0,
          avgSpeed: lap.avg_speed || 0,
          maxSpeed: lap.max_speed || 0,
          avgCadence: lap.avg_cadence || 0,
          maxCadence: lap.max_cadence || 0,
          totalAscent: lap.total_ascent || 0,
          totalDescent: lap.total_descent || 0,
          avgPower: lap.avg_power != null ? lap.avg_power : null,
          maxPower: lap.max_power != null ? lap.max_power : null,
          calories: lap.calories || 0,
        });
      });

      // Create simplified activity record
      const toStr = (v: any) => {
        if (!v) return '';
        return v.toISOString ? v.toISOString() : String(v);
      };
      const activity: SimplifiedActivity = {
        sport: session.sport || 'unknown',
        subSport: session.sub_sport || 'unknown',
        timestamp: session.timestamp ? toStr(session.timestamp) : '',
        startTime: session.start_time ? toStr(session.start_time) : '',
        avgHeartRate: session.avg_heart_rate || 0,
        maxHeartRate: session.max_heart_rate || 0,
        records,
        laps,
      };

      console.log('[parseFitData] created activity:', activity.sport, 'records:', activity.records.length, 'laps:', activity.laps.length);
      activities.push(activity);
    });
  }

  console.log('[parseFitData] total activities:', activities.length);

  return {
    userProfile,
    activities,
  };
}
