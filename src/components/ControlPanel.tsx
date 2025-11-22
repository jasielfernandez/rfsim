import { Signal, Wifi, Users, Layers, Radio, Zap } from 'lucide-react';

interface ControlPanelProps {
  powerDbm: number;
  setPowerDbm: (value: number) => void;
  frequencyGhz: number;
  setFrequencyGhz: (value: number) => void;
  deviceDensity: number;
  setDeviceDensity: (value: number) => void;
  clientCount: number;
  setClientCount: (value: number) => void;
  obstacleCount: number;
  setObstacleCount: (value: number) => void;
  onLoadPreset: (preset: string) => void;
}

export default function ControlPanel({
  powerDbm,
  setPowerDbm,
  frequencyGhz,
  setFrequencyGhz,
  deviceDensity,
  setDeviceDensity,
  clientCount,
  setClientCount,
  obstacleCount,
  setObstacleCount,
  onLoadPreset
}: ControlPanelProps) {
  return (
    <div className="space-y-6">
      {/* Presets Section */}
      <div className="glass-effect rounded-xl p-6">
        <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Gaylord Opryland Scenarios
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => onLoadPreset('standard-room')}
            className="glass-effect-dark hover:bg-white/10 transition-all px-4 py-3 rounded-lg text-left"
          >
            <div className="text-white font-medium">Standard Room</div>
            <div className="text-gray-400 text-sm">1 AP, typical load</div>
          </button>
          <button
            onClick={() => onLoadPreset('suite')}
            className="glass-effect-dark hover:bg-white/10 transition-all px-4 py-3 rounded-lg text-left"
          >
            <div className="text-white font-medium">Suite (Problem!)</div>
            <div className="text-red-400 text-sm">1 AP, large space, poor coverage</div>
          </button>
          <button
            onClick={() => onLoadPreset('high-density')}
            className="glass-effect-dark hover:bg-white/10 transition-all px-4 py-3 rounded-lg text-left"
          >
            <div className="text-white font-medium">Conference Area</div>
            <div className="text-gray-400 text-sm">High device density</div>
          </button>
          <button
            onClick={() => onLoadPreset('optimal')}
            className="glass-effect-dark hover:bg-white/10 transition-all px-4 py-3 rounded-lg text-left"
          >
            <div className="text-white font-medium">Optimal Design</div>
            <div className="text-green-400 text-sm">Proper AP placement</div>
          </button>
        </div>
      </div>

      {/* AP Power Control */}
      <div className="glass-effect rounded-xl p-6">
        <label className="text-white font-medium mb-3 flex items-center gap-2">
          <Signal className="w-4 h-4 text-blue-400" />
          AP Transmit Power
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="10"
            max="30"
            step="1"
            value={powerDbm}
            onChange={(e) => setPowerDbm(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-white font-mono w-16 text-right">
            {powerDbm} dBm
          </span>
        </div>
        <div className="text-gray-400 text-sm mt-2">
          Typical range: 20-23 dBm (100-200 mW)
        </div>
      </div>

      {/* Frequency Band */}
      <div className="glass-effect rounded-xl p-6">
        <label className="text-white font-medium mb-3 flex items-center gap-2">
          <Radio className="w-4 h-4 text-purple-400" />
          Frequency Band
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => setFrequencyGhz(2.4)}
            className={`flex-1 px-4 py-3 rounded-lg transition-all ${
              frequencyGhz === 2.4
                ? 'bg-purple-500 text-white'
                : 'glass-effect-dark text-gray-300 hover:bg-white/10'
            }`}
          >
            <div className="font-medium">2.4 GHz</div>
            <div className="text-xs opacity-80">Better range, more interference</div>
          </button>
          <button
            onClick={() => setFrequencyGhz(5)}
            className={`flex-1 px-4 py-3 rounded-lg transition-all ${
              frequencyGhz === 5
                ? 'bg-purple-500 text-white'
                : 'glass-effect-dark text-gray-300 hover:bg-white/10'
            }`}
          >
            <div className="font-medium">5 GHz</div>
            <div className="text-xs opacity-80">Higher speed, less range</div>
          </button>
        </div>
      </div>

      {/* Client Count */}
      <div className="glass-effect rounded-xl p-6">
        <label className="text-white font-medium mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-green-400" />
          Connected Clients
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={clientCount}
            onChange={(e) => setClientCount(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-white font-mono w-12 text-right">
            {clientCount}
          </span>
        </div>
        <div className="text-gray-400 text-sm mt-2">
          {clientCount > 25 && (
            <span className="text-red-400 font-medium">⚠ Severe airtime contention!</span>
          )}
          {clientCount <= 25 && clientCount > 15 && (
            <span className="text-yellow-400 font-medium">⚠ Heavy load</span>
          )}
          {clientCount <= 15 && clientCount > 0 && (
            <span className="text-green-400">Normal load</span>
          )}
          {clientCount === 0 && <span>No clients connected</span>}
        </div>
      </div>

      {/* Device Density */}
      <div className="glass-effect rounded-xl p-6">
        <label className="text-white font-medium mb-3 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-cyan-400" />
          Device Density (Interference)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={deviceDensity}
            onChange={(e) => setDeviceDensity(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-white font-mono w-20 text-right">
            {deviceDensity.toFixed(2)}/m²
          </span>
        </div>
        <div className="text-gray-400 text-sm mt-2">
          Other WiFi devices causing co-channel interference
        </div>
      </div>

      {/* Obstacles */}
      <div className="glass-effect rounded-xl p-6">
        <label className="text-white font-medium mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-orange-400" />
          Wall Complexity
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="3"
            step="1"
            value={obstacleCount}
            onChange={(e) => setObstacleCount(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-white font-mono w-12 text-right">
            {['None', 'Light', 'Medium', 'Heavy'][obstacleCount]}
          </span>
        </div>
        <div className="text-gray-400 text-sm mt-2">
          Interior walls and obstacles affecting signal
        </div>
      </div>

      {/* Signal Quality Reference */}
      <div className="glass-effect rounded-xl p-6">
        <h3 className="text-white font-medium mb-3">Signal Quality Reference</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#00d084' }}></div>
            <span className="text-gray-300 text-sm">-50 dBm: Excellent</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#7ed957' }}></div>
            <span className="text-gray-300 text-sm">-60 dBm: Very Good</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ffd700' }}></div>
            <span className="text-gray-300 text-sm font-medium">-65 dBm: Good (minimum standard)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ff9500' }}></div>
            <span className="text-gray-300 text-sm">-70 dBm: Fair</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ff4500' }}></div>
            <span className="text-gray-300 text-sm">-80 dBm: Poor</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b0000' }}></div>
            <span className="text-gray-300 text-sm">-90 dBm: Unusable</span>
          </div>
        </div>
      </div>
    </div>
  );
}
