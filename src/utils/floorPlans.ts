import { Obstacle } from '../engine/rfPropagation';

/**
 * Realistic hotel floor plan layouts
 * Based on typical hospitality construction standards
 */

// Standard hotel room: 12-15 ft wide x 20-25 ft deep (3.7-4.6m x 6-7.6m)
export const standardRoomLayout = (): Obstacle[] => {
  return [
    // Bathroom wall (left side)
    { x: 0, y: 0, width: 0.15, height: 2.5, type: 'drywall' },
    { x: 0, y: 0, width: 2.5, height: 0.15, type: 'drywall' },
    { x: 2.5, y: 0, width: 0.15, height: 2.5, type: 'drywall' },

    // Closet wall (right side near entry)
    { x: 5, y: 0, width: 0.15, height: 1.5, type: 'drywall' },
  ];
};

// Suite layout: 500-800 sq ft (46-74 m²) - typical luxury hotel suite
export const suiteLayout = (): Obstacle[] => {
  return [
    // Entry hallway walls
    { x: 0, y: 6, width: 3, height: 0.15, type: 'drywall' },

    // Bathroom (full)
    { x: 0, y: 6, width: 0.15, height: 4, type: 'drywall' },
    { x: 0, y: 10, width: 3, height: 0.15, type: 'drywall' },
    { x: 3, y: 6, width: 0.15, height: 4, type: 'drywall' },

    // Living room separator wall
    { x: 6, y: 0, width: 0.15, height: 6, type: 'drywall' },

    // Bedroom partial wall/divider
    { x: 6, y: 6, width: 0.15, height: 4, type: 'drywall' },

    // Closet in bedroom
    { x: 9, y: 0, width: 0.15, height: 2, type: 'drywall' },
    { x: 9, y: 0, width: 2, height: 0.15, type: 'drywall' },
  ];
};

// Presidential suite: 1000-2000 sq ft (93-186 m²)
export const presidentialSuiteLayout = (): Obstacle[] => {
  return [
    // Entry foyer
    { x: 0, y: 8, width: 4, height: 0.15, type: 'drywall' },

    // Master bathroom
    { x: 0, y: 0, width: 0.15, height: 4, type: 'drywall' },
    { x: 0, y: 0, width: 4, height: 0.15, type: 'drywall' },
    { x: 4, y: 0, width: 0.15, height: 4, type: 'drywall' },

    // Walk-in closet
    { x: 0, y: 4.5, width: 3, height: 0.15, type: 'drywall' },
    { x: 3, y: 4.5, width: 0.15, height: 3.5, type: 'drywall' },

    // Living area separator (partial wall with opening)
    { x: 8, y: 0, width: 0.15, height: 5, type: 'drywall' },
    { x: 8, y: 7, width: 0.15, height: 5, type: 'drywall' },

    // Kitchenette area
    { x: 4, y: 8, width: 0.15, height: 4, type: 'drywall' },

    // Guest bathroom
    { x: 12, y: 8, width: 0.15, height: 4, type: 'drywall' },
    { x: 12, y: 8, width: 3, height: 0.15, type: 'drywall' },
    { x: 15, y: 8, width: 0.15, height: 4, type: 'drywall' },
  ];
};

// Hotel corridor with multiple rooms
export const hotelCorridorLayout = (): Obstacle[] => {
  const obstacles: Obstacle[] = [];

  // Main corridor walls (concrete fire-rated)
  obstacles.push({ x: 0, y: 3, width: 30, height: 0.2, type: 'concrete' });
  obstacles.push({ x: 0, y: 5, width: 30, height: 0.2, type: 'concrete' });

  // Room dividing walls (every 4 meters)
  for (let x = 0; x <= 28; x += 4) {
    // Left side rooms
    obstacles.push({ x, y: 0, width: 0.15, height: 3, type: 'drywall' });
    // Right side rooms
    obstacles.push({ x, y: 5.2, width: 0.15, height: 3, type: 'drywall' });
  }

  // Stairwell (concrete)
  obstacles.push({ x: 14, y: 0, width: 3, height: 0.2, type: 'concrete' });
  obstacles.push({ x: 14, y: 0, width: 0.2, height: 3, type: 'concrete' });
  obstacles.push({ x: 17, y: 0, width: 0.2, height: 3, type: 'concrete' });
  obstacles.push({ x: 14, y: 5.2, width: 0.2, height: 3, type: 'concrete' });
  obstacles.push({ x: 17, y: 5.2, width: 0.2, height: 3, type: 'concrete' });
  obstacles.push({ x: 14, y: 8, width: 3, height: 0.2, type: 'concrete' });

  // Elevator shaft (metal/concrete)
  obstacles.push({ x: 13, y: 3.5, width: 1.5, height: 1.5, type: 'metal' });

  return obstacles;
};

// Conference room with movable partitions
export const conferenceRoomLayout = (): Obstacle[] => {
  return [
    // Main columns (structural - concrete)
    { x: 5, y: 3, width: 0.4, height: 0.4, type: 'concrete' },
    { x: 10, y: 3, width: 0.4, height: 0.4, type: 'concrete' },
    { x: 15, y: 3, width: 0.4, height: 0.4, type: 'concrete' },
    { x: 5, y: 7, width: 0.4, height: 0.4, type: 'concrete' },
    { x: 10, y: 7, width: 0.4, height: 0.4, type: 'concrete' },
    { x: 15, y: 7, width: 0.4, height: 0.4, type: 'concrete' },

    // Movable partition walls (lighter construction)
    { x: 0, y: 5, width: 8, height: 0.1, type: 'drywall' },
    { x: 12, y: 5, width: 8, height: 0.1, type: 'drywall' },
  ];
};

// Ballroom with minimal obstacles (large open space)
export const ballroomLayout = (): Obstacle[] => {
  return [
    // Structural columns only (40ft spacing typical)
    { x: 12, y: 6, width: 0.5, height: 0.5, type: 'concrete' },
    { x: 12, y: 12, width: 0.5, height: 0.5, type: 'concrete' },
    { x: 24, y: 6, width: 0.5, height: 0.5, type: 'concrete' },
    { x: 24, y: 12, width: 0.5, height: 0.5, type: 'concrete' },

    // Back-of-house wall (kitchen/service)
    { x: 0, y: 9, width: 6, height: 0.2, type: 'concrete' },
  ];
};

export interface FloorPlan {
  name: string;
  width: number;  // meters
  height: number; // meters
  obstacles: Obstacle[];
  defaultAPLocations: Array<{ x: number; y: number }>;
  description: string;
}

export const floorPlans: Record<string, FloorPlan> = {
  'standard-room': {
    name: 'Standard Hotel Room',
    width: 6,
    height: 8,
    obstacles: standardRoomLayout(),
    defaultAPLocations: [{ x: 3, y: 2 }],
    description: '320 sq ft room - typical chain hotel'
  },

  'suite': {
    name: 'Luxury Suite',
    width: 12,
    height: 10,
    obstacles: suiteLayout(),
    defaultAPLocations: [{ x: 3, y: 3 }],
    description: '600 sq ft suite with separate living area'
  },

  'presidential-suite': {
    name: 'Presidential Suite',
    width: 16,
    height: 12,
    obstacles: presidentialSuiteLayout(),
    defaultAPLocations: [{ x: 5, y: 5 }],
    description: '1500 sq ft luxury suite - shows coverage challenges'
  },

  'hotel-corridor': {
    name: 'Hotel Corridor',
    width: 30,
    height: 8.2,
    obstacles: hotelCorridorLayout(),
    defaultAPLocations: [
      { x: 7, y: 4 },
      { x: 23, y: 4 }
    ],
    description: 'Typical hotel hallway with guest rooms'
  },

  'conference-room': {
    name: 'Conference Center',
    width: 20,
    height: 10,
    obstacles: conferenceRoomLayout(),
    defaultAPLocations: [
      { x: 5, y: 5 },
      { x: 15, y: 5 }
    ],
    description: 'Conference space with high device density'
  },

  'ballroom': {
    name: 'Grand Ballroom',
    width: 30,
    height: 18,
    obstacles: ballroomLayout(),
    defaultAPLocations: [
      { x: 12, y: 9 },
      { x: 24, y: 9 }
    ],
    description: '3000+ sq ft event space'
  },

  'optimal-suite': {
    name: 'Optimal Suite Design',
    width: 12,
    height: 10,
    obstacles: suiteLayout(),
    defaultAPLocations: [
      { x: 3, y: 3 },
      { x: 9, y: 3 },
      { x: 6, y: 8 }
    ],
    description: 'Same suite with proper AP coverage'
  }
};
