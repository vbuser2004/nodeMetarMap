/**
 * Time service for sunrise/sunset calculations and brightness control
 */

import * as SunCalc from 'suncalc';
import { Config, SunTimes } from '../types';

/**
 * Parse time string in HH:MM format to hours and minutes
 * 
 * @param timeStr - Time string like "07:00" or "19:30"
 * @returns Object with hour and minute properties
 */
export function parseTime(timeStr: string): { hour: number; minute: number } {
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  
  return { hour, minute };
}

/**
 * Get sunrise and sunset times for a specific location and date
 * 
 * @param lat - Latitude in decimal degrees
 * @param lon - Longitude in decimal degrees
 * @param date - Date to calculate for (defaults to today)
 * @returns Sun times with sunrise and sunset
 */
export function getSunTimes(
  lat: number,
  lon: number,
  date: Date = new Date()
): SunTimes {
  const times = SunCalc.getTimes(date, lat, lon);
  
  return {
    sunrise: times.sunrise,
    sunset: times.sunset
  };
}

/**
 * Determine if current time is within bright time range
 * 
 * @param now - Current time
 * @param brightStart - Start of bright period
 * @param dimStart - Start of dim period
 * @returns true if should be bright, false if should be dim
 */
export function isBrightTime(
  now: Date,
  brightStart: Date,
  dimStart: Date
): boolean {
  const nowTime = now.getTime();
  const brightTime = brightStart.getTime();
  const dimTime = dimStart.getTime();
  
  // Handle case where dim time is before bright time (crosses midnight)
  if (dimTime < brightTime) {
    // Bright period crosses midnight
    return nowTime >= brightTime || nowTime < dimTime;
  } else {
    // Normal case: bright period during the day
    return nowTime >= brightTime && nowTime < dimTime;
  }
}

/**
 * Calculate appropriate brightness level based on time of day
 * Uses sunrise/sunset if configured, otherwise uses fixed times
 * 
 * @param config - Application configuration
 * @returns Brightness value (0.0 to 1.0)
 */
export function calculateBrightness(config: Config): number {
  if (!config.activateDaytimeDimming) {
    // Dimming disabled, always use normal brightness
    return config.ledBrightness;
  }
  
  const now = new Date();
  let brightStart: Date;
  let dimStart: Date;
  
  if (config.useSunriseSunset && config.locationLat && config.locationLon) {
    // Use sunrise/sunset times
    const sunTimes = getSunTimes(config.locationLat, config.locationLon, now);
    brightStart = sunTimes.sunrise;
    dimStart = sunTimes.sunset;
    
    console.log(`Sunrise: ${brightStart.toLocaleTimeString()}`);
    console.log(`Sunset: ${dimStart.toLocaleTimeString()}`);
  } else {
    // Use fixed times from configuration
    const brightTime = parseTime(config.brightTimeStart);
    const dimTime = parseTime(config.dimTimeStart);
    
    brightStart = new Date(now);
    brightStart.setHours(brightTime.hour, brightTime.minute, 0, 0);
    
    dimStart = new Date(now);
    dimStart.setHours(dimTime.hour, dimTime.minute, 0, 0);
    
    console.log(`Bright time: ${config.brightTimeStart}`);
    console.log(`Dim time: ${config.dimTimeStart}`);
  }
  
  const bright = isBrightTime(now, brightStart, dimStart);
  
  const brightness = bright ? config.ledBrightness : config.ledBrightnessDim;
  
  console.log(
    `Current time: ${now.toLocaleTimeString()} - ` +
    `${bright ? 'Bright' : 'Dim'} mode (${(brightness * 100).toFixed(0)}%)`
  );
  
  return brightness;
}
