/**
 * Calculate Pearson correlation coefficient between two arrays of numbers
 * @param x - First array of numbers
 * @param y - Second array of numbers  
 * @returns Pearson correlation coefficient (R value) between -1 and 1
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    return 0;
  }

  const n = x.length;
  
  // Calculate means
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate numerator and denominators
  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;
  
  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    
    numerator += diffX * diffY;
    sumSqX += diffX * diffX;
    sumSqY += diffY * diffY;
  }
  
  // Avoid division by zero
  if (sumSqX === 0 || sumSqY === 0) {
    return 0;
  }
  
  // Calculate correlation coefficient
  const correlation = numerator / Math.sqrt(sumSqX * sumSqY);
  
  // Ensure the result is within valid range [-1, 1]
  return Math.max(-1, Math.min(1, correlation));
}

/**
 * Find matching data points between two datasets based on timestamps
 * @param file1Data - First dataset with timestamp and heart rate
 * @param file2Data - Second dataset with timestamp and heart rate  
 * @returns Array of matched data points where both files have values
 */
export function findMatchingDataPoints(
  file1Data: { timestamp: string; heartRate: number }[],
  file2Data: { timestamp: string; heartRate: number }[]
): { x: number; y: number }[] {
  // Create a map for fast lookup of file2 data by timestamp
  const file2Map = new Map<string, number>();
  file2Data.forEach(point => {
    if (point.heartRate !== null && point.heartRate !== 0) {
      file2Map.set(point.timestamp, point.heartRate);
    }
  });
  
  // Find matching points and create pairs
  const matches: { x: number; y: number }[] = [];
  file1Data.forEach(point => {
    if (point.heartRate !== null && point.heartRate !== 0) {
      const heartRate2 = file2Map.get(point.timestamp);
      if (heartRate2 !== undefined) {
        matches.push({ x: point.heartRate, y: heartRate2 });
      }
    }
  });
  
  return matches;
}