/**
 * Color mapping utility for LED display
 * Maps airport conditions to LED colors with animation support
 */

import { AirportConditions, Color, Config } from '../types';

/**
 * Get LED color for airport conditions with animation state
 * Handles priority: lightning > high winds > windy > flight category
 * Returns clear/off color if flight category is null (no data)
 * 
 * @param conditions - Airport weather conditions (can have null flight category)
 * @param windCycle - Animation cycle state (true = show effect, false = normal)
 * @param config - Application configuration
 * @returns Color object for LED
 */
export function getColorForConditions(
  conditions: AirportConditions | null | undefined,
  windCycle: boolean,
  config: Config
): Color {
  // No conditions data - show clear/off
  if (!conditions) {
    return config.colors.clear;
  }
  
  // No flight category - show clear/off
  if (!conditions.flightCategory) {
    return config.colors.clear;
  }
  
  // Check if windy enough to animate
  const isWindy =
    config.activateWindAnimation &&
    windCycle &&
    (conditions.windSpeed >= config.windBlinkThreshold || conditions.windGust);
  
  // Check if high winds (overrides normal wind display)
  const isHighWinds =
    isWindy &&
    config.highWindsThreshold !== -1 &&
    (conditions.windSpeed >= config.highWindsThreshold ||
      conditions.windGustSpeed >= config.highWindsThreshold);
  
  // Check if lightning should be displayed (on opposite cycle from wind)
  const showLightning =
    config.activateLightningAnimation &&
    !windCycle &&
    conditions.lightning;
  
  // Priority 1: Lightning (white flash)
  if (showLightning) {
    return config.colors.lightning;
  }
  
  // Priority 2: High winds (yellow)
  if (isHighWinds) {
    return config.colors.highWinds;
  }
  
  // Priority 3: Windy (fade or blink)
  if (isWindy) {
    // Use fade color or clear based on config
    if (config.fadeInsteadOfBlink) {
      // Fade to dimmer version of flight category color
      switch (conditions.flightCategory) {
        case 'VFR':
          return config.colors.vfrFade;
        case 'MVFR':
          return config.colors.mvfrFade;
        case 'IFR':
          return config.colors.ifrFade;
        case 'LIFR':
          return config.colors.lifrFade;
        default:
          return config.colors.clear;
      }
    } else {
      // Blink (turn off)
      return config.colors.clear;
    }
  }
  
  // Priority 4: Normal flight category display
  switch (conditions.flightCategory) {
    case 'VFR':
      return config.colors.vfr;
    case 'MVFR':
      return config.colors.mvfr;
    case 'IFR':
      return config.colors.ifr;
    case 'LIFR':
      return config.colors.lifr;
    default:
      // Null or unknown
      return config.colors.clear;
  }
}

/**
 * Get colors for legend LEDs
 * Shows static examples of each flight category and animation indicators
 * 
 * @param windCycle - Animation cycle state
 * @param config - Application configuration
 * @returns Array of 7 colors for legend LEDs
 */
export function getLegendColors(windCycle: boolean, config: Config): Color[] {
  const colors: Color[] = [];
  
  // 1. VFR
  colors.push(config.colors.vfr);
  
  // 2. MVFR
  colors.push(config.colors.mvfr);
  
  // 3. IFR
  colors.push(config.colors.ifr);
  
  // 4. LIFR
  colors.push(config.colors.lifr);
  
  // 5. Lightning indicator (animates)
  if (config.activateLightningAnimation) {
    colors.push(windCycle ? config.colors.vfr : config.colors.lightning);
  } else {
    colors.push(config.colors.clear);
  }
  
  // 6. Windy indicator (animates)
  if (config.activateWindAnimation) {
    if (windCycle) {
      // Show fade or off based on config
      colors.push(
        config.fadeInsteadOfBlink ? config.colors.vfrFade : config.colors.clear
      );
    } else {
      colors.push(config.colors.vfr);
    }
  } else {
    colors.push(config.colors.clear);
  }
  
  // 7. High winds indicator (animates)
  if (config.activateWindAnimation && config.highWindsThreshold !== -1) {
    colors.push(windCycle ? config.colors.highWinds : config.colors.vfr);
  } else {
    colors.push(config.colors.clear);
  }
  
  return colors;
}
