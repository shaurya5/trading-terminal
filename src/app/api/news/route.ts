import { NextRequest, NextResponse } from 'next/server';
import { yahooFinance } from '@/lib/yahoo';
import { getCachedAsync, setCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

interface SearchNewsResult {
  uuid?: string;
  title?: string;
  publisher?: string;
  link?: string;
  providerPublishTime?: Date | string;
  thumbnail?: { resolutions?: { url?: string }[] };
  relatedTickers?: string[];
}

interface SigDev {
  headline?: string;
  date?: Date | string;
}

function isRelevant(
  item: SearchNewsResult,
  symbol: string,
  baseSymbol: string,
  companyName: string,
): boolean {
  // Check relatedTickers
  if (item.relatedTickers?.some(t => t.includes(baseSymbol) || t === symbol)) return true;
  // Check headline contains company name or symbol
  const title = (item.title ?? '').toLowerCase();
  if (title.includes(baseSymbol.toLowerCase())) return true;
  // Check for company name words (at least 2 chars, skip common words)
  const nameWords = companyName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (nameWords.length > 0 && nameWords.some(w => title.includes(w))) return true;
  return false;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
  }

  const cacheKey = `news:${symbol}`;
  const cached = await getCachedAsync<unknown[]>(cacheKey);
  if (cached) return NextResponse.json(cached, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240' } });

  const baseSymbol = symbol.replace('.NS', '').replace('.BO', '').toUpperCase();

  try {
    // First, get company name from a quick quote lookup
    let companyName = baseSymbol;
    try {
      const quote = await yahooFinance.quoteSummary(symbol, { modules: ['price'] });
      companyName = quote.price?.shortName ?? quote.price?.longName ?? baseSymbol;
    } catch { /* use baseSymbol as fallback */ }

    // Search with company name for much better relevance than the ticker symbol
    const searchQuery = companyName !== baseSymbol ? companyName : baseSymbol;

    // Fetch search news (using company name) and insights in parallel
    const [searchResult, insightsResult] = await Promise.allSettled([
      yahooFinance.search(searchQuery, { newsCount: 25 }),
      yahooFinance.insights(symbol).catch(() => null),
    ]);

    type NewsOut = {
      id: string;
      headline: string;
      summary: string;
      source: string;
      datetime: number;
      url: string;
      sentiment: 'positive' | 'negative' | 'neutral';
      thumbnail?: string;
      relatedTickers?: string[];
      type: 'news' | 'insight' | 'market';
    };

    const stockNews: NewsOut[] = [];
    const marketNews: NewsOut[] = [];

    // Process search news — separate relevant vs general
    if (searchResult.status === 'fulfilled') {
      const items = (searchResult.value.news ?? []) as SearchNewsResult[];

      for (const item of items) {
        const related = item.relatedTickers ?? [];
        const thumb = item.thumbnail?.resolutions?.[0]?.url;
        const relevant = isRelevant(item, symbol, baseSymbol, companyName);

        const entry: NewsOut = {
          id: item.uuid ?? `search-${stockNews.length + marketNews.length}`,
          headline: item.title ?? '',
          summary: item.title ?? '',
          source: item.publisher ?? 'Unknown',
          datetime: item.providerPublishTime
            ? new Date(item.providerPublishTime).getTime()
            : Date.now(),
          url: item.link ?? '#',
          sentiment: 'neutral',
          thumbnail: thumb,
          relatedTickers: related,
          type: relevant ? 'news' : 'market',
        };

        if (relevant) {
          stockNews.push(entry);
        } else {
          marketNews.push(entry);
        }
      }
    }

    // Process insights sigDevs - these are ALWAYS stock-specific (most valuable)
    if (insightsResult.status === 'fulfilled' && insightsResult.value) {
      const insights = insightsResult.value as { sigDevs?: SigDev[] };
      const sigDevs = insights.sigDevs ?? [];

      for (const dev of sigDevs.slice(0, 8)) {
        if (!dev.headline) continue;
        stockNews.push({
          id: `insight-${stockNews.length}`,
          headline: dev.headline,
          summary: dev.headline,
          source: 'Yahoo Insights',
          datetime: dev.date ? new Date(dev.date).getTime() : Date.now(),
          url: '#',
          sentiment: 'neutral',
          type: 'insight',
        });
      }
    }

    // Sort each group by date
    stockNews.sort((a, b) => b.datetime - a.datetime);
    marketNews.sort((a, b) => b.datetime - a.datetime);

    // Stock-specific news first, then up to 5 market news items
    const combined = [...stockNews, ...marketNews.slice(0, 5)];

    setCache(cacheKey, combined, 120000);
    return NextResponse.json(combined, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240' } });
  } catch (e) {
    console.error('News API error:', e);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
