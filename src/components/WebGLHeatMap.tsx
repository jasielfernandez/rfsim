import { useEffect, useRef, useState, useCallback } from 'react';
import { SimulationParams } from '../engine/rfPropagation';

interface WebGLHeatMapProps {
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

// Vertex shader - simple pass-through
const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_position * 0.5 + 0.5;
  }
`;

// Fragment shader - RF signal calculation on GPU
const fragmentShaderSource = `
  precision highp float;

  varying vec2 v_texCoord;

  uniform vec2 u_resolution;
  uniform vec2 u_roomSize;
  uniform int u_apCount;
  uniform vec4 u_aps[32]; // x, y, powerDbm, frequencyGhz
  uniform int u_obstacleCount;
  uniform vec4 u_obstacles[64]; // x, y, width, height
  uniform int u_obstacleTypes[64]; // 0=drywall, 1=glass, 2=concrete, 3=metal

  // Material attenuation lookup
  float getMaterialAttenuation(int type, float freq) {
    // 2.4 GHz attenuation
    if (freq <= 3.0) {
      if (type == 0) return 3.2;  // drywall
      if (type == 1) return 2.8;  // glass
      if (type == 2) return 12.5; // concrete
      if (type == 3) return 25.4; // metal
    }
    // 5 GHz attenuation
    else {
      if (type == 0) return 3.8;  // drywall
      if (type == 1) return 4.2;  // glass
      if (type == 2) return 16.8; // concrete
      if (type == 3) return 30.2; // metal
    }
    return 0.0;
  }

  // ITU-R P.1238 log-distance path loss
  float calculatePathLoss(float distance, float freq) {
    distance = max(distance, 1.0);
    float n = freq <= 3.0 ? 2.83 : 3.89; // Path loss exponent
    float pl_d0 = 20.0 * log(freq * 1000.0) / log(10.0) - 28.0;
    return pl_d0 + 10.0 * n * log(distance) / log(10.0);
  }

  // Check if line intersects AABB (axis-aligned bounding box)
  bool lineIntersectsBox(vec2 p1, vec2 p2, vec4 box) {
    vec2 minP = min(p1, p2);
    vec2 maxP = max(p1, p2);
    vec2 boxMin = box.xy;
    vec2 boxMax = box.xy + box.zw;

    return !(maxP.x < boxMin.x || minP.x > boxMax.x ||
             maxP.y < boxMin.y || minP.y > boxMax.y);
  }

  // Calculate wall attenuation
  float calculateWallLoss(vec2 point, vec2 apPos, float freq) {
    float totalLoss = 0.0;

    for (int i = 0; i < 64; i++) {
      if (i >= u_obstacleCount) break;

      if (lineIntersectsBox(point, apPos, u_obstacles[i])) {
        totalLoss += getMaterialAttenuation(u_obstacleTypes[i], freq);
      }
    }

    return totalLoss;
  }

  // Calculate signal strength at this pixel
  float calculateSignal(vec2 point) {
    float maxSignal = -100.0;

    for (int i = 0; i < 32; i++) {
      if (i >= u_apCount) break;

      vec2 apPos = u_aps[i].xy;
      float powerDbm = u_aps[i].z;
      float freq = u_aps[i].w;

      // Calculate distance
      float distance = length(point - apPos);

      // Start with transmit power
      float signal = powerDbm;

      // Apply path loss
      signal -= calculatePathLoss(distance, freq);

      // Apply wall attenuation
      signal -= calculateWallLoss(point, apPos, freq);

      // Track maximum signal
      maxSignal = max(maxSignal, signal);
    }

    return maxSignal;
  }

  // Convert dBm to color
  vec3 signalToColor(float dbm) {
    if (dbm >= -50.0) return vec3(0.0, 0.816, 0.518); // Excellent: #00d084
    if (dbm >= -60.0) return vec3(0.494, 0.851, 0.341); // Very Good: #7ed957
    if (dbm >= -65.0) return vec3(1.0, 0.843, 0.0); // Good: #ffd700
    if (dbm >= -70.0) return vec3(1.0, 0.584, 0.0); // Fair: #ff9500
    if (dbm >= -80.0) return vec3(1.0, 0.271, 0.0); // Poor: #ff4500
    return vec3(0.545, 0.0, 0.0); // Unusable: #8b0000
  }

  void main() {
    // Convert pixel coordinate to room coordinate
    vec2 roomCoord = v_texCoord * u_roomSize;

    // Calculate signal strength
    float dbm = calculateSignal(roomCoord);

    // Convert to color
    vec3 color = signalToColor(dbm);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function WebGLHeatMap({
  params,
  onAPMove,
  onAPAdd,
  showAPs = true,
  showObstacles = true
}: WebGLHeatMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const [dragState, setDragState] = useState<DragState>({ isDragging: false, apIndex: -1 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      antialias: false,
      depth: false,
      preserveDrawingBuffer: true
    });

    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    glRef.current = gl;

    // Compile shaders
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    // Check compilation
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
      return;
    }

    // Create program
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    programRef.current = program;

    // Create full-screen quad
    const positions = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  }, []);

  // Update dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Render heat map with WebGL
  useEffect(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const canvas = canvasRef.current;

    if (!gl || !program || !canvas || dimensions.width === 0) return;

    // Set canvas size
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    gl.viewport(0, 0, dimensions.width, dimensions.height);

    // Set uniforms
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), dimensions.width, dimensions.height);
    gl.uniform2f(gl.getUniformLocation(program, 'u_roomSize'), params.width, params.height);
    gl.uniform1i(gl.getUniformLocation(program, 'u_apCount'), params.aps.length);

    // Upload AP data
    const apData: number[] = [];
    params.aps.forEach(ap => {
      apData.push(ap.x, ap.y, ap.powerDbm, ap.frequencyGhz);
    });
    // Pad to 32 APs
    while (apData.length < 32 * 4) apData.push(0, 0, 0, 0);

    for (let i = 0; i < 32; i++) {
      const loc = gl.getUniformLocation(program, `u_aps[${i}]`);
      gl.uniform4f(loc, apData[i*4], apData[i*4+1], apData[i*4+2], apData[i*4+3]);
    }

    // Upload obstacle data
    gl.uniform1i(gl.getUniformLocation(program, 'u_obstacleCount'), params.obstacles.length);

    const obstacleData: number[] = [];
    const obstacleTypes: number[] = [];
    const typeMap: Record<string, number> = { drywall: 0, glass: 1, concrete: 2, metal: 3 };

    params.obstacles.forEach(obs => {
      obstacleData.push(obs.x, obs.y, obs.width, obs.height);
      obstacleTypes.push(typeMap[obs.type] || 0);
    });

    // Pad to 64 obstacles
    while (obstacleData.length < 64 * 4) {
      obstacleData.push(0, 0, 0, 0);
      obstacleTypes.push(0);
    }

    for (let i = 0; i < 64; i++) {
      const loc = gl.getUniformLocation(program, `u_obstacles[${i}]`);
      gl.uniform4f(loc, obstacleData[i*4], obstacleData[i*4+1], obstacleData[i*4+2], obstacleData[i*4+3]);

      const typeLoc = gl.getUniformLocation(program, `u_obstacleTypes[${i}]`);
      gl.uniform1i(typeLoc, obstacleTypes[i]);
    }

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  }, [params, dimensions]);

  // Render overlay (APs, obstacles, etc.) - same as FastHeatMap
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const scaleX = dimensions.width / params.width;
    const scaleY = dimensions.height / params.height;
    const toCanvasX = (x: number) => x * scaleX;
    const toCanvasY = (y: number) => y * scaleY;

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Draw obstacles
    if (showObstacles) {
      params.obstacles.forEach(obstacle => {
        const colors: Record<string, string> = {
          drywall: 'rgba(200, 200, 200, 0.4)',
          concrete: 'rgba(100, 100, 100, 0.6)',
          metal: 'rgba(150, 150, 150, 0.7)',
          glass: 'rgba(135, 206, 250, 0.3)'
        };

        ctx.fillStyle = colors[obstacle.type] || 'rgba(128, 128, 128, 0.4)';
        ctx.fillRect(
          toCanvasX(obstacle.x),
          toCanvasY(obstacle.y),
          obstacle.width * scaleX,
          obstacle.height * scaleY
        );

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          toCanvasX(obstacle.x),
          toCanvasY(obstacle.y),
          obstacle.width * scaleX,
          obstacle.height * scaleY
        );
      });
    }

    // Draw APs
    if (showAPs) {
      params.aps.forEach((ap, index) => {
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

  }, [params, dimensions, showAPs, showObstacles, dragState]);

  // Mouse handlers (same as FastHeatMap)
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const scaleX = params.width / dimensions.width;
    const scaleY = params.height / dimensions.height;

    const apIndex = params.aps.findIndex(ap => {
      const apX = ap.x / scaleX;
      const apY = ap.y / scaleY;
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
    const scaleX = params.width / dimensions.width;
    const scaleY = params.height / dimensions.height;
    const x = px * scaleX;
    const y = py * scaleY;

    if (dragState.isDragging) {
      const clampedX = Math.max(0, Math.min(params.width, x));
      const clampedY = Math.max(0, Math.min(params.height, y));
      onAPMove(dragState.apIndex, clampedX, clampedY);
    }
  }, [dragState, dimensions, params, onAPMove]);

  const handleMouseUp = () => {
    setDragState({ isDragging: false, apIndex: -1 });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (dragState.isDragging) return;

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const scaleX = params.width / dimensions.width;
    const scaleY = params.height / dimensions.height;
    const x = px * scaleX;
    const y = py * scaleY;

    if (x >= 0 && x <= params.width && y >= 0 && y <= params.height) {
      onAPAdd(x, y);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-950">
      <canvas ref={canvasRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />
      <canvas
        ref={overlayRef}
        className="absolute inset-0 cursor-crosshair"
        style={{ width: '100%', height: '100%' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />

      <div className="absolute bottom-6 right-6 bg-slate-900/80 backdrop-blur-xl border border-white/20 rounded-lg px-3 py-2 text-xs text-white/70">
        GPU-Accelerated • Drag APs • Double-click to add
      </div>
    </div>
  );
}
