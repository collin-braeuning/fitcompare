/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FitParser from 'fit-file-parser';
import { parseFitData } from '../fitDataParser';

// Run all tests in this file
// npx vitest run src/utils/__tests__/fitDataParser.test.ts

// Watch mode (re-runs on file changes)
// npx vitest watch src/utils/__tests__/fitDataParser.test.ts

// Run all tests in the project
// npx vitest run

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIT_FILE_PATH = path.resolve(__dirname, '../../../data/2026-07-26-pace4_run.fit');

describe('parseFitData', () => {
  // Load the FIT file and parse it with fit-file-parser to get the raw structure
  function getRawFitData(): any {
    const buffer = fs.readFileSync(FIT_FILE_PATH);
    const parser = new FitParser({ mode: 'cascade', force: true, speedUnit: 'km/h', lengthUnit: 'km' });
    return new Promise<any>((resolve, reject) => {
      parser.parse(buffer, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  describe('2026-07-26 pace4 run FIT file', () => {
    let rawData: any;

    beforeAll(async () => {
      rawData = await getRawFitData();
    });

    it('should parse the activity', () => {
      const result = parseFitData(rawData);
      expect(result.activities).toBeDefined();
      expect(result.activities.length).toBe(1);
    });

    it('should have correct activity metadata', () => {
      const result = parseFitData(rawData);
      const activity = result.activities[0];
      expect(activity.sport).toBe('running');
      expect(activity.startTime).toBe('2026-07-26T17:06:52.000Z');
      expect(activity.avgHeartRate).toBe(159);
      expect(activity.maxHeartRate).toBe(173);
    });

    it('should have 4,661 total records across all laps', () => {
      const result = parseFitData(rawData);
      const totalRecords = result.activities[0].records.length;
      expect(totalRecords).toBe(4661);
    });

    it('should have 11 laps', () => {
      const result = parseFitData(rawData);
      const laps = result.activities[0].laps;
      expect(laps.length).toBe(11);
    });

    it('should correctly parse lap-level aggregates (lap 0)', () => {
      const result = parseFitData(rawData);
      const lap = result.activities[0].laps[0];

      expect(lap.startTime).toBe('2026-07-26T17:06:52.000Z');
      expect(lap.records.length).toBe(453);
      expect(lap.distance).toBe(1.60934);
      expect(lap.avgHeartRate).toBe(144);
      expect(lap.maxHeartRate).toBe(157);
      expect(lap.minHeartRate).toBe(96);
      expect(lap.avgSpeed).toBe(12.8232);
      expect(lap.maxSpeed).toBe(15.7896);
      expect(lap.avgCadence).toBe(84);
      expect(lap.maxCadence).toBe(95);
      expect(lap.totalAscent).toBe(0.004);
      expect(lap.totalDescent).toBe(0.005);
      expect(lap.avgPower).toBe(281);
      expect(lap.calories).toBe(111);
    });

    it('should correctly parse lap-level aggregates (last lap)', () => {
      const result = parseFitData(rawData);
      const lap = result.activities[0].laps[10];

      expect(lap.startTime).toBe('2026-07-26T18:31:11.000Z');
      expect(lap.records.length).toBe(27);
      expect(lap.distance).toBe(0.08713);
      expect(lap.avgHeartRate).toBe(133);
      expect(lap.maxHeartRate).toBe(135);
      expect(lap.minHeartRate).toBe(132);
    });

    it('should parse per-record fields correctly', () => {
      const result = parseFitData(rawData);
      const records = result.activities[0].records;

      // Find the first record with heart rate data (skip the first record which has no HR)
      const firstRecordWithHR = records.find(r => r.heartRate !== null && r.heartRate !== 0);
      expect(firstRecordWithHR).toBeDefined();
      expect(firstRecordWithHR!.heartRate).toBe(97);
      expect(firstRecordWithHR!.timestamp).toBe('2026-07-26T17:06:53.000Z');
    });

    it('should return userProfile', () => {
      const result = parseFitData(rawData);
      expect(result.userProfile).toBeDefined();
    });
  });
});
