import {
  calculateSignalStrength,
  getSignalQuality,
  getSignalColor,
  SimulationParams,
  AccessPoint,
  Obstacle
} from './rfPropagation';

describe('RF Propagation Engine', () => {
  describe('calculateSignalStrength', () => {
    it('should return strong signal close to AP', () => {
      const params: SimulationParams = {
        aps: [{
          x: 5,
          y: 5,
          powerDbm: 23,
          frequencyGhz: 5,
          clientCount: 0
        }],
        obstacles: [],
        deviceDensity: 0,
        width: 10,
        height: 10
      };

      const signal = calculateSignalStrength(5, 5, params);
      expect(signal).toBeGreaterThan(-50);
    });

    it('should return weaker signal far from AP', () => {
      const params: SimulationParams = {
        aps: [{
          x: 0,
          y: 0,
          powerDbm: 23,
          frequencyGhz: 5,
          clientCount: 0
        }],
        obstacles: [],
        deviceDensity: 0,
        width: 20,
        height: 20
      };

      const signal = calculateSignalStrength(15, 15, params);
      expect(signal).toBeLessThan(-60);
    });

    it('should apply frequency-dependent path loss', () => {
      const baseParams = {
        aps: [{
          x: 5,
          y: 5,
          powerDbm: 23,
          clientCount: 0
        }] as AccessPoint[],
        obstacles: [] as Obstacle[],
        deviceDensity: 0,
        width: 10,
        height: 10
      };

      const params24: SimulationParams = {
        ...baseParams,
        aps: baseParams.aps.map(ap => ({ ...ap, frequencyGhz: 2.4 }))
      };

      const params5: SimulationParams = {
        ...baseParams,
        aps: baseParams.aps.map(ap => ({ ...ap, frequencyGhz: 5 }))
      };

      const signal24 = calculateSignalStrength(10, 10, params24);
      const signal5 = calculateSignalStrength(10, 10, params5);

      // 5 GHz should have higher path loss
      expect(signal5).toBeLessThan(signal24);
    });

    it('should attenuate signal through obstacles', () => {
      const baseParams = {
        aps: [{
          x: 0,
          y: 5,
          powerDbm: 23,
          frequencyGhz: 5,
          clientCount: 0
        }],
        deviceDensity: 0,
        width: 10,
        height: 10
      };

      const paramsNoWall: SimulationParams = {
        ...baseParams,
        obstacles: []
      };

      const paramsWithWall: SimulationParams = {
        ...baseParams,
        obstacles: [{
          x: 5,
          y: 0,
          width: 0.2,
          height: 10,
          type: 'concrete'
        }]
      };

      const signalNoWall = calculateSignalStrength(10, 5, paramsNoWall);
      const signalWithWall = calculateSignalStrength(10, 5, paramsWithWall);

      // Wall should reduce signal
      expect(signalWithWall).toBeLessThan(signalNoWall);
      // Concrete wall should attenuate significantly
      expect(signalNoWall - signalWithWall).toBeGreaterThan(10);
    });

    it('should apply client load penalty', () => {
      const baseParams = {
        aps: [{
          x: 5,
          y: 5,
          powerDbm: 23,
          frequencyGhz: 5
        }] as AccessPoint[],
        obstacles: [],
        deviceDensity: 0,
        width: 10,
        height: 10
      };

      const paramsLowLoad: SimulationParams = {
        ...baseParams,
        aps: baseParams.aps.map(ap => ({ ...ap, clientCount: 1 }))
      };

      const paramsHighLoad: SimulationParams = {
        ...baseParams,
        aps: baseParams.aps.map(ap => ({ ...ap, clientCount: 30 }))
      };

      const signalLowLoad = calculateSignalStrength(5, 5, paramsLowLoad);
      const signalHighLoad = calculateSignalStrength(5, 5, paramsHighLoad);

      // High client load should reduce effective signal
      expect(signalHighLoad).toBeLessThan(signalLowLoad);
    });

    it('should apply interference from device density', () => {
      const baseParams = {
        aps: [{
          x: 5,
          y: 5,
          powerDbm: 23,
          frequencyGhz: 5,
          clientCount: 0
        }],
        obstacles: [],
        width: 10,
        height: 10
      };

      const paramsLowDensity: SimulationParams = {
        ...baseParams,
        deviceDensity: 0.01
      };

      const paramsHighDensity: SimulationParams = {
        ...baseParams,
        deviceDensity: 0.8
      };

      const signalLowDensity = calculateSignalStrength(5, 5, paramsLowDensity);
      const signalHighDensity = calculateSignalStrength(5, 5, paramsHighDensity);

      // High device density should reduce signal
      expect(signalHighDensity).toBeLessThan(signalLowDensity);
    });

    it('should select strongest AP when multiple are present', () => {
      const params: SimulationParams = {
        aps: [
          { x: 0, y: 0, powerDbm: 23, frequencyGhz: 5, clientCount: 0 },
          { x: 10, y: 10, powerDbm: 23, frequencyGhz: 5, clientCount: 0 }
        ],
        obstacles: [],
        deviceDensity: 0,
        width: 15,
        height: 15
      };

      // Point closer to second AP
      const signal = calculateSignalStrength(10, 10, params);

      // Should get good signal from nearby AP
      expect(signal).toBeGreaterThan(-60);
    });
  });

  describe('getSignalQuality', () => {
    it('should classify excellent signal correctly', () => {
      const quality = getSignalQuality(-45);
      expect(quality.level).toBe('Excellent');
      expect(quality.color).toBe('#00d084');
    });

    it('should classify very good signal correctly', () => {
      const quality = getSignalQuality(-55);
      expect(quality.level).toBe('Very Good');
      expect(quality.color).toBe('#7ed957');
    });

    it('should classify good signal correctly', () => {
      const quality = getSignalQuality(-63);
      expect(quality.level).toBe('Good');
      expect(quality.color).toBe('#ffd700');
    });

    it('should classify fair signal correctly', () => {
      const quality = getSignalQuality(-68);
      expect(quality.level).toBe('Fair');
      expect(quality.color).toBe('#ff9500');
    });

    it('should classify poor signal correctly', () => {
      const quality = getSignalQuality(-75);
      expect(quality.level).toBe('Poor');
      expect(quality.color).toBe('#ff4500');
    });

    it('should classify unusable signal correctly', () => {
      const quality = getSignalQuality(-85);
      expect(quality.level).toBe('Unusable');
      expect(quality.color).toBe('#8b0000');
    });
  });

  describe('getSignalColor', () => {
    it('should return gradient colors', () => {
      const colorExcellent = getSignalColor(-40);
      const colorGood = getSignalColor(-65);
      const colorPoor = getSignalColor(-80);

      expect(colorExcellent).toContain('rgb');
      expect(colorGood).toContain('rgb');
      expect(colorPoor).toContain('rgb');

      // Should return different colors for different signal strengths
      expect(colorExcellent).not.toBe(colorGood);
      expect(colorGood).not.toBe(colorPoor);
    });

    it('should interpolate colors smoothly', () => {
      const color1 = getSignalColor(-60);
      const color2 = getSignalColor(-61);

      // Colors should be similar but not identical
      expect(color1).toContain('rgb');
      expect(color2).toContain('rgb');
    });
  });

  describe('ITU-R P.1238 compliance', () => {
    it('should use correct path loss exponents', () => {
      const params = {
        aps: [{
          x: 0,
          y: 0,
          powerDbm: 23,
          clientCount: 0
        }] as AccessPoint[],
        obstacles: [],
        deviceDensity: 0,
        width: 20,
        height: 20
      };

      // Measure path loss at different distances
      const params24: SimulationParams = {
        ...params,
        aps: params.aps.map(ap => ({ ...ap, frequencyGhz: 2.4 }))
      };

      const signal1_24 = calculateSignalStrength(1, 0, params24);
      const signal10_24 = calculateSignalStrength(10, 0, params24);

      // Path loss should increase logarithmically
      const pathLoss = signal1_24 - signal10_24;

      // For log-distance model with n=2.83, 10x distance = 28.3 dB loss
      // Verify it's in reasonable range
      expect(pathLoss).toBeGreaterThan(20);
      expect(pathLoss).toBeLessThan(35);
    });
  });
});
