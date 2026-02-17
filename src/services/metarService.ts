/**
 * METAR data fetching and parsing service
 * Retrieves aviation weather data from aviationweather.gov JSON API
 */

import axios, { AxiosError } from 'axios';
import { MetarData, AirportConditions, Config, FlightCategory } from '../types';
import { calculateFlightCategory, parseVisibility } from '../utils/flightCategory';

/**
 * Fetch METAR data for specified airports from JSON API
 * 
 * @param airports - Array of ICAO airport codes
 * @param apiUrl - Base API URL
 * @returns Array of METAR data objects
 */
export async function fetchMetarData(
  airports: string[],
  apiUrl: string
): Promise<MetarData[]> {
  if (airports.length === 0) {
    throw new Error('No airports specified');
  }
  
  const url = `${apiUrl}?ids=${airports.join(',')}&format=json`;
  
  console.log(`Fetching METAR data for ${airports.length} airports...`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await axios.get<MetarData[]>(url, {
      headers: {
        'User-Agent': 'NodeMetarMap/1.0'
      },
      timeout: 15000  // 15 second timeout
    });
    
    if (!Array.isArray(response.data)) {
      throw new Error('API response is not an array');
    }
    
    console.log(`Received ${response.data.length} METAR reports`);
    return response.data;
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.code === 'ECONNABORTED') {
        throw new Error('Request timeout while fetching METAR data');
      }
      
      if (axiosError.response) {
        throw new Error(
          `API error: ${axiosError.response.status} ${axiosError.response.statusText}`
        );
      }
      
      if (axiosError.request) {
        throw new Error('No response received from METAR API');
      }
    }
    
    throw new Error(`Failed to fetch METAR data: ${error}`);
  }
}

/**
 * Detect lightning from raw METAR observation text
 * Searches for 'LTG' or 'TS' (thunderstorm) but excludes 'TSNO' (thunderstorm information not available)
 * 
 * @param rawOb - Raw METAR observation string
 * @returns true if lightning/thunderstorm detected
 */
function detectLightning(rawOb: string): boolean {
  if (!rawOb) {
    return false;
  }
  
  // Check for TSNO (thunderstorm information not available) - should NOT count as lightning
  if (rawOb.includes('TSNO')) {
    return false;
  }
  
  // Check for lightning (LTG) or thunderstorm (TS) after station ID (position 4+)
  const relevant = rawOb.substring(4);  // Skip station ID
  
  return relevant.includes('LTG') || relevant.includes('TS');
}

/**
 * Parse METAR data into AirportConditions object
 * Handles missing data gracefully - flight category can be null
 * 
 * @param metar - Raw METAR data from API
 * @param config - Application configuration
 * @returns AirportConditions with parsed data
 */
export function parseConditions(
  metar: MetarData,
  config: Config
): AirportConditions {
  // Wind data
  const windSpeed = metar.wspd || 0;
  const windGustSpeed = metar.wgst || 0;
  
  // Determine if windy enough to trigger animation
  const windGust = 
    (config.alwaysBlinkForGusts && windGustSpeed > 0) ||
    windGustSpeed > config.windBlinkThreshold;
  
  // Lightning detection from raw observation
  const lightning = detectLightning(metar.rawOb);
  
  // Determine flight category
  let flightCategory: FlightCategory;
  
  // Use API-provided flight category if available
  if (metar.fltCat) {
    flightCategory = metar.fltCat;
    console.log(`${metar.icaoId}: Using API flight category: ${flightCategory}`);
  } else {
    // Calculate from available data
    const visibility = parseVisibility(metar.visib);
    flightCategory = calculateFlightCategory(visibility, metar.clouds);
    
    if (flightCategory) {
      console.log(`${metar.icaoId}: Calculated flight category: ${flightCategory}`);
    } else {
      console.log(`${metar.icaoId}: Unable to determine flight category (missing data)`);
    }
  }
  
  return {
    flightCategory,
    windSpeed,
    windGustSpeed,
    windGust,
    lightning
  };
}

/**
 * Fetch and parse METAR data for all configured airports
 * Returns a map of airport code to conditions
 * 
 * @param config - Application configuration
 * @returns Map of airport ICAO codes to AirportConditions
 */
export async function fetchAndParseAllConditions(
  config: Config
): Promise<Map<string, AirportConditions>> {
  const metarData = await fetchMetarData(config.airports, config.metarApiUrl);
  
  const conditionsMap = new Map<string, AirportConditions>();
  
  for (const metar of metarData) {
    const conditions = parseConditions(metar, config);
    conditionsMap.set(metar.icaoId, conditions);
    
    // Log parsed conditions
    const windInfo = conditions.windGust
      ? `G${conditions.windGustSpeed}`
      : '';
    const windStr = `${conditions.windSpeed}${windInfo}kt`;
    const ltgStr = conditions.lightning ? ' LTG' : '';
    const catStr = conditions.flightCategory || 'UNKNOWN';
    
    console.log(
      `${metar.icaoId}: ${catStr} ${windStr}${ltgStr}`
    );
  }
  
  // Check for missing airports
  const receivedAirports = new Set(metarData.map(m => m.icaoId));
  const missingAirports = config.airports.filter(
    code => !receivedAirports.has(code)
  );
  
  if (missingAirports.length > 0) {
    console.log(`Warning: No METAR data for: ${missingAirports.join(', ')}`);
  }
  
  return conditionsMap;
}
