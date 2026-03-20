'use client';

import { MarketIndex, SectorPerformance } from '@/types';

interface MarketOverviewProps {
  indices: MarketIndex[];
  sectors: SectorPerformance[];
}

export default function MarketOverview({ indices, sectors }: MarketOverviewProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-800">
        <h2 className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Market Overview</h2>
      </div>

      <div className="px-3 py-2 space-y-1.5 border-b border-gray-800">
        {indices.map(idx => (
          <div key={idx.symbol} className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 font-mono">{idx.symbol}</span>
              <span className="ml-1.5 text-[9px] text-gray-600">{idx.name}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-white font-mono">{idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className={`ml-1.5 text-[10px] font-mono ${idx.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {idx.changePercent >= 0 ? '+' : ''}{idx.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {sectors.length > 0 && (
        <div className="px-3 py-2">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Sector Heatmap</div>
          <div className="grid grid-cols-2 gap-1">
            {sectors.map(sector => {
              const intensity = Math.min(Math.abs(sector.performance) * 40, 100);
              const bg = sector.performance >= 0
                ? `rgba(38, 166, 154, ${intensity / 100})`
                : `rgba(239, 83, 80, ${intensity / 100})`;
              return (
                <div
                  key={sector.name}
                  className="px-2 py-1.5 rounded text-center"
                  style={{ backgroundColor: bg }}
                >
                  <div className="text-[9px] text-white/80 truncate">{sector.name}</div>
                  <div className={`text-[11px] font-mono font-bold ${sector.performance >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {sector.performance >= 0 ? '+' : ''}{sector.performance.toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {indices.length === 0 && (
        <div className="px-3 py-8 text-center">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <div className="text-[11px] text-gray-600">Loading indices...</div>
        </div>
      )}
    </div>
  );
}
