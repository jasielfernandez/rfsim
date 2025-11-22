import { useMemo } from 'react';
import { calculateSignalStrength, SimulationParams } from '../engine/rfPropagation';
import { TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react';

interface CoverageStatsProps {
  params: SimulationParams;
}

export default function CoverageStats({ params }: CoverageStatsProps) {
  const stats = useMemo(() => {
    // Sample the area at regular intervals
    const sampleResolution = 0.5; // meters
    const samplesX = Math.ceil(params.width / sampleResolution);
    const samplesY = Math.ceil(params.height / sampleResolution);

    let totalSamples = 0;
    let excellent = 0;  // >= -50 dBm
    let veryGood = 0;   // >= -60 dBm
    let good = 0;       // >= -65 dBm
    let fair = 0;       // >= -70 dBm
    let poor = 0;       // >= -80 dBm
    let unusable = 0;   // < -80 dBm

    let sumSignal = 0;
    let minSignal = 0;
    let maxSignal = -100;

    for (let sy = 0; sy <= samplesY; sy++) {
      for (let sx = 0; sx <= samplesX; sx++) {
        const x = (sx * sampleResolution);
        const y = (sy * sampleResolution);

        if (x <= params.width && y <= params.height) {
          const dbm = calculateSignalStrength(x, y, params);
          totalSamples++;
          sumSignal += dbm;
          maxSignal = Math.max(maxSignal, dbm);
          minSignal = Math.min(minSignal, dbm);

          if (dbm >= -50) excellent++;
          else if (dbm >= -60) veryGood++;
          else if (dbm >= -65) good++;
          else if (dbm >= -70) fair++;
          else if (dbm >= -80) poor++;
          else unusable++;
        }
      }
    }

    const avgSignal = sumSignal / totalSamples;
    const acceptableCoverage = ((excellent + veryGood + good) / totalSamples) * 100;
    const excellentCoverage = ((excellent + veryGood) / totalSamples) * 100;

    return {
      avgSignal,
      minSignal,
      maxSignal,
      acceptableCoverage, // >= -65 dBm
      excellentCoverage,  // >= -60 dBm
      distribution: {
        excellent: (excellent / totalSamples) * 100,
        veryGood: (veryGood / totalSamples) * 100,
        good: (good / totalSamples) * 100,
        fair: (fair / totalSamples) * 100,
        poor: (poor / totalSamples) * 100,
        unusable: (unusable / totalSamples) * 100,
      }
    };
  }, [params]);

  const getCoverageRating = (coverage: number): { text: string; color: string; icon: any } => {
    if (coverage >= 95) return { text: 'Excellent', color: 'text-green-400', icon: TrendingUp };
    if (coverage >= 85) return { text: 'Good', color: 'text-blue-400', icon: Activity };
    if (coverage >= 70) return { text: 'Fair', color: 'text-yellow-400', icon: AlertTriangle };
    return { text: 'Poor', color: 'text-red-400', icon: TrendingDown };
  };

  const rating = getCoverageRating(stats.acceptableCoverage);
  const RatingIcon = rating.icon;

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-xl p-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-6 h-6 text-blue-400" />
        <h3 className="text-white text-lg font-semibold">Coverage Analysis</h3>
      </div>

      {/* Overall Rating */}
      <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300 text-sm">Coverage Quality</span>
          <RatingIcon className={`w-5 h-5 ${rating.color}`} />
        </div>
        <div className={`text-2xl font-bold ${rating.color}`}>
          {stats.acceptableCoverage.toFixed(1)}%
        </div>
        <div className="text-gray-400 text-xs mt-1">
          {rating.text} (-65 dBm or better)
        </div>
      </div>

      {/* Signal Strength Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-800/30 rounded-lg p-3">
          <div className="text-gray-400 text-xs mb-1">Average</div>
          <div className="text-white font-semibold">{stats.avgSignal.toFixed(1)} dBm</div>
        </div>
        <div className="bg-slate-800/30 rounded-lg p-3">
          <div className="text-gray-400 text-xs mb-1">Best</div>
          <div className="text-green-400 font-semibold">{stats.maxSignal.toFixed(1)} dBm</div>
        </div>
        <div className="bg-slate-800/30 rounded-lg p-3">
          <div className="text-gray-400 text-xs mb-1">Worst</div>
          <div className="text-red-400 font-semibold">{stats.minSignal.toFixed(1)} dBm</div>
        </div>
      </div>

      {/* Coverage Distribution */}
      <div className="space-y-3">
        <div className="text-gray-300 text-sm font-medium mb-3">Signal Distribution</div>

        {stats.distribution.excellent > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Excellent (-50 dBm)</span>
              <span className="text-green-400 font-medium">{stats.distribution.excellent.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${stats.distribution.excellent}%` }}
              />
            </div>
          </div>
        )}

        {stats.distribution.veryGood > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Very Good (-60 dBm)</span>
              <span className="text-blue-400 font-medium">{stats.distribution.veryGood.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${stats.distribution.veryGood}%` }}
              />
            </div>
          </div>
        )}

        {stats.distribution.good > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Good (-65 dBm)</span>
              <span className="text-yellow-400 font-medium">{stats.distribution.good.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500"
                style={{ width: `${stats.distribution.good}%` }}
              />
            </div>
          </div>
        )}

        {stats.distribution.fair > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Fair (-70 dBm)</span>
              <span className="text-orange-400 font-medium">{stats.distribution.fair.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500"
                style={{ width: `${stats.distribution.fair}%` }}
              />
            </div>
          </div>
        )}

        {stats.distribution.poor > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Poor (-80 dBm)</span>
              <span className="text-red-400 font-medium">{stats.distribution.poor.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500"
                style={{ width: `${stats.distribution.poor}%` }}
              />
            </div>
          </div>
        )}

        {stats.distribution.unusable > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Unusable (&lt; -80 dBm)</span>
              <span className="text-red-600 font-medium">{stats.distribution.unusable.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-800"
                style={{ width: `${stats.distribution.unusable}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {stats.acceptableCoverage < 90 && (
        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-yellow-300 text-sm font-medium mb-1">
                Coverage Below Target
              </div>
              <div className="text-yellow-200/80 text-xs">
                {stats.acceptableCoverage < 70
                  ? 'Add more access points or increase transmit power'
                  : 'Consider optimizing AP placement for better coverage'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
