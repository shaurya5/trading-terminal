import { NextRequest, NextResponse } from 'next/server';
import { yahooFinance, DEFAULT_SYMBOLS, INDEX_SYMBOLS } from '@/lib/yahoo';
import { getCached, setCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get('symbols');
  const type = req.nextUrl.searchParams.get('type');

  const cacheKey = `quotes:${type ?? 'stocks'}:${symbolsParam ?? 'default'}`;
  const cached = getCached<unknown[]>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const symbols = type === 'indices'
      ? INDEX_SYMBOLS.map(i => i.symbol)
      : symbolsParam
        ? symbolsParam.split(',')
        : DEFAULT_SYMBOLS;

    const results = await Promise.allSettled(
      symbols.map(s => yahooFinance.quoteSummary(s, { modules: ['price', 'summaryDetail'] }))
    );

    const quotes = results
      .map((r, i) => {
        if (r.status !== 'fulfilled' || !r.value.price) return null;
        const p = r.value.price;
        const sd = r.value.summaryDetail;
        return {
          symbol: symbols[i],
          name: p.shortName ?? p.longName ?? symbols[i],
          price: p.regularMarketPrice ?? 0,
          change: p.regularMarketChange ?? 0,
          changePercent: p.regularMarketChangePercent ? p.regularMarketChangePercent * 100 : 0,
          high: p.regularMarketDayHigh ?? 0,
          low: p.regularMarketDayLow ?? 0,
          open: p.regularMarketOpen ?? 0,
          prevClose: p.regularMarketPreviousClose ?? 0,
          volume: p.regularMarketVolume ?? 0,
          marketCap: p.marketCap ?? 0,
          pe: sd?.trailingPE ?? 0,
          week52High: sd?.fiftyTwoWeekHigh ?? 0,
          week52Low: sd?.fiftyTwoWeekLow ?? 0,
          sector: '',
        };
      })
      .filter(Boolean);

    setCache(cacheKey, quotes, 5000);
    return NextResponse.json(quotes);
  } catch (e) {
    console.error('Quotes API error:', e);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}
