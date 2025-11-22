# WiFi Signal Quality Visualizer

A beautiful, interactive visualization engine for demonstrating RF signal propagation and WiFi performance issues in hospitality environments. Perfect for executive presentations at venues like Gaylord Opryland.

![Signal Quality Visualization](https://img.shields.io/badge/Signal-Quality-blue)
![React](https://img.shields.io/badge/React-18.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)

## Features

### Beautiful Aesthetics
- **Electricity Maps-inspired design** with smooth color gradients
- Real-time heat map visualization showing signal degradation
- Professional dark theme optimized for presentations
- Interactive tooltips showing exact signal strength

### Physics-Based RF Simulation
- **Free Space Path Loss (FSPL)** calculations
- **Frequency-dependent propagation** (2.4GHz vs 5GHz)
- **Obstacle attenuation** (drywall, concrete, metal, glass)
- **Co-channel interference** from device density
- **Client load impact** on perceived performance

### Gaylord Opryland-Specific Scenarios
- **Standard Room**: Typical hotel room with 1 AP
- **Suite (Problem Demo)**: Large suite showing coverage gaps
- **Conference Area**: High-density device environment
- **Optimal Design**: Proper multi-AP deployment

### Interactive Controls
- AP transmit power adjustment (10-30 dBm)
- Frequency band selection (2.4GHz / 5GHz)
- Client count per AP (0-50)
- Device density slider (interference)
- Wall complexity adjustment
- Real-time parameter updates

### Presentation Mode
- Full-screen optimized layout
- Quick scenario switching
- Key insights and recommendations
- Clean, executive-friendly interface

## Technology Stack

- **React 18.3** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast development and build
- **Tailwind CSS** - Styling
- **HTML5 Canvas** - Heat map rendering
- **Lucide React** - Beautiful icons

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The application will open at `http://localhost:3000`

## Usage

### For Executive Presentations

1. **Open the app** and click "Presentation Mode"
2. **Start with "Suite (Problem Demo)"** to show the coverage issue
3. **Hover over the visualization** to show signal strength values
4. **Switch to "Optimal Design"** to demonstrate the solution
5. Use the scenario buttons to compare different configurations

### For Technical Demonstrations

1. **Use the control panel** to adjust parameters in real-time
2. **Toggle visibility** of grids, walls, and access points
3. **Experiment with different frequencies** to show propagation differences
4. **Increase client count** to demonstrate airtime contention
5. **Add device density** to show co-channel interference

## RF Propagation Model

### Signal Strength Calculation

The engine calculates received signal strength using:

```
RSSI = TX_Power - FSPL - Obstacle_Loss - Interference - Client_Load
```

Where:
- **TX_Power**: Access point transmit power (dBm)
- **FSPL**: Free Space Path Loss = 20×log₁₀(d) + 20×log₁₀(f) + 32.45
- **Obstacle_Loss**: Sum of attenuation from walls/obstacles
- **Interference**: Logarithmic impact from device density
- **Client_Load**: Airtime contention from connected clients

### Obstacle Attenuation

| Material | Attenuation |
|----------|-------------|
| Drywall  | 3 dB        |
| Glass    | 2 dB        |
| Concrete | 8 dB        |
| Metal    | 20 dB       |

### Signal Quality Thresholds

Following industry standards:

- **-50 dBm**: Excellent (green)
- **-60 dBm**: Very Good (light green)
- **-65 dBm**: Good - Minimum acceptable standard (yellow)
- **-70 dBm**: Fair (orange)
- **-80 dBm**: Poor (red-orange)
- **-90 dBm**: Unusable (dark red)

## Key Insights for Hospitality

### Why 1 AP Per Room Fails in Suites

1. **Signal attenuation**: Multiple interior walls cause 6-15 dB loss
2. **Distance**: Far corners exceed optimal range, especially at 5GHz
3. **Client density**: Families have 8-15 devices, causing airtime contention
4. **Guest expectations**: VIP suites require premium WiFi performance

### Recommended Design

- **Suites**: 2-3 APs with lower power (18-20 dBm)
- **Standard rooms**: 1 AP at moderate power (20-23 dBm)
- **Conference areas**: Dense AP deployment with proper channel planning
- **Target**: -65 dBm minimum everywhere, -60 dBm in 90% of space

## Project Structure

```
rfsim/
├── src/
│   ├── components/
│   │   ├── HeatMap.tsx          # Canvas-based heat map visualization
│   │   └── ControlPanel.tsx     # Interactive parameter controls
│   ├── engine/
│   │   └── rfPropagation.ts     # RF physics engine
│   ├── App.tsx                  # Main application
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles
├── public/
│   └── wifi-icon.svg            # App icon
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Color Scheme

Inspired by [Electricity Maps](https://app.electricitymaps.com/):

- **Excellent**: `#00d084` (vibrant green)
- **Very Good**: `#7ed957` (light green)
- **Good**: `#ffd700` (gold)
- **Fair**: `#ff9500` (orange)
- **Poor**: `#ff4500` (red-orange)
- **Unusable**: `#8b0000` (dark red)

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Author

Built for WiFi network planning and executive presentations in hospitality environments.
