/**
 * Unit tests for flight category calculation
 */

import { calculateFlightCategory, parseVisibility } from '../src/utils/flightCategory';
import { CloudLayer } from '../src/types';

describe('calculateFlightCategory', () => {
  describe('VFR conditions', () => {
    it('should return VFR for clear skies and high visibility', () => {
      const clouds: CloudLayer[] = [{ cover: 'SKC' }];
      expect(calculateFlightCategory(10, clouds)).toBe('VFR');
    });

    it('should return VFR for scattered clouds above 3000ft and good visibility', () => {
      const clouds: CloudLayer[] = [
        { cover: 'SCT', base: 5000 },
        { cover: 'BKN', base: 8000 }
      ];
      expect(calculateFlightCategory(10, clouds)).toBe('VFR');
    });
  });

  describe('MVFR conditions', () => {
    it('should return MVFR for ceiling between 1000-3000ft', () => {
      const clouds: CloudLayer[] = [{ cover: 'BKN', base: 2000 }];
      expect(calculateFlightCategory(10, clouds)).toBe('MVFR');
    });

    it('should return MVFR for visibility 3-5 SM', () => {
      const clouds: CloudLayer[] = [{ cover: 'SKC' }];
      expect(calculateFlightCategory(4, clouds)).toBe('MVFR');
    });

    it('should return VFR for ceiling at exactly 3000ft', () => {
      const clouds: CloudLayer[] = [{ cover: 'OVC', base: 3000 }];
      expect(calculateFlightCategory(10, clouds)).toBe('VFR');
    });
  });

  describe('IFR conditions', () => {
    it('should return IFR for low ceiling 500-1000ft', () => {
      const clouds: CloudLayer[] = [{ cover: 'OVC', base: 800 }];
      expect(calculateFlightCategory(10, clouds)).toBe('IFR');
    });

    it('should return IFR for low visibility 1-3 SM', () => {
      const clouds: CloudLayer[] = [{ cover: 'SKC' }];
      expect(calculateFlightCategory(2, clouds)).toBe('IFR');
    });

    it('should return MVFR for ceiling at exactly 1000ft', () => {
      const clouds: CloudLayer[] = [{ cover: 'BKN', base: 1000 }];
      expect(calculateFlightCategory(10, clouds)).toBe('MVFR');
    });
  });

  describe('LIFR conditions', () => {
    it('should return LIFR for very low ceiling <500ft', () => {
      const clouds: CloudLayer[] = [{ cover: 'OVC', base: 400 }];
      expect(calculateFlightCategory(5, clouds)).toBe('LIFR');
    });

    it('should return LIFR for very low visibility <1 SM', () => {
      const clouds: CloudLayer[] = [{ cover: 'SKC' }];
      expect(calculateFlightCategory(0.5, clouds)).toBe('LIFR');
    });

    it('should return LIFR for obscured sky (OVX)', () => {
      const clouds: CloudLayer[] = [{ cover: 'OVX', base: 200 }];
      expect(calculateFlightCategory(3, clouds)).toBe('LIFR');
    });
  });

  describe('worst-case logic', () => {
    it('should return most restrictive category when ceiling and visibility differ', () => {
      const clouds: CloudLayer[] = [{ cover: 'OVC', base: 2000 }]; // MVFR ceiling
      const visibility = 0.5; // LIFR visibility
      expect(calculateFlightCategory(visibility, clouds)).toBe('LIFR');
    });

    it('should use lowest ceiling when multiple cloud layers present', () => {
      const clouds: CloudLayer[] = [
        { cover: 'BKN', base: 5000 },
        { cover: 'OVC', base: 800 }, // Lowest
        { cover: 'BKN', base: 3000 }
      ];
      expect(calculateFlightCategory(10, clouds)).toBe('IFR');
    });
  });

  describe('null handling', () => {
    it('should return null for missing visibility', () => {
      const clouds: CloudLayer[] = [{ cover: 'SKC' }];
      expect(calculateFlightCategory(null, clouds)).toBeNull();
    });

    it('should return null for undefined visibility', () => {
      const clouds: CloudLayer[] = [{ cover: 'SKC' }];
      expect(calculateFlightCategory(undefined, clouds)).toBeNull();
    });

    it('should return null for zero visibility', () => {
      const clouds: CloudLayer[] = [{ cover: 'SKC' }];
      expect(calculateFlightCategory(0, clouds)).toBeNull();
    });

    it('should handle missing cloud data gracefully', () => {
      expect(calculateFlightCategory(10, undefined)).toBe('VFR');
    });

    it('should handle empty cloud array', () => {
      expect(calculateFlightCategory(10, [])).toBe('VFR');
    });
  });
});

describe('parseVisibility', () => {
  it('should parse numeric visibility', () => {
    expect(parseVisibility('10')).toBe(10);
    expect(parseVisibility('5')).toBe(5);
    expect(parseVisibility('0.5')).toBe(0.5);
  });

  it('should handle "10+" format', () => {
    expect(parseVisibility('10+')).toBe(10);
  });

  it('should handle fractional visibility', () => {
    expect(parseVisibility('0.25')).toBe(0.25);
    expect(parseVisibility('1.5')).toBe(1.5);
  });

  it('should return null for undefined', () => {
    expect(parseVisibility(undefined)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseVisibility('')).toBeNull();
  });

  it('should return null for invalid format', () => {
    expect(parseVisibility('ABC')).toBeNull();
  });

  it('should return null for negative visibility', () => {
    expect(parseVisibility('-5')).toBeNull();
  });
});
