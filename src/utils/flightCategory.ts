/**
 * Flight category calculation per FAA criteria
 * Handles edge cases where data may be missing or incomplete
 */

import { CloudLayer, FlightCategory } from '../types';

/**
 * Calculate flight category based on visibility and sky conditions per FAA criteria.
 * 
 * Flight Category Rules:
 * - VFR:  Ceiling >3000 ft AGL AND Visibility >5 SM
 * - MVFR: Ceiling 1000-3000 ft AGL OR Visibility 3-5 SM
 * - IFR:  Ceiling 500-1000 ft AGL OR Visibility 1-3 SM
 * - LIFR: Ceiling <500 ft AGL OR Visibility <1 SM
 * 
 * Returns null if insufficient data is available to determine category
 * 
 * @param visibility - Visibility in statute miles
 * @param skyConditions - Array of cloud layers
 * @returns Flight category or null if cannot be determined
 */
export function calculateFlightCategory(
  visibility: number | null | undefined,
  skyConditions: CloudLayer[] | undefined
): FlightCategory {
  // Need at least visibility to calculate
  if (visibility === null || visibility === undefined || visibility <= 0) {
    return null;
  }
  
  // Default to clear skies if no sky conditions provided
  const clouds = skyConditions || [];
  
  // Determine ceiling (lowest broken or overcast layer)
  let ceiling: number | null = null;
  
  for (const layer of clouds) {
    const cover = layer.cover || '';
    
    // Broken, Overcast, or Sky Obscured
    if (cover === 'BKN' || cover === 'OVC' || cover === 'OVX') {
      const cloudBase = layer.base || 0;
      
      if (ceiling === null || cloudBase < ceiling) {
        ceiling = cloudBase;
      }
    }
  }
  
  // If no ceiling found (clear, scattered, few), use high value
  if (ceiling === null) {
    ceiling = 10000;  // Effectively unlimited
  }
  
  // Calculate category based on ceiling
  let ceilingCategory: FlightCategory;
  if (ceiling < 500) {
    ceilingCategory = 'LIFR';
  } else if (ceiling < 1000) {
    ceilingCategory = 'IFR';
  } else if (ceiling < 3000) {
    ceilingCategory = 'MVFR';
  } else {
    ceilingCategory = 'VFR';
  }
  
  // Calculate category based on visibility
  let visCategory: FlightCategory;
  if (visibility < 1) {
    visCategory = 'LIFR';
  } else if (visibility < 3) {
    visCategory = 'IFR';
  } else if (visibility < 5) {
    visCategory = 'MVFR';
  } else {
    visCategory = 'VFR';
  }
  
  // Return the worst (most restrictive) category
  const categories: FlightCategory[] = ['VFR', 'MVFR', 'IFR', 'LIFR'];
  const ceilingIndex = categories.indexOf(ceilingCategory);
  const visIndex = categories.indexOf(visCategory);
  
  return categories[Math.max(ceilingIndex, visIndex)];
}

/**
 * Parse visibility from METAR API
 * Handles formats like "10+", "10", 10 (number), "0.5", etc.
 * 
 * @param visibilityInput - Visibility string or number from API
 * @returns Visibility in statute miles, or null if invalid
 */
export function parseVisibility(visibilityInput: string | number | undefined): number | null {
  if (visibilityInput === undefined || visibilityInput === null) {
    return null;
  }
  
  // If already a number, use it directly
  if (typeof visibilityInput === 'number') {
    return visibilityInput >= 0 ? visibilityInput : null;
  }
  
  // If string, parse it
  if (typeof visibilityInput === 'string') {
    // Remove "+" character (indicates greater than)
    const cleaned = visibilityInput.replace('+', '').trim();
    
    if (!cleaned) {
      return null;
    }
    
    const visibility = parseFloat(cleaned);
    
    if (isNaN(visibility) || visibility < 0) {
      return null;
    }
    
    return visibility;
  }
  
  return null;
}
