/**
 * RF Signal Propagation Engine
 *
 * Calculates WiFi signal strength based on real-world RF physics:
 * - Free Space Path Loss (FSPL)
 * - Wall/obstacle attenuation
 * - Frequency-dependent propagation (2.4GHz vs 5GHz)
 * - Co-channel interference from device density
 * - Client load impact on effective signal quality
 */

export interface AccessPoint {
  x: number;
  y: number;
  powerDbm: number;  // Transmit power in dBm (typically 20-30 dBm)
  frequencyGhz: number;  // 2.4 or 5 GHz
  clientCount: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'drywall' | 'concrete' | 'metal' | 'glass';
}

export interface SimulationParams {
  aps: AccessPoint[];
  obstacles: Obstacle[];
  deviceDensity: number;  // devices per square meter
  width: number;  // meters
  height: number;  // meters
}

// Obstacle attenuation in dB
const OBSTACLE_ATTENUATION: Record<string, number> = {
  drywall: 3,      // Standard drywall: ~3 dB
  concrete: 8,     // Concrete wall: ~8 dB
  metal: 20,       // Metal/elevator shaft: ~20 dB
  glass: 2,        // Glass: ~2 dB
};

/**
 * Calculate Free Space Path Loss (FSPL)
 * FSPL(dB) = 20*log10(d) + 20*log10(f) + 32.45
 * where d is distance in km, f is frequency in MHz
 */
function calculateFSPL(distanceMeters: number, frequencyGhz: number): number {
  const distanceKm = distanceMeters / 1000;
  const frequencyMhz = frequencyGhz * 1000;

  // Avoid log(0)
  if (distanceKm < 0.001) return 0;

  return 20 * Math.log10(distanceKm) + 20 * Math.log10(frequencyMhz) + 32.45;
}

/**
 * Calculate additional path loss from obstacles
 */
function calculateObstacleLoss(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  obstacles: Obstacle[]
): number {
  let totalLoss = 0;

  // Check line intersection with each obstacle
  for (const obstacle of obstacles) {
    if (lineIntersectsRect(x1, y1, x2, y2, obstacle)) {
      totalLoss += OBSTACLE_ATTENUATION[obstacle.type];
    }
  }

  return totalLoss;
}

/**
 * Check if line segment intersects with rectangle
 */
function lineIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  // Check if line intersects with any of the four rectangle edges
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;

  // Simple AABB check first
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  if (maxX < left || minX > right || maxY < top || minY > bottom) {
    return false;
  }

  // Check if either endpoint is inside rectangle
  if ((x1 >= left && x1 <= right && y1 >= top && y1 <= bottom) ||
      (x2 >= left && x2 <= right && y2 >= top && y2 <= bottom)) {
    return true;
  }

  // Check intersection with rectangle edges
  return (
    lineIntersectsLine(x1, y1, x2, y2, left, top, right, top) ||
    lineIntersectsLine(x1, y1, x2, y2, right, top, right, bottom) ||
    lineIntersectsLine(x1, y1, x2, y2, left, bottom, right, bottom) ||
    lineIntersectsLine(x1, y1, x2, y2, left, top, left, bottom)
  );
}

/**
 * Check if two line segments intersect
 */
function lineIntersectsLine(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): boolean {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) return false;

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

/**
 * Calculate interference from device density
 * Higher density = more interference = reduced effective signal
 */
function calculateInterferenceLoss(deviceDensity: number): number {
  // Logarithmic scale: every 10x increase in density = ~3 dB loss
  if (deviceDensity <= 0.01) return 0;
  return Math.log10(deviceDensity * 100) * 3;
}

/**
 * Calculate client load impact on signal quality
 * More clients = airtime contention = worse perceived performance
 */
function calculateClientLoadPenalty(clientCount: number): number {
  // Approximate airtime contention impact
  if (clientCount <= 1) return 0;
  if (clientCount <= 10) return clientCount * 0.5;
  if (clientCount <= 25) return 5 + (clientCount - 10) * 1;
  return 20 + (clientCount - 25) * 2;  // Severe degradation beyond 25 clients
}

/**
 * Calculate received signal strength at a point
 * Returns signal strength in dBm
 */
export function calculateSignalStrength(
  x: number,
  y: number,
  params: SimulationParams
): number {
  let maxSignal = -100;  // Start with very weak signal

  // Find strongest signal from all APs
  for (const ap of params.aps) {
    const distance = Math.sqrt(Math.pow(x - ap.x, 2) + Math.pow(y - ap.y, 2));

    // Start with transmit power
    let signalDbm = ap.powerDbm;

    // Subtract path loss
    const fspl = calculateFSPL(distance, ap.frequencyGhz);
    signalDbm -= fspl;

    // Subtract obstacle loss
    const obstacleLoss = calculateObstacleLoss(x, y, ap.x, ap.y, params.obstacles);
    signalDbm -= obstacleLoss;

    // Subtract interference loss
    const interferenceLoss = calculateInterferenceLoss(params.deviceDensity);
    signalDbm -= interferenceLoss;

    // Subtract client load penalty
    const clientLoadPenalty = calculateClientLoadPenalty(ap.clientCount);
    signalDbm -= clientLoadPenalty;

    // Track maximum (best) signal
    maxSignal = Math.max(maxSignal, signalDbm);
  }

  return maxSignal;
}

/**
 * Generate signal quality category based on dBm
 * Industry standard thresholds
 */
export function getSignalQuality(dbm: number): {
  level: string;
  color: string;
  description: string;
} {
  if (dbm >= -50) {
    return {
      level: 'Excellent',
      color: '#00d084',
      description: 'Perfect for all applications'
    };
  } else if (dbm >= -60) {
    return {
      level: 'Very Good',
      color: '#7ed957',
      description: 'Great for video calls and streaming'
    };
  } else if (dbm >= -65) {
    return {
      level: 'Good',
      color: '#ffd700',
      description: 'Acceptable for most uses'
    };
  } else if (dbm >= -70) {
    return {
      level: 'Fair',
      color: '#ff9500',
      description: 'Marginal, may experience issues'
    };
  } else if (dbm >= -80) {
    return {
      level: 'Poor',
      color: '#ff4500',
      description: 'Unreliable connection'
    };
  } else {
    return {
      level: 'Unusable',
      color: '#8b0000',
      description: 'No usable signal'
    };
  }
}

/**
 * Get interpolated color for signal strength gradient
 * Uses smooth gradients similar to Electricity Maps
 */
export function getSignalColor(dbm: number): string {
  const clampedDbm = Math.max(-90, Math.min(-30, dbm));

  // Define color stops (dBm: color)
  const colorStops = [
    { dbm: -90, rgb: [139, 0, 0] },      // Dark red
    { dbm: -80, rgb: [255, 69, 0] },     // Red-orange
    { dbm: -70, rgb: [255, 149, 0] },    // Orange
    { dbm: -65, rgb: [255, 215, 0] },    // Gold
    { dbm: -60, rgb: [126, 217, 87] },   // Light green
    { dbm: -50, rgb: [0, 208, 132] },    // Green
    { dbm: -30, rgb: [0, 255, 170] },    // Bright green
  ];

  // Find surrounding color stops
  let lowerStop = colorStops[0];
  let upperStop = colorStops[colorStops.length - 1];

  for (let i = 0; i < colorStops.length - 1; i++) {
    if (clampedDbm >= colorStops[i].dbm && clampedDbm <= colorStops[i + 1].dbm) {
      lowerStop = colorStops[i];
      upperStop = colorStops[i + 1];
      break;
    }
  }

  // Interpolate between color stops
  const range = upperStop.dbm - lowerStop.dbm;
  const factor = range === 0 ? 0 : (clampedDbm - lowerStop.dbm) / range;

  const r = Math.round(lowerStop.rgb[0] + factor * (upperStop.rgb[0] - lowerStop.rgb[0]));
  const g = Math.round(lowerStop.rgb[1] + factor * (upperStop.rgb[1] - lowerStop.rgb[1]));
  const b = Math.round(lowerStop.rgb[2] + factor * (upperStop.rgb[2] - lowerStop.rgb[2]));

  return `rgb(${r}, ${g}, ${b})`;
}
