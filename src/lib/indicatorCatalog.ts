import { IndicatorType, IndicatorPanel, IndicatorCatalogEntry, IndicatorConfig } from '@/types';

export const INDICATOR_CATALOG: IndicatorCatalogEntry[] = [
  { type: 'SMA', label: 'SMA', defaultPeriod: 20, defaultColor: '#FFD700', panel: 'overlay', description: 'Simple Moving Average' },
  { type: 'EMA', label: 'EMA', defaultPeriod: 12, defaultColor: '#00BFFF', panel: 'overlay', description: 'Exponential Moving Average' },
  { type: 'BOLLINGER', label: 'Bollinger', defaultPeriod: 20, defaultColor: '#2196F3', panel: 'overlay', description: 'Bollinger Bands', defaultParams: { stdDev: 2 } },
  { type: 'VWAP', label: 'VWAP', defaultPeriod: 0, defaultColor: '#FF9800', panel: 'overlay', description: 'Volume Weighted Avg Price' },
  { type: 'RSI', label: 'RSI', defaultPeriod: 14, defaultColor: '#AB47BC', panel: 'subchart', description: 'Relative Strength Index' },
  { type: 'MACD', label: 'MACD', defaultPeriod: 12, defaultColor: '#2196F3', panel: 'subchart', description: 'MACD (12, 26, 9)', defaultParams: { fast: 12, slow: 26, signal: 9 } },
  { type: 'STOCHASTIC', label: 'Stochastic', defaultPeriod: 14, defaultColor: '#E91E63', panel: 'subchart', description: 'Stochastic Oscillator', defaultParams: { k: 14, d: 3 } },
  { type: 'ATR', label: 'ATR', defaultPeriod: 14, defaultColor: '#FF5722', panel: 'subchart', description: 'Average True Range' },
  { type: 'WILLIAMS_R', label: 'Williams %R', defaultPeriod: 14, defaultColor: '#8BC34A', panel: 'subchart', description: 'Williams Percent Range' },
  { type: 'OBV', label: 'OBV', defaultPeriod: 0, defaultColor: '#26A69A', panel: 'subchart', description: 'On-Balance Volume' },
];

export const INDICATOR_PALETTE = ['#FFD700', '#00BFFF', '#FF6384', '#AB47BC', '#26A69A', '#FF9800', '#E91E63', '#8BC34A', '#2196F3', '#FF5722'];

export function getIndicatorPanel(type: IndicatorType): IndicatorPanel {
  return INDICATOR_CATALOG.find(c => c.type === type)?.panel ?? 'overlay';
}

export function nextColor(existing: IndicatorConfig[]): string {
  const used = new Set(existing.map(i => i.color));
  return INDICATOR_PALETTE.find(c => !used.has(c)) ?? INDICATOR_PALETTE[existing.length % INDICATOR_PALETTE.length];
}
