/**
 * Configuration loader for Node METAR Map
 * Loads configuration from environment variables and validates
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import { Config, Color } from './types';

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
 * Load airports from environment variable or file
 * Priority: AIRPORTS env var > AIRPORTS_FILE path
 * @returns Array of airport ICAO codes
 */
async function loadAirports(): Promise<string[]> {
  // Try environment variable first
  if (process.env.AIRPORTS) {
    const airports = process.env.AIRPORTS
      .split(',')
      .map(code => code.trim().toUpperCase())
      .filter(code => code && code !== 'NULL');
    
    if (airports.length === 0) {
      throw new Error('AIRPORTS environment variable is empty');
    }
    
    console.log(`Loaded ${airports.length} airports from AIRPORTS environment variable`);
    return airports;
  }
  
  // Fallback to file
  const filePath = process.env.AIRPORTS_FILE || '/home/pi/airports';
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const airports = content
      .split('\n')
      .map(line => line.trim().toUpperCase())
      .filter(line => line && line !== 'NULL');
    
    if (airports.length === 0) {
      throw new Error(`Airports file ${filePath} is empty`);
    }
    
    console.log(`Loaded ${airports.length} airports from ${filePath}`);
    return airports;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Airports configuration not found. Set AIRPORTS environment variable or create file at ${filePath}`
      );
    }
    throw new Error(`Failed to read airports file ${filePath}: ${error}`);
  }
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
  
  // Check if airports exceed LED count
  const showLegend = getEnvBoolean('SHOW_LEGEND', false);
  const requiredLeds = airports.length + (showLegend ? 7 : 0);
  if (requiredLeds > ledCount) {
    throw new Error(
      `Too many airports for LED strip. ` +
      `Required: ${requiredLeds} (${airports.length} airports + ${showLegend ? 7 : 0} legend), ` +
      `Available: ${ledCount}`
    );
  }
  
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
    metarApiUrl
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
