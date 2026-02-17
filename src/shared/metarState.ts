/**
 * Shared state management for METAR data
 * Enables communication between LED app and web interface
 */

import * as fs from 'fs/promises';
import { FlightCategory, Color } from '../types';

/**
 * Airport state for a single airport
 */
export interface MetarStateAirport {
  code: string;
  name: string;
  led: number;
  flightCategory: FlightCategory;
  color: Color;
  windSpeed: number;
  windGustSpeed: number;
  windGust: boolean;
  lightning: boolean;
  visibility?: number;
  temperature?: number;
  dewpoint?: number;
  altimeter?: number;
  rawMetar?: string;
  obsTime?: string;
}

/**
 * Complete application state
 */
export interface MetarState {
  timestamp: string;
  airports: MetarStateAirport[];
  config: {
    ledCount: number;
    activeCount: number;
  };
}

/**
 * Historical log entry
 */
export interface MetarLogEntry {
  timestamp: string;
  airport: string;
  flightCategory: FlightCategory;
  windSpeed: number;
  windGustSpeed: number;
  lightning: boolean;
  visibility?: number;
  temperature?: number;
}

/**
 * State manager for reading/writing METAR state and logs
 */
export class MetarStateManager {
  private statePath: string;
  private logPath?: string;

  constructor(statePath: string = '/home/pi/metar-state.json', logPath?: string) {
    this.statePath = statePath;
    this.logPath = logPath;
  }

  /**
   * Write current state to file (atomic write)
   */
  async writeState(state: MetarState): Promise<void> {
    // Atomic write using temp file + rename
    const tempPath = `${this.statePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(state, null, 2), 'utf-8');
    await fs.rename(tempPath, this.statePath);
  }

  /**
   * Read current state from file
   */
  async readState(): Promise<MetarState | null> {
    try {
      const content = await fs.readFile(this.statePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // File doesn't exist yet
      }
      throw error;
    }
  }

  /**
   * Append entries to historical log file
   */
  async appendLog(entries: MetarLogEntry[]): Promise<void> {
    if (!this.logPath) {
      return; // Logging disabled
    }

    // Format as JSON lines (one JSON object per line)
    const lines = entries.map(entry => JSON.stringify(entry)).join('\n') + '\n';

    try {
      await fs.appendFile(this.logPath, lines, 'utf-8');
    } catch (error) {
      console.error(`Failed to append to log file ${this.logPath}:`, error);
      throw error;
    }
  }

  /**
   * Create log entries from current state
   */
  createLogEntries(state: MetarState): MetarLogEntry[] {
    return state.airports.map(airport => ({
      timestamp: state.timestamp,
      airport: airport.code,
      flightCategory: airport.flightCategory,
      windSpeed: airport.windSpeed,
      windGustSpeed: airport.windGustSpeed,
      lightning: airport.lightning,
      visibility: airport.visibility,
      temperature: airport.temperature
    }));
  }
}
