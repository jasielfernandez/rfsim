import { useEffect, useRef, useState, useCallback } from 'react';
import {
  calculateSignalStrength,
  getSignalColor,
  getSignalQuality,
  SimulationParams,
  AccessPoint,
  Obstacle
} from '../engine/rfPropagation';

interface FastHeatMapProps {
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

export default function FastHeatMap({
  params,
  onAPMove,
  onAPAdd,
  showAPs = true,
  showObstacles = true,
  showGrid = false,
  showRulers = true
}: FastHeatMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const heatMapRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; dbm: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<DragState>({ isDragging: false, apIndex: -1 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [pixelsPerMeter, setPixelsPerMeter] = useState(50);

  // Cached heat map - only regenerate when APs move
  const cachedImageDataRef = useRef<ImageData | null>(null);
  const lastAPsRef = useRef<string>('');

  // Calculate dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });

        const ppmWidth = (rect.width - 100) / params.width;
        const ppmHeight = (rect.height - 100) / params.height;
        setPixelsPerMeter(Math.min(ppmWidth, ppmHeight, 50));
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [params.width, params.height]);

  // ONLY regenerate heat map when AP positions change
  useEffect(() => {
    const canvas = heatMapRef.current;
    if (!canvas || dimensions.width === 0) return;

    // Check if APs actually moved
    const currentAPs = params.aps.map(ap => `${ap.x.toFixed(1)},${ap.y.toFixed(1)},${ap.powerDbm},${ap.frequencyGhz}`).join('|');

    // Skip if APs haven't moved and we have a cached image
    if (currentAPs === lastAPsRef.current && cachedImageDataRef.current) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(cachedImageDataRef.current, 0, 0);
      }
      return;
    }

    lastAPsRef.current = currentAPs;

    const ctx = canvas.getContext('2d', { willReadFrequently: false, alpha: true });
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const offsetX = (dimensions.width - params.width * pixelsPerMeter) / 2;
    const offsetY = (dimensions.height - params.height * pixelsPerMeter) / 2;

    // Low resolution for speed - optimized for real-time interaction
    const samplesPerMeter = 1.0;
    const sampleWidth = Math.ceil(params.width * samplesPerMeter);
    const sampleHeight = Math.ceil(params.height * samplesPerMeter);

    // Pre-calculate signal grid
    const signalGrid: number[][] = [];
    for (let sy = 0; sy <= sampleHeight; sy++) {
      signalGrid[sy] = [];
      for (let sx = 0; sx <= sampleWidth; sx++) {
        const x = sx / samplesPerMeter;
        const y = sy / samplesPerMeter;
        signalGrid[sy][sx] = calculateSignalStrength(x, y, params);
      }
    }

    // Simple nearest-neighbor lookup (faster than interpolation)
    const getSignal = (x: number, y: number): number => {
      const sx = Math.round(x * samplesPerMeter);
      const sy = Math.round(y * samplesPerMeter);
      return signalGrid[sy]?.[sx] ?? -100;
    };

    // Render
    const imageData = ctx.createImageData(dimensions.width, dimensions.height);
    const data = imageData.data;

    for (let py = 0; py < dimensions.height; py++) {
      for (let px = 0; px < dimensions.width; px++) {
        const x = (px - offsetX) / pixelsPerMeter;
        const y = (py - offsetY) / pixelsPerMeter;

        let alpha = 255;
        const dbm = (x >= 0 && x <= params.width && y >= 0 && y <= params.height)
          ? getSignal(x, y)
          : (alpha = 50, -100);

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
    cachedImageDataRef.current = imageData;

  }, [params.aps, params.obstacles, params.deviceDensity, params.width, params.height, dimensions, pixelsPerMeter]);

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
      ctx.font = '10px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;

      const step = params.width > 15 ? 5 : 2;

      for (let x = 0; x <= params.width; x += step) {
        const px = toCanvasX(x);
        ctx.beginPath();
        ctx.moveTo(px, offsetY - 5);
        ctx.lineTo(px, offsetY - 12);
        ctx.stroke();
        ctx.fillText(`${x}m`, px - 6, offsetY - 15);
      }

      for (let y = 0; y <= params.height; y += step) {
        const py = toCanvasY(y);
        ctx.beginPath();
        ctx.moveTo(offsetX - 5, py);
        ctx.lineTo(offsetX - 12, py);
        ctx.stroke();
        ctx.fillText(`${y}m`, offsetX - 30, py + 3);
      }
    }

    // Grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 0.5;
      const gridStep = params.width > 20 ? 2 : 1;
      for (let x = 0; x <= params.width; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(x), toCanvasY(0));
        ctx.lineTo(toCanvasX(x), toCanvasY(params.height));
        ctx.stroke();
      }
      for (let y = 0; y <= params.height; y += gridStep) {
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
          drywall: 'rgba(200, 200, 200, 0.65)',
          concrete: 'rgba(100, 100, 100, 0.8)',
          metal: 'rgba(150, 150, 150, 0.9)',
          glass: 'rgba(135, 206, 250, 0.45)'
        };

        ctx.fillStyle = colors[obstacle.type] || 'rgba(128, 128, 128, 0.6)';
        ctx.fillRect(
          toCanvasX(obstacle.x),
          toCanvasY(obstacle.y),
          metersToPixels(obstacle.width),
          metersToPixels(obstacle.height)
        );

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
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

        const radius = isDragging ? 14 : 11;
        ctx.fillStyle = isDragging ? '#0ea5e9' : '#00bfff';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // WiFi symbol
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.2;
        for (let i = 1; i <= 2; i++) {
          ctx.beginPath();
          ctx.arc(x, y, radius - 2 - i * 1.5, -Math.PI * 0.65, -Math.PI * 0.35);
          ctx.stroke();
        }

        ctx.fillStyle = 'white';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`AP${index + 1}`, x, y + radius + 12);
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
      return Math.hypot(px - apX, py - apY) < 15;
    });

    if (apIndex !== -1) {
      setDragState({ isDragging: true, apIndex });
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
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
      const dbm = calculateSignalStrength(x, y, params);
      setHoveredPoint({ x, y, dbm });
      setMousePos({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredPoint(null);
      setMousePos(null);
    }
  }, [dragState, dimensions, params, pixelsPerMeter, onAPMove]);

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
