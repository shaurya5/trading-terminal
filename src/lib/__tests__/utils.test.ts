import { describe, it, expect } from 'vitest';
import { displaySymbol, COMPARE_COLORS } from '@/lib/utils';

describe('displaySymbol', () => {
  it('strips .NS suffix', () => {
    expect(displaySymbol('RELIANCE.NS')).toBe('RELIANCE');
  });

  it('strips .BO suffix', () => {
    expect(displaySymbol('TCS.BO')).toBe('TCS');
  });

  it('leaves symbols without .NS or .BO unchanged', () => {
    expect(displaySymbol('AAPL')).toBe('AAPL');
  });

  it('handles empty string', () => {
    expect(displaySymbol('')).toBe('');
  });

  it('only strips first occurrence of .NS', () => {
    // .replace only replaces the first match
    expect(displaySymbol('TEST.NS.NS')).toBe('TEST.NS');
  });
});

describe('COMPARE_COLORS', () => {
  it('has exactly 4 entries', () => {
    expect(COMPARE_COLORS).toHaveLength(4);
  });

  it('all entries are non-empty strings', () => {
    for (const color of COMPARE_COLORS) {
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    }
  });
});
