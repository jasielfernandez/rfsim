import { useState } from 'react';
import { Presentation, Eye, EyeOff, Grid3x3, Hotel } from 'lucide-react';
import HeatMap from './components/HeatMap';
import ControlPanel from './components/ControlPanel';
import { SimulationParams, AccessPoint, Obstacle } from './engine/rfPropagation';

function App() {
  // Simulation parameters
  const [powerDbm, setPowerDbm] = useState(23);
  const [frequencyGhz, setFrequencyGhz] = useState(5);
  const [deviceDensity, setDeviceDensity] = useState(0.15);
  const [clientCount, setClientCount] = useState(8);
  const [obstacleCount, setObstacleCount] = useState(1);

  // UI state
  const [showGrid, setShowGrid] = useState(false);
  const [showObstacles, setShowObstacles] = useState(true);
  const [showAPs, setShowAPs] = useState(true);
  const [presentationMode, setPresentationMode] = useState(false);

  // Generate obstacles based on scenario
  const generateObstacles = (preset: string): Obstacle[] => {
    const obstacles: Obstacle[] = [];

    if (preset === 'standard-room') {
      // Standard hotel room: ~30m² (5m x 6m)
      // One interior wall (bathroom)
      obstacles.push({
        x: 8,
        y: 0,
        width: 0.2,
        height: 4,
        type: 'drywall'
      });
    } else if (preset === 'suite') {
      // Large suite: ~80m² (10m x 8m) with multiple rooms
      // Living area separator
      obstacles.push({
        x: 5,
        y: 0,
        width: 0.2,
        height: 8,
        type: 'drywall'
      });
      // Bedroom wall
      obstacles.push({
        x: 0,
        y: 5,
        width: 5,
        height: 0.2,
        type: 'drywall'
      });
      // Bathroom
      obstacles.push({
        x: 8,
        y: 0,
        width: 0.2,
        height: 4,
        type: 'drywall'
      });
    } else if (preset === 'high-density') {
      // Conference area with some pillars/walls
      obstacles.push({
        x: 6,
        y: 2,
        width: 0.3,
        height: 0.3,
        type: 'concrete'
      });
      obstacles.push({
        x: 10,
        y: 5,
        width: 0.3,
        height: 0.3,
        type: 'concrete'
      });
    }

    // Add obstacles based on slider
    if (obstacleCount >= 2) {
      obstacles.push({
        x: 3,
        y: 3,
        width: 0.2,
        height: 3,
        type: 'drywall'
      });
    }
    if (obstacleCount >= 3) {
      obstacles.push({
        x: 5,
        y: 6,
        width: 4,
        height: 0.2,
        type: 'concrete'
      });
    }

    return obstacles;
  };

  // Generate APs based on scenario
  const generateAPs = (preset: string): AccessPoint[] => {
    if (preset === 'standard-room') {
      return [{
        x: 5,
        y: 3,
        powerDbm,
        frequencyGhz,
        clientCount
      }];
    } else if (preset === 'suite') {
      // Single AP in large suite (demonstrates the problem!)
      return [{
        x: 3,
        y: 2,
        powerDbm,
        frequencyGhz,
        clientCount
      }];
    } else if (preset === 'high-density') {
      // Conference area - single AP trying to serve too many people
      return [{
        x: 8,
        y: 4,
        powerDbm,
        frequencyGhz,
        clientCount: Math.max(clientCount, 30)
      }];
    } else if (preset === 'optimal') {
      // Optimal design with multiple APs
      return [
        {
          x: 3,
          y: 2,
          powerDbm: Math.min(powerDbm, 20), // Lower power to reduce overlap
          frequencyGhz,
          clientCount: Math.floor(clientCount / 3)
        },
        {
          x: 8,
          y: 2,
          powerDbm: Math.min(powerDbm, 20),
          frequencyGhz,
          clientCount: Math.floor(clientCount / 3)
        },
        {
          x: 5.5,
          y: 6,
          powerDbm: Math.min(powerDbm, 20),
          frequencyGhz,
          clientCount: Math.floor(clientCount / 3)
        }
      ];
    }

    // Default
    return [{
      x: 7,
      y: 4,
      powerDbm,
      frequencyGhz,
      clientCount
    }];
  };

  const [currentPreset, setCurrentPreset] = useState('suite');

  const loadPreset = (preset: string) => {
    setCurrentPreset(preset);

    switch (preset) {
      case 'standard-room':
        setPowerDbm(23);
        setFrequencyGhz(5);
        setDeviceDensity(0.1);
        setClientCount(4);
        setObstacleCount(1);
        break;
      case 'suite':
        // This demonstrates the problem!
        setPowerDbm(23);
        setFrequencyGhz(5);
        setDeviceDensity(0.15);
        setClientCount(12); // Family with multiple devices
        setObstacleCount(2);
        break;
      case 'high-density':
        setPowerDbm(23);
        setFrequencyGhz(2.4); // 2.4 for better range
        setDeviceDensity(0.8); // Very high interference
        setClientCount(35);
        setObstacleCount(1);
        break;
      case 'optimal':
        setPowerDbm(20); // Lower power, multiple APs
        setFrequencyGhz(5);
        setDeviceDensity(0.15);
        setClientCount(12);
        setObstacleCount(2);
        break;
    }
  };

  // Build simulation parameters
  const simParams: SimulationParams = {
    aps: generateAPs(currentPreset),
    obstacles: generateObstacles(currentPreset),
    deviceDensity,
    width: currentPreset === 'suite' ? 12 : 14,
    height: currentPreset === 'suite' ? 10 : 8
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="glass-effect rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Hotel className="w-8 h-8 text-blue-400" />
                <h1 className="text-3xl font-bold text-white">
                  WiFi Signal Quality Visualizer
                </h1>
              </div>
              <p className="text-gray-300 mt-2">
                Demonstrating RF propagation in hospitality environments
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPresentationMode(!presentationMode)}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  presentationMode
                    ? 'bg-blue-500 text-white'
                    : 'glass-effect-dark text-gray-300 hover:bg-white/10'
                }`}
              >
                <Presentation className="w-4 h-4" />
                {presentationMode ? 'Exit Presentation' : 'Presentation Mode'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visualization */}
          <div className="lg:col-span-2">
            <div className="glass-effect rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-xl font-semibold">
                  {currentPreset === 'suite' && '⚠ Suite Coverage Problem'}
                  {currentPreset === 'standard-room' && 'Standard Room'}
                  {currentPreset === 'high-density' && 'High-Density Conference Area'}
                  {currentPreset === 'optimal' && '✓ Optimal Design'}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className="px-3 py-1.5 rounded-lg glass-effect-dark hover:bg-white/10 transition-all flex items-center gap-2 text-sm text-gray-300"
                  >
                    <Grid3x3 className="w-4 h-4" />
                    {showGrid ? 'Hide' : 'Show'} Grid
                  </button>
                  <button
                    onClick={() => setShowObstacles(!showObstacles)}
                    className="px-3 py-1.5 rounded-lg glass-effect-dark hover:bg-white/10 transition-all flex items-center gap-2 text-sm text-gray-300"
                  >
                    {showObstacles ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    Walls
                  </button>
                  <button
                    onClick={() => setShowAPs(!showAPs)}
                    className="px-3 py-1.5 rounded-lg glass-effect-dark hover:bg-white/10 transition-all flex items-center gap-2 text-sm text-gray-300"
                  >
                    {showAPs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    APs
                  </button>
                </div>
              </div>

              <div className="flex justify-center items-center bg-black/30 rounded-lg p-4">
                <HeatMap
                  params={simParams}
                  resolution={30}
                  showAPs={showAPs}
                  showObstacles={showObstacles}
                  showGrid={showGrid}
                />
              </div>

              {/* Key insights for presentation */}
              {presentationMode && currentPreset === 'suite' && (
                <div className="mt-4 glass-effect-dark rounded-lg p-4 border-2 border-red-500/50">
                  <h3 className="text-red-400 font-semibold mb-2 text-lg">
                    ⚠ Critical Coverage Issue in Suites
                  </h3>
                  <ul className="text-gray-300 space-y-2 text-sm">
                    <li>• Single AP cannot provide adequate coverage in large suites</li>
                    <li>• Multiple interior walls cause significant signal attenuation</li>
                    <li>• Guests in bedroom/far areas experience poor connectivity</li>
                    <li>• VIP guests expect premium WiFi - this design fails to deliver</li>
                    <li>
                      <strong className="text-yellow-400">
                        Recommendation: Install 2-3 APs per suite for proper coverage
                      </strong>
                    </li>
                  </ul>
                </div>
              )}

              {presentationMode && currentPreset === 'optimal' && (
                <div className="mt-4 glass-effect-dark rounded-lg p-4 border-2 border-green-500/50">
                  <h3 className="text-green-400 font-semibold mb-2 text-lg">
                    ✓ Optimal Design Benefits
                  </h3>
                  <ul className="text-gray-300 space-y-2 text-sm">
                    <li>• Multiple APs provide overlapping coverage</li>
                    <li>• Lower power reduces co-channel interference</li>
                    <li>• Client load distributed across APs</li>
                    <li>• Consistent signal strength throughout space</li>
                    <li>
                      <strong className="text-green-400">
                        Result: Superior guest experience and network reliability
                      </strong>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          {!presentationMode && (
            <div className="lg:col-span-1">
              <ControlPanel
                powerDbm={powerDbm}
                setPowerDbm={setPowerDbm}
                frequencyGhz={frequencyGhz}
                setFrequencyGhz={setFrequencyGhz}
                deviceDensity={deviceDensity}
                setDeviceDensity={setDeviceDensity}
                clientCount={clientCount}
                setClientCount={setClientCount}
                obstacleCount={obstacleCount}
                setObstacleCount={setObstacleCount}
                onLoadPreset={loadPreset}
              />
            </div>
          )}

          {/* Presentation Mode - Full width insights */}
          {presentationMode && (
            <div className="lg:col-span-1">
              <div className="space-y-4">
                {/* Quick scenario switcher */}
                <div className="glass-effect rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-3">Switch Scenario</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => loadPreset('standard-room')}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        currentPreset === 'standard-room'
                          ? 'bg-blue-500 text-white'
                          : 'glass-effect-dark text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      Standard Room
                    </button>
                    <button
                      onClick={() => loadPreset('suite')}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        currentPreset === 'suite'
                          ? 'bg-red-500 text-white'
                          : 'glass-effect-dark text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      Suite Issue
                    </button>
                    <button
                      onClick={() => loadPreset('high-density')}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        currentPreset === 'high-density'
                          ? 'bg-yellow-500 text-white'
                          : 'glass-effect-dark text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      Conference
                    </button>
                    <button
                      onClick={() => loadPreset('optimal')}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        currentPreset === 'optimal'
                          ? 'bg-green-500 text-white'
                          : 'glass-effect-dark text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      Optimal
                    </button>
                  </div>
                </div>

                {/* Signal quality reference */}
                <div className="glass-effect rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-3">Signal Quality Standards</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00d084' }}></div>
                      <span className="text-gray-300 text-sm">Excellent (-50 dBm)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7ed957' }}></div>
                      <span className="text-gray-300 text-sm">Very Good (-60 dBm)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ffd700' }}></div>
                      <span className="text-gray-300 text-sm font-semibold">
                        Target: -65 dBm minimum
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff9500' }}></div>
                      <span className="text-gray-300 text-sm">Fair (-70 dBm)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff4500' }}></div>
                      <span className="text-gray-300 text-sm">Poor (-80 dBm)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto mt-6">
        <div className="glass-effect rounded-xl p-4">
          <p className="text-gray-400 text-sm text-center">
            RF Signal Quality Visualizer • Based on IEEE 802.11 standards and real-world propagation models
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
