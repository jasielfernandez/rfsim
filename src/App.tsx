import { useState, useEffect } from 'react';
import { Hotel } from 'lucide-react';
import WebGLHeatMap from './components/WebGLHeatMap';
import FloatingControls from './components/FloatingControls';
import CoverageStats from './components/CoverageStats';
import { SimulationParams, AccessPoint } from './engine/rfPropagation';
import { floorPlans } from './utils/floorPlans';

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
  const [showStats] = useState(true);

  // AP management
  const [aps, setAPs] = useState<AccessPoint[]>([]);
  const [currentPreset, setCurrentPreset] = useState('suite');

  // Load preset scenario with realistic floor plans
  const loadPreset = (preset: string) => {
    setCurrentPreset(preset);

    // Map old presets to floor plan keys
    const floorPlanKey = preset === 'high-density' ? 'conference-room' :
                         preset === 'optimal' ? 'optimal-suite' : preset;

    const floorPlan = floorPlans[floorPlanKey] || floorPlans['suite'];

    // Load default AP locations from floor plan
    const newAPs = floorPlan.defaultAPLocations.map(loc => ({
      x: loc.x,
      y: loc.y,
      powerDbm: preset === 'optimal' || preset === 'optimal-suite' ? 20 : 23,
      frequencyGhz: preset === 'high-density' || preset === 'conference-room' ? 2.4 : 5,
      clientCount: preset === 'high-density' || preset === 'conference-room' ? 35 :
                   (preset === 'suite' ? 12 : 4)
    }));

    setAPs(newAPs);

    // Set parameters based on scenario
    if (preset === 'high-density' || preset === 'conference-room') {
      setPowerDbm(23);
      setFrequencyGhz(2.4);
      setDeviceDensity(0.8);
      setClientCount(35);
    } else if (preset === 'suite') {
      setPowerDbm(23);
      setFrequencyGhz(5);
      setDeviceDensity(0.15);
      setClientCount(12);
    } else if (preset === 'optimal' || preset === 'optimal-suite') {
      setPowerDbm(20);
      setFrequencyGhz(5);
      setDeviceDensity(0.15);
      setClientCount(12);
    } else {
      setPowerDbm(23);
      setFrequencyGhz(5);
      setDeviceDensity(0.1);
      setClientCount(4);
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

  // Get current floor plan
  const floorPlanKey = currentPreset === 'high-density' ? 'conference-room' :
                       currentPreset === 'optimal' ? 'optimal-suite' : currentPreset;
  const currentFloorPlan = floorPlans[floorPlanKey] || floorPlans['suite'];

  // Build simulation parameters
  const simParams: SimulationParams = {
    aps: aps.map(ap => ({
      ...ap,
      powerDbm,
      frequencyGhz,
      clientCount
    })),
    obstacles: currentFloorPlan.obstacles,
    deviceDensity,
    width: currentFloorPlan.width,
    height: currentFloorPlan.height
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

      {/* Main Heat Map - Full Screen - GPU ACCELERATED */}
      <WebGLHeatMap
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
