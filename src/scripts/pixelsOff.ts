/**
 * Pixels Off Script
 * Utility to immediately turn off all LEDs and cleanup
 */

import { loadConfig } from '../config';
import { createLedService } from '../services/ledService';

/**
 * Turn off all LEDs and exit
 */
async function main(): Promise<void> {
  console.log('Turning off LEDs...');
  
  try {
    // Load configuration
    const config = await loadConfig();
    
    // Initialize LED service
    const ledService = createLedService(config);
    
    // Clear and cleanup LEDs
    ledService.clear();
    ledService.show();
    ledService.cleanup();
    
    console.log('LEDs off');
    process.exit(0);
    
  } catch (error) {
    console.error('Error turning off LEDs:', error);
    process.exit(1);
  }
}

// Run
main();
