/**
 * Node METAR Map - Main Application
 * Aviation weather visualization on NeoPixel LED strips for Raspberry Pi
 */

import { loadConfig } from './config';
import { createLedService } from './services/ledService';
import { fetchAndParseAllConditions } from './services/metarService';
import { calculateBrightness } from './services/timeService';
import { getColorForConditions, getLegendColors } from './utils/colorMapper';
import { setupShutdownHandler, sleep } from './utils/shutdown';
import { MetarStateManager, MetarState, MetarStateAirport } from './shared/metarState';
import { parseVisibility } from './utils/flightCategory';

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  console.log('========================================');
  console.log('Node METAR Map');
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
    
    // Calculate and set brightness based on time of day
    const brightness = calculateBrightness(config);
    ledService.setBrightness(brightness);
    console.log('');
    
    // Fetch METAR data for all airports
    console.log('Fetching METAR data...');
    const { conditionsMap, metarDataMap } = await fetchAndParseAllConditions(config);
    console.log('');
    
    // Initialize state manager
    const stateManager = new MetarStateManager(config.statePath, config.logPath);
    
    // Build state object for web interface and logging
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
    
    const state: MetarState = {
      timestamp: new Date().toISOString(),
      airports: stateAirports,
      config: {
        ledCount: config.ledCount,
        activeCount: config.airports.length
      }
    };
    
    // Write state file for web interface
    await stateManager.writeState(state);
    console.log(`State file written to ${config.statePath}`);
    
    // Append to historical log if enabled
    if (config.enableLogging) {
      const logEntries = stateManager.createLogEntries(state);
      await stateManager.appendLog(logEntries);
      console.log(`Logged ${logEntries.length} entries to ${config.logPath}`);
    }
    console.log('');
    
    // Determine animation loop count
    const shouldAnimate =
      config.activateWindAnimation || config.activateLightningAnimation;
    
    const loopLimit = shouldAnimate
      ? Math.round(config.blinkTotalTimeSeconds / config.blinkSpeed)
      : 1;  // Just show once if no animation
    
    console.log(`Animation: ${shouldAnimate ? 'Enabled' : 'Disabled'}`);
    console.log(`Loop cycles: ${loopLimit}`);
    console.log(`Cycle duration: ${config.blinkSpeed}s`);
    console.log(`Total runtime: ${config.blinkTotalTimeSeconds}s`);
    console.log('');
    
    // Animation loop
    let windCycle = false;
    
    for (let cycle = 0; cycle < loopLimit; cycle++) {
      // Update each airport LED
      for (const airport of config.airports) {
        const conditions = conditionsMap.get(airport.code);
        
        // Get color for this airport based on conditions and animation state
        const color = getColorForConditions(conditions, windCycle, config);
        
        // Set LED color at the configured index
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
      
      // Sleep before next cycle
      if (cycle < loopLimit - 1) {  // Don't sleep on last iteration
        await sleep(config.blinkSpeed * 1000);
        
        // Toggle animation cycle
        windCycle = !windCycle;
      }
    }
    
    console.log('');
    console.log('========================================');
    console.log('Animation complete');
    console.log(`Finished at ${new Date().toISOString()}`);
    console.log('========================================');
    
    // Exit successfully
    process.exit(0);
    
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
