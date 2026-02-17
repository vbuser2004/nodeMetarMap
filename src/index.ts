/**
 * Node METAR Map - Main Application
 * Aviation weather visualization on NeoPixel LED strips for Raspberry Pi
 * Runs continuously with periodic METAR updates
 */

import { loadConfig } from './config';
import { createLedService, ILedService } from './services/ledService';
import { fetchAndParseAllConditions } from './services/metarService';
import { calculateBrightness } from './services/timeService';
import { getColorForConditions, getLegendColors } from './utils/colorMapper';
import { setupShutdownHandler, sleep } from './utils/shutdown';
import { MetarStateManager, MetarState, MetarStateAirport } from './shared/metarState';
import { parseVisibility } from './utils/flightCategory';
import { Config, AirportConditions, MetarData } from './types';

/**
 * Build state object from METAR data
 */
async function buildState(
  config: Config,
  conditionsMap: Map<string, AirportConditions>,
  metarDataMap: Map<string, MetarData>
): Promise<MetarState> {
  const stateAirports: MetarStateAirport[] = config.airports.map(airport => {
    const conditions = conditionsMap.get(airport.code);
    const metarData = metarDataMap.get(airport.code);
    const color = getColorForConditions(conditions, false, config);
    
    return {
      code: airport.code,
      name: metarData?.name || airport.name || airport.code,
      led: airport.led,
      flightCategory: conditions?.flightCategory || null,
      color,
      windSpeed: conditions?.windSpeed || 0,
      windGustSpeed: conditions?.windGustSpeed || 0,
      windGust: conditions?.windGust || false,
      lightning: conditions?.lightning || false,
      visibility: metarData?.visib ? parseVisibility(metarData.visib) || undefined : undefined,
      temperature: metarData?.temp,
      dewpoint: metarData?.dewp,
      altimeter: metarData?.altim,
      rawMetar: metarData?.rawOb,
      obsTime: metarData?.reportTime
    };
  });
  
  return {
    timestamp: new Date().toISOString(),
    airports: stateAirports,
    config: {
      ledCount: config.ledCount,
      activeCount: config.airports.length
    }
  };
}

/**
 * Write state file and log entries
 */
async function writeStateAndLog(
  stateManager: MetarStateManager,
  state: MetarState,
  config: Config
): Promise<void> {
  // Write state file for web interface
  await stateManager.writeState(state);
  console.log(`State file written to ${config.statePath}`);
  
  // Append to historical log if enabled
  if (config.enableLogging) {
    const logEntries = stateManager.createLogEntries(state);
    await stateManager.appendLog(logEntries);
    console.log(`Logged ${logEntries.length} entries to ${config.logPath}`);
  }
}

/**
 * Animate LEDs until next update time
 */
async function animateLEDs(
  ledService: ILedService,
  config: Config,
  conditionsMap: Map<string, AirportConditions>,
  durationMs: number
): Promise<void> {
  const startTime = Date.now();
  let windCycle = false;
  let cycleCount = 0;
  
  while (Date.now() - startTime < durationMs) {
    // Update each airport LED
    for (const airport of config.airports) {
      const conditions = conditionsMap.get(airport.code);
      const color = getColorForConditions(conditions, windCycle, config);
      ledService.setPixel(airport.led, color);
    }
    
    // Show legend LEDs if enabled
    if (config.showLegend) {
      const legendColors = getLegendColors(windCycle, config);
      const maxAirportLed = Math.max(...config.airports.map(a => a.led));
      const legendStartIndex = maxAirportLed + 1 + config.offsetLegendBy;
      
      for (let i = 0; i < legendColors.length; i++) {
        ledService.setPixel(legendStartIndex + i, legendColors[i]);
      }
    }
    
    // Update all LEDs at once
    ledService.show();
    
    // Sleep for animation cycle
    await sleep(config.blinkSpeed * 1000);
    windCycle = !windCycle;
    cycleCount++;
  }
  
  console.log(`Animation cycles completed: ${cycleCount}`);
}

/**
 * Main application entry point - runs continuously
 */
async function main(): Promise<void> {
  console.log('========================================');
  console.log('Node METAR Map - Continuous Mode');
  console.log(`Started at ${new Date().toISOString()}`);
  console.log('========================================');
  console.log('');
  
  try {
    // Load configuration
    const config = await loadConfig();
    console.log('');
    
    // Initialize LED service
    const ledService = createLedService(config);
    console.log('');
    
    // Setup graceful shutdown handlers
    setupShutdownHandler(ledService);
    
    // Initialize state manager
    const stateManager = new MetarStateManager(config.statePath, config.logPath);
    
    // Calculate update interval in milliseconds
    const updateIntervalMs = config.metarUpdateInterval * 60 * 1000;
    
    console.log(`METAR update interval: ${config.metarUpdateInterval} minutes`);
    console.log(`Animation speed: ${config.blinkSpeed}s per cycle`);
    console.log('Running continuously until stopped...');
    console.log('');
    
    // Continuous update loop
    let updateCount = 0;
    
    while (true) {
      updateCount++;
      console.log('========================================');
      console.log(`Update Cycle #${updateCount}`);
      console.log(`Time: ${new Date().toISOString()}`);
      console.log('========================================');
      console.log('');
      
      try {
        // Calculate and set brightness based on time of day
        const brightness = calculateBrightness(config);
        ledService.setBrightness(brightness);
        console.log('');
        
        // Fetch METAR data for all airports
        console.log('Fetching METAR data...');
        const { conditionsMap, metarDataMap } = await fetchAndParseAllConditions(config);
        console.log('');
        
        // Build and write state
        const state = await buildState(config, conditionsMap, metarDataMap);
        await writeStateAndLog(stateManager, state, config);
        console.log('');
        
        // Animate LEDs until next update
        console.log(`Animating for ${config.metarUpdateInterval} minutes...`);
        console.log('');
        await animateLEDs(ledService, config, conditionsMap, updateIntervalMs);
        console.log('');
        
      } catch (error) {
        console.error('Error in update cycle:', error);
        console.error('Waiting 60 seconds before retry...');
        console.error('');
        
        // Wait before retrying on error
        await sleep(60 * 1000);
      }
    }
    
  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('FATAL ERROR');
    console.error('========================================');
    console.error(error);
    console.error('');
    
    process.exit(1);
  }
}

// Run the application
main();
