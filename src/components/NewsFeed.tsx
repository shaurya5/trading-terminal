'use client';

import { NewsItem } from '@/types';
import { displaySymbol } from '@/lib/utils';

interface NewsFeedProps {
  news: NewsItem[];
  symbol: string;
  loading?: boolean;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NewsCard({ item, symbol }: { item: NewsItem; symbol: string }) {
  const isInsight = item.type === 'insight';
  const isMarket = item.type === 'market';
  const isStockNews = item.type === 'news';

  return (
    <a
      href={item.url === '#' ? undefined : item.url}
      target={item.url === '#' ? undefined : '_blank'}
      rel={item.url === '#' ? undefined : 'noopener noreferrer'}
      className={`block px-3 py-2.5 border-b border-gray-800/50 transition-colors ${
        item.url === '#' ? 'cursor-default' : 'hover:bg-gray-800/30 cursor-pointer'
      }`}
    >
      <div className="flex gap-2.5">
        {item.thumbnail && (
          <div className="shrink-0 w-14 h-10 rounded overflow-hidden bg-gray-800 mt-0.5">
            <img src={item.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            {isInsight && (
              <span className="text-[8px] font-semibold uppercase tracking-wider px-1 py-px rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                Insight
              </span>
            )}
            {isStockNews && (
              <span className="text-[8px] font-semibold uppercase tracking-wider px-1 py-px rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {symbol}
              </span>
            )}
            <span className="text-[9px] text-gray-600">{item.source}</span>
            <span className="text-[9px] text-gray-700">·</span>
            <span className="text-[9px] text-gray-600">{timeAgo(item.datetime)}</span>
          </div>

          <h3 className={`text-[12px] font-medium leading-snug line-clamp-2 ${
            isMarket ? 'text-gray-500' : 'text-gray-200'
          }`}>
            {item.headline}
          </h3>

          {item.relatedTickers && item.relatedTickers.length > 0 && !isMarket && (
            <div className="flex items-center gap-1 mt-1">
              {item.relatedTickers.slice(0, 4).map(t => (
                <span key={t} className="text-[8px] text-gray-600 bg-gray-800/80 px-1 py-px rounded font-mono">
                  {displaySymbol(t)}
                </span>
              ))}
              {item.relatedTickers.length > 4 && (
                <span className="text-[8px] text-gray-700">+{item.relatedTickers.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

export default function NewsFeed({ news, symbol, loading }: NewsFeedProps) {
  const stockNews = news.filter(n => n.type === 'news' || n.type === 'insight');
  const marketNews = news.filter(n => n.type === 'market');

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-800">
        <h2 className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
          News · {symbol}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin relative">
        {loading && (
          <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-1.5 bg-[#0d1117]/90 border-b border-gray-800/50 backdrop-blur-sm">
            <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-gray-500">Updating news...</span>
          </div>
        )}

        {stockNews.length === 0 && marketNews.length === 0 && !loading && (
          <div className="px-3 py-8 text-center text-gray-600 text-[11px]">No news available</div>
        )}

        {/* Stock-specific news */}
        {stockNews.length > 0 && stockNews.map(item => (
          <NewsCard key={item.id} item={item} symbol={symbol} />
        ))}

        {stockNews.length === 0 && !loading && marketNews.length > 0 && (
          <div className="px-3 py-4 text-center text-gray-600 text-[11px]">
            No {symbol}-specific news found
          </div>
        )}

        {/* Market news section */}
        {marketNews.length > 0 && (
          <>
            <div className="px-3 py-1.5 bg-[#070a10] border-y border-gray-800">
              <span className="text-[9px] text-gray-600 uppercase tracking-wider">General Market</span>
            </div>
            {marketNews.map(item => (
              <NewsCard key={item.id} item={item} symbol={symbol} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
