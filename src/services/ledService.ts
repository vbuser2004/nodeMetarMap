/**
 * LED service for controlling NeoPixel LED strips
 * Provides both real (GPIO) and mock (console) implementations
 */

import { Color, Config } from '../types';

/**
 * Interface for LED control operations
 * Implemented by both real and mock LED services
 */
export interface ILedService {
  setPixel(index: number, color: Color): void;
  show(): void;
  clear(): void;
  setBrightness(brightness: number): void;
  cleanup(): void;
}

/**
 * Real LED service implementation using rpi-ws281x-native
 * Requires actual Raspberry Pi hardware with GPIO access
 */
export class RealLedService implements ILedService {
  private ws281x: any;
  private pixels: Uint32Array;
  private channel: any;
  private ledCount: number;
  
  constructor(config: Config) {
    try {
      // Dynamically import rpi-ws281x-native (only available on Pi)
      this.ws281x = require('rpi-ws281x-native');
    } catch (error) {
      throw new Error(
        'Failed to load rpi-ws281x-native. ' +
        'Make sure you are running on a Raspberry Pi with the library installed. ' +
        'For development, set USE_MOCK_GPIO=true in .env'
      );
    }
    
    this.ledCount = config.ledCount;
    
    // Determine strip type based on LED order
    const stripType =
      config.ledOrder === 'GRB'
        ? this.ws281x.stripType.WS2811_STRIP_GRB
        : this.ws281x.stripType.WS2811_STRIP_RGB;
    
    // Initialize the LED strip
    console.log(`Initializing ${config.ledCount} LEDs on GPIO pin ${config.ledPin}`);
    console.log(`LED order: ${config.ledOrder}, Brightness: ${config.ledBrightness}`);
    
    try {
      this.channel = this.ws281x.init({
        dma: 10,
        freq: 800000,
        gpioPin: config.ledPin,
        invert: false,
        brightness: Math.floor(config.ledBrightness * 255),
        stripType: stripType
      });
      
      this.pixels = this.channel.array;
      
      // Clear LEDs on initialization
      this.clear();
      this.show();
      
      console.log('LED strip initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize LED strip: ${error}`);
    }
  }
  
  setPixel(index: number, color: Color): void {
    if (index < 0 || index >= this.ledCount) {
      console.warn(`LED index out of range: ${index}`);
      return;
    }
    
    // Pack RGB into 32-bit integer
    // Format: 0x00RRGGBB
    this.pixels[index] = (color.r << 16) | (color.g << 8) | color.b;
  }
  
  show(): void {
    this.ws281x.render();
  }
  
  clear(): void {
    this.pixels.fill(0);
  }
  
  setBrightness(brightness: number): void {
    const brightnessValue = Math.floor(Math.max(0, Math.min(1, brightness)) * 255);
    this.ws281x.setBrightness(brightnessValue);
  }
  
  cleanup(): void {
    console.log('Cleaning up LED strip...');
    this.clear();
    this.show();
    this.ws281x.reset();
    console.log('LED strip cleaned up');
  }
}

/**
 * Mock LED service implementation for development/testing
 * Logs LED operations to console instead of controlling actual hardware
 */
export class MockLedService implements ILedService {
  private pixels: (Color | null)[];
  private brightness: number;
  private ledCount: number;
  private verbose: boolean;
  
  constructor(config: Config, verbose: boolean = false) {
    this.ledCount = config.ledCount;
    this.brightness = config.ledBrightness;
    this.pixels = new Array(config.ledCount).fill(null);
    this.verbose = verbose;
    
    console.log('[MOCK GPIO] LED Service initialized');
    console.log(`[MOCK GPIO] LED Count: ${config.ledCount}, Pin: ${config.ledPin}`);
    console.log(`[MOCK GPIO] LED Order: ${config.ledOrder}, Brightness: ${config.ledBrightness}`);
  }
  
  setPixel(index: number, color: Color): void {
    if (index < 0 || index >= this.ledCount) {
      console.warn(`[MOCK GPIO] LED index out of range: ${index}`);
      return;
    }
    
    this.pixels[index] = color;
    
    if (this.verbose) {
      console.log(
        `[MOCK GPIO] LED ${index} -> RGB(${color.r}, ${color.g}, ${color.b})`
      );
    }
  }
  
  show(): void {
    if (this.verbose) {
      console.log('[MOCK GPIO] Showing LEDs');
      
      // Display a visual representation
      const display = this.pixels
        .map((color, index) => {
          if (!color) return '_';
          if (color.r === 0 && color.g === 0 && color.b === 0) return '_';
          
          // Simple color representation
          if (color.r > 200 && color.g < 50 && color.b < 50) return 'R'; // Red-ish
          if (color.g > 200 && color.r < 50 && color.b < 50) return 'G'; // Green-ish
          if (color.b > 200 && color.r < 50 && color.g < 50) return 'B'; // Blue-ish
          if (color.r > 200 && color.g > 200 && color.b < 50) return 'Y'; // Yellow
          if (color.r > 200 && color.b > 200) return 'M'; // Magenta
          if (color.r > 200 && color.g > 200 && color.b > 200) return 'W'; // White
          
          return 'X'; // Other color
        })
        .join('');
      
      console.log(`[MOCK GPIO] [${display}]`);
    }
    
    // Summary of active LEDs
    const activeLeds = this.pixels.filter(
      color => color && (color.r > 0 || color.g > 0 || color.b > 0)
    ).length;
    
    console.log(`[MOCK GPIO] ${activeLeds}/${this.ledCount} LEDs active`);
  }
  
  clear(): void {
    this.pixels.fill(null);
    if (this.verbose) {
      console.log('[MOCK GPIO] Cleared all LEDs');
    }
  }
  
  setBrightness(brightness: number): void {
    this.brightness = Math.max(0, Math.min(1, brightness));
    console.log(`[MOCK GPIO] Brightness set to ${(this.brightness * 100).toFixed(0)}%`);
  }
  
  cleanup(): void {
    console.log('[MOCK GPIO] Cleaning up LED service');
    this.clear();
  }
}

/**
 * Factory function to create appropriate LED service based on configuration
 * 
 * @param config - Application configuration
 * @returns LED service instance (real or mock)
 */
export function createLedService(config: Config): ILedService {
  if (config.useMockGpio) {
    console.log('Using mock GPIO LED service (for development)');
    return new MockLedService(config, false);  // Set to true for verbose logging
  } else {
    console.log('Using real GPIO LED service');
    return new RealLedService(config);
  }
}
