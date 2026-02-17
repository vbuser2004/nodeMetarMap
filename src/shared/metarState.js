"use strict";
/**
 * Shared state management for METAR data
 * Enables communication between LED app and web interface
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetarStateManager = void 0;
const fs = __importStar(require("fs/promises"));
/**
 * State manager for reading/writing METAR state and logs
 */
class MetarStateManager {
    statePath;
    logPath;
    constructor(statePath = '/home/pi/metar-state.json', logPath) {
        this.statePath = statePath;
        this.logPath = logPath;
    }
    /**
     * Write current state to file (atomic write)
     */
    async writeState(state) {
        // Atomic write using temp file + rename
        const tempPath = `${this.statePath}.tmp`;
        await fs.writeFile(tempPath, JSON.stringify(state, null, 2), 'utf-8');
        await fs.rename(tempPath, this.statePath);
    }
    /**
     * Read current state from file
     */
    async readState() {
        try {
            const content = await fs.readFile(this.statePath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null; // File doesn't exist yet
            }
            throw error;
        }
    }
    /**
     * Append entries to historical log file
     */
    async appendLog(entries) {
        if (!this.logPath) {
            return; // Logging disabled
        }
        // Format as JSON lines (one JSON object per line)
        const lines = entries.map(entry => JSON.stringify(entry)).join('\n') + '\n';
        try {
            await fs.appendFile(this.logPath, lines, 'utf-8');
        }
        catch (error) {
            console.error(`Failed to append to log file ${this.logPath}:`, error);
            throw error;
        }
    }
    /**
     * Create log entries from current state
     */
    createLogEntries(state) {
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
exports.MetarStateManager = MetarStateManager;
//# sourceMappingURL=metarState.js.map