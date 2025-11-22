import { useEffect, useRef, useState } from 'react';
import {
  calculateSignalStrength,
  getSignalColor,
  getSignalQuality,
  SimulationParams,
  AccessPoint,
  Obstacle
} from '../engine/rfPropagation';

interface HeatMapProps {
  params: SimulationParams;
  resolution?: number;  // pixels per meter
  showAPs?: boolean;
  showObstacles?: boolean;
  showGrid?: boolean;
}

export default function HeatMap({
  params,
  resolution = 20,
  showAPs = true,
  showObstacles = true,
  showGrid = false
}: HeatMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; dbm: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Render heat map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const width = params.width * resolution;
    const height = params.height * resolution;

    canvas.width = width;
    canvas.height = height;

    // Create image data for heat map
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // Calculate signal strength for each pixel
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const x = px / resolution;
        const y = py / resolution;

        const dbm = calculateSignalStrength(x, y, params);
        const color = getSignalColor(dbm);

        // Parse RGB from color string
        const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];

        const idx = (py * width + px) * 4;
        data[idx] = rgb[0];     // R
        data[idx + 1] = rgb[1]; // G
        data[idx + 2] = rgb[2]; // B
        data[idx + 3] = 255;    // A
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Apply slight blur for smoother appearance (like Electricity Maps)
    ctx.filter = 'blur(1px)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';

  }, [params, resolution]);

  // Render overlays (APs, obstacles, grid)
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = params.width * resolution;
    const height = params.height * resolution;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;

      // Vertical lines every meter
      for (let x = 0; x <= params.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * resolution, 0);
        ctx.lineTo(x * resolution, height);
        ctx.stroke();
      }

      // Horizontal lines every meter
      for (let y = 0; y <= params.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * resolution);
        ctx.lineTo(width, y * resolution);
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
          obstacle.x * resolution,
          obstacle.y * resolution,
          obstacle.width * resolution,
          obstacle.height * resolution
        );

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          obstacle.x * resolution,
          obstacle.y * resolution,
          obstacle.width * resolution,
          obstacle.height * resolution
        );
      });
    }

    // Draw access points
    if (showAPs) {
      params.aps.forEach((ap: AccessPoint) => {
        const x = ap.x * resolution;
        const y = ap.y * resolution;

        // Pulse effect
        const pulseRadius = 8 + Math.sin(Date.now() / 500) * 2;

        // Outer glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, pulseRadius * 2);
        gradient.addColorStop(0, 'rgba(0, 191, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 191, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius * 2, 0, Math.PI * 2);
        ctx.fill();

        // AP icon (wifi symbol)
        ctx.fillStyle = '#00bfff';
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inner white dot
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Client count indicator
        if (ap.clientCount > 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(x + 12, y - 8, 24, 16);

          ctx.fillStyle = 'white';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${ap.clientCount}`, x + 24, y + 2);
        }
      });
    }

  }, [params, resolution, showAPs, showObstacles, showGrid]);

  // Handle mouse move for signal strength tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const x = (px / rect.width) * params.width;
    const y = (py / rect.height) * params.height;

    const dbm = calculateSignalStrength(x, y, params);

    setHoveredPoint({ x, y, dbm });
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setMousePos(null);
  };

  return (
    <div className="relative">
      <div className="relative inline-block">
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0"
          style={{ imageRendering: 'pixelated' }}
        />
        <canvas
          ref={overlayRef}
          className="relative"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: 'crosshair' }}
        />
      </div>

      {/* Signal strength tooltip */}
      {hoveredPoint && mousePos && (
        <div
          className="fixed z-50 glass-effect-dark rounded-lg px-4 py-3 pointer-events-none"
          style={{
            left: mousePos.x + 15,
            top: mousePos.y + 15,
          }}
        >
          <div className="text-white text-sm font-medium">
            {hoveredPoint.dbm.toFixed(1)} dBm
          </div>
          <div
            className="text-xs mt-1"
            style={{ color: getSignalQuality(hoveredPoint.dbm).color }}
          >
            {getSignalQuality(hoveredPoint.dbm).level}
          </div>
          <div className="text-gray-400 text-xs mt-1">
            {getSignalQuality(hoveredPoint.dbm).description}
          </div>
        </div>
      )}
    </div>
  );
}
