# Node METAR Map

A TypeScript/Node.js application that visualizes aviation weather (METAR) data on NeoPixel LED strips for Raspberry Pi. Displays flight categories with color-coded LEDs and animates wind and lightning conditions.

## Features

- ✅ **Real-time METAR data** from aviationweather.gov JSON API
- ✅ **Color-coded flight categories**: VFR (green), MVFR (blue), IFR (red), LIFR (magenta)
- ✅ **Wind animation**: Blink or fade LEDs when winds exceed threshold
- ✅ **Lightning detection**: White flash for thunderstorms
- ✅ **High winds warning**: Yellow LED for dangerous wind conditions
- ✅ **Sunrise/sunset dimming**: Auto-adjust brightness based on location
- ✅ **Legend LEDs**: Optional visual guide at end of strip
- ✅ **Graceful shutdown**: Cleanly turns off LEDs on exit
- ✅ **Null-safe**: Handles missing METAR data gracefully
- ✅ **TypeScript**: Full type safety
- ✅ **Mock GPIO**: Develop and test without Raspberry Pi hardware

## Requirements

### Hardware
- Raspberry Pi (Zero W, 3, 4, or 5)
- WS2811/WS2812 NeoPixel LED strip
- 5V power supply (adequate for your LED count)
- Wiring: Data pin to GPIO 18 (PWM)

### Software
- Node.js 18+ (20 LTS recommended)
- Raspberry Pi OS (Bookworm or newer)
- Git

## Installation

### Local Development (Without Raspberry Pi)

```bash
# Clone the repository
cd /home/jeff/Documents/Development
git clone <your-repo-url> nodeMetarMap
cd nodeMetarMap

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit configuration (USE_MOCK_GPIO=true for dev)

# Build TypeScript
npm run build

# Run with mock GPIO
npm run dev
```

### Deployment to Raspberry Pi

```bash
# On your development machine
cd /home/jeff/Documents/Development/nodeMetarMap
git push origin main  # Push your changes

# On Raspberry Pi
ssh pi@metarmap.local
cd ~
git clone <your-repo-url> nodeMetarMap
cd nodeMetarMap

# Install dependencies (production only)
npm install --production

# Configure for Pi
cp .env.example .env
nano .env  # Set USE_MOCK_GPIO=false and configure

# Build
npm run build

# Install PM2 globally
sudo npm install -g pm2

# Start the service
sudo npm run pm2:start

# Save PM2 configuration for auto-start on boot
pm2 save
pm2 startup  # Follow the printed instructions

# View logs
npm run pm2:logs
```

## Configuration

All configuration is done via environment variables in the `.env` file. See `.env.example` for all available options.

### Key Configuration Options

#### LED Hardware
```bash
LED_COUNT=50              # Number of LEDs in your strip
LED_PIN=18                # GPIO pin (BCM numbering)
LED_BRIGHTNESS=0.5        # Normal brightness (0.0 to 1.0)
LED_ORDER=GRB             # Color order (GRB for WS2811, RGB for others)
```

#### Airports
```bash
# Method 1: Inline list
AIRPORTS=KGMU,KCLT,KJQF

# Method 2: File path
AIRPORTS_FILE=/home/pi/airports
```

#### Colors (GRB Format for WS2811)
```bash
COLOR_VFR=255,0,0         # Green (G=255, R=0, B=0)
COLOR_MVFR=0,0,255        # Blue
COLOR_IFR=0,255,0         # Red (G=0, R=255, B=0)
COLOR_LIFR=255,0,255      # Magenta
```

#### Animation
```bash
ACTIVATE_WIND_ANIMATION=true
WIND_BLINK_THRESHOLD=15          # Knots
HIGH_WINDS_THRESHOLD=25          # Knots (-1 to disable)
FADE_INSTEAD_OF_BLINK=false      # Fade vs blink
BLINK_SPEED=1.0                  # Seconds per cycle
BLINK_TOTAL_TIME_SECONDS=300     # Total runtime (5 minutes)
```

#### Daytime Dimming
```bash
ACTIVATE_DAYTIME_DIMMING=true
USE_SUNRISE_SUNSET=true
LOCATION_LAT=35.2271              # Your latitude
LOCATION_LON=-80.8431             # Your longitude
```

## Usage

### Development Commands

```bash
npm run dev           # Run with ts-node (development)
npm run build         # Compile TypeScript to JavaScript
npm start             # Run compiled JavaScript
npm test              # Run Jest tests
npm run test:watch    # Run tests in watch mode
npm run pixels-off    # Turn off all LEDs
npm run lint          # Run ESLint
```

### Production Commands (PM2)

```bash
sudo npm run pm2:start    # Start the service
npm run pm2:stop          # Stop the service
npm run pm2:restart       # Restart the service
npm run pm2:logs          # View logs
npm run pm2:delete        # Remove from PM2
```

### Manual Execution

```bash
# Run once manually
sudo npm start

# Turn off LEDs
sudo npm run pixels-off
```

## How It Works

1. **Startup**: Loads configuration and initializes LED strip
2. **Data Fetch**: Retrieves METAR data for all configured airports from aviationweather.gov
3. **Processing**: Parses weather data and determines flight category for each airport
4. **Display**: Maps each airport to an LED and sets color based on conditions
5. **Animation**: Cycles through wind/lightning animations for configured duration
6. **Shutdown**: Cleanly exits and turns off LEDs

### Flight Category Rules (FAA)

- **VFR** (Green): Ceiling >3000 ft AND Visibility >5 SM
- **MVFR** (Blue): Ceiling 1000-3000 ft OR Visibility 3-5 SM
- **IFR** (Red): Ceiling 500-1000 ft OR Visibility 1-3 SM
- **LIFR** (Magenta): Ceiling <500 ft OR Visibility <1 SM

### LED Display Priority

1. **Lightning** (White flash): Thunderstorms detected
2. **High Winds** (Yellow): Winds/gusts ≥ HIGH_WINDS_THRESHOLD
3. **Windy** (Blink/Fade): Winds/gusts ≥ WIND_BLINK_THRESHOLD
4. **Flight Category** (Color): Normal weather display

## Project Structure

```
nodeMetarMap/
├── src/
│   ├── index.ts                 # Main application entry point
│   ├── config.ts                # Configuration loader
│   ├── types.ts                 # TypeScript type definitions
│   ├── services/
│   │   ├── ledService.ts        # LED control (real + mock)
│   │   ├── metarService.ts      # METAR data fetching
│   │   └── timeService.ts       # Sunrise/sunset calculations
│   ├── utils/
│   │   ├── flightCategory.ts    # Flight category calculation
│   │   ├── colorMapper.ts       # Condition to color mapping
│   │   └── shutdown.ts          # Graceful shutdown handling
│   └── scripts/
│       └── pixelsOff.ts         # LED shutdown utility
├── tests/                       # Jest unit tests
├── dist/                        # Compiled JavaScript (gitignored)
├── logs/                        # PM2 logs (gitignored)
├── .env                         # Local configuration (gitignored)
├── .env.example                 # Configuration template
├── ecosystem.config.js          # PM2 configuration
├── package.json
├── tsconfig.json
└── README.md
```

## GPIO Wiring

### Raspberry Pi GPIO Pinout

```
Pin  2 (5V Power)    → LED Strip Red Wire (Power)
Pin  6 (Ground)      → LED Strip Blue/Black Wire (Ground)
Pin 12 (GPIO 18 PWM) → LED Strip White/Green Wire (Data)
```

**Important**: GPIO 18 supports hardware PWM which is required for reliable NeoPixel timing.

## Troubleshooting

### "Failed to load rpi-ws281x-native"
- **Solution**: Running on development machine? Set `USE_MOCK_GPIO=true` in `.env`
- **Solution**: On Pi, install: `sudo npm install rpi-ws281x-native`

### "Permission denied" or GPIO errors
- **Solution**: Run with `sudo` for GPIO access: `sudo npm start`

### "No METAR data for airport"
- **Cause**: Airport not reporting, invalid ICAO code, or API issue
- **Solution**: Check airport code is valid 4-letter ICAO (e.g., KJFK, not JFK)
- **Behavior**: LED will remain off (clear) for that airport

### LEDs wrong color
- **Cause**: Incorrect LED_ORDER setting
- **Solution**: Try changing `LED_ORDER=GRB` to `LED_ORDER=RGB` (or vice versa)

### PM2 not restarting on schedule
- **Check**: `pm2 logs metar-map` for errors
- **Solution**: Verify cron syntax in `ecosystem.config.js`
- **Test**: `pm2 restart metar-map` manually

### TypeScript compilation errors
- **Solution**: Delete `node_modules` and `dist`, then: `npm install && npm run build`

## Differences from Python Version

| Feature | Python Version | Node.js Version |
|---------|----------------|-----------------|
| **API Format** | XML | JSON |
| **Type Safety** | None | TypeScript |
| **Configuration** | Hardcoded in script | Environment variables |
| **Display Support** | OLED (optional) | Not implemented |
| **Async** | Synchronous | Async/await throughout |
| **GPIO Mock** | None | Built-in mock for development |
| **Process Management** | nohup | PM2 with cron restart |
| **Tests** | None | Jest unit tests |
| **Null Handling** | Basic | Comprehensive (nullable flight category) |

## Development Workflow

### Local Development
1. Make changes to TypeScript source in `src/`
2. Test locally: `npm run dev` (with `USE_MOCK_GPIO=true`)
3. Run tests: `npm test`
4. Build: `npm run build`
5. Commit: `git commit -am "Description"`
6. Push: `git push origin main`

### Deploy to Pi
1. SSH to Pi: `ssh pi@metarmap.local`
2. Pull changes: `cd ~/nodeMetarMap && git pull`
3. Install new dependencies (if any): `npm install --production`
4. Build: `npm run build`
5. Restart: `npm run pm2:restart`
6. Check logs: `npm run pm2:logs`

## Contributing

This is a personal project, but suggestions and improvements are welcome! Open an issue or submit a pull request.

## License

MIT

## Credits

Ported from the original Python METAR Map project. Redesigned for Node.js/TypeScript with modern async patterns and improved error handling.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the configuration in `.env.example`
3. Check PM2 logs: `npm run pm2:logs`
4. Open an issue on GitHub
