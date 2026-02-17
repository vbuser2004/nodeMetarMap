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
 * Shows colored emojis with airport codes when enabled
 */
export class MockLedService implements ILedService {
  private pixels: (Color | null)[];
  private brightness: number;
  private ledCount: number;
  private config: Config;
  private airportMap: Map<number, { code: string; name?: string }>;
  
  constructor(config: Config) {
    this.ledCount = config.ledCount;
    this.brightness = config.ledBrightness;
    this.pixels = new Array(config.ledCount).fill(null);
    this.config = config;
    
    // Build reverse mapping: LED index -> Airport info
    this.airportMap = new Map();
    for (const airport of config.airports) {
      this.airportMap.set(airport.led, {
        code: airport.code,
        name: airport.name
      });
    }
    
    console.log('[MOCK GPIO] LED Service initialized');
    console.log(`[MOCK GPIO] ${config.airports.length} airports mapped to ${config.ledCount} LEDs`);
  }
  
  setPixel(index: number, color: Color): void {
    if (index < 0 || index >= this.ledCount) {
      console.warn(`[MOCK GPIO] LED index out of range: ${index}`);
      return;
    }
    
    this.pixels[index] = color;
  }
  
  show(): void {
    if (this.config.mockGpioFormat === 'strip') {
      this.showStrip();
    } else if (this.config.mockGpioFormat === 'detailed') {
      this.showDetailed();
    }
    
    // Always show summary
    const activeCount = this.pixels.filter(
      p => p && (p.r > 0 || p.g > 0 || p.b > 0)
    ).length;
    console.log(`[MOCK GPIO] ${activeCount}/${this.ledCount} LEDs active\n`);
  }
  
  private showStrip(): void {
    // Build airport code labels and colored blocks
    const labels: string[] = [];
    const blocks: string[] = [];
    
    for (const airport of this.config.airports) {
      const color = this.pixels[airport.led] || { r: 0, g: 0, b: 0 };
      labels.push(airport.code.padEnd(6));
      blocks.push(this.colorize(color));
    }
    
    console.log('[MOCK GPIO] LED Strip:');
    console.log('         ' + labels.join(' '));
    console.log('Strip:   ' + blocks.join('  '));
  }
  
  private showDetailed(): void {
    console.log('[MOCK GPIO] LED Details:');
    
    for (const airport of this.config.airports) {
      const color = this.pixels[airport.led] || { r: 0, g: 0, b: 0 };
      const block = this.colorize(color);
      const name = airport.name || '';
      const colorName = this.getColorName(color);
      
      console.log(
        `  LED ${airport.led.toString().padStart(2)}: ` +
        `${airport.code} ${block} ${colorName}` +
        `${name ? ` (${name})` : ''}`
      );
    }
  }
  
  private colorize(color: Color): string {
    if (!this.config.mockGpioColors) {
      return this.getColorLetter(color);
    }
    
    // Use emojis for visual representation
    if (color.r === 0 && color.g === 0 && color.b === 0) return '⬛';
    
    // Note: GRB format means:
    // - r channel contains Green
    // - g channel contains Red
    // - b channel contains Blue
    
    // Green (VFR) - high in r channel (which is G in GRB)
    if (color.r > 200 && color.g < 50 && color.b < 50) return '🟢';
    if (color.r > 100 && color.r <= 200 && color.g < 50 && color.b < 50) return '🟢'; // Faded
    
    // Blue (MVFR) - high in b channel
    if (color.b > 200 && color.r < 50 && color.g < 50) return '🟦';
    if (color.b > 100 && color.b <= 200 && color.r < 50 && color.g < 50) return '🟦'; // Faded
    
    // Red (IFR) - high in g channel (which is R in GRB)
    if (color.g > 200 && color.r < 50 && color.b < 50) return '🟥';
    if (color.g > 100 && color.g <= 200 && color.r < 50 && color.b < 50) return '🟥'; // Faded
    
    // Magenta (LIFR) - high in both r and b channels
    if (color.r > 200 && color.b > 200) return '🟪';
    if (color.r > 100 && color.b > 100 && color.r <= 200) return '🟪'; // Faded
    
    // Yellow (high winds) - high in r and g channels
    if (color.r > 200 && color.g > 200 && color.b < 50) return '🟨';
    
    // White (lightning) - all channels high
    if (color.r > 200 && color.g > 200 && color.b > 200) return '⚪';
    
    return '◼️'; // Unknown
  }
  
  private getColorLetter(color: Color): string {
    if (color.r === 0 && color.g === 0 && color.b === 0) return '_';
    if (color.r > 200 && color.g < 50) return 'G'; // Green (VFR)
    if (color.b > 200) return 'B'; // Blue (MVFR)
    if (color.g > 200 && color.r < 50) return 'R'; // Red (IFR)
    if (color.r > 200 && color.b > 200) return 'M'; // Magenta (LIFR)
    if (color.r > 200 && color.g > 200) return 'Y'; // Yellow (high winds)
    if (color.r > 200 && color.g > 200 && color.b > 200) return 'W'; // White (lightning)
    return 'X';
  }
  
  private getColorName(color: Color): string {
    if (color.r === 0 && color.g === 0 && color.b === 0) return 'OFF    ';
    if (color.r > 200 && color.g < 50 && color.b < 50) return 'VFR    ';
    if (color.b > 200 && color.r < 50 && color.g < 50) return 'MVFR   ';
    if (color.g > 200 && color.r < 50 && color.b < 50) return 'IFR    ';
    if (color.r > 200 && color.b > 200) return 'LIFR   ';
    if (color.r > 200 && color.g > 200 && color.b < 50) return 'HI-WIND';
    if (color.r > 200 && color.g > 200 && color.b > 200) return 'LIGHTNING';
    return 'UNKNOWN';
  }
  
  clear(): void {
    this.pixels.fill(null);
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
    return new MockLedService(config);
  } else {
    console.log('Using real GPIO LED service');
    return new RealLedService(config);
  }
}
