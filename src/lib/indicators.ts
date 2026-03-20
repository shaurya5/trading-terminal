import { CandleData } from '@/types';

export type TimeValue = { time: string | number; value: number };

export function calculateSMA(data: CandleData[], period: number): TimeValue[] {
  const result: TimeValue[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({ time: data[i].time, value: +(sum / period).toFixed(2) });
  }
  return result;
}

export function calculateEMA(data: CandleData[], period: number): TimeValue[] {
  const result: TimeValue[] = [];
  const multiplier = 2 / (period + 1);

  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  let ema = sum / period;
  result.push({ time: data[period - 1].time, value: +ema.toFixed(2) });

  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({ time: data[i].time, value: +ema.toFixed(2) });
  }
  return result;
}

export function calculateRSI(data: CandleData[], period: number = 14): TimeValue[] {
  const result: TimeValue[] = [];
  const changes: number[] = [];

  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close);
  }

  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({ time: data[period].time, value: +(100 - 100 / (1 + rs)).toFixed(2) });

  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] >= 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({ time: data[i + 1].time, value: +(100 - 100 / (1 + rs)).toFixed(2) });
  }
  return result;
}

export function calculateMACD(data: CandleData[]): {
  macd: TimeValue[];
  signal: TimeValue[];
  histogram: (TimeValue & { color: string })[];
} {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);

  const macdLine: TimeValue[] = [];
  const ema26Start = 26 - 12;

  for (let i = 0; i < ema26.length; i++) {
    const ema12Val = ema12[i + ema26Start];
    if (ema12Val) {
      macdLine.push({
        time: ema26[i].time,
        value: +(ema12Val.value - ema26[i].value).toFixed(4),
      });
    }
  }

  const signalPeriod = 9;
  const signalMultiplier = 2 / (signalPeriod + 1);
  const signal: TimeValue[] = [];
  const histogram: (TimeValue & { color: string })[] = [];

  if (macdLine.length >= signalPeriod) {
    let sum = 0;
    for (let i = 0; i < signalPeriod; i++) sum += macdLine[i].value;
    let ema = sum / signalPeriod;
    signal.push({ time: macdLine[signalPeriod - 1].time, value: +ema.toFixed(4) });
    const h = macdLine[signalPeriod - 1].value - ema;
    histogram.push({ time: macdLine[signalPeriod - 1].time, value: +h.toFixed(4), color: h >= 0 ? '#26a69a' : '#ef5350' });

    for (let i = signalPeriod; i < macdLine.length; i++) {
      ema = (macdLine[i].value - ema) * signalMultiplier + ema;
      signal.push({ time: macdLine[i].time, value: +ema.toFixed(4) });
      const hv = macdLine[i].value - ema;
      histogram.push({ time: macdLine[i].time, value: +hv.toFixed(4), color: hv >= 0 ? '#26a69a' : '#ef5350' });
    }
  }

  return { macd: macdLine, signal, histogram };
}

export function calculateBollingerBands(data: CandleData[], period: number = 20, stdDev: number = 2): {
  upper: TimeValue[];
  middle: TimeValue[];
  lower: TimeValue[];
} {
  const upper: TimeValue[] = [];
  const middle: TimeValue[] = [];
  const lower: TimeValue[] = [];

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    const sma = sum / period;

    let variance = 0;
    for (let j = 0; j < period; j++) variance += Math.pow(data[i - j].close - sma, 2);
    const sd = Math.sqrt(variance / period);

    middle.push({ time: data[i].time, value: +sma.toFixed(2) });
    upper.push({ time: data[i].time, value: +(sma + stdDev * sd).toFixed(2) });
    lower.push({ time: data[i].time, value: +(sma - stdDev * sd).toFixed(2) });
  }

  return { upper, middle, lower };
}

export function calculateStochastic(
  data: CandleData[],
  kPeriod: number = 14,
  dPeriod: number = 3
): { k: TimeValue[]; d: TimeValue[] } {
  const kValues: TimeValue[] = [];

  for (let i = kPeriod - 1; i < data.length; i++) {
    let lowestLow = Infinity;
    let highestHigh = -Infinity;
    for (let j = 0; j < kPeriod; j++) {
      if (data[i - j].low < lowestLow) lowestLow = data[i - j].low;
      if (data[i - j].high > highestHigh) highestHigh = data[i - j].high;
    }
    const range = highestHigh - lowestLow;
    const k = range === 0 ? 50 : 100 * (data[i].close - lowestLow) / range;
    kValues.push({ time: data[i].time, value: +k.toFixed(2) });
  }

  // %D = SMA of %K over dPeriod
  const dValues: TimeValue[] = [];
  for (let i = dPeriod - 1; i < kValues.length; i++) {
    let sum = 0;
    for (let j = 0; j < dPeriod; j++) {
      sum += kValues[i - j].value;
    }
    dValues.push({ time: kValues[i].time, value: +(sum / dPeriod).toFixed(2) });
  }

  return { k: kValues, d: dValues };
}

export function calculateATR(data: CandleData[], period: number = 14): TimeValue[] {
  if (data.length < 2) return [];

  const trValues: number[] = [];

  // First TR uses high - low only (no previous close)
  trValues.push(data[0].high - data[0].low);

  for (let i = 1; i < data.length; i++) {
    const highLow = data[i].high - data[i].low;
    const highPrevClose = Math.abs(data[i].high - data[i - 1].close);
    const lowPrevClose = Math.abs(data[i].low - data[i - 1].close);
    trValues.push(Math.max(highLow, highPrevClose, lowPrevClose));
  }

  const result: TimeValue[] = [];

  // First ATR = simple average of first `period` TR values
  if (trValues.length < period) return [];
  let atr = 0;
  for (let i = 0; i < period; i++) atr += trValues[i];
  atr /= period;
  result.push({ time: data[period - 1].time, value: +atr.toFixed(2) });

  // Wilder's smoothing: ATR = ((prevATR * (period - 1)) + currentTR) / period
  for (let i = period; i < trValues.length; i++) {
    atr = (atr * (period - 1) + trValues[i]) / period;
    result.push({ time: data[i].time, value: +atr.toFixed(2) });
  }

  return result;
}

export function calculateVWAP(data: CandleData[]): TimeValue[] {
  const result: TimeValue[] = [];
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < data.length; i++) {
    const tp = (data[i].high + data[i].low + data[i].close) / 3;
    cumulativeTPV += tp * data[i].volume;
    cumulativeVolume += data[i].volume;
    const vwap = cumulativeVolume === 0 ? tp : cumulativeTPV / cumulativeVolume;
    result.push({ time: data[i].time, value: +vwap.toFixed(2) });
  }

  return result;
}

export function calculateWilliamsR(data: CandleData[], period: number = 14): TimeValue[] {
  const result: TimeValue[] = [];

  for (let i = period - 1; i < data.length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = 0; j < period; j++) {
      if (data[i - j].high > highestHigh) highestHigh = data[i - j].high;
      if (data[i - j].low < lowestLow) lowestLow = data[i - j].low;
    }
    const range = highestHigh - lowestLow;
    const wr = range === 0 ? -50 : -100 * (highestHigh - data[i].close) / range;
    result.push({ time: data[i].time, value: +wr.toFixed(2) });
  }

  return result;
}

export function calculateOBV(data: CandleData[]): TimeValue[] {
  const result: TimeValue[] = [];
  if (data.length === 0) return result;

  let obv = data[0].volume;
  result.push({ time: data[0].time, value: obv });

  for (let i = 1; i < data.length; i++) {
    if (data[i].close > data[i - 1].close) {
      obv += data[i].volume;
    } else if (data[i].close < data[i - 1].close) {
      obv -= data[i].volume;
    }
    // If equal, OBV unchanged
    result.push({ time: data[i].time, value: obv });
  }

  return result;
}
