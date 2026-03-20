'use client';

import { IndicatorConfig } from '@/types';

interface ChartControlsProps {
  indicators: IndicatorConfig[];
  onToggle: (type: IndicatorConfig['type']) => void;
  measureMode?: boolean;
  onToggleMeasure?: () => void;
}

const INDICATOR_LABELS: Record<string, string> = {
  SMA: 'SMA (20)',
  EMA: 'EMA (12)',
  RSI: 'RSI (14)',
  MACD: 'MACD',
  BOLLINGER: 'BB (20)',
};

export default function ChartControls({ indicators, onToggle, measureMode, onToggleMeasure }: ChartControlsProps) {
  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-800 bg-[#0d1117]">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-2">Indicators</span>
      {indicators.map(ind => (
        <button
          key={ind.type}
          onClick={() => onToggle(ind.type)}
          className={`px-2 py-0.5 text-[11px] rounded font-mono transition-colors ${
            ind.enabled
              ? 'text-white border border-gray-600 bg-gray-800'
              : 'text-gray-500 border border-gray-800 hover:border-gray-700 hover:text-gray-400'
          }`}
        >
          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: ind.enabled ? ind.color : '#333' }} />
          {INDICATOR_LABELS[ind.type]}
        </button>
      ))}
      {onToggleMeasure && (
        <>
          <span className="text-gray-700 mx-1">|</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-1">Tools</span>
          <button
            onClick={onToggleMeasure}
            className={`px-2 py-0.5 text-[11px] rounded font-mono transition-colors flex items-center gap-1 ${
              measureMode
                ? 'text-yellow-400 border border-yellow-600 bg-yellow-900/30'
                : 'text-gray-500 border border-gray-800 hover:border-gray-700 hover:text-gray-400'
            }`}
            title="Measure tool: click two points to measure price difference, % change, and bar count"
          >
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 14L14 2" />
              <path d="M2 14L2 10" />
              <path d="M2 14L6 14" />
              <path d="M14 2L14 6" />
              <path d="M14 2L10 2" />
              <path d="M5 11L7 9" />
              <path d="M8 8L10 6" />
            </svg>
            Measure
          </button>
        </>
      )}
    </div>
  );
}
