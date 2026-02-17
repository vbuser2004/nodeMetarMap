/**
 * Type definitions for Node METAR Map
 * Handles aviation weather data and LED visualization
 */

/**
 * Flight category per FAA criteria
 * Can be null if METAR data is incomplete or unavailable
 */
export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR' | null;

/**
 * RGB color representation
 */
export interface Color {
  r: number;
  g: number;
  b: number;
}

/**
 * Cloud layer information from METAR
 */
export interface CloudLayer {
  cover: string;  // SKC, FEW, SCT, BKN, OVC, OVX
  base?: number;  // Cloud base in feet AGL (optional)
}

/**
 * Raw METAR data from aviationweather.gov JSON API
 * Note: fltCat can be missing if data is incomplete
 */
export interface MetarData {
  icaoId: string;
  receiptTime: string;
  obsTime: number;
  reportTime: string;
  temp?: number;
  dewp?: number;
  wdir?: number;
  wspd?: number;
  wgst?: number;
  visib?: string;  // Can be "10+" for >10 miles
  altim?: number;
  slp?: number;
  wxString?: string;
  rawOb: string;
  lat: number;
  lon: number;
  elev: number;
  name: string;
  cover?: string;
  clouds?: CloudLayer[];
  fltCat?: 'VFR' | 'MVFR' | 'IFR' | 'LIFR';  // May be missing
}

/**
 * Processed airport conditions for LED display
 * Flight category can be null if unable to determine
 */
export interface AirportConditions {
  flightCategory: FlightCategory;  // Nullable!
  windSpeed: number;
  windGustSpeed: number;
  windGust: boolean;
  lightning: boolean;
}

/**
 * Application configuration loaded from environment variables
 */
export interface Config {
  // Development
  useMockGpio: boolean;

  // LED Configuration
  ledCount: number;
  ledPin: number;
  ledBrightness: number;
  ledBrightnessDim: number;
  ledOrder: 'RGB' | 'GRB';

  // Airport Configuration
  airports: string[];

  // Colors (stored as Color objects)
  colors: {
    vfr: Color;
    vfrFade: Color;
    mvfr: Color;
    mvfrFade: Color;
    ifr: Color;
    ifrFade: Color;
    lifr: Color;
    lifrFade: Color;
    clear: Color;
    lightning: Color;
    highWinds: Color;
  };

  // Animation Settings
  activateWindAnimation: boolean;
  activateLightningAnimation: boolean;
  fadeInsteadOfBlink: boolean;
  windBlinkThreshold: number;
  highWindsThreshold: number;
  alwaysBlinkForGusts: boolean;
  blinkSpeed: number;
  blinkTotalTimeSeconds: number;

  // Daytime Dimming
  activateDaytimeDimming: boolean;
  brightTimeStart: string;  // "HH:MM" format
  dimTimeStart: string;     // "HH:MM" format
  useSunriseSunset: boolean;
  locationLat?: number;
  locationLon?: number;

  // Legend LEDs
  showLegend: boolean;
  offsetLegendBy: number;

  // API Configuration
  metarApiUrl: string;
}

/**
 * Sun times calculated for a given location and date
 */
export interface SunTimes {
  sunrise: Date;
  sunset: Date;
}
