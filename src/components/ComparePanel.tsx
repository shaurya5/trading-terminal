'use client';

import { useState } from 'react';
import { useSearch } from '@/hooks/useStockData';

interface ComparePanelProps {
  compareSymbols: string[];
  onAdd: (symbol: string) => void;
  onRemove: (symbol: string) => void;
}

const COLORS = ['#FF9800', '#E91E63', '#00BCD4', '#8BC34A'];

function displaySymbol(s: string) {
  return s.replace('.NS', '').replace('.BO', '');
}

export default function ComparePanel({ compareSymbols, onAdd, onRemove }: ComparePanelProps) {
  const [query, setQuery] = useState('');
  const searchResults = useSearch(query);

  return (
    <div className="flex items-center gap-1 px-3 py-1 border-b border-gray-800 bg-[#0d1117]">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-1">Compare</span>
      {compareSymbols.map((s, i) => (
        <span key={s} className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border border-gray-700 bg-gray-800/50">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
          <span className="text-white font-mono">{displaySymbol(s)}</span>
          <button onClick={() => onRemove(s)} className="text-gray-500 hover:text-red-400 ml-0.5">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      {compareSymbols.length < 4 && (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="+ Add stock"
            className="w-24 px-1.5 py-0.5 text-[10px] bg-transparent border border-gray-800 rounded text-white placeholder-gray-600 outline-none focus:border-blue-500"
          />
          {searchResults.length > 0 && query.length >= 2 && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-[#0d1117] border border-gray-700 rounded shadow-xl z-20 max-h-32 overflow-y-auto">
              {searchResults
                .filter(r => !compareSymbols.includes(r.symbol))
                .map(r => (
                  <button
                    key={r.symbol}
                    onClick={() => { onAdd(r.symbol); setQuery(''); }}
                    className="w-full px-2 py-1 text-left text-[10px] hover:bg-gray-800/50"
                  >
                    <span className="text-white font-mono">{displaySymbol(r.symbol)}</span>
                    <span className="text-gray-500 ml-1">{r.name}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
