import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple IP-based rate limiter (per-isolate, not globally distributed)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = 60; // requests per window
const WINDOW_MS = 60_000; // 1 minute

function getRateLimitInfo(ip: string): { count: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    const info = { count: 0, resetTime: now + WINDOW_MS };
    rateLimitMap.set(ip, info);
    return info;
  }

  return entry;
}

export function proxy(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? '127.0.0.1';

  const info = getRateLimitInfo(ip);
  info.count++;

  const remaining = Math.max(0, RATE_LIMIT - info.count);

  if (info.count > RATE_LIMIT) {
    return NextResponse.json(
      { error: 'Too Many Requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(RATE_LIMIT),
          'X-RateLimit-Remaining': '0',
          'Retry-After': String(Math.ceil((info.resetTime - Date.now()) / 1000)),
        },
      },
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
