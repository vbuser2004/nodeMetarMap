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
    const conditionsMap = await fetchAndParseAllConditions(config);
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
      for (let i = 0; i < config.airports.length; i++) {
        const airportCode = config.airports[i];
        const conditions = conditionsMap.get(airportCode);
        
        // Get color for this airport based on conditions and animation state
        const color = getColorForConditions(conditions, windCycle, config);
        
        // Set LED color
        ledService.setPixel(i, color);
      }
      
      // Show legend LEDs if enabled
      if (config.showLegend) {
        const legendColors = getLegendColors(windCycle, config);
        const legendStartIndex = config.airports.length + config.offsetLegendBy;
        
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
