/**
 * Graceful shutdown handling for LED cleanup
 */

import { ILedService } from '../services/ledService';

/**
 * Setup signal handlers for graceful shutdown
 * Cleans up LEDs on SIGTERM, SIGINT (Ctrl+C), or uncaught errors
 * 
 * @param ledService - LED service to cleanup
 */
export function setupShutdownHandler(ledService: ILedService): void {
  let shuttingDown = false;
  
  const shutdown = (signal: string): void => {
    if (shuttingDown) {
      // Already shutting down, force exit
      console.log('Force exit');
      process.exit(1);
    }
    
    shuttingDown = true;
    console.log(`\nReceived ${signal}, cleaning up LEDs...`);
    
    try {
      ledService.cleanup();
      console.log('Cleanup complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during cleanup:', error);
      process.exit(1);
    }
  };
  
  // Handle termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught errors
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught exception:', error);
    shutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason: any) => {
    console.error('Unhandled rejection:', reason);
    shutdown('unhandledRejection');
  });
}

/**
 * Sleep/delay utility function
 * 
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
