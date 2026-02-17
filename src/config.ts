/**
 * Configuration loader for Node METAR Map
 * Loads configuration from environment variables and validates
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import { Config, Color, AirportMapping, AirportsConfigFile, AirportConfig } from './types';

// Load environment variables from .env file
dotenv.config();

/**
 * Parse a color string in format "r,g,b" to Color object
 * @param colorStr - Color string like "255,0,0"
 * @returns Color object with r, g, b properties
 */
function parseColor(colorStr: string): Color {
  const parts = colorStr.split(',').map(s => s.trim());
  if (parts.length !== 3) {
    throw new Error(`Invalid color format: ${colorStr}. Expected format: "r,g,b"`);
  }
  
  const [r, g, b] = parts.map(Number);
  
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    throw new Error(`Invalid color values: ${colorStr}. All values must be numbers.`);
  }
  
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    throw new Error(`Color values out of range: ${colorStr}. Values must be 0-255.`);
  }
  
  return { r, g, b };
}

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load airports from JSON configuration file
 */
async function loadAirportsFromJson(path: string): Promise<AirportMapping[]> {
  const content = await fs.readFile(path, 'utf-8');
  const config: AirportsConfigFile = JSON.parse(content);
  
  // Validate version
  if (config.version !== '1.0') {
    console.warn(`Unknown config version: ${config.version}`);
  }
  
  // Filter enabled airports and validate
  const airports = config.airports
    .filter((a: AirportConfig) => a.enabled !== false)
    .map((a: AirportConfig) => ({
      code: a.code.toUpperCase(),
      led: a.led,
      name: a.name
    }));
  
  // Validate LED indices
  validateLedMapping(airports);
  
  console.log(`Loaded ${airports.length} airports from ${path} (JSON format)`);
  return airports;
}

/**
 * Load airports from text file (backward compatibility)
 */
async function loadAirportsFromTextFile(path: string): Promise<AirportMapping[]> {
  const content = await fs.readFile(path, 'utf-8');
  const lines = content.split('\n').map(l => l.trim());
  
  const airports = lines
    .map((code, index) => ({
      code: code.toUpperCase(),
      led: index,
      name: undefined
    }))
    .filter(a => a.code && a.code !== 'NULL');
  
  console.log(`Loaded ${airports.length} airports from ${path} (text format)`);
  return airports;
}

/**
 * Load airports from environment variable (simple format)
 */
function loadAirportsFromEnvVar(value: string): AirportMapping[] {
  const airports = value
    .split(',')
    .map((code, index) => ({
      code: code.trim().toUpperCase(),
      led: index,
      name: undefined
    }))
    .filter(a => a.code && a.code !== 'NULL');
  
  if (airports.length === 0) {
    throw new Error('AIRPORTS environment variable is empty');
  }
  
  console.log(`Loaded ${airports.length} airports from AIRPORTS environment variable`);
  return airports;
}

/**
 * Validate LED mapping for conflicts
 */
function validateLedMapping(airports: AirportMapping[]): void {
  // Check for duplicate LED assignments
  const ledMap = new Map<number, string>();
  
  for (const airport of airports) {
    if (airport.led < 0) {
      throw new Error(`Invalid LED index for ${airport.code}: ${airport.led}`);
    }
    
    if (ledMap.has(airport.led)) {
      throw new Error(
        `LED ${airport.led} assigned to multiple airports: ` +
        `${ledMap.get(airport.led)} and ${airport.code}`
      );
    }
    
    ledMap.set(airport.led, airport.code);
  }
}

/**
 * Load airports from various sources with priority
 * Priority: 1. JSON file, 2. Env var, 3. Text file
 * @returns Array of airport mappings with LED indices
 */
async function loadAirports(): Promise<AirportMapping[]> {
  // Priority 1: JSON file
  const jsonPath = process.env.AIRPORTS_FILE_JSON || 
                  process.cwd() + '/airports.json';
  
  if (await fileExists(jsonPath)) {
    return await loadAirportsFromJson(jsonPath);
  }
  
  // Priority 2: Environment variable (comma-separated)
  if (process.env.AIRPORTS) {
    return loadAirportsFromEnvVar(process.env.AIRPORTS);
  }
  
  // Priority 3: Text file (backward compatibility)
  const textPath = process.env.AIRPORTS_FILE || '/home/pi/airports';
  if (await fileExists(textPath)) {
    return await loadAirportsFromTextFile(textPath);
  }
  
  throw new Error(
    'No airport configuration found. Please set AIRPORTS_FILE_JSON, AIRPORTS, or AIRPORTS_FILE'
  );
}

/**
 * Get environment variable with type validation
 */
function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  
  const num = parseFloat(value);
  if (isNaN(num)) {
    throw new Error(`Invalid number for ${key}: ${value}`);
  }
  return num;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  
  const lower = value.toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return true;
  if (lower === 'false' || lower === '0' || lower === 'no') return false;
  
  throw new Error(`Invalid boolean for ${key}: ${value}`);
}

/**
 * Validate time string in HH:MM format
 */
function validateTimeFormat(timeStr: string): void {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(timeStr)) {
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:MM (24-hour format)`);
  }
}

/**
 * Load and validate complete configuration
 * @returns Validated Config object
 */
export async function loadConfig(): Promise<Config> {
  console.log('Loading configuration...');
  
  // Load airports
  const airports = await loadAirports();
  
  // Development
  const useMockGpio = getEnvBoolean('USE_MOCK_GPIO', false);
  
  // LED Configuration
  const ledCount = getEnvNumber('LED_COUNT', 50);
  const ledPin = getEnvNumber('LED_PIN', 18);
  const ledBrightness = getEnvNumber('LED_BRIGHTNESS', 0.5);
  const ledBrightnessDim = getEnvNumber('LED_BRIGHTNESS_DIM', 0.1);
  const ledOrder = getEnvString('LED_ORDER', 'GRB') as 'RGB' | 'GRB';
  
  // Validate LED configuration
  if (ledCount <= 0) {
    throw new Error(`LED_COUNT must be positive: ${ledCount}`);
  }
  if (ledBrightness < 0 || ledBrightness > 1) {
    throw new Error(`LED_BRIGHTNESS must be 0-1: ${ledBrightness}`);
  }
  if (ledBrightnessDim < 0 || ledBrightnessDim > 1) {
    throw new Error(`LED_BRIGHTNESS_DIM must be 0-1: ${ledBrightnessDim}`);
  }
  if (ledOrder !== 'RGB' && ledOrder !== 'GRB') {
    throw new Error(`LED_ORDER must be RGB or GRB: ${ledOrder}`);
  }
  
  // Check if any airport LED exceeds LED count
  const maxLedIndex = Math.max(...airports.map(a => a.led));
  if (maxLedIndex >= ledCount) {
    const offendingAirport = airports.find(a => a.led === maxLedIndex);
    throw new Error(
      `LED index ${maxLedIndex} for ${offendingAirport?.code} exceeds LED_COUNT (${ledCount}). ` +
      `LED indices must be 0-${ledCount - 1}`
    );
  }
  
  // Legend LEDs validation
  const showLegend = getEnvBoolean('SHOW_LEGEND', false);
  
  // Colors
  const colors = {
    vfr: parseColor(getEnvString('COLOR_VFR', '255,0,0')),
    vfrFade: parseColor(getEnvString('COLOR_VFR_FADE', '128,0,0')),
    mvfr: parseColor(getEnvString('COLOR_MVFR', '0,0,255')),
    mvfrFade: parseColor(getEnvString('COLOR_MVFR_FADE', '0,0,128')),
    ifr: parseColor(getEnvString('COLOR_IFR', '0,255,0')),
    ifrFade: parseColor(getEnvString('COLOR_IFR_FADE', '0,128,0')),
    lifr: parseColor(getEnvString('COLOR_LIFR', '255,0,255')),
    lifrFade: parseColor(getEnvString('COLOR_LIFR_FADE', '128,0,128')),
    clear: parseColor(getEnvString('COLOR_CLEAR', '0,0,0')),
    lightning: parseColor(getEnvString('COLOR_LIGHTNING', '255,255,255')),
    highWinds: parseColor(getEnvString('COLOR_HIGH_WINDS', '255,255,0'))
  };
  
  // Animation Settings
  const activateWindAnimation = getEnvBoolean('ACTIVATE_WIND_ANIMATION', true);
  const activateLightningAnimation = getEnvBoolean('ACTIVATE_LIGHTNING_ANIMATION', true);
  const fadeInsteadOfBlink = getEnvBoolean('FADE_INSTEAD_OF_BLINK', false);
  const windBlinkThreshold = getEnvNumber('WIND_BLINK_THRESHOLD', 15);
  const highWindsThreshold = getEnvNumber('HIGH_WINDS_THRESHOLD', 25);
  const alwaysBlinkForGusts = getEnvBoolean('ALWAYS_BLINK_FOR_GUSTS', false);
  const blinkSpeed = getEnvNumber('BLINK_SPEED', 1.0);
  const blinkTotalTimeSeconds = getEnvNumber('BLINK_TOTAL_TIME_SECONDS', 300);
  
  // Validate animation settings
  if (windBlinkThreshold < 0) {
    throw new Error(`WIND_BLINK_THRESHOLD must be non-negative: ${windBlinkThreshold}`);
  }
  if (blinkSpeed <= 0) {
    throw new Error(`BLINK_SPEED must be positive: ${blinkSpeed}`);
  }
  if (blinkTotalTimeSeconds <= 0) {
    throw new Error(`BLINK_TOTAL_TIME_SECONDS must be positive: ${blinkTotalTimeSeconds}`);
  }
  
  // Daytime Dimming
  const activateDaytimeDimming = getEnvBoolean('ACTIVATE_DAYTIME_DIMMING', false);
  const brightTimeStart = getEnvString('BRIGHT_TIME_START', '07:00');
  const dimTimeStart = getEnvString('DIM_TIME_START', '19:00');
  const useSunriseSunset = getEnvBoolean('USE_SUNRISE_SUNSET', true);
  
  validateTimeFormat(brightTimeStart);
  validateTimeFormat(dimTimeStart);
  
  let locationLat: number | undefined;
  let locationLon: number | undefined;
  
  if (useSunriseSunset && activateDaytimeDimming) {
    const latStr = process.env.LOCATION_LAT;
    const lonStr = process.env.LOCATION_LON;
    
    if (!latStr || !lonStr) {
      throw new Error(
        'USE_SUNRISE_SUNSET is enabled but LOCATION_LAT or LOCATION_LON is not set'
      );
    }
    
    locationLat = parseFloat(latStr);
    locationLon = parseFloat(lonStr);
    
    if (isNaN(locationLat) || isNaN(locationLon)) {
      throw new Error(`Invalid location coordinates: ${latStr}, ${lonStr}`);
    }
    
    if (locationLat < -90 || locationLat > 90) {
      throw new Error(`LOCATION_LAT out of range: ${locationLat} (must be -90 to 90)`);
    }
    
    if (locationLon < -180 || locationLon > 180) {
      throw new Error(`LOCATION_LON out of range: ${locationLon} (must be -180 to 180)`);
    }
  }
  
  // Legend LEDs
  const offsetLegendBy = getEnvNumber('OFFSET_LEGEND_BY', 0);
  
  if (offsetLegendBy < 0) {
    throw new Error(`OFFSET_LEGEND_BY must be non-negative: ${offsetLegendBy}`);
  }
  
  // API Configuration
  const metarApiUrl = getEnvString(
    'METAR_API_URL',
    'https://aviationweather.gov/api/data/metar'
  );
  const metarUpdateInterval = getEnvNumber('METAR_UPDATE_INTERVAL', 5);
  
  // Validate update interval
  if (metarUpdateInterval <= 0) {
    throw new Error(`METAR_UPDATE_INTERVAL must be positive: ${metarUpdateInterval}`);
  }
  
  // Mock GPIO Display Options
  const mockGpioColors = getEnvBoolean('MOCK_GPIO_COLORS', true);
  const mockGpioFormatStr = getEnvString('MOCK_GPIO_FORMAT', 'strip');
  const mockGpioFormat = (mockGpioFormatStr === 'detailed' ? 'detailed' : 'strip') as 'strip' | 'detailed';
  
  // State and Logging
  const statePath = getEnvString('STATE_FILE_PATH', '/home/pi/metar-state.json');
  const enableLogging = getEnvBoolean('ENABLE_LOGGING', false);
  const logPath = enableLogging ? getEnvString('LOG_FILE_PATH', '/home/pi/metar-history.log') : undefined;
  
  const config: Config = {
    useMockGpio,
    ledCount,
    ledPin,
    ledBrightness,
    ledBrightnessDim,
    ledOrder,
    airports,
    colors,
    activateWindAnimation,
    activateLightningAnimation,
    fadeInsteadOfBlink,
    windBlinkThreshold,
    highWindsThreshold,
    alwaysBlinkForGusts,
    blinkSpeed,
    blinkTotalTimeSeconds,
    activateDaytimeDimming,
    brightTimeStart,
    dimTimeStart,
    useSunriseSunset,
    locationLat,
    locationLon,
    showLegend,
    offsetLegendBy,
    metarApiUrl,
    metarUpdateInterval,
    mockGpioColors,
    mockGpioFormat,
    statePath,
    enableLogging,
    logPath
  };
  
  console.log('Configuration loaded successfully');
  console.log(`  Airports: ${config.airports.length}`);
  console.log(`  LED Count: ${config.ledCount}`);
  console.log(`  Mock GPIO: ${config.useMockGpio}`);
  console.log(`  Wind Animation: ${config.activateWindAnimation}`);
  console.log(`  Lightning Animation: ${config.activateLightningAnimation}`);
  console.log(`  Daytime Dimming: ${config.activateDaytimeDimming}`);
  console.log(`  Show Legend: ${config.showLegend}`);
  
  return config;
}
