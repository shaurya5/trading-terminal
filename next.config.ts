import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [{
    source: '/:path*',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.yahoo.com https://*.yimg.com https://s.yimg.com; connect-src 'self'; font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com; frame-ancestors 'none';" },
    ],
  }],
};

export default nextConfig;
