import { useState, useEffect } from 'react';
import { Hotel } from 'lucide-react';
import AdvancedHeatMap from './components/AdvancedHeatMap';
import FloatingControls from './components/FloatingControls';
import CoverageStats from './components/CoverageStats';
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
  const [showRulers, setShowRulers] = useState(true);
  const [showObstacles, setShowObstacles] = useState(true);
  const [showAPs, setShowAPs] = useState(true);
  const [showStats, setShowStats] = useState(true);

  // AP management
  const [aps, setAPs] = useState<AccessPoint[]>([]);
  const [currentPreset, setCurrentPreset] = useState('suite');

  // Generate obstacles based on scenario
  const generateObstacles = (preset: string): Obstacle[] => {
    const obstacles: Obstacle[] = [];

    if (preset === 'standard-room') {
      obstacles.push({
        x: 8,
        y: 0,
        width: 0.2,
        height: 4,
        type: 'drywall'
      });
    } else if (preset === 'suite') {
      // Large suite with multiple rooms
      obstacles.push({
        x: 5,
        y: 0,
        width: 0.2,
        height: 8,
        type: 'drywall'
      });
      obstacles.push({
        x: 0,
        y: 5,
        width: 5,
        height: 0.2,
        type: 'drywall'
      });
      obstacles.push({
        x: 8,
        y: 0,
        width: 0.2,
        height: 4,
        type: 'drywall'
      });
    } else if (preset === 'high-density') {
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

  // Load preset scenario
  const loadPreset = (preset: string) => {
    setCurrentPreset(preset);

    const baseAP = {
      powerDbm,
      frequencyGhz,
      clientCount
    };

    switch (preset) {
      case 'standard-room':
        setPowerDbm(23);
        setFrequencyGhz(5);
        setDeviceDensity(0.1);
        setClientCount(4);
        setObstacleCount(1);
        setAPs([{ ...baseAP, x: 5, y: 3, powerDbm: 23, frequencyGhz: 5, clientCount: 4 }]);
        break;

      case 'suite':
        setPowerDbm(23);
        setFrequencyGhz(5);
        setDeviceDensity(0.15);
        setClientCount(12);
        setObstacleCount(2);
        setAPs([{ ...baseAP, x: 3, y: 2, powerDbm: 23, frequencyGhz: 5, clientCount: 12 }]);
        break;

      case 'high-density':
        setPowerDbm(23);
        setFrequencyGhz(2.4);
        setDeviceDensity(0.8);
        setClientCount(35);
        setObstacleCount(1);
        setAPs([{ ...baseAP, x: 8, y: 4, powerDbm: 23, frequencyGhz: 2.4, clientCount: 35 }]);
        break;

      case 'optimal':
        setPowerDbm(20);
        setFrequencyGhz(5);
        setDeviceDensity(0.15);
        setClientCount(12);
        setObstacleCount(2);
        setAPs([
          { x: 3, y: 2, powerDbm: 20, frequencyGhz: 5, clientCount: 4 },
          { x: 8, y: 2, powerDbm: 20, frequencyGhz: 5, clientCount: 4 },
          { x: 5.5, y: 6, powerDbm: 20, frequencyGhz: 5, clientCount: 4 }
        ]);
        break;
    }
  };

  // Initialize with suite preset
  useEffect(() => {
    if (aps.length === 0) {
      loadPreset('suite');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle AP movement
  const handleAPMove = (apIndex: number, newX: number, newY: number) => {
    setAPs(prev => prev.map((ap, i) =>
      i === apIndex ? { ...ap, x: newX, y: newY } : ap
    ));
  };

  // Handle AP addition
  const handleAPAdd = (x: number, y: number) => {
    setAPs(prev => [...prev, {
      x,
      y,
      powerDbm,
      frequencyGhz,
      clientCount: Math.floor(clientCount / (prev.length + 1))
    }]);
  };

  // Handle AP removal
  const handleAPRemove = (apIndex: number) => {
    setAPs(prev => prev.filter((_, i) => i !== apIndex));
  };

  // Build simulation parameters
  const simParams: SimulationParams = {
    aps: aps.map(ap => ({
      ...ap,
      powerDbm,      // Use current values
      frequencyGhz,  // Use current values
      clientCount    // Use current values (distributed among APs)
    })),
    obstacles: generateObstacles(currentPreset),
    deviceDensity,
    width: currentPreset === 'suite' ? 12 : 14,
    height: currentPreset === 'suite' ? 10 : 8
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950">
      {/* Branding */}
      <div className="fixed top-6 right-6 z-40 flex items-center gap-3 bg-slate-900/80 backdrop-blur-xl border border-white/20 rounded-xl px-4 py-3 shadow-2xl">
        <Hotel className="w-6 h-6 text-blue-400" />
        <div>
          <div className="text-white font-semibold text-sm">RF Signal Visualizer</div>
          <div className="text-gray-400 text-xs">Gaylord Opryland</div>
        </div>
      </div>

      {/* Main Heat Map - Full Screen */}
      <AdvancedHeatMap
        params={simParams}
        onAPMove={handleAPMove}
        onAPAdd={handleAPAdd}
        onAPRemove={handleAPRemove}
        showAPs={showAPs}
        showObstacles={showObstacles}
        showGrid={showGrid}
        showRulers={showRulers}
      />

      {/* Floating Controls - Left */}
      <FloatingControls
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
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showRulers={showRulers}
        setShowRulers={setShowRulers}
        showAPs={showAPs}
        setShowAPs={setShowAPs}
        showObstacles={showObstacles}
        setShowObstacles={setShowObstacles}
        onLoadPreset={loadPreset}
        currentPreset={currentPreset}
      />

      {/* Coverage Stats - Top Right (below branding) */}
      {showStats && (
        <div className="fixed top-24 right-6 z-40 w-80">
          <CoverageStats params={simParams} />
        </div>
      )}

      {/* Legend - Bottom Left */}
      <div className="fixed bottom-6 left-6 z-40 bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-2xl">
        <div className="text-white text-sm font-semibold mb-3">Signal Quality</div>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-6 h-3 rounded" style={{ backgroundColor: '#00d084' }}></div>
            <span className="text-gray-300 text-xs">Excellent (-50 dBm)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-3 rounded" style={{ backgroundColor: '#7ed957' }}></div>
            <span className="text-gray-300 text-xs">Very Good (-60 dBm)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-3 rounded" style={{ backgroundColor: '#ffd700' }}></div>
            <span className="text-gray-300 text-xs font-medium">Good (-65 dBm) Target</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-3 rounded" style={{ backgroundColor: '#ff9500' }}></div>
            <span className="text-gray-300 text-xs">Fair (-70 dBm)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-3 rounded" style={{ backgroundColor: '#ff4500' }}></div>
            <span className="text-gray-300 text-xs">Poor (-80 dBm)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-3 rounded" style={{ backgroundColor: '#8b0000' }}></div>
            <span className="text-gray-300 text-xs">Unusable (&lt;-80 dBm)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
