import { useEffect, useRef, useState, useCallback } from 'react';
import {
  calculateSignalStrength,
  getSignalColor,
  getSignalQuality,
  SimulationParams,
  AccessPoint,
  Obstacle
} from '../engine/rfPropagation';

interface AdvancedHeatMapProps {
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
  startX: number;
  startY: number;
}

export default function AdvancedHeatMap({
  params,
  onAPMove,
  onAPAdd,
  onAPRemove,
  showAPs = true,
  showObstacles = true,
  showGrid = false,
  showRulers = true
}: AdvancedHeatMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const heatMapRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; dbm: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<DragState>({ isDragging: false, apIndex: -1, startX: 0, startY: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [pixelsPerMeter, setPixelsPerMeter] = useState(50);

  // Calculate dimensions and scale
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });

        // Calculate pixels per meter to fit the simulation area
        const ppmWidth = rect.width / (params.width + 4); // +4 for margins
        const ppmHeight = rect.height / (params.height + 4);
        setPixelsPerMeter(Math.min(ppmWidth, ppmHeight));
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [params.width, params.height]);

  // Render heat map with bilinear interpolation
  useEffect(() => {
    const canvas = heatMapRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Create off-screen canvas for signal strength calculation at lower resolution
    const samplesPerMeter = 4; // Reduce for performance, interpolate for smoothness
    const sampleWidth = Math.ceil(params.width * samplesPerMeter);
    const sampleHeight = Math.ceil(params.height * samplesPerMeter);

    const signalData: number[][] = [];

    // Calculate signal strength at sample points
    for (let sy = 0; sy <= sampleHeight; sy++) {
      signalData[sy] = [];
      for (let sx = 0; sx <= sampleWidth; sx++) {
        const x = (sx / samplesPerMeter);
        const y = (sy / samplesPerMeter);
        signalData[sy][sx] = calculateSignalStrength(x, y, params);
      }
    }

    // Bilinear interpolation function
    const getInterpolatedSignal = (x: number, y: number): number => {
      const sx = x * samplesPerMeter;
      const sy = y * samplesPerMeter;

      const x0 = Math.floor(sx);
      const x1 = Math.min(x0 + 1, sampleWidth);
      const y0 = Math.floor(sy);
      const y1 = Math.min(y0 + 1, sampleHeight);

      const fx = sx - x0;
      const fy = sy - y0;

      const c00 = signalData[y0]?.[x0] ?? -100;
      const c10 = signalData[y0]?.[x1] ?? -100;
      const c01 = signalData[y1]?.[x0] ?? -100;
      const c11 = signalData[y1]?.[x1] ?? -100;

      // Bilinear interpolation
      const c0 = c00 * (1 - fx) + c10 * fx;
      const c1 = c01 * (1 - fx) + c11 * fx;
      return c0 * (1 - fy) + c1 * fy;
    };

    // Render with smooth interpolation
    const imageData = ctx.createImageData(dimensions.width, dimensions.height);
    const data = imageData.data;

    const offsetX = (dimensions.width - params.width * pixelsPerMeter) / 2;
    const offsetY = (dimensions.height - params.height * pixelsPerMeter) / 2;

    for (let py = 0; py < dimensions.height; py++) {
      for (let px = 0; px < dimensions.width; px++) {
        const x = (px - offsetX) / pixelsPerMeter;
        const y = (py - offsetY) / pixelsPerMeter;

        let dbm: number;
        if (x >= 0 && x <= params.width && y >= 0 && y <= params.height) {
          dbm = getInterpolatedSignal(x, y);
        } else {
          dbm = -100; // Outside simulation area
        }

        const color = getSignalColor(dbm);
        const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];

        const idx = (py * dimensions.width + px) * 4;
        data[idx] = rgb[0];
        data[idx + 1] = rgb[1];
        data[idx + 2] = rgb[2];
        data[idx + 3] = x >= 0 && x <= params.width && y >= 0 && y <= params.height ? 255 : 50;
      }
    }

    ctx.putImageData(imageData, 0, 0);

  }, [params, dimensions, pixelsPerMeter]);

  // Render overlays (grid, rulers, APs, obstacles)
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const offsetX = (dimensions.width - params.width * pixelsPerMeter) / 2;
    const offsetY = (dimensions.height - params.height * pixelsPerMeter) / 2;

    const metersToPixels = (m: number) => m * pixelsPerMeter;
    const toCanvasX = (x: number) => offsetX + x * pixelsPerMeter;
    const toCanvasY = (y: number) => offsetY + y * pixelsPerMeter;

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Draw rulers
    if (showRulers) {
      ctx.font = '12px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;

      // Horizontal ruler (top)
      for (let x = 0; x <= params.width; x += 1) {
        const px = toCanvasX(x);
        ctx.beginPath();
        ctx.moveTo(px, offsetY - 10);
        ctx.lineTo(px, offsetY - (x % 5 === 0 ? 20 : 15));
        ctx.stroke();

        if (x % 5 === 0) {
          ctx.fillText(`${x}m`, px - 10, offsetY - 25);
        }
      }

      // Vertical ruler (left)
      for (let y = 0; y <= params.height; y += 1) {
        const py = toCanvasY(y);
        ctx.beginPath();
        ctx.moveTo(offsetX - 10, py);
        ctx.lineTo(offsetX - (y % 5 === 0 ? 20 : 15), py);
        ctx.stroke();

        if (y % 5 === 0) {
          ctx.fillText(`${y}m`, offsetX - 45, py + 4);
        }
      }
    }

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;

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

    // Draw obstacles
    if (showObstacles) {
      params.obstacles.forEach((obstacle: Obstacle) => {
        const obstacleColors: Record<string, string> = {
          drywall: 'rgba(200, 200, 200, 0.6)',
          concrete: 'rgba(100, 100, 100, 0.8)',
          metal: 'rgba(150, 150, 150, 0.9)',
          glass: 'rgba(135, 206, 250, 0.4)'
        };

        ctx.fillStyle = obstacleColors[obstacle.type] || 'rgba(128, 128, 128, 0.5)';
        ctx.fillRect(
          toCanvasX(obstacle.x),
          toCanvasY(obstacle.y),
          metersToPixels(obstacle.width),
          metersToPixels(obstacle.height)
        );

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          toCanvasX(obstacle.x),
          toCanvasY(obstacle.y),
          metersToPixels(obstacle.width),
          metersToPixels(obstacle.height)
        );
      });
    }

    // Draw access points
    if (showAPs) {
      params.aps.forEach((ap: AccessPoint, index) => {
        const x = toCanvasX(ap.x);
        const y = toCanvasY(ap.y);
        const isDragging = dragState.isDragging && dragState.apIndex === index;

        // Coverage circle (faint)
        const maxRange = 15 * pixelsPerMeter;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, maxRange);
        gradient.addColorStop(0, 'rgba(0, 191, 255, 0.15)');
        gradient.addColorStop(0.5, 'rgba(0, 191, 255, 0.05)');
        gradient.addColorStop(1, 'rgba(0, 191, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, maxRange, 0, Math.PI * 2);
        ctx.fill();

        // AP body
        const radius = isDragging ? 18 : 14;
        ctx.fillStyle = isDragging ? '#0ea5e9' : '#00bfff';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();

        // WiFi icon rings
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(x, y, radius - 4 - i * 2, -Math.PI * 0.7, -Math.PI * 0.3);
          ctx.stroke();
        }

        // Label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 11px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`AP ${index + 1}`, x, y + radius + 18);

        // Stats badge
        if (ap.clientCount > 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillRect(x + radius, y - radius - 10, 30, 20);
          ctx.fillStyle = 'white';
          ctx.font = '11px -apple-system, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`${ap.clientCount}`, x + radius + 5, y - radius + 2);
        }
      });
    }

  }, [params, dimensions, pixelsPerMeter, showAPs, showObstacles, showGrid, showRulers, dragState]);

  // Mouse interaction
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const offsetX = (dimensions.width - params.width * pixelsPerMeter) / 2;
    const offsetY = (dimensions.height - params.height * pixelsPerMeter) / 2;

    // Check if clicking on an AP
    const apIndex = params.aps.findIndex(ap => {
      const apX = offsetX + ap.x * pixelsPerMeter;
      const apY = offsetY + ap.y * pixelsPerMeter;
      const dist = Math.sqrt(Math.pow(px - apX, 2) + Math.pow(py - apY, 2));
      return dist < 20;
    });

    if (apIndex !== -1) {
      setDragState({
        isDragging: true,
        apIndex,
        startX: px,
        startY: py
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const offsetX = (dimensions.width - params.width * pixelsPerMeter) / 2;
    const offsetY = (dimensions.height - params.height * pixelsPerMeter) / 2;

    const x = (px - offsetX) / pixelsPerMeter;
    const y = (py - offsetY) / pixelsPerMeter;

    if (dragState.isDragging) {
      // Move AP
      const clampedX = Math.max(0, Math.min(params.width, x));
      const clampedY = Math.max(0, Math.min(params.height, y));
      onAPMove(dragState.apIndex, clampedX, clampedY);
    } else if (x >= 0 && x <= params.width && y >= 0 && y <= params.height) {
      // Show hover info
      const dbm = calculateSignalStrength(x, y, params);
      setHoveredPoint({ x, y, dbm });
      setMousePos({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredPoint(null);
      setMousePos(null);
    }
  };

  const handleMouseUp = () => {
    setDragState({ isDragging: false, apIndex: -1, startX: 0, startY: 0 });
  };

  const handleMouseLeave = () => {
    setDragState({ isDragging: false, apIndex: -1, startX: 0, startY: 0 });
    setHoveredPoint(null);
    setMousePos(null);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
      <canvas
        ref={heatMapRef}
        className="absolute top-0 left-0 w-full h-full"
      />
      <canvas
        ref={overlayRef}
        className="absolute top-0 left-0 w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
      />

      {/* Hover tooltip */}
      {hoveredPoint && mousePos && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePos.x + 15,
            top: mousePos.y + 15,
          }}
        >
          <div className="bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-lg px-4 py-3 shadow-2xl">
            <div className="text-white text-sm font-semibold">
              {hoveredPoint.dbm.toFixed(1)} dBm
            </div>
            <div
              className="text-xs mt-1 font-medium"
              style={{ color: getSignalQuality(hoveredPoint.dbm).color }}
            >
              {getSignalQuality(hoveredPoint.dbm).level}
            </div>
            <div className="text-gray-400 text-xs mt-1">
              Position: ({hoveredPoint.x.toFixed(1)}m, {hoveredPoint.y.toFixed(1)}m)
            </div>
          </div>
        </div>
      )}

      {/* Instructions overlay */}
      <div className="absolute bottom-6 right-6 bg-slate-900/80 backdrop-blur-xl border border-white/20 rounded-lg px-4 py-3">
        <div className="text-white text-xs space-y-1">
          <div>🖱️ <strong>Drag</strong> APs to reposition</div>
          <div>🖱️ <strong>Double-click</strong> to add AP</div>
          <div>📍 <strong>Hover</strong> for signal strength</div>
        </div>
      </div>
    </div>
  );
}
