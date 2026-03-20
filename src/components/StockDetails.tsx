'use client';

import { StockQuote } from '@/types';

interface StockDetailsProps {
  stock: StockQuote;
}

function formatINR(n: number, decimals = 2): string {
  if (n >= 1e12) return '\u20B9' + (n / 1e12).toFixed(decimals) + 'T';
  if (n >= 1e7) return '\u20B9' + (n / 1e7).toFixed(decimals) + ' Cr';
  if (n >= 1e5) return '\u20B9' + (n / 1e5).toFixed(decimals) + ' L';
  return '\u20B9' + n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatVol(v: number): string {
  if (v >= 1e7) return (v / 1e7).toFixed(1) + ' Cr';
  if (v >= 1e5) return (v / 1e5).toFixed(1) + ' L';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toString();
}

function displaySymbol(s: string) {
  return s.replace('.NS', '').replace('.BO', '');
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-[10px] text-gray-500">{label}</span>
      <span className={`text-[11px] font-mono ${color ?? 'text-white'}`}>{value}</span>
    </div>
  );
}

export default function StockDetails({ stock }: StockDetailsProps) {
  const changeColor = stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400';
  const range52 = stock.week52High - stock.week52Low;
  const rangePercent = range52 > 0 ? ((stock.price - stock.week52Low) / range52) * 100 : 50;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-800">
        <div className="flex items-baseline gap-2">
          <span className="text-lg text-white font-mono font-bold">{displaySymbol(stock.symbol)}</span>
          <span className="text-xs text-gray-500 truncate">{stock.name}</span>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl text-white font-mono font-bold">{'\u20B9'}{stock.price.toFixed(2)}</span>
          <span className={`text-sm font-mono ${changeColor}`}>
            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
          </span>
        </div>
        {stock.sector && (
          <div className="text-[9px] text-gray-500 mt-0.5 uppercase tracking-wider">{stock.sector}</div>
        )}
      </div>

      <div className="px-3 py-2 space-y-0.5 flex-1 overflow-y-auto">
        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Trading</div>
        <Stat label="Open" value={`\u20B9${stock.open.toFixed(2)}`} />
        <Stat label="High" value={`\u20B9${stock.high.toFixed(2)}`} />
        <Stat label="Low" value={`\u20B9${stock.low.toFixed(2)}`} />
        <Stat label="Prev Close" value={`\u20B9${stock.prevClose.toFixed(2)}`} />
        <Stat label="Volume" value={formatVol(stock.volume)} />

        <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-3 mb-1">Fundamentals</div>
        <Stat label="Market Cap" value={formatINR(stock.marketCap)} />
        <Stat label="P/E Ratio" value={stock.pe > 0 ? stock.pe.toFixed(1) : 'N/A'} />
        <Stat label="52W High" value={`\u20B9${stock.week52High.toFixed(2)}`} />
        <Stat label="52W Low" value={`\u20B9${stock.week52Low.toFixed(2)}`} />

        {stock.week52High > 0 && stock.week52Low > 0 && (
          <div className="mt-3">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">52 Week Range</div>
            <div className="relative h-1.5 bg-gray-800 rounded-full">
              <div
                className="absolute h-full bg-blue-500 rounded-full"
                style={{ left: '0%', width: `${Math.min(Math.max(rangePercent, 0), 100)}%` }}
              />
              <div
                className="absolute w-2 h-2 bg-white rounded-full -top-[1px] shadow"
                style={{ left: `${Math.min(Math.max(rangePercent, 0), 100)}%`, transform: 'translateX(-50%)' }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-gray-500 font-mono">{'\u20B9'}{stock.week52Low.toFixed(2)}</span>
              <span className="text-[9px] text-gray-500 font-mono">{'\u20B9'}{stock.week52High.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
