/**
 * Shared state management for METAR data
 * Enables communication between LED app and web interface
 */
import { FlightCategory, Color } from '../src/types';
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
export declare class MetarStateManager {
    private statePath;
    private logPath?;
    constructor(statePath?: string, logPath?: string);
    /**
     * Write current state to file (atomic write)
     */
    writeState(state: MetarState): Promise<void>;
    /**
     * Read current state from file
     */
    readState(): Promise<MetarState | null>;
    /**
     * Append entries to historical log file
     */
    appendLog(entries: MetarLogEntry[]): Promise<void>;
    /**
     * Create log entries from current state
     */
    createLogEntries(state: MetarState): MetarLogEntry[];
}
//# sourceMappingURL=metarState.d.ts.map