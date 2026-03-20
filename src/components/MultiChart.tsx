'use client';

import React, { useState } from 'react';
import { IndicatorConfig, IndicatorType, ChartWindow } from '@/types';
import { useCandles, useSearch } from '@/hooks/useStockData';
import { useCompareData } from '@/hooks/useCompareData';
import Chart from './Chart';
import ChartControls from './ChartControls';

const COMPARE_COLORS = ['#FF9800', '#E91E63'];

interface MultiChartProps {
  windows: ChartWindow[];
  onRemoveWindow: (id: string) => void;
  onChangeSymbol: (id: string, symbol: string) => void;
  indicators: IndicatorConfig[];
  onAddIndicator: (type: IndicatorType) => void;
  onRemoveIndicator: (id: string) => void;
  onUpdateIndicator: (id: string, updates: Partial<Pick<IndicatorConfig, 'period' | 'color' | 'enabled'>>) => void;
  chartRange: string;
  onChangeRange: (range: string) => void;
  onAddWindowCompare: (windowId: string, symbol: string) => void;
  onRemoveWindowCompare: (windowId: string, symbol: string) => void;
  measureMode?: boolean;
  onToggleMeasure?: () => void;
}

function displaySymbol(s: string) {
  return s.replace('.NS', '').replace('.BO', '');
}

function ChartPane({ window: win, indicators, chartRange, onRemove, onChangeSymbol, onAddCompare, onRemoveCompare, measureMode }: {
  window: ChartWindow;
  indicators: IndicatorConfig[];
  chartRange: string;
  onRemove: () => void;
  onChangeSymbol: (symbol: string) => void;
  onAddCompare: (symbol: string) => void;
  onRemoveCompare: (symbol: string) => void;
  measureMode?: boolean;
}) {
  const { candles, loading } = useCandles(win.symbol, chartRange);
  const compareData = useCompareData(win.compareSymbols, chartRange);
  const [compareInputOpen, setCompareInputOpen] = useState(false);
  const [compareQuery, setCompareQuery] = useState('');
  const searchResults = useSearch(compareQuery);
  const [symbolEditOpen, setSymbolEditOpen] = useState(false);
  const [symbolQuery, setSymbolQuery] = useState('');
  const symbolSearchResults = useSearch(symbolQuery);

  const handleAddCompare = (symbol: string) => {
    onAddCompare(symbol);
    setCompareQuery('');
    setCompareInputOpen(false);
  };

  const handleSymbolSelect = (symbol: string) => {
    onChangeSymbol(symbol);
    setSymbolQuery('');
    setSymbolEditOpen(false);
  };

  return (
    <div className="flex flex-col h-full border border-gray-800 rounded overflow-hidden bg-[#0a0e17]">
      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#0d1117] border-b border-gray-800 min-h-[24px]">
        <div className="relative shrink-0">
          {symbolEditOpen ? (
            <>
              <input
                type="text"
                autoFocus
                autoComplete="off"
                value={symbolQuery}
                onChange={e => setSymbolQuery(e.target.value)}
                onBlur={() => { setTimeout(() => { setSymbolEditOpen(false); setSymbolQuery(''); }, 200); }}
                onKeyDown={e => { if (e.key === 'Escape') { setSymbolEditOpen(false); setSymbolQuery(''); } }}
                placeholder={displaySymbol(win.symbol)}
                className="w-20 px-1 py-px text-[10px] bg-transparent border border-gray-700 rounded text-white placeholder-gray-600 outline-none focus:border-blue-500 font-mono"
              />
              {symbolSearchResults.length > 0 && symbolQuery.length >= 2 && (
                <div className="absolute top-full left-0 mt-0.5 w-44 bg-[#0d1117] border border-gray-700 rounded shadow-xl z-30 max-h-32 overflow-y-auto">
                  {symbolSearchResults
                    .filter(r => r.symbol.endsWith('.NS') || r.symbol.endsWith('.BO'))
                    .slice(0, 6)
                    .map(r => (
                      <button
                        key={r.symbol}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => handleSymbolSelect(r.symbol)}
                        className="w-full px-1.5 py-0.5 text-left text-[10px] hover:bg-gray-800/50 flex items-center gap-1"
                      >
                        <span className="text-white font-mono">{displaySymbol(r.symbol)}</span>
                        <span className="text-gray-500 truncate">{r.name}</span>
                      </button>
                    ))}
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => setSymbolEditOpen(true)}
              className="text-[11px] text-gray-300 font-mono hover:text-blue-400 transition-colors cursor-pointer"
              title="Change symbol"
            >
              {displaySymbol(win.symbol)}
            </button>
          )}
        </div>

        {/* Comparison symbol chips */}
        {win.compareSymbols.map((s, i) => (
          <span
            key={s}
            className="flex items-center gap-0.5 px-1 py-px text-[10px] rounded border border-gray-700/60 bg-gray-800/40 shrink-0"
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length] }}
            />
            <span className="text-gray-300 font-mono">{displaySymbol(s)}</span>
            <button
              onClick={() => onRemoveCompare(s)}
              className="text-gray-600 hover:text-red-400 ml-px"
            >
              <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}

        {/* Compare add button / inline input */}
        {win.compareSymbols.length < 2 && (
          <div className="relative shrink-0">
            {compareInputOpen ? (
              <input
                type="text"
                autoFocus
                value={compareQuery}
                onChange={e => setCompareQuery(e.target.value)}
                onBlur={() => { setTimeout(() => { setCompareInputOpen(false); setCompareQuery(''); }, 200); }}
                onKeyDown={e => { if (e.key === 'Escape') { setCompareInputOpen(false); setCompareQuery(''); } }}
                placeholder="Symbol..."
                className="w-20 px-1 py-px text-[10px] bg-transparent border border-gray-700 rounded text-white placeholder-gray-600 outline-none focus:border-blue-500"
              />
            ) : (
              <button
                onClick={() => setCompareInputOpen(true)}
                className="px-1 py-px text-[10px] text-gray-500 hover:text-blue-400 border border-gray-800 hover:border-gray-700 rounded transition-colors"
                title="Compare stock"
              >
                +Cmp
              </button>
            )}
            {compareInputOpen && searchResults.length > 0 && compareQuery.length >= 2 && (
              <div className="absolute top-full left-0 mt-0.5 w-40 bg-[#0d1117] border border-gray-700 rounded shadow-xl z-30 max-h-28 overflow-y-auto">
                {searchResults
                  .filter(r => !win.compareSymbols.includes(r.symbol) && r.symbol !== win.symbol)
                  .slice(0, 6)
                  .map(r => (
                    <button
                      key={r.symbol}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => handleAddCompare(r.symbol)}
                      className="w-full px-1.5 py-0.5 text-left text-[10px] hover:bg-gray-800/50 flex items-center gap-1"
                    >
                      <span className="text-white font-mono">{displaySymbol(r.symbol)}</span>
                      <span className="text-gray-500 truncate">{r.name}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />
        <button onClick={onRemove} className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0e17]/80 z-10">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <Chart data={candles} symbol={displaySymbol(win.symbol)} indicators={indicators} compareData={compareData} measureMode={measureMode} />
      </div>
    </div>
  );
}

export default function MultiChart({
  windows,
  onRemoveWindow,
  onChangeSymbol,
  indicators,
  onAddIndicator,
  onRemoveIndicator,
  onUpdateIndicator,
  chartRange,
  onChangeRange,
  onAddWindowCompare,
  onRemoveWindowCompare,
  measureMode,
  onToggleMeasure,
}: MultiChartProps) {
  const cols = windows.length <= 1 ? 1 : windows.length <= 4 ? 2 : 3;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ChartControls indicators={indicators} onAddIndicator={onAddIndicator} onRemoveIndicator={onRemoveIndicator} onUpdateIndicator={onUpdateIndicator} measureMode={measureMode} onToggleMeasure={onToggleMeasure} />
      <div className="flex items-center gap-0.5 px-3 py-1 border-b border-gray-800 bg-[#0d1117]">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-2">Range</span>
        {['1d', '5d', '1mo', '6mo', '1y', '5y'].map(r => (
          <button
            key={r}
            onClick={() => onChangeRange(r)}
            className={`px-2 py-0.5 text-[11px] rounded font-mono transition-colors ${
              chartRange === r
                ? 'text-white border border-gray-600 bg-gray-800'
                : 'text-gray-500 border border-gray-800 hover:border-gray-700 hover:text-gray-400'
            }`}
          >
            {r.toUpperCase()}
          </button>
        ))}
      </div>
      <div
        className="flex-1 p-1 gap-1"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridAutoRows: windows.length <= 2 ? '1fr' : '1fr',
        }}
      >
        {windows.map(win => (
          <ChartPane
            key={win.id}
            window={win}
            indicators={indicators}
            chartRange={chartRange}
            onRemove={() => onRemoveWindow(win.id)}
            onChangeSymbol={(symbol) => onChangeSymbol(win.id, symbol)}
            onAddCompare={(symbol) => onAddWindowCompare(win.id, symbol)}
            onRemoveCompare={(symbol) => onRemoveWindowCompare(win.id, symbol)}
            measureMode={measureMode}
          />
        ))}
      </div>
    </div>
  );
}
