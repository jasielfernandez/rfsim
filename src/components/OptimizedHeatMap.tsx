import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  calculateSignalStrength,
  getSignalColor,
  getSignalQuality,
  SimulationParams,
  AccessPoint,
  Obstacle
} from '../engine/rfPropagation';

interface OptimizedHeatMapProps {
  params: SimulationParams;
  onAPMove: (apIndex: number, newX: number, newY: number) => void;
  onAPAdd: (x: number, y: number) => void;
  onAPRemove: (apIndex: number) => void;
  showAPs?: boolean;
  showObstacles?: boolean;
  showGrid?: boolean;
  showRulers?: boolean;
}

interface DragState {
  isDragging: boolean;
  apIndex: number;
}

export default function OptimizedHeatMap({
  params,
  onAPMove,
  onAPAdd,
  showAPs = true,
  showObstacles = true,
  showGrid = false,
  showRulers = true
}: OptimizedHeatMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const heatMapRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; dbm: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<DragState>({ isDragging: false, apIndex: -1 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [pixelsPerMeter, setPixelsPerMeter] = useState(50);

  // Cache for signal strength calculations
  const signalCacheRef = useRef<Map<string, number>>(new Map());
  const lastParamsRef = useRef<string>('');

  // Calculate dimensions and scale
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });

        // Calculate pixels per meter to fit the simulation area
        const ppmWidth = (rect.width - 100) / params.width;  // Margins for rulers
        const ppmHeight = (rect.height - 100) / params.height;
        const ppm = Math.min(ppmWidth, ppmHeight, 60); // Cap at 60 for performance
        setPixelsPerMeter(ppm);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [params.width, params.height]);

  // Memoize param changes to invalidate cache
  const paramsKey = useMemo(() => {
    return JSON.stringify({
      aps: params.aps.map(ap => ({ x: ap.x.toFixed(2), y: ap.y.toFixed(2), p: ap.powerDbm, f: ap.frequencyGhz, c: ap.clientCount })),
      obstacles: params.obstacles,
      deviceDensity: params.deviceDensity,
    });
  }, [params]);

  // Optimized signal calculation with caching
  const getSignalWithCache = useCallback((x: number, y: number): number => {
    const key = `${x.toFixed(1)},${y.toFixed(1)}`;

    if (paramsKey !== lastParamsRef.current) {
      signalCacheRef.current.clear();
      lastParamsRef.current = paramsKey;
    }

    if (!signalCacheRef.current.has(key)) {
      const signal = calculateSignalStrength(x, y, params);
      signalCacheRef.current.set(key, signal);
    }

    return signalCacheRef.current.get(key)!;
  }, [params, paramsKey]);

  // Render heat map with MUCH lower resolution for performance
  useEffect(() => {
    const canvas = heatMapRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: false, alpha: true });
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // CRITICAL: Use very low sample rate for performance (1-2 samples per meter)
    const samplesPerMeter = 2; // Reduced from 4
    const sampleWidth = Math.ceil(params.width * samplesPerMeter);
    const sampleHeight = Math.ceil(params.height * samplesPerMeter);

    console.log(`Rendering ${sampleWidth}x${sampleHeight} samples (${sampleWidth * sampleHeight} total)`);

    const startTime = performance.now();

    // Pre-calculate ALL signal strengths
    const signalData: number[][] = Array(sampleHeight + 1);
    for (let sy = 0; sy <= sampleHeight; sy++) {
      signalData[sy] = Array(sampleWidth + 1);
      for (let sx = 0; sx <= sampleWidth; sx++) {
        const x = sx / samplesPerMeter;
        const y = sy / samplesPerMeter;
        signalData[sy][sx] = getSignalWithCache(x, y);
      }
    }

    const calcTime = performance.now();
    console.log(`Signal calc: ${(calcTime - startTime).toFixed(0)}ms`);

    // Fast bilinear interpolation
    const getInterpolatedSignal = (x: number, y: number): number => {
      const sx = x * samplesPerMeter;
      const sy = y * samplesPerMeter;

      const x0 = Math.floor(sx);
      const x1 = Math.min(x0 + 1, sampleWidth);
      const y0 = Math.floor(sy);
      const y1 = Math.min(y0 + 1, sampleHeight);

      const fx = sx - x0;
      const fy = sy - y0;

      const c00 = signalData[y0][x0];
      const c10 = signalData[y0][x1];
      const c01 = signalData[y1][x0];
      const c11 = signalData[y1][x1];

      const c0 = c00 + fx * (c10 - c00);
      const c1 = c01 + fx * (c11 - c01);
      return c0 + fy * (c1 - c0);
    };

    // Render with interpolation
    const offsetX = (dimensions.width - params.width * pixelsPerMeter) / 2;
    const offsetY = (dimensions.height - params.height * pixelsPerMeter) / 2;

    // Use ImageData for faster rendering
    const imageData = ctx.createImageData(dimensions.width, dimensions.height);
    const data = imageData.data;

    for (let py = 0; py < dimensions.height; py++) {
      for (let px = 0; px < dimensions.width; px++) {
        const x = (px - offsetX) / pixelsPerMeter;
        const y = (py - offsetY) / pixelsPerMeter;

        let dbm: number;
        let alpha = 255;

        if (x >= 0 && x <= params.width && y >= 0 && y <= params.height) {
          dbm = getInterpolatedSignal(x, y);
        } else {
          dbm = -100;
          alpha = 50;
        }

        const color = getSignalColor(dbm);
        const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];

        const idx = (py * dimensions.width + px) * 4;
        data[idx] = rgb[0];
        data[idx + 1] = rgb[1];
        data[idx + 2] = rgb[2];
        data[idx + 3] = alpha;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const renderTime = performance.now();
    console.log(`Total render: ${(renderTime - startTime).toFixed(0)}ms`);

  }, [params, dimensions, pixelsPerMeter, getSignalWithCache]);

  // Render overlays
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const offsetX = (dimensions.width - params.width * pixelsPerMeter) / 2;
    const offsetY = (dimensions.height - params.height * pixelsPerMeter) / 2;

    const toCanvasX = (x: number) => offsetX + x * pixelsPerMeter;
    const toCanvasY = (y: number) => offsetY + y * pixelsPerMeter;
    const metersToPixels = (m: number) => m * pixelsPerMeter;

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Rulers
    if (showRulers) {
      ctx.font = '11px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;

      const step = params.width > 15 ? 5 : (params.width > 8 ? 2 : 1);

      for (let x = 0; x <= params.width; x += step) {
        const px = toCanvasX(x);
        ctx.beginPath();
        ctx.moveTo(px, offsetY - 8);
        ctx.lineTo(px, offsetY - 18);
        ctx.stroke();
        ctx.fillText(`${x}m`, px - 8, offsetY - 22);
      }

      for (let y = 0; y <= params.height; y += step) {
        const py = toCanvasY(y);
        ctx.beginPath();
        ctx.moveTo(offsetX - 8, py);
        ctx.lineTo(offsetX - 18, py);
        ctx.stroke();
        ctx.fillText(`${y}m`, offsetX - 38, py + 4);
      }
    }

    // Grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= params.width; x++) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(x), toCanvasY(0));
        ctx.lineTo(toCanvasX(x), toCanvasY(params.height));
        ctx.stroke();
      }
      for (let y = 0; y <= params.height; y++) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(0), toCanvasY(y));
        ctx.lineTo(toCanvasX(params.width), toCanvasY(y));
        ctx.stroke();
      }
    }

    // Obstacles
    if (showObstacles) {
      params.obstacles.forEach((obstacle: Obstacle) => {
        const colors: Record<string, string> = {
          drywall: 'rgba(200, 200, 200, 0.7)',
          concrete: 'rgba(100, 100, 100, 0.85)',
          metal: 'rgba(150, 150, 150, 0.95)',
          glass: 'rgba(135, 206, 250, 0.5)'
        };

        ctx.fillStyle = colors[obstacle.type] || 'rgba(128, 128, 128, 0.6)';
        ctx.fillRect(
          toCanvasX(obstacle.x),
          toCanvasY(obstacle.y),
          metersToPixels(obstacle.width),
          metersToPixels(obstacle.height)
        );

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
          toCanvasX(obstacle.x),
          toCanvasY(obstacle.y),
          metersToPixels(obstacle.width),
          metersToPixels(obstacle.height)
        );
      });
    }

    // APs
    if (showAPs) {
      params.aps.forEach((ap: AccessPoint, index) => {
        const x = toCanvasX(ap.x);
        const y = toCanvasY(ap.y);
        const isDragging = dragState.isDragging && dragState.apIndex === index;

        // Coverage hint
        const maxRange = 12 * pixelsPerMeter;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, maxRange);
        gradient.addColorStop(0, 'rgba(0, 191, 255, 0.12)');
        gradient.addColorStop(1, 'rgba(0, 191, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, maxRange, 0, Math.PI * 2);
        ctx.fill();

        // AP icon
        const radius = isDragging ? 16 : 12;
        ctx.fillStyle = isDragging ? '#0ea5e9' : '#00bfff';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // WiFi symbol
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;
        for (let i = 1; i <= 2; i++) {
          ctx.beginPath();
          ctx.arc(x, y, radius - 3 - i * 2, -Math.PI * 0.65, -Math.PI * 0.35);
          ctx.stroke();
        }

        // Label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`AP${index + 1}`, x, y + radius + 14);
      });
    }

  }, [params, dimensions, pixelsPerMeter, showAPs, showObstacles, showGrid, showRulers, dragState]);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const offsetX = (dimensions.width - params.width * pixelsPerMeter) / 2;
    const offsetY = (dimensions.height - params.height * pixelsPerMeter) / 2;

    const apIndex = params.aps.findIndex(ap => {
      const apX = offsetX + ap.x * pixelsPerMeter;
      const apY = offsetY + ap.y * pixelsPerMeter;
      return Math.hypot(px - apX, py - apY) < 18;
    });

    if (apIndex !== -1) {
      setDragState({ isDragging: true, apIndex });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const offsetX = (dimensions.width - params.width * pixelsPerMeter) / 2;
    const offsetY = (dimensions.height - params.height * pixelsPerMeter) / 2;

    const x = (px - offsetX) / pixelsPerMeter;
    const y = (py - offsetY) / pixelsPerMeter;

    if (dragState.isDragging) {
      const clampedX = Math.max(0, Math.min(params.width, x));
      const clampedY = Math.max(0, Math.min(params.height, y));
      onAPMove(dragState.apIndex, clampedX, clampedY);
    } else if (x >= 0 && x <= params.width && y >= 0 && y <= params.height) {
      const dbm = getSignalWithCache(x, y);
      setHoveredPoint({ x, y, dbm });
      setMousePos({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredPoint(null);
      setMousePos(null);
    }
  };

  const handleMouseUp = () => {
    setDragState({ isDragging: false, apIndex: -1 });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (dragState.isDragging) return;

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const offsetX = (dimensions.width - params.width * pixelsPerMeter) / 2;
    const offsetY = (dimensions.height - params.height * pixelsPerMeter) / 2;

    const x = (px - offsetX) / pixelsPerMeter;
    const y = (py - offsetY) / pixelsPerMeter;

    if (x >= 0 && x <= params.width && y >= 0 && y <= params.height) {
      onAPAdd(x, y);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-950">
      <canvas ref={heatMapRef} className="absolute inset-0" />
      <canvas
        ref={overlayRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />

      {hoveredPoint && mousePos && !dragState.isDragging && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-lg px-3 py-2 shadow-2xl"
          style={{ left: mousePos.x + 12, top: mousePos.y + 12 }}
        >
          <div className="text-white text-sm font-semibold">
            {hoveredPoint.dbm.toFixed(1)} dBm
          </div>
          <div className="text-xs mt-0.5" style={{ color: getSignalQuality(hoveredPoint.dbm).color }}>
            {getSignalQuality(hoveredPoint.dbm).level}
          </div>
        </div>
      )}

      <div className="absolute bottom-6 right-6 bg-slate-900/80 backdrop-blur-xl border border-white/20 rounded-lg px-3 py-2 text-xs text-white/70">
        Drag APs • Double-click to add
      </div>
    </div>
  );
}
