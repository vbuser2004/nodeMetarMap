/**
 * Unit tests for color mapping
 */

import { getColorForConditions } from '../src/utils/colorMapper';
import { AirportConditions, Config } from '../src/types';

// Mock configuration for testing
const mockConfig: Config = {
  useMockGpio: true,
  ledCount: 50,
  ledPin: 18,
  ledBrightness: 0.5,
  ledBrightnessDim: 0.1,
  ledOrder: 'GRB',
  airports: [],
  colors: {
    vfr: { r: 255, g: 0, b: 0 },
    vfrFade: { r: 128, g: 0, b: 0 },
    mvfr: { r: 0, g: 0, b: 255 },
    mvfrFade: { r: 0, g: 0, b: 128 },
    ifr: { r: 0, g: 255, b: 0 },
    ifrFade: { r: 0, g: 128, b: 0 },
    lifr: { r: 255, g: 0, b: 255 },
    lifrFade: { r: 128, g: 0, b: 128 },
    clear: { r: 0, g: 0, b: 0 },
    lightning: { r: 255, g: 255, b: 255 },
    highWinds: { r: 255, g: 255, b: 0 }
  },
  activateWindAnimation: true,
  activateLightningAnimation: true,
  fadeInsteadOfBlink: false,
  windBlinkThreshold: 15,
  highWindsThreshold: 25,
  alwaysBlinkForGusts: false,
  blinkSpeed: 1.0,
  blinkTotalTimeSeconds: 300,
  activateDaytimeDimming: false,
  brightTimeStart: '07:00',
  dimTimeStart: '19:00',
  useSunriseSunset: false,
  showLegend: false,
  offsetLegendBy: 0,
  metarApiUrl: 'https://aviationweather.gov/api/data/metar',
  metarUpdateInterval: 5,
  mockGpioColors: true,
  mockGpioFormat: 'strip',
  statePath: '/tmp/metar-state.json',
  enableLogging: false
};

describe('getColorForConditions', () => {
  describe('null/undefined handling', () => {
    it('should return clear color for null conditions', () => {
      const color = getColorForConditions(null, false, mockConfig);
      expect(color).toEqual(mockConfig.colors.clear);
    });

    it('should return clear color for undefined conditions', () => {
      const color = getColorForConditions(undefined, false, mockConfig);
      expect(color).toEqual(mockConfig.colors.clear);
    });

    it('should return clear color for null flight category', () => {
      const conditions: AirportConditions = {
        flightCategory: null,
        windSpeed: 10,
        windGustSpeed: 0,
        windGust: false,
        lightning: false
      };
      const color = getColorForConditions(conditions, false, mockConfig);
      expect(color).toEqual(mockConfig.colors.clear);
    });
  });

  describe('normal flight category display', () => {
    it('should return VFR color for VFR conditions', () => {
      const conditions: AirportConditions = {
        flightCategory: 'VFR',
        windSpeed: 5,
        windGustSpeed: 0,
        windGust: false,
        lightning: false
      };
      const color = getColorForConditions(conditions, false, mockConfig);
      expect(color).toEqual(mockConfig.colors.vfr);
    });

    it('should return MVFR color for MVFR conditions', () => {
      const conditions: AirportConditions = {
        flightCategory: 'MVFR',
        windSpeed: 5,
        windGustSpeed: 0,
        windGust: false,
        lightning: false
      };
      const color = getColorForConditions(conditions, false, mockConfig);
      expect(color).toEqual(mockConfig.colors.mvfr);
    });

    it('should return IFR color for IFR conditions', () => {
      const conditions: AirportConditions = {
        flightCategory: 'IFR',
        windSpeed: 5,
        windGustSpeed: 0,
        windGust: false,
        lightning: false
      };
      const color = getColorForConditions(conditions, false, mockConfig);
      expect(color).toEqual(mockConfig.colors.ifr);
    });

    it('should return LIFR color for LIFR conditions', () => {
      const conditions: AirportConditions = {
        flightCategory: 'LIFR',
        windSpeed: 5,
        windGustSpeed: 0,
        windGust: false,
        lightning: false
      };
      const color = getColorForConditions(conditions, false, mockConfig);
      expect(color).toEqual(mockConfig.colors.lifr);
    });
  });

  describe('lightning priority', () => {
    it('should show lightning color when lightning detected (windCycle=false)', () => {
      const conditions: AirportConditions = {
        flightCategory: 'VFR',
        windSpeed: 5,
        windGustSpeed: 0,
        windGust: false,
        lightning: true
      };
      const color = getColorForConditions(conditions, false, mockConfig);
      expect(color).toEqual(mockConfig.colors.lightning);
    });

    it('should not show lightning on windCycle=true', () => {
      const conditions: AirportConditions = {
        flightCategory: 'VFR',
        windSpeed: 5,
        windGustSpeed: 0,
        windGust: false,
        lightning: true
      };
      const color = getColorForConditions(conditions, true, mockConfig);
      expect(color).toEqual(mockConfig.colors.vfr);
    });
  });

  describe('high winds priority', () => {
    it('should show high winds color when winds exceed threshold', () => {
      const conditions: AirportConditions = {
        flightCategory: 'VFR',
        windSpeed: 30,
        windGustSpeed: 0,
        windGust: true,
        lightning: false
      };
      const color = getColorForConditions(conditions, true, mockConfig);
      expect(color).toEqual(mockConfig.colors.highWinds);
    });

    it('should show high winds color when gusts exceed threshold', () => {
      const conditions: AirportConditions = {
        flightCategory: 'VFR',
        windSpeed: 15,
        windGustSpeed: 30,
        windGust: true,
        lightning: false
      };
      const color = getColorForConditions(conditions, true, mockConfig);
      expect(color).toEqual(mockConfig.colors.highWinds);
    });
  });

  describe('wind animation (blink)', () => {
    it('should blink (clear) when windy on windCycle=true', () => {
      const conditions: AirportConditions = {
        flightCategory: 'VFR',
        windSpeed: 20,
        windGustSpeed: 0,
        windGust: true,
        lightning: false
      };
      const color = getColorForConditions(conditions, true, mockConfig);
      // Should blink off (clear) since FADE_INSTEAD_OF_BLINK=false and winds < high threshold
      expect(color).toEqual(mockConfig.colors.clear);
    });

    it('should show normal color when not windy on windCycle=true', () => {
      const conditions: AirportConditions = {
        flightCategory: 'VFR',
        windSpeed: 5,
        windGustSpeed: 0,
        windGust: false,
        lightning: false
      };
      const color = getColorForConditions(conditions, true, mockConfig);
      expect(color).toEqual(mockConfig.colors.vfr);
    });
  });

  describe('wind animation (fade)', () => {
    it('should fade to dim color when fade enabled', () => {
      const fadeConfig = { ...mockConfig, fadeInsteadOfBlink: true };
      const conditions: AirportConditions = {
        flightCategory: 'VFR',
        windSpeed: 20,
        windGustSpeed: 0,
        windGust: true,
        lightning: false
      };
      const color = getColorForConditions(conditions, true, fadeConfig);
      expect(color).toEqual(mockConfig.colors.vfrFade);
    });

    it('should fade different categories appropriately', () => {
      const fadeConfig = { ...mockConfig, fadeInsteadOfBlink: true };
      
      const mvfrConditions: AirportConditions = {
        flightCategory: 'MVFR',
        windSpeed: 20,
        windGustSpeed: 0,
        windGust: true,
        lightning: false
      };
      const mvfrColor = getColorForConditions(mvfrConditions, true, fadeConfig);
      expect(mvfrColor).toEqual(mockConfig.colors.mvfrFade);
    });
  });

  describe('priority order', () => {
    it('lightning should override high winds', () => {
      const conditions: AirportConditions = {
        flightCategory: 'VFR',
        windSpeed: 30,
        windGustSpeed: 35,
        windGust: true,
        lightning: true
      };
      const color = getColorForConditions(conditions, false, mockConfig);
      expect(color).toEqual(mockConfig.colors.lightning);
    });

    it('high winds should override normal wind blink', () => {
      const conditions: AirportConditions = {
        flightCategory: 'VFR',
        windSpeed: 30,
        windGustSpeed: 0,
        windGust: true,
        lightning: false
      };
      const color = getColorForConditions(conditions, true, mockConfig);
      expect(color).toEqual(mockConfig.colors.highWinds);
    });
  });
});
