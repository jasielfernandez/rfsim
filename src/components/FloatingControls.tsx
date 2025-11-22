import { useState } from 'react';
import {
  Settings, Signal, Radio, Users, Wifi, Layers,
  ChevronDown, ChevronUp, Grid3x3, Ruler, Eye, EyeOff, Zap
} from 'lucide-react';

interface FloatingControlsProps {
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
  showGrid: boolean;
  setShowGrid: (value: boolean) => void;
  showRulers: boolean;
  setShowRulers: (value: boolean) => void;
  showAPs: boolean;
  setShowAPs: (value: boolean) => void;
  showObstacles: boolean;
  setShowObstacles: (value: boolean) => void;
  onLoadPreset: (preset: string) => void;
  currentPreset: string;
}

export default function FloatingControls(props: FloatingControlsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>('presets');

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <div className="fixed top-6 left-6 z-50 w-80">
      {/* Header */}
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-t-xl p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-semibold">Simulation Controls</h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="bg-slate-900/95 backdrop-blur-xl border-x border-b border-white/20 rounded-b-xl shadow-2xl max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Presets */}
          <div className="border-b border-white/10">
            <button
              onClick={() => toggleSection('presets')}
              className="w-full px-4 py-3 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium">Scenarios</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${activeSection === 'presets' ? 'rotate-180' : ''}`} />
            </button>
            {activeSection === 'presets' && (
              <div className="px-4 py-3 space-y-2">
                <button
                  onClick={() => props.onLoadPreset('standard-room')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                    props.currentPreset === 'standard-room'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <div className="font-medium text-sm">Standard Room</div>
                  <div className="text-xs opacity-80">320 sq ft - typical hotel room</div>
                </button>
                <button
                  onClick={() => props.onLoadPreset('suite')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                    props.currentPreset === 'suite'
                      ? 'bg-red-500 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <div className="font-medium text-sm">⚠ Luxury Suite</div>
                  <div className="text-xs opacity-80">600 sq ft - 1 AP poor coverage</div>
                </button>
                <button
                  onClick={() => props.onLoadPreset('high-density')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                    props.currentPreset === 'high-density'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <div className="font-medium text-sm">Conference Center</div>
                  <div className="text-xs opacity-80">High density, movable walls</div>
                </button>
                <button
                  onClick={() => props.onLoadPreset('optimal')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                    props.currentPreset === 'optimal'
                      ? 'bg-green-500 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <div className="font-medium text-sm">✓ Optimal Suite</div>
                  <div className="text-xs opacity-80">Same suite, 3 APs properly placed</div>
                </button>
              </div>
            )}
          </div>

          {/* RF Parameters */}
          <div className="border-b border-white/10">
            <button
              onClick={() => toggleSection('rf')}
              className="w-full px-4 py-3 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Signal className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium">RF Parameters</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${activeSection === 'rf' ? 'rotate-180' : ''}`} />
            </button>
            {activeSection === 'rf' && (
              <div className="px-4 py-3 space-y-4">
                {/* Power */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 text-xs">TX Power</span>
                    <span className="text-white text-xs font-mono">{props.powerDbm} dBm</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="30"
                    step="1"
                    value={props.powerDbm}
                    onChange={(e) => props.setPowerDbm(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Frequency */}
                <div>
                  <div className="text-gray-300 text-xs mb-2">Band</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => props.setFrequencyGhz(2.4)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        props.frequencyGhz === 2.4
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      2.4 GHz
                    </button>
                    <button
                      onClick={() => props.setFrequencyGhz(5)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        props.frequencyGhz === 5
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      5 GHz
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Load Parameters */}
          <div className="border-b border-white/10">
            <button
              onClick={() => toggleSection('load')}
              className="w-full px-4 py-3 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium">Network Load</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${activeSection === 'load' ? 'rotate-180' : ''}`} />
            </button>
            {activeSection === 'load' && (
              <div className="px-4 py-3 space-y-4">
                {/* Clients */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 text-xs">Clients/AP</span>
                    <span className="text-white text-xs font-mono">{props.clientCount}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={props.clientCount}
                    onChange={(e) => props.setClientCount(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                  />
                  {props.clientCount > 25 && (
                    <div className="text-red-400 text-xs mt-1">⚠ High contention</div>
                  )}
                </div>

                {/* Device Density */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 text-xs">Interference</span>
                    <span className="text-white text-xs font-mono">{props.deviceDensity.toFixed(2)}/m²</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={props.deviceDensity}
                    onChange={(e) => props.setDeviceDensity(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* View Options */}
          <div>
            <button
              onClick={() => toggleSection('view')}
              className="w-full px-4 py-3 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium">View Options</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${activeSection === 'view' ? 'rotate-180' : ''}`} />
            </button>
            {activeSection === 'view' && (
              <div className="px-4 py-3 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-300 text-xs">Grid</span>
                  <input
                    type="checkbox"
                    checked={props.showGrid}
                    onChange={(e) => props.setShowGrid(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-300 text-xs">Rulers</span>
                  <input
                    type="checkbox"
                    checked={props.showRulers}
                    onChange={(e) => props.setShowRulers(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-300 text-xs">Access Points</span>
                  <input
                    type="checkbox"
                    checked={props.showAPs}
                    onChange={(e) => props.setShowAPs(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-300 text-xs">Obstacles</span>
                  <input
                    type="checkbox"
                    checked={props.showObstacles}
                    onChange={(e) => props.setShowObstacles(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
