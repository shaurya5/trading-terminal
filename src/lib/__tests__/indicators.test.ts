import { describe, it, expect } from 'vitest';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateStochastic,
  calculateATR,
  calculateVWAP,
  calculateWilliamsR,
  calculateOBV,
} from '@/lib/indicators';
import { CandleData } from '@/types';

// Helper to create CandleData from an array of close prices
function makeCandles(closePrices: number[]): CandleData[] {
  return closePrices.map((close, i) => ({
    time: `2024-01-${String(i + 1).padStart(2, '0')}`,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 1000,
  }));
}

describe('calculateSMA', () => {
  it('computes correct SMA values for known data', () => {
    const candles = makeCandles([10, 20, 30, 40, 50]);
    const result = calculateSMA(candles, 3);

    // SMA(3) at index 2: (10+20+30)/3 = 20
    // SMA(3) at index 3: (20+30+40)/3 = 30
    // SMA(3) at index 4: (30+40+50)/3 = 40
    expect(result).toHaveLength(3);
    expect(result[0].value).toBe(20);
    expect(result[1].value).toBe(30);
    expect(result[2].value).toBe(40);
  });

  it('returns timestamps matching the source data', () => {
    const candles = makeCandles([10, 20, 30, 40, 50]);
    const result = calculateSMA(candles, 3);
    expect(result[0].time).toBe(candles[2].time);
    expect(result[2].time).toBe(candles[4].time);
  });

  it('returns empty array for empty data', () => {
    expect(calculateSMA([], 3)).toEqual([]);
  });

  it('returns empty array when data is shorter than period', () => {
    const candles = makeCandles([10, 20]);
    expect(calculateSMA(candles, 5)).toEqual([]);
  });
});

describe('calculateEMA', () => {
  it('first EMA value equals SMA of the initial period', () => {
    const candles = makeCandles([10, 20, 30, 40, 50]);
    const result = calculateEMA(candles, 3);
    // First EMA(3) = SMA of first 3 = (10+20+30)/3 = 20
    expect(result[0].value).toBe(20);
  });

  it('produces the correct number of values', () => {
    const candles = makeCandles([10, 20, 30, 40, 50]);
    const result = calculateEMA(candles, 3);
    // period=3, so 5 - 3 + 1 = 3 values
    expect(result).toHaveLength(3);
  });

  it('subsequent EMA values use the EMA formula', () => {
    const candles = makeCandles([10, 20, 30, 40, 50]);
    const result = calculateEMA(candles, 3);
    const multiplier = 2 / (3 + 1); // 0.5
    // ema[0] = 20 (SMA)
    // ema[1] = (40 - 20) * 0.5 + 20 = 30
    // ema[2] = (50 - 30) * 0.5 + 30 = 40
    expect(result[1].value).toBe(30);
    expect(result[2].value).toBe(40);
  });

  it('returns empty array for empty data', () => {
    expect(calculateEMA([], 3)).toEqual([]);
  });
});

describe('calculateRSI', () => {
  it('returns values between 0 and 100', () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 10);
    const candles = makeCandles(prices);
    const result = calculateRSI(candles, 14);
    for (const point of result) {
      expect(point.value).toBeGreaterThanOrEqual(0);
      expect(point.value).toBeLessThanOrEqual(100);
    }
  });

  it('gives RSI near 100 for all-up moves', () => {
    // Steadily rising prices
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i * 5);
    const candles = makeCandles(prices);
    const result = calculateRSI(candles, 14);
    // All gains, no losses => RSI should be near 100
    for (const point of result) {
      expect(point.value).toBeGreaterThan(95);
    }
  });

  it('gives RSI near 0 for all-down moves', () => {
    // Steadily falling prices
    const prices = Array.from({ length: 20 }, (_, i) => 200 - i * 5);
    const candles = makeCandles(prices);
    const result = calculateRSI(candles, 14);
    // All losses, no gains => RSI should be near 0
    for (const point of result) {
      expect(point.value).toBeLessThan(5);
    }
  });

  it('returns empty array for empty data', () => {
    expect(calculateRSI([], 14)).toEqual([]);
  });

  it('returns empty array when data is shorter than period + 1', () => {
    const candles = makeCandles([10, 20, 30]);
    expect(calculateRSI(candles, 14)).toEqual([]);
  });
});

describe('calculateMACD', () => {
  it('returns macd, signal, and histogram arrays', () => {
    // Need at least 26 + 9 data points for full MACD (with signal)
    const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 20);
    const candles = makeCandles(prices);
    const result = calculateMACD(candles);

    expect(result).toHaveProperty('macd');
    expect(result).toHaveProperty('signal');
    expect(result).toHaveProperty('histogram');
    expect(Array.isArray(result.macd)).toBe(true);
    expect(Array.isArray(result.signal)).toBe(true);
    expect(Array.isArray(result.histogram)).toBe(true);
  });

  it('macd line has values when data >= 26 points', () => {
    const prices = Array.from({ length: 40 }, (_, i) => 100 + i);
    const candles = makeCandles(prices);
    const result = calculateMACD(candles);
    expect(result.macd.length).toBeGreaterThan(0);
  });

  it('histogram colors are green for positive, red for negative', () => {
    const prices = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 30);
    const candles = makeCandles(prices);
    const result = calculateMACD(candles);
    for (const bar of result.histogram) {
      if (bar.value >= 0) {
        expect(bar.color).toBe('#26a69a');
      } else {
        expect(bar.color).toBe('#ef5350');
      }
    }
  });

  it('returns empty arrays for insufficient data', () => {
    const candles = makeCandles([10, 20, 30]);
    const result = calculateMACD(candles);
    expect(result.macd).toEqual([]);
    expect(result.signal).toEqual([]);
    expect(result.histogram).toEqual([]);
  });
});

describe('calculateBollingerBands', () => {
  it('returns upper, middle, and lower arrays', () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 10);
    const candles = makeCandles(prices);
    const result = calculateBollingerBands(candles, 20, 2);

    expect(result).toHaveProperty('upper');
    expect(result).toHaveProperty('middle');
    expect(result).toHaveProperty('lower');
  });

  it('upper > middle > lower at every point', () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 10);
    const candles = makeCandles(prices);
    const result = calculateBollingerBands(candles, 20, 2);

    for (let i = 0; i < result.middle.length; i++) {
      expect(result.upper[i].value).toBeGreaterThanOrEqual(result.middle[i].value);
      expect(result.middle[i].value).toBeGreaterThanOrEqual(result.lower[i].value);
    }
  });

  it('all three arrays have the same length', () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
    const candles = makeCandles(prices);
    const result = calculateBollingerBands(candles, 20, 2);
    expect(result.upper.length).toBe(result.middle.length);
    expect(result.middle.length).toBe(result.lower.length);
  });

  it('returns empty arrays for empty data', () => {
    const result = calculateBollingerBands([], 20, 2);
    expect(result.upper).toEqual([]);
    expect(result.middle).toEqual([]);
    expect(result.lower).toEqual([]);
  });

  it('returns empty arrays when data is shorter than period', () => {
    const candles = makeCandles([10, 20, 30]);
    const result = calculateBollingerBands(candles, 20, 2);
    expect(result.upper).toEqual([]);
    expect(result.middle).toEqual([]);
    expect(result.lower).toEqual([]);
  });
});

// Helper that allows custom high, low, and volume per bar
function makeCandleData(
  bars: { close: number; high?: number; low?: number; volume?: number }[]
): CandleData[] {
  return bars.map((b, i) => ({
    time: `2024-01-${String(i + 1).padStart(2, '0')}`,
    open: b.close,
    high: b.high ?? b.close + 1,
    low: b.low ?? b.close - 1,
    close: b.close,
    volume: b.volume ?? 1000,
  }));
}

describe('calculateStochastic', () => {
  it('returns k and d arrays', () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 10);
    const candles = makeCandles(prices);
    const result = calculateStochastic(candles, 14, 3);
    expect(Array.isArray(result.k)).toBe(true);
    expect(Array.isArray(result.d)).toBe(true);
    expect(result.k.length).toBeGreaterThan(0);
    expect(result.d.length).toBeGreaterThan(0);
  });

  it('k values are between 0 and 100', () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 10);
    const candles = makeCandles(prices);
    const result = calculateStochastic(candles, 14, 3);
    for (const point of result.k) {
      expect(point.value).toBeGreaterThanOrEqual(0);
      expect(point.value).toBeLessThanOrEqual(100);
    }
  });

  it('d array is shorter than k by dPeriod - 1', () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
    const candles = makeCandles(prices);
    const result = calculateStochastic(candles, 14, 3);
    expect(result.d.length).toBe(result.k.length - 2); // dPeriod - 1 = 2
  });

  it('returns empty arrays for insufficient data', () => {
    const candles = makeCandles([10, 20, 30]);
    const result = calculateStochastic(candles, 14, 3);
    expect(result.k).toEqual([]);
    expect(result.d).toEqual([]);
  });
});

describe('calculateATR', () => {
  it('returns positive values', () => {
    const candles = makeCandleData(
      Array.from({ length: 30 }, (_, i) => ({
        close: 100 + Math.sin(i) * 10,
        high: 100 + Math.sin(i) * 10 + 3,
        low: 100 + Math.sin(i) * 10 - 3,
      }))
    );
    const result = calculateATR(candles, 14);
    expect(result.length).toBeGreaterThan(0);
    for (const point of result) {
      expect(point.value).toBeGreaterThan(0);
    }
  });

  it('returns correct length', () => {
    const candles = makeCandleData(
      Array.from({ length: 30 }, (_, i) => ({
        close: 100 + i,
        high: 100 + i + 2,
        low: 100 + i - 2,
      }))
    );
    const result = calculateATR(candles, 14);
    // Should have data.length - period + 1 values
    expect(result.length).toBe(30 - 14 + 1);
  });

  it('returns empty array for insufficient data', () => {
    const candles = makeCandles([10, 20, 30]);
    const result = calculateATR(candles, 14);
    expect(result).toEqual([]);
  });

  it('returns empty array for less than 2 data points', () => {
    const candles = makeCandles([10]);
    const result = calculateATR(candles, 1);
    // Only 1 data point, ATR needs at least 2 bars for TR calculation
    expect(result).toEqual([]);
  });
});

describe('calculateVWAP', () => {
  it('returns values between low and high price range', () => {
    const candles = makeCandleData(
      Array.from({ length: 20 }, (_, i) => ({
        close: 100 + i,
        high: 105 + i,
        low: 95 + i,
        volume: 1000 + i * 100,
      }))
    );
    const result = calculateVWAP(candles);
    expect(result.length).toBe(candles.length);

    // VWAP should be within the overall price range
    const allLows = candles.map(c => c.low);
    const allHighs = candles.map(c => c.high);
    const minLow = Math.min(...allLows);
    const maxHigh = Math.max(...allHighs);
    for (const point of result) {
      expect(point.value).toBeGreaterThanOrEqual(minLow);
      expect(point.value).toBeLessThanOrEqual(maxHigh);
    }
  });

  it('returns same length as input', () => {
    const candles = makeCandles([100, 101, 102, 103, 104]);
    const result = calculateVWAP(candles);
    expect(result.length).toBe(candles.length);
  });

  it('returns empty array for empty data', () => {
    const result = calculateVWAP([]);
    expect(result).toEqual([]);
  });
});

describe('calculateWilliamsR', () => {
  it('returns values between -100 and 0', () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 10);
    const candles = makeCandles(prices);
    const result = calculateWilliamsR(candles, 14);
    expect(result.length).toBeGreaterThan(0);
    for (const point of result) {
      expect(point.value).toBeGreaterThanOrEqual(-100);
      expect(point.value).toBeLessThanOrEqual(0);
    }
  });

  it('returns correct length', () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
    const candles = makeCandles(prices);
    const result = calculateWilliamsR(candles, 14);
    expect(result.length).toBe(30 - 14 + 1);
  });

  it('returns empty for insufficient data', () => {
    const candles = makeCandles([10, 20, 30]);
    const result = calculateWilliamsR(candles, 14);
    expect(result).toEqual([]);
  });
});

describe('calculateOBV', () => {
  it('returns correct length', () => {
    const candles = makeCandles([100, 101, 102, 103, 104]);
    const result = calculateOBV(candles);
    expect(result.length).toBe(candles.length);
  });

  it('first value equals first volume', () => {
    const candles = makeCandleData([
      { close: 100, volume: 5000 },
      { close: 102, volume: 3000 },
      { close: 101, volume: 2000 },
    ]);
    const result = calculateOBV(candles);
    expect(result[0].value).toBe(5000);
  });

  it('increases on up moves and decreases on down moves', () => {
    const candles = makeCandleData([
      { close: 100, volume: 1000 },
      { close: 105, volume: 2000 }, // up => OBV = 1000 + 2000 = 3000
      { close: 102, volume: 1500 }, // down => OBV = 3000 - 1500 = 1500
      { close: 102, volume: 800 },  // equal => OBV = 1500
      { close: 110, volume: 3000 }, // up => OBV = 1500 + 3000 = 4500
    ]);
    const result = calculateOBV(candles);
    expect(result[0].value).toBe(1000);
    expect(result[1].value).toBe(3000);
    expect(result[2].value).toBe(1500);
    expect(result[3].value).toBe(1500); // unchanged on equal close
    expect(result[4].value).toBe(4500);
  });

  it('returns empty array for empty data', () => {
    const result = calculateOBV([]);
    expect(result).toEqual([]);
  });
});
