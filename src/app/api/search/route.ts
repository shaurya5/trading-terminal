import { NextRequest, NextResponse } from 'next/server';
import { yahooFinance } from '@/lib/yahoo';
import { getCachedAsync, setCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

interface SearchQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  if (!query) {
    return NextResponse.json([]);
  }

  const cacheKey = `search:${query}`;
  const cached = await getCachedAsync<unknown[]>(cacheKey);
  if (cached) return NextResponse.json(cached, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });

  try {
    const result = await yahooFinance.search(query);
    const quotes = (result.quotes ?? []) as SearchQuote[];
    const stocks = quotes
      .filter(q => q.symbol && (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO')))
      .slice(0, 10)
      .map(q => ({
        symbol: q.symbol!,
        name: q.shortname ?? q.longname ?? q.symbol!,
        exchange: q.exchange ?? '',
      }));

    setCache(cacheKey, stocks, 300000);
    return NextResponse.json(stocks, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  } catch (e) {
    console.error('Search API error:', e);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
